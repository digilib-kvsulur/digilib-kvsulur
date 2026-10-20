-- Keep profile email and recovery email aligned after Supabase confirms an
-- authenticated email change. Preserve a separately configured recovery email.
CREATE OR REPLACE FUNCTION public.sync_auth_user_email_to_profiles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profiles
    SET email = LOWER(NEW.email),
        notification_email = LOWER(NEW.email),
        updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
