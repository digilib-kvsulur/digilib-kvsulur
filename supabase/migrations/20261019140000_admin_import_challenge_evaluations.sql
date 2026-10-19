CREATE OR REPLACE FUNCTION public.admin_import_challenge_evaluation(
  p_kind text,
  p_submission_id uuid,
  p_status text,
  p_award_xp integer,
  p_feedback text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_current_status text;
  v_previous_points integer;
  v_rewarded_at timestamptz;
  v_reporter_id uuid;
  v_description text;
  v_description_json jsonb;
BEGIN
  IF auth.uid() IS NULL OR public.get_profile_role(auth.uid()) IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_submission_id IS NULL OR p_award_xp IS NULL OR p_award_xp < 0 OR p_award_xp > 1000000 THEN
    RAISE EXCEPTION 'Invalid evaluation data' USING ERRCODE = '22023';
  END IF;
  IF length(coalesce(p_feedback, '')) > 5000 THEN
    RAISE EXCEPTION 'Feedback is too long' USING ERRCODE = '22023';
  END IF;

  IF p_kind = 'ui_reform' THEN
    IF p_status NOT IN ('reviewed', 'shortlisted', 'winner', 'implemented', 'rejected') THEN
      RAISE EXCEPTION 'Invalid UI reform decision' USING ERRCODE = '22023';
    END IF;
    SELECT student_id, status, points_awarded
      INTO v_student_id, v_current_status, v_previous_points
      FROM public.ui_reform_submissions
      WHERE id = p_submission_id
      FOR UPDATE;
    IF NOT FOUND OR v_current_status <> 'pending' THEN
      RETURN jsonb_build_object('updated', false, 'reason', 'not_pending');
    END IF;

    UPDATE public.ui_reform_submissions
       SET status = p_status,
           admin_feedback = nullif(btrim(p_feedback), ''),
           points_awarded = p_award_xp
     WHERE id = p_submission_id;

    IF p_award_xp > 0 AND coalesce(v_previous_points, 0) = 0 THEN
      UPDATE public.profiles SET points = coalesce(points, 0) + p_award_xp WHERE id = v_student_id;
    END IF;
  ELSIF p_kind = 'bug_bounty' THEN
    IF p_status NOT IN ('verified', 'rejected') THEN
      RAISE EXCEPTION 'Invalid bug bounty decision' USING ERRCODE = '22023';
    END IF;
    IF p_status = 'rejected' AND p_award_xp > 0 THEN
      RAISE EXCEPTION 'Rejected reports cannot receive XP' USING ERRCODE = '22023';
    END IF;
    SELECT reporter_id, status, rewarded_at, description
      INTO v_reporter_id, v_current_status, v_rewarded_at, v_description
      FROM public.bug_reports
      WHERE id = p_submission_id
      FOR UPDATE;
    IF NOT FOUND OR v_current_status <> 'pending' OR v_rewarded_at IS NOT NULL THEN
      RETURN jsonb_build_object('updated', false, 'reason', 'not_pending');
    END IF;

    BEGIN
      v_description_json := v_description::jsonb;
      IF jsonb_typeof(v_description_json) <> 'object' THEN
        v_description_json := jsonb_build_object('raw', v_description);
      END IF;
    EXCEPTION WHEN others THEN
      v_description_json := jsonb_build_object('raw', v_description);
    END;

    UPDATE public.bug_reports
       SET status = p_status,
           rewarded_at = CASE WHEN p_status = 'verified' THEN now() ELSE NULL END,
           description = (v_description_json || jsonb_build_object('adminFeedback', nullif(btrim(p_feedback), '')))::text
     WHERE id = p_submission_id;

    IF p_status = 'verified' AND p_award_xp > 0 THEN
      UPDATE public.profiles SET points = coalesce(points, 0) + p_award_xp WHERE id = v_reporter_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Unsupported evaluation type' USING ERRCODE = '22023';
  END IF;

  RETURN jsonb_build_object('updated', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_import_challenge_evaluation(text, uuid, text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_import_challenge_evaluation(text, uuid, text, integer, text) TO authenticated;
