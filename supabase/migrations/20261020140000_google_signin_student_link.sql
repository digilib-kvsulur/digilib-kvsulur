-- Migration: 20261020140000_google_signin_student_link.sql
-- Description: Support Google Sign-in with Student Admission Number linking
-- 1. Add google_email to profiles with index
-- 2. Update handle_new_user() trigger so unlinked Google/OAuth signups do not create rogue student profiles
-- 3. Update find_user_by_identifier() to support lookup by google_email

-- 1. Add google_email column and index
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_email TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_google_email 
  ON public.profiles (LOWER(google_email)) 
  WHERE google_email IS NOT NULL;

-- 2. Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid text;
  email_lower text;
  username_val text;
  phone_val text;
  first_name_val text;
  last_name_val text;
  role_val text;
  class_val text;
  roll_val text;
  is_approved_val boolean;
  is_oauth boolean;
  google_email_val text := NULL;
BEGIN
  email_lower := LOWER(COALESCE(NEW.email, ''));
  is_oauth := (COALESCE(NEW.raw_app_meta_data->>'provider', '') IN ('google', 'oauth'))
              OR (NEW.raw_user_meta_data->>'iss' LIKE '%google%');

  -- If signing up via Google OAuth, do NOT default uid from email prefix unless explicitly numeric & school domain
  IF is_oauth THEN
    google_email_val := email_lower;
    IF NEW.raw_user_meta_data->>'admission_number' IS NOT NULL THEN
      uid := NEW.raw_user_meta_data->>'admission_number';
    ELSE
      -- Leave admission_number NULL until the student links their account with admission number & password
      uid := NULL;
    END IF;
  ELSE
    uid := COALESCE(NEW.raw_user_meta_data->>'admission_number', SPLIT_PART(email_lower, '@', 1));
  END IF;

  username_val := COALESCE(NEW.raw_user_meta_data->>'username', uid, email_lower);
  phone_val := NULLIF(COALESCE(NEW.raw_user_meta_data->>'phone', ''), '');
  first_name_val := COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'name', 'Student');
  last_name_val := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  role_val := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  class_val := COALESCE(NEW.raw_user_meta_data->>'student_class', '');
  roll_val := COALESCE(NEW.raw_user_meta_data->>'roll_number', '');
  
  -- If unlinked OAuth, default approval to false until linked
  IF is_oauth AND uid IS NULL THEN
    is_approved_val := false;
  ELSE
    is_approved_val := COALESCE((NEW.raw_user_meta_data->>'is_approved')::boolean, (role_val = 'admin'), false);
  END IF;

  -- Insert or update profile row
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    role,
    student_class,
    roll_number,
    admission_number,
    username,
    phone,
    is_approved,
    needs_profile_update,
    google_email,
    updated_at
  )
  VALUES (
    NEW.id,
    email_lower,
    first_name_val,
    last_name_val,
    role_val,
    class_val,
    roll_val,
    uid,
    username_val,
    phone_val,
    is_approved_val,
    COALESCE((NEW.raw_user_meta_data->>'needs_profile_update')::boolean, uid IS NULL),
    google_email_val,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = CASE WHEN public.profiles.first_name IS NULL OR public.profiles.first_name = '' THEN EXCLUDED.first_name ELSE public.profiles.first_name END,
    last_name = CASE WHEN public.profiles.last_name IS NULL OR public.profiles.last_name = '' THEN EXCLUDED.last_name ELSE public.profiles.last_name END,
    role = public.profiles.role,
    student_class = COALESCE(public.profiles.student_class, EXCLUDED.student_class),
    roll_number = COALESCE(public.profiles.roll_number, EXCLUDED.roll_number),
    admission_number = COALESCE(public.profiles.admission_number, EXCLUDED.admission_number),
    username = COALESCE(public.profiles.username, EXCLUDED.username),
    phone = COALESCE(public.profiles.phone, EXCLUDED.phone),
    google_email = COALESCE(EXCLUDED.google_email, public.profiles.google_email),
    is_approved = CASE WHEN public.profiles.is_approved THEN true ELSE EXCLUDED.is_approved END,
    updated_at = NOW();

  RETURN NEW;
EXCEPTION WHEN unique_violation THEN
  -- Handle potential username collision by appending last 4 characters of user ID
  BEGIN
    INSERT INTO public.profiles (
      id,
      email,
      first_name,
      last_name,
      role,
      student_class,
      roll_number,
      admission_number,
      username,
      phone,
      is_approved,
      needs_profile_update,
      google_email,
      updated_at
    )
    VALUES (
      NEW.id,
      email_lower,
      first_name_val,
      last_name_val,
      role_val,
      class_val,
      roll_val,
      uid,
      SUBSTRING(username_val FROM 1 FOR 20) || '_' || SUBSTRING(NEW.id::text FROM 1 FOR 4),
      phone_val,
      is_approved_val,
      COALESCE((NEW.raw_user_meta_data->>'needs_profile_update')::boolean, uid IS NULL),
      google_email_val,
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      updated_at = NOW();
    RETURN NEW;
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;
WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- 3. Update find_user_by_identifier to include google_email
CREATE OR REPLACE FUNCTION public.find_user_by_identifier(identifier text)
RETURNS TABLE(id uuid, email text, is_approved boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, u.email AS email, p.is_approved
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE LOWER(p.email) = LOWER(identifier)
     OR LOWER(p.notification_email) = LOWER(identifier)
     OR LOWER(p.google_email) = LOWER(identifier)
     OR LOWER(u.email) = LOWER(identifier)
     OR LOWER(p.username) = LOWER(identifier)
     OR p.phone = identifier
     OR p.admission_number = identifier
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.find_user_by_identifier(text) TO anon, authenticated;
