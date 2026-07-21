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
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.raw_user_meta_data->>'admission_number', NEW.email),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE((NEW.raw_user_meta_data->>'needs_profile_update')::boolean, false)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    student_class = EXCLUDED.student_class,
    roll_number = EXCLUDED.roll_number,
    admission_number = EXCLUDED.admission_number,
    username = EXCLUDED.username,
    phone = EXCLUDED.phone,
    needs_profile_update = EXCLUDED.needs_profile_update;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW; -- Ensure trigger errors never fail Auth creation
END;
$$;

-- 3) Robust cursor loop PL/pgSQL function to sync all auth.users safely without unique conflicts
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
  FOR u IN SELECT * FROM auth.users LOOP
    BEGIN
      uid := COALESCE(u.raw_user_meta_data->>'admission_number', SPLIT_PART(u.email, '@', 1));
      email_lower := LOWER(u.email);
      username_val := COALESCE(u.raw_user_meta_data->>'username', uid, email_lower);
      phone_val := NULLIF(COALESCE(u.raw_user_meta_data->>'phone', ''), '');

      -- Check if id already exists
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
      -- Check if admission_number, username, or email exists to avoid unique key conflicts
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
        -- Safe Insert
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
          true,
          NOW()
        );
        synced_count := synced_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Proceed to next user in case of any unhandled conflict
    END;
  END LOOP;
  RETURN synced_count;
END;
$$;
