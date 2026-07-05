
-- 1. Prevent self role escalation on profiles
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  AND is_approved = (SELECT is_approved FROM public.profiles WHERE id = auth.uid())
);

-- 2. Lock down SECURITY DEFINER function execute perms
REVOKE EXECUTE ON FUNCTION public.get_active_users_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_books_issued_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_active_quizzes_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_total_books_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_class_rank(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard_data(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_level(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_login_streak(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.find_user_by_identifier(text) FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_profile_role(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_staff_or_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.record_login_streak(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_user_by_identifier(text) TO anon;

-- 3. Restrict study-materials bucket viewing to signed-in users only
DROP POLICY IF EXISTS "Anyone can view study material files" ON storage.objects;
CREATE POLICY "Authenticated users can view study material files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'study-materials');
