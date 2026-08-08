-- Restore execute permission for get_profile_role used by RLS policies
GRANT EXECUTE ON FUNCTION public.get_profile_role(uuid) TO authenticated, service_role;