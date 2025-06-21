
-- Add admission_number column to profiles table (make it required for students)
ALTER TABLE public.profiles 
ADD COLUMN admission_number TEXT;

-- We'll make it required through application logic rather than database constraints
-- to avoid issues with existing admin users who don't need admission numbers
