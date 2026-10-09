-- Migration: Fix admin user profile creation and handle_new_user trigger
-- Ensures that whenever a user is inserted into auth.users, a corresponding row in public.profiles is always created.

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
BEGIN
  email_lower := LOWER(COALESCE(NEW.email, ''));
  uid := COALESCE(NEW.raw_user_meta_data->>'admission_number', SPLIT_PART(email_lower, '@', 1));
  username_val := COALESCE(NEW.raw_user_meta_data->>'username', uid, email_lower);
  phone_val := NULLIF(COALESCE(NEW.raw_user_meta_data->>'phone', ''), '');
  first_name_val := COALESCE(NEW.raw_user_meta_data->>'first_name', 'Student');
  last_name_val := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  role_val := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  class_val := COALESCE(NEW.raw_user_meta_data->>'student_class', '');
  roll_val := COALESCE(NEW.raw_user_meta_data->>'roll_number', '');
  is_approved_val := COALESCE((NEW.raw_user_meta_data->>'is_approved')::boolean, (role_val = 'admin'), false);

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
    COALESCE((NEW.raw_user_meta_data->>'needs_profile_update')::boolean, false),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    student_class = EXCLUDED.student_class,
    roll_number = EXCLUDED.roll_number,
    admission_number = EXCLUDED.admission_number,
    username = EXCLUDED.username,
    phone = EXCLUDED.phone,
    is_approved = CASE WHEN public.profiles.is_approved THEN true ELSE EXCLUDED.is_approved END,
    updated_at = NOW();

  RETURN NEW;
EXCEPTION WHEN unique_violation THEN
  -- Handle potential username collision by appending last 4 characters of user ID
  BEGIN
    INSERT INTO public.profiles (
      id, email, first_name, last_name, role, student_class,
      roll_number, admission_number, username, phone, is_approved,
      needs_profile_update, updated_at
    )
    VALUES (
      NEW.id, email_lower, first_name_val, last_name_val, role_val, class_val,
      roll_val, uid, username_val || '_' || SUBSTRING(NEW.id::text FROM 1 FOR 4), phone_val,
      is_approved_val, COALESCE((NEW.raw_user_meta_data->>'needs_profile_update')::boolean, false), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      updated_at = NOW();
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;
  RETURN NEW;
WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure sync_missing_auth_profiles is granted to authenticated users and service_role
GRANT EXECUTE ON FUNCTION public.sync_missing_auth_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_missing_auth_profiles() TO service_role;

-- Execute sync to backfill any existing un-synced auth users immediately
SELECT public.sync_missing_auth_profiles();
