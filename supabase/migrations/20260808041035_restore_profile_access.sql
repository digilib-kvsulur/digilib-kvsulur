-- Restore access to profile functions that dashboards need
GRANT EXECUTE ON FUNCTION public.get_public_posts_by_user(uuid, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_full(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_class_league() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_accessions(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_book_borrow_counts() TO anon, authenticated;