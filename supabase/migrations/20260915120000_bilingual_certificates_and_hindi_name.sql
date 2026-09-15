-- Migration: Support bilingual certificates, Hindi names, and common plain text
-- 1. Add hindi_name to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hindi_name text;

-- 2. Add bilingual and common text fields to issued_certificates table
ALTER TABLE public.issued_certificates
  ADD COLUMN IF NOT EXISTS name_hindi text,
  ADD COLUMN IF NOT EXISTS class_hindi text,
  ADD COLUMN IF NOT EXISTS event_hindi text,
  ADD COLUMN IF NOT EXISTS title_hindi text,
  ADD COLUMN IF NOT EXISTS during_text text,
  ADD COLUMN IF NOT EXISTS common_text text,
  ADD COLUMN IF NOT EXISTS bilingual_data jsonb DEFAULT '{}'::jsonb;

-- 3. Seed default common certificate text in system_settings if not exists
INSERT INTO public.system_settings (key, value)
VALUES ('certificate_common_text', '""'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 4. Ensure students can update their own hindi_name in profiles
DROP POLICY IF EXISTS "students update own hindi_name" ON public.profiles;
-- The existing policy "Users can update their own profile" already allows auth.uid() = id,
-- but let's make sure it's explicitly granted.
GRANT SELECT, UPDATE(hindi_name) ON public.profiles TO authenticated;
