-- 1. Support tickets: prevent identity spoofing on direct inserts
DROP POLICY IF EXISTS "Anyone can submit a ticket" ON public.support_tickets;
CREATE POLICY "Users submit their own tickets"
ON public.support_tickets FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
REVOKE INSERT ON public.support_tickets FROM anon;

-- 2. Book reviews: authenticated readers only
DROP POLICY IF EXISTS "reviews public select" ON public.book_reviews;
CREATE POLICY "reviews select authenticated"
ON public.book_reviews FOR SELECT TO authenticated
USING ((is_hidden = false) OR (user_id = auth.uid()) OR public.is_staff_or_admin(auth.uid()));
REVOKE SELECT ON public.book_reviews FROM anon;

-- 3. Settings / curriculum tables: require login (events + gallery stay public intentionally)
DROP POLICY IF EXISTS "settings readable" ON public.system_settings;
CREATE POLICY "settings readable" ON public.system_settings FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.system_settings FROM anon;

DROP POLICY IF EXISTS "ncert public read" ON public.ncert_books;
CREATE POLICY "ncert read authenticated" ON public.ncert_books FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.ncert_books FROM anon;

DROP POLICY IF EXISTS "cbse public read" ON public.cbse_curriculum;
CREATE POLICY "cbse read authenticated" ON public.cbse_curriculum FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.cbse_curriculum FROM anon;

-- 4. Trigger functions must never be directly callable
REVOKE EXECUTE ON FUNCTION public.tg_enforce_issue_limits() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_notify_badge_award() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_notify_book_issue() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_notify_book_return() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_notify_friendship() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_notify_level_up() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_notify_post_comment() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_notify_post_like() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_notify_ticket_update() FROM anon, authenticated;

-- 5. Social/profile definer functions: signed-in users only (no anonymous access)
REVOKE EXECUTE ON FUNCTION public.get_public_posts_by_user(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_public_profile_full(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_class_league() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_available_accessions(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_book_borrow_counts() FROM anon;

-- 6. Internal helpers not meant to be called from the client
REVOKE EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_profile_role(uuid) FROM anon, authenticated;
