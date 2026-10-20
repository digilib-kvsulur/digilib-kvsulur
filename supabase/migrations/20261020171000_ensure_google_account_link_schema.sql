-- Keep the schema required by link-student-google-account present on tenant DBs.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS google_email text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_google_email
  ON public.profiles (LOWER(google_email))
  WHERE google_email IS NOT NULL;
