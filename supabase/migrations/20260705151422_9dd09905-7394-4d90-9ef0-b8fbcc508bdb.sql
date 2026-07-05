-- Restore app-visible grants after function/table execute privileges were over-tightened.
-- No anonymous grants are added here.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.books TO authenticated;
GRANT ALL ON public.books TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_issues TO authenticated;
GRANT ALL ON public.book_issues TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_requests TO authenticated;
GRANT ALL ON public.book_requests TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_renewals TO authenticated;
GRANT ALL ON public.book_renewals TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_reservations TO authenticated;
GRANT ALL ON public.book_reservations TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_reading_goals TO authenticated;
GRANT ALL ON public.monthly_reading_goals TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.login_streaks TO authenticated;
GRANT ALL ON public.login_streaks TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_audit_logs TO authenticated;
GRANT ALL ON public.book_audit_logs TO service_role;

GRANT EXECUTE ON FUNCTION public.find_user_by_identifier(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff_or_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_login_streak(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_total_books_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_users_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_books_issued_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_quizzes_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_class_rank(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_level(integer) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'book_issues_user_id_fkey'
      AND conrelid = 'public.book_issues'::regclass
  ) THEN
    ALTER TABLE public.book_issues
      ADD CONSTRAINT book_issues_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;