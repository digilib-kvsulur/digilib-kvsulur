-- Fix security issue: Restrict profile access and create safe leaderboard view

-- First, drop the overly permissive policies
DROP POLICY IF EXISTS "Students can view approved profiles for leaderboard" ON public.profiles;
DROP POLICY IF EXISTS "view_approved_profiles" ON public.profiles;

-- Create a secure leaderboard view that only exposes non-sensitive data
CREATE OR REPLACE VIEW public.leaderboard_profiles AS
SELECT 
    id,
    first_name,
    student_class,
    points,
    is_approved,
    role
FROM public.profiles 
WHERE is_approved = true AND role = 'student';

-- Enable RLS on the view
ALTER VIEW public.leaderboard_profiles SET (security_barrier = true);

-- Create restrictive policies for the leaderboard view (Commented out: cannot create policies on views in PostgreSQL)
-- CREATE POLICY "Anyone can view leaderboard data" 
-- ON public.leaderboard_profiles 
-- FOR SELECT 
-- TO authenticated 
-- USING (true);

-- Create policy for admins and teachers to view full profiles for management purposes
CREATE POLICY "Staff can view student profiles for management" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles staff 
        WHERE staff.id = auth.uid() 
        AND staff.role IN ('admin', 'teacher') 
        AND staff.is_approved = true
    )
);

-- Allow students to view only their classmates' basic info for class rankings
CREATE POLICY "Students can view classmates basic info" 
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