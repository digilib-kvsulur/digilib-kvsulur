
-- Restore EXECUTE for authenticated on functions required by RLS policies and dashboard queries.
-- These functions are SECURITY DEFINER and only expose non-sensitive derived data.
GRANT EXECUTE ON FUNCTION public.get_profile_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff_or_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_users_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_books_issued_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_quizzes_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_total_books_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_class_rank(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_data(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_level(integer) TO authenticated;

-- Login-identifier lookup: also needs authenticated (users may retry while a stale session exists).
GRANT EXECUTE ON FUNCTION public.find_user_by_identifier(text) TO authenticated;
