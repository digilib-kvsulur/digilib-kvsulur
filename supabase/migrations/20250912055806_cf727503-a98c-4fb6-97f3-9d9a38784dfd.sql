-- Remove all complex policies that could cause recursion
DROP POLICY IF EXISTS "Students can view approved profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create simple, non-recursive policies
-- Users can always view and update their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Allow viewing of approved profiles for public features (no role-based restrictions)
CREATE POLICY "Public can view approved profiles" 
ON public.profiles 
FOR SELECT 
USING (is_approved = true);