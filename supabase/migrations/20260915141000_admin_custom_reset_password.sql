-- Migration: Create SQL RPC for Admin Password Override
-- Enables admins to directly reset any student/user password in Auth.users
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

CREATE OR REPLACE FUNCTION public.admin_custom_reset_password(
  target_user_id uuid,
  new_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
  caller_role text;
BEGIN
  -- 1. Ensure caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User not authenticated';
  END IF;

  -- 2. Verify caller has admin role in profiles
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  IF caller_role IS NULL OR caller_role != 'admin' THEN
    RAISE EXCEPTION 'Forbidden: Only administrators can reset user passwords';
  END IF;

  -- 3. Validate password length
  IF new_password IS NULL OR length(trim(new_password)) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters long';
  END IF;

  -- 4. Update encrypted password in auth.users using bcrypt
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(trim(new_password), extensions.gen_salt('bf')),
      updated_at = now()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found in auth.users';
  END IF;

  RETURN jsonb_build_object('success', true, 'user_id', target_user_id);
END;
$$;

-- Grant execution to authenticated users (internal check enforces admin role)
GRANT EXECUTE ON FUNCTION public.admin_custom_reset_password(uuid, text) TO authenticated;
