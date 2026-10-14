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
