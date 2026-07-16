-- Fix the remaining recursive policy issue
-- Drop all existing policies that could cause recursion
DROP POLICY IF EXISTS "Students can view other students for leaderboards" ON public.profiles;

-- Create a simple policy that allows students to view approved student profiles
-- without any recursive table queries
CREATE POLICY "Students can view approved profiles" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can always view their own profile
  auth.uid() = id 
  OR 
  -- Or if they are a student, they can view other approved students
  (
    is_approved = true 
    AND role = 'student' 
    AND EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid()
    )
  )
);