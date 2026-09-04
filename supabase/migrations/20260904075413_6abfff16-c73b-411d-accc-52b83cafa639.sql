CREATE OR REPLACE FUNCTION public.get_profile_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = _user_id
    AND _user_id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.get_profile_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_role(uuid) TO authenticated, service_role;