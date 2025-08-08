-- Create a policy that allows students to view other students' basic information for leaderboards
CREATE POLICY "Students can view other students for leaderboards" 
ON public.profiles 
FOR SELECT 
USING (
  role = 'student' 
  AND is_approved = true 
  AND (
    auth.uid() = id 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'student' 
      AND is_approved = true
    )
  )
);