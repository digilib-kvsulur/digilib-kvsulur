-- ============================================================
-- DLMS Student Invite System
-- Migration: 20261014_invite_system.sql
-- ============================================================

-- 1. Add invite tracking columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS invite_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS invite_reward_claimed boolean NOT NULL DEFAULT false;

-- 2. Auto-generate short invite codes for all existing student profiles
UPDATE profiles
SET invite_code = substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)
WHERE invite_code IS NULL AND role = 'student';

-- 3. Trigger function to auto-assign invite code on new student profile creation
CREATE OR REPLACE FUNCTION assign_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NULL AND (NEW.role = 'student' OR NEW.role IS NULL) THEN
    NEW.invite_code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_invite_code ON profiles;
CREATE TRIGGER trg_assign_invite_code
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION assign_invite_code();

-- 4. RPC: resolve invite code → inviter profile info
--    Accepts either the short invite_code OR the admission_number
CREATE OR REPLACE FUNCTION resolve_invite_code(p_code text)
RETURNS TABLE(inviter_id uuid, inviter_name text, invite_code text)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id                                                    AS inviter_id,
    trim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')) AS inviter_name,
    profiles.invite_code                                  AS invite_code
  FROM profiles
  WHERE (profiles.invite_code = p_code OR admission_number = p_code)
    AND role = 'student'
  LIMIT 1;
$$;

-- 5. RPC: claim invite reward (called by the newly-logged-in student)
--    - Idempotent: safe to call multiple times; only awards once per claimer
--    - Awards 250 XP to the INVITER's profile.points + monthly_points
--    - Marks the CLAIMER's invite_reward_claimed = true
CREATE OR REPLACE FUNCTION claim_invite_reward(p_inviter_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claimer_id  uuid    := auth.uid();
  v_already     boolean;
  v_reward      integer := 250;
BEGIN
  -- Safety: must be authenticated
  IF v_claimer_id IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'unauthenticated');
  END IF;

  -- Self-invite guard
  IF p_inviter_id = v_claimer_id THEN
    RETURN json_build_object('success', false, 'reason', 'self_invite');
  END IF;

  -- Idempotency: check if claimer already redeemed an invite reward
  SELECT invite_reward_claimed INTO v_already
  FROM profiles
  WHERE id = v_claimer_id;

  IF v_already IS TRUE THEN
    RETURN json_build_object('success', false, 'reason', 'already_claimed');
  END IF;

  -- Mark claimer as redeemed (prevents double-award on subsequent logins)
  UPDATE profiles
  SET invite_reward_claimed = true
  WHERE id = v_claimer_id;

  -- Award inviter XP (atomic increment)
  UPDATE profiles
  SET
    points         = points + v_reward,
    monthly_points = monthly_points + v_reward
  WHERE id = p_inviter_id
    AND role = 'student';

  -- Notify inviter
  INSERT INTO notifications(target_user_id, sent_by, title, message, type, is_read)
  VALUES (
    p_inviter_id,
    v_claimer_id,
    '🎉 Invite Reward! +250 XP',
    'A friend joined DLMS using your invite link. You earned 250 XP!',
    'points',
    false
  );

  RETURN json_build_object('success', true, 'points_awarded', v_reward);
END;
$$;

-- 6. Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION resolve_invite_code(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION claim_invite_reward(uuid) TO authenticated;

-- 7. Add Instagram Story reward tracking to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS instagram_reward_claimed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS instagram_story_shared_at timestamptz;

-- 8. RPC: claim_instagram_story_reward
--    - Awards 250 XP to the user for sharing DLMS on Instagram Story
--    - Idempotent: can only be claimed once per user
CREATE OR REPLACE FUNCTION claim_instagram_story_reward()
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     uuid    := auth.uid();
  v_already     boolean;
  v_reward      integer := 250;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'unauthenticated');
  END IF;

  SELECT instagram_reward_claimed INTO v_already
  FROM profiles
  WHERE id = v_user_id;

  IF v_already IS TRUE THEN
    RETURN json_build_object('success', false, 'reason', 'already_claimed');
  END IF;

  UPDATE profiles
  SET
    points                    = points + v_reward,
    monthly_points            = monthly_points + v_reward,
    instagram_reward_claimed  = true,
    instagram_story_shared_at = now()
  WHERE id = v_user_id;

  INSERT INTO notifications(target_user_id, sent_by, title, message, type, is_read)
  VALUES (
    v_user_id,
    v_user_id,
    '📸 Instagram Story Bonus! +250 XP',
    'You shared DLMS on your Instagram Story and earned 250 XP!',
    'points',
    false
  );

  RETURN json_build_object('success', true, 'points_awarded', v_reward);
