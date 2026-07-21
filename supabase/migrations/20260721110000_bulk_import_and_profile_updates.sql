-- Migration: Add needs_profile_update and update handle_new_user trigger

-- 1) Add needs_profile_update column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS needs_profile_update BOOLEAN DEFAULT false;

-- 2) Update trigger function to handle needs_profile_update safely
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, first_name, last_name, role, student_class, 
    roll_number, admission_number, username, phone, needs_profile_update
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Student'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'student_class', ''),
    NEW.raw_user_meta_data->>'roll_number',
    NEW.raw_user_meta_data->>'admission_number',
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'phone',
    COALESCE((NEW.raw_user_meta_data->>'needs_profile_update')::boolean, false)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    student_class = EXCLUDED.student_class,
    roll_number = EXCLUDED.roll_number,
    admission_number = EXCLUDED.admission_number,
    needs_profile_update = EXCLUDED.needs_profile_update;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW; -- Ensure trigger errors never fail Auth creation
END;
$$;

-- 3) Direct SQL function to bulk-sync all auth.users into public.profiles
CREATE OR REPLACE FUNCTION public.sync_missing_auth_profiles()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  synced_count integer;
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
    phone,
    is_approved,
    needs_profile_update,
    updated_at
  )
  SELECT 
    u.id,
    LOWER(u.email),
    COALESCE(u.raw_user_meta_data->>'first_name', 'Student'),
    COALESCE(u.raw_user_meta_data->>'last_name', ''),
    COALESCE(u.raw_user_meta_data->>'role', 'student'),
    COALESCE(u.raw_user_meta_data->>'student_class', ''),
    COALESCE(u.raw_user_meta_data->>'roll_number', ''),
    COALESCE(u.raw_user_meta_data->>'admission_number', SPLIT_PART(u.email, '@', 1)),
    COALESCE(u.raw_user_meta_data->>'phone', ''),
    true,
    true,
    NOW()
  FROM auth.users u
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    student_class = EXCLUDED.student_class,
    admission_number = EXCLUDED.admission_number,
    is_approved = true,
    updated_at = NOW();

  GET DIAGNOSTICS synced_count = ROW_COUNT;
  RETURN synced_count;
END;
$$;
