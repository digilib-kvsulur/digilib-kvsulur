
-- Create reading_history table for students to track their completed books
CREATE TABLE public.reading_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_title TEXT NOT NULL,
  book_author TEXT NOT NULL,
  completed_date DATE NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  points_earned INTEGER NOT NULL DEFAULT 20,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for reading_history
ALTER TABLE public.reading_history ENABLE ROW LEVEL SECURITY;

-- Create policies for reading_history
CREATE POLICY "Users can view their own reading history" 
  ON public.reading_history 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reading history entries" 
  ON public.reading_history 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reading history entries" 
  ON public.reading_history 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reading history entries" 
  ON public.reading_history 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Add index for better performance
CREATE INDEX reading_history_user_id_idx ON public.reading_history(user_id);
CREATE INDEX reading_history_completed_date_idx ON public.reading_history(completed_date DESC);

-- Update challenge_progress table to include points earned from challenges
ALTER TABLE public.challenge_progress 
ADD COLUMN points_earned INTEGER DEFAULT 0;

-- Create function to update reading history progress for challenges
CREATE OR REPLACE FUNCTION public.update_reading_challenge_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update challenge progress for books_read type challenges
  PERFORM public.update_challenge_progress(NEW.user_id, 'books_read', 1);
  
  -- Update user points
  UPDATE public.profiles 
  SET points = COALESCE(points, 0) + NEW.points_earned
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger for reading history
CREATE TRIGGER on_reading_history_insert
  AFTER INSERT ON public.reading_history
  FOR EACH ROW EXECUTE FUNCTION public.update_reading_challenge_progress();
