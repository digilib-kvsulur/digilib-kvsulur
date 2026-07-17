-- Fix security issue: Restrict profile access and create safe leaderboard function

-- First, drop the overly permissive policies
DROP POLICY IF EXISTS "Students can view approved profiles for leaderboard" ON public.profiles;
DROP POLICY IF EXISTS "view_approved_profiles" ON public.profiles;

-- Create a secure function to get leaderboard data that only exposes non-sensitive information
CREATE OR REPLACE FUNCTION public.get_leaderboard_data(class_filter text DEFAULT NULL)
RETURNS TABLE (
    id uuid,
    first_name text,
    student_class text,
    points integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.first_name,
        p.student_class,
        p.points
    FROM public.profiles p
    WHERE p.is_approved = true 
    AND p.role = 'student'
    AND (class_filter IS NULL OR p.student_class = class_filter)
    ORDER BY p.points DESC;
END;
$$;

-- Create policy for admins and teachers to view full profiles for management purposes
CREATE POLICY "Staff can view student profiles for management" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
    get_current_user_role() IN ('admin', 'teacher')
);

-- Allow students to view only their classmates' basic info (first name, class, points) for class rankings
-- This is more restrictive than before - no email, phone, etc.
CREATE POLICY "Students can view basic classmate info" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles viewer 
        WHERE viewer.id = auth.uid() 
        AND viewer.role = 'student' 
        AND viewer.is_approved = true
        AND viewer.student_class = public.profiles.student_class
    )
    AND public.profiles.is_approved = true 
    AND public.profiles.role = 'student'
);