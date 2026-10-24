-- ============================================================
-- Migration: 20261024_restrict_invites_to_new_students_only.sql
-- DLMS Student Invite System: Restrict to NEW Students Only
-- ============================================================

-- 1. Mark all existing active students as already claimed
-- Students who already have points > 0 or existing activity in the library
-- are existing DLMS users and are NOT eligible for new-student welcome bonuses.
UPDATE public.profiles
SET invite_reward_claimed = true
WHERE role = 'student'
  AND invite_reward_claimed = false
  AND (
    COALESCE(points, 0) > 0
    OR EXISTS (SELECT 1 FROM public.reading_history WHERE user_id = profiles.id)
    OR EXISTS (SELECT 1 FROM public.book_issues WHERE user_id = profiles.id)
    OR EXISTS (SELECT 1 FROM public.login_streaks WHERE user_id = profiles.id AND (total_login_days > 1 OR current_streak > 0))
    OR EXISTS (SELECT 1 FROM public.quiz_results WHERE user_id = profiles.id)
    OR EXISTS (SELECT 1 FROM public.game_plays WHERE user_id = profiles.id)
    OR EXISTS (SELECT 1 FROM public.badge_awards WHERE user_id = profiles.id)
  );

-- 2. Update claim_invite_reward(p_code text) with strict new-student verification
CREATE OR REPLACE FUNCTION public.claim_invite_reward(p_code text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claimer_id    uuid := auth.uid();
  v_inviter_id    uuid;
  v_inviter_name  text;
  v_already       boolean;
  v_reward        integer := 250;
  v_inviter_count integer;
  v_claimer_role  text;
  v_claimer_pts   integer;
BEGIN
  -- Safety: must be authenticated
  IF v_claimer_id IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'unauthenticated');
  END IF;

  IF p_code IS NULL OR length(trim(p_code)) = 0 THEN
    RETURN json_build_object('success', false, 'reason', 'missing_code');
  END IF;

  -- Verify claimer is a student
  SELECT role, invite_reward_claimed, COALESCE(points, 0)
  INTO v_claimer_role, v_already, v_claimer_pts
  FROM profiles
  WHERE id = v_claimer_id;

  IF v_claimer_role IS DISTINCT FROM 'student' THEN
    RETURN json_build_object('success', false, 'reason', 'students_only');
  END IF;

  -- Check if claimer has already claimed
  IF v_already IS TRUE THEN
    RETURN json_build_object('success', false, 'reason', 'already_claimed');
  END IF;

  IF EXISTS (SELECT 1 FROM student_invites WHERE invited_user_id = v_claimer_id) THEN
    UPDATE profiles SET invite_reward_claimed = true WHERE id = v_claimer_id;
    RETURN json_build_object('success', false, 'reason', 'already_claimed');
  END IF;

  -- CRITICAL GUARD: Check if claimer is an OLD / EXISTING student
  -- A genuinely new student in DLMS has 0 points and NO prior library activity.
  -- Existing students who already have points or activity cannot claim welcome bonuses.
  IF v_claimer_pts > 0
     OR EXISTS (SELECT 1 FROM reading_history WHERE user_id = v_claimer_id)
     OR EXISTS (SELECT 1 FROM book_issues WHERE user_id = v_claimer_id)
     OR EXISTS (SELECT 1 FROM login_streaks WHERE user_id = v_claimer_id AND (total_login_days > 1 OR current_streak > 0))
     OR EXISTS (SELECT 1 FROM quiz_results WHERE user_id = v_claimer_id)
     OR EXISTS (SELECT 1 FROM game_plays WHERE user_id = v_claimer_id)
     OR EXISTS (SELECT 1 FROM badge_awards WHERE user_id = v_claimer_id)
  THEN
    -- Mark as claimed so they don't get prompted again, but do NOT award points
    UPDATE profiles SET invite_reward_claimed = true WHERE id = v_claimer_id;
    RETURN json_build_object(
      'success', false,
      'reason', 'existing_student',
      'message', 'Invite rewards are only eligible for new students joining DLMS for the first time.'
    );
  END IF;

  -- Resolve inviter from code (admission_number, invite_code, username)
  SELECT
    id,
    trim(coalesce(first_name,'') || ' ' || coalesce(last_name,''))
  INTO v_inviter_id, v_inviter_name
  FROM profiles
  WHERE (
    lower(trim(coalesce(invite_code, ''))) = lower(trim(p_code))
    OR lower(trim(coalesce(admission_number, ''))) = lower(trim(p_code))
    OR lower(trim(coalesce(username, ''))) = lower(trim(p_code))
  )
  AND role = 'student'
  LIMIT 1;

  IF v_inviter_id IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'invalid_code');
  END IF;

  -- Self-invite guard
  IF v_inviter_id = v_claimer_id THEN
    RETURN json_build_object('success', false, 'reason', 'self_invite');
  END IF;

  -- Check inviter's invite count
  SELECT count(*) INTO v_inviter_count
  FROM student_invites
  WHERE inviter_id = v_inviter_id;

  -- Record the invite in student_invites
  INSERT INTO student_invites (
    inviter_id,
    invited_user_id,
    points_awarded
  ) VALUES (
    v_inviter_id,
    v_claimer_id,
    v_reward
  );

  -- 1. Award INVITED FRIEND (Claimer - brand new student) +250 XP
  UPDATE profiles
  SET
    points                = COALESCE(points, 0) + v_reward,
    monthly_points        = COALESCE(monthly_points, 0) + v_reward,
    invite_reward_claimed = true,
    invited_by            = v_inviter_id
  WHERE id = v_claimer_id;

  -- 2. Award INVITER +250 XP (if under max 10 cap)
  IF COALESCE(v_inviter_count, 0) < 10 THEN
    UPDATE profiles
    SET
      points         = COALESCE(points, 0) + v_reward,
      monthly_points = COALESCE(monthly_points, 0) + v_reward
    WHERE id = v_inviter_id;

    -- Notify inviter
    INSERT INTO notifications(target_user_id, sent_by, title, message, type, is_read)
    VALUES (
      v_inviter_id,
      v_claimer_id,
      '🎉 Invite Reward! +250 XP',
      'A new classmate joined DLMS using your invite link! +250 XP credited.',
      'points',
      false
    );
  END IF;

  -- Notify invited friend
  INSERT INTO notifications(target_user_id, sent_by, title, message, type, is_read)
  VALUES (
    v_claimer_id,
    v_inviter_id,
    '🎉 Welcome Bonus! +250 XP',
    'Welcome to DLMS! You earned 250 XP for joining via your classmate''s invite.',
    'points',
    false
  );

  RETURN json_build_object(
    'success', true,
    'points_awarded', v_reward,
    'inviter_name', v_inviter_name,
    'inviter_id', v_inviter_id
  );
END;
$$;

-- 3. Overload for claim_invite_reward(p_inviter_id uuid)
CREATE OR REPLACE FUNCTION public.claim_invite_reward(p_inviter_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  SELECT COALESCE(admission_number, invite_code) INTO v_code
  FROM profiles
  WHERE id = p_inviter_id;

  IF v_code IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'inviter_not_found');
  END IF;

  RETURN claim_invite_reward(v_code);
END;
$$;

-- 4. Re-grant execute permissions
GRANT EXECUTE ON FUNCTION public.resolve_invite_code(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.claim_invite_reward(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_invite_reward(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_invite_stats() TO authenticated;
