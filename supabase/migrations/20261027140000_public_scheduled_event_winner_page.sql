CREATE OR REPLACE FUNCTION public.get_event_winner_release_plans()
RETURNS TABLE (
  event_id uuid,
  event_title text,
  event_date timestamptz,
  release_at timestamptz,
  total_awards integer,
  prizes jsonb,
  is_released boolean,
  winners jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH visible_plans AS (
    SELECT ew.event_id, ew.scheduled_release_at
    FROM public.event_winners ew
    WHERE ew.scheduled_release_at IS NOT NULL
      AND (
        ew.scheduled_release_at > now()
        OR (ew.is_published = true AND ew.scheduled_release_at >= now() - interval '7 days')
      )
    GROUP BY ew.event_id, ew.scheduled_release_at
  ), release_state AS (
    SELECT vp.event_id, vp.scheduled_release_at,
           bool_and(ew.is_published) AS is_released,
           count(*)::integer AS total_awards,
           jsonb_agg(DISTINCT jsonb_build_object(
             'position', ew.position,
             'title', ew.position_title,
             'title_hindi', ew.position_title_hindi
           )) AS prizes,
           CASE WHEN bool_and(ew.is_published) THEN
             jsonb_agg(jsonb_build_object(
               'name', trim(concat_ws(' ', p.first_name, p.last_name)),
               'student_class', p.student_class,
               'position', ew.position,
               'title', ew.position_title,
               'title_hindi', ew.position_title_hindi
             ) ORDER BY ew.position, p.first_name, p.last_name)
           ELSE '[]'::jsonb END AS winners
    FROM visible_plans vp
    JOIN public.event_winners ew
      ON ew.event_id = vp.event_id
     AND ew.scheduled_release_at = vp.scheduled_release_at
    LEFT JOIN public.profiles p ON p.id = ew.user_id AND ew.is_published = true
    GROUP BY vp.event_id, vp.scheduled_release_at
  )
  SELECT rs.event_id, le.title, le.event_date, rs.scheduled_release_at,
         rs.total_awards, rs.prizes, rs.is_released, rs.winners
  FROM release_state rs
  JOIN public.library_events le ON le.id = rs.event_id
  ORDER BY rs.scheduled_release_at ASC;
$$;

REVOKE ALL ON FUNCTION public.get_event_winner_release_plans() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_event_winner_release_plans() TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
