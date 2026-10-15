-- ============================================================
-- FIX: Re-create & grant claim_invite_reward for both overloads
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- 1. Ensure student_invites table exists (idempotent)
CREATE TABLE IF NOT EXISTS student_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  invited_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  points_awarded integer NOT NULL DEFAULT 250,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_invites_invited_uniq UNIQUE (invited_user_id)
);

ALTER TABLE student_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view invites they made or received" ON student_invites;
DROP POLICY IF EXISTS "Staff can view all student invites" ON student_invites;

CREATE POLICY "Users can view invites they made or received"
  ON student_invites FOR SELECT
  TO authenticated
  USING (inviter_id = auth.uid() OR invited_user_id = auth.uid());

CREATE POLICY "Staff can view all student invites"
  ON student_invites FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

-- 2. Ensure required profile columns exist
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS invite_code text,
  ADD COLUMN IF NOT EXISTS invite_reward_claimed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- 3. REPLACE the TEXT overload of claim_invite_reward
--    (Awards +250 XP to both invited friend AND inviter atomically)
CREATE OR REPLACE FUNCTION claim_invite_reward(p_code text)
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
BEGIN
  -- Must be authenticated
  IF v_claimer_id IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'unauthenticated');
  END IF;

  IF p_code IS NULL OR length(trim(p_code)) = 0 THEN
    RETURN json_build_object('success', false, 'reason', 'missing_code');
  END IF;

  -- Only students can claim
  SELECT role, invite_reward_claimed INTO v_claimer_role, v_already
  FROM profiles
  WHERE id = v_claimer_id;

  IF v_claimer_role IS DISTINCT FROM 'student' THEN
    RETURN json_build_object('success', false, 'reason', 'students_only');
  END IF;

  -- Idempotency: already claimed
  IF v_already IS TRUE THEN
    RETURN json_build_object('success', false, 'reason', 'already_claimed');
  END IF;

  IF EXISTS (SELECT 1 FROM student_invites WHERE invited_user_id = v_claimer_id) THEN
    UPDATE profiles SET invite_reward_claimed = true WHERE id = v_claimer_id;
    RETURN json_build_object('success', false, 'reason', 'already_claimed');
  END IF;

  -- Resolve inviter (by admission_number, invite_code, or username)
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

  -- Check inviter's existing invite count (for cap)
  SELECT count(*) INTO v_inviter_count
  FROM student_invites
  WHERE inviter_id = v_inviter_id;

  -- Record the invite link
  INSERT INTO student_invites (inviter_id, invited_user_id, points_awarded)
  VALUES (v_inviter_id, v_claimer_id, v_reward);

  -- Award invited friend (claimer) +250 XP
  UPDATE profiles
  SET
    points                = COALESCE(points, 0) + v_reward,
    monthly_points        = COALESCE(monthly_points, 0) + v_reward,
    invite_reward_claimed = true,
    invited_by            = v_inviter_id
  WHERE id = v_claimer_id;

  -- Award inviter +250 XP (max 10 invites / 2500 XP cap)
  IF COALESCE(v_inviter_count, 0) < 10 THEN
    UPDATE profiles
    SET
      points         = COALESCE(points, 0) + v_reward,
      monthly_points = COALESCE(monthly_points, 0) + v_reward
    WHERE id = v_inviter_id;

    INSERT INTO notifications(target_user_id, sent_by, title, message, type, is_read)
    VALUES (
      v_inviter_id, v_claimer_id,
      '🎉 Invite Reward! +250 XP',
      'A friend joined DLMS using your invite link! +250 XP credited.',
      'points', false
    );
  END IF;

  -- Notify invited friend
  INSERT INTO notifications(target_user_id, sent_by, title, message, type, is_read)
  VALUES (
    v_claimer_id, v_inviter_id,
    '🎉 Welcome Bonus! +250 XP',
    'Welcome to DLMS! You earned 250 XP for joining via your classmate''s invite.',
    'points', false
  );

  RETURN json_build_object(
    'success', true,
    'points_awarded', v_reward,
    'inviter_name', v_inviter_name,
    'inviter_id', v_inviter_id
  );
END;
$$;

-- 4. REPLACE the UUID overload (backward compat)
CREATE OR REPLACE FUNCTION claim_invite_reward(p_inviter_id uuid)
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

-- 5. REPLACE get_my_invite_stats (idempotent)
CREATE OR REPLACE FUNCTION get_my_invite_stats()
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  uuid := auth.uid();
  v_count    integer := 0;
  v_total_xp integer := 0;
  v_friends  json := '[]'::json;
  v_claimed  boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('invite_count', 0, 'total_xp', 0, 'friends', '[]'::json, 'invite_reward_claimed', false);
  END IF;

  SELECT invite_reward_claimed INTO v_claimed
  FROM profiles WHERE id = v_user_id;

  SELECT count(*), COALESCE(sum(points_awarded), 0)
  INTO v_count, v_total_xp
  FROM student_invites WHERE inviter_id = v_user_id;

  SELECT json_agg(f) INTO v_friends
  FROM (
    SELECT p.first_name, p.last_name, p.admission_number, si.created_at, si.points_awarded
    FROM student_invites si
    JOIN profiles p ON p.id = si.invited_user_id
    WHERE si.inviter_id = v_user_id
    ORDER BY si.created_at DESC
    LIMIT 20
  ) f;

  RETURN json_build_object(
    'invite_count', COALESCE(v_count, 0),
    'total_xp', COALESCE(v_total_xp, 0),
    'friends', COALESCE(v_friends, '[]'::json),
    'invite_reward_claimed', COALESCE(v_claimed, false)
  );
END;
$$;

-- 6. REPLACE resolve_invite_code (case-insensitive)
CREATE OR REPLACE FUNCTION resolve_invite_code(p_code text)
RETURNS TABLE(inviter_id uuid, inviter_name text, invite_code text)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id AS inviter_id,
    trim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')) AS inviter_name,
    profiles.invite_code AS invite_code
  FROM profiles
  WHERE (
    lower(trim(coalesce(profiles.invite_code, ''))) = lower(trim(p_code))
    OR lower(trim(coalesce(profiles.admission_number, ''))) = lower(trim(p_code))
    OR lower(trim(coalesce(profiles.username, ''))) = lower(trim(p_code))
  )
  AND role = 'student'
  LIMIT 1;
$$;

-- 7. GRANT EXECUTE — this is the critical step that was missing
GRANT EXECUTE ON FUNCTION resolve_invite_code(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION claim_invite_reward(text) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_invite_reward(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_invite_stats() TO authenticated;

-- Verify grants applied (optional check)
SELECT
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS args,
  array_agg(acl.privilege_type) AS privileges,
  array_agg(acl.grantee::text) AS grantees
FROM pg_proc p
JOIN LATERAL aclexplode(p.proacl) AS acl ON true
WHERE p.proname IN ('claim_invite_reward', 'get_my_invite_stats', 'resolve_invite_code')
  AND p.pronamespace = 'public'::regnamespace
GROUP BY p.proname, p.oid
ORDER BY p.proname;
