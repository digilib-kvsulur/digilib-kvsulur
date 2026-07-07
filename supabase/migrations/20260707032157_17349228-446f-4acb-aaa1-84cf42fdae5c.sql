
-- 1) Restore EXECUTE grants (were revoked by earlier security migration)
GRANT EXECUTE ON FUNCTION public.get_active_users_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_total_books_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_books_issued_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_quizzes_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_user_by_identifier(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff_or_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_class_rank(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_level(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_data(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_login_streak(uuid) TO authenticated;

-- 2) Allow admission_number as login identifier
CREATE OR REPLACE FUNCTION public.find_user_by_identifier(identifier text)
RETURNS TABLE(id uuid, email text, is_approved boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, p.email, p.is_approved
  FROM public.profiles p
  WHERE p.email = identifier
     OR p.username = identifier
     OR p.phone = identifier
     OR p.admission_number = identifier
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.find_user_by_identifier(text) TO anon, authenticated;

-- 3) Add profiles FKs so PostgREST can embed profiles:user_id(...) on admin views
DO $$ BEGIN
  ALTER TABLE public.book_issues
    ADD CONSTRAINT book_issues_user_profile_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.book_reviews
    ADD CONSTRAINT book_reviews_user_profile_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.book_renewals
    ADD CONSTRAINT book_renewals_user_profile_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.book_audit_logs
    ADD CONSTRAINT book_audit_logs_verified_profile_fkey
    FOREIGN KEY (verified_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
