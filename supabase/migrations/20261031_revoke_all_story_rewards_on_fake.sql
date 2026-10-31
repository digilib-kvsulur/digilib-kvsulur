-- A fake Instagram Story proof invalidates all Story rewards for that student.
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
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'teacher')
  ) THEN
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

  -- Lock this student's submissions before calculating and applying the clawback.
  PERFORM 1
  FROM public.instagram_story_submissions
  WHERE user_id = v_sub.user_id
  FOR UPDATE;

  SELECT coalesce(sum(greatest(coalesce(points_awarded, 0), 0)), 0)::integer
  INTO v_points
  FROM public.instagram_story_submissions
  WHERE user_id = v_sub.user_id;

  UPDATE public.profiles
  SET points = greatest(coalesce(points, 0) - v_points, 0),
      monthly_points = greatest(coalesce(monthly_points, 0) - v_points, 0)
  WHERE id = v_sub.user_id;

  UPDATE public.instagram_story_submissions
  SET status = 'rejected',
      points_revoked = coalesce(points_revoked, 0) + greatest(coalesce(points_awarded, 0), 0),
      points_awarded = 0
  WHERE user_id = v_sub.user_id;

  RETURN json_build_object('success', true, 'points_revoked', v_points);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_revoke_story_reward(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_revoke_story_reward(uuid) TO authenticated;
