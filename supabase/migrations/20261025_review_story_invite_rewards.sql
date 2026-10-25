-- Let staff review automatically credited Instagram Story and invite rewards.
ALTER TABLE public.instagram_story_submissions
  ADD COLUMN IF NOT EXISTS points_revoked integer NOT NULL DEFAULT 0;

ALTER TABLE public.student_invites
  ADD COLUMN IF NOT EXISTS points_revoked integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';

CREATE OR REPLACE FUNCTION public.admin_revoke_story_reward(p_submission uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub public.instagram_story_submissions%rowtype;
  v_points integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher')) THEN
    RAISE EXCEPTION 'Staff access required';
  END IF;

  SELECT * INTO v_sub
  FROM public.instagram_story_submissions
  WHERE id = p_submission
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'not_found');
  END IF;
  IF v_sub.status = 'rejected' THEN
    RETURN json_build_object('success', false, 'reason', 'already_reviewed');
  END IF;

  v_points := greatest(coalesce(v_sub.points_awarded, 0), 0);
  UPDATE public.profiles
  SET points = greatest(coalesce(points, 0) - v_points, 0),
      monthly_points = greatest(coalesce(monthly_points, 0) - v_points, 0)
  WHERE id = v_sub.user_id;

  UPDATE public.instagram_story_submissions
  SET status = 'rejected', points_revoked = v_points, points_awarded = 0
  WHERE id = p_submission;

  RETURN json_build_object('success', true, 'points_revoked', v_points);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke_invite_reward(p_submission uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.student_invites%rowtype;
  v_invited_points integer;
  v_inviter_points integer := 0;
  v_inviter_rank integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher')) THEN
    RAISE EXCEPTION 'Staff access required';
  END IF;

  SELECT * INTO v_invite
  FROM public.student_invites
  WHERE id = p_submission
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'not_found');
  END IF;
  IF v_invite.status = 'revoked' THEN
    RETURN json_build_object('success', false, 'reason', 'already_reviewed');
  END IF;

  -- The invite reward function awards the inviter for their first ten tracked invites.
  SELECT count(*) + 1 INTO v_inviter_rank
  FROM public.student_invites
  WHERE inviter_id = v_invite.inviter_id
    AND (created_at, id) < (v_invite.created_at, v_invite.id);

  v_invited_points := greatest(coalesce(v_invite.points_awarded, 0), 0);
  IF v_inviter_rank <= 10 THEN
    v_inviter_points := v_invited_points;
  END IF;

  UPDATE public.profiles
  SET points = greatest(coalesce(points, 0) - v_invited_points, 0),
      monthly_points = greatest(coalesce(monthly_points, 0) - v_invited_points, 0)
  WHERE id = v_invite.invited_user_id;

  IF v_inviter_points > 0 THEN
    UPDATE public.profiles
    SET points = greatest(coalesce(points, 0) - v_inviter_points, 0),
        monthly_points = greatest(coalesce(monthly_points, 0) - v_inviter_points, 0)
    WHERE id = v_invite.inviter_id;
  END IF;

  UPDATE public.student_invites
  SET status = 'revoked', points_revoked = v_invited_points + v_inviter_points
  WHERE id = p_submission;

  RETURN json_build_object('success', true, 'points_revoked', v_invited_points + v_inviter_points);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_review_story_submission(p_submission uuid, p_decision text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub public.instagram_story_submissions%rowtype;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher')) THEN
    RAISE EXCEPTION 'Staff access required';
  END IF;
  IF p_decision IS NULL OR p_decision NOT IN ('accept', 'reject') THEN
    RAISE EXCEPTION 'Decision must be accept or reject';
  END IF;

  SELECT * INTO v_sub
  FROM public.instagram_story_submissions
  WHERE id = p_submission
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'not_found');
  END IF;
  IF v_sub.status <> 'approved' THEN
    RETURN json_build_object('success', false, 'reason', 'already_reviewed');
  END IF;

  IF p_decision = 'reject' THEN
    RETURN public.admin_revoke_story_reward(p_submission);
  END IF;

  UPDATE public.instagram_story_submissions
  SET status = 'verified'
  WHERE id = p_submission;

  RETURN json_build_object('success', true, 'points_revoked', 0);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_revoke_story_reward(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_revoke_invite_reward(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_review_story_submission(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_revoke_story_reward(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_invite_reward(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_story_submission(uuid, text) TO authenticated;
