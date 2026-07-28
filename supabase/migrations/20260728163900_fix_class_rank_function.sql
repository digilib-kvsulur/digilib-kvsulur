-- Fix get_user_class_rank to only count students (role = 'student'), 
-- not teachers/admins that may also be in the profiles table
CREATE OR REPLACE FUNCTION public.get_user_class_rank(user_class TEXT, user_points INTEGER)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER + 1
  FROM public.profiles
  WHERE student_class = user_class
    AND is_approved = true
    AND role = 'student'
    AND points > user_points;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_class_rank(text, integer) TO authenticated;
