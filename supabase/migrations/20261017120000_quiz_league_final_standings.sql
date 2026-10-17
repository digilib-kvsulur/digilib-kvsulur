-- One indexed read supplies canonical final league standings to the host,
-- participants, and admins without each client scanning quiz_results.
CREATE INDEX IF NOT EXISTS quiz_results_league_session_idx
  ON public.quiz_results (quiz_id, (answers ->> 'session_id'), user_id, completed_at DESC)
  WHERE answers ->> 'league' = 'true';

CREATE OR REPLACE FUNCTION public.get_quiz_league_final_standings(p_session_id uuid)
RETURNS TABLE (
  rank_position integer,
  user_id uuid,
  display_name text,
  score integer,
  strikes integer,
  disqualified boolean,
  prize_points integer,
  completed_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.quiz_sessions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_session
  FROM public.quiz_sessions
  WHERE id = p_session_id AND is_league = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz league not found';
  END IF;

  IF v_session.status NOT IN ('finished', 'completed')
     AND v_session.host_id IS DISTINCT FROM auth.uid()
     AND NOT public.is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Final standings are available after the league ends';
  END IF;

  RETURN QUERY
  WITH one_result_per_user AS (
    SELECT DISTINCT ON (qr.user_id)
      qr.user_id,
      COALESCE(
        CASE WHEN qr.answers ->> 'quiz_score' ~ '^[0-9]+$'
          THEN (qr.answers ->> 'quiz_score')::integer END,
        qr.score,
        0
      ) AS raw_score,
      COALESCE(
        CASE WHEN qr.answers ->> 'strikes' ~ '^[0-9]+$'
          THEN (qr.answers ->> 'strikes')::integer END,
        0
      ) AS strike_count,
      COALESCE(qr.answers ->> 'disqualified' = 'true', false) AS was_disqualified,
      qr.completed_at
    FROM public.quiz_results qr
    WHERE qr.quiz_id = v_session.quiz_id
      AND qr.answers ->> 'league' = 'true'
      AND qr.answers ->> 'session_id' = p_session_id::text
    ORDER BY qr.user_id, raw_score DESC, qr.completed_at DESC
  ), ranked AS (
    SELECT
      row_number() OVER (
        ORDER BY
          one_result_per_user.was_disqualified ASC,
          one_result_per_user.raw_score DESC,
          one_result_per_user.completed_at ASC,
          one_result_per_user.user_id
      )::integer AS place,
      one_result_per_user.user_id,
      one_result_per_user.raw_score,
      one_result_per_user.strike_count,
      one_result_per_user.was_disqualified,
      one_result_per_user.completed_at
    FROM one_result_per_user
  )
  SELECT
    ranked.place,
    ranked.user_id,
    COALESCE(NULLIF(concat_ws(' ', p.first_name, p.last_name), ''), 'Student')::text,
    ranked.raw_score::integer,
    ranked.strike_count::integer,
    ranked.was_disqualified,
    CASE
      WHEN ranked.was_disqualified THEN 0
      WHEN ranked.place = 1 THEN 2000
      WHEN ranked.place = 2 THEN 1500
      WHEN ranked.place = 3 THEN 1000
      WHEN ranked.place <= 10 THEN 750
      ELSE 500
    END::integer,
    ranked.completed_at
  FROM ranked
  JOIN public.profiles p ON p.id = ranked.user_id
  ORDER BY ranked.place;
END;
$$;

REVOKE ALL ON FUNCTION public.get_quiz_league_final_standings(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_quiz_league_final_standings(uuid) TO authenticated;
