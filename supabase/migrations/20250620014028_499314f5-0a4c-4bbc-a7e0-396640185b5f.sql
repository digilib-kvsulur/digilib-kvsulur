
-- Enable RLS on existing tables that don't have it (using IF NOT EXISTS where possible)
DO $$ 
BEGIN
    -- Enable RLS on tables if not already enabled
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'quizzes' AND rowsecurity = true) THEN
        ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'quiz_results' AND rowsecurity = true) THEN
        ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'book_issues' AND rowsecurity = true) THEN
        ALTER TABLE public.book_issues ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'books' AND rowsecurity = true) THEN
        ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Drop existing policies if they exist, then recreate them
DROP POLICY IF EXISTS "Anyone can view active quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Admins can manage quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Users can view own quiz results" ON public.quiz_results;
DROP POLICY IF EXISTS "Users can insert own quiz results" ON public.quiz_results;
DROP POLICY IF EXISTS "Admins can view all quiz results" ON public.quiz_results;
DROP POLICY IF EXISTS "Anyone can view books" ON public.books;
DROP POLICY IF EXISTS "Admins can manage books" ON public.books;
DROP POLICY IF EXISTS "Users can view own book issues" ON public.book_issues;
DROP POLICY IF EXISTS "Users can insert own book issues" ON public.book_issues;
DROP POLICY IF EXISTS "Admins can manage all book issues" ON public.book_issues;

-- Create RLS policies for quizzes
CREATE POLICY "Anyone can view active quizzes" ON public.quizzes
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage quizzes" ON public.quizzes
  FOR ALL USING (public.get_current_user_role() = 'admin');

-- Create RLS policies for quiz_results
CREATE POLICY "Users can view own quiz results" ON public.quiz_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz results" ON public.quiz_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all quiz results" ON public.quiz_results
  FOR SELECT USING (public.get_current_user_role() = 'admin');

-- Create RLS policies for books
CREATE POLICY "Anyone can view books" ON public.books
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage books" ON public.books
  FOR ALL USING (public.get_current_user_role() = 'admin');

-- Create RLS policies for book_issues
CREATE POLICY "Users can view own book issues" ON public.book_issues
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own book issues" ON public.book_issues
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all book issues" ON public.book_issues
  FOR ALL USING (public.get_current_user_role() = 'admin');

-- Create challenges table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('books_read', 'quiz_completed', 'points_earned')),
  target_value INTEGER NOT NULL,
  reward_points INTEGER NOT NULL,
  deadline DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS on challenges
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Drop and recreate challenge policies
DROP POLICY IF EXISTS "Anyone can view active challenges" ON public.challenges;
DROP POLICY IF EXISTS "Admins can manage challenges" ON public.challenges;

CREATE POLICY "Anyone can view active challenges" ON public.challenges
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage challenges" ON public.challenges
  FOR ALL USING (public.get_current_user_role() = 'admin');

-- Create challenge_progress table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.challenge_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  current_progress INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

-- Enable RLS on challenge_progress
ALTER TABLE public.challenge_progress ENABLE ROW LEVEL SECURITY;

-- Drop and recreate challenge_progress policies
DROP POLICY IF EXISTS "Users can view own progress" ON public.challenge_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.challenge_progress;
DROP POLICY IF EXISTS "System can insert progress" ON public.challenge_progress;
DROP POLICY IF EXISTS "Admins can view all progress" ON public.challenge_progress;

CREATE POLICY "Users can view own progress" ON public.challenge_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON public.challenge_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert progress" ON public.challenge_progress
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all progress" ON public.challenge_progress
  FOR SELECT USING (public.get_current_user_role() = 'admin');

-- Create functions to get real statistics
CREATE OR REPLACE FUNCTION public.get_total_books_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM public.books);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_active_users_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM public.profiles WHERE is_approved = true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_books_issued_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM public.book_issues WHERE status = 'issued');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_active_quizzes_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM public.quizzes WHERE is_active = true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_class_rank(user_class TEXT, user_points INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) + 1 
    FROM public.profiles 
    WHERE student_class = user_class 
    AND points > user_points 
    AND is_approved = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update challenge progress
CREATE OR REPLACE FUNCTION public.update_challenge_progress(
  p_user_id UUID,
  p_challenge_type TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS VOID AS $$
DECLARE
  challenge_record RECORD;
  current_prog INTEGER;
BEGIN
  -- Loop through all active challenges of the specified type
  FOR challenge_record IN 
    SELECT id, target_value, reward_points 
    FROM public.challenges 
    WHERE type = p_challenge_type AND is_active = true
  LOOP
    -- Insert or update progress
    INSERT INTO public.challenge_progress (challenge_id, user_id, current_progress)
    VALUES (challenge_record.id, p_user_id, p_increment)
    ON CONFLICT (challenge_id, user_id)
    DO UPDATE SET 
      current_progress = challenge_progress.current_progress + p_increment,
      is_completed = CASE 
        WHEN challenge_progress.current_progress + p_increment >= challenge_record.target_value 
        THEN true 
        ELSE challenge_progress.is_completed 
      END,
      completed_at = CASE 
        WHEN challenge_progress.current_progress + p_increment >= challenge_record.target_value AND challenge_progress.completed_at IS NULL
        THEN now()
        ELSE challenge_progress.completed_at
      END;
    
    -- Award points if challenge is completed
    SELECT current_progress INTO current_prog
    FROM public.challenge_progress
    WHERE challenge_id = challenge_record.id AND user_id = p_user_id;
    
    IF current_prog >= challenge_record.target_value THEN
      UPDATE public.profiles 
      SET points = points + challenge_record.reward_points
      WHERE id = p_user_id AND id NOT IN (
        SELECT user_id FROM public.challenge_progress 
        WHERE challenge_id = challenge_record.id 
        AND user_id = p_user_id 
        AND completed_at < now() - INTERVAL '1 second'
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
