-- Add claim functionality to challenge progress
ALTER TABLE public.challenge_progress 
ADD COLUMN is_claimed BOOLEAN DEFAULT false;

-- Update existing completed challenges to be unclaimed (so users can claim them)
UPDATE public.challenge_progress 
SET is_claimed = false 
WHERE is_completed = true;