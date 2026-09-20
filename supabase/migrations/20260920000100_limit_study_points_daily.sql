-- Cap Study Tracker rewards at 100 XP per student each calendar day.
-- The profile row lock makes the cap safe when more than one session completes at once.
CREATE OR REPLACE FUNCTION public.complete_study_session(
  p_session_id uuid,
  p_duration_seconds integer,
  p_material_id uuid DEFAULT NULL,
  p_material_title text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points integer;
  v_type text;
  v_ended_at timestamptz;
  v_today_points integer;
  v_daily_cap constant integer := 100;
BEGIN
  SELECT session_type, ended_at
  INTO v_type, v_ended_at
  FROM public.study_sessions
  WHERE id = p_session_id AND user_id = auth.uid();

  IF v_type IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- A completed session must never award points more than once.
  IF v_ended_at IS NOT NULL THEN
    RETURN 0;
  END IF;

  -- Serialise completions for this student before calculating today's balance.
  PERFORM 1 FROM public.profiles WHERE id = auth.uid() FOR UPDATE;

  v_points := CASE
    WHEN v_type = 'break' THEN 0
    ELSE LEAST(FLOOR(GREATEST(p_duration_seconds, 0) / 600.0)::int * 2, 30)
  END;

  SELECT COALESCE(SUM(points_earned), 0)::integer
  INTO v_today_points
  FROM public.study_sessions
  WHERE user_id = auth.uid()
    AND session_type <> 'break'
    AND ended_at IS NOT NULL
    AND ended_at::date = CURRENT_DATE;

  v_points := GREATEST(LEAST(v_points, v_daily_cap - v_today_points), 0);

  UPDATE public.study_sessions
  SET duration_seconds = GREATEST(p_duration_seconds, 0),
      material_id = COALESCE(p_material_id, material_id),
      material_title = COALESCE(p_material_title, material_title),
      notes = COALESCE(p_notes, notes),
      points_earned = v_points,
      ended_at = now()
  WHERE id = p_session_id AND user_id = auth.uid();

  IF v_points > 0 THEN
    UPDATE public.profiles
    SET points = COALESCE(points, 0) + v_points
    WHERE id = auth.uid();
  END IF;

  RETURN v_points;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_study_session(uuid, integer, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_study_session(uuid, integer, uuid, text, text) TO authenticated;
