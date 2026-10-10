-- Migration: Bi-directional email sync trigger between auth.users and public.profiles
-- Ensures that if email is updated in auth.users OR in public.profiles, both stay in sync.

CREATE OR REPLACE FUNCTION public.sync_auth_user_email_to_profiles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profiles
    SET 
      email = LOWER(NEW.email),
      notification_email = COALESCE(notification_email, LOWER(NEW.email)),
      updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_auth_user_email_to_profiles();

-- Ensure find_user_by_identifier supports updated email across auth and profile
CREATE OR REPLACE FUNCTION public.find_user_by_identifier(identifier text)
RETURNS TABLE(id uuid, email text, is_approved boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, u.email AS email, p.is_approved
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE LOWER(p.email) = LOWER(identifier)
     OR LOWER(p.notification_email) = LOWER(identifier)
     OR LOWER(u.email) = LOWER(identifier)
     OR LOWER(p.username) = LOWER(identifier)
     OR p.phone = identifier
     OR p.admission_number = identifier
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.find_user_by_identifier(text) TO anon, authenticated;
