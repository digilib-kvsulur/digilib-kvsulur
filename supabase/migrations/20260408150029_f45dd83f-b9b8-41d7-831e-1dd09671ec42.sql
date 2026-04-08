
-- Add approved_by column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

-- Add RLS policy on user_roles
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Fix search_path on functions
CREATE OR REPLACE FUNCTION public.get_user_level(user_points INTEGER)
RETURNS TABLE(
  level_number INTEGER,
  name TEXT,
  min_points INTEGER,
  max_points INTEGER,
  icon_name TEXT,
  color TEXT,
  description TEXT,
  progress_to_next NUMERIC,
  points_to_next INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  current_level RECORD;
  next_level RECORD;
BEGIN
  SELECT l.* INTO current_level FROM public.levels l
    WHERE l.min_points <= user_points
    ORDER BY l.min_points DESC LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT l.* INTO next_level FROM public.levels l
    WHERE l.level_number = current_level.level_number + 1;

  RETURN QUERY SELECT
    current_level.level_number,
    current_level.name,
    current_level.min_points,
    current_level.max_points,
    current_level.icon_name,
    current_level.color,
    current_level.description,
    CASE
      WHEN next_level IS NULL THEN 100::NUMERIC
      ELSE ROUND(((user_points - current_level.min_points)::NUMERIC / NULLIF(next_level.min_points - current_level.min_points, 0)) * 100, 1)
    END,
    CASE
      WHEN next_level IS NULL THEN 0
      ELSE next_level.min_points - user_points
    END;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_class_rank(user_class TEXT, user_points INTEGER)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER + 1
  FROM public.profiles
  WHERE student_class = user_class
    AND is_approved = true
    AND points > user_points;
$$;

CREATE OR REPLACE FUNCTION public.get_leaderboard_data(class_filter TEXT DEFAULT NULL)
RETURNS TABLE(id UUID, first_name TEXT, student_class TEXT, points INTEGER)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT p.id, p.first_name, p.student_class, p.points
  FROM public.profiles p
  WHERE p.role = 'student'
    AND p.is_approved = true
    AND (class_filter IS NULL OR p.student_class = class_filter)
  ORDER BY p.points DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_active_users_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.profiles WHERE is_approved = true;
$$;

CREATE OR REPLACE FUNCTION public.get_total_books_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.books;
$$;

CREATE OR REPLACE FUNCTION public.get_books_issued_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.book_issues WHERE status = 'issued';
$$;

CREATE OR REPLACE FUNCTION public.get_active_quizzes_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.quizzes WHERE is_active = true;
$$;