END;
$$;

GRANT EXECUTE ON FUNCTION claim_instagram_story_reward() TO authenticated;

-- 9. Daily Instagram Story Reward with Screenshot Proof (Max 1 per day, +200 XP)
CREATE TABLE IF NOT EXISTS instagram_story_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  screenshot_url text NOT NULL,
  claimed_date date NOT NULL DEFAULT CURRENT_DATE,
  points_awarded integer NOT NULL DEFAULT 200,
  status text NOT NULL DEFAULT 'approved',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT instagram_story_submissions_user_date_uniq UNIQUE (user_id, claimed_date)
);

ALTER TABLE instagram_story_submissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Students can view own story submissions" ON instagram_story_submissions;
  DROP POLICY IF EXISTS "Staff can view all story submissions" ON instagram_story_submissions;
END $$;

CREATE POLICY "Students can view own story submissions"
  ON instagram_story_submissions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all story submissions"
  ON instagram_story_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_story_claimed_at timestamptz;

CREATE OR REPLACE FUNCTION claim_daily_story_reward(p_screenshot_url text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     uuid    := auth.uid();
  v_reward      integer := 200;
  v_already     boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'unauthenticated');
  END IF;

  IF p_screenshot_url IS NULL OR length(trim(p_screenshot_url)) = 0 THEN
    RETURN json_build_object('success', false, 'reason', 'missing_screenshot');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM instagram_story_submissions
    WHERE user_id = v_user_id AND claimed_date = CURRENT_DATE
  ) INTO v_already;

  IF v_already IS TRUE THEN
    RETURN json_build_object('success', false, 'reason', 'already_claimed_today');
  END IF;

  INSERT INTO instagram_story_submissions (
    user_id,
    screenshot_url,
    claimed_date,
    points_awarded,
    status
  ) VALUES (
    v_user_id,
    p_screenshot_url,
    CURRENT_DATE,
    v_reward,
    'approved'
  );

  UPDATE profiles
  SET
    points                = points + v_reward,
    monthly_points        = monthly_points + v_reward,
    last_story_claimed_at = now()
  WHERE id = v_user_id;

  INSERT INTO notifications (target_user_id, sent_by, title, message, type, is_read)
  VALUES (
    v_user_id,
    v_user_id,
    '📸 Instagram Story Bonus! +200 XP',
    'Your Instagram Story screenshot was accepted! +200 XP credited. Share again tomorrow!',
    'points',
    false
  );

  RETURN json_build_object(
    'success', true,
    'points_awarded', v_reward,
    'claimed_date', CURRENT_DATE
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_daily_story_status()
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id       uuid := auth.uid();
  v_claimed_today boolean := false;
  v_last_claimed  timestamptz;
  v_total_stories integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('claimed_today', false, 'total_stories', 0);
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM instagram_story_submissions
    WHERE user_id = v_user_id AND claimed_date = CURRENT_DATE
  ) INTO v_claimed_today;

  SELECT count(*), max(created_at)
  INTO v_total_stories, v_last_claimed
  FROM instagram_story_submissions
  WHERE user_id = v_user_id;

  RETURN json_build_object(
    'claimed_today', v_claimed_today,
    'last_claimed_at', v_last_claimed,
    'total_stories', COALESCE(v_total_stories, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION claim_daily_story_reward(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_story_status() TO authenticated;

