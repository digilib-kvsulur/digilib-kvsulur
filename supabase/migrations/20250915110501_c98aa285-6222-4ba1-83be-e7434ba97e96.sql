-- Create triggers to automatically update challenge progress

-- First, create a trigger for reading history completion
CREATE OR REPLACE FUNCTION public.update_challenge_progress_on_reading()
RETURNS TRIGGER AS $$
BEGIN
  -- Update progress for books_read type challenges
  PERFORM update_challenge_progress(NEW.user_id, 'books_read', 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for quiz completion  
CREATE OR REPLACE FUNCTION public.update_challenge_progress_on_quiz()
RETURNS TRIGGER AS $$
BEGIN
  -- Update progress for quiz_completed type challenges
  PERFORM update_challenge_progress(NEW.user_id, 'quiz_completed', 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add triggers to tables
DROP TRIGGER IF EXISTS trigger_reading_challenge_progress ON public.reading_history;
CREATE TRIGGER trigger_reading_challenge_progress
  AFTER INSERT ON public.reading_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_challenge_progress_on_reading();

DROP TRIGGER IF EXISTS trigger_quiz_challenge_progress ON public.quiz_results;  
CREATE TRIGGER trigger_quiz_challenge_progress
  AFTER INSERT ON public.quiz_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_challenge_progress_on_quiz();

-- Fix existing challenge progress that should be completed
UPDATE public.challenge_progress 
SET 
  is_completed = true,
  completed_at = COALESCE(completed_at, now())
WHERE 
  current_progress >= (
    SELECT target_value 
    FROM public.challenges 
    WHERE challenges.id = challenge_progress.challenge_id
  )
  AND is_completed = false;