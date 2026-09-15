-- One notification address per profile. Existing users remain unconfirmed so
-- the application can collect/confirm it on their next successful login.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_email text,
  ADD COLUMN IF NOT EXISTS notification_email_confirmed_at timestamptz;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_notification_email_format;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_notification_email_format
  CHECK (
    notification_email IS NULL
    OR notification_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  );

-- New self-registered users already provide an email during registration, so
-- do not show them the returning-user collection prompt.
CREATE OR REPLACE FUNCTION public.set_notification_email_for_new_profile()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.notification_email IS NULL
     AND NEW.email IS NOT NULL
     AND NEW.email !~* '@(kvschool\.in|internal|dummy|example\.com)$' THEN
    NEW.notification_email := lower(trim(NEW.email));
    NEW.notification_email_confirmed_at := COALESCE(NEW.notification_email_confirmed_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_notification_email_for_new_profile ON public.profiles;
CREATE TRIGGER set_notification_email_for_new_profile
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_notification_email_for_new_profile();
