-- Fix get_leaderboard_data to also return last_name
CREATE OR REPLACE FUNCTION public.get_leaderboard_data(class_filter TEXT DEFAULT NULL)
RETURNS TABLE(id UUID, first_name TEXT, last_name TEXT, student_class TEXT, points INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.first_name, p.last_name, p.student_class, p.points
  FROM public.profiles p
  WHERE p.role = 'student'
    AND p.is_approved = true
    AND (class_filter IS NULL OR p.student_class = class_filter)
  ORDER BY p.points DESC;
$$;
