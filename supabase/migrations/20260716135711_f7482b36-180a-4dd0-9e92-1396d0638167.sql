
-- Restrict book_audit_logs SELECT to staff/admin
DROP POLICY IF EXISTS "Anyone signed-in can view audit logs" ON public.book_audit_logs;
CREATE POLICY "Staff and admin can view audit logs"
ON public.book_audit_logs FOR SELECT
TO authenticated
USING (public.is_staff_or_admin(auth.uid()));

-- Lock down SECURITY DEFINER function execution
-- find_user_by_identifier: used pre-auth on login screen; allow anon + authenticated
REVOKE EXECUTE ON FUNCTION public.find_user_by_identifier(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_user_by_identifier(text) TO anon, authenticated;

-- get_profile_role, has_role, is_staff_or_admin: used by RLS/authenticated flows
REVOKE EXECUTE ON FUNCTION public.get_profile_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_role(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_staff_or_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff_or_admin(uuid) TO authenticated, service_role;

-- record_login_streak: called by signed-in students
REVOKE EXECUTE ON FUNCTION public.record_login_streak(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_login_streak(uuid) TO authenticated, service_role;

-- handle_new_user: trigger function, no direct API callers
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
