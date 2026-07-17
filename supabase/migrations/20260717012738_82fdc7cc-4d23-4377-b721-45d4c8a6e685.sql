
-- 1) Leaderboard: run as definer so RLS on profiles doesn't block it
ALTER FUNCTION public.get_leaderboard_data(text) SECURITY DEFINER;

-- 2) Fetch safe public profile fields for a list of users
CREATE OR REPLACE FUNCTION public.get_public_profiles(_ids uuid[])
RETURNS TABLE(id uuid, first_name text, last_name text, username text, student_class text, points integer, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.first_name, p.last_name, p.username, p.student_class, p.points, p.role
  FROM public.profiles p
  WHERE p.id = ANY(_ids);
$$;

-- 3) Stats for the profile popover (books/quizzes/streaks)
CREATE OR REPLACE FUNCTION public.get_public_profile_stats(_id uuid)
RETURNS TABLE(books_read integer, quizzes integer, current_streak integer, longest_streak integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*)::int FROM public.reading_history WHERE user_id = _id),
    (SELECT COUNT(*)::int FROM public.quiz_results WHERE user_id = _id),
    COALESCE((SELECT current_streak FROM public.login_streaks WHERE user_id = _id), 0),
    COALESCE((SELECT longest_streak FROM public.login_streaks WHERE user_id = _id), 0);
$$;

-- 4) Search other users by name/username (definer to bypass profile RLS)
CREATE OR REPLACE FUNCTION public.search_public_profiles(_q text, _exclude uuid)
RETURNS TABLE(id uuid, first_name text, last_name text, username text, student_class text, role text, points integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.first_name, p.last_name, p.username, p.student_class, p.role, p.points
  FROM public.profiles p
  WHERE p.id <> _exclude
    AND p.is_approved = true
    AND (
      p.username ILIKE '%' || _q || '%'
      OR p.first_name ILIKE '%' || _q || '%'
      OR p.last_name ILIKE '%' || _q || '%'
    )
  ORDER BY p.first_name
  LIMIT 25;
$$;

REVOKE ALL ON FUNCTION public.get_public_profiles(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_public_profile_stats(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.search_public_profiles(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_public_profiles(text, uuid) TO authenticated;
