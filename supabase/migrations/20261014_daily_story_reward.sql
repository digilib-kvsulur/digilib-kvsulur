-- Migration: Daily Instagram Story Reward (+200 XP per day with screenshot proof)

-- 1. Table: instagram_story_submissions
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

-- Enable RLS
ALTER TABLE instagram_story_submissions ENABLE ROW LEVEL SECURITY;

-- Drop old policies if re-running
DO $$
BEGIN
  DROP POLICY IF EXISTS "Students can view own story submissions" ON instagram_story_submissions;
  DROP POLICY IF EXISTS "Staff can view all story submissions" ON instagram_story_submissions;
END $$;

-- Students can read their own submissions
CREATE POLICY "Students can view own story submissions"
  ON instagram_story_submissions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Staff/Admins can view all submissions for review/audit
CREATE POLICY "Staff can view all story submissions"
  ON instagram_story_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

-- 2. Add column to profiles if not present
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_story_claimed_at timestamptz;

-- 3. RPC: claim_daily_story_reward
--    - Validates max 1 claim per calendar day
--    - Stores screenshot proof URL
--    - Atomically credits 200 XP to user
--    - Sends celebratory notification
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

  -- Check if already claimed today
  SELECT EXISTS (
    SELECT 1 FROM instagram_story_submissions
    WHERE user_id = v_user_id AND claimed_date = CURRENT_DATE
  ) INTO v_already;

  IF v_already IS TRUE THEN
    RETURN json_build_object('success', false, 'reason', 'already_claimed_today');
  END IF;

  -- Record submission
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

  -- Credit XP atomically
  UPDATE profiles
  SET
    points                = points + v_reward,
    monthly_points        = monthly_points + v_reward,
    last_story_claimed_at = now()
  WHERE id = v_user_id;

  -- Send notification
  INSERT INTO notifications (target_user_id, sent_by, title, message, type, is_read)
  VALUES (
    v_user_id,
    v_user_id,
    '📸 Instagram Story Bonus! +200 XP',
    'Your Instagram Story was verified! +200 XP credited. Share again tomorrow to earn more!',
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

-- 4. RPC: get_daily_story_status
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
