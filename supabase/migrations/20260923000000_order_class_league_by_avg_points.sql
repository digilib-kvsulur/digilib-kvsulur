-- Update get_class_league_v2 to order by average points descending (column 4) instead of total points (column 2)
-- Secondary sort is total points descending (column 2) to break ties cleanly.

CREATE OR REPLACE FUNCTION public.get_class_league_v2(p_period text DEFAULT 'lifetime')
RETURNS TABLE(student_class text, total_points bigint, student_count bigint, avg_points numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_since timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  v_since := date_trunc('month', now());
  
  IF p_period = 'monthly' THEN
    RETURN QUERY
      SELECT 
        p.student_class, 
        SUM(GREATEST(COALESCE(p.monthly_points, 0), COALESCE(pp.pts, 0)))::bigint, 
        COUNT(*)::bigint,
        ROUND(SUM(GREATEST(COALESCE(p.monthly_points, 0), COALESCE(pp.pts, 0)))::numeric / GREATEST(COUNT(*), 1), 1)
      FROM public.profiles p
      LEFT JOIN public.get_period_points(v_since) pp ON pp.user_id = p.id
      WHERE p.role = 'student' AND COALESCE(p.student_class,'') <> ''
      GROUP BY p.student_class
      ORDER BY 4 DESC, 2 DESC;
  ELSE
    RETURN QUERY
      SELECT 
        p.student_class, 
        COALESCE(SUM(p.points), 0)::bigint, 
        COUNT(*)::bigint,
        ROUND(COALESCE(SUM(p.points), 0)::numeric / GREATEST(COUNT(*), 1), 1)
      FROM public.profiles p
      WHERE p.role = 'student' AND COALESCE(p.student_class,'') <> ''
      GROUP BY p.student_class
      ORDER BY 4 DESC, 2 DESC;
  END IF;
END; $$;

REVOKE ALL ON FUNCTION public.get_class_league_v2(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_class_league_v2(text) TO authenticated;
