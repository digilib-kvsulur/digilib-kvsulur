-- Fix infinite recursion in RLS policies by using security definer functions

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Students can view basic classmate info" ON public.profiles;
DROP POLICY IF EXISTS "Staff can view student profiles for management" ON public.profiles;

-- Create a security definer function to check if user is staff
CREATE OR REPLACE FUNCTION public.is_user_staff()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'teacher') 
    AND is_approved = true
  );
END;
$$;

-- Create a security definer function to check if user can view classmate
CREATE OR REPLACE FUNCTION public.can_view_classmate(target_user_id uuid, target_class text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewer_class text;
BEGIN
  -- Get viewer's class
  SELECT student_class INTO viewer_class 
  FROM public.profiles 
  WHERE id = auth.uid() 
  AND role = 'student' 
  AND is_approved = true;
  
  -- Return true if same class and target is approved student
  RETURN viewer_class IS NOT NULL 
    AND viewer_class = target_class
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = target_user_id 
      AND role = 'student' 
      AND is_approved = true
    );
END;
$$;

-- Create new safe policies using the functions
CREATE POLICY "Staff can view student profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (is_user_staff());

CREATE POLICY "Students can view approved classmates" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  role = 'student' 
  AND is_approved = true 
  AND can_view_classmate(id, student_class)
);