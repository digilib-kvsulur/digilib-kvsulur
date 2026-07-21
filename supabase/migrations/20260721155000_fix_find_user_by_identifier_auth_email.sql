-- Fix find_user_by_identifier to return the actual auth.users.email
-- instead of profiles.email, so login always works even after the student
-- updates profiles.email to their real email during first-login profile setup.
-- The JOIN ensures signInWithPassword always uses the correct auth credential.

CREATE OR REPLACE FUNCTION public.find_user_by_identifier(identifier text)
RETURNS TABLE(id uuid, email text, is_approved boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, u.email AS email, p.is_approved
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.email = identifier         -- real email stored in profile
     OR u.email = identifier         -- also match dummy auth email directly
     OR p.username = identifier      -- username login
     OR p.phone = identifier         -- phone login
     OR p.admission_number = identifier  -- admission number login
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.find_user_by_identifier(text) TO anon, authenticated;
