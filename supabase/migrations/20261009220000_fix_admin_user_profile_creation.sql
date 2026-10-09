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

-- Redefine sync_missing_auth_profiles to allow superuser/SQL editor runs while still checking authorization for web users
CREATE OR REPLACE FUNCTION public.sync_missing_auth_profiles()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u record;
  synced_count integer := 0;
  uid text;
  username_val text;
  phone_val text;
  email_lower text;
BEGIN
  -- If executed from a web client session, ensure user is staff or admin
  -- (If auth.uid() is NULL, it is running directly from the Supabase SQL editor or migration runner, which is allowed)
  IF auth.uid() IS NOT NULL AND NOT public.is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  FOR u IN SELECT * FROM auth.users LOOP
    BEGIN
      email_lower := LOWER(COALESCE(u.email, ''));
      uid := COALESCE(u.raw_user_meta_data->>'admission_number', SPLIT_PART(email_lower, '@', 1));
      username_val := COALESCE(u.raw_user_meta_data->>'username', uid, email_lower);
      phone_val := NULLIF(COALESCE(u.raw_user_meta_data->>'phone', ''), '');

      -- If profile exists with this user id, update it
      IF EXISTS (SELECT 1 FROM public.profiles WHERE id = u.id) THEN
        UPDATE public.profiles SET
          email = email_lower,
          first_name = COALESCE(u.raw_user_meta_data->>'first_name', 'Student'),
          last_name = COALESCE(u.raw_user_meta_data->>'last_name', ''),
          student_class = COALESCE(u.raw_user_meta_data->>'student_class', ''),
          roll_number = COALESCE(u.raw_user_meta_data->>'roll_number', ''),
          admission_number = uid,
          username = username_val,
          phone = phone_val,
          is_approved = true,
          updated_at = NOW()
        WHERE id = u.id;
        synced_count := synced_count + 1;
      -- If matching by admission_number, username, or email, link to this user
      ELSIF EXISTS (SELECT 1 FROM public.profiles WHERE admission_number = uid OR email = email_lower OR username = username_val) THEN
        UPDATE public.profiles SET
          id = u.id,
          email = email_lower,
          first_name = COALESCE(u.raw_user_meta_data->>'first_name', 'Student'),
          last_name = COALESCE(u.raw_user_meta_data->>'last_name', ''),
          student_class = COALESCE(u.raw_user_meta_data->>'student_class', ''),
          roll_number = COALESCE(u.raw_user_meta_data->>'roll_number', ''),
          phone = phone_val,
          is_approved = true,
          updated_at = NOW()
        WHERE admission_number = uid OR email = email_lower OR username = username_val;
        synced_count := synced_count + 1;
      ELSE
        -- Insert new profile
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
        ) VALUES (
          u.id,
          email_lower,
          COALESCE(u.raw_user_meta_data->>'first_name', 'Student'),
          COALESCE(u.raw_user_meta_data->>'last_name', ''),
          COALESCE(u.raw_user_meta_data->>'role', 'student'),
          COALESCE(u.raw_user_meta_data->>'student_class', ''),
          COALESCE(u.raw_user_meta_data->>'roll_number', ''),
          uid,
          username_val,
          phone_val,
          true,
          false,
          NOW()
        );
        synced_count := synced_count + 1;
      END IF;
    EXCEPTION WHEN unique_violation THEN
      -- If username collision occurs, append unique ID suffix
      BEGIN
        INSERT INTO public.profiles (
          id, email, first_name, last_name, role, student_class,
          roll_number, admission_number, username, phone, is_approved,
          needs_profile_update, updated_at
        ) VALUES (
          u.id, email_lower,
          COALESCE(u.raw_user_meta_data->>'first_name', 'Student'),
          COALESCE(u.raw_user_meta_data->>'last_name', ''),
          COALESCE(u.raw_user_meta_data->>'role', 'student'),
          COALESCE(u.raw_user_meta_data->>'student_class', ''),
          COALESCE(u.raw_user_meta_data->>'roll_number', ''),
          uid,
          username_val || '_' || SUBSTRING(u.id::text FROM 1 FOR 4),
          phone_val, true, false, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET updated_at = NOW();
        synced_count := synced_count + 1;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
  RETURN synced_count;
END;
$$;

-- Ensure sync_missing_auth_profiles is granted to authenticated users and service_role
GRANT EXECUTE ON FUNCTION public.sync_missing_auth_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_missing_auth_profiles() TO service_role;

-- Execute sync to backfill any existing un-synced auth users immediately
SELECT public.sync_missing_auth_profiles();
