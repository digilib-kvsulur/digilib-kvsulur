-- Migration: Add needs_profile_update and update handle_new_user trigger

-- 1) Add needs_profile_update column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS needs_profile_update BOOLEAN DEFAULT false;

-- 2) Update trigger function to handle needs_profile_update from user metadata
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
    NEW.raw_user_meta_data->>'student_class',
    NEW.raw_user_meta_data->>'roll_number',
    NEW.raw_user_meta_data->>'admission_number',
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'phone',
    COALESCE((NEW.raw_user_meta_data->>'needs_profile_update')::boolean, false)
  );
  RETURN NEW;
END;
$$;
