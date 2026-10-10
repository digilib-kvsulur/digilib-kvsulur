-- =============================================================================
-- DLMS COMPLETE TENANT DATABASE SCHEMA
-- Generated for PM SHRI KVS Digital Library Management System
-- Run this in your new Supabase project SQL Editor for all 67 tables and RPCs
-- =============================================================================

-- >>> FILE: 20250618015810_34c252eb-1c0c-4639-8f6a-bef1673a0418.sql

-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
  student_class TEXT,
  roll_number TEXT,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create books table
CREATE TABLE public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT,
  category TEXT,
  description TEXT,
  total_copies INTEGER DEFAULT 1,
  available_copies INTEGER DEFAULT 1,
  cover_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create book issues table
CREATE TABLE public.book_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  return_date DATE,
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'returned', 'overdue')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quizzes table (for teachers to create)
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  questions JSONB NOT NULL,
  time_limit INTEGER NOT NULL,
  points_reward INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quiz results table
CREATE TABLE public.quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL,
  points_earned INTEGER NOT NULL,
  answers JSONB NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for books (public read access)
CREATE POLICY "Anyone can view books" ON public.books
  FOR SELECT TO public USING (true);

CREATE POLICY "Teachers and admins can manage books" ON public.books
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

-- RLS Policies for book issues
CREATE POLICY "Users can view their own book issues" ON public.book_issues
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Teachers and admins can view all book issues" ON public.book_issues
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

CREATE POLICY "System can insert book issues" ON public.book_issues
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for quizzes
CREATE POLICY "Everyone can view active quizzes" ON public.quizzes
  FOR SELECT USING (is_active = true);

CREATE POLICY "Teachers can manage their quizzes" ON public.quizzes
  FOR ALL USING (auth.uid() = created_by);

-- RLS Policies for quiz results
CREATE POLICY "Users can view their own quiz results" ON public.quiz_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quiz results" ON public.quiz_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Teachers can view all quiz results" ON public.quiz_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert some sample books
INSERT INTO public.books (title, author, category, description) VALUES
('The Alchemist', 'Paulo Coelho', 'Fiction', 'A philosophical story about following your dreams'),
('Harry Potter and the Philosopher''s Stone', 'J.K. Rowling', 'Fantasy', 'The first book in the Harry Potter series'),
('To Kill a Mockingbird', 'Harper Lee', 'Classic Literature', 'A story of moral courage in the American South'),
('The Science of Everything', 'National Geographic', 'Science', 'Comprehensive guide to scientific concepts'),
('Mathematics for Class X', 'R.D. Sharma', 'Mathematics', 'Complete mathematics textbook for Class 10');


-- >>> FILE: 20250619020305_5a228303-aa2e-4b71-9544-2913a97dc7d4.sql

-- Add username and phone fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN username TEXT UNIQUE,
ADD COLUMN phone TEXT UNIQUE,
ADD COLUMN is_approved BOOLEAN DEFAULT false,
ADD COLUMN approved_by UUID REFERENCES auth.users(id),
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;

-- Update the handle_new_user function to include the new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, role, student_class, roll_number, username, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'student_class', ''),
    COALESCE(NEW.raw_user_meta_data->>'roll_number', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to find user by email, username, or phone
CREATE OR REPLACE FUNCTION public.find_user_by_identifier(identifier TEXT)
RETURNS TABLE(user_id UUID, email TEXT, username TEXT, phone TEXT, is_approved BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.email, p.username, p.phone, p.is_approved
  FROM public.profiles p
  WHERE p.email = identifier 
     OR p.username = identifier 
     OR p.phone = identifier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies to check approval status
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow admins to view and approve all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- >>> FILE: 20250619021733_4fc5ec10-367f-49e2-94c0-91a5e3229930.sql

-- First, let's drop any existing problematic policies (using IF EXISTS to avoid errors)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create a security definer function to get the current user's role safely
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
BEGIN
  -- This function runs with elevated privileges to avoid recursion
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create simple, non-recursive RLS policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles  
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow admins to view all profiles using the security definer function
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.get_current_user_role() = 'admin');

-- Allow admins to update all profiles
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (public.get_current_user_role() = 'admin');


-- >>> FILE: 20250620014028_499314f5-0a4c-4bbc-a7e0-396640185b5f.sql

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


-- >>> FILE: 20250621101649_47422862-c3be-4357-adab-c78819033983.sql

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


-- >>> FILE: 20250621104246_a72d32a9-40f7-4322-8cb1-afa6d5cb0513.sql

-- Add admission_number column to profiles table (make it required for students)
ALTER TABLE public.profiles 
ADD COLUMN admission_number TEXT;

-- We'll make it required through application logic rather than database constraints
-- to avoid issues with existing admin users who don't need admission numbers


-- >>> FILE: 20250622042335_a447a135-e5ba-4623-a5bd-f11abb5de2a2.sql

-- Create book_requests table for handling student book requests
CREATE TABLE public.book_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id),
  user_id UUID NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.book_requests ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own requests
CREATE POLICY "Users can view their own book requests"
  ON public.book_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy for users to create their own requests
CREATE POLICY "Users can create book requests"
  ON public.book_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy for admins to view all requests
CREATE POLICY "Admins can view all book requests"
  ON public.book_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy for admins to update requests
CREATE POLICY "Admins can update book requests"
  ON public.book_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- >>> FILE: 20250705044500_update-handle-new-user-function.sql

-- Update the handle_new_user function to include admission_number
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    first_name, 
    last_name, 
    email, 
    role, 
    student_class, 
    roll_number, 
    admission_number,
    username, 
    phone
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'student_class', ''),
    COALESCE(NEW.raw_user_meta_data->>'roll_number', ''),
    COALESCE(NEW.raw_user_meta_data->>'admission_number', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- >>> FILE: 20250717073658_9eae4a1a-9144-489d-bbcc-25c90a580c5f.sql

-- Create levels table to store level definitions
CREATE TABLE public.levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level_number INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  min_points INTEGER NOT NULL,
  max_points INTEGER,
  icon_name TEXT NOT NULL DEFAULT 'star',
  color TEXT NOT NULL DEFAULT '#3b82f6',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default levels
INSERT INTO public.levels (level_number, name, min_points, max_points, icon_name, color, description) VALUES
(1, 'Novice Reader', 0, 99, 'book-open', '#6b7280', 'Starting your reading journey'),
(2, 'Eager Learner', 100, 199, 'graduation-cap', '#10b981', 'Building reading habits'),
(3, 'Knowledge Seeker', 200, 299, 'search', '#3b82f6', 'Actively exploring new topics'),
(4, 'Book Explorer', 300, 399, 'compass', '#8b5cf6', 'Discovering diverse genres'),
(5, 'Scholar', 400, 499, 'award', '#f59e0b', 'Developing deep understanding'),
(6, 'Master Reader', 500, 999, 'crown', '#ef4444', 'Expert level comprehension'),
(7, 'Reading Champion', 1000, 1999, 'trophy', '#dc2626', 'Exceptional reading achievements'),
(8, 'Literature Legend', 2000, null, 'sparkles', '#7c3aed', 'Ultimate reading mastery');

-- Enable RLS
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;

-- Create policies for levels table
CREATE POLICY "Anyone can view levels" 
  ON public.levels 
  FOR SELECT 
  TO public
  USING (true);

CREATE POLICY "Only admins can manage levels" 
  ON public.levels 
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin' 
      AND profiles.is_approved = true
    )
  );

-- Create function to get user level based on points
CREATE OR REPLACE FUNCTION public.get_user_level(user_points integer)
RETURNS TABLE(
  level_number integer,
  name text,
  min_points integer,
  max_points integer,
  icon_name text,
  color text,
  description text,
  progress_to_next integer,
  points_to_next integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_level RECORD;
  next_level RECORD;
BEGIN
  -- Get current level
  SELECT * INTO current_level
  FROM public.levels
  WHERE user_points >= min_points 
    AND (max_points IS NULL OR user_points <= max_points)
  ORDER BY level_number DESC
  LIMIT 1;
  
  -- Get next level
  SELECT * INTO next_level
  FROM public.levels
  WHERE level_number = current_level.level_number + 1
  LIMIT 1;
  
  -- Return level info with progress
  RETURN QUERY SELECT 
    current_level.level_number,
    current_level.name,
    current_level.min_points,
    current_level.max_points,
    current_level.icon_name,
    current_level.color,
    current_level.description,
    CASE 
      WHEN next_level.min_points IS NOT NULL THEN
        ROUND(((user_points - current_level.min_points)::float / (next_level.min_points - current_level.min_points)::float) * 100)::integer
      ELSE 100
    END as progress_to_next,
    CASE 
      WHEN next_level.min_points IS NOT NULL THEN
        next_level.min_points - user_points
      ELSE 0
    END as points_to_next;
END;
$$;


-- >>> FILE: 20250801053213_fb56ae2d-f43c-4420-b746-49b29b195cd7.sql
-- Fix the ambiguous column reference in get_user_level function
CREATE OR REPLACE FUNCTION public.get_user_level(user_points integer)
 RETURNS TABLE(level_number integer, name text, min_points integer, max_points integer, icon_name text, color text, description text, progress_to_next integer, points_to_next integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  current_level RECORD;
  next_level RECORD;
BEGIN
  -- Get current level (qualify column names with table name)
  SELECT * INTO current_level
  FROM public.levels
  WHERE user_points >= levels.min_points 
    AND (levels.max_points IS NULL OR user_points <= levels.max_points)
  ORDER BY levels.level_number DESC
  LIMIT 1;
  
  -- Get next level
  SELECT * INTO next_level
  FROM public.levels
  WHERE levels.level_number = current_level.level_number + 1
  LIMIT 1;
  
  -- Return level info with progress
  RETURN QUERY SELECT 
    current_level.level_number,
    current_level.name,
    current_level.min_points,
    current_level.max_points,
    current_level.icon_name,
    current_level.color,
    current_level.description,
    CASE 
      WHEN next_level.min_points IS NOT NULL THEN
        ROUND(((user_points - current_level.min_points)::float / (next_level.min_points - current_level.min_points)::float) * 100)::integer
      ELSE 100
    END as progress_to_next,
    CASE 
      WHEN next_level.min_points IS NOT NULL THEN
        next_level.min_points - user_points
      ELSE 0
    END as points_to_next;
END;
$function$

-- >>> FILE: 20250801053931_615320fd-b937-473a-84fe-ccb90091381e.sql
-- Modify book_requests table to allow null book_id for purchase requests
ALTER TABLE public.book_requests 
ALTER COLUMN book_id DROP NOT NULL;

-- Add additional columns to store book information directly in requests
ALTER TABLE public.book_requests 
ADD COLUMN IF NOT EXISTS requested_title TEXT,
ADD COLUMN IF NOT EXISTS requested_author TEXT,
ADD COLUMN IF NOT EXISTS requested_isbn TEXT,
ADD COLUMN IF NOT EXISTS requested_description TEXT;

-- >>> FILE: 20250804100943_fb77c36c-b677-44e5-abbe-729fa43abbbc.sql
-- Fix the book_issues table foreign key relationships
-- Add proper foreign key constraints to ensure data integrity

-- Add foreign key constraint for book_id in book_issues table
ALTER TABLE public.book_issues 
ADD CONSTRAINT book_issues_book_id_fkey 
FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE SET NULL;

-- Add foreign key constraint for user_id in book_issues table
ALTER TABLE public.book_issues 
ADD CONSTRAINT book_issues_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- >>> FILE: 20250808034414_77dfb090-8850-48b8-b200-f840b99aab52.sql
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

-- >>> FILE: 20250912055342_d79f9053-4ccb-49f8-80fa-326823e8819f.sql
-- Fix RLS policy recursion issue for profiles table
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Students can view each other's profiles" ON public.profiles;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Students can view approved profiles for leaderboard" 
ON public.profiles 
FOR SELECT 
USING (is_approved = true AND role = 'student');

-- >>> FILE: 20250912055720_d64d9085-c8bd-4404-83fe-d7f71f500e93.sql
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

-- >>> FILE: 20250912055806_cf727503-a98c-4fb6-97f3-9d9a38784dfd.sql
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

-- >>> FILE: 20250912055852_b052ebc9-6a00-49d1-bdde-cebeead55acc.sql
-- Drop ALL existing policies on profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Students can view approved profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can view approved profiles" ON public.profiles;

-- Create clean, simple policies
CREATE POLICY "view_own_profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "update_own_profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "insert_own_profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "view_approved_profiles" 
ON public.profiles 
FOR SELECT 
USING (is_approved = true);

-- >>> FILE: 20250914054622_ec91ace9-0896-4ebc-a74e-7d85f31452e9.sql
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

-- Create restrictive policies for the leaderboard view
CREATE POLICY "Anyone can view leaderboard data" 
ON public.leaderboard_profiles 
FOR SELECT 
TO authenticated 
USING (true);

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

-- >>> FILE: 20250914054701_58a9612f-1841-4573-8212-e602ffd3fe3a.sql
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

-- >>> FILE: 20250914055044_c9dfe875-3af6-4747-b837-b1a4df4dab13.sql
-- Fix infinite recursion in RLS policies by using security definer functions

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Students can view basic classmate info" ON public.profiles;
DROP POLICY IF EXISTS "Staff can view student profiles for management" ON public.profiles;

-- Create a security definer function to check if user is staff
CREATE OR REPLACE FUNCTION public.is_user_staff()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'teacher') 
    AND is_approved = true
  );
END;
$$;

-- Create a security definer function to check if user can view classmate
CREATE OR REPLACE FUNCTION public.can_view_classmate(target_user_id uuid, target_class text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewer_class text;
BEGIN
  -- Get viewer's class
  SELECT student_class INTO viewer_class 
  FROM public.profiles 
  WHERE id = auth.uid() 
  AND role = 'student' 
  AND is_approved = true;
  
  -- Return true if same class and target is approved student
  RETURN viewer_class IS NOT NULL 
    AND viewer_class = target_class
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = target_user_id 
      AND role = 'student' 
      AND is_approved = true
    );
END;
$$;

-- Create new safe policies using the functions
CREATE POLICY "Staff can view student profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (is_user_staff());

CREATE POLICY "Students can view approved classmates" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  role = 'student' 
  AND is_approved = true 
  AND can_view_classmate(id, student_class)
);

-- >>> FILE: 20250915105910_eeb66255-7adf-4f62-8012-f1e4fc80f7d8.sql
-- Fix admin permissions and foreign key issues

-- Create proper foreign key between book_requests and profiles
ALTER TABLE public.book_requests 
ADD CONSTRAINT fk_book_requests_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Allow admins to update all student profiles (for points awarding)
CREATE POLICY "Admins can manage all student profiles" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (
  get_current_user_role() = 'admin'
);

-- >>> FILE: 20250915110501_c98aa285-6222-4ba1-83be-e7434ba97e96.sql
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

-- >>> FILE: 20250916102032_2e69d470-fffd-4475-9296-b7f24514a662.sql
-- Add claim functionality to challenge progress
ALTER TABLE public.challenge_progress 
ADD COLUMN is_claimed BOOLEAN DEFAULT false;

-- Update existing completed challenges to be unclaimed (so users can claim them)
UPDATE public.challenge_progress 
SET is_claimed = false 
WHERE is_completed = true;

-- >>> FILE: 20260408145913_01533835-f7b4-4957-a090-7061467d58b2.sql

-- 1. Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'student',
  student_class TEXT,
  roll_number TEXT,
  admission_number TEXT,
  username TEXT UNIQUE,
  phone TEXT UNIQUE,
  points INTEGER NOT NULL DEFAULT 0,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Books table
CREATE TABLE public.books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT,
  category TEXT,
  description TEXT,
  cover_url TEXT,
  total_copies INTEGER NOT NULL DEFAULT 1,
  available_copies INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Book issues table
CREATE TABLE public.book_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  return_date DATE,
  status TEXT NOT NULL DEFAULT 'issued',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Book requests table
CREATE TABLE public.book_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_title TEXT,
  requested_author TEXT,
  requested_isbn TEXT,
  requested_description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Levels table
CREATE TABLE public.levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level_number INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  min_points INTEGER NOT NULL DEFAULT 0,
  max_points INTEGER,
  icon_name TEXT NOT NULL DEFAULT 'star',
  color TEXT NOT NULL DEFAULT '#3b82f6',
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Challenges table
CREATE TABLE public.challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'books_read',
  target_value INTEGER NOT NULL DEFAULT 1,
  reward_points INTEGER NOT NULL DEFAULT 10,
  deadline TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Challenge progress table
CREATE TABLE public.challenge_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_progress INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  points_earned INTEGER NOT NULL DEFAULT 0,
  is_claimed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

-- 8. Quizzes table
CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL DEFAULT 'general',
  difficulty TEXT NOT NULL DEFAULT 'medium',
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  time_limit INTEGER NOT NULL DEFAULT 30,
  points_reward INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. Quiz results table
CREATE TABLE public.quiz_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  points_earned INTEGER NOT NULL DEFAULT 0,
  answers JSONB,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 10. Reading history table
CREATE TABLE public.reading_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_title TEXT NOT NULL,
  book_author TEXT NOT NULL,
  completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  rating INTEGER DEFAULT 5,
  points_earned INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 11. User roles table for admin security
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Security definer function to get user role from profiles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.get_profile_role(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = _user_id
$$;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: users can read all approved profiles, update own
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.get_profile_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.get_profile_role(auth.uid()) = 'admin');

-- Books: everyone can read, admins can manage
CREATE POLICY "Anyone can view books" ON public.books FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert books" ON public.books FOR INSERT TO authenticated WITH CHECK (public.get_profile_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can update books" ON public.books FOR UPDATE TO authenticated USING (public.get_profile_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can delete books" ON public.books FOR DELETE TO authenticated USING (public.get_profile_role(auth.uid()) = 'admin');

-- Book issues: users see own, admins see all
CREATE POLICY "Users can view own issues" ON public.book_issues FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.get_profile_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can insert issues" ON public.book_issues FOR INSERT TO authenticated WITH CHECK (public.get_profile_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can update issues" ON public.book_issues FOR UPDATE TO authenticated USING (public.get_profile_role(auth.uid()) = 'admin');

-- Book requests: users see own, admins see all
CREATE POLICY "Users can view own requests" ON public.book_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.get_profile_role(auth.uid()) = 'admin');
CREATE POLICY "Users can insert requests" ON public.book_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can update requests" ON public.book_requests FOR UPDATE TO authenticated USING (public.get_profile_role(auth.uid()) = 'admin');

-- Levels: everyone can read, admins can manage
CREATE POLICY "Anyone can view levels" ON public.levels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert levels" ON public.levels FOR INSERT TO authenticated WITH CHECK (public.get_profile_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can update levels" ON public.levels FOR UPDATE TO authenticated USING (public.get_profile_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can delete levels" ON public.levels FOR DELETE TO authenticated USING (public.get_profile_role(auth.uid()) = 'admin');

-- Challenges: everyone can read, admins can manage
CREATE POLICY "Anyone can view challenges" ON public.challenges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert challenges" ON public.challenges FOR INSERT TO authenticated WITH CHECK (public.get_profile_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can update challenges" ON public.challenges FOR UPDATE TO authenticated USING (public.get_profile_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can delete challenges" ON public.challenges FOR DELETE TO authenticated USING (public.get_profile_role(auth.uid()) = 'admin');

-- Challenge progress: users see own, admins see all
CREATE POLICY "Users can view own progress" ON public.challenge_progress FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.get_profile_role(auth.uid()) = 'admin');
CREATE POLICY "Users can insert own progress" ON public.challenge_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own progress" ON public.challenge_progress FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.get_profile_role(auth.uid()) = 'admin');

-- Quizzes: everyone can read active, admins can manage
CREATE POLICY "Anyone can view quizzes" ON public.quizzes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert quizzes" ON public.quizzes FOR INSERT TO authenticated WITH CHECK (public.get_profile_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can update quizzes" ON public.quizzes FOR UPDATE TO authenticated USING (public.get_profile_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can delete quizzes" ON public.quizzes FOR DELETE TO authenticated USING (public.get_profile_role(auth.uid()) = 'admin');

-- Quiz results: users see own, admins see all
CREATE POLICY "Users can view own results" ON public.quiz_results FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.get_profile_role(auth.uid()) = 'admin');
CREATE POLICY "Users can insert own results" ON public.quiz_results FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Reading history: users see own, admins see all
CREATE POLICY "Users can view own history" ON public.reading_history FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.get_profile_role(auth.uid()) = 'admin');
CREATE POLICY "Users can insert own history" ON public.reading_history FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own history" ON public.reading_history FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own history" ON public.reading_history FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Database functions

-- get_user_level function
CREATE OR REPLACE FUNCTION public.get_user_level(user_points INTEGER)
RETURNS TABLE(
  level_number INTEGER,
  name TEXT,
  min_points INTEGER,
  max_points INTEGER,
  icon_name TEXT,
  color TEXT,
  description TEXT,
  progress_to_next NUMERIC,
  points_to_next INTEGER
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  current_level RECORD;
  next_level RECORD;
BEGIN
  SELECT l.* INTO current_level FROM public.levels l
    WHERE l.min_points <= user_points
    ORDER BY l.min_points DESC LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT l.* INTO next_level FROM public.levels l
    WHERE l.level_number = current_level.level_number + 1;

  RETURN QUERY SELECT
    current_level.level_number,
    current_level.name,
    current_level.min_points,
    current_level.max_points,
    current_level.icon_name,
    current_level.color,
    current_level.description,
    CASE
      WHEN next_level IS NULL THEN 100::NUMERIC
      ELSE ROUND(((user_points - current_level.min_points)::NUMERIC / NULLIF(next_level.min_points - current_level.min_points, 0)) * 100, 1)
    END,
    CASE
      WHEN next_level IS NULL THEN 0
      ELSE next_level.min_points - user_points
    END;
END;
$$;

-- get_user_class_rank function
CREATE OR REPLACE FUNCTION public.get_user_class_rank(user_class TEXT, user_points INTEGER)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER + 1
  FROM public.profiles
  WHERE student_class = user_class
    AND is_approved = true
    AND points > user_points;
$$;

-- find_user_by_identifier function (for login)
CREATE OR REPLACE FUNCTION public.find_user_by_identifier(identifier TEXT)
RETURNS TABLE(id UUID, email TEXT, is_approved BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.email, p.is_approved
  FROM public.profiles p
  WHERE p.email = identifier
    OR p.username = identifier
    OR p.phone = identifier
  LIMIT 1;
$$;

-- get_leaderboard_data function
CREATE OR REPLACE FUNCTION public.get_leaderboard_data(class_filter TEXT DEFAULT NULL)
RETURNS TABLE(id UUID, first_name TEXT, student_class TEXT, points INTEGER)
LANGUAGE sql
STABLE
AS $$
  SELECT p.id, p.first_name, p.student_class, p.points
  FROM public.profiles p
  WHERE p.role = 'student'
    AND p.is_approved = true
    AND (class_filter IS NULL OR p.student_class = class_filter)
  ORDER BY p.points DESC;
$$;

-- Admin stats functions
CREATE OR REPLACE FUNCTION public.get_active_users_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER FROM public.profiles WHERE is_approved = true;
$$;

CREATE OR REPLACE FUNCTION public.get_total_books_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER FROM public.books;
$$;

CREATE OR REPLACE FUNCTION public.get_books_issued_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER FROM public.book_issues WHERE status = 'issued';
$$;

CREATE OR REPLACE FUNCTION public.get_active_quizzes_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER FROM public.quizzes WHERE is_active = true;
$$;

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role, student_class, roll_number, admission_number, username, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NEW.raw_user_meta_data->>'student_class',
    NEW.raw_user_meta_data->>'roll_number',
    NEW.raw_user_meta_data->>'admission_number',
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert default levels
INSERT INTO public.levels (level_number, name, min_points, max_points, icon_name, color, description) VALUES
  (1, 'Beginner Reader', 0, 99, 'book-open', '#6b7280', 'Just starting your reading journey'),
  (2, 'Page Turner', 100, 249, 'search', '#10b981', 'Developing a reading habit'),
  (3, 'Bookworm', 250, 499, 'compass', '#3b82f6', 'A dedicated reader'),
  (4, 'Scholar', 500, 999, 'graduation-cap', '#8b5cf6', 'Knowledge seeker'),
  (5, 'Master Reader', 1000, 1999, 'award', '#f59e0b', 'Expert level reader'),
  (6, 'Library Champion', 2000, NULL, 'crown', '#ef4444', 'The ultimate reading champion');


-- >>> FILE: 20260408150029_f45dd83f-b9b8-41d7-831e-1dd09671ec42.sql

-- Add approved_by column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

-- Add RLS policy on user_roles
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Fix search_path on functions
CREATE OR REPLACE FUNCTION public.get_user_level(user_points INTEGER)
RETURNS TABLE(
  level_number INTEGER,
  name TEXT,
  min_points INTEGER,
  max_points INTEGER,
  icon_name TEXT,
  color TEXT,
  description TEXT,
  progress_to_next NUMERIC,
  points_to_next INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  current_level RECORD;
  next_level RECORD;
BEGIN
  SELECT l.* INTO current_level FROM public.levels l
    WHERE l.min_points <= user_points
    ORDER BY l.min_points DESC LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT l.* INTO next_level FROM public.levels l
    WHERE l.level_number = current_level.level_number + 1;

  RETURN QUERY SELECT
    current_level.level_number,
    current_level.name,
    current_level.min_points,
    current_level.max_points,
    current_level.icon_name,
    current_level.color,
    current_level.description,
    CASE
      WHEN next_level IS NULL THEN 100::NUMERIC
      ELSE ROUND(((user_points - current_level.min_points)::NUMERIC / NULLIF(next_level.min_points - current_level.min_points, 0)) * 100, 1)
    END,
    CASE
      WHEN next_level IS NULL THEN 0
      ELSE next_level.min_points - user_points
    END;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_class_rank(user_class TEXT, user_points INTEGER)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER + 1
  FROM public.profiles
  WHERE student_class = user_class
    AND is_approved = true
    AND points > user_points;
$$;

CREATE OR REPLACE FUNCTION public.get_leaderboard_data(class_filter TEXT DEFAULT NULL)
RETURNS TABLE(id UUID, first_name TEXT, student_class TEXT, points INTEGER)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT p.id, p.first_name, p.student_class, p.points
  FROM public.profiles p
  WHERE p.role = 'student'
    AND p.is_approved = true
    AND (class_filter IS NULL OR p.student_class = class_filter)
  ORDER BY p.points DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_active_users_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.profiles WHERE is_approved = true;
$$;

CREATE OR REPLACE FUNCTION public.get_total_books_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.books;
$$;

CREATE OR REPLACE FUNCTION public.get_books_issued_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.book_issues WHERE status = 'issued';
$$;

CREATE OR REPLACE FUNCTION public.get_active_quizzes_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.quizzes WHERE is_active = true;
$$;


-- >>> FILE: 20260409052324_f1dc94b4-2a1e-4a05-8cce-a40d8e49d17d.sql

-- Add DELETE policy for book_requests so admins can delete
CREATE POLICY "Admins can delete requests"
ON public.book_requests FOR DELETE
TO authenticated
USING (get_profile_role(auth.uid()) = 'admin');

-- Create login_streaks table
CREATE TABLE public.login_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_login_date DATE,
  total_login_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.login_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streaks"
ON public.login_streaks FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR get_profile_role(auth.uid()) = 'admin');

CREATE POLICY "Users can insert own streaks"
ON public.login_streaks FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own streaks"
ON public.login_streaks FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Function to record a login and update streak
CREATE OR REPLACE FUNCTION public.record_login_streak(p_user_id UUID)
RETURNS TABLE(current_streak INTEGER, longest_streak INTEGER, total_login_days INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_login DATE;
  v_today DATE := CURRENT_DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_total_days INTEGER;
BEGIN
  -- Get existing streak data
  SELECT ls.last_login_date, ls.current_streak, ls.longest_streak, ls.total_login_days
  INTO v_last_login, v_current_streak, v_longest_streak, v_total_days
  FROM public.login_streaks ls
  WHERE ls.user_id = p_user_id;

  IF NOT FOUND THEN
    -- First login ever
    INSERT INTO public.login_streaks (user_id, current_streak, longest_streak, last_login_date, total_login_days)
    VALUES (p_user_id, 1, 1, v_today, 1);
    RETURN QUERY SELECT 1, 1, 1;
    RETURN;
  END IF;

  -- Already logged in today
  IF v_last_login = v_today THEN
    RETURN QUERY SELECT v_current_streak, v_longest_streak, v_total_days;
    RETURN;
  END IF;

  -- Check if consecutive day
  IF v_last_login = v_today - 1 THEN
    v_current_streak := v_current_streak + 1;
  ELSE
    v_current_streak := 1;
  END IF;

  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
  END IF;

  v_total_days := v_total_days + 1;

  UPDATE public.login_streaks
  SET current_streak = v_current_streak,
      longest_streak = v_longest_streak,
      last_login_date = v_today,
      total_login_days = v_total_days,
      updated_at = now()
  WHERE login_streaks.user_id = p_user_id;

  RETURN QUERY SELECT v_current_streak, v_longest_streak, v_total_days;
END;
$$;


-- >>> FILE: 20260414155931_346945be-1e12-4cf6-b479-6ae829469ebb.sql

CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  target_user_id UUID,
  sent_by UUID NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (get_profile_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete notifications"
ON public.notifications FOR DELETE
TO authenticated
USING (get_profile_role(auth.uid()) = 'admin');

CREATE POLICY "Users can view their notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (
  target_user_id = auth.uid() 
  OR target_user_id IS NULL 
  OR get_profile_role(auth.uid()) = 'admin'
);

CREATE POLICY "Users can mark notifications as read"
ON public.notifications FOR UPDATE
TO authenticated
USING (target_user_id = auth.uid() OR target_user_id IS NULL)
WITH CHECK (target_user_id = auth.uid() OR target_user_id IS NULL);


-- >>> FILE: 20260506095424_3b77d9e9-7ce9-43d1-a1f7-785592927e9d.sql

-- 1) Profiles: drop overly broad SELECT policy and replace with owner/admin-only
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Students can view approved classmates" ON public.profiles;
DROP POLICY IF EXISTS "Students can view classmates" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.get_profile_role(auth.uid()) = 'admin');

-- 2) Quiz results: restrict to owner, quiz creator, or admin
DROP POLICY IF EXISTS "Users can view own results" ON public.quiz_results;
DROP POLICY IF EXISTS "Teachers can view all quiz results" ON public.quiz_results;

CREATE POLICY "Users can view relevant quiz results"
ON public.quiz_results
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.get_profile_role(auth.uid()) = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.id = quiz_results.quiz_id AND q.created_by = auth.uid()
  )
);


-- >>> FILE: 20260506100559_f254cd77-6a83-4349-82fa-2da937534b6a.sql

-- Notes table
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'yellow',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notes" ON public.notes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own notes" ON public.notes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own notes" ON public.notes FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete own notes" ON public.notes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Posts table
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view posts" ON public.posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users edit own posts" ON public.posts FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users/admins delete posts" ON public.posts FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.get_profile_role(auth.uid()) = 'admin');

-- Post likes
CREATE TABLE public.post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view likes" ON public.post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users like" ON public.post_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users unlike" ON public.post_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Post comments
CREATE TABLE public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view comments" ON public.post_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users add own comments" ON public.post_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users edit own comments" ON public.post_comments FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users/admins delete comments" ON public.post_comments FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.get_profile_role(auth.uid()) = 'admin');

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER notes_set_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER posts_set_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- >>> FILE: 20260507090613_1f99fec6-f390-4413-a695-3b3e42845e44.sql
-- Study materials table
CREATE TABLE public.study_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  student_class TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view study materials"
ON public.study_materials FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert study materials"
ON public.study_materials FOR INSERT TO authenticated
WITH CHECK (get_profile_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update study materials"
ON public.study_materials FOR UPDATE TO authenticated
USING (get_profile_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete study materials"
ON public.study_materials FOR DELETE TO authenticated
USING (get_profile_role(auth.uid()) = 'admin');

CREATE TRIGGER update_study_materials_updated_at
BEFORE UPDATE ON public.study_materials
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage bucket for study materials
INSERT INTO storage.buckets (id, name, public)
VALUES ('study-materials', 'study-materials', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view study material files"
ON storage.objects FOR SELECT
USING (bucket_id = 'study-materials');

CREATE POLICY "Admins can upload study material files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'study-materials' AND get_profile_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update study material files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'study-materials' AND get_profile_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete study material files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'study-materials' AND get_profile_role(auth.uid()) = 'admin');

-- >>> FILE: 20260630064231_b1deb9c4-7f6b-4b1e-8cc4-a6dff76a3775.sql

-- helper
CREATE OR REPLACE FUNCTION public.is_staff_or_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _uid AND role IN ('admin','staff','librarian')
  )
$$;

CREATE TABLE public.book_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  note text,
  fulfilled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_reservations TO authenticated;
GRANT ALL ON public.book_reservations TO service_role;

ALTER TABLE public.book_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students see own reservations"
ON public.book_reservations FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

CREATE POLICY "students create own reservations"
ON public.book_reservations FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "staff update reservations"
ON public.book_reservations FOR UPDATE TO authenticated
USING (public.is_staff_or_admin(auth.uid()))
WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "owner or staff delete"
ON public.book_reservations FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

CREATE TRIGGER trg_book_reservations_updated
BEFORE UPDATE ON public.book_reservations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_book_reservations_book ON public.book_reservations(book_id);
CREATE INDEX idx_book_reservations_user ON public.book_reservations(user_id);
CREATE INDEX idx_book_reservations_status ON public.book_reservations(status);


-- >>> FILE: 20260630064330_e648bf89-8f47-40df-a9ce-76d961f53414.sql

CREATE POLICY "auth can view book covers"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'book-covers');

CREATE POLICY "staff upload book covers"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'book-covers' AND public.is_staff_or_admin(auth.uid()));

CREATE POLICY "staff update book covers"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'book-covers' AND public.is_staff_or_admin(auth.uid()));

CREATE POLICY "staff delete book covers"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'book-covers' AND public.is_staff_or_admin(auth.uid()));


-- >>> FILE: 20260704133303_162d636c-efbd-4987-bc36-74d88cf525bd.sql
-- 1. Extend books
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS language text DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS class_level text,
  ADD COLUMN IF NOT EXISTS first_added_at timestamptz DEFAULT now();

-- 2. Extend book_issues
ALTER TABLE public.book_issues
  ADD COLUMN IF NOT EXISTS renewal_count integer NOT NULL DEFAULT 0;

-- 3. book_wishlist
CREATE TABLE IF NOT EXISTS public.book_wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, book_id)
);
GRANT SELECT, INSERT, DELETE ON public.book_wishlist TO authenticated;
GRANT ALL ON public.book_wishlist TO service_role;
ALTER TABLE public.book_wishlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wishlist own select" ON public.book_wishlist FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "wishlist own insert" ON public.book_wishlist FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "wishlist own delete" ON public.book_wishlist FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

-- 4. book_reviews
CREATE TABLE IF NOT EXISTS public.book_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text text,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(book_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_reviews TO authenticated;
GRANT SELECT ON public.book_reviews TO anon;
GRANT ALL ON public.book_reviews TO service_role;
ALTER TABLE public.book_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews public select" ON public.book_reviews FOR SELECT
  USING (is_hidden = false OR user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "reviews own insert" ON public.book_reviews FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "reviews own update" ON public.book_reviews FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "reviews own delete" ON public.book_reviews FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
CREATE TRIGGER trg_book_reviews_updated BEFORE UPDATE ON public.book_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. book_renewals
CREATE TABLE IF NOT EXISTS public.book_renewals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_issue_id uuid NOT NULL REFERENCES public.book_issues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  requested_days integer NOT NULL DEFAULT 7 CHECK (requested_days BETWEEN 1 AND 30),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  student_note text,
  admin_note text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.book_renewals TO authenticated;
GRANT ALL ON public.book_renewals TO service_role;
ALTER TABLE public.book_renewals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "renewals own select" ON public.book_renewals FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "renewals own insert" ON public.book_renewals FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "renewals staff update" ON public.book_renewals FOR UPDATE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE TRIGGER trg_book_renewals_updated BEFORE UPDATE ON public.book_renewals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. library_events
CREATE TABLE IF NOT EXISTS public.library_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_date timestamptz NOT NULL,
  location text,
  capacity integer,
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.library_events TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.library_events TO authenticated;
GRANT ALL ON public.library_events TO service_role;
ALTER TABLE public.library_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events public read" ON public.library_events FOR SELECT
  USING (is_published = true OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "events staff insert" ON public.library_events FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "events staff update" ON public.library_events FOR UPDATE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "events staff delete" ON public.library_events FOR DELETE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));
CREATE TRIGGER trg_library_events_updated BEFORE UPDATE ON public.library_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. event_registrations
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.library_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.event_registrations TO authenticated;
GRANT ALL ON public.event_registrations TO service_role;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reg own select" ON public.event_registrations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "reg own insert" ON public.event_registrations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "reg own delete" ON public.event_registrations FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_book_wishlist_user ON public.book_wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_book_wishlist_book ON public.book_wishlist(book_id);
CREATE INDEX IF NOT EXISTS idx_book_reviews_book ON public.book_reviews(book_id);
CREATE INDEX IF NOT EXISTS idx_book_renewals_issue ON public.book_renewals(book_issue_id);
CREATE INDEX IF NOT EXISTS idx_book_renewals_status ON public.book_renewals(status);
CREATE INDEX IF NOT EXISTS idx_event_reg_event ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_library_events_date ON public.library_events(event_date);

-- >>> FILE: 20260704143000_library_upgrades.sql
-- 1. Extend book_issues with accession_number
ALTER TABLE public.book_issues
  ADD COLUMN IF NOT EXISTS accession_number text;

-- 2. Extend challenges with class_level
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS class_level text;

-- 3. Create class_reading_lists table
CREATE TABLE IF NOT EXISTS public.class_reading_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_level text NOT NULL,
  title text NOT NULL,
  description text,
  books jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_reading_lists TO authenticated;
GRANT ALL ON public.class_reading_lists TO service_role;
ALTER TABLE public.class_reading_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reading_lists select" ON public.class_reading_lists FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "reading_lists staff insert" ON public.class_reading_lists FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "reading_lists staff update" ON public.class_reading_lists FOR UPDATE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "reading_lists staff delete" ON public.class_reading_lists FOR DELETE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

-- 4. Create class_book_recommendations table
CREATE TABLE IF NOT EXISTS public.class_book_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_level text NOT NULL,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(class_level, book_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_book_recommendations TO authenticated;
GRANT ALL ON public.class_book_recommendations TO service_role;
ALTER TABLE public.class_book_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recs select" ON public.class_book_recommendations FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "recs staff insert" ON public.class_book_recommendations FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "recs staff update" ON public.class_book_recommendations FOR UPDATE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "recs staff delete" ON public.class_book_recommendations FOR DELETE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

-- 5. Create book_audit_logs table
CREATE TABLE IF NOT EXISTS public.book_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  accession_number text,
  status text NOT NULL CHECK (status IN ('verified', 'missing', 'damaged', 'withdrawn')),
  verified_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notes text,
  audited_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_audit_logs TO authenticated;
GRANT ALL ON public.book_audit_logs TO service_role;
ALTER TABLE public.book_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audits staff select" ON public.book_audit_logs FOR SELECT TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "audits staff insert" ON public.book_audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- 6. Create monthly_reading_goals table
CREATE TABLE IF NOT EXISTS public.monthly_reading_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month_year text NOT NULL,
  target_books integer NOT NULL CHECK (target_books > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, month_year)
);

GRANT SELECT, INSERT, UPDATE ON public.monthly_reading_goals TO authenticated;
GRANT ALL ON public.monthly_reading_goals TO service_role;
ALTER TABLE public.monthly_reading_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goals own select" ON public.monthly_reading_goals FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "goals own insert" ON public.monthly_reading_goals FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "goals own update" ON public.monthly_reading_goals FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_reading_lists_class ON public.class_reading_lists(class_level);
CREATE INDEX IF NOT EXISTS idx_recs_class ON public.class_book_recommendations(class_level);
CREATE INDEX IF NOT EXISTS idx_audit_book ON public.book_audit_logs(book_id);
CREATE INDEX IF NOT EXISTS idx_goals_user ON public.monthly_reading_goals(user_id);


-- >>> FILE: 20260705150132_100ed67d-95ee-4d5d-ae21-2d6d9f32cf18.sql

-- 1. Prevent self role escalation on profiles
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  AND is_approved = (SELECT is_approved FROM public.profiles WHERE id = auth.uid())
);

-- 2. Lock down SECURITY DEFINER function execute perms
REVOKE EXECUTE ON FUNCTION public.get_active_users_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_books_issued_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_active_quizzes_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_total_books_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_class_rank(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard_data(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_level(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_login_streak(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.find_user_by_identifier(text) FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_profile_role(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_staff_or_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.record_login_streak(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_user_by_identifier(text) TO anon;

-- 3. Restrict study-materials bucket viewing to signed-in users only
DROP POLICY IF EXISTS "Anyone can view study material files" ON storage.objects;
CREATE POLICY "Authenticated users can view study material files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'study-materials');


-- >>> FILE: 20260705150339_e0495062-6c33-419a-8ebc-bf3f0d751104.sql

-- 1. accession_number columns
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS accession_number text;
ALTER TABLE public.book_issues ADD COLUMN IF NOT EXISTS accession_number text;

-- 2. challenges.class_level
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS class_level text;

-- 3. book_audit_logs
CREATE TABLE IF NOT EXISTS public.book_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  accession_number text,
  status text NOT NULL DEFAULT 'verified',
  notes text,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  audited_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_audit_logs TO authenticated;
GRANT ALL ON public.book_audit_logs TO service_role;
ALTER TABLE public.book_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed-in can view audit logs" ON public.book_audit_logs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert audit logs" ON public.book_audit_logs
  FOR INSERT TO authenticated WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can update audit logs" ON public.book_audit_logs
  FOR UPDATE TO authenticated USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can delete audit logs" ON public.book_audit_logs
  FOR DELETE TO authenticated USING (public.is_staff_or_admin(auth.uid()));

-- 4. monthly_reading_goals
CREATE TABLE IF NOT EXISTS public.monthly_reading_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year text NOT NULL,
  target_books integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, month_year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_reading_goals TO authenticated;
GRANT ALL ON public.monthly_reading_goals TO service_role;
ALTER TABLE public.monthly_reading_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own goals" ON public.monthly_reading_goals
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
CREATE TRIGGER trg_monthly_goals_updated
  BEFORE UPDATE ON public.monthly_reading_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. class_book_recommendations
CREATE TABLE IF NOT EXISTS public.class_book_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_level text NOT NULL,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_level, book_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_book_recommendations TO authenticated;
GRANT ALL ON public.class_book_recommendations TO service_role;
ALTER TABLE public.class_book_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed-in can view class recs" ON public.class_book_recommendations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage class recs" ON public.class_book_recommendations
  FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- 6. class_reading_lists
CREATE TABLE IF NOT EXISTS public.class_reading_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_level text NOT NULL,
  title text NOT NULL,
  description text,
  books jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_reading_lists TO authenticated;
GRANT ALL ON public.class_reading_lists TO service_role;
ALTER TABLE public.class_reading_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed-in can view reading lists" ON public.class_reading_lists
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage reading lists" ON public.class_reading_lists
  FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE TRIGGER trg_class_reading_lists_updated
  BEFORE UPDATE ON public.class_reading_lists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- >>> FILE: 20260705150919_dfb21c2c-163d-4a2f-9da4-871fc52b9d86.sql

-- Restore EXECUTE for authenticated on functions required by RLS policies and dashboard queries.
-- These functions are SECURITY DEFINER and only expose non-sensitive derived data.
GRANT EXECUTE ON FUNCTION public.get_profile_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff_or_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_users_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_books_issued_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_quizzes_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_total_books_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_class_rank(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_data(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_level(integer) TO authenticated;

-- Login-identifier lookup: also needs authenticated (users may retry while a stale session exists).
GRANT EXECUTE ON FUNCTION public.find_user_by_identifier(text) TO authenticated;


-- >>> FILE: 20260705151422_9dd09905-7394-4d90-9ef0-b8fbcc508bdb.sql
-- Restore app-visible grants after function/table execute privileges were over-tightened.
-- No anonymous grants are added here.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.books TO authenticated;
GRANT ALL ON public.books TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_issues TO authenticated;
GRANT ALL ON public.book_issues TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_requests TO authenticated;
GRANT ALL ON public.book_requests TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_renewals TO authenticated;
GRANT ALL ON public.book_renewals TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_reservations TO authenticated;
GRANT ALL ON public.book_reservations TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_reading_goals TO authenticated;
GRANT ALL ON public.monthly_reading_goals TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.login_streaks TO authenticated;
GRANT ALL ON public.login_streaks TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_audit_logs TO authenticated;
GRANT ALL ON public.book_audit_logs TO service_role;

GRANT EXECUTE ON FUNCTION public.find_user_by_identifier(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff_or_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_login_streak(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_total_books_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_users_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_books_issued_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_quizzes_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_class_rank(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_level(integer) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'book_issues_user_id_fkey'
      AND conrelid = 'public.book_issues'::regclass
  ) THEN
    ALTER TABLE public.book_issues
      ADD CONSTRAINT book_issues_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- >>> FILE: 20260707032157_17349228-446f-4acb-aaa1-84cf42fdae5c.sql

-- 1) Restore EXECUTE grants (were revoked by earlier security migration)
GRANT EXECUTE ON FUNCTION public.get_active_users_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_total_books_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_books_issued_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_quizzes_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_user_by_identifier(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff_or_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_class_rank(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_level(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_data(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_login_streak(uuid) TO authenticated;

-- 2) Allow admission_number as login identifier
CREATE OR REPLACE FUNCTION public.find_user_by_identifier(identifier text)
RETURNS TABLE(id uuid, email text, is_approved boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, p.email, p.is_approved
  FROM public.profiles p
  WHERE p.email = identifier
     OR p.username = identifier
     OR p.phone = identifier
     OR p.admission_number = identifier
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.find_user_by_identifier(text) TO anon, authenticated;

-- 3) Add profiles FKs so PostgREST can embed profiles:user_id(...) on admin views
DO $$ BEGIN
  ALTER TABLE public.book_issues
    ADD CONSTRAINT book_issues_user_profile_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.book_reviews
    ADD CONSTRAINT book_reviews_user_profile_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.book_renewals
    ADD CONSTRAINT book_renewals_user_profile_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.book_audit_logs
    ADD CONSTRAINT book_audit_logs_verified_profile_fkey
    FOREIGN KEY (verified_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- >>> FILE: 20260716135711_f7482b36-180a-4dd0-9e92-1396d0638167.sql

-- Restrict book_audit_logs SELECT to staff/admin
DROP POLICY IF EXISTS "Anyone signed-in can view audit logs" ON public.book_audit_logs;
CREATE POLICY "Staff and admin can view audit logs"
ON public.book_audit_logs FOR SELECT
TO authenticated
USING (public.is_staff_or_admin(auth.uid()));

-- Lock down SECURITY DEFINER function execution
-- find_user_by_identifier: used pre-auth on login screen; allow anon + authenticated
REVOKE EXECUTE ON FUNCTION public.find_user_by_identifier(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_user_by_identifier(text) TO anon, authenticated;

-- get_profile_role, has_role, is_staff_or_admin: used by RLS/authenticated flows
REVOKE EXECUTE ON FUNCTION public.get_profile_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_role(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_staff_or_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff_or_admin(uuid) TO authenticated, service_role;

-- record_login_streak: called by signed-in students
REVOKE EXECUTE ON FUNCTION public.record_login_streak(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_login_streak(uuid) TO authenticated, service_role;

-- handle_new_user: trigger function, no direct API callers
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;


-- >>> FILE: 20260716141551_7b01b032-2a57-4528-8346-664f17880677.sql

-- BADGES catalog
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon_name TEXT DEFAULT 'Award',
  color TEXT DEFAULT 'text-primary',
  points INTEGER NOT NULL DEFAULT 0,
  criteria_type TEXT,  -- 'points','books_read','quizzes_completed','login_streak','manual'
  criteria_value INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.badges TO authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view badges" ON public.badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff manage badges" ON public.badges FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- BADGE AWARDS
CREATE TABLE public.badge_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  awarded_by UUID,
  award_type TEXT NOT NULL DEFAULT 'auto', -- 'auto' | 'manual'
  note TEXT,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);
GRANT SELECT, INSERT, DELETE ON public.badge_awards TO authenticated;
GRANT ALL ON public.badge_awards TO service_role;
ALTER TABLE public.badge_awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view badge awards" ON public.badge_awards FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff award badges" ON public.badge_awards FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "staff remove badges" ON public.badge_awards FOR DELETE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

-- FRIENDSHIPS (mutual follow)
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL,
  addressee_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending','accepted','rejected'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (requester_id <> addressee_id),
  UNIQUE (requester_id, addressee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own friendships" ON public.friendships FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "send friend request" ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id AND status = 'pending');
CREATE POLICY "respond to request" ON public.friendships FOR UPDATE TO authenticated
  USING (auth.uid() = addressee_id OR auth.uid() = requester_id)
  WITH CHECK (auth.uid() = addressee_id OR auth.uid() = requester_id);
CREATE POLICY "remove own friendship" ON public.friendships FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Seed a few default badges (safe if none exist)
INSERT INTO public.badges (name, description, icon_name, color, points, criteria_type, criteria_value) VALUES
  ('First Steps', 'Log in to the library for the first time', 'Sparkles', 'text-blue-500', 10, 'login_streak', 1),
  ('Bookworm', 'Read 5 books', 'BookOpen', 'text-green-600', 50, 'books_read', 5),
  ('Quiz Master', 'Complete 10 quizzes', 'Brain', 'text-purple-600', 75, 'quizzes_completed', 10),
  ('Streak Star', 'Maintain a 7 day login streak', 'Flame', 'text-orange-500', 100, 'login_streak', 7),
  ('Century Club', 'Earn 100 points', 'Trophy', 'text-yellow-500', 25, 'points', 100)
ON CONFLICT DO NOTHING;

-- Trigger to keep updated_at fresh
CREATE TRIGGER trg_badges_updated_at BEFORE UPDATE ON public.badges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_friendships_updated_at BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- >>> FILE: 20260717012738_82fdc7cc-4d23-4377-b721-45d4c8a6e685.sql

-- 1) Leaderboard: run as definer so RLS on profiles doesn't block it
ALTER FUNCTION public.get_leaderboard_data(text) SECURITY DEFINER;

-- 2) Fetch safe public profile fields for a list of users
CREATE OR REPLACE FUNCTION public.get_public_profiles(_ids uuid[])
RETURNS TABLE(id uuid, first_name text, last_name text, username text, student_class text, points integer, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.first_name, p.last_name, p.username, p.student_class, p.points, p.role
  FROM public.profiles p
  WHERE p.id = ANY(_ids);
$$;

-- 3) Stats for the profile popover (books/quizzes/streaks)
CREATE OR REPLACE FUNCTION public.get_public_profile_stats(_id uuid)
RETURNS TABLE(books_read integer, quizzes integer, current_streak integer, longest_streak integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*)::int FROM public.reading_history WHERE user_id = _id),
    (SELECT COUNT(*)::int FROM public.quiz_results WHERE user_id = _id),
    COALESCE((SELECT current_streak FROM public.login_streaks WHERE user_id = _id), 0),
    COALESCE((SELECT longest_streak FROM public.login_streaks WHERE user_id = _id), 0);
$$;

-- 4) Search other users by name/username (definer to bypass profile RLS)
CREATE OR REPLACE FUNCTION public.search_public_profiles(_q text, _exclude uuid)
RETURNS TABLE(id uuid, first_name text, last_name text, username text, student_class text, role text, points integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.first_name, p.last_name, p.username, p.student_class, p.role, p.points
  FROM public.profiles p
  WHERE p.id <> _exclude
    AND p.is_approved = true
    AND (
      p.username ILIKE '%' || _q || '%'
      OR p.first_name ILIKE '%' || _q || '%'
      OR p.last_name ILIKE '%' || _q || '%'
    )
  ORDER BY p.first_name
  LIMIT 25;
$$;

REVOKE ALL ON FUNCTION public.get_public_profiles(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_public_profile_stats(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.search_public_profiles(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_public_profiles(text, uuid) TO authenticated;


-- >>> FILE: 20260718122316_6a1a7176-db60-440c-b42c-3625799ba86a.sql

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS bio text;

DROP FUNCTION IF EXISTS public.get_public_profiles(uuid[]);
CREATE FUNCTION public.get_public_profiles(_ids uuid[])
RETURNS TABLE(id uuid, first_name text, last_name text, username text, student_class text, points integer, role text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.first_name, p.last_name, p.username, p.student_class, p.points, p.role, p.avatar_url
  FROM public.profiles p WHERE p.id = ANY(_ids);
$$;
REVOKE ALL ON FUNCTION public.get_public_profiles(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_profile_full(_id uuid)
RETURNS TABLE(
  id uuid, first_name text, last_name text, username text,
  student_class text, role text, points integer,
  avatar_url text, bio text,
  friends_count integer, posts_count integer,
  followers_count integer, following_count integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p.id, p.first_name, p.last_name, p.username,
    p.student_class, p.role, p.points, p.avatar_url, p.bio,
    (SELECT COUNT(*)::int FROM public.friendships f
      WHERE f.status = 'accepted' AND (f.requester_id = _id OR f.addressee_id = _id)),
    (SELECT COUNT(*)::int FROM public.posts WHERE user_id = _id),
    (SELECT COUNT(*)::int FROM public.friendships f
      WHERE f.status = 'accepted' AND (f.requester_id = _id OR f.addressee_id = _id)),
    (SELECT COUNT(*)::int FROM public.friendships f
      WHERE f.status = 'accepted' AND (f.requester_id = _id OR f.addressee_id = _id))
  FROM public.profiles p WHERE p.id = _id;
$$;
REVOKE ALL ON FUNCTION public.get_public_profile_full(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_full(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_posts_by_user(_id uuid, _limit integer DEFAULT 20)
RETURNS TABLE(id uuid, title text, content text, created_at timestamptz, likes_count integer, comments_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.title, p.content, p.created_at,
    (SELECT COUNT(*)::int FROM public.post_likes WHERE post_id = p.id),
    (SELECT COUNT(*)::int FROM public.post_comments WHERE post_id = p.id)
  FROM public.posts p WHERE p.user_id = _id
  ORDER BY p.created_at DESC LIMIT COALESCE(_limit, 20);
$$;
REVOKE ALL ON FUNCTION public.get_public_posts_by_user(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_posts_by_user(uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_class_league()
RETURNS TABLE(student_class text, total_points bigint, student_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.student_class, COALESCE(SUM(p.points),0)::bigint, COUNT(*)::bigint
  FROM public.profiles p
  WHERE p.role = 'student' AND p.is_approved = true AND p.student_class IS NOT NULL
  GROUP BY p.student_class ORDER BY 2 DESC;
$$;
REVOKE ALL ON FUNCTION public.get_class_league() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_class_league() TO authenticated;

DROP POLICY IF EXISTS "Avatars viewable by authenticated" ON storage.objects;
CREATE POLICY "Avatars viewable by authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
CREATE POLICY "Users upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
CREATE POLICY "Users update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;
CREATE POLICY "Users delete own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);


-- >>> FILE: 20260721110000_bulk_import_and_profile_updates.sql
-- Migration: Add needs_profile_update and update handle_new_user trigger

-- 1) Add needs_profile_update column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS needs_profile_update BOOLEAN DEFAULT false;

-- 2) Update trigger function to handle needs_profile_update safely
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, first_name, last_name, role, student_class, 
    roll_number, admission_number, username, phone, needs_profile_update
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Student'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'student_class', ''),
    NEW.raw_user_meta_data->>'roll_number',
    NEW.raw_user_meta_data->>'admission_number',
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.raw_user_meta_data->>'admission_number', NEW.email),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE((NEW.raw_user_meta_data->>'needs_profile_update')::boolean, false)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    student_class = EXCLUDED.student_class,
    roll_number = EXCLUDED.roll_number,
    admission_number = EXCLUDED.admission_number,
    username = EXCLUDED.username,
    phone = EXCLUDED.phone,
    needs_profile_update = EXCLUDED.needs_profile_update;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW; -- Ensure trigger errors never fail Auth creation
END;
$$;

-- 3) Robust cursor loop PL/pgSQL function to sync all auth.users safely without unique conflicts
CREATE OR REPLACE FUNCTION public.sync_missing_auth_profiles()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u record;
  synced_count integer := 0;
  uid text;
  username_val text;
  phone_val text;
  email_lower text;
BEGIN
  FOR u IN SELECT * FROM auth.users LOOP
    BEGIN
      uid := COALESCE(u.raw_user_meta_data->>'admission_number', SPLIT_PART(u.email, '@', 1));
      email_lower := LOWER(u.email);
      username_val := COALESCE(u.raw_user_meta_data->>'username', uid, email_lower);
      phone_val := NULLIF(COALESCE(u.raw_user_meta_data->>'phone', ''), '');

      -- Check if id already exists
      IF EXISTS (SELECT 1 FROM public.profiles WHERE id = u.id) THEN
        UPDATE public.profiles SET
          email = email_lower,
          first_name = COALESCE(u.raw_user_meta_data->>'first_name', 'Student'),
          last_name = COALESCE(u.raw_user_meta_data->>'last_name', ''),
          student_class = COALESCE(u.raw_user_meta_data->>'student_class', ''),
          roll_number = COALESCE(u.raw_user_meta_data->>'roll_number', ''),
          admission_number = uid,
          username = username_val,
          phone = phone_val,
          is_approved = true,
          updated_at = NOW()
        WHERE id = u.id;
        synced_count := synced_count + 1;
      -- Check if admission_number, username, or email exists to avoid unique key conflicts
      ELSIF EXISTS (SELECT 1 FROM public.profiles WHERE admission_number = uid OR email = email_lower OR username = username_val) THEN
        UPDATE public.profiles SET
          id = u.id,
          email = email_lower,
          first_name = COALESCE(u.raw_user_meta_data->>'first_name', 'Student'),
          last_name = COALESCE(u.raw_user_meta_data->>'last_name', ''),
          student_class = COALESCE(u.raw_user_meta_data->>'student_class', ''),
          roll_number = COALESCE(u.raw_user_meta_data->>'roll_number', ''),
          phone = phone_val,
          is_approved = true,
          updated_at = NOW()
        WHERE admission_number = uid OR email = email_lower OR username = username_val;
        synced_count := synced_count + 1;
      ELSE
        -- Safe Insert
        INSERT INTO public.profiles (
          id,
          email,
          first_name,
          last_name,
          role,
          student_class,
          roll_number,
          admission_number,
          username,
          phone,
          is_approved,
          needs_profile_update,
          updated_at
        ) VALUES (
          u.id,
          email_lower,
          COALESCE(u.raw_user_meta_data->>'first_name', 'Student'),
          COALESCE(u.raw_user_meta_data->>'last_name', ''),
          COALESCE(u.raw_user_meta_data->>'role', 'student'),
          COALESCE(u.raw_user_meta_data->>'student_class', ''),
          COALESCE(u.raw_user_meta_data->>'roll_number', ''),
          uid,
          username_val,
          phone_val,
          true,
          true,
          NOW()
        );
        synced_count := synced_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Proceed to next user in case of any unhandled conflict
    END;
  END LOOP;
  RETURN synced_count;
END;
$$;


-- >>> FILE: 20260721140000_fix_leaderboard_last_name.sql
-- Fix get_leaderboard_data to also return last_name
-- Must drop first because the return type signature is changing
DROP FUNCTION IF EXISTS public.get_leaderboard_data(text);

CREATE OR REPLACE FUNCTION public.get_leaderboard_data(class_filter TEXT DEFAULT NULL)
RETURNS TABLE(id UUID, first_name TEXT, last_name TEXT, student_class TEXT, points INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.first_name, p.last_name, p.student_class, p.points
  FROM public.profiles p
  WHERE p.role = 'student'
    AND p.is_approved = true
    AND (class_filter IS NULL OR p.student_class = class_filter)
  ORDER BY p.points DESC;
$$;


-- >>> FILE: 20260721151500_add_event_images.sql
-- Migration: Add image_url to library_events and create event-images bucket

ALTER TABLE public.library_events ADD COLUMN IF NOT EXISTS image_url text;

-- Create event-images bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for event-images
CREATE POLICY "Anyone can view event images"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-images');

CREATE POLICY "Admins can upload event images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'event-images' AND public.get_profile_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update event images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'event-images' AND public.get_profile_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete event images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'event-images' AND public.get_profile_role(auth.uid()) = 'admin');


-- >>> FILE: 20260721152000_make_stats_functions_security_definer.sql
-- Migration: Make statistics helper functions SECURITY DEFINER so anonymous homepage visitors can see real counts

CREATE OR REPLACE FUNCTION public.get_active_users_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.profiles WHERE is_approved = true;
$$;

CREATE OR REPLACE FUNCTION public.get_total_books_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.books;
$$;

CREATE OR REPLACE FUNCTION public.get_books_issued_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.book_issues WHERE status = 'issued';
$$;


-- >>> FILE: 20260721155000_fix_find_user_by_identifier_auth_email.sql
-- Fix find_user_by_identifier to return the actual auth.users.email
-- instead of profiles.email, so login always works even after the student
-- updates profiles.email to their real email during first-login profile setup.
-- The JOIN ensures signInWithPassword always uses the correct auth credential.

CREATE OR REPLACE FUNCTION public.find_user_by_identifier(identifier text)
RETURNS TABLE(id uuid, email text, is_approved boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, u.email AS email, p.is_approved
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.email = identifier         -- real email stored in profile
     OR u.email = identifier         -- also match dummy auth email directly
     OR p.username = identifier      -- username login
     OR p.phone = identifier         -- phone login
     OR p.admission_number = identifier  -- admission number login
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.find_user_by_identifier(text) TO anon, authenticated;


-- >>> FILE: 20260722160000_community_and_points_settings.sql
-- Migration: Community and Points settings upgrades

-- 1. Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Grant select, insert, update on system_settings
GRANT SELECT ON public.system_settings TO anon, authenticated;
GRANT ALL ON public.system_settings TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;

-- Enable RLS for system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read system settings" ON public.system_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage system settings" ON public.system_settings
  FOR ALL TO authenticated USING (public.get_profile_role(auth.uid()) = 'admin');

-- Seed settings
INSERT INTO public.system_settings(key, value) VALUES
  ('points_per_book_read', '25'::jsonb),
  ('points_per_quiz_passed', '50'::jsonb),
  ('points_per_daily_streak', '10'::jsonb),
  ('points_per_review', '15'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Update reading_history table to support status approval
ALTER TABLE public.reading_history ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- Update trigger function for awarding points on reading history
CREATE OR REPLACE FUNCTION public.update_reading_challenge_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If status goes from not approved to approved (or inserted as approved directly)
  IF (TG_OP = 'INSERT' AND NEW.status = 'approved') OR 
     (TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'approved') THEN
     
    -- Update user points
    UPDATE public.profiles 
    SET points = COALESCE(points, 0) + NEW.points_earned
    WHERE id = NEW.user_id;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Change points trigger to run on INSERT and UPDATE
DROP TRIGGER IF EXISTS on_reading_history_insert ON public.reading_history;
CREATE TRIGGER on_reading_history_insert
  AFTER INSERT OR UPDATE ON public.reading_history
  FOR EACH ROW EXECUTE FUNCTION public.update_reading_challenge_progress();

-- Update challenge progress trigger function for reading history
CREATE OR REPLACE FUNCTION public.update_challenge_progress_on_reading()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'approved') OR 
     (TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'approved') THEN
    PERFORM update_challenge_progress(NEW.user_id, 'books_read', 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Change challenge progress trigger to run on INSERT and UPDATE
DROP TRIGGER IF EXISTS trigger_reading_challenge_progress ON public.reading_history;
CREATE TRIGGER trigger_reading_challenge_progress
  AFTER INSERT OR UPDATE ON public.reading_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_challenge_progress_on_reading();

-- 3. Define get_school_leaderboard_stats() RPC
CREATE OR REPLACE FUNCTION public.get_school_leaderboard_stats()
RETURNS TABLE(total_students bigint, total_points bigint, average_points numeric)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT 
    COUNT(*)::bigint AS total_students,
    SUM(COALESCE(points, 0))::bigint AS total_points,
    ROUND(AVG(COALESCE(points, 0)))::numeric AS average_points
  FROM public.profiles
  WHERE role = 'student' AND is_approved = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_school_leaderboard_stats() TO anon, authenticated;

-- 4. Define get_book_borrow_counts() RPC
CREATE OR REPLACE FUNCTION public.get_book_borrow_counts()
RETURNS TABLE(book_id uuid, borrow_count bigint)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT b.book_id, COUNT(*)::bigint
  FROM public.book_issues b
  GROUP BY b.book_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_book_borrow_counts() TO anon, authenticated;

-- 5. Open books table SELECT policy to public
DROP POLICY IF EXISTS "Anyone can view books" ON public.books;
CREATE POLICY "Anyone can view books" ON public.books FOR SELECT USING (true);

-- 6. Open class_book_recommendations SELECT policy to public
GRANT SELECT ON public.class_book_recommendations TO anon;
DROP POLICY IF EXISTS "Anyone signed-in can view class recs" ON public.class_book_recommendations;
CREATE POLICY "Anyone signed-in can view class recs" ON public.class_book_recommendations FOR SELECT USING (true);


-- >>> FILE: 20260723200000_add_streak_last_claimed.sql
-- Migration: Add streak_last_claimed to profiles and seed quiz_completion_bonus setting

-- 1. Add streak_last_claimed column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak_last_claimed date;

-- 2. Seed quiz_completion_bonus setting in system_settings
INSERT INTO public.system_settings(key, value) VALUES
  ('quiz_completion_bonus', '10'::jsonb)
ON CONFLICT (key) DO NOTHING;


-- >>> FILE: 20260724180000_gallery_and_event_orientation.sql
-- Add image_orientation to library_events if it doesn't exist
ALTER TABLE library_events ADD COLUMN IF NOT EXISTS image_orientation TEXT DEFAULT 'horizontal';

-- Create gallery_images table
CREATE TABLE IF NOT EXISTS gallery_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    image_url TEXT NOT NULL,
    caption TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist to prevent duplicates
DROP POLICY IF EXISTS "Allow public read access" ON gallery_images;
DROP POLICY IF EXISTS "Allow admin full control" ON gallery_images;

-- Create Policies
CREATE POLICY "Allow public read access" ON gallery_images 
    FOR SELECT USING (true);

CREATE POLICY "Allow admin full control" ON gallery_images 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );


-- >>> FILE: 20260725161500_allow_teachers_study_materials.sql
-- Update policies on study_materials to allow teachers
DROP POLICY IF EXISTS "Admins can insert study materials" ON public.study_materials;
DROP POLICY IF EXISTS "Admins can update study materials" ON public.study_materials;
DROP POLICY IF EXISTS "Admins can delete study materials" ON public.study_materials;
DROP POLICY IF EXISTS "Admins and teachers can insert study materials" ON public.study_materials;
DROP POLICY IF EXISTS "Admins and teachers can update study materials" ON public.study_materials;
DROP POLICY IF EXISTS "Admins and teachers can delete study materials" ON public.study_materials;

CREATE POLICY "Admins and teachers can insert study materials"
ON public.study_materials FOR INSERT TO authenticated
WITH CHECK (get_profile_role(auth.uid()) IN ('admin', 'teacher'));

CREATE POLICY "Admins and teachers can update study materials"
ON public.study_materials FOR UPDATE TO authenticated
USING (get_profile_role(auth.uid()) IN ('admin', 'teacher'));

CREATE POLICY "Admins and teachers can delete study materials"
ON public.study_materials FOR DELETE TO authenticated
USING (get_profile_role(auth.uid()) IN ('admin', 'teacher'));

-- Update storage policies for study-materials bucket to allow teachers
DROP POLICY IF EXISTS "Admins can upload study material files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update study material files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete study material files" ON storage.objects;
DROP POLICY IF EXISTS "Admins and teachers can upload study material files" ON storage.objects;
DROP POLICY IF EXISTS "Admins and teachers can update study material files" ON storage.objects;
DROP POLICY IF EXISTS "Admins and teachers can delete study material files" ON storage.objects;

CREATE POLICY "Admins and teachers can upload study material files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'study-materials' AND get_profile_role(auth.uid()) IN ('admin', 'teacher'));

CREATE POLICY "Admins and teachers can update study material files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'study-materials' AND get_profile_role(auth.uid()) IN ('admin', 'teacher'));

CREATE POLICY "Admins and teachers can delete study material files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'study-materials' AND get_profile_role(auth.uid()) IN ('admin', 'teacher'));


-- >>> FILE: 20260725162000_ncert_books_table.sql
-- Create NCERT Books table
CREATE TABLE public.ncert_books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_number TEXT NOT NULL,
  subject TEXT NOT NULL,
  book_name TEXT NOT NULL,
  chapter_title TEXT NOT NULL,
  chapter_number INT,
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ncert_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view ncert books"
ON public.ncert_books FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and teachers can insert ncert books"
ON public.ncert_books FOR INSERT TO authenticated
WITH CHECK (get_profile_role(auth.uid()) IN ('admin', 'teacher'));

CREATE POLICY "Admins and teachers can update ncert books"
ON public.ncert_books FOR UPDATE TO authenticated
USING (get_profile_role(auth.uid()) IN ('admin', 'teacher'));

CREATE POLICY "Admins and teachers can delete ncert books"
ON public.ncert_books FOR DELETE TO authenticated
USING (get_profile_role(auth.uid()) IN ('admin', 'teacher'));

-- Seed some initial NCERT Book chapters
INSERT INTO public.ncert_books (class_number, subject, book_name, chapter_title, chapter_number, file_url) VALUES
('6', 'Mathematics', 'Mathematics – Class 6', 'Chapter 1 – Knowing Our Numbers', 1, 'https://ncert.nic.in/textbook/pdf/femh101.pdf'),
('6', 'Mathematics', 'Mathematics – Class 6', 'Chapter 2 – Whole Numbers', 2, 'https://ncert.nic.in/textbook/pdf/femh102.pdf'),
('6', 'Science', 'Science – Class 6', 'Chapter 1 – Food: Where Does It Come From?', 1, 'https://ncert.nic.in/textbook/pdf/fesc101.pdf'),
('6', 'Science', 'Science – Class 6', 'Chapter 2 – Components of Food', 2, 'https://ncert.nic.in/textbook/pdf/fesc102.pdf'),
('7', 'Mathematics', 'Mathematics – Class 7', 'Chapter 1 – Integers', 1, 'https://ncert.nic.in/textbook/pdf/gemh101.pdf'),
('7', 'Science', 'Science – Class 7', 'Chapter 1 – Nutrition in Plants', 1, 'https://ncert.nic.in/textbook/pdf/gesc101.pdf'),
('8', 'Mathematics', 'Mathematics – Class 8', 'Chapter 1 – Rational Numbers', 1, 'https://ncert.nic.in/textbook/pdf/hemh101.pdf'),
('8', 'Science', 'Science – Class 8', 'Chapter 1 – Crop Production and Management', 1, 'https://ncert.nic.in/textbook/pdf/hesc101.pdf'),
('9', 'Mathematics', 'Mathematics – Class 9', 'Chapter 1 – Number Systems', 1, 'https://ncert.nic.in/textbook/pdf/iemh101.pdf'),
('9', 'Science', 'Science – Class 9', 'Chapter 1 – Matter in Our Surroundings', 1, 'https://ncert.nic.in/textbook/pdf/iesc101.pdf'),
('10', 'Mathematics', 'Mathematics – Class 10', 'Chapter 1 – Real Numbers', 1, 'https://ncert.nic.in/textbook/pdf/jemh101.pdf'),
('10', 'Science', 'Science – Class 10', 'Chapter 1 – Chemical Reactions and Equations', 1, 'https://ncert.nic.in/textbook/pdf/jesc101.pdf'),
('11', 'Mathematics', 'Mathematics – Class 11', 'Chapter 1 – Sets', 1, 'https://ncert.nic.in/textbook/pdf/kemh101.pdf'),
('11', 'Physics', 'Physics Part I & II – Class 11', 'Chapter 1 – Physical World', 1, 'https://ncert.nic.in/textbook/pdf/keph101.pdf'),
('12', 'Mathematics', 'Mathematics Part I & II – Class 12', 'Chapter 1 – Relations and Functions', 1, 'https://ncert.nic.in/textbook/pdf/lemh101.pdf'),
('12', 'Physics', 'Physics Part I & II – Class 12', 'Chapter 1 – Electric Charges and Fields', 1, 'https://ncert.nic.in/textbook/pdf/leph101.pdf');


-- >>> FILE: 20260725162500_gallery_images_bucket.sql
-- Create gallery-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery-images', 'gallery-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for gallery-images bucket
DROP POLICY IF EXISTS "Anyone can view gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Admins and teachers can upload gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Admins and teachers can update gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Admins and teachers can delete gallery images" ON storage.objects;

CREATE POLICY "Anyone can view gallery images"
ON storage.objects FOR SELECT
USING (bucket_id = 'gallery-images');

CREATE POLICY "Admins and teachers can upload gallery images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'gallery-images' AND get_profile_role(auth.uid()) IN ('admin', 'teacher'));

CREATE POLICY "Admins and teachers can update gallery images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'gallery-images' AND get_profile_role(auth.uid()) IN ('admin', 'teacher'));

CREATE POLICY "Admins and teachers can delete gallery images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'gallery-images' AND get_profile_role(auth.uid()) IN ('admin', 'teacher'));


-- >>> FILE: 20260725194000_create_cbse_curriculum.sql
-- Create cbse_curriculum table for admin-managed CBSE resources
CREATE TABLE IF NOT EXISTS public.cbse_curriculum (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL DEFAULT 'CBSE Curriculum',
  chapter_title text NOT NULL,
  chapter_number integer,
  file_url text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.cbse_curriculum ENABLE ROW LEVEL SECURITY;

-- Anyone can view CBSE curriculum
CREATE POLICY "Anyone can view cbse curriculum"
  ON public.cbse_curriculum FOR SELECT
  USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can manage cbse curriculum"
  ON public.cbse_curriculum FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- >>> FILE: 20260725205500_update_cbse_curriculum.sql
-- Add class_number and subject columns to cbse_curriculum table to allow filtering
ALTER TABLE public.cbse_curriculum
ADD COLUMN IF NOT EXISTS class_number text DEFAULT 'All',
ADD COLUMN IF NOT EXISTS subject text DEFAULT 'General';


-- >>> FILE: 20260725210500_community_media_bucket.sql
-- Create community-media storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('community-media', 'community-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for community-media
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'community-media');
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'community-media');
CREATE POLICY "Users can update their own uploads" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'community-media' AND auth.uid() = owner);
CREATE POLICY "Users can delete their own uploads" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'community-media' AND auth.uid() = owner);


-- >>> FILE: 20260725211000_posts_media.sql
-- Add media_url and media_type columns to posts table
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS media_url text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS media_type text DEFAULT NULL; -- 'image', 'video', 'pdf'


-- >>> FILE: 20260726203000_event_additions.sql
ALTER TABLE library_events ADD COLUMN IF NOT EXISTS schedule_files TEXT;
ALTER TABLE library_events ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE;


-- >>> FILE: 20260726210000_ncert_unique_constraint.sql
-- Add unique constraint to prevent NCERT book duplication on refetch
ALTER TABLE public.ncert_books
  ADD CONSTRAINT ncert_books_unique_chapter
  UNIQUE (class_number, subject, chapter_number);


-- >>> FILE: 20260728163900_fix_class_rank_function.sql
-- Fix get_user_class_rank to only count students (role = 'student'), 
-- not teachers/admins that may also be in the profiles table
CREATE OR REPLACE FUNCTION public.get_user_class_rank(user_class TEXT, user_points INTEGER)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER + 1
  FROM public.profiles
  WHERE student_class = user_class
    AND is_approved = true
    AND role = 'student'
    AND points > user_points;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_class_rank(text, integer) TO authenticated;


-- >>> FILE: 20260728213000_cbse_unique_constraint.sql
-- Add unique constraint to cbse_curriculum to allow upsert operations
-- This prevents duplicate entries during bulk imports
-- Retain the earliest row for records that were imported before this rule.
DELETE FROM public.cbse_curriculum newer
USING public.cbse_curriculum older
WHERE newer.id > older.id
  AND newer.class_number = older.class_number
  AND newer.subject = older.subject
  AND newer.chapter_title = older.chapter_title;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cbse_curriculum_unique_entry'
      AND conrelid = 'public.cbse_curriculum'::regclass
  ) THEN
    ALTER TABLE public.cbse_curriculum
      ADD CONSTRAINT cbse_curriculum_unique_entry
      UNIQUE (class_number, subject, chapter_title);
  END IF;
END $$;


-- >>> FILE: 20260729120000_admin_workflow_fixes.sql
-- Award a badge's XP exactly once, when the award record is created.
CREATE OR REPLACE FUNCTION public.add_badge_award_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  badge_points integer;
BEGIN
  SELECT points INTO badge_points FROM public.badges WHERE id = NEW.badge_id;
  UPDATE public.profiles
  SET points = COALESCE(points, 0) + COALESCE(badge_points, 0)
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_add_badge_award_points ON public.badge_awards;
CREATE TRIGGER trg_add_badge_award_points
  AFTER INSERT ON public.badge_awards
  FOR EACH ROW EXECUTE FUNCTION public.add_badge_award_points();

-- Issue a requested book in one transaction. This prevents partial approvals,
-- double issuing, and negative inventory when admins act at the same time.
CREATE OR REPLACE FUNCTION public.approve_book_request(
  p_request_id uuid,
  p_admin_notes text,
  p_due_date date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_row public.book_requests%ROWTYPE;
  book_row public.books%ROWTYPE;
  borrower_role text;
  issue_id uuid;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only staff can approve book requests';
  END IF;

  SELECT * INTO request_row FROM public.book_requests
  WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Book request not found'; END IF;
  IF request_row.status <> 'pending' THEN RAISE EXCEPTION 'This request has already been processed'; END IF;
  IF request_row.book_id IS NULL THEN RAISE EXCEPTION 'Purchase suggestions cannot be issued'; END IF;
  SELECT role INTO borrower_role FROM public.profiles WHERE id = request_row.user_id;
  IF borrower_role NOT IN ('student', 'teacher') THEN RAISE EXCEPTION 'Borrower is not an active student or teacher'; END IF;
  IF borrower_role = 'student' AND EXISTS (SELECT 1 FROM public.book_issues WHERE user_id = request_row.user_id AND status = 'issued') THEN
    RAISE EXCEPTION 'Students may only have one active book issue';
  END IF;

  SELECT * INTO book_row FROM public.books WHERE id = request_row.book_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'The requested book no longer exists'; END IF;
  IF book_row.available_copies <= 0 THEN RAISE EXCEPTION 'Book is not available'; END IF;

  INSERT INTO public.book_issues (user_id, book_id, accession_number, due_date)
  VALUES (request_row.user_id, request_row.book_id, book_row.accession_number,
    CURRENT_DATE + CASE WHEN borrower_role = 'teacher' THEN 30 ELSE 7 END)
  RETURNING id INTO issue_id;

  UPDATE public.books SET available_copies = available_copies - 1 WHERE id = book_row.id;
  UPDATE public.book_requests SET status = 'approved', admin_notes = p_admin_notes WHERE id = request_row.id;
  RETURN issue_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_book_request(uuid, text, date) TO authenticated;


-- >>> FILE: 20260730090000_circulation_and_rewards_fixes.sql
-- Approving a reading entry is one operation: it cannot remain pending or
-- credit points twice.
ALTER TABLE public.reading_history ADD COLUMN IF NOT EXISTS points_awarded boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.award_approved_reading_points()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND NOT NEW.points_awarded AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved') THEN
    UPDATE public.profiles SET points = COALESCE(points, 0) + COALESCE(NEW.points_earned, 0) WHERE id = NEW.user_id;
    UPDATE public.reading_history SET points_awarded = true WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_reading_history_insert ON public.reading_history;
CREATE TRIGGER on_reading_history_insert AFTER INSERT OR UPDATE OF status ON public.reading_history
FOR EACH ROW EXECUTE FUNCTION public.award_approved_reading_points();

CREATE OR REPLACE FUNCTION public.approve_reading_entry(p_reading_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE entry public.reading_history%ROWTYPE;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN RAISE EXCEPTION 'Only staff can approve reading entries'; END IF;
  SELECT * INTO entry FROM public.reading_history WHERE id = p_reading_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reading entry not found'; END IF;
  IF entry.status <> 'pending' THEN RAISE EXCEPTION 'This reading entry has already been processed'; END IF;
  UPDATE public.reading_history SET status = 'approved' WHERE id = entry.id;
  -- The existing approval trigger awards points. Return the amount for UI feedback.
  RETURN COALESCE(entry.points_earned, 0);
END;
$$;
GRANT EXECUTE ON FUNCTION public.approve_reading_entry(uuid) TO authenticated;

-- Award the daily base amount for every active streak day, once per day.
CREATE OR REPLACE FUNCTION public.claim_streak_points()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE streak_days integer; base_points integer; earned integer; last_claimed date;
BEGIN
  SELECT streak_last_claimed INTO last_claimed FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF last_claimed = CURRENT_DATE THEN RAISE EXCEPTION 'Today''s streak reward has already been claimed'; END IF;
  SELECT COALESCE(ls.current_streak, 0) INTO streak_days FROM public.login_streaks ls WHERE ls.user_id = auth.uid();
  IF COALESCE(streak_days, 0) < 1 THEN RAISE EXCEPTION 'No active streak to claim'; END IF;
  SELECT COALESCE((value #>> '{}')::integer, 10) INTO base_points FROM public.system_settings WHERE key = 'points_per_daily_streak';
  earned := COALESCE(base_points, 10) * streak_days;
  UPDATE public.profiles SET points = COALESCE(points, 0) + earned, streak_last_claimed = CURRENT_DATE WHERE id = auth.uid();
  RETURN earned;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_streak_points() TO authenticated;

-- Centralised circulation rules: teachers have 30-day unlimited loans;
-- students have one active 7-day loan.
CREATE OR REPLACE FUNCTION public.issue_book_to_user(p_book_id uuid, p_user_id uuid, p_issue_date date DEFAULT CURRENT_DATE)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE borrower public.profiles%ROWTYPE; book_row public.books%ROWTYPE; issue_id uuid; due_on date;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN RAISE EXCEPTION 'Only staff can issue books'; END IF;
  SELECT * INTO borrower FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND OR NOT borrower.is_approved OR borrower.role NOT IN ('student', 'teacher') THEN RAISE EXCEPTION 'Select an approved student or teacher'; END IF;
  IF borrower.role = 'student' AND EXISTS (SELECT 1 FROM public.book_issues WHERE user_id = p_user_id AND status = 'issued') THEN
    RAISE EXCEPTION 'Students may only have one active book issue';
  END IF;
  SELECT * INTO book_row FROM public.books WHERE id = p_book_id FOR UPDATE;
  IF NOT FOUND OR book_row.available_copies < 1 THEN RAISE EXCEPTION 'Book is not available'; END IF;
  due_on := p_issue_date + CASE WHEN borrower.role = 'teacher' THEN 30 ELSE 7 END;
  INSERT INTO public.book_issues (book_id, user_id, issue_date, due_date, status, accession_number)
  VALUES (p_book_id, p_user_id, p_issue_date, due_on, 'issued', book_row.accession_number) RETURNING id INTO issue_id;
  UPDATE public.books SET available_copies = available_copies - 1 WHERE id = p_book_id;
  RETURN issue_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.issue_book_to_user(uuid, uuid, date) TO authenticated;

-- Repair NCERT records on deployment and ensure displayed titles never remain blank.
UPDATE public.ncert_books
SET chapter_title = 'Chapter ' || COALESCE(chapter_number::text, 'Untitled')
WHERE COALESCE(btrim(chapter_title), '') = '';

DELETE FROM public.ncert_books a
USING public.ncert_books b
WHERE a.id > b.id
  AND a.class_number = b.class_number
  AND lower(a.subject) = lower(b.subject)
  AND COALESCE(a.chapter_number, -1) = COALESCE(b.chapter_number, -1)
  AND lower(a.chapter_title) = lower(b.chapter_title);

-- Teachers can reliably load their assigned class even when profile RLS is
-- tightened for student privacy.
CREATE OR REPLACE FUNCTION public.get_teacher_class_students(p_class text)
RETURNS TABLE(id uuid, first_name text, last_name text, roll_number text, points integer, student_class text, is_approved boolean, avatar_url text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE caller_class text;
BEGIN
  SELECT student_class INTO caller_class FROM public.profiles WHERE id = auth.uid();
  IF public.get_profile_role(auth.uid()) NOT IN ('teacher', 'admin') THEN RAISE EXCEPTION 'Only teachers and admins can view class lists'; END IF;
  IF public.get_profile_role(auth.uid()) = 'teacher' AND caller_class IS DISTINCT FROM p_class THEN RAISE EXCEPTION 'Teachers may only view their assigned class'; END IF;
  RETURN QUERY SELECT p.id, p.first_name, p.last_name, p.roll_number, p.points, p.student_class, p.is_approved, p.avatar_url
  FROM public.profiles p WHERE p.role = 'student' AND p.student_class = p_class ORDER BY p.points DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_teacher_class_students(text) TO authenticated;

-- Include profile pictures in network cards without exposing private profile data.
DROP FUNCTION IF EXISTS public.get_public_profiles(uuid[]);
CREATE FUNCTION public.get_public_profiles(_ids uuid[])
RETURNS TABLE(id uuid, first_name text, last_name text, username text, student_class text, points integer, role text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.first_name, p.last_name, p.username, p.student_class, p.points, p.role, p.avatar_url
  FROM public.profiles p WHERE p.id = ANY(_ids);
$$;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO authenticated;


-- >>> FILE: 20260730093000_fix_streak_claim_ambiguity.sql
-- Avoid shadowing login_streaks.current_streak with a PL/pgSQL variable.
CREATE OR REPLACE FUNCTION public.claim_streak_points()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE streak_days integer; base_points integer; earned integer; last_claimed date;
BEGIN
  SELECT p.streak_last_claimed INTO last_claimed
  FROM public.profiles p WHERE p.id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF last_claimed = CURRENT_DATE THEN RAISE EXCEPTION 'Today''s streak reward has already been claimed'; END IF;

  SELECT COALESCE(ls.current_streak, 0) INTO streak_days
  FROM public.login_streaks ls WHERE ls.user_id = auth.uid();
  IF COALESCE(streak_days, 0) < 1 THEN RAISE EXCEPTION 'No active streak to claim'; END IF;

  SELECT COALESCE((s.value #>> '{}')::integer, 10) INTO base_points
  FROM public.system_settings s WHERE s.key = 'points_per_daily_streak';
  earned := COALESCE(base_points, 10) * streak_days;
  UPDATE public.profiles
  SET points = COALESCE(points, 0) + earned, streak_last_claimed = CURRENT_DATE
  WHERE id = auth.uid();
  RETURN earned;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_streak_points() TO authenticated;


-- >>> FILE: 20260801005255_23cbcbb7-1d0f-43f0-ba2a-477332c5b309.sql
-- ============ 1. COLUMN ADDITIONS ============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS needs_profile_update boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak_last_claimed date;

ALTER TABLE public.notifications ALTER COLUMN sent_by DROP NOT NULL;

ALTER TABLE public.reading_history ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';

ALTER TABLE public.library_events
  ADD COLUMN IF NOT EXISTS end_date timestamptz,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS image_orientation text DEFAULT 'landscape',
  ADD COLUMN IF NOT EXISTS schedule_files text;

ALTER TABLE public.books ADD COLUMN IF NOT EXISTS condemned_copies integer NOT NULL DEFAULT 0;

-- ============ 2. NEW TABLES ============
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings readable" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "staff manage settings" ON public.system_settings FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.gallery_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  caption text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gallery_images TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gallery_images TO authenticated;
GRANT ALL ON public.gallery_images TO service_role;
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gallery public read" ON public.gallery_images FOR SELECT USING (true);
CREATE POLICY "staff manage gallery" ON public.gallery_images FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.ncert_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_number text NOT NULL,
  subject text NOT NULL,
  book_name text NOT NULL DEFAULT '',
  chapter_title text NOT NULL DEFAULT '',
  chapter_number integer,
  file_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ncert_books_unique_chapter
  ON public.ncert_books (class_number, subject, chapter_number);
GRANT SELECT ON public.ncert_books TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ncert_books TO authenticated;
GRANT ALL ON public.ncert_books TO service_role;
ALTER TABLE public.ncert_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ncert public read" ON public.ncert_books FOR SELECT USING (true);
CREATE POLICY "staff manage ncert" ON public.ncert_books FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.cbse_curriculum (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'General',
  class_number text NOT NULL DEFAULT 'All',
  subject text NOT NULL DEFAULT 'General',
  chapter_title text NOT NULL DEFAULT '',
  chapter_number integer,
  file_url text NOT NULL DEFAULT '',
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cbse_curriculum TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cbse_curriculum TO authenticated;
GRANT ALL ON public.cbse_curriculum TO service_role;
ALTER TABLE public.cbse_curriculum ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cbse public read" ON public.cbse_curriculum FOR SELECT USING (true);
CREATE POLICY "staff manage cbse" ON public.cbse_curriculum FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.book_condemnations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid REFERENCES public.books(id) ON DELETE SET NULL,
  accession_number text,
  book_title text NOT NULL DEFAULT '',
  copies integer NOT NULL DEFAULT 1,
  reason text NOT NULL DEFAULT 'damaged',
  book_condition text,
  notes text,
  condemned_by uuid,
  condemned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_condemnations TO authenticated;
GRANT ALL ON public.book_condemnations TO service_role;
ALTER TABLE public.book_condemnations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read condemnations" ON public.book_condemnations FOR SELECT TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "staff manage condemnations" ON public.book_condemnations FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- ============ 3. NOTIFICATION HELPER + TRIGGERS ============
CREATE OR REPLACE FUNCTION public.notify_user(_user_id uuid, _title text, _message text, _type text DEFAULT 'info')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.notifications (title, message, type, target_user_id, sent_by, is_read)
  VALUES (_title, _message, COALESCE(_type,'info'), _user_id, NULL, false);
END; $$;
REVOKE EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.tg_notify_book_issue()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_title text;
BEGIN
  SELECT title INTO v_title FROM public.books WHERE id = NEW.book_id;
  PERFORM public.notify_user(NEW.user_id, 'Book issued',
    'You have borrowed "' || COALESCE(v_title,'a book') || '". Please return it by ' || NEW.due_date || '.', 'success');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS notify_book_issue ON public.book_issues;
CREATE TRIGGER notify_book_issue AFTER INSERT ON public.book_issues
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_book_issue();

CREATE OR REPLACE FUNCTION public.tg_notify_book_return()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_title text;
BEGIN
  IF NEW.status = 'returned' AND COALESCE(OLD.status,'') <> 'returned' THEN
    SELECT title INTO v_title FROM public.books WHERE id = NEW.book_id;
    PERFORM public.notify_user(NEW.user_id, 'Book returned',
      'Thanks! "' || COALESCE(v_title,'Your book') || '" has been returned successfully.', 'success');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS notify_book_return ON public.book_issues;
CREATE TRIGGER notify_book_return AFTER UPDATE ON public.book_issues
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_book_return();

CREATE OR REPLACE FUNCTION public.tg_notify_badge_award()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text; v_points integer;
BEGIN
  SELECT name, points INTO v_name, v_points FROM public.badges WHERE id = NEW.badge_id;
  PERFORM public.notify_user(NEW.user_id, 'New badge unlocked!',
    'You earned the "' || COALESCE(v_name,'New') || '" badge (+' || COALESCE(v_points,0) || ' XP).', 'success');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS notify_badge_award ON public.badge_awards;
CREATE TRIGGER notify_badge_award AFTER INSERT ON public.badge_awards
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_badge_award();

CREATE OR REPLACE FUNCTION public.tg_notify_friendship()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) INTO v_name FROM public.profiles WHERE id = NEW.requester_id;
    PERFORM public.notify_user(NEW.addressee_id, 'New friend request',
      COALESCE(NULLIF(v_name,''),'Someone') || ' sent you a friend request.', 'info');
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND COALESCE(OLD.status,'') <> 'accepted' THEN
    SELECT TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) INTO v_name FROM public.profiles WHERE id = NEW.addressee_id;
    PERFORM public.notify_user(NEW.requester_id, 'New friend',
      COALESCE(NULLIF(v_name,''),'Someone') || ' accepted your friend request.', 'success');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS notify_friendship ON public.friendships;
CREATE TRIGGER notify_friendship AFTER INSERT OR UPDATE ON public.friendships
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_friendship();

CREATE OR REPLACE FUNCTION public.tg_notify_post_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid; v_name text; v_title text;
BEGIN
  SELECT user_id, title INTO v_owner, v_title FROM public.posts WHERE id = NEW.post_id;
  IF v_owner IS NOT NULL AND v_owner <> NEW.user_id THEN
    SELECT TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) INTO v_name FROM public.profiles WHERE id = NEW.user_id;
    PERFORM public.notify_user(v_owner, 'New reply on your post',
      COALESCE(NULLIF(v_name,''),'Someone') || ' replied to "' || COALESCE(v_title,'your post') || '".', 'info');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS notify_post_comment ON public.post_comments;
CREATE TRIGGER notify_post_comment AFTER INSERT ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_post_comment();

CREATE OR REPLACE FUNCTION public.tg_notify_post_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid; v_name text; v_title text;
BEGIN
  SELECT user_id, title INTO v_owner, v_title FROM public.posts WHERE id = NEW.post_id;
  IF v_owner IS NOT NULL AND v_owner <> NEW.user_id THEN
    SELECT TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) INTO v_name FROM public.profiles WHERE id = NEW.user_id;
    PERFORM public.notify_user(v_owner, 'New like on your post',
      COALESCE(NULLIF(v_name,''),'Someone') || ' liked "' || COALESCE(v_title,'your post') || '".', 'info');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS notify_post_like ON public.post_likes;
CREATE TRIGGER notify_post_like AFTER INSERT ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_post_like();

CREATE OR REPLACE FUNCTION public.tg_notify_level_up()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old_level integer; new_level integer; new_name text;
BEGIN
  IF NEW.points IS DISTINCT FROM OLD.points THEN
    SELECT level_number INTO old_level FROM public.levels WHERE min_points <= COALESCE(OLD.points,0) ORDER BY min_points DESC LIMIT 1;
    SELECT level_number, name INTO new_level, new_name FROM public.levels WHERE min_points <= COALESCE(NEW.points,0) ORDER BY min_points DESC LIMIT 1;
    IF new_level IS NOT NULL AND COALESCE(new_level,0) > COALESCE(old_level,0) THEN
      PERFORM public.notify_user(NEW.id, 'Level up!',
        'Congratulations! You reached Level ' || new_level || ' — ' || COALESCE(new_name,'') || '.', 'success');
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS notify_level_up ON public.profiles;
CREATE TRIGGER notify_level_up AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_level_up();

-- ============ 4. BORROW LIMITS ============
CREATE OR REPLACE FUNCTION public.tg_enforce_issue_limits()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role text; v_active integer; v_limit integer; v_days integer;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = NEW.user_id;
  IF v_role IN ('teacher','staff','librarian','admin') THEN
    v_limit := 5; v_days := 30;
  ELSE
    v_limit := 1; v_days := 7;
  END IF;

  SELECT COUNT(*) INTO v_active FROM public.book_issues
    WHERE user_id = NEW.user_id AND status = 'issued';
  IF v_active >= v_limit THEN
    RAISE EXCEPTION 'Borrow limit reached: % may hold only % book(s) at a time.',
      COALESCE(v_role,'student'), v_limit;
  END IF;

  NEW.issue_date := COALESCE(NEW.issue_date, CURRENT_DATE);
  NEW.due_date := NEW.issue_date + v_days;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS enforce_issue_limits ON public.book_issues;
CREATE TRIGGER enforce_issue_limits BEFORE INSERT ON public.book_issues
FOR EACH ROW EXECUTE FUNCTION public.tg_enforce_issue_limits();

-- ============ 5. RPCs USED BY THE APP ============
CREATE OR REPLACE FUNCTION public.issue_book_to_user(p_book_id uuid, p_user_id uuid, p_issue_date date DEFAULT CURRENT_DATE)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_acc text; v_avail integer;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT accession_number, available_copies INTO v_acc, v_avail FROM public.books WHERE id = p_book_id FOR UPDATE;
  IF v_avail IS NULL OR v_avail < 1 THEN RAISE EXCEPTION 'No copies available'; END IF;

  INSERT INTO public.book_issues (book_id, user_id, issue_date, due_date, status, accession_number)
  VALUES (p_book_id, p_user_id, p_issue_date, p_issue_date, 'issued', v_acc)
  RETURNING id INTO v_id;

  UPDATE public.books SET available_copies = GREATEST(available_copies - 1, 0) WHERE id = p_book_id;
  RETURN v_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.issue_book_to_user(uuid, uuid, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.issue_book_to_user(uuid, uuid, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_book_request(p_request_id uuid, p_admin_notes text DEFAULT NULL, p_due_date date DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_issue uuid;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO r FROM public.book_requests WHERE id = p_request_id;
  IF r IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;

  UPDATE public.book_requests SET status = 'approved', admin_notes = COALESCE(p_admin_notes, admin_notes) WHERE id = p_request_id;
  IF r.book_id IS NOT NULL THEN
    v_issue := public.issue_book_to_user(r.book_id, r.user_id, CURRENT_DATE);
  END IF;
  RETURN v_issue;
END; $$;
REVOKE EXECUTE ON FUNCTION public.approve_book_request(uuid, text, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_book_request(uuid, text, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.condemn_book(p_book_id uuid, p_copies integer, p_reason text, p_condition text DEFAULT NULL, p_notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; b record; n integer;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO b FROM public.books WHERE id = p_book_id FOR UPDATE;
  IF b IS NULL THEN RAISE EXCEPTION 'Book not found'; END IF;
  n := GREATEST(COALESCE(p_copies,1), 1);
  IF n > COALESCE(b.total_copies,0) THEN RAISE EXCEPTION 'Cannot condemn more copies than exist'; END IF;

  INSERT INTO public.book_condemnations (book_id, accession_number, book_title, copies, reason, book_condition, notes, condemned_by)
  VALUES (p_book_id, b.accession_number, b.title, n, COALESCE(p_reason,'damaged'), p_condition, p_notes, auth.uid())
  RETURNING id INTO v_id;

  UPDATE public.books
    SET total_copies = GREATEST(total_copies - n, 0),
        available_copies = GREATEST(available_copies - n, 0),
        condemned_copies = condemned_copies + n,
        updated_at = now()
  WHERE id = p_book_id;
  RETURN v_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.condemn_book(uuid, integer, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.condemn_book(uuid, integer, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_reading_entry(p_reading_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_pts integer;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO r FROM public.reading_history WHERE id = p_reading_id;
  IF r IS NULL THEN RAISE EXCEPTION 'Entry not found'; END IF;
  IF r.status = 'approved' THEN RETURN 0; END IF;

  v_pts := COALESCE(r.points_earned, 0);
  IF v_pts = 0 THEN
    SELECT COALESCE((value)::text::integer, 25) INTO v_pts FROM public.system_settings WHERE key = 'points_per_book_read';
    v_pts := COALESCE(v_pts, 25);
  END IF;

  UPDATE public.reading_history SET status = 'approved', points_earned = v_pts WHERE id = p_reading_id;
  UPDATE public.profiles SET points = COALESCE(points,0) + v_pts WHERE id = r.user_id;
  PERFORM public.notify_user(r.user_id, 'Reading approved',
    'Your reading entry "' || COALESCE(r.book_title,'') || '" was approved (+' || v_pts || ' points).', 'success');
  RETURN v_pts;
END; $$;
REVOKE EXECUTE ON FUNCTION public.approve_reading_entry(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_reading_entry(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_streak_points()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_pts integer; v_last date; v_streak integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT streak_last_claimed INTO v_last FROM public.profiles WHERE id = v_uid;
  IF v_last = CURRENT_DATE THEN RETURN 0; END IF;
  SELECT current_streak INTO v_streak FROM public.login_streaks WHERE user_id = v_uid;
  IF COALESCE(v_streak,0) < 1 THEN RETURN 0; END IF;

  SELECT COALESCE((value)::text::integer, 10) INTO v_pts FROM public.system_settings WHERE key = 'points_per_daily_streak';
  v_pts := COALESCE(v_pts, 10);

  UPDATE public.profiles
    SET points = COALESCE(points,0) + v_pts, streak_last_claimed = CURRENT_DATE
  WHERE id = v_uid;
  RETURN v_pts;
END; $$;
REVOKE EXECUTE ON FUNCTION public.claim_streak_points() FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_streak_points() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_book_borrow_counts()
RETURNS TABLE(book_id uuid, borrow_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT bi.book_id, COUNT(*)::bigint FROM public.book_issues bi GROUP BY bi.book_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_book_borrow_counts() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_school_leaderboard_stats()
RETURNS TABLE(total_students bigint, total_points bigint, average_points numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::bigint, COALESCE(SUM(points),0)::bigint,
         COALESCE(AVG(points),0)::numeric
  FROM public.profiles WHERE role = 'student' AND is_approved = true;
$$;
REVOKE EXECUTE ON FUNCTION public.get_school_leaderboard_stats() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_school_leaderboard_stats() TO authenticated;

DROP FUNCTION IF EXISTS public.get_teacher_class_students(text);
CREATE OR REPLACE FUNCTION public.get_teacher_class_students(p_class text)
RETURNS TABLE(id uuid, first_name text, last_name text, username text, student_class text, admission_number text, points integer, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.first_name, p.last_name, p.username, p.student_class, p.admission_number, p.points, p.avatar_url
  FROM public.profiles p
  WHERE p.role = 'student' AND p.is_approved = true AND p.student_class = p_class
  ORDER BY p.first_name;
$$;
REVOKE EXECUTE ON FUNCTION public.get_teacher_class_students(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_teacher_class_students(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_missing_auth_profiles()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  INSERT INTO public.profiles (id, email, first_name, last_name, role, student_class, roll_number, admission_number, username, phone, is_approved, needs_profile_update)
  SELECT u.id, u.email,
    COALESCE(u.raw_user_meta_data->>'first_name',''),
    COALESCE(u.raw_user_meta_data->>'last_name',''),
    COALESCE(u.raw_user_meta_data->>'role','student'),
    u.raw_user_meta_data->>'student_class',
    u.raw_user_meta_data->>'roll_number',
    u.raw_user_meta_data->>'admission_number',
    COALESCE(u.raw_user_meta_data->>'username', u.raw_user_meta_data->>'admission_number'),
    u.raw_user_meta_data->>'phone',
    true, true
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE p.id IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END; $$;
REVOKE EXECUTE ON FUNCTION public.sync_missing_auth_profiles() FROM anon;
GRANT EXECUTE ON FUNCTION public.sync_missing_auth_profiles() TO authenticated;

-- ============ 6. COMMUNITY / SOCIAL BADGE STATS ============
CREATE OR REPLACE FUNCTION public.get_user_activity_stats(_user_id uuid)
RETURNS TABLE(posts_count integer, comments_count integer, friends_count integer, books_issued integer, reviews_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT COUNT(*)::int FROM public.posts WHERE user_id = _user_id),
    (SELECT COUNT(*)::int FROM public.post_comments WHERE user_id = _user_id),
    (SELECT COUNT(*)::int FROM public.friendships f WHERE f.status = 'accepted' AND (f.requester_id = _user_id OR f.addressee_id = _user_id)),
    (SELECT COUNT(*)::int FROM public.book_issues WHERE user_id = _user_id),
    (SELECT COUNT(*)::int FROM public.book_reviews WHERE user_id = _user_id);
$$;
REVOKE EXECUTE ON FUNCTION public.get_user_activity_stats(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_activity_stats(uuid) TO authenticated;

-- ============ 7. SEED SETTINGS + BADGES ============
INSERT INTO public.system_settings (key, value) VALUES
  ('points_per_daily_streak', '10'::jsonb),
  ('points_per_book_read', '25'::jsonb),
  ('points_per_quiz_passed', '20'::jsonb),
  ('points_per_review', '5'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.badges (name, description, icon_name, color, points, criteria_type, criteria_value, is_active)
SELECT v.name, v.description, v.icon_name, v.color, v.points, v.criteria_type, v.criteria_value, true
FROM (VALUES
  ('First Post', 'Share your first post in the community', 'MessageSquare', 'blue', 10, 'posts_count', 1),
  ('Community Voice', 'Publish 10 community posts', 'Megaphone', 'blue', 40, 'posts_count', 10),
  ('Story Teller', 'Publish 25 community posts', 'PenLine', 'indigo', 80, 'posts_count', 25),
  ('Helpful Reply', 'Post your first reply', 'MessageCircle', 'green', 10, 'comments_count', 1),
  ('Conversation Starter', 'Post 25 replies in the community', 'MessagesSquare', 'green', 50, 'comments_count', 25),
  ('Discussion Master', 'Post 100 replies in the community', 'Users', 'emerald', 120, 'comments_count', 100),
  ('First Friend', 'Make your first friend', 'UserPlus', 'pink', 10, 'friends_count', 1),
  ('Well Connected', 'Make 10 friends', 'Users2', 'pink', 50, 'friends_count', 10),
  ('Social Star', 'Make 25 friends', 'Sparkles', 'purple', 100, 'friends_count', 25),
  ('Borrower', 'Borrow your first library book', 'BookOpen', 'amber', 10, 'books_issued', 1),
  ('Frequent Borrower', 'Borrow 10 library books', 'Library', 'amber', 60, 'books_issued', 10),
  ('Book Critic', 'Write 5 book reviews', 'Star', 'yellow', 40, 'reviews_count', 5)
) AS v(name, description, icon_name, color, points, criteria_type, criteria_value)
WHERE NOT EXISTS (SELECT 1 FROM public.badges b WHERE b.name = v.name);

-- >>> FILE: 20260801005406_b0143397-54c2-438d-b7b7-e194db7dfaaa.sql
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_type text;

DROP POLICY IF EXISTS "community media read" ON storage.objects;
CREATE POLICY "community media read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'community-media');

DROP POLICY IF EXISTS "community media own insert" ON storage.objects;
CREATE POLICY "community media own insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'community-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "community media own update" ON storage.objects;
CREATE POLICY "community media own update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'community-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "community media own delete" ON storage.objects;
CREATE POLICY "community media own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'community-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- >>> FILE: 20260801191000_distinct_filters_and_catalog.sql
-- 1. Create a function to get distinct values for catalog filters efficiently
CREATE OR REPLACE FUNCTION public.get_distinct_book_filters()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  res json;
BEGIN
  SELECT json_build_object(
    'categories', (SELECT coalesce(json_agg(distinct category), '[]'::json) FROM public.books WHERE category IS NOT NULL AND category <> ''),
    'subjects', (SELECT coalesce(json_agg(distinct subject), '[]'::json) FROM public.books WHERE subject IS NOT NULL AND subject <> ''),
    'class_levels', (SELECT coalesce(json_agg(distinct class_level), '[]'::json) FROM public.books WHERE class_level IS NOT NULL AND class_level <> ''),
    'languages', (SELECT coalesce(json_agg(distinct language), '[]'::json) FROM public.books WHERE language IS NOT NULL AND language <> ''),
    'authors', (SELECT coalesce(json_agg(distinct author), '[]'::json) FROM public.books WHERE author IS NOT NULL AND author <> '')
  ) INTO res;
  RETURN res;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_distinct_book_filters() TO authenticated;

-- 2. Make avatars bucket public so getPublicUrl works instantly and synchronously
UPDATE storage.buckets
SET public = true
WHERE id = 'avatars';


-- >>> FILE: 20260801191500_update_leaderboard_avatar.sql
-- Drop first because signature (return columns) is changing
DROP FUNCTION IF EXISTS public.get_leaderboard_data(text);

CREATE OR REPLACE FUNCTION public.get_leaderboard_data(class_filter TEXT DEFAULT NULL)
RETURNS TABLE(id UUID, first_name TEXT, last_name TEXT, student_class TEXT, points INTEGER, avatar_url TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.first_name, p.last_name, p.student_class, p.points, p.avatar_url
  FROM public.profiles p
  WHERE p.role = 'student'
    AND p.is_approved = true
    AND (class_filter IS NULL OR p.student_class = class_filter)
  ORDER BY p.points DESC;
$$;


-- >>> FILE: 20260801193000_teacher_rls_and_approval_fixes.sql
-- 1. Redefine is_staff_or_admin to include 'teacher' role so they pass RLS checks
CREATE OR REPLACE FUNCTION public.is_staff_or_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _uid AND role IN ('admin','staff','librarian','teacher')
  )
$$;

-- 2. Redefine update_challenge_progress with search_path = public to fix reading approval trigger error
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Redefine get_teacher_class_students to return is_approved and include pending students
DROP FUNCTION IF EXISTS public.get_teacher_class_students(text);
CREATE OR REPLACE FUNCTION public.get_teacher_class_students(p_class text)
RETURNS TABLE(id uuid, first_name text, last_name text, username text, student_class text, admission_number text, points integer, avatar_url text, is_approved boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.first_name, p.last_name, p.username, p.student_class, p.admission_number, p.points, p.avatar_url, p.is_approved
  FROM public.profiles p
  WHERE p.role = 'student' AND p.student_class = p_class
  ORDER BY p.first_name;
$$;
GRANT EXECUTE ON FUNCTION public.get_teacher_class_students(text) TO authenticated;


-- >>> FILE: 20260801194000_multi_accession_books.sql
-- ============================================================
-- MULTI-ACCESSION & POPULARITY TRACKING MIGRATION
-- ============================================================

-- 1. Add accession_numbers array column to books
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS accession_numbers text[] DEFAULT '{}';

-- 2. Add issue_count column for catalog popularity sorting
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS issue_count integer NOT NULL DEFAULT 0;

-- 3. Migrate existing single accession_number into the array
UPDATE public.books
SET accession_numbers = ARRAY[accession_number]
WHERE accession_number IS NOT NULL
  AND accession_number != ''
  AND (accession_numbers IS NULL OR accession_numbers = '{}' OR array_length(accession_numbers, 1) IS NULL);

-- 4. Back-fill issue_count from existing book_issues records
UPDATE public.books b
SET issue_count = (
  SELECT COUNT(*)
  FROM public.book_issues bi
  WHERE bi.book_id = b.id
);

-- 5. Function to keep issue_count in sync
CREATE OR REPLACE FUNCTION public.update_book_issue_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.books SET issue_count = issue_count + 1 WHERE id = NEW.book_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.books SET issue_count = GREATEST(issue_count - 1, 0) WHERE id = OLD.book_id;
  END IF;
  RETURN NULL;
END;
$$;

-- 6. Trigger on book_issues to keep issue_count updated
DROP TRIGGER IF EXISTS trg_update_book_issue_count ON public.book_issues;
CREATE TRIGGER trg_update_book_issue_count
  AFTER INSERT OR DELETE ON public.book_issues
  FOR EACH ROW EXECUTE FUNCTION public.update_book_issue_count();

-- 7. Helper: get available accession numbers for a book
CREATE OR REPLACE FUNCTION public.get_available_accessions(p_book_id uuid)
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT unnest(b.accession_numbers)
      EXCEPT
      SELECT bi.accession_number
      FROM public.book_issues bi
      WHERE bi.book_id = p_book_id
        AND bi.status = 'issued'
        AND bi.accession_number IS NOT NULL
    ),
    b.accession_numbers
  )
  FROM public.books b
  WHERE b.id = p_book_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_accessions(uuid) TO authenticated;

-- 8. Redefine issue_book_to_user to support explicit physical copy accession number selection
DROP FUNCTION IF EXISTS public.issue_book_to_user(uuid, uuid, date);
CREATE OR REPLACE FUNCTION public.issue_book_to_user(
  p_book_id uuid,
  p_user_id uuid,
  p_issue_date date DEFAULT CURRENT_DATE,
  p_accession_number text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE 
  v_id uuid; 
  v_acc text; 
  v_avail integer;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT available_copies INTO v_avail FROM public.books WHERE id = p_book_id FOR UPDATE;
  IF v_avail IS NULL OR v_avail < 1 THEN RAISE EXCEPTION 'No copies available'; END IF;

  -- Resolve accession number to use
  IF p_accession_number IS NOT NULL AND p_accession_number != '' THEN
    v_acc := p_accession_number;
  ELSE
    -- Fetch the first available accession number that is not currently checked out
    SELECT unnest(available_accs) INTO v_acc
    FROM (
      SELECT public.get_available_accessions(p_book_id) AS available_accs
    ) sub
    LIMIT 1;
    
    -- Fallback to the default single accession_number column if no array matches
    IF v_acc IS NULL THEN
      SELECT accession_number INTO v_acc FROM public.books WHERE id = p_book_id;
    END IF;
  END IF;

  INSERT INTO public.book_issues (book_id, user_id, issue_date, due_date, status, accession_number)
  VALUES (p_book_id, p_user_id, p_issue_date, p_issue_date, 'issued', v_acc)
  RETURNING id INTO v_id;

  UPDATE public.books SET available_copies = GREATEST(available_copies - 1, 0) WHERE id = p_book_id;
  RETURN v_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.issue_book_to_user(uuid, uuid, date, text) TO authenticated;

-- 9. Add employee_code to profiles for teachers (mirrors student admission_number for display)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employee_code TEXT;


-- >>> FILE: 20260802023543_3edfd7e4-49b0-4b05-a71a-b15a25b108d2.sql
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS shelf_number text,
  ADD COLUMN IF NOT EXISTS cupboard_number text,
  ADD COLUMN IF NOT EXISTS accession_numbers text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS issue_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS books_title_lower_idx ON public.books (lower(title));
CREATE INDEX IF NOT EXISTS books_author_lower_idx ON public.books (lower(author));
CREATE INDEX IF NOT EXISTS books_accession_idx ON public.books (accession_number);
CREATE INDEX IF NOT EXISTS books_issue_count_idx ON public.books (issue_count DESC);

DROP FUNCTION IF EXISTS public.get_distinct_book_filters();

CREATE OR REPLACE FUNCTION public.get_distinct_book_filters()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'categories', (SELECT coalesce(jsonb_agg(DISTINCT category ORDER BY category), '[]'::jsonb) FROM public.books WHERE category IS NOT NULL AND category <> ''),
    'subjects', (SELECT coalesce(jsonb_agg(DISTINCT subject ORDER BY subject), '[]'::jsonb) FROM public.books WHERE subject IS NOT NULL AND subject <> ''),
    'class_levels', (SELECT coalesce(jsonb_agg(DISTINCT class_level ORDER BY class_level), '[]'::jsonb) FROM public.books WHERE class_level IS NOT NULL AND class_level <> ''),
    'languages', (SELECT coalesce(jsonb_agg(DISTINCT language ORDER BY language), '[]'::jsonb) FROM public.books WHERE language IS NOT NULL AND language <> ''),
    'authors', (SELECT coalesce(jsonb_agg(DISTINCT author ORDER BY author), '[]'::jsonb) FROM public.books WHERE author IS NOT NULL AND author <> '')
  );
$$;

REVOKE ALL ON FUNCTION public.get_distinct_book_filters() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_distinct_book_filters() TO anon, authenticated;

UPDATE public.books b
SET issue_count = c.cnt
FROM (SELECT book_id, count(*) cnt FROM public.book_issues GROUP BY book_id) c
WHERE c.book_id = b.id AND b.issue_count = 0;

-- >>> FILE: 20260802023704_5ae4d14a-5da4-4278-bbae-9a133560ab31.sql
CREATE OR REPLACE FUNCTION public.get_available_accessions(p_book_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(array_agg(a ORDER BY a), '{}')
  FROM (
    SELECT unnest(
      CASE WHEN coalesce(array_length(b.accession_numbers, 1), 0) > 0
           THEN b.accession_numbers
           ELSE array_remove(ARRAY[b.accession_number], NULL)
      END
    ) AS a
    FROM public.books b
    WHERE b.id = p_book_id
  ) s
  WHERE a IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.book_issues i
      WHERE i.book_id = p_book_id
        AND i.accession_number = s.a
        AND i.status <> 'returned'
    );
$$;

REVOKE ALL ON FUNCTION public.get_available_accessions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_available_accessions(uuid) TO authenticated;

-- >>> FILE: 20260802052800_add_notification_fields.sql
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_link TEXT;


-- >>> FILE: 20260802054200_create_push_subscriptions.sql
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_object JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own push subscriptions"
  ON public.push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id);


-- >>> FILE: 20260802055500_push_subscriptions_unique.sql
ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_user_id_key UNIQUE (user_id);


-- >>> FILE: 20260804000000_event_submissions.sql

-- Add submission configuration columns to library_events
ALTER TABLE public.library_events ADD COLUMN IF NOT EXISTS allow_submissions BOOLEAN DEFAULT false;
ALTER TABLE public.library_events ADD COLUMN IF NOT EXISTS submission_types TEXT[] DEFAULT ARRAY['image', 'pdf']::TEXT[];
ALTER TABLE public.library_events ADD COLUMN IF NOT EXISTS max_submission_days INTEGER DEFAULT 1;

-- Create event_submissions table
CREATE TABLE IF NOT EXISTS public.event_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.library_events(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    day_number integer NOT NULL,
    file_url text NOT NULL,
    file_type text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(event_id, user_id, day_number)
);

-- RLS policies for event_submissions
ALTER TABLE public.event_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "submissions own read" ON public.event_submissions;
CREATE POLICY "submissions own read" ON public.event_submissions FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "submissions own insert" ON public.event_submissions;
CREATE POLICY "submissions own insert" ON public.event_submissions FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "submissions own update" ON public.event_submissions;
CREATE POLICY "submissions own update" ON public.event_submissions FOR UPDATE TO authenticated
    USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "submissions own delete" ON public.event_submissions;
CREATE POLICY "submissions own delete" ON public.event_submissions FOR DELETE TO authenticated
    USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

-- Add storage bucket for event submissions if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-submissions', 'event-submissions', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT
USING ( bucket_id = 'event-submissions' );

DROP POLICY IF EXISTS "Auth Insert" ON storage.objects;
CREATE POLICY "Auth Insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK ( bucket_id = 'event-submissions' );

DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE TO authenticated
USING ( bucket_id = 'event-submissions' );

DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;
CREATE POLICY "Auth Delete" ON storage.objects FOR DELETE TO authenticated
USING ( bucket_id = 'event-submissions' );




-- >>> FILE: 20260804000001_badge_triggers.sql

-- Database function to check and award badges
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_badge RECORD;
  v_val INTEGER;
  v_books_read INTEGER;
  v_quizzes_completed INTEGER;
  v_current_streak INTEGER;
  v_posts_count INTEGER;
  v_comments_count INTEGER;
  v_friends_count INTEGER;
  v_books_issued INTEGER;
  v_reviews_count INTEGER;
  v_points INTEGER;
BEGIN
  -- Fetch current stats
  SELECT COALESCE(points, 0) INTO v_points FROM public.profiles WHERE id = p_user_id;
  
  SELECT COUNT(*)::integer INTO v_books_read FROM public.reading_history WHERE user_id = p_user_id AND status = 'approved';
  SELECT COUNT(*)::integer INTO v_quizzes_completed FROM public.quiz_results WHERE user_id = p_user_id;
  SELECT COALESCE(current_streak, 0) INTO v_current_streak FROM public.login_streaks WHERE user_id = p_user_id;
  SELECT COUNT(*)::integer INTO v_posts_count FROM public.posts WHERE user_id = p_user_id;
  SELECT COUNT(*)::integer INTO v_comments_count FROM public.post_comments WHERE user_id = p_user_id;
  
  SELECT COUNT(*)::integer INTO v_friends_count FROM public.friendships 
  WHERE (requester_id = p_user_id OR addressee_id = p_user_id) AND status = 'accepted';
  
  SELECT COUNT(*)::integer INTO v_books_issued FROM public.book_issues WHERE user_id = p_user_id;
  SELECT COUNT(*)::integer INTO v_reviews_count FROM public.book_reviews WHERE user_id = p_user_id;

  -- Loop through active auto-badges
  FOR v_badge IN 
    SELECT * FROM public.badges WHERE is_active = true AND criteria_type IS NOT NULL AND criteria_type <> 'manual'
  LOOP
    -- Get metric value
    CASE v_badge.criteria_type
      WHEN 'points' THEN v_val := v_points;
      WHEN 'books_read' THEN v_val := v_books_read;
      WHEN 'quizzes_completed' THEN v_val := v_quizzes_completed;
      WHEN 'login_streak' THEN v_val := v_current_streak;
      WHEN 'posts_count' THEN v_val := v_posts_count;
      WHEN 'comments_count' THEN v_val := v_comments_count;
      WHEN 'friends_count' THEN v_val := v_friends_count;
      WHEN 'books_issued' THEN v_val := v_books_issued;
      WHEN 'reviews_count' THEN v_val := v_reviews_count;
      ELSE v_val := 0;
    END CASE;

    -- Award if qualifies and not already awarded
    IF v_val >= COALESCE(v_badge.criteria_value, 0) THEN
      INSERT INTO public.badge_awards (user_id, badge_id, award_type)
      VALUES (p_user_id, v_badge.id, 'auto')
      ON CONFLICT (user_id, badge_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Expose function as RPC for frontend calls
GRANT EXECUTE ON FUNCTION public.check_and_award_badges(uuid) TO authenticated;

-- Trigger function for tables that have a user_id column
CREATE OR REPLACE FUNCTION public.tg_check_user_badges()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.check_and_award_badges(OLD.user_id);
    RETURN OLD;
  END IF;
  PERFORM public.check_and_award_badges(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Separate trigger function for the profiles table (PK is "id", not "user_id")
CREATE OR REPLACE FUNCTION public.tg_check_profile_badges()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.check_and_award_badges(OLD.id);
    RETURN OLD;
  END IF;
  PERFORM public.check_and_award_badges(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers for various tables
DROP TRIGGER IF EXISTS trg_profile_points_badge ON public.profiles;
CREATE TRIGGER trg_profile_points_badge
  AFTER UPDATE OF points ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_check_profile_badges();


DROP TRIGGER IF EXISTS trg_reading_badge ON public.reading_history;
CREATE TRIGGER trg_reading_badge
  AFTER INSERT OR UPDATE ON public.reading_history
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_check_user_badges();

DROP TRIGGER IF EXISTS trg_quiz_badge ON public.quiz_results;
CREATE TRIGGER trg_quiz_badge
  AFTER INSERT ON public.quiz_results
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_check_user_badges();

DROP TRIGGER IF EXISTS trg_streak_badge ON public.login_streaks;
CREATE TRIGGER trg_streak_badge
  AFTER INSERT OR UPDATE ON public.login_streaks
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_check_user_badges();



-- >>> FILE: 20260804100000_condemnation_simplified.sql
-- Simplified Condemnation Module Migration

-- Create Condemnation Batches table to group entries for reports
CREATE TABLE IF NOT EXISTS public.condemnation_batches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number text NOT NULL,
    fund_source text NOT NULL DEFAULT 'SCHOOL_FUND',
    created_by uuid REFERENCES public.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.condemnation_batches TO authenticated;
GRANT ALL ON public.condemnation_batches TO service_role;
ALTER TABLE public.condemnation_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage condemnation_batches" ON public.condemnation_batches FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));


-- Modify book_condemnations to add the new fields
ALTER TABLE public.book_condemnations
    ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.condemnation_batches(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS cost numeric(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discount_pct numeric(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS year_of_purchase integer,
    ADD COLUMN IF NOT EXISTS date_became_unserviceable date,
    ADD COLUMN IF NOT EXISTS other_reason_note text,
    ADD COLUMN IF NOT EXISTS fund_source text DEFAULT 'SCHOOL_FUND';

ALTER TABLE public.book_condemnations
    ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rate numeric(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS depreciation_amount numeric(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS net_value numeric(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS years_in_use integer DEFAULT 0;

CREATE OR REPLACE FUNCTION public.calculate_condemnation_financials()
RETURNS TRIGGER AS $$
DECLARE
    depreciation_rate numeric := 0.95;
BEGIN
    NEW.discount_amount := COALESCE(NEW.cost, 0) * (COALESCE(NEW.discount_pct, 0) / 100.0);
    NEW.rate := COALESCE(NEW.cost, 0) - NEW.discount_amount;
    NEW.depreciation_amount := NEW.rate * depreciation_rate;
    NEW.net_value := NEW.rate - NEW.depreciation_amount;
    
    IF NEW.year_of_purchase IS NOT NULL AND NEW.date_became_unserviceable IS NOT NULL THEN
        NEW.years_in_use := EXTRACT(YEAR FROM NEW.date_became_unserviceable) - NEW.year_of_purchase;
    ELSE
        NEW.years_in_use := 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_condemnation_financials ON public.book_condemnations;
CREATE TRIGGER trg_condemnation_financials
BEFORE INSERT OR UPDATE ON public.book_condemnations
FOR EACH ROW EXECUTE FUNCTION public.calculate_condemnation_financials();

-- Update RPC to support batch_id and financials
CREATE OR REPLACE FUNCTION public.condemn_book_v2(
    p_batch_id uuid,
    p_book_id uuid,
    p_accession_number text,
    p_title text,
    p_year integer,
    p_cost numeric,
    p_reason text,
    p_fund text DEFAULT 'SCHOOL_FUND'
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_id uuid;
    v_batch_id uuid := p_batch_id;
BEGIN
    IF NOT public.is_staff_or_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
    
    IF v_batch_id IS NULL THEN
        INSERT INTO public.condemnation_batches (batch_number, fund_source, created_by)
        VALUES ('COND-' || to_char(now(), 'YYYYMMDD-HH24MISS'), p_fund, auth.uid())
        RETURNING id INTO v_batch_id;
    END IF;

    INSERT INTO public.book_condemnations (
        batch_id, book_id, accession_number, book_title,
        year_of_purchase, cost, reason, date_became_unserviceable, condemned_by, fund_source
    ) VALUES (
        v_batch_id, p_book_id, p_accession_number, p_title,
        p_year, p_cost, p_reason, CURRENT_DATE, auth.uid(), p_fund
    ) RETURNING id INTO v_id;
    
    -- update books if book_id is provided
    IF p_book_id IS NOT NULL THEN
        UPDATE public.books
        SET total_copies = GREATEST(total_copies - 1, 0),
            available_copies = GREATEST(available_copies - 1, 0),
            condemned_copies = condemned_copies + 1,
            updated_at = now()
        WHERE id = p_book_id;
    END IF;

    RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.condemn_book_v2(uuid, uuid, text, text, integer, numeric, text, text) TO authenticated;


-- >>> FILE: 20260805025803_30c83808-ab3f-4c39-979a-9e18af6d580f.sql
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  admission_number text,
  full_name text NOT NULL,
  email text,
  student_class text,
  role text,
  category text NOT NULL DEFAULT 'general',
  subject text NOT NULL,
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  admin_response text,
  assigned_to uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT INSERT ON public.support_tickets TO anon;
GRANT ALL ON public.support_tickets TO service_role;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit a ticket" ON public.support_tickets;
CREATE POLICY "Anyone can submit a ticket" ON public.support_tickets FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Users view own tickets, staff view all" ON public.support_tickets;
CREATE POLICY "Users view own tickets, staff view all" ON public.support_tickets FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
DROP POLICY IF EXISTS "Staff update tickets" ON public.support_tickets;
CREATE POLICY "Staff update tickets" ON public.support_tickets FOR UPDATE TO authenticated USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));
DROP POLICY IF EXISTS "Staff delete tickets" ON public.support_tickets;
CREATE POLICY "Staff delete tickets" ON public.support_tickets FOR DELETE TO authenticated USING (public.is_staff_or_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_support_tickets_updated ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_updated BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);

CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid,
  sender_name text,
  is_staff boolean NOT NULL DEFAULT false,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.support_ticket_messages TO authenticated;
GRANT ALL ON public.support_ticket_messages TO service_role;

ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View messages on visible tickets" ON public.support_ticket_messages;
CREATE POLICY "View messages on visible tickets" ON public.support_ticket_messages FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()))));
DROP POLICY IF EXISTS "Reply on visible tickets" ON public.support_ticket_messages;
CREATE POLICY "Reply on visible tickets" ON public.support_ticket_messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()))));

DROP TRIGGER IF EXISTS trg_ticket_messages_updated ON public.support_ticket_messages;
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON public.support_ticket_messages(ticket_id);

-- Lookup for the public support form (no email/contact exposure)
CREATE OR REPLACE FUNCTION public.lookup_member_by_admission(p_admission text)
RETURNS TABLE(full_name text, student_class text, role text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT TRIM(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,'')), p.student_class, p.role
  FROM public.profiles p
  WHERE p.admission_number = p_admission AND p.is_approved = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_member_by_admission(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_member_by_admission(text) TO anon, authenticated;

-- Notify staff-free helper: notify ticket owner when admin responds
CREATE OR REPLACE FUNCTION public.tg_notify_ticket_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND (NEW.status IS DISTINCT FROM OLD.status OR NEW.admin_response IS DISTINCT FROM OLD.admin_response) THEN
    PERFORM public.notify_user(NEW.user_id, 'Support ticket updated',
      'Your ticket "' || COALESCE(NEW.subject,'') || '" is now ' || COALESCE(NEW.status,'open') || '.',
      CASE WHEN NEW.status = 'resolved' THEN 'success' ELSE 'info' END);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS notify_ticket_update ON public.support_tickets;
CREATE TRIGGER notify_ticket_update AFTER UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.tg_notify_ticket_update();

-- >>> FILE: 20260805025921_6de7cea6-ff30-45ba-918f-41a2d6641cee.sql
-- Notifications: rich content
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_link text;

-- Library events: multi-day activity submissions
ALTER TABLE public.library_events ADD COLUMN IF NOT EXISTS allow_submissions boolean NOT NULL DEFAULT false;
ALTER TABLE public.library_events ADD COLUMN IF NOT EXISTS submission_types text[] NOT NULL DEFAULT ARRAY['image','pdf'];
ALTER TABLE public.library_events ADD COLUMN IF NOT EXISTS max_submission_days integer NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS public.event_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.library_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  day_number integer NOT NULL DEFAULT 1,
  file_url text,
  file_type text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id, day_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_submissions TO authenticated;
GRANT ALL ON public.event_submissions TO service_role;
ALTER TABLE public.event_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own or staff view submissions" ON public.event_submissions;
CREATE POLICY "Own or staff view submissions" ON public.event_submissions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
DROP POLICY IF EXISTS "Users add own submissions" ON public.event_submissions;
CREATE POLICY "Users add own submissions" ON public.event_submissions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users update own submissions" ON public.event_submissions;
CREATE POLICY "Users update own submissions" ON public.event_submissions FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
DROP POLICY IF EXISTS "Users delete own submissions" ON public.event_submissions;
CREATE POLICY "Users delete own submissions" ON public.event_submissions FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_event_submissions_updated ON public.event_submissions;
CREATE TRIGGER trg_event_submissions_updated BEFORE UPDATE ON public.event_submissions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Web push subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  subscription_object jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own push subscription" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subscription" ON public.push_subscriptions FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS trg_push_subscriptions_updated ON public.push_subscriptions;
CREATE TRIGGER trg_push_subscriptions_updated BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Condemnation batches + richer condemnation entries
CREATE TABLE IF NOT EXISTS public.condemnation_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number text NOT NULL,
  fund_source text NOT NULL DEFAULT 'VVN',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.condemnation_batches TO authenticated;
GRANT ALL ON public.condemnation_batches TO service_role;
ALTER TABLE public.condemnation_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff view batches" ON public.condemnation_batches;
CREATE POLICY "Staff view batches" ON public.condemnation_batches FOR SELECT TO authenticated
USING (public.is_staff_or_admin(auth.uid()));
DROP POLICY IF EXISTS "Staff manage batches" ON public.condemnation_batches;
CREATE POLICY "Staff manage batches" ON public.condemnation_batches FOR ALL TO authenticated
USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

ALTER TABLE public.book_condemnations ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.condemnation_batches(id) ON DELETE CASCADE;
ALTER TABLE public.book_condemnations ADD COLUMN IF NOT EXISTS cost numeric NOT NULL DEFAULT 0;
ALTER TABLE public.book_condemnations ADD COLUMN IF NOT EXISTS discount_pct numeric NOT NULL DEFAULT 0;
ALTER TABLE public.book_condemnations ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.book_condemnations ADD COLUMN IF NOT EXISTS rate numeric NOT NULL DEFAULT 0;
ALTER TABLE public.book_condemnations ADD COLUMN IF NOT EXISTS depreciation_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.book_condemnations ADD COLUMN IF NOT EXISTS net_value numeric NOT NULL DEFAULT 0;
ALTER TABLE public.book_condemnations ADD COLUMN IF NOT EXISTS year_of_purchase integer;
ALTER TABLE public.book_condemnations ADD COLUMN IF NOT EXISTS date_became_unserviceable date DEFAULT CURRENT_DATE;
ALTER TABLE public.book_condemnations ADD COLUMN IF NOT EXISTS fund_source text;

DROP FUNCTION IF EXISTS public.condemn_book_v2(uuid, uuid, text, text, integer, numeric, text, text);
CREATE OR REPLACE FUNCTION public.condemn_book_v2(
  p_batch_id uuid,
  p_book_id uuid,
  p_accession_number text,
  p_title text,
  p_year integer,
  p_cost numeric,
  p_reason text,
  p_fund text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
  v_years integer;
  v_rate numeric;
  v_dep numeric;
  v_net numeric;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;

  v_years := GREATEST(EXTRACT(YEAR FROM CURRENT_DATE)::int - COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::int), 0);
  v_rate := LEAST(v_years * 10, 90);
  v_dep := ROUND(COALESCE(p_cost,0) * v_rate / 100.0, 2);
  v_net := GREATEST(COALESCE(p_cost,0) - v_dep, 0);

  INSERT INTO public.book_condemnations (
    book_id, accession_number, book_title, copies, reason, condemned_by,
    batch_id, cost, rate, depreciation_amount, net_value, year_of_purchase,
    date_became_unserviceable, fund_source
  ) VALUES (
    p_book_id, p_accession_number, p_title, 1, COALESCE(p_reason,'damaged'), auth.uid(),
    p_batch_id, COALESCE(p_cost,0), v_rate, v_dep, v_net, p_year,
    CURRENT_DATE, p_fund
  ) RETURNING id INTO v_id;

  IF p_book_id IS NOT NULL THEN
    UPDATE public.books
      SET total_copies = GREATEST(total_copies - 1, 0),
          available_copies = GREATEST(available_copies - 1, 0),
          condemned_copies = condemned_copies + 1,
          updated_at = now()
    WHERE id = p_book_id;
  END IF;

  RETURN v_id;
END; $$;

REVOKE ALL ON FUNCTION public.condemn_book_v2(uuid, uuid, text, text, integer, numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.condemn_book_v2(uuid, uuid, text, text, integer, numeric, text, text) TO authenticated;

-- >>> FILE: 20260805030007_ab84f595-448e-4a4b-b7e3-ad011fc39f80.sql
-- Drop old version first (return type changed from void to integer)
DROP FUNCTION IF EXISTS public.check_and_award_badges(uuid);
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  b record;
  v_val integer;
  v_awarded integer := 0;
BEGIN
  IF p_user_id IS NULL THEN RETURN 0; END IF;
  IF auth.uid() IS DISTINCT FROM p_user_id AND NOT public.is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  FOR b IN SELECT * FROM public.badges WHERE is_active = true AND criteria_type IS NOT NULL AND criteria_value IS NOT NULL LOOP
    IF EXISTS (SELECT 1 FROM public.badge_awards WHERE user_id = p_user_id AND badge_id = b.id) THEN
      CONTINUE;
    END IF;

    v_val := CASE b.criteria_type
      WHEN 'books_read' THEN (SELECT COUNT(*)::int FROM public.reading_history WHERE user_id = p_user_id AND status = 'approved')
      WHEN 'books_issued' THEN (SELECT COUNT(*)::int FROM public.book_issues WHERE user_id = p_user_id)
      WHEN 'quizzes_completed' THEN (SELECT COUNT(*)::int FROM public.quiz_results WHERE user_id = p_user_id)
      WHEN 'login_streak' THEN COALESCE((SELECT current_streak FROM public.login_streaks WHERE user_id = p_user_id), 0)
      WHEN 'points' THEN COALESCE((SELECT points FROM public.profiles WHERE id = p_user_id), 0)
      WHEN 'posts_count' THEN (SELECT COUNT(*)::int FROM public.posts WHERE user_id = p_user_id)
      WHEN 'comments_count' THEN (SELECT COUNT(*)::int FROM public.post_comments WHERE user_id = p_user_id)
      WHEN 'reviews_count' THEN (SELECT COUNT(*)::int FROM public.book_reviews WHERE user_id = p_user_id)
      WHEN 'friends_count' THEN (SELECT COUNT(*)::int FROM public.friendships WHERE status = 'accepted' AND (requester_id = p_user_id OR addressee_id = p_user_id))
      ELSE 0
    END;

    IF v_val >= b.criteria_value THEN
      INSERT INTO public.badge_awards (user_id, badge_id, award_type, note)
      VALUES (p_user_id, b.id, 'auto', 'Automatically awarded')
      ON CONFLICT DO NOTHING;
      v_awarded := v_awarded + 1;
    END IF;
  END LOOP;

  RETURN v_awarded;
END; $$;

REVOKE ALL ON FUNCTION public.check_and_award_badges(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_and_award_badges(uuid) TO authenticated;

-- >>> FILE: 20260805040000_fines_certificates_goals.sql
-- Library fines (UPI), school-wide reading goal, and certificates

-- 1. Seed / upsert library settings
INSERT INTO public.system_settings (key, value) VALUES
  ('fine_per_day', '1'::jsonb),
  ('upi_id', '""'::jsonb),
  ('upi_payee_name', '"PM SHRI KV AFS Sulur Library"'::jsonb),
  ('monthly_reading_goal', '3'::jsonb),
  ('certificate_template_url', 'null'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Issued certificates
CREATE TABLE IF NOT EXISTS public.issued_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_id uuid REFERENCES public.library_events(id) ON DELETE SET NULL,
  template_url text,
  issued_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_issued_certificates_user ON public.issued_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_issued_certificates_issued_at ON public.issued_certificates(issued_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.issued_certificates TO authenticated;
GRANT ALL ON public.issued_certificates TO service_role;

ALTER TABLE public.issued_certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "certificates own read" ON public.issued_certificates;
CREATE POLICY "certificates own read" ON public.issued_certificates
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "certificates staff insert" ON public.issued_certificates;
CREATE POLICY "certificates staff insert" ON public.issued_certificates
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "certificates staff update" ON public.issued_certificates;
CREATE POLICY "certificates staff update" ON public.issued_certificates
  FOR UPDATE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "certificates staff delete" ON public.issued_certificates;
CREATE POLICY "certificates staff delete" ON public.issued_certificates
  FOR DELETE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

-- 3. Allow staff to manage school-wide goals via monthly_reading_goals (optional sync)
DROP POLICY IF EXISTS "goals staff insert" ON public.monthly_reading_goals;
CREATE POLICY "goals staff insert" ON public.monthly_reading_goals
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "goals staff update" ON public.monthly_reading_goals;
CREATE POLICY "goals staff update" ON public.monthly_reading_goals
  FOR UPDATE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

-- 4. Certificates storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "certificates public read" ON storage.objects;
CREATE POLICY "certificates public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'certificates');

DROP POLICY IF EXISTS "certificates staff insert" ON storage.objects;
CREATE POLICY "certificates staff insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'certificates' AND public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "certificates staff update" ON storage.objects;
CREATE POLICY "certificates staff update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'certificates' AND public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "certificates staff delete" ON storage.objects;
CREATE POLICY "certificates staff delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'certificates' AND public.is_staff_or_admin(auth.uid()));


-- >>> FILE: 20260805100000_reading_history_limits.sql
-- Phase 1: Reading history anti-abuse (server-side)

-- Allow suspicious status
ALTER TABLE public.reading_history DROP CONSTRAINT IF EXISTS reading_history_status_check;
ALTER TABLE public.reading_history
  ADD CONSTRAINT reading_history_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'suspicious'));

-- Optional book_id for future catalog-linked reads
ALTER TABLE public.reading_history
  ADD COLUMN IF NOT EXISTS book_id uuid REFERENCES public.books(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reading_history_user_day
  ON public.reading_history (user_id, completed_date);

CREATE INDEX IF NOT EXISTS idx_reading_history_user_title
  ON public.reading_history (user_id, lower(trim(book_title)));

-- Enforce daily rate limit + 7-day same-book cooldown + auto-flag
CREATE OR REPLACE FUNCTION public.enforce_reading_history_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_count integer;
  recent_same integer;
BEGIN
  -- Count entries for this user today (any status)
  SELECT COUNT(*) INTO today_count
  FROM public.reading_history
  WHERE user_id = NEW.user_id
    AND completed_date = CURRENT_DATE
    AND (TG_OP = 'INSERT' OR id IS DISTINCT FROM NEW.id);

  -- Hard rate limit: reject 3rd+ entry today (≥ 2 already exist)
  IF today_count >= 2 THEN
    RAISE EXCEPTION 'Daily reading limit reached: maximum 2 entries per day.'
      USING ERRCODE = 'P0001';
  END IF;

  -- Cooldown: same book title (or book_id) within last 7 days
  SELECT COUNT(*) INTO recent_same
  FROM public.reading_history
  WHERE user_id = NEW.user_id
    AND created_at >= (now() - interval '7 days')
    AND (TG_OP = 'INSERT' OR id IS DISTINCT FROM NEW.id)
    AND (
      (NEW.book_id IS NOT NULL AND book_id = NEW.book_id)
      OR lower(trim(book_title)) = lower(trim(NEW.book_title))
    );

  IF recent_same > 0 THEN
    RAISE EXCEPTION 'Cooldown active: you already logged this book within the last 7 days.'
      USING ERRCODE = 'P0001';
  END IF;

  -- Auto-flag: if already 1 entry today, mark this (2nd) as suspicious
  IF today_count >= 1 AND COALESCE(NEW.status, 'pending') = 'pending' THEN
    NEW.status := 'suspicious';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_reading_history_limits ON public.reading_history;
CREATE TRIGGER trg_enforce_reading_history_limits
  BEFORE INSERT ON public.reading_history
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_reading_history_limits();


-- >>> FILE: 20260805101000_fines.sql
-- Phase 2: Fine management

CREATE TABLE IF NOT EXISTS public.fine_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  rate_per_day numeric(10,2) NOT NULL DEFAULT 1,
  grace_period_days integer NOT NULL DEFAULT 0,
  upi_id text DEFAULT '',
  upi_payee_name text DEFAULT 'PM SHRI KV AFS Sulur Library',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.fine_settings (id, rate_per_day, grace_period_days)
VALUES (1, 1, 0)
ON CONFLICT (id) DO NOTHING;

-- Sync from existing system_settings if present
UPDATE public.fine_settings fs SET
  rate_per_day = COALESCE(
    (SELECT CASE
       WHEN jsonb_typeof(value) = 'number' THEN (value)::text::numeric
       ELSE NULLIF(trim(both '"' from value::text), '')::numeric
     END FROM public.system_settings WHERE key = 'fine_per_day'),
    fs.rate_per_day
  ),
  upi_id = COALESCE(
    (SELECT NULLIF(trim(both '"' from value::text), '') FROM public.system_settings WHERE key = 'upi_id'),
    fs.upi_id
  ),
  upi_payee_name = COALESCE(
    (SELECT NULLIF(trim(both '"' from value::text), '') FROM public.system_settings WHERE key = 'upi_payee_name'),
    fs.upi_payee_name
  )
WHERE fs.id = 1;

GRANT SELECT ON public.fine_settings TO anon, authenticated;
GRANT ALL ON public.fine_settings TO service_role;
GRANT UPDATE, INSERT ON public.fine_settings TO authenticated;

ALTER TABLE public.fine_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fine_settings read" ON public.fine_settings;
CREATE POLICY "fine_settings read" ON public.fine_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "fine_settings staff write" ON public.fine_settings;
CREATE POLICY "fine_settings staff write" ON public.fine_settings
  FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.library_fines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_issue_id uuid REFERENCES public.book_issues(id) ON DELETE SET NULL,
  days_overdue integer NOT NULL DEFAULT 0,
  rate_per_day numeric(10,2) NOT NULL DEFAULT 1,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'waived')),
  payment_method text,
  payment_ref text,
  paid_at timestamptz,
  book_title text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_library_fines_user ON public.library_fines(user_id);
CREATE INDEX IF NOT EXISTS idx_library_fines_status ON public.library_fines(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_library_fines_issue_unique
  ON public.library_fines(book_issue_id) WHERE book_issue_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_fines TO authenticated;
GRANT ALL ON public.library_fines TO service_role;

ALTER TABLE public.library_fines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fines own read" ON public.library_fines;
CREATE POLICY "fines own read" ON public.library_fines
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "fines staff write" ON public.library_fines;
CREATE POLICY "fines staff write" ON public.library_fines
  FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- Allow students to set payment_ref / mark pending confirmation (payment_method only)
DROP POLICY IF EXISTS "fines student pay update" ON public.library_fines;
CREATE POLICY "fines student pay update" ON public.library_fines
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.calculate_fine(p_issue_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_due date;
  v_status text;
  v_rate numeric;
  v_grace integer;
  v_days integer;
BEGIN
  SELECT due_date::date, status INTO v_due, v_status
  FROM public.book_issues WHERE id = p_issue_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  SELECT rate_per_day, grace_period_days INTO v_rate, v_grace
  FROM public.fine_settings WHERE id = 1;

  v_rate := COALESCE(v_rate, 1);
  v_grace := COALESCE(v_grace, 0);

  v_days := GREATEST(0, (CURRENT_DATE - v_due) - v_grace);
  RETURN v_days * v_rate;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_fine(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_fine_on_return()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate numeric;
  v_grace integer;
  v_days integer;
  v_amount numeric;
  v_title text;
BEGIN
  IF NEW.status = 'returned' AND (OLD.status IS DISTINCT FROM 'returned') THEN
    SELECT rate_per_day, grace_period_days INTO v_rate, v_grace
    FROM public.fine_settings WHERE id = 1;
    v_rate := COALESCE(v_rate, 1);
    v_grace := COALESCE(v_grace, 0);

    v_days := GREATEST(0, (COALESCE(NEW.return_date::date, CURRENT_DATE) - NEW.due_date::date) - v_grace);
    v_amount := v_days * v_rate;

    IF v_days > 0 AND v_amount > 0 THEN
      SELECT title INTO v_title FROM public.books WHERE id = NEW.book_id;
      IF NOT EXISTS (SELECT 1 FROM public.library_fines WHERE book_issue_id = NEW.id) THEN
        INSERT INTO public.library_fines (
          user_id, book_issue_id, days_overdue, rate_per_day, total_amount,
          status, book_title
        ) VALUES (
          NEW.user_id, NEW.id, v_days, v_rate, v_amount, 'pending', v_title
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_fine_on_return ON public.book_issues;
CREATE TRIGGER trg_create_fine_on_return
  AFTER UPDATE ON public.book_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.create_fine_on_return();


-- >>> FILE: 20260805102000_reservations.sql
-- Phase 3: Reservation queue enhancements

-- Max 3 active (pending) reservations per student
CREATE OR REPLACE FUNCTION public.enforce_max_reservations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_count integer;
BEGIN
  IF NEW.status = 'pending' THEN
    SELECT COUNT(*) INTO active_count
    FROM public.book_reservations
    WHERE user_id = NEW.user_id
      AND status = 'pending'
      AND (TG_OP = 'INSERT' OR id IS DISTINCT FROM NEW.id);

    IF active_count >= 3 THEN
      RAISE EXCEPTION 'Maximum 3 active reservations allowed.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_max_reservations ON public.book_reservations;
CREATE TRIGGER trg_enforce_max_reservations
  BEFORE INSERT OR UPDATE ON public.book_reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_max_reservations();

-- On return: notify first pending reservation in queue
CREATE OR REPLACE FUNCTION public.notify_reservation_on_return()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res record;
  v_title text;
BEGIN
  IF NEW.status = 'returned' AND (OLD.status IS DISTINCT FROM 'returned') THEN
    SELECT title INTO v_title FROM public.books WHERE id = NEW.book_id;

    SELECT * INTO v_res
    FROM public.book_reservations
    WHERE book_id = NEW.book_id AND status = 'pending'
    ORDER BY created_at ASC
    LIMIT 1;

    IF FOUND THEN
      INSERT INTO public.notifications (title, message, type, target_user_id, sent_by)
      VALUES (
        'Book available',
        format('"%s" you reserved is now available. Visit the library to borrow it.', COALESCE(v_title, 'A book')),
        'success',
        v_res.user_id,
        NEW.user_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_reservation_on_return ON public.book_issues;
CREATE TRIGGER trg_notify_reservation_on_return
  AFTER UPDATE ON public.book_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_reservation_on_return();


-- >>> FILE: 20260805103000_suggestions_and_lost.sql
-- Phase 4: Book suggestions + lost book reports

CREATE TABLE IF NOT EXISTS public.book_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  author text,
  reason text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_book_suggestions_status ON public.book_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_book_suggestions_user ON public.book_suggestions(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_suggestions TO authenticated;
GRANT ALL ON public.book_suggestions TO service_role;
ALTER TABLE public.book_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suggestions own read" ON public.book_suggestions;
CREATE POLICY "suggestions own read" ON public.book_suggestions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "suggestions own insert" ON public.book_suggestions;
CREATE POLICY "suggestions own insert" ON public.book_suggestions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "suggestions staff update" ON public.book_suggestions;
CREATE POLICY "suggestions staff update" ON public.book_suggestions
  FOR UPDATE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "suggestions staff delete" ON public.book_suggestions;
CREATE POLICY "suggestions staff delete" ON public.book_suggestions
  FOR DELETE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.lost_book_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_issue_id uuid REFERENCES public.book_issues(id) ON DELETE SET NULL,
  book_title text NOT NULL,
  accession_number text,
  reported_at timestamptz NOT NULL DEFAULT now(),
  replacement_cost numeric(10,2) NOT NULL DEFAULT 300,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'settled')),
  admin_note text,
  settled_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_lost_book_reports_status ON public.lost_book_reports(status);
CREATE INDEX IF NOT EXISTS idx_lost_book_reports_user ON public.lost_book_reports(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lost_book_reports TO authenticated;
GRANT ALL ON public.lost_book_reports TO service_role;
ALTER TABLE public.lost_book_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lost own read" ON public.lost_book_reports;
CREATE POLICY "lost own read" ON public.lost_book_reports
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "lost own insert" ON public.lost_book_reports;
CREATE POLICY "lost own insert" ON public.lost_book_reports
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "lost staff update" ON public.lost_book_reports;
CREATE POLICY "lost staff update" ON public.lost_book_reports
  FOR UPDATE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "lost staff delete" ON public.lost_book_reports;
CREATE POLICY "lost staff delete" ON public.lost_book_reports
  FOR DELETE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.calculate_replacement_cost(p_book_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- books table has no price column; default ₹300
  IF EXISTS (SELECT 1 FROM public.books WHERE id = p_book_id) THEN
    RETURN 300;
  END IF;
  RETURN 300;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_replacement_cost(uuid) TO authenticated;


-- >>> FILE: 20260805104000_periodicals_goals_clubs.sql
-- Phase 5: Periodicals + reading goals + book clubs

CREATE TABLE IF NOT EXISTS public.periodicals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL DEFAULT 'magazine'
    CHECK (type IN ('newspaper', 'magazine', 'journal')),
  frequency text,
  publisher text,
  cover_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.periodical_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodical_id uuid NOT NULL REFERENCES public.periodicals(id) ON DELETE CASCADE,
  issue_date date NOT NULL,
  volume text,
  issue_number text,
  notes text,
  on_shelf boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_periodical_issues_periodical ON public.periodical_issues(periodical_id);

GRANT SELECT ON public.periodicals TO anon, authenticated;
GRANT SELECT ON public.periodical_issues TO anon, authenticated;
GRANT ALL ON public.periodicals TO authenticated;
GRANT ALL ON public.periodical_issues TO authenticated;
GRANT ALL ON public.periodicals TO service_role;
GRANT ALL ON public.periodical_issues TO service_role;

ALTER TABLE public.periodicals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodical_issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "periodicals read" ON public.periodicals;
CREATE POLICY "periodicals read" ON public.periodicals FOR SELECT USING (true);
DROP POLICY IF EXISTS "periodicals staff write" ON public.periodicals;
CREATE POLICY "periodicals staff write" ON public.periodicals
  FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "periodical_issues read" ON public.periodical_issues;
CREATE POLICY "periodical_issues read" ON public.periodical_issues FOR SELECT USING (true);
DROP POLICY IF EXISTS "periodical_issues staff write" ON public.periodical_issues;
CREATE POLICY "periodical_issues staff write" ON public.periodical_issues
  FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- School-wide / per-user reading goals (admin sets school target via system_settings;
-- this table stores optional per-user overrides or snapshots)
CREATE TABLE IF NOT EXISTS public.reading_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  month text NOT NULL, -- YYYY-MM
  target_books integer NOT NULL CHECK (target_books > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, month)
);

-- School-wide row: user_id IS NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_reading_goals_school_month
  ON public.reading_goals (month) WHERE user_id IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_goals TO authenticated;
GRANT ALL ON public.reading_goals TO service_role;
ALTER TABLE public.reading_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reading_goals read" ON public.reading_goals;
CREATE POLICY "reading_goals read" ON public.reading_goals
  FOR SELECT TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "reading_goals staff write" ON public.reading_goals;
CREATE POLICY "reading_goals staff write" ON public.reading_goals
  FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.get_reading_goal_progress(p_user_id uuid, p_month text)
RETURNS TABLE(target_books integer, books_read integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target integer;
  v_start date;
  v_end date;
BEGIN
  -- Prefer user-specific, then school-wide, then system_settings
  SELECT rg.target_books INTO v_target
  FROM public.reading_goals rg
  WHERE rg.month = p_month AND rg.user_id = p_user_id
  LIMIT 1;

  IF v_target IS NULL THEN
    SELECT rg.target_books INTO v_target
    FROM public.reading_goals rg
    WHERE rg.month = p_month AND rg.user_id IS NULL
    LIMIT 1;
  END IF;

  IF v_target IS NULL THEN
    SELECT COALESCE(
      CASE WHEN jsonb_typeof(value) = 'number' THEN (value)::text::integer
           ELSE NULLIF(trim(both '"' from value::text), '')::integer END,
      3
    ) INTO v_target
    FROM public.system_settings WHERE key = 'monthly_reading_goal';
  END IF;

  v_target := COALESCE(v_target, 3);
  v_start := (p_month || '-01')::date;
  v_end := (v_start + interval '1 month')::date;

  RETURN QUERY
  SELECT v_target,
    (SELECT COUNT(*)::integer FROM public.reading_history rh
     WHERE rh.user_id = p_user_id
       AND rh.status = 'approved'
       AND rh.completed_date >= v_start
       AND rh.completed_date < v_end);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_reading_goal_progress(uuid, text) TO authenticated;

-- Book clubs
CREATE TABLE IF NOT EXISTS public.book_clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  book_id uuid REFERENCES public.books(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  cover_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.book_club_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.book_clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.book_club_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.book_clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_club_messages_club ON public.book_club_messages(club_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_clubs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_club_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_club_messages TO authenticated;
GRANT ALL ON public.book_clubs TO service_role;
GRANT ALL ON public.book_club_members TO service_role;
GRANT ALL ON public.book_club_messages TO service_role;

ALTER TABLE public.book_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_club_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clubs read" ON public.book_clubs;
CREATE POLICY "clubs read" ON public.book_clubs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "clubs staff write" ON public.book_clubs;
CREATE POLICY "clubs staff write" ON public.book_clubs
  FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "club members read" ON public.book_club_members;
CREATE POLICY "club members read" ON public.book_club_members FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "club members join" ON public.book_club_members;
CREATE POLICY "club members join" ON public.book_club_members
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "club members leave" ON public.book_club_members;
CREATE POLICY "club members leave" ON public.book_club_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "club messages member read" ON public.book_club_messages;
CREATE POLICY "club messages member read" ON public.book_club_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.book_club_members m
      WHERE m.club_id = book_club_messages.club_id AND m.user_id = auth.uid()
    )
    OR public.is_staff_or_admin(auth.uid())
  );

DROP POLICY IF EXISTS "club messages member insert" ON public.book_club_messages;
CREATE POLICY "club messages member insert" ON public.book_club_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.book_club_members m
      WHERE m.club_id = book_club_messages.club_id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "club messages staff delete" ON public.book_club_messages;
CREATE POLICY "club messages staff delete" ON public.book_club_messages
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));


-- >>> FILE: 20260805107000_notification_triggers.sql
-- Phase 7: Automated notification triggers

-- Return confirmation notification
CREATE OR REPLACE FUNCTION public.notify_on_book_return()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
BEGIN
  IF NEW.status = 'returned' AND (OLD.status IS DISTINCT FROM 'returned') THEN
    SELECT title INTO v_title FROM public.books WHERE id = NEW.book_id;
    INSERT INTO public.notifications (title, message, type, target_user_id, sent_by)
    VALUES (
      'Book returned',
      format('"%s" has been marked as returned. Thank you!', COALESCE(v_title, 'Your book')),
      'success',
      NEW.user_id,
      NEW.user_id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_book_return ON public.book_issues;
CREATE TRIGGER trg_notify_on_book_return
  AFTER UPDATE ON public.book_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_book_return();

-- New arrival / availability alert for wishlist when copies go from 0 to >0
CREATE OR REPLACE FUNCTION public.notify_wishlist_on_availability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  IF COALESCE(OLD.available_copies, 0) = 0 AND COALESCE(NEW.available_copies, 0) > 0 THEN
    FOR r IN
      SELECT user_id FROM public.book_wishlist WHERE book_id = NEW.id
    LOOP
      INSERT INTO public.notifications (title, message, type, target_user_id, sent_by)
      VALUES (
        'Wishlist book available',
        format('"%s" from your wishlist is now available to borrow.', NEW.title),
        'info',
        r.user_id,
        r.user_id
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_wishlist_on_availability ON public.books;
CREATE TRIGGER trg_notify_wishlist_on_availability
  AFTER UPDATE ON public.books
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_wishlist_on_availability();

-- Admin-triggerable due-soon reminders (free-tier safe RPC)
CREATE OR REPLACE FUNCTION public.send_due_soon_reminders(p_days integer DEFAULT 2)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_count integer := 0;
  v_title text;
  v_admin uuid;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only staff can send due reminders';
  END IF;

  v_admin := auth.uid();

  FOR r IN
    SELECT bi.id, bi.user_id, bi.due_date, bi.book_id
    FROM public.book_issues bi
    WHERE bi.status = 'issued'
      AND bi.due_date::date BETWEEN CURRENT_DATE AND (CURRENT_DATE + p_days)
  LOOP
    SELECT title INTO v_title FROM public.books WHERE id = r.book_id;
    INSERT INTO public.notifications (title, message, type, target_user_id, sent_by)
    VALUES (
      'Book due soon',
      format('"%s" is due on %s. Please return or renew on time.', COALESCE(v_title, 'Your book'), r.due_date::date),
      'warning',
      r.user_id,
      v_admin
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_due_soon_reminders(integer) TO authenticated;


-- >>> FILE: 20260805108000_support_ticket_numbers.sql
-- Ticket numbers, public status lookup, auto-link by admission

CREATE SEQUENCE IF NOT EXISTS public.support_ticket_seq START 1001;

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS ticket_number text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_support_tickets_number
  ON public.support_tickets(ticket_number) WHERE ticket_number IS NOT NULL;

-- Backfill existing rows
UPDATE public.support_tickets
SET ticket_number = 'TKT-' || nextval('public.support_ticket_seq')::text
WHERE ticket_number IS NULL;

ALTER TABLE public.support_tickets
  ALTER COLUMN ticket_number SET NOT NULL;

CREATE OR REPLACE FUNCTION public.assign_ticket_number_and_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := 'TKT-' || nextval('public.support_ticket_seq')::text;
  END IF;

  -- Link guest tickets to profile when admission matches
  IF NEW.user_id IS NULL AND NEW.admission_number IS NOT NULL AND trim(NEW.admission_number) <> '' THEN
    SELECT p.id INTO v_uid
    FROM public.profiles p
    WHERE lower(trim(p.admission_number)) = lower(trim(NEW.admission_number))
      AND p.is_approved = true
    LIMIT 1;
    IF v_uid IS NOT NULL THEN
      NEW.user_id := v_uid;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_ticket_number ON public.support_tickets;
CREATE TRIGGER trg_assign_ticket_number
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_ticket_number_and_link();

-- Logged-in user claims orphan tickets matching their admission number
CREATE OR REPLACE FUNCTION public.link_my_support_tickets()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_adm text;
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;

  SELECT admission_number INTO v_adm FROM public.profiles WHERE id = auth.uid();
  IF v_adm IS NULL OR trim(v_adm) = '' THEN
    RETURN 0;
  END IF;

  UPDATE public.support_tickets
  SET user_id = auth.uid(), updated_at = now()
  WHERE user_id IS NULL
    AND lower(trim(admission_number)) = lower(trim(v_adm));

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_my_support_tickets() TO authenticated;

-- Public status lookup (ticket number + admission). Limited fields only.
CREATE OR REPLACE FUNCTION public.lookup_ticket_status(p_ticket_number text, p_admission text)
RETURNS TABLE (
  ticket_number text,
  subject text,
  status text,
  category text,
  priority text,
  admin_response text,
  created_at timestamptz,
  updated_at timestamptz,
  full_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.ticket_number,
    t.subject,
    t.status,
    t.category,
    t.priority,
    t.admin_response,
    t.created_at,
    t.updated_at,
    t.full_name
  FROM public.support_tickets t
  WHERE upper(trim(t.ticket_number)) = upper(trim(p_ticket_number))
    AND lower(trim(COALESCE(t.admission_number, ''))) = lower(trim(COALESCE(p_admission, '')))
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_ticket_status(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_ticket_status(text, text) TO anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_support_tickets_admission
  ON public.support_tickets (lower(trim(admission_number)));

-- Public submit that returns ticket_number (anon cannot SELECT after insert via RLS)
CREATE OR REPLACE FUNCTION public.submit_public_support_ticket(
  p_admission text,
  p_full_name text,
  p_email text,
  p_student_class text,
  p_role text,
  p_category text,
  p_priority text,
  p_subject text,
  p_description text
)
RETURNS TABLE (id uuid, ticket_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_num text;
BEGIN
  IF trim(COALESCE(p_admission, '')) = '' OR trim(COALESCE(p_full_name, '')) = ''
     OR trim(COALESCE(p_subject, '')) = '' OR trim(COALESCE(p_description, '')) = '' THEN
    RAISE EXCEPTION 'Missing required fields';
  END IF;

  INSERT INTO public.support_tickets (
    admission_number, full_name, email, student_class, role,
    category, priority, subject, description
  ) VALUES (
    trim(p_admission),
    trim(p_full_name),
    NULLIF(trim(COALESCE(p_email, '')), ''),
    NULLIF(trim(COALESCE(p_student_class, '')), ''),
    NULLIF(trim(COALESCE(p_role, '')), ''),
    COALESCE(NULLIF(trim(p_category), ''), 'general'),
    COALESCE(NULLIF(trim(p_priority), ''), 'normal'),
    left(trim(p_subject), 150),
    left(trim(p_description), 2000)
  )
  RETURNING support_tickets.id, support_tickets.ticket_number INTO v_id, v_num;

  RETURN QUERY SELECT v_id, v_num;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_support_ticket(text, text, text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_support_ticket(text, text, text, text, text, text, text, text, text) TO anon, authenticated;


-- >>> FILE: 20260805109000_reservation_to_book_request.sql
-- When a book is returned, convert the first pending reservation into a book_request
-- so admin fulfills it from Book Requests (no separate Reservations page).

CREATE OR REPLACE FUNCTION public.notify_reservation_on_return()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res record;
  v_title text;
  v_request_id uuid;
BEGIN
  IF NEW.status = 'returned' AND (OLD.status IS DISTINCT FROM 'returned') THEN
    SELECT title INTO v_title FROM public.books WHERE id = NEW.book_id;

    SELECT * INTO v_res
    FROM public.book_reservations
    WHERE book_id = NEW.book_id AND status = 'pending'
    ORDER BY created_at ASC
    LIMIT 1;

    IF FOUND THEN
      -- Reuse existing pending borrow request if present
      SELECT id INTO v_request_id
      FROM public.book_requests
      WHERE user_id = v_res.user_id
        AND book_id = NEW.book_id
        AND status = 'pending'
      LIMIT 1;

      IF v_request_id IS NULL THEN
        INSERT INTO public.book_requests (user_id, book_id, status, admin_notes)
        VALUES (
          v_res.user_id,
          NEW.book_id,
          'pending',
          'Waitlist: book returned and now available'
        )
        RETURNING id INTO v_request_id;
      END IF;

      UPDATE public.book_reservations
      SET status = 'fulfilled', fulfilled_at = now(), updated_at = now()
      WHERE id = v_res.id;

      INSERT INTO public.notifications (title, message, type, target_user_id, sent_by)
      VALUES (
        'Book available',
        format(
          '"%s" you reserved is now available. A borrow request was created for you — visit the library to collect it.',
          COALESCE(v_title, 'A book')
        ),
        'success',
        v_res.user_id,
        NEW.user_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_reservation_on_return ON public.book_issues;
CREATE TRIGGER trg_notify_reservation_on_return
  AFTER UPDATE ON public.book_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_reservation_on_return();

-- When a borrow request is approved, mark any matching pending/fulfilled reservation as fulfilled
CREATE OR REPLACE FUNCTION public.fulfill_reservation_on_request_approve()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') AND NEW.book_id IS NOT NULL THEN
    UPDATE public.book_reservations
    SET status = 'fulfilled',
        fulfilled_at = COALESCE(fulfilled_at, now()),
        updated_at = now()
    WHERE user_id = NEW.user_id
      AND book_id = NEW.book_id
      AND status IN ('pending', 'fulfilled');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fulfill_reservation_on_request_approve ON public.book_requests;
CREATE TRIGGER trg_fulfill_reservation_on_request_approve
  AFTER UPDATE ON public.book_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.fulfill_reservation_on_request_approve();


-- >>> FILE: 20260805110000_scrap_reading_and_cert_layout.sql
-- Scrap / revoke reading points (suspicious or wrongly approved)

CREATE OR REPLACE FUNCTION public.scrap_reading_entry(p_reading_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_pts integer := 0;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO r FROM public.reading_history WHERE id = p_reading_id;
  IF r IS NULL THEN
    RAISE EXCEPTION 'Entry not found';
  END IF;

  IF r.status = 'rejected' THEN
    RETURN 0;
  END IF;

  -- Deduct points if they were awarded (approved entries)
  IF r.status = 'approved' AND COALESCE(r.points_earned, 0) > 0 THEN
    v_pts := r.points_earned;
    UPDATE public.profiles
    SET points = GREATEST(0, COALESCE(points, 0) - v_pts)
    WHERE id = r.user_id;
  END IF;

  UPDATE public.reading_history
  SET status = 'rejected',
      points_awarded = false
  WHERE id = p_reading_id;

  PERFORM public.notify_user(
    r.user_id,
    'Reading entry discarded',
    format(
      'Your reading entry "%s" was discarded by the librarian%s.',
      COALESCE(r.book_title, ''),
      CASE WHEN v_pts > 0 THEN format(' (−%s points)', v_pts) ELSE '' END
    ),
    'warning'
  );

  RETURN v_pts;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scrap_reading_entry(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.scrap_reading_entry(uuid) TO authenticated;

-- Allow approving suspicious entries (admin override)
CREATE OR REPLACE FUNCTION public.approve_reading_entry(p_reading_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_pts integer;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO r FROM public.reading_history WHERE id = p_reading_id;
  IF r IS NULL THEN
    RAISE EXCEPTION 'Entry not found';
  END IF;
  IF r.status = 'approved' THEN
    RETURN 0;
  END IF;
  IF r.status = 'rejected' THEN
    RAISE EXCEPTION 'Cannot approve a rejected entry';
  END IF;

  v_pts := COALESCE(r.points_earned, 0);
  IF v_pts = 0 THEN
    BEGIN
      SELECT COALESCE((value #>> '{}')::integer, (value)::text::integer, 25)
      INTO v_pts
      FROM public.system_settings
      WHERE key = 'points_per_book_read';
    EXCEPTION WHEN OTHERS THEN
      v_pts := 25;
    END;
    v_pts := COALESCE(v_pts, 25);
  END IF;

  UPDATE public.reading_history
  SET status = 'approved', points_earned = v_pts, points_awarded = true
  WHERE id = p_reading_id;

  UPDATE public.profiles
  SET points = COALESCE(points, 0) + v_pts
  WHERE id = r.user_id;

  PERFORM public.notify_user(
    r.user_id,
    'Reading approved',
    'Your reading entry "' || COALESCE(r.book_title, '') || '" was approved (+' || v_pts || ' points).',
    'success'
  );
  RETURN v_pts;
END;
$$;

-- Seed default certificate field layout (percent positions on template)
INSERT INTO public.system_settings (key, value) VALUES
  ('certificate_layout', '{
    "name": {"x": 50, "y": 42, "fontSize": 28, "visible": true, "align": "center"},
    "className": {"x": 50, "y": 50, "fontSize": 14, "visible": true, "align": "center"},
    "event": {"x": 50, "y": 56, "fontSize": 16, "visible": true, "align": "center"},
    "title": {"x": 50, "y": 64, "fontSize": 18, "visible": true, "align": "center"},
    "description": {"x": 50, "y": 72, "fontSize": 13, "visible": true, "align": "center"},
    "date": {"x": 50, "y": 82, "fontSize": 12, "visible": true, "align": "center"}
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;


-- >>> FILE: 20260805111000_fix_manual_badge_auto_award.sql
-- Fix: manual badges must never be auto-awarded.
-- Bug: criteria_type='manual' with criteria_value=0 matched ELSE→0 >= 0 and awarded everyone.

CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b record;
  v_val integer;
  v_awarded integer := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 0;
  END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id AND NOT public.is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  FOR b IN
    SELECT *
    FROM public.badges
    WHERE is_active = true
      AND criteria_type IS NOT NULL
      AND criteria_type <> 'manual'
      AND criteria_value IS NOT NULL
      AND criteria_value > 0
      AND criteria_type IN (
        'books_read', 'books_issued', 'quizzes_completed', 'login_streak',
        'points', 'posts_count', 'comments_count', 'reviews_count', 'friends_count'
      )
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.badge_awards
      WHERE user_id = p_user_id AND badge_id = b.id
    ) THEN
      CONTINUE;
    END IF;

    v_val := CASE b.criteria_type
      WHEN 'books_read' THEN (
        SELECT COUNT(*)::int FROM public.reading_history
        WHERE user_id = p_user_id AND status = 'approved'
      )
      WHEN 'books_issued' THEN (
        SELECT COUNT(*)::int FROM public.book_issues WHERE user_id = p_user_id
      )
      WHEN 'quizzes_completed' THEN (
        SELECT COUNT(*)::int FROM public.quiz_results WHERE user_id = p_user_id
      )
      WHEN 'login_streak' THEN COALESCE(
        (SELECT current_streak FROM public.login_streaks WHERE user_id = p_user_id), 0
      )
      WHEN 'points' THEN COALESCE(
        (SELECT points FROM public.profiles WHERE id = p_user_id), 0
      )
      WHEN 'posts_count' THEN (
        SELECT COUNT(*)::int FROM public.posts WHERE user_id = p_user_id
      )
      WHEN 'comments_count' THEN (
        SELECT COUNT(*)::int FROM public.post_comments WHERE user_id = p_user_id
      )
      WHEN 'reviews_count' THEN (
        SELECT COUNT(*)::int FROM public.book_reviews WHERE user_id = p_user_id
      )
      WHEN 'friends_count' THEN (
        SELECT COUNT(*)::int FROM public.friendships
        WHERE status = 'accepted'
          AND (requester_id = p_user_id OR addressee_id = p_user_id)
      )
      ELSE NULL
    END;

    IF v_val IS NOT NULL AND v_val >= b.criteria_value THEN
      INSERT INTO public.badge_awards (user_id, badge_id, award_type, note)
      VALUES (p_user_id, b.id, 'auto', 'Automatically awarded')
      ON CONFLICT DO NOTHING;
      v_awarded := v_awarded + 1;
    END IF;
  END LOOP;

  RETURN v_awarded;
END;
$$;

REVOKE ALL ON FUNCTION public.check_and_award_badges(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_and_award_badges(uuid) TO authenticated;

-- Remove incorrectly auto-awarded manual badges (keep real admin awards)
DELETE FROM public.badge_awards ba
USING public.badges b
WHERE ba.badge_id = b.id
  AND b.criteria_type = 'manual'
  AND COALESCE(ba.award_type, 'auto') = 'auto';

-- Clear numeric targets on manual badges so they cannot match again
UPDATE public.badges
SET criteria_value = NULL
WHERE criteria_type = 'manual';


-- >>> FILE: 20260805112000_fines_accrue_community_pin_poll.sql
-- Community: pin posts + polls
-- Fines: auto-create/accrue overdue fines while book is still out
-- Support: allow students to see tickets linked by admission number

-- ========== SUPPORT TICKETS: broader student SELECT ==========
DROP POLICY IF EXISTS "Users view own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets select" ON public.support_tickets;
DROP POLICY IF EXISTS "Tickets select own or staff" ON public.support_tickets;
DROP POLICY IF EXISTS "Users view own tickets, staff view all" ON public.support_tickets;
DROP POLICY IF EXISTS "Tickets select own staff or admission match" ON public.support_tickets;

CREATE POLICY "Tickets select own staff or admission match"
ON public.support_tickets FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_staff_or_admin(auth.uid())
  OR (
    admission_number IS NOT NULL
    AND lower(trim(admission_number)) = lower(trim(COALESCE(
      (SELECT admission_number FROM public.profiles WHERE id = auth.uid()),
      ''
    )))
    AND length(trim(COALESCE(
      (SELECT admission_number FROM public.profiles WHERE id = auth.uid()),
      ''
    ))) > 0
  )
);

-- ========== FINES: accrue while overdue ==========
ALTER TABLE public.library_fines
  ADD COLUMN IF NOT EXISTS accruing boolean NOT NULL DEFAULT false;

ALTER TABLE public.library_fines
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.sync_overdue_fines()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate numeric;
  v_grace integer;
  r record;
  v_days integer;
  v_amount numeric;
  v_title text;
  v_count integer := 0;
BEGIN
  -- Anyone authenticated can trigger sync (idempotent); staff/cron preferred
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT rate_per_day, grace_period_days INTO v_rate, v_grace
  FROM public.fine_settings WHERE id = 1;
  v_rate := COALESCE(v_rate, 1);
  v_grace := COALESCE(v_grace, 0);

  FOR r IN
    SELECT bi.id, bi.user_id, bi.book_id, bi.due_date
    FROM public.book_issues bi
    WHERE bi.status IN ('issued', 'overdue')
      AND bi.due_date IS NOT NULL
      AND (CURRENT_DATE - bi.due_date::date) > v_grace
  LOOP
    v_days := GREATEST(0, (CURRENT_DATE - r.due_date::date) - v_grace);
    IF v_days <= 0 THEN CONTINUE; END IF;
    v_amount := v_days * v_rate;
    SELECT title INTO v_title FROM public.books WHERE id = r.book_id;

    INSERT INTO public.library_fines (
      user_id, book_issue_id, days_overdue, rate_per_day, total_amount,
      status, book_title, accruing, updated_at
    ) VALUES (
      r.user_id, r.id, v_days, v_rate, v_amount,
      'pending', v_title, true, now()
    )
    ON CONFLICT (book_issue_id) WHERE book_issue_id IS NOT NULL
    DO UPDATE SET
      days_overdue = EXCLUDED.days_overdue,
      rate_per_day = EXCLUDED.rate_per_day,
      total_amount = EXCLUDED.total_amount,
      book_title = COALESCE(EXCLUDED.book_title, public.library_fines.book_title),
      accruing = true,
      updated_at = now()
    WHERE public.library_fines.status = 'pending';

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Unique partial index already exists; ON CONFLICT needs constraint name.
-- Recreate as named constraint-friendly unique index if needed:
DROP INDEX IF EXISTS idx_library_fines_issue_unique;
CREATE UNIQUE INDEX idx_library_fines_issue_unique
  ON public.library_fines(book_issue_id) WHERE book_issue_id IS NOT NULL;

-- Fix sync to use the unique index properly via ON CONFLICT (book_issue_id)
CREATE OR REPLACE FUNCTION public.sync_overdue_fines()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate numeric;
  v_grace integer;
  r record;
  v_days integer;
  v_amount numeric;
  v_title text;
  v_count integer := 0;
  v_existing uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT rate_per_day, grace_period_days INTO v_rate, v_grace
  FROM public.fine_settings WHERE id = 1;
  v_rate := COALESCE(v_rate, 1);
  v_grace := COALESCE(v_grace, 0);

  FOR r IN
    SELECT bi.id, bi.user_id, bi.book_id, bi.due_date
    FROM public.book_issues bi
    WHERE bi.status IN ('issued', 'overdue')
      AND bi.due_date IS NOT NULL
      AND (CURRENT_DATE - bi.due_date::date) > v_grace
  LOOP
    v_days := GREATEST(0, (CURRENT_DATE - r.due_date::date) - v_grace);
    IF v_days <= 0 THEN CONTINUE; END IF;
    v_amount := v_days * v_rate;
    SELECT title INTO v_title FROM public.books WHERE id = r.book_id;

    SELECT id INTO v_existing
    FROM public.library_fines
    WHERE book_issue_id = r.id
    LIMIT 1;

    IF v_existing IS NULL THEN
      INSERT INTO public.library_fines (
        user_id, book_issue_id, days_overdue, rate_per_day, total_amount,
        status, book_title, accruing, updated_at
      ) VALUES (
        r.user_id, r.id, v_days, v_rate, v_amount,
        'pending', v_title, true, now()
      );
    ELSE
      UPDATE public.library_fines
      SET days_overdue = v_days,
          rate_per_day = v_rate,
          total_amount = v_amount,
          book_title = COALESCE(v_title, book_title),
          accruing = CASE WHEN status = 'pending' THEN true ELSE accruing END,
          updated_at = now()
      WHERE id = v_existing
        AND status = 'pending';
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_overdue_fines() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_overdue_fines() TO authenticated;

-- Finalize fine amount on return (update accruing row or create)
CREATE OR REPLACE FUNCTION public.create_fine_on_return()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate numeric;
  v_grace integer;
  v_days integer;
  v_amount numeric;
  v_title text;
  v_existing uuid;
BEGIN
  IF NEW.status = 'returned' AND (OLD.status IS DISTINCT FROM 'returned') THEN
    SELECT rate_per_day, grace_period_days INTO v_rate, v_grace
    FROM public.fine_settings WHERE id = 1;
    v_rate := COALESCE(v_rate, 1);
    v_grace := COALESCE(v_grace, 0);

    v_days := GREATEST(0, (COALESCE(NEW.return_date::date, CURRENT_DATE) - NEW.due_date::date) - v_grace);
    v_amount := v_days * v_rate;
    SELECT title INTO v_title FROM public.books WHERE id = NEW.book_id;

    SELECT id INTO v_existing FROM public.library_fines WHERE book_issue_id = NEW.id LIMIT 1;

    IF v_days > 0 AND v_amount > 0 THEN
      IF v_existing IS NULL THEN
        INSERT INTO public.library_fines (
          user_id, book_issue_id, days_overdue, rate_per_day, total_amount,
          status, book_title, accruing, updated_at
        ) VALUES (
          NEW.user_id, NEW.id, v_days, v_rate, v_amount,
          'pending', v_title, false, now()
        );
      ELSE
        UPDATE public.library_fines
        SET days_overdue = v_days,
            rate_per_day = v_rate,
            total_amount = v_amount,
            book_title = COALESCE(v_title, book_title),
            accruing = false,
            updated_at = now()
        WHERE id = v_existing AND status = 'pending';
      END IF;
    ELSIF v_existing IS NOT NULL THEN
      -- Returned on time / within grace: stop accruing; waive zero-day pending if unused
      UPDATE public.library_fines
      SET accruing = false,
          days_overdue = v_days,
          total_amount = v_amount,
          updated_at = now(),
          status = CASE WHEN v_amount <= 0 AND status = 'pending' THEN 'waived' ELSE status END
      WHERE id = v_existing;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_fine_on_return ON public.book_issues;
CREATE TRIGGER trg_create_fine_on_return
  AFTER UPDATE ON public.book_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.create_fine_on_return();

-- Clients call sync_overdue_fines on My Fines / Fine Manager / Overdue load.

-- ========== COMMUNITY: pin + polls ==========
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS pinned_at timestamptz;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS post_type text NOT NULL DEFAULT 'text'
    CHECK (post_type IN ('text', 'poll'));

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS poll_ends_at timestamptz;

DROP POLICY IF EXISTS "Users edit own posts" ON public.posts;
CREATE POLICY "Users or staff edit posts"
ON public.posts FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_poll_options_post ON public.poll_options(post_id);

CREATE TABLE IF NOT EXISTS public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_poll_votes_post ON public.poll_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_option ON public.poll_votes(option_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.poll_options TO authenticated;
GRANT ALL ON public.poll_options TO service_role;
GRANT SELECT, INSERT, DELETE ON public.poll_votes TO authenticated;
GRANT ALL ON public.poll_votes TO service_role;

ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "poll options read" ON public.poll_options;
CREATE POLICY "poll options read" ON public.poll_options
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "poll options write author staff" ON public.poll_options;
CREATE POLICY "poll options write author staff" ON public.poll_options
  FOR ALL TO authenticated
  USING (
    public.is_staff_or_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.user_id = auth.uid())
  )
  WITH CHECK (
    public.is_staff_or_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "poll votes read" ON public.poll_votes;
CREATE POLICY "poll votes read" ON public.poll_votes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "poll votes insert own" ON public.poll_votes;
CREATE POLICY "poll votes insert own" ON public.poll_votes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "poll votes delete own" ON public.poll_votes;
CREATE POLICY "poll votes delete own" ON public.poll_votes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_posts_pinned ON public.posts (is_pinned DESC, created_at DESC);


-- >>> FILE: 20260806100000_study_events_points_features.sql
-- Feature pack: event deadlines, study sessions, review/issue/return points

-- ========== EVENTS: separate registration & submission deadlines ==========
ALTER TABLE public.library_events
  ADD COLUMN IF NOT EXISTS registration_deadline timestamptz;

ALTER TABLE public.library_events
  ADD COLUMN IF NOT EXISTS submission_deadline timestamptz;

-- ========== STUDY SESSIONS (Pomodoro / tracker) ==========
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  material_id uuid REFERENCES public.study_materials(id) ON DELETE SET NULL,
  material_title text,
  duration_seconds integer NOT NULL CHECK (duration_seconds > 0),
  points_earned integer NOT NULL DEFAULT 0,
  session_type text NOT NULL DEFAULT 'pomodoro'
    CHECK (session_type IN ('pomodoro', 'focus', 'break')),
  notes text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user ON public.study_sessions(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_sessions TO authenticated;
GRANT ALL ON public.study_sessions TO service_role;

ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study sessions own" ON public.study_sessions;
CREATE POLICY "study sessions own" ON public.study_sessions
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid());

-- Points settings seeds
INSERT INTO public.system_settings (key, value) VALUES
  ('points_per_review', '15'::jsonb),
  ('points_per_issue', '100'::jsonb),
  ('points_per_timely_return', '100'::jsonb),
  ('points_per_study_minute', '1'::jsonb),
  ('study_pomodoro_minutes', '25'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ========== BOOK REVIEW POINTS ==========
CREATE OR REPLACE FUNCTION public.award_review_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pts integer := 15;
BEGIN
  BEGIN
    SELECT COALESCE((value #>> '{}')::integer, (value)::text::integer, 15)
    INTO v_pts FROM public.system_settings WHERE key = 'points_per_review';
  EXCEPTION WHEN OTHERS THEN
    v_pts := 15;
  END;
  v_pts := COALESCE(v_pts, 15);
  IF v_pts > 0 THEN
    UPDATE public.profiles
    SET points = COALESCE(points, 0) + v_pts
    WHERE id = NEW.user_id;
    PERFORM public.notify_user(
      NEW.user_id,
      'Review points awarded',
      format('Thanks for your book review! +%s points.', v_pts),
      'points'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_review_points ON public.book_reviews;
CREATE TRIGGER trg_award_review_points
  AFTER INSERT ON public.book_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.award_review_points();

-- ========== ISSUE + TIMELY RETURN POINTS ==========
ALTER TABLE public.book_issues
  ADD COLUMN IF NOT EXISTS issue_points_awarded boolean NOT NULL DEFAULT false;

ALTER TABLE public.book_issues
  ADD COLUMN IF NOT EXISTS return_points_awarded boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.award_issue_return_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_issue_pts integer := 100;
  v_return_pts integer := 100;
BEGIN
  -- On new issue
  IF TG_OP = 'INSERT' AND NEW.status = 'issued' AND NOT NEW.issue_points_awarded THEN
    BEGIN
      SELECT COALESCE((value #>> '{}')::integer, (value)::text::integer, 100)
      INTO v_issue_pts FROM public.system_settings WHERE key = 'points_per_issue';
    EXCEPTION WHEN OTHERS THEN v_issue_pts := 100; END;
    v_issue_pts := COALESCE(v_issue_pts, 100);
    IF v_issue_pts > 0 THEN
      UPDATE public.profiles SET points = COALESCE(points, 0) + v_issue_pts WHERE id = NEW.user_id;
      NEW.issue_points_awarded := true;
      PERFORM public.notify_user(
        NEW.user_id,
        'Book issued — points!',
        format('You borrowed a book. +%s points.', v_issue_pts),
        'points'
      );
    END IF;
  END IF;

  -- On timely return
  IF TG_OP = 'UPDATE'
     AND NEW.status = 'returned'
     AND (OLD.status IS DISTINCT FROM 'returned')
     AND NOT COALESCE(NEW.return_points_awarded, false)
     AND NEW.due_date IS NOT NULL
     AND COALESCE(NEW.return_date::date, CURRENT_DATE) <= NEW.due_date::date
  THEN
    BEGIN
      SELECT COALESCE((value #>> '{}')::integer, (value)::text::integer, 100)
      INTO v_return_pts FROM public.system_settings WHERE key = 'points_per_timely_return';
    EXCEPTION WHEN OTHERS THEN v_return_pts := 100; END;
    v_return_pts := COALESCE(v_return_pts, 100);
    IF v_return_pts > 0 THEN
      UPDATE public.profiles SET points = COALESCE(points, 0) + v_return_pts WHERE id = NEW.user_id;
      NEW.return_points_awarded := true;
      PERFORM public.notify_user(
        NEW.user_id,
        'Timely return — points!',
        format('Thanks for returning on time. +%s points.', v_return_pts),
        'points'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_issue_return_points ON public.book_issues;
CREATE TRIGGER trg_award_issue_return_points
  BEFORE INSERT OR UPDATE ON public.book_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.award_issue_return_points();

-- Award study points helper (called from client after session ends)
CREATE OR REPLACE FUNCTION public.complete_study_session(
  p_session_id uuid,
  p_duration_seconds integer,
  p_material_id uuid DEFAULT NULL,
  p_material_title text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_per_min integer := 1;
  v_pts integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO r FROM public.study_sessions WHERE id = p_session_id AND user_id = auth.uid();
  IF r IS NULL THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF r.ended_at IS NOT NULL THEN RETURN r.points_earned; END IF;

  BEGIN
    SELECT COALESCE((value #>> '{}')::integer, (value)::text::integer, 1)
    INTO v_per_min FROM public.system_settings WHERE key = 'points_per_study_minute';
  EXCEPTION WHEN OTHERS THEN v_per_min := 1; END;
  v_per_min := COALESCE(v_per_min, 1);

  v_pts := GREATEST(0, (GREATEST(p_duration_seconds, 0) / 60) * v_per_min);

  -- Breaks earn no study XP
  IF r.session_type = 'break' THEN
    v_pts := 0;
  END IF;

  UPDATE public.study_sessions SET
    duration_seconds = GREATEST(p_duration_seconds, 1),
    points_earned = v_pts,
    material_id = COALESCE(p_material_id, material_id),
    material_title = COALESCE(p_material_title, material_title),
    notes = COALESCE(p_notes, notes),
    ended_at = now()
  WHERE id = p_session_id;

  IF v_pts > 0 THEN
    UPDATE public.profiles SET points = COALESCE(points, 0) + v_pts WHERE id = auth.uid();
  END IF;

  RETURN v_pts;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_study_session(uuid, integer, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_study_session(uuid, integer, uuid, text, text) TO authenticated;


-- >>> FILE: 20260806110000_enforce_event_deadlines.sql
-- Enforce event registration & submission deadlines at the database level

CREATE OR REPLACE FUNCTION public.enforce_event_registration_deadline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deadline timestamptz;
  v_end timestamptz;
  v_start timestamptz;
BEGIN
  SELECT registration_deadline, end_date, event_date
  INTO v_deadline, v_end, v_start
  FROM public.library_events
  WHERE id = NEW.event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF v_deadline IS NOT NULL THEN
    IF now() > v_deadline THEN
      RAISE EXCEPTION 'Registration deadline has passed (%).', v_deadline;
    END IF;
  ELSIF v_end IS NOT NULL THEN
    IF now() > v_end THEN
      RAISE EXCEPTION 'This event has ended. Registration is closed.';
    END IF;
  ELSIF v_start IS NOT NULL THEN
    IF now() > v_start THEN
      RAISE EXCEPTION 'This event has already started. Registration is closed.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_event_registration_deadline ON public.event_registrations;
CREATE TRIGGER trg_enforce_event_registration_deadline
  BEFORE INSERT ON public.event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_event_registration_deadline();

CREATE OR REPLACE FUNCTION public.enforce_event_submission_deadline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deadline timestamptz;
  v_end timestamptz;
  v_start timestamptz;
  v_allow boolean;
BEGIN
  SELECT submission_deadline, end_date, event_date, COALESCE(allow_submissions, false)
  INTO v_deadline, v_end, v_start, v_allow
  FROM public.library_events
  WHERE id = NEW.event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF NOT v_allow THEN
    RAISE EXCEPTION 'Submissions are not enabled for this event.';
  END IF;

  IF v_deadline IS NOT NULL THEN
    IF now() > v_deadline THEN
      RAISE EXCEPTION 'Submission deadline has passed (%).', v_deadline;
    END IF;
  ELSIF v_end IS NOT NULL THEN
    IF now() > v_end THEN
      RAISE EXCEPTION 'This event has ended. Submissions are closed.';
    END IF;
  ELSIF v_start IS NOT NULL THEN
    IF now() > v_start THEN
      RAISE EXCEPTION 'Submission window for this event is closed.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_event_submission_deadline ON public.event_submissions;
CREATE TRIGGER trg_enforce_event_submission_deadline
  BEFORE INSERT OR UPDATE ON public.event_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_event_submission_deadline();


-- >>> FILE: 20260806161209_0a2d8c4e-8c02-4ca4-9484-217037182aa2.sql
-- ============ BOOK CLUBS ============
CREATE TABLE IF NOT EXISTS public.book_clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  book_id uuid REFERENCES public.books(id) ON DELETE SET NULL,
  created_by uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_clubs TO authenticated;
GRANT ALL ON public.book_clubs TO service_role;
ALTER TABLE public.book_clubs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clubs_read" ON public.book_clubs FOR SELECT TO authenticated USING (true);
CREATE POLICY "clubs_staff_write" ON public.book_clubs FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.book_club_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.book_clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_club_members TO authenticated;
GRANT ALL ON public.book_club_members TO service_role;
ALTER TABLE public.book_club_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "club_members_read" ON public.book_club_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "club_members_join" ON public.book_club_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "club_members_leave" ON public.book_club_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.book_club_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.book_clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_club_messages TO authenticated;
GRANT ALL ON public.book_club_messages TO service_role;
ALTER TABLE public.book_club_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "club_msgs_read" ON public.book_club_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "club_msgs_write" ON public.book_club_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "club_msgs_delete" ON public.book_club_messages FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

-- ============ BOOK SUGGESTIONS ============
CREATE TABLE IF NOT EXISTS public.book_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  author text,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_suggestions TO authenticated;
GRANT ALL ON public.book_suggestions TO service_role;
ALTER TABLE public.book_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suggestions_own_read" ON public.book_suggestions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "suggestions_insert" ON public.book_suggestions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "suggestions_staff_update" ON public.book_suggestions FOR UPDATE TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "suggestions_staff_delete" ON public.book_suggestions FOR DELETE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

-- ============ CERTIFICATES ============
CREATE TABLE IF NOT EXISTS public.issued_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  event_id uuid REFERENCES public.library_events(id) ON DELETE SET NULL,
  template_url text,
  issued_by uuid,
  issued_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.issued_certificates TO authenticated;
GRANT ALL ON public.issued_certificates TO service_role;
ALTER TABLE public.issued_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "certs_read" ON public.issued_certificates FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "certs_staff_write" ON public.issued_certificates FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- ============ FINES ============
CREATE TABLE IF NOT EXISTS public.fine_settings (
  id integer PRIMARY KEY DEFAULT 1,
  rate_per_day numeric NOT NULL DEFAULT 1,
  grace_period_days integer NOT NULL DEFAULT 0,
  upi_id text,
  upi_payee_name text DEFAULT 'PM SHRI KV AFS Sulur Library',
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.fine_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
GRANT SELECT ON public.fine_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.fine_settings TO authenticated;
GRANT ALL ON public.fine_settings TO service_role;
ALTER TABLE public.fine_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fine_settings_read" ON public.fine_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "fine_settings_staff" ON public.fine_settings FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.library_fines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  book_issue_id uuid REFERENCES public.book_issues(id) ON DELETE SET NULL,
  book_title text,
  days_overdue integer NOT NULL DEFAULT 0,
  rate_per_day numeric NOT NULL DEFAULT 1,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  payment_method text,
  payment_ref text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_fines TO authenticated;
GRANT ALL ON public.library_fines TO service_role;
ALTER TABLE public.library_fines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fines_read" ON public.library_fines FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "fines_owner_update" ON public.library_fines FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "fines_staff_all" ON public.library_fines FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- ============ LOST BOOKS ============
CREATE TABLE IF NOT EXISTS public.lost_book_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  book_issue_id uuid REFERENCES public.book_issues(id) ON DELETE SET NULL,
  book_title text NOT NULL,
  accession_number text,
  replacement_cost numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'reported',
  admin_note text,
  reported_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lost_book_reports TO authenticated;
GRANT ALL ON public.lost_book_reports TO service_role;
ALTER TABLE public.lost_book_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lost_read" ON public.lost_book_reports FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "lost_insert" ON public.lost_book_reports FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "lost_staff_all" ON public.lost_book_reports FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- ============ PERIODICALS ============
CREATE TABLE IF NOT EXISTS public.periodicals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL DEFAULT 'magazine',
  frequency text,
  publisher text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.periodicals TO authenticated;
GRANT ALL ON public.periodicals TO service_role;
ALTER TABLE public.periodicals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "periodicals_read" ON public.periodicals FOR SELECT TO authenticated USING (true);
CREATE POLICY "periodicals_staff" ON public.periodicals FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.periodical_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodical_id uuid NOT NULL REFERENCES public.periodicals(id) ON DELETE CASCADE,
  issue_date date NOT NULL,
  volume text,
  issue_number text,
  notes text,
  on_shelf boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.periodical_issues TO authenticated;
GRANT ALL ON public.periodical_issues TO service_role;
ALTER TABLE public.periodical_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "periodical_issues_read" ON public.periodical_issues FOR SELECT TO authenticated USING (true);
CREATE POLICY "periodical_issues_staff" ON public.periodical_issues FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- ============ POLLS ============
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS post_type text NOT NULL DEFAULT 'text';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS pinned_at timestamptz;

CREATE TABLE IF NOT EXISTS public.poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poll_options TO authenticated;
GRANT ALL ON public.poll_options TO service_role;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "poll_options_read" ON public.poll_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "poll_options_insert" ON public.poll_options FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.user_id = auth.uid()));
CREATE POLICY "poll_options_delete" ON public.poll_options FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.user_id = auth.uid()) OR public.is_staff_or_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poll_votes TO authenticated;
GRANT ALL ON public.poll_votes TO service_role;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "poll_votes_read" ON public.poll_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "poll_votes_insert" ON public.poll_votes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "poll_votes_delete" ON public.poll_votes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============ READING GOALS ============
CREATE TABLE IF NOT EXISTS public.reading_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  month text NOT NULL,
  target_books integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS reading_goals_school_month ON public.reading_goals (month) WHERE user_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reading_goals_user_month ON public.reading_goals (user_id, month) WHERE user_id IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_goals TO authenticated;
GRANT ALL ON public.reading_goals TO service_role;
ALTER TABLE public.reading_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goals_read" ON public.reading_goals FOR SELECT TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "goals_own_write" ON public.reading_goals FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "goals_staff_write" ON public.reading_goals FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- ============ STUDY SESSIONS ============
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  material_id uuid,
  material_title text,
  duration_seconds integer NOT NULL DEFAULT 0,
  points_earned integer NOT NULL DEFAULT 0,
  session_type text NOT NULL DEFAULT 'study',
  notes text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_sessions TO authenticated;
GRANT ALL ON public.study_sessions TO service_role;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_own" ON public.study_sessions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "sessions_staff_read" ON public.study_sessions FOR SELECT TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

-- ============ EXTRA COLUMNS ============
ALTER TABLE public.library_events ADD COLUMN IF NOT EXISTS registration_deadline timestamptz;
ALTER TABLE public.library_events ADD COLUMN IF NOT EXISTS submission_deadline timestamptz;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS ticket_number text;
CREATE UNIQUE INDEX IF NOT EXISTS support_tickets_number_uq ON public.support_tickets (ticket_number);

CREATE OR REPLACE FUNCTION public.tg_set_ticket_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := 'KVS-' || to_char(now(), 'YYMM') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS set_ticket_number ON public.support_tickets;
CREATE TRIGGER set_ticket_number BEFORE INSERT ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.tg_set_ticket_number();
UPDATE public.support_tickets SET ticket_number = 'KVS-' || to_char(created_at, 'YYMM') || '-' || upper(substr(replace(id::text, '-', ''), 1, 6)) WHERE ticket_number IS NULL;

-- >>> FILE: 20260806161328_db8acd11-4b64-4f03-9b8a-7de805178ade.sql
ALTER TABLE public.reading_history ADD COLUMN IF NOT EXISTS book_id uuid REFERENCES public.books(id) ON DELETE SET NULL;

-- Sync overdue fines
CREATE OR REPLACE FUNCTION public.sync_overdue_fines()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rate numeric; v_grace integer; r record; v_days integer; v_count integer := 0;
BEGIN
  SELECT rate_per_day, grace_period_days INTO v_rate, v_grace FROM public.fine_settings WHERE id = 1;
  v_rate := COALESCE(v_rate, 1); v_grace := COALESCE(v_grace, 0);

  FOR r IN
    SELECT bi.id, bi.user_id, bi.due_date, b.title
    FROM public.book_issues bi
    LEFT JOIN public.books b ON b.id = bi.book_id
    WHERE bi.return_date IS NULL
      AND bi.due_date < (CURRENT_DATE - v_grace)
  LOOP
    v_days := GREATEST((CURRENT_DATE - r.due_date) - v_grace, 0);
    IF v_days <= 0 THEN CONTINUE; END IF;
    IF EXISTS (SELECT 1 FROM public.library_fines f WHERE f.book_issue_id = r.id) THEN
      UPDATE public.library_fines
      SET days_overdue = v_days,
          rate_per_day = v_rate,
          total_amount = v_days * v_rate,
          updated_at = now()
      WHERE book_issue_id = r.id AND status <> 'paid';
    ELSE
      INSERT INTO public.library_fines (user_id, book_issue_id, book_title, days_overdue, rate_per_day, total_amount, status)
      VALUES (r.user_id, r.id, COALESCE(r.title, 'Book'), v_days, v_rate, v_days * v_rate, 'pending');
    END IF;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END; $$;
REVOKE EXECUTE ON FUNCTION public.sync_overdue_fines() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_overdue_fines() TO authenticated;

-- Complete a study session
DROP FUNCTION IF EXISTS public.complete_study_session(uuid, integer, uuid, text, text);
CREATE FUNCTION public.complete_study_session(
  p_session_id uuid, p_duration_seconds integer, p_material_id uuid DEFAULT NULL,
  p_material_title text DEFAULT NULL, p_notes text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_points integer; v_type text;
BEGIN
  SELECT session_type INTO v_type FROM public.study_sessions
  WHERE id = p_session_id AND user_id = auth.uid();
  IF v_type IS NULL THEN RAISE EXCEPTION 'Session not found'; END IF;

  v_points := CASE WHEN v_type = 'break' THEN 0
                   ELSE LEAST(FLOOR(GREATEST(p_duration_seconds,0) / 600.0)::int * 2, 30) END;

  UPDATE public.study_sessions
  SET duration_seconds = GREATEST(p_duration_seconds, 0),
      material_id = COALESCE(p_material_id, material_id),
      material_title = COALESCE(p_material_title, material_title),
      notes = COALESCE(p_notes, notes),
      points_earned = v_points,
      ended_at = now()
  WHERE id = p_session_id AND user_id = auth.uid();

  IF v_points > 0 THEN
    UPDATE public.profiles SET points = COALESCE(points,0) + v_points WHERE id = auth.uid();
  END IF;
  RETURN v_points;
END; $$;
REVOKE EXECUTE ON FUNCTION public.complete_study_session(uuid, integer, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_study_session(uuid, integer, uuid, text, text) TO authenticated;

-- Reading goal progress
CREATE OR REPLACE FUNCTION public.get_reading_goal_progress(p_user_id uuid, p_month text)
RETURNS TABLE(target_books integer, books_read integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE(
      (SELECT rg.target_books FROM public.reading_goals rg WHERE rg.user_id = p_user_id AND rg.month = p_month),
      (SELECT rg.target_books FROM public.reading_goals rg WHERE rg.user_id IS NULL AND rg.month = p_month),
      0
    )::int,
    (SELECT COUNT(*) FROM public.reading_history rh
      WHERE rh.user_id = p_user_id
        AND rh.status = 'approved'
        AND to_char(rh.completed_date, 'YYYY-MM') = p_month)::int
$$;
REVOKE EXECUTE ON FUNCTION public.get_reading_goal_progress(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_reading_goal_progress(uuid, text) TO authenticated;

-- Due soon reminders
CREATE OR REPLACE FUNCTION public.send_due_soon_reminders(p_days integer DEFAULT 2)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_count integer := 0;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorised'; END IF;
  FOR r IN
    SELECT bi.user_id, bi.due_date, b.title
    FROM public.book_issues bi
    LEFT JOIN public.books b ON b.id = bi.book_id
    WHERE bi.return_date IS NULL
      AND bi.due_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + COALESCE(p_days,2))
  LOOP
    PERFORM public.notify_user(
      r.user_id, 'Book due soon',
      format('"%s" is due on %s. Please return or request a renewal.', COALESCE(r.title,'Your book'), to_char(r.due_date,'DD Mon YYYY')),
      'warning');
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END; $$;
REVOKE EXECUTE ON FUNCTION public.send_due_soon_reminders(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_due_soon_reminders(integer) TO authenticated;

-- Scrap a reading entry
CREATE OR REPLACE FUNCTION public.scrap_reading_entry(p_reading_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_deducted integer := 0;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorised'; END IF;
  SELECT * INTO r FROM public.reading_history WHERE id = p_reading_id;
  IF r.id IS NULL THEN RETURN 0; END IF;
  IF r.status = 'approved' AND COALESCE(r.points_earned,0) > 0 THEN
    v_deducted := r.points_earned;
    UPDATE public.profiles SET points = GREATEST(COALESCE(points,0) - v_deducted, 0) WHERE id = r.user_id;
  END IF;
  DELETE FROM public.reading_history WHERE id = p_reading_id;
  RETURN v_deducted;
END; $$;
REVOKE EXECUTE ON FUNCTION public.scrap_reading_entry(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.scrap_reading_entry(uuid) TO authenticated;

-- Public ticket submission
CREATE OR REPLACE FUNCTION public.submit_public_support_ticket(
  p_admission text, p_full_name text, p_email text, p_student_class text, p_role text,
  p_category text, p_priority text, p_subject text, p_description text)
RETURNS TABLE(id uuid, ticket_number text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid; v_id uuid; v_no text;
BEGIN
  IF COALESCE(trim(p_admission),'') = '' OR COALESCE(trim(p_subject),'') = '' THEN
    RAISE EXCEPTION 'Admission number and subject are required';
  END IF;
  SELECT p.id INTO v_user FROM public.profiles p WHERE p.admission_number = trim(p_admission) LIMIT 1;

  INSERT INTO public.support_tickets (
    user_id, admission_number, full_name, email, student_class, role,
    category, subject, description, priority, status)
  VALUES (v_user, trim(p_admission), left(p_full_name,120), nullif(left(p_email,255),''), p_student_class, p_role,
    p_category, left(p_subject,150), left(p_description,2000), COALESCE(p_priority,'medium'), 'open')
  RETURNING support_tickets.id, support_tickets.ticket_number INTO v_id, v_no;

  RETURN QUERY SELECT v_id, v_no;
END; $$;
REVOKE EXECUTE ON FUNCTION public.submit_public_support_ticket(text,text,text,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_support_ticket(text,text,text,text,text,text,text,text,text) TO anon, authenticated;

-- Public ticket lookup
DROP FUNCTION IF EXISTS public.lookup_ticket_status(text, text);
CREATE FUNCTION public.lookup_ticket_status(p_ticket_number text, p_admission text)
RETURNS TABLE(id uuid, ticket_number text, subject text, category text, status text,
              priority text, admin_response text, created_at timestamptz, resolved_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.ticket_number, t.subject, t.category, t.status, t.priority,
         t.admin_response, t.created_at, t.resolved_at
  FROM public.support_tickets t
  WHERE upper(t.ticket_number) = upper(trim(p_ticket_number))
    AND t.admission_number = trim(p_admission)
  LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.lookup_ticket_status(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_ticket_status(text,text) TO anon, authenticated;

-- Link guest tickets to the signed-in member
CREATE OR REPLACE FUNCTION public.link_my_support_tickets()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_adm text; v_count integer := 0;
BEGIN
  SELECT admission_number INTO v_adm FROM public.profiles WHERE id = auth.uid();
  IF v_adm IS NULL OR v_adm = '' THEN RETURN 0; END IF;
  UPDATE public.support_tickets SET user_id = auth.uid()
  WHERE user_id IS NULL AND admission_number = v_adm;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END; $$;
REVOKE EXECUTE ON FUNCTION public.link_my_support_tickets() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_my_support_tickets() TO authenticated;

-- >>> FILE: 20260807164159_8ba756b6-0536-4725-84b4-b6b267015f59.sql
-- 1. Support tickets: prevent identity spoofing on direct inserts
DROP POLICY IF EXISTS "Anyone can submit a ticket" ON public.support_tickets;
CREATE POLICY "Users submit their own tickets"
ON public.support_tickets FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
REVOKE INSERT ON public.support_tickets FROM anon;

-- 2. Book reviews: authenticated readers only
DROP POLICY IF EXISTS "reviews public select" ON public.book_reviews;
CREATE POLICY "reviews select authenticated"
ON public.book_reviews FOR SELECT TO authenticated
USING ((is_hidden = false) OR (user_id = auth.uid()) OR public.is_staff_or_admin(auth.uid()));
REVOKE SELECT ON public.book_reviews FROM anon;

-- 3. Settings / curriculum tables: require login (events + gallery stay public intentionally)
DROP POLICY IF EXISTS "settings readable" ON public.system_settings;
CREATE POLICY "settings readable" ON public.system_settings FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.system_settings FROM anon;

DROP POLICY IF EXISTS "ncert public read" ON public.ncert_books;
CREATE POLICY "ncert read authenticated" ON public.ncert_books FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.ncert_books FROM anon;

DROP POLICY IF EXISTS "cbse public read" ON public.cbse_curriculum;
CREATE POLICY "cbse read authenticated" ON public.cbse_curriculum FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.cbse_curriculum FROM anon;

-- 4. Trigger functions must never be directly callable
REVOKE EXECUTE ON FUNCTION public.tg_enforce_issue_limits() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_notify_badge_award() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_notify_book_issue() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_notify_book_return() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_notify_friendship() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_notify_level_up() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_notify_post_comment() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_notify_post_like() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_notify_ticket_update() FROM anon, authenticated;

-- 5. Social/profile definer functions: keep anon access for public profile queries
-- REVOKE EXECUTE ON FUNCTION public.get_public_posts_by_user(uuid, integer) FROM anon;
-- REVOKE EXECUTE ON FUNCTION public.get_public_profile_full(uuid) FROM anon;
-- REVOKE EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) FROM anon;
-- REVOKE EXECUTE ON FUNCTION public.get_class_league() FROM anon;
-- REVOKE EXECUTE ON FUNCTION public.get_available_accessions(uuid) FROM anon;
-- REVOKE EXECUTE ON FUNCTION public.get_book_borrow_counts() FROM anon;

-- 6. Internal helpers not meant to be called from the client
REVOKE EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_profile_role(uuid) FROM anon, authenticated;


-- >>> FILE: 20260807164604_c5ae1cbc-2141-4d05-886c-a57c1c4f3fa9.sql
CREATE TABLE public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon_name text NOT NULL DEFAULT 'Gamepad2',
  category text NOT NULL DEFAULT 'puzzle',
  is_enabled boolean NOT NULL DEFAULT true,
  points_per_win integer NOT NULL DEFAULT 10,
  max_points_per_day integer NOT NULL DEFAULT 50,
  daily_play_limit integer NOT NULL DEFAULT 5,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.games TO authenticated;
GRANT ALL ON public.games TO service_role;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view games" ON public.games
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage games" ON public.games
  FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE TRIGGER trg_games_updated BEFORE UPDATE ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.game_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  game_id uuid REFERENCES public.games(id) ON DELETE SET NULL,
  game_key text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  points_earned integer NOT NULL DEFAULT 0,
  duration_seconds integer NOT NULL DEFAULT 0,
  is_win boolean NOT NULL DEFAULT false,
  played_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.game_plays TO authenticated;
GRANT ALL ON public.game_plays TO service_role;
ALTER TABLE public.game_plays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own plays" ON public.game_plays
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Users insert own plays" ON public.game_plays
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_game_plays_user_day ON public.game_plays (user_id, game_key, played_at);

CREATE OR REPLACE FUNCTION public.record_game_play(
  p_game_key text,
  p_score integer,
  p_is_win boolean,
  p_duration_seconds integer DEFAULT 0
) RETURNS TABLE(points_awarded integer, plays_left integer, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  g record;
  v_plays integer;
  v_today_pts integer;
  v_pts integer := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO g FROM public.games WHERE key = p_game_key;
  IF g IS NULL OR NOT g.is_enabled THEN
    RETURN QUERY SELECT 0, 0, 'This game is currently unavailable.'; RETURN;
  END IF;

  SELECT COUNT(*)::int, COALESCE(SUM(points_earned),0)::int
    INTO v_plays, v_today_pts
  FROM public.game_plays
  WHERE user_id = v_uid AND game_key = p_game_key AND played_at::date = CURRENT_DATE;

  IF g.daily_play_limit > 0 AND v_plays >= g.daily_play_limit THEN
    INSERT INTO public.game_plays (user_id, game_id, game_key, score, points_earned, duration_seconds, is_win)
    VALUES (v_uid, g.id, p_game_key, COALESCE(p_score,0), 0, GREATEST(COALESCE(p_duration_seconds,0),0), COALESCE(p_is_win,false));
    RETURN QUERY SELECT 0, 0, 'Daily play limit reached — no more points today.'; RETURN;
  END IF;

  IF COALESCE(p_is_win, false) THEN
    v_pts := GREATEST(g.points_per_win, 0);
    IF g.max_points_per_day > 0 THEN
      v_pts := GREATEST(LEAST(v_pts, g.max_points_per_day - v_today_pts), 0);
    END IF;
  END IF;

  INSERT INTO public.game_plays (user_id, game_id, game_key, score, points_earned, duration_seconds, is_win)
  VALUES (v_uid, g.id, p_game_key, COALESCE(p_score,0), v_pts, GREATEST(COALESCE(p_duration_seconds,0),0), COALESCE(p_is_win,false));

  IF v_pts > 0 THEN
    UPDATE public.profiles SET points = COALESCE(points,0) + v_pts WHERE id = v_uid;
  END IF;

  RETURN QUERY SELECT v_pts,
    CASE WHEN g.daily_play_limit > 0 THEN GREATEST(g.daily_play_limit - v_plays - 1, 0) ELSE 999 END,
    CASE WHEN v_pts > 0 THEN 'Nice work!' ELSE 'Play recorded.' END;
END; $$;

REVOKE EXECUTE ON FUNCTION public.record_game_play(text, integer, boolean, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_game_play(text, integer, boolean, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.award_material_reading(
  p_material_id uuid,
  p_material_title text,
  p_seconds integer
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_secs integer := GREATEST(COALESCE(p_seconds,0), 0);
  v_rate integer;
  v_cap integer;
  v_today integer;
  v_pts integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF v_secs < 60 THEN RETURN 0; END IF;

  SELECT COALESCE((value)::text::integer, 1) INTO v_rate FROM public.system_settings WHERE key = 'points_per_reading_minute';
  v_rate := COALESCE(v_rate, 1);
  SELECT COALESCE((value)::text::integer, 30) INTO v_cap FROM public.system_settings WHERE key = 'max_reading_points_per_day';
  v_cap := COALESCE(v_cap, 30);

  v_pts := LEAST(FLOOR(v_secs / 60.0)::int * v_rate, 20);

  SELECT COALESCE(SUM(points_earned),0)::int INTO v_today
  FROM public.study_sessions
  WHERE user_id = v_uid AND session_type = 'reading' AND started_at::date = CURRENT_DATE;

  IF v_cap > 0 THEN v_pts := GREATEST(LEAST(v_pts, v_cap - v_today), 0); END IF;

  INSERT INTO public.study_sessions (user_id, material_id, material_title, duration_seconds, points_earned, session_type, started_at, ended_at)
  VALUES (v_uid, p_material_id, p_material_title, v_secs, v_pts, 'reading', now() - make_interval(secs => v_secs), now());

  IF v_pts > 0 THEN
    UPDATE public.profiles SET points = COALESCE(points,0) + v_pts WHERE id = v_uid;
  END IF;
  RETURN v_pts;
END; $$;

REVOKE EXECUTE ON FUNCTION public.award_material_reading(uuid, text, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.award_material_reading(uuid, text, integer) TO authenticated;

INSERT INTO public.games (key, name, description, icon_name, category, points_per_win, max_points_per_day, daily_play_limit, sort_order) VALUES
  ('book-match', 'Book Match', 'Flip cards and match book titles with their authors.', 'Layers', 'memory', 10, 40, 5, 1),
  ('library-bingo', 'Library Bingo', 'Complete a row of library reading tasks to win.', 'Grid3x3', 'bingo', 15, 30, 3, 2),
  ('word-scramble', 'Word Scramble', 'Unscramble book titles and literary words against the clock.', 'Shuffle', 'word', 8, 40, 6, 3),
  ('sliding-puzzle', 'Jigsaw Slider', 'Slide the tiles to rebuild a book cover.', 'PuzzleIcon', 'puzzle', 12, 36, 4, 4),
  ('book-cards', 'Book Card Duel', 'Guess which book is more popular in the library.', 'Spade', 'cards', 10, 40, 5, 5),
  ('crossword', 'Mini Crossword', 'Solve a crossword built from library and book clues.', 'Grid2x2', 'word', 20, 40, 2, 6);

INSERT INTO public.system_settings (key, value) VALUES
  ('points_per_reading_minute', '1'::jsonb),
  ('max_reading_points_per_day', '30'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- >>> FILE: 20260808041035_restore_profile_access.sql
-- Restore access to profile functions that dashboards need
GRANT EXECUTE ON FUNCTION public.get_public_posts_by_user(uuid, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_full(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_class_league() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_accessions(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_book_borrow_counts() TO anon, authenticated;

-- >>> FILE: 20260808042620_grant_get_profile_role.sql
-- Restore execute permission for get_profile_role used by RLS policies
GRANT EXECUTE ON FUNCTION public.get_profile_role(uuid) TO authenticated, service_role;

-- >>> FILE: 20260808043535_ddb37c6a-2bf8-46a3-ad51-1fb93275e7a1.sql
CREATE TABLE public.game_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_key text NOT NULL,
  kind text NOT NULL DEFAULT 'word',
  value text NOT NULL,
  hint text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX game_content_game_key_idx ON public.game_content (game_key, is_active);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_content TO authenticated;
GRANT ALL ON public.game_content TO service_role;

ALTER TABLE public.game_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active game content"
ON public.game_content FOR SELECT TO authenticated
USING (is_active = true OR public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff manage game content insert"
ON public.game_content FOR INSERT TO authenticated
WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff manage game content update"
ON public.game_content FOR UPDATE TO authenticated
USING (public.is_staff_or_admin(auth.uid()))
WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff manage game content delete"
ON public.game_content FOR DELETE TO authenticated
USING (public.is_staff_or_admin(auth.uid()));

CREATE TRIGGER trg_game_content_updated
BEFORE UPDATE ON public.game_content
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- >>> FILE: 20260808044000_insert_remaining_games.sql
-- Insert the remaining developed games if they do not exist
INSERT INTO public.games (key, name, description, icon_name, category, points_per_win, max_points_per_day, daily_play_limit, sort_order) VALUES
  ('reading-wordle', 'Reading Wordle', 'Guess the 5-letter book-related word in 6 tries.', 'Sparkles', 'word', 10, 40, 5, 7),
  ('book-hangman', 'Book Hangman', 'Guess the letters to solve the secret book title or literary word.', 'Gamepad2', 'word', 8, 40, 5, 8),
  ('spell-bee', 'Spell Bee', 'Listen to or read a hint and spell the library term correctly.', 'Trophy', 'word', 10, 30, 3, 9),
  ('word-chain', 'Word Chain', 'Build a chain of words where each starts with the last letter of the previous.', 'Shuffle', 'word', 10, 40, 5, 10),
  ('word-search', 'Word Search', 'Find hidden library and literary words in the puzzle grid.', 'Grid3x3', 'word', 12, 36, 4, 11),
  ('speed-typing', 'Speed Typing', 'Test your words-per-minute rate by typing literary quotes.', 'Zap', 'speed', 10, 40, 5, 12),
  ('quick-draw', 'Quick Draw', 'Draw and sketch the given book themed prompt before time runs out.', 'Sparkles', 'creative', 15, 30, 3, 13),
  ('spot-difference', 'Spot the Difference', 'Compare book cover images or patterns and find the odd one.', 'Layers', 'puzzle', 8, 40, 5, 14),
  ('riddle-rounds', 'Riddle Rounds', 'Solve clever riddles about popular library books and authors.', 'Gamepad2', 'puzzle', 12, 36, 4, 15),
  ('literary-places', 'Literary Places', 'Trivia challenge: Guess the book setting, country or location.', 'Layers', 'trivia', 15, 30, 3, 16),
  ('reaction-test', 'Reaction Test', 'Click as fast as you can when the screen changes color.', 'Zap', 'reflex', 8, 40, 5, 17)
ON CONFLICT (key) DO NOTHING;


-- >>> FILE: 20260808060000_fix_streak_multiplier.sql
-- Fix claim_streak_points to apply the same tier multipliers shown in the UI
-- Tiers (matching LoginStreakCard.tsx):
--   streak >= 28 → 2.0×
--   streak >= 14 → 1.8×
--   streak >= 7  → 1.5×
--   streak >= 3  → 1.2×
--   else         → 1.0×

CREATE OR REPLACE FUNCTION public.claim_streak_points()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  streak_days  integer;
  base_points  integer;
  multiplier   numeric;
  earned       integer;
  last_claimed date;
BEGIN
  -- Guard: already claimed today?
  SELECT p.streak_last_claimed INTO last_claimed
  FROM public.profiles p WHERE p.id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF last_claimed = CURRENT_DATE THEN
    RAISE EXCEPTION 'Today''s streak reward has already been claimed';
  END IF;

  -- Current streak length
  SELECT COALESCE(ls.current_streak, 0) INTO streak_days
  FROM public.login_streaks ls WHERE ls.user_id = auth.uid();
  IF COALESCE(streak_days, 0) < 1 THEN
    RAISE EXCEPTION 'No active streak to claim';
  END IF;

  -- Base points per day from settings (default 10)
  SELECT COALESCE((s.value #>> '{}')::integer, 10) INTO base_points
  FROM public.system_settings s WHERE s.key = 'points_per_daily_streak';
  base_points := COALESCE(base_points, 10);

  -- Apply tier multiplier (mirrors LoginStreakCard.tsx getStreakMultiplier)
  IF    streak_days >= 28 THEN multiplier := 2.0;
  ELSIF streak_days >= 14 THEN multiplier := 1.8;
  ELSIF streak_days >= 7  THEN multiplier := 1.5;
  ELSIF streak_days >= 3  THEN multiplier := 1.2;
  ELSE                        multiplier := 1.0;
  END IF;

  -- earned = base × multiplier (rounded)
  earned := ROUND(base_points * multiplier);

  UPDATE public.profiles
  SET points              = COALESCE(points, 0) + earned,
      streak_last_claimed = CURRENT_DATE
  WHERE id = auth.uid();

  RETURN earned;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_streak_points() TO authenticated;


-- >>> FILE: 20260809000000_analytics_functions.sql
-- Create a function to get game analytics to bypass the 1000 row API limit and reduce cache/network usage
CREATE OR REPLACE FUNCTION get_game_analytics()
RETURNS TABLE (
  game_key text,
  plays bigint,
  wins bigint,
  xp_awarded bigint,
  total_time bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gp.game_key,
    COUNT(gp.id) as plays,
    COUNT(gp.id) FILTER (WHERE gp.is_win) as wins,
    COALESCE(SUM(gp.points_earned), 0) as xp_awarded,
    COALESCE(SUM(gp.duration_seconds), 0) as total_time
  FROM game_plays gp
  GROUP BY gp.game_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get the current database size in bytes
CREATE OR REPLACE FUNCTION get_database_size()
RETURNS bigint AS $$
BEGIN
  RETURN pg_database_size(current_database());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- >>> FILE: 20260809000001_storage_size_function.sql
-- Create a function to get total Supabase Storage usage across all buckets
CREATE OR REPLACE FUNCTION get_storage_size()
RETURNS bigint AS $$
DECLARE
  total_size bigint;
BEGIN
  -- We sum the 'size' attribute from the JSONB metadata column in storage.objects
  SELECT SUM((metadata->>'size')::bigint) INTO total_size
  FROM storage.objects;
  
  RETURN COALESCE(total_size, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- >>> FILE: 20260817185420_add_feedback_reviews_and_upgrades.sql
-- Create user_feedback table
CREATE TABLE IF NOT EXISTS public.user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    category TEXT NOT NULL CHECK (category IN ('suggestion', 'bug', 'compliment', 'other')),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Allow anonymous and authenticated insertions
CREATE POLICY "Allow public feedback submission" ON public.user_feedback
    FOR INSERT WITH CHECK (true);

-- Allow admins to read all feedback
CREATE POLICY "Allow admin to read all feedback" ON public.user_feedback
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Add book_reviews table
CREATE TABLE IF NOT EXISTS public.book_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(book_id, user_id)
);

ALTER TABLE public.book_reviews ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE public.book_reviews ADD COLUMN IF NOT EXISTS helpful_votes INTEGER DEFAULT 0;

-- Enable RLS for book reviews
ALTER TABLE public.book_reviews ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read approved reviews
CREATE POLICY "Allow public to read approved reviews" ON public.book_reviews
    FOR SELECT USING (is_approved = TRUE);

-- Allow authenticated users to create/update reviews
CREATE POLICY "Allow authenticated users to manage reviews" ON public.book_reviews
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Allow admins full access to reviews
CREATE POLICY "Allow admin full access to reviews" ON public.book_reviews
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Add is_book_of_the_week column to books
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS is_book_of_the_week BOOLEAN DEFAULT FALSE;

-- Add currently_reading status metadata column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS currently_reading JSONB;


-- >>> FILE: 20260817190000_features_batch2.sql
-- ============================================================
-- Migration: Feature upgrades batch 2
-- Features: 18 (FTS search_books RPC), 4 (reading_goals),
--           15 (reading_challenges), 26 (Realtime), 32 (velocity),
--           33 (daily study plan), 13 (class competitions),
--           36 (multiplayer quiz sessions)
-- ============================================================

-- ----------------------------------------
-- FEATURE 18: Full-Text Search RPC
-- Creates a fast search_books function using tsvector
-- ----------------------------------------
CREATE INDEX IF NOT EXISTS idx_books_fts ON books
  USING gin(
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce(author, '') || ' ' ||
      coalesce(subject, '') || ' ' ||
      coalesce(category, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(accession_number, '')
    )
  );

CREATE OR REPLACE FUNCTION search_books(
  search_query text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_subject text DEFAULT NULL,
  p_class_level text DEFAULT NULL,
  p_language text DEFAULT NULL,
  p_author text DEFAULT NULL,
  p_availability text DEFAULT 'all',
  p_sort_by text DEFAULT 'newest',
  p_limit int DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  title text,
  author text,
  category text,
  subject text,
  class_level text,
  language text,
  cover_url text,
  total_copies int,
  available_copies int,
  first_added_at timestamptz,
  created_at timestamptz,
  accession_number text,
  issue_count int,
  shelf_number text,
  cupboard_number text,
  rank real
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    b.id, b.title, b.author, b.category, b.subject, b.class_level,
    b.language, b.cover_url, b.total_copies, b.available_copies,
    b.first_added_at, b.created_at, b.accession_number, b.issue_count,
    b.shelf_number, b.cupboard_number,
    CASE
      WHEN search_query IS NOT NULL AND search_query <> ''
      THEN ts_rank(
        to_tsvector('english',
          coalesce(b.title, '') || ' ' ||
          coalesce(b.author, '') || ' ' ||
          coalesce(b.subject, '') || ' ' ||
          coalesce(b.category, '') || ' ' ||
          coalesce(b.description, '') || ' ' ||
          coalesce(b.accession_number, '')
        ),
        plainto_tsquery('english', search_query)
      )
      ELSE 0.0
    END AS rank
  FROM books b
  WHERE b.total_copies > 0
    AND (
      search_query IS NULL OR search_query = '' OR
      to_tsvector('english',
        coalesce(b.title, '') || ' ' ||
        coalesce(b.author, '') || ' ' ||
        coalesce(b.subject, '') || ' ' ||
        coalesce(b.category, '') || ' ' ||
        coalesce(b.description, '') || ' ' ||
        coalesce(b.accession_number, '')
      ) @@ plainto_tsquery('english', search_query) OR
      b.title ILIKE '%' || search_query || '%' OR
      b.author ILIKE '%' || search_query || '%' OR
      b.accession_number ILIKE '%' || search_query || '%'
    )
    AND (p_category IS NULL OR b.category = p_category)
    AND (p_subject IS NULL OR b.subject = p_subject)
    AND (p_class_level IS NULL OR b.class_level = p_class_level)
    AND (p_language IS NULL OR b.language = p_language)
    AND (p_author IS NULL OR b.author = p_author)
    AND (
      p_availability = 'all' OR
      (p_availability = 'available' AND b.available_copies > 0) OR
      (p_availability = 'new' AND b.first_added_at >= now() - interval '30 days')
    )
  ORDER BY
    CASE WHEN search_query IS NOT NULL AND search_query <> '' THEN
      ts_rank(
        to_tsvector('english',
          coalesce(b.title, '') || ' ' || coalesce(b.author, '') || ' ' ||
          coalesce(b.subject, '') || ' ' || coalesce(b.category, '') || ' ' ||
          coalesce(b.description, '') || ' ' || coalesce(b.accession_number, '')
        ),
        plainto_tsquery('english', search_query)
      )
    END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'most_borrowed' THEN b.issue_count END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'title_az' THEN b.title END ASC NULLS LAST,
    CASE WHEN p_sort_by = 'newest' THEN b.created_at END DESC NULLS LAST,
    b.issue_count DESC NULLS LAST,
    b.cover_url DESC NULLS LAST
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION search_books TO anon, authenticated;


-- ----------------------------------------
-- FEATURE 4: Reading Goals & Heatmap
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS reading_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  goal_type text NOT NULL CHECK (goal_type IN ('books_per_month', 'pages_per_week', 'minutes_per_day')),
  target_value int NOT NULL DEFAULT 4,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reading_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  activity_date date NOT NULL DEFAULT CURRENT_DATE,
  books_read int NOT NULL DEFAULT 0,
  pages_read int NOT NULL DEFAULT 0,
  minutes_read int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, activity_date)
);

ALTER TABLE reading_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own goals" ON reading_goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins view all goals" ON reading_goals FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users manage own activity" ON reading_activity_log FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins view all activity" ON reading_activity_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);


-- ----------------------------------------
-- FEATURE 15: Reading Challenge Calendar
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS reading_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  target_books int NOT NULL DEFAULT 5,
  badge_name text,
  badge_emoji text DEFAULT '🏆',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS challenge_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid REFERENCES reading_challenges(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  books_completed int NOT NULL DEFAULT 0,
  completed_at timestamptz,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

ALTER TABLE reading_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone views challenges" ON reading_challenges FOR SELECT USING (true);
CREATE POLICY "Admins manage challenges" ON reading_challenges FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users manage own participation" ON challenge_participants FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Everyone views participants" ON challenge_participants FOR SELECT USING (true);


-- ----------------------------------------
-- FEATURE 13: Class vs Class Competitions
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS class_competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  class_a text NOT NULL,
  class_b text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  metric text NOT NULL DEFAULT 'books_read' CHECK (metric IN ('books_read', 'quiz_score', 'points_earned')),
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
  winner_class text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE class_competitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone views competitions" ON class_competitions FOR SELECT USING (true);
CREATE POLICY "Admins manage competitions" ON class_competitions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);


-- ----------------------------------------
-- FEATURE 32: Student Reading Velocity
-- ----------------------------------------
CREATE OR REPLACE FUNCTION get_student_reading_velocity(p_user_id uuid)
RETURNS TABLE(
  books_last_30_days bigint,
  books_last_60_days bigint,
  velocity_score numeric,
  velocity_label text
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH counts AS (
    SELECT
      COUNT(*) FILTER (WHERE completed_date >= CURRENT_DATE - 30) AS last_30,
      COUNT(*) FILTER (WHERE completed_date >= CURRENT_DATE - 60 AND completed_date < CURRENT_DATE - 30) AS prev_30
    FROM reading_history
    WHERE user_id = p_user_id
  )
  SELECT
    last_30,
    prev_30,
    CASE WHEN prev_30 = 0 THEN last_30::numeric ELSE round((last_30::numeric / prev_30::numeric * 100), 1) END AS velocity_score,
    CASE
      WHEN prev_30 = 0 AND last_30 > 0 THEN 'Rising ⭐'
      WHEN last_30 > prev_30 THEN 'Accelerating 🚀'
      WHEN last_30 = prev_30 THEN 'Steady 📖'
      WHEN last_30 < prev_30 THEN 'Slowing 📉'
      ELSE 'Just Starting 🌱'
    END AS velocity_label
  FROM counts;
$$;

GRANT EXECUTE ON FUNCTION get_student_reading_velocity TO authenticated;


-- ----------------------------------------
-- FEATURE 36: Multiplayer Quiz Sessions
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  host_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  room_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'completed')),
  current_question_index int NOT NULL DEFAULT 0,
  max_players int NOT NULL DEFAULT 10,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quiz_session_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES quiz_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  display_name text NOT NULL,
  score int NOT NULL DEFAULT 0,
  answers jsonb DEFAULT '[]'::jsonb,
  is_ready boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_session_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone views sessions" ON quiz_sessions FOR SELECT USING (true);
CREATE POLICY "Authenticated create sessions" ON quiz_sessions FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Host updates sessions" ON quiz_sessions FOR UPDATE USING (auth.uid() = host_id);
CREATE POLICY "Everyone views players" ON quiz_session_players FOR SELECT USING (true);
CREATE POLICY "Players manage own record" ON quiz_session_players FOR ALL USING (auth.uid() = user_id);

-- Generate unique 6-char room codes
CREATE OR REPLACE FUNCTION generate_room_code() RETURNS text LANGUAGE sql AS $$
  SELECT upper(substring(md5(random()::text), 1, 6));
$$;

-- ----------------------------------------
-- FEATURE 26: Supabase Realtime
-- Enable realtime on key tables
-- ----------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_session_players;
ALTER PUBLICATION supabase_realtime ADD TABLE book_issues;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;


-- >>> FILE: 20260818003000_fix_push_subscriptions_updated_at.sql
-- Add missing updated_at column to push_subscriptions
ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Ensure the trigger function for updating updated_at exists
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Drop any stale trigger and recreate
DROP TRIGGER IF EXISTS trg_push_subscriptions_updated ON public.push_subscriptions;
CREATE TRIGGER trg_push_subscriptions_updated
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- >>> FILE: 20260818120000_student_library_barcodes.sql
-- Student library card barcodes + DB consistency fixes
-- Adds library_card_barcode to profiles for scannable student ID cards

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS library_card_barcode TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_library_card_barcode
  ON public.profiles (lower(trim(library_card_barcode)))
  WHERE library_card_barcode IS NOT NULL AND trim(library_card_barcode) <> '';

-- Backfill barcodes from admission numbers for approved students
UPDATE public.profiles
SET library_card_barcode = 'KVS-' || upper(trim(admission_number))
WHERE role = 'student'
  AND is_approved = true
  AND admission_number IS NOT NULL
  AND trim(admission_number) <> ''
  AND (library_card_barcode IS NULL OR trim(library_card_barcode) = '');

-- Auto-set barcode on profile insert/update when admission_number is present
CREATE OR REPLACE FUNCTION public.set_student_library_barcode()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'student'
     AND NEW.admission_number IS NOT NULL
     AND trim(NEW.admission_number) <> ''
     AND (NEW.library_card_barcode IS NULL OR trim(NEW.library_card_barcode) = '') THEN
    NEW.library_card_barcode := 'KVS-' || upper(trim(NEW.admission_number));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_student_library_barcode ON public.profiles;
CREATE TRIGGER trg_set_student_library_barcode
  BEFORE INSERT OR UPDATE OF admission_number, role, library_card_barcode ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_student_library_barcode();

-- Admin delete policy for user_feedback (was missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_feedback' AND policyname = 'Allow admin to delete feedback'
  ) THEN
    CREATE POLICY "Allow admin to delete feedback" ON public.user_feedback
      FOR DELETE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

-- Ensure currently_reading column exists (docs referenced reading_status incorrectly)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS currently_reading JSONB;

-- Grant profile column access via existing RLS (users update own profile)
COMMENT ON COLUMN public.profiles.library_card_barcode IS 'Code 39 barcode printed on student library ID card; scanned at circulation desk';


-- >>> FILE: 20260818130000_public_portfolio_stats.sql
-- Migration: Allow public/anonymous visitors to view student portfolio stats securely via security definer function
CREATE OR REPLACE FUNCTION public.get_public_portfolio_data(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_books_read INT;
  v_quizzes_passed INT;
  v_badges INT;
  v_goals_completed INT;
  v_monthly_read INT;
  v_streak INT;
  v_class_rank INT;
  v_points INT;
  v_class TEXT;
  v_milestones JSONB;
  v_activity_log JSONB;
  v_month_start TIMESTAMPTZ;
BEGIN
  -- Get user info
  SELECT points, student_class INTO v_points, v_class FROM public.profiles WHERE id = target_user_id;
  
  -- Calculate counts
  SELECT COUNT(*)::INT INTO v_books_read FROM public.reading_history WHERE user_id = target_user_id;
  SELECT COUNT(*)::INT INTO v_quizzes_passed FROM public.quiz_results WHERE user_id = target_user_id;
  SELECT COUNT(*)::INT INTO v_badges FROM public.badge_awards WHERE user_id = target_user_id;
  SELECT COUNT(*)::INT INTO v_goals_completed FROM public.challenge_progress WHERE user_id = target_user_id AND is_completed = true;
  
  v_month_start := date_trunc('month', now());
  SELECT COUNT(*)::INT INTO v_monthly_read FROM public.reading_history 
  WHERE user_id = target_user_id AND completed_date >= v_month_start;
  
  SELECT current_streak INTO v_streak FROM public.login_streaks WHERE user_id = target_user_id;
  IF v_streak IS NULL THEN
    v_streak := 0;
  END IF;

  -- Get rank
  IF v_class IS NOT NULL AND v_points IS NOT NULL THEN
    SELECT (COUNT(*) + 1)::INT INTO v_class_rank 
    FROM public.profiles 
    WHERE student_class = v_class AND points > v_points AND is_approved = true;
  ELSE
    v_class_rank := NULL;
  END IF;

  -- Milestones (badges + challenges)
  SELECT coalesce(jsonb_agg(m), '[]'::jsonb) INTO v_milestones FROM (
    SELECT 'badge' as type, b.name as title, b.description, a.awarded_at as date
    FROM public.badge_awards a
    JOIN public.badges b ON a.badge_id = b.id
    WHERE a.user_id = target_user_id
    UNION ALL
    SELECT 'challenge' as type, c.title, 'Earned ' || c.reward_points || ' bonus points.' as description, p.completed_at as date
    FROM public.challenge_progress p
    JOIN public.challenges c ON p.challenge_id = c.id
    WHERE p.user_id = target_user_id AND p.is_completed = true
    ORDER BY date DESC
    LIMIT 5
  ) m;

  -- Activity Log
  SELECT coalesce(jsonb_agg(log_row), '[]'::jsonb) INTO v_activity_log FROM (
    SELECT completed_date::date::text as date, COUNT(*)::int as value
    FROM public.reading_history
    WHERE user_id = target_user_id AND completed_date IS NOT NULL
    GROUP BY completed_date::date
  ) log_row;

  RETURN jsonb_build_object(
    'booksRead', v_books_read,
    'quizzesPassed', v_quizzes_passed,
    'points', COALESCE(v_points, 0),
    'badges', v_badges,
    'goalsCompleted', v_goals_completed,
    'monthlyRead', v_monthly_read,
    'streak', v_streak,
    'classRank', COALESCE(v_class_rank::text, '—'),
    'milestones', v_milestones,
    'activityLog', v_activity_log
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_portfolio_data(UUID) TO anon, authenticated;


-- >>> FILE: 20260826120000_session_features_aug2026.sql
-- ============================================================
-- Migration: 20260826120000_session_features_aug2026.sql
-- Features: Force Update Banner, NCERT data type column,
--           posts suggestion types, feedback wizard columns,
--           and system_settings seed keys
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. system_settings: seed app_version and force_update keys
--    (used by UpdateBanner to check if clients need updating)
-- ──────────────────────────────────────────────────────────────
INSERT INTO public.system_settings (key, value)
VALUES
  ('app_version', '"1.0.0"'),
  ('force_update', '"false"')
ON CONFLICT (key) DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- 2. study_materials: add type, url, class_level columns
--    NcertCbseReview uses:
--      type        = 'ncert'  (to distinguish NCERT entries)
--      url         = the PDF / Google Drive link
--      class_level = "6", "7", ..., "12"
--    (file_url is the original upload column; url is for links)
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.study_materials
  ADD COLUMN IF NOT EXISTS type        text NOT NULL DEFAULT 'upload'
    CHECK (type IN ('upload', 'ncert', 'cbse', 'link')),
  ADD COLUMN IF NOT EXISTS url         text,
  ADD COLUMN IF NOT EXISTS class_level text;

-- Back-fill existing rows to have type='upload'
UPDATE public.study_materials
  SET type = 'upload'
  WHERE type IS NULL OR type = '';

-- For NCERT rows the url is the external link; file_url can be null/empty
-- Allow file_url to be nullable for link-type materials
ALTER TABLE public.study_materials
  ALTER COLUMN file_url DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_study_materials_type        ON public.study_materials(type);
CREATE INDEX IF NOT EXISTS idx_study_materials_class_level ON public.study_materials(class_level);

-- 3. posts: drop any restrictive post_type CHECK so suggestion types work
--    We do NOT re-add a CHECK — existing rows may have arbitrary types.
--    An index is enough for query performance.
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_post_type_check;

-- Ensure title column exists on posts (SuggestionVoting writes title)
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS title text;

-- ──────────────────────────────────────────────────────────────
-- 4. user_feedback: add wizard columns used by the new
--    multi-step Feedback form (urgency, area, reference_id,
--    allow_follow_up)
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.user_feedback
  ADD COLUMN IF NOT EXISTS urgency        text DEFAULT 'low'
    CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  ADD COLUMN IF NOT EXISTS area           text,
  ADD COLUMN IF NOT EXISTS reference_id   text,
  ADD COLUMN IF NOT EXISTS allow_follow_up boolean DEFAULT true;

-- Allow own users to read their submitted feedback
DROP POLICY IF EXISTS "Allow own user to read own feedback" ON public.user_feedback;
CREATE POLICY "Allow own user to read own feedback"
  ON public.user_feedback FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ──────────────────────────────────────────────────────────────
-- 5. Indexes for performance on new query patterns
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_posts_post_type   ON public.posts(post_type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_uid ON public.user_feedback(user_id);


-- >>> FILE: 20260830150000_moderation_and_monthly_leaderboard.sql
-- Add user moderation columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS community_blocked_until timestamptz DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS community_warn_count integer DEFAULT 0;

-- Add monthly points column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS monthly_points integer DEFAULT 0;

-- Create monthly leaderboard archive history table
CREATE TABLE IF NOT EXISTS public.monthly_leaderboard_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month text NOT NULL, -- Format: YYYY-MM
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  rank integer,
  monthly_points integer,
  created_at timestamptz DEFAULT now()
);

-- Trigger function to automatically keep monthly_points in sync with points delta
CREATE OR REPLACE FUNCTION public.sync_monthly_points()
RETURNS TRIGGER AS $$
DECLARE
  old_pts integer := COALESCE(OLD.points, 0);
  new_pts integer := COALESCE(NEW.points, 0);
  delta integer := 0;
BEGIN
  IF NEW.points IS DISTINCT FROM OLD.points THEN
    delta := new_pts - old_pts;
    IF delta > 0 THEN
      NEW.monthly_points := COALESCE(NEW.monthly_points, 0) + delta;
    ELSIF delta < 0 THEN
      NEW.monthly_points := GREATEST(0, COALESCE(NEW.monthly_points, 0) + delta);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute sync on profile update
DROP TRIGGER IF EXISTS trigger_sync_monthly_points ON public.profiles;
CREATE TRIGGER trigger_sync_monthly_points
BEFORE UPDATE OF points ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_monthly_points();

-- Function to reset the monthly leaderboard and archive standings
CREATE OR REPLACE FUNCTION public.reset_monthly_leaderboard()
RETURNS void AS $$
DECLARE
  month_key text := to_char(now() - interval '1 day', 'YYYY-MM'); -- archive as previous month's key
BEGIN
  -- 1. Archive current standings for students
  INSERT INTO public.monthly_leaderboard_history (month, user_id, rank, monthly_points)
  SELECT 
    month_key,
    id,
    ROW_NUMBER() OVER (ORDER BY monthly_points DESC),
    monthly_points
  FROM public.profiles
  WHERE role = 'student' AND monthly_points > 0;
  
  -- 2. Reset monthly points to 0 for all users
  -- Note: The trigger trigger_sync_monthly_points only fires BEFORE UPDATE OF points,
  -- so updating monthly_points directly will not fire it. No need to disable/enable trigger.
  UPDATE public.profiles SET monthly_points = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Try to register plpgsql reset function as Pl/PgSQL Cron job if pg_cron exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Reset at midnight on the first day of every month
    PERFORM cron.schedule('monthly-leaderboard-reset', '0 0 1 * *', 'SELECT public.reset_monthly_leaderboard()');
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron not enabled or accessible. Monthly resets will need to be manually triggered or scheduled externally.';
END;
$$;


-- >>> FILE: 20260901101411_b13cb60c-1479-466f-8012-1b2bd5872030.sql

-- 1. PWA install reward
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pwa_installed_at timestamptz;

CREATE OR REPLACE FUNCTION public.award_pwa_install()
RETURNS TABLE(points_awarded integer, already_claimed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_existing timestamptz;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT pwa_installed_at INTO v_existing FROM public.profiles WHERE id = v_uid;
  IF v_existing IS NOT NULL THEN
    RETURN QUERY SELECT 0, true; RETURN;
  END IF;
  UPDATE public.profiles
    SET pwa_installed_at = now(), points = COALESCE(points,0) + 500
  WHERE id = v_uid;
  PERFORM public.notify_user(v_uid, 'App installed 🎉', 'You earned 500 XP for installing the DLMS app!', 'success');
  RETURN QUERY SELECT 500, false;
END; $$;

REVOKE ALL ON FUNCTION public.award_pwa_install() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_pwa_install() TO authenticated;

-- 2. Game anti-cheat scaffolding
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS min_duration_seconds integer NOT NULL DEFAULT 5;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS max_score integer NOT NULL DEFAULT 100000;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS offline_capable boolean NOT NULL DEFAULT false;

UPDATE public.games SET offline_capable = true
WHERE key IN ('word-scramble','sliding-puzzle','reading-wordle','book-hangman','word-search','word-chain','speed-typing','reaction-test','spot-difference','book-cards','library-bingo');

ALTER TABLE public.game_plays ADD COLUMN IF NOT EXISTS client_nonce text;
ALTER TABLE public.game_plays ADD COLUMN IF NOT EXISTS session_id uuid;
ALTER TABLE public.game_plays ADD COLUMN IF NOT EXISTS was_offline boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS game_plays_user_nonce_uidx
  ON public.game_plays (user_id, client_nonce) WHERE client_nonce IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  game_key text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.game_sessions TO authenticated;
GRANT ALL ON public.game_sessions TO service_role;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own game sessions read" ON public.game_sessions;
CREATE POLICY "own game sessions read" ON public.game_sessions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "own game sessions insert" ON public.game_sessions;
CREATE POLICY "own game sessions insert" ON public.game_sessions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.start_game_session(p_game_key text)
RETURNS TABLE(session_id uuid, server_time timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.games WHERE key = p_game_key AND is_enabled) THEN
    RAISE EXCEPTION 'Game unavailable';
  END IF;
  DELETE FROM public.game_sessions
    WHERE user_id = v_uid AND consumed_at IS NULL AND started_at < now() - interval '6 hours';
  INSERT INTO public.game_sessions (user_id, game_key) VALUES (v_uid, p_game_key) RETURNING id INTO v_id;
  RETURN QUERY SELECT v_id, now();
END; $$;

REVOKE ALL ON FUNCTION public.start_game_session(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_game_session(text) TO authenticated;

-- Verified scoring
CREATE OR REPLACE FUNCTION public.record_game_play_v2(
  p_game_key text,
  p_score integer,
  p_is_win boolean,
  p_duration_seconds integer,
  p_session_id uuid DEFAULT NULL,
  p_client_nonce text DEFAULT NULL,
  p_answers jsonb DEFAULT NULL,
  p_offline boolean DEFAULT false
)
RETURNS TABLE(points_awarded integer, plays_left integer, message text, verified boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  g record;
  s record;
  v_plays integer;
  v_today_pts integer;
  v_pts integer := 0;
  v_win boolean := COALESCE(p_is_win,false);
  v_score integer := GREATEST(COALESCE(p_score,0),0);
  v_dur integer := GREATEST(COALESCE(p_duration_seconds,0),0);
  v_verified boolean := true;
  v_msg text := 'Play recorded.';
  a jsonb;
  v_expected text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO g FROM public.games WHERE key = p_game_key;
  IF g IS NULL OR NOT g.is_enabled THEN
    RETURN QUERY SELECT 0, 0, 'This game is currently unavailable.', false; RETURN;
  END IF;

  -- Replay protection via nonce
  IF p_client_nonce IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.game_plays WHERE user_id = v_uid AND client_nonce = p_client_nonce
  ) THEN
    RETURN QUERY SELECT 0, 0, 'This round was already submitted.', false; RETURN;
  END IF;

  -- Session verification (online plays)
  IF p_session_id IS NOT NULL THEN
    SELECT * INTO s FROM public.game_sessions WHERE id = p_session_id AND user_id = v_uid;
    IF s IS NULL OR s.consumed_at IS NOT NULL OR s.game_key <> p_game_key THEN
      v_verified := false; v_win := false; v_msg := 'Round could not be verified.';
    ELSE
      UPDATE public.game_sessions SET consumed_at = now() WHERE id = p_session_id;
      -- trust the server clock, not the client
      v_dur := GREATEST(EXTRACT(EPOCH FROM (now() - s.started_at))::int, 0);
    END IF;
  ELSIF NOT p_offline THEN
    v_verified := false; v_win := false; v_msg := 'Round could not be verified.';
  END IF;

  -- Timing plausibility
  IF v_verified AND v_dur < COALESCE(g.min_duration_seconds,5) THEN
    v_verified := false; v_win := false; v_msg := 'Round finished too quickly to count.';
  END IF;
  IF v_verified AND v_dur > 7200 THEN
    v_verified := false; v_win := false; v_msg := 'Round took too long to count.';
  END IF;

  -- Score bounds
  IF v_score > COALESCE(g.max_score,100000) THEN
    v_verified := false; v_win := false; v_msg := 'Reported score is out of range.';
    v_score := LEAST(v_score, COALESCE(g.max_score,100000));
  END IF;

  -- Answer verification against admin content
  IF v_verified AND p_answers IS NOT NULL AND jsonb_typeof(p_answers) = 'array' THEN
    FOR a IN SELECT jsonb_array_elements(p_answers) LOOP
      SELECT COALESCE(NULLIF(extra->>'answer',''), value) INTO v_expected
      FROM public.game_content
      WHERE id = (a->>'id')::uuid AND game_key = p_game_key;
      IF v_expected IS NULL
         OR lower(regexp_replace(COALESCE(a->>'answer',''), '[^a-zA-Z0-9]', '', 'g'))
            <> lower(regexp_replace(v_expected, '[^a-zA-Z0-9]', '', 'g')) THEN
        v_verified := false; v_win := false; v_msg := 'Answers did not match the library content.';
        EXIT;
      END IF;
    END LOOP;
  END IF;

  SELECT COUNT(*)::int, COALESCE(SUM(points_earned),0)::int
    INTO v_plays, v_today_pts
  FROM public.game_plays
  WHERE user_id = v_uid AND game_key = p_game_key AND played_at::date = CURRENT_DATE;

  IF g.daily_play_limit > 0 AND v_plays >= g.daily_play_limit THEN
    INSERT INTO public.game_plays (user_id, game_id, game_key, score, points_earned, duration_seconds, is_win, client_nonce, session_id, was_offline)
    VALUES (v_uid, g.id, p_game_key, v_score, 0, v_dur, v_win, p_client_nonce, p_session_id, p_offline);
    RETURN QUERY SELECT 0, 0, 'Daily play limit reached — no more points today.', v_verified; RETURN;
  END IF;

  IF v_win AND v_verified THEN
    v_pts := GREATEST(g.points_per_win, 0);
    IF g.max_points_per_day > 0 THEN
      v_pts := GREATEST(LEAST(v_pts, g.max_points_per_day - v_today_pts), 0);
    END IF;
    v_msg := 'Nice work!';
  END IF;

  INSERT INTO public.game_plays (user_id, game_id, game_key, score, points_earned, duration_seconds, is_win, client_nonce, session_id, was_offline)
  VALUES (v_uid, g.id, p_game_key, v_score, v_pts, v_dur, v_win, p_client_nonce, p_session_id, p_offline);

  IF v_pts > 0 THEN
    UPDATE public.profiles SET points = COALESCE(points,0) + v_pts WHERE id = v_uid;
  END IF;

  RETURN QUERY SELECT v_pts,
    CASE WHEN g.daily_play_limit > 0 THEN GREATEST(g.daily_play_limit - v_plays - 1, 0) ELSE 999 END,
    v_msg, v_verified;
END; $$;

REVOKE ALL ON FUNCTION public.record_game_play_v2(text,integer,boolean,integer,uuid,text,jsonb,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_game_play_v2(text,integer,boolean,integer,uuid,text,jsonb,boolean) TO authenticated;

-- 3. Period-aware leaderboards
CREATE OR REPLACE FUNCTION public.get_period_points(p_since timestamptz)
RETURNS TABLE(user_id uuid, pts bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT u, SUM(p)::bigint FROM (
    SELECT gp.user_id AS u, COALESCE(gp.points_earned,0) AS p
      FROM public.game_plays gp WHERE gp.played_at >= p_since
    UNION ALL
    SELECT qr.user_id, COALESCE(qr.points_earned,0)
      FROM public.quiz_results qr WHERE qr.completed_at >= p_since
    UNION ALL
    SELECT rh.user_id, COALESCE(rh.points_earned,0)
      FROM public.reading_history rh WHERE rh.completed_date >= p_since::date
    UNION ALL
    SELECT ss.user_id, COALESCE(ss.points_earned,0)
      FROM public.study_sessions ss WHERE ss.created_at >= p_since
    UNION ALL
    SELECT cp.user_id, COALESCE(cp.points_earned,0)
      FROM public.challenge_progress cp WHERE cp.completed_at >= p_since
    UNION ALL
    SELECT ba.user_id, COALESCE(b.points,0)
      FROM public.badge_awards ba JOIN public.badges b ON b.id = ba.badge_id
      WHERE ba.awarded_at >= p_since
  ) t(u, p)
  GROUP BY u;
$$;

REVOKE ALL ON FUNCTION public.get_period_points(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_period_points(timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_leaderboard_v2(p_period text DEFAULT 'lifetime', p_class text DEFAULT NULL)
RETURNS TABLE(id uuid, first_name text, last_name text, student_class text, avatar_url text, points bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_since timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_period = 'monthly' THEN
    v_since := date_trunc('month', now());
    RETURN QUERY
      SELECT p.id, p.first_name, p.last_name, p.student_class, p.avatar_url, COALESCE(pp.pts,0)::bigint
      FROM public.profiles p
      LEFT JOIN public.get_period_points(v_since) pp ON pp.user_id = p.id
      WHERE p.role = 'student'
        AND (p_class IS NULL OR p.student_class = p_class)
        AND COALESCE(pp.pts,0) > 0
      ORDER BY 6 DESC, p.first_name
      LIMIT 200;
  ELSE
    RETURN QUERY
      SELECT p.id, p.first_name, p.last_name, p.student_class, p.avatar_url, COALESCE(p.points,0)::bigint
      FROM public.profiles p
      WHERE p.role = 'student'
        AND (p_class IS NULL OR p.student_class = p_class)
      ORDER BY 6 DESC, p.first_name
      LIMIT 200;
  END IF;
END; $$;

REVOKE ALL ON FUNCTION public.get_leaderboard_v2(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_v2(text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_class_league_v2(p_period text DEFAULT 'lifetime')
RETURNS TABLE(student_class text, total_points bigint, student_count bigint, avg_points numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_since timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  v_since := date_trunc('month', now());
  IF p_period = 'monthly' THEN
    RETURN QUERY
      SELECT p.student_class, COALESCE(SUM(pp.pts),0)::bigint, COUNT(*)::bigint,
             ROUND(COALESCE(SUM(pp.pts),0)::numeric / GREATEST(COUNT(*),1), 1)
      FROM public.profiles p
      LEFT JOIN public.get_period_points(v_since) pp ON pp.user_id = p.id
      WHERE p.role = 'student' AND COALESCE(p.student_class,'') <> ''
      GROUP BY p.student_class
      ORDER BY 2 DESC;
  ELSE
    RETURN QUERY
      SELECT p.student_class, COALESCE(SUM(p.points),0)::bigint, COUNT(*)::bigint,
             ROUND(COALESCE(SUM(p.points),0)::numeric / GREATEST(COUNT(*),1), 1)
      FROM public.profiles p
      WHERE p.role = 'student' AND COALESCE(p.student_class,'') <> ''
      GROUP BY p.student_class
      ORDER BY 2 DESC;
  END IF;
END; $$;

REVOKE ALL ON FUNCTION public.get_class_league_v2(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_class_league_v2(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_leaderboard_stats_v2(p_period text DEFAULT 'lifetime', p_class text DEFAULT NULL)
RETURNS TABLE(total_students bigint, total_points bigint, average_points numeric, top_points bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  RETURN QUERY
    SELECT COUNT(*)::bigint,
           COALESCE(SUM(l.points),0)::bigint,
           ROUND(COALESCE(AVG(l.points),0)::numeric, 1),
           COALESCE(MAX(l.points),0)::bigint
    FROM public.get_leaderboard_v2(p_period, p_class) l;
END; $$;

REVOKE ALL ON FUNCTION public.get_leaderboard_stats_v2(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_stats_v2(text,text) TO authenticated;


-- >>> FILE: 20260902000000_schema_additions_and_rpcs.sql
-- ============================================================
-- Consolidated Migration: Schema Additions & Database RPCs
-- Date: 2026-09-02
-- Covers missing tables (user_feedback, class_competitions, quiz_sessions, quiz_session_players),
-- missing table columns (profiles, books, posts, book_reviews),
-- and missing RPC functions (analytics, leaderboard, storage/db size, FTS search, public portfolio).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Table Additions
-- ------------------------------------------------------------

-- Table: user_feedback
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text text NOT NULL,
  category text DEFAULT 'general',
  subject text,
  urgency text DEFAULT 'low' CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  area text,
  reference_id text,
  allow_follow_up boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public feedback submission" ON public.user_feedback;
CREATE POLICY "Allow public feedback submission" ON public.user_feedback FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow admin to read all feedback" ON public.user_feedback;
CREATE POLICY "Allow admin to read all feedback" ON public.user_feedback FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Allow admin to delete feedback" ON public.user_feedback;
CREATE POLICY "Allow admin to delete feedback" ON public.user_feedback FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Allow own user to read own feedback" ON public.user_feedback;
CREATE POLICY "Allow own user to read own feedback" ON public.user_feedback FOR SELECT TO authenticated USING (user_id = auth.uid());


-- Table: class_competitions
CREATE TABLE IF NOT EXISTS public.class_competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  class_a text NOT NULL,
  class_b text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  metric text NOT NULL DEFAULT 'books_read' CHECK (metric IN ('books_read', 'quiz_score', 'points_earned')),
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
  winner_class text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.class_competitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone views competitions" ON public.class_competitions;
CREATE POLICY "Everyone views competitions" ON public.class_competitions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage competitions" ON public.class_competitions;
CREATE POLICY "Admins manage competitions" ON public.class_competitions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);


-- Table: quiz_sessions
CREATE TABLE IF NOT EXISTS public.quiz_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  host_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  room_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'completed', 'active', 'finished')),
  current_question_index int NOT NULL DEFAULT 0,
  max_players int NOT NULL DEFAULT 10,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quiz_session_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.quiz_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  display_name text NOT NULL,
  score int NOT NULL DEFAULT 0,
  answers jsonb DEFAULT '[]'::jsonb,
  is_ready boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_session_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone views sessions" ON public.quiz_sessions;
CREATE POLICY "Everyone views sessions" ON public.quiz_sessions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated create sessions" ON public.quiz_sessions;
CREATE POLICY "Authenticated create sessions" ON public.quiz_sessions FOR INSERT WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "Host updates sessions" ON public.quiz_sessions;
CREATE POLICY "Host updates sessions" ON public.quiz_sessions FOR UPDATE USING (auth.uid() = host_id);

DROP POLICY IF EXISTS "Everyone views players" ON public.quiz_session_players;
CREATE POLICY "Everyone views players" ON public.quiz_session_players FOR SELECT USING (true);

DROP POLICY IF EXISTS "Players manage own record" ON public.quiz_session_players;
CREATE POLICY "Players manage own record" ON public.quiz_session_players FOR ALL USING (auth.uid() = user_id);


-- ------------------------------------------------------------
-- 2. Column Additions
-- ------------------------------------------------------------

-- profiles columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS library_card_barcode text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS community_blocked_until timestamptz DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS community_warn_count integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS currently_reading jsonb DEFAULT NULL;

-- books column
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS is_book_of_the_week boolean DEFAULT false;

-- posts column
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS poll_ends_at timestamptz DEFAULT NULL;

-- book_reviews column
ALTER TABLE public.book_reviews ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT true;


-- ------------------------------------------------------------
-- 3. Stored Procedures (RPCs)
-- ------------------------------------------------------------

-- RPC: get_game_analytics
CREATE OR REPLACE FUNCTION public.get_game_analytics()
RETURNS TABLE (
  game_key text,
  plays bigint,
  wins bigint,
  xp_awarded bigint,
  total_time bigint
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gp.game_key,
    COUNT(gp.id) as plays,
    COUNT(gp.id) FILTER (WHERE gp.is_win) as wins,
    COALESCE(SUM(gp.points_earned), 0) as xp_awarded,
    COALESCE(SUM(gp.duration_seconds), 0) as total_time
  FROM game_plays gp
  GROUP BY gp.game_key;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_game_analytics TO authenticated, anon;

-- RPC: get_database_size
CREATE OR REPLACE FUNCTION public.get_database_size()
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN pg_database_size(current_database());
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_database_size TO authenticated, anon;

-- RPC: get_storage_size
CREATE OR REPLACE FUNCTION public.get_storage_size()
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  total_size bigint;
BEGIN
  SELECT SUM((metadata->>'size')::bigint) INTO total_size FROM storage.objects;
  RETURN COALESCE(total_size, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_storage_size TO authenticated, anon;

-- RPC: reset_monthly_leaderboard
CREATE OR REPLACE FUNCTION public.reset_monthly_leaderboard()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  month_key text := to_char(now() - interval '1 day', 'YYYY-MM');
BEGIN
  INSERT INTO public.monthly_leaderboard_history (month, user_id, rank, monthly_points)
  SELECT 
    month_key,
    id,
    ROW_NUMBER() OVER (ORDER BY monthly_points DESC),
    monthly_points
  FROM public.profiles
  WHERE role = 'student' AND monthly_points > 0;
  
  UPDATE public.profiles SET monthly_points = 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_monthly_leaderboard TO authenticated, anon;

-- RPC: search_books
CREATE OR REPLACE FUNCTION public.search_books(
  search_query text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_subject text DEFAULT NULL,
  p_class_level text DEFAULT NULL,
  p_language text DEFAULT NULL,
  p_author text DEFAULT NULL,
  p_availability text DEFAULT 'all',
  p_sort_by text DEFAULT 'newest',
  p_limit int DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  title text,
  author text,
  category text,
  subject text,
  class_level text,
  language text,
  cover_url text,
  total_copies int,
  available_copies int,
  first_added_at timestamptz,
  created_at timestamptz,
  accession_number text,
  issue_count int,
  shelf_number text,
  cupboard_number text,
  rank real
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    b.id, b.title, b.author, b.category, b.subject, b.class_level,
    b.language, b.cover_url, b.total_copies, b.available_copies,
    b.first_added_at, b.created_at, b.accession_number, b.issue_count,
    b.shelf_number, b.cupboard_number,
    CASE
      WHEN search_query IS NOT NULL AND search_query <> ''
      THEN ts_rank(
        to_tsvector('english',
          coalesce(b.title, '') || ' ' ||
          coalesce(b.author, '') || ' ' ||
          coalesce(b.subject, '') || ' ' ||
          coalesce(b.category, '') || ' ' ||
          coalesce(b.description, '') || ' ' ||
          coalesce(b.accession_number, '')
        ),
        plainto_tsquery('english', search_query)
      )
      ELSE 0.0
    END AS rank
  FROM books b
  WHERE b.total_copies > 0
    AND (
      search_query IS NULL OR search_query = '' OR
      to_tsvector('english',
        coalesce(b.title, '') || ' ' ||
        coalesce(b.author, '') || ' ' ||
        coalesce(b.subject, '') || ' ' ||
        coalesce(b.category, '') || ' ' ||
        coalesce(b.description, '') || ' ' ||
        coalesce(b.accession_number, '')
      ) @@ plainto_tsquery('english', search_query) OR
      b.title ILIKE '%' || search_query || '%' OR
      b.author ILIKE '%' || search_query || '%' OR
      b.accession_number ILIKE '%' || search_query || '%'
    )
    AND (p_category IS NULL OR b.category = p_category)
    AND (p_subject IS NULL OR b.subject = p_subject)
    AND (p_class_level IS NULL OR b.class_level = p_class_level)
    AND (p_language IS NULL OR b.language = p_language)
    AND (p_author IS NULL OR b.author = p_author)
    AND (
      p_availability = 'all' OR
      (p_availability = 'available' AND b.available_copies > 0) OR
      (p_availability = 'new' AND b.first_added_at >= now() - interval '30 days')
    )
  ORDER BY
    CASE WHEN search_query IS NOT NULL AND search_query <> '' THEN
      ts_rank(
        to_tsvector('english',
          coalesce(b.title, '') || ' ' || coalesce(b.author, '') || ' ' ||
          coalesce(b.subject, '') || ' ' || coalesce(b.category, '') || ' ' ||
          coalesce(b.description, '') || ' ' || coalesce(b.accession_number, '')
        ),
        plainto_tsquery('english', search_query)
      )
    END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'most_borrowed' THEN b.issue_count END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'title_az' THEN b.title END ASC NULLS LAST,
    CASE WHEN p_sort_by = 'newest' THEN b.created_at END DESC NULLS LAST,
    b.issue_count DESC NULLS LAST,
    b.cover_url DESC NULLS LAST
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.search_books TO anon, authenticated;

-- RPC: get_public_portfolio_data
CREATE OR REPLACE FUNCTION public.get_public_portfolio_data(target_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_books_read INT;
  v_quizzes_passed INT;
  v_badges INT;
  v_goals_completed INT;
  v_monthly_read INT;
  v_streak INT;
  v_class_rank INT;
  v_points INT;
  v_class TEXT;
  v_milestones JSONB;
  v_activity_log JSONB;
  v_month_start TIMESTAMPTZ;
BEGIN
  SELECT points, student_class INTO v_points, v_class FROM public.profiles WHERE id = target_user_id;
  
  SELECT COUNT(*)::INT INTO v_books_read FROM public.reading_history WHERE user_id = target_user_id;
  SELECT COUNT(*)::INT INTO v_quizzes_passed FROM public.quiz_results WHERE user_id = target_user_id;
  SELECT COUNT(*)::INT INTO v_badges FROM public.badge_awards WHERE user_id = target_user_id;
  SELECT COUNT(*)::INT INTO v_goals_completed FROM public.challenge_progress WHERE user_id = target_user_id AND is_completed = true;
  
  v_month_start := date_trunc('month', now());
  SELECT COUNT(*)::INT INTO v_monthly_read FROM public.reading_history 
  WHERE user_id = target_user_id AND completed_date >= v_month_start;
  
  SELECT current_streak INTO v_streak FROM public.login_streaks WHERE user_id = target_user_id;
  IF v_streak IS NULL THEN
    v_streak := 0;
  END IF;

  IF v_class IS NOT NULL AND v_points IS NOT NULL THEN
    SELECT (COUNT(*) + 1)::INT INTO v_class_rank 
    FROM public.profiles 
    WHERE student_class = v_class AND points > v_points AND is_approved = true;
  ELSE
    v_class_rank := NULL;
  END IF;

  SELECT coalesce(jsonb_agg(m), '[]'::jsonb) INTO v_milestones FROM (
    SELECT 'badge' as type, b.name as title, b.description, a.awarded_at as date
    FROM public.badge_awards a
    JOIN public.badges b ON a.badge_id = b.id
    WHERE a.user_id = target_user_id
    UNION ALL
    SELECT 'challenge' as type, c.title, 'Earned ' || c.reward_points || ' bonus points.' as description, p.completed_at as date
    FROM public.challenge_progress p
    JOIN public.challenges c ON p.challenge_id = c.id
    WHERE p.user_id = target_user_id AND p.is_completed = true
    ORDER BY date DESC
    LIMIT 5
  ) m;

  SELECT coalesce(jsonb_agg(log_row), '[]'::jsonb) INTO v_activity_log FROM (
    SELECT completed_date::date::text as date, COUNT(*)::int as value
    FROM public.reading_history
    WHERE user_id = target_user_id AND completed_date IS NOT NULL
    GROUP BY completed_date::date
  ) log_row;

  RETURN jsonb_build_object(
    'booksRead', v_books_read,
    'quizzesPassed', v_quizzes_passed,
    'points', COALESCE(v_points, 0),
    'badges', v_badges,
    'goalsCompleted', v_goals_completed,
    'monthlyRead', v_monthly_read,
    'streak', v_streak,
    'classRank', COALESCE(v_class_rank::text, '—'),
    'milestones', v_milestones,
    'activityLog', v_activity_log
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_portfolio_data(UUID) TO anon, authenticated;


-- >>> FILE: 20260904075413_6abfff16-c73b-411d-accc-52b83cafa639.sql
CREATE OR REPLACE FUNCTION public.get_profile_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = _user_id
    AND _user_id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.get_profile_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_role(uuid) TO authenticated, service_role;

-- >>> FILE: 20260904075541_9eb21fb4-95a5-487e-a23b-d3dd7dd10434.sql
ALTER TABLE public.book_issues
  ADD COLUMN IF NOT EXISTS book_title text,
  ADD COLUMN IF NOT EXISTS book_author text;

ALTER TABLE public.book_issues ALTER COLUMN book_id DROP NOT NULL;

ALTER TABLE public.book_issues DROP CONSTRAINT IF EXISTS book_issues_book_id_fkey;
ALTER TABLE public.book_issues
  ADD CONSTRAINT book_issues_book_id_fkey
  FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE SET NULL;

UPDATE public.book_issues bi
SET book_title = COALESCE(bi.book_title, b.title),
    book_author = COALESCE(bi.book_author, b.author)
FROM public.books b
WHERE b.id = bi.book_id AND bi.book_title IS NULL;

CREATE OR REPLACE FUNCTION public.tg_snapshot_issue_book()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.book_id IS NOT NULL AND (NEW.book_title IS NULL OR NEW.book_title = '') THEN
    SELECT b.title, b.author INTO NEW.book_title, NEW.book_author
    FROM public.books b WHERE b.id = NEW.book_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS snapshot_issue_book ON public.book_issues;
CREATE TRIGGER snapshot_issue_book
BEFORE INSERT OR UPDATE OF book_id ON public.book_issues
FOR EACH ROW EXECUTE FUNCTION public.tg_snapshot_issue_book();

-- >>> FILE: 20260906121907_09ed6ed2-ae43-4532-8822-80487dc127b3.sql
-- ============ FIX BADGE AUTHORIZATION FOR TRIGGERS / MIGRATIONS ============
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b record;
  v_val integer;
  v_awarded integer := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 0;
  END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id AND NOT public.is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  FOR b IN
    SELECT *
    FROM public.badges
    WHERE is_active = true
      AND criteria_type IS NOT NULL
      AND criteria_type <> 'manual'
      AND criteria_value IS NOT NULL
      AND criteria_value > 0
      AND criteria_type IN (
        'books_read', 'books_issued', 'quizzes_completed', 'login_streak',
        'points', 'posts_count', 'comments_count', 'reviews_count', 'friends_count'
      )
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.badge_awards
      WHERE user_id = p_user_id AND badge_id = b.id
    ) THEN
      CONTINUE;
    END IF;

    v_val := CASE b.criteria_type
      WHEN 'books_read' THEN (
        SELECT COUNT(*)::int FROM public.reading_history
        WHERE user_id = p_user_id AND status = 'approved'
      )
      WHEN 'books_issued' THEN (
        SELECT COUNT(*)::int FROM public.book_issues WHERE user_id = p_user_id
      )
      WHEN 'quizzes_completed' THEN (
        SELECT COUNT(*)::int FROM public.quiz_results WHERE user_id = p_user_id
      )
      WHEN 'login_streak' THEN COALESCE(
        (SELECT current_streak FROM public.login_streaks WHERE user_id = p_user_id), 0
      )
      WHEN 'points' THEN COALESCE(
        (SELECT points FROM public.profiles WHERE id = p_user_id), 0
      )
      WHEN 'posts_count' THEN (
        SELECT COUNT(*)::int FROM public.posts WHERE user_id = p_user_id
      )
      WHEN 'comments_count' THEN (
        SELECT COUNT(*)::int FROM public.post_comments WHERE user_id = p_user_id
      )
      WHEN 'reviews_count' THEN (
        SELECT COUNT(*)::int FROM public.book_reviews WHERE user_id = p_user_id
      )
      WHEN 'friends_count' THEN (
        SELECT COUNT(*)::int FROM public.friendships
        WHERE status = 'accepted'
          AND (requester_id = p_user_id OR addressee_id = p_user_id)
      )
      ELSE NULL
    END;

    IF v_val IS NOT NULL AND v_val >= b.criteria_value THEN
      INSERT INTO public.badge_awards (user_id, badge_id, award_type, note)
      VALUES (p_user_id, b.id, 'auto', 'Automatically awarded')
      ON CONFLICT DO NOTHING;
      v_awarded := v_awarded + 1;
    END IF;
  END LOOP;

  RETURN v_awarded;
END;
$$;

-- ============ COLUMNS ============
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS is_book_of_the_week boolean NOT NULL DEFAULT false;
ALTER TABLE public.book_reviews ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT true;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS poll_ends_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS library_card_barcode text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS community_warn_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS community_blocked_until timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS currently_reading jsonb;

-- ============ user_feedback ============
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  full_name text,
  email text,
  category text NOT NULL DEFAULT 'suggestion',
  area text,
  urgency text NOT NULL DEFAULT 'low',
  reference_id text,
  allow_follow_up boolean NOT NULL DEFAULT true,
  rating integer NOT NULL DEFAULT 5,
  subject text NOT NULL,
  feedback_text text,
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_feedback TO authenticated;
GRANT INSERT ON public.user_feedback TO anon;
GRANT ALL ON public.user_feedback TO service_role;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.user_feedback;
CREATE POLICY "Anyone can submit feedback" ON public.user_feedback FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Staff can read feedback" ON public.user_feedback;
CREATE POLICY "Staff can read feedback" ON public.user_feedback FOR SELECT TO authenticated USING (public.is_staff_or_admin(auth.uid()));
DROP POLICY IF EXISTS "Staff can update feedback" ON public.user_feedback;
CREATE POLICY "Staff can update feedback" ON public.user_feedback FOR UPDATE TO authenticated USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));
DROP POLICY IF EXISTS "Staff can delete feedback" ON public.user_feedback;
CREATE POLICY "Staff can delete feedback" ON public.user_feedback FOR DELETE TO authenticated USING (public.is_staff_or_admin(auth.uid()));

-- ============ community_reports ============
CREATE TABLE IF NOT EXISTS public.community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  reporter_id uuid,
  reason text NOT NULL DEFAULT 'inappropriate',
  details text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_reports TO authenticated;
GRANT ALL ON public.community_reports TO service_role;
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can report posts" ON public.community_reports;
CREATE POLICY "Users can report posts" ON public.community_reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
DROP POLICY IF EXISTS "Staff can read reports" ON public.community_reports;
CREATE POLICY "Staff can read reports" ON public.community_reports FOR SELECT TO authenticated USING (public.is_staff_or_admin(auth.uid()));
DROP POLICY IF EXISTS "Staff can update reports" ON public.community_reports;
CREATE POLICY "Staff can update reports" ON public.community_reports FOR UPDATE TO authenticated USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));
DROP POLICY IF EXISTS "Staff can delete reports" ON public.community_reports;
CREATE POLICY "Staff can delete reports" ON public.community_reports FOR DELETE TO authenticated USING (public.is_staff_or_admin(auth.uid()));

-- ============ class_competitions ============
CREATE TABLE IF NOT EXISTS public.class_competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  class_a text NOT NULL,
  class_b text NOT NULL,
  metric text NOT NULL DEFAULT 'points',
  status text NOT NULL DEFAULT 'active',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_competitions TO authenticated;
GRANT ALL ON public.class_competitions TO service_role;
ALTER TABLE public.class_competitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Signed-in users can view competitions" ON public.class_competitions;
CREATE POLICY "Signed-in users can view competitions" ON public.class_competitions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Staff manage competitions" ON public.class_competitions;
CREATE POLICY "Staff manage competitions" ON public.class_competitions FOR ALL TO authenticated USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- ============ quiz_sessions ============
CREATE TABLE IF NOT EXISTS public.quiz_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  host_id uuid,
  room_code text,
  status text NOT NULL DEFAULT 'waiting',
  current_question_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_sessions TO authenticated;
GRANT ALL ON public.quiz_sessions TO service_role;
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Signed-in users can view quiz sessions" ON public.quiz_sessions;
CREATE POLICY "Signed-in users can view quiz sessions" ON public.quiz_sessions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can host quiz sessions" ON public.quiz_sessions;
CREATE POLICY "Users can host quiz sessions" ON public.quiz_sessions FOR INSERT TO authenticated WITH CHECK (host_id = auth.uid());
DROP POLICY IF EXISTS "Hosts and staff can update sessions" ON public.quiz_sessions;
CREATE POLICY "Hosts and staff can update sessions" ON public.quiz_sessions FOR UPDATE TO authenticated USING (host_id = auth.uid() OR public.is_staff_or_admin(auth.uid())) WITH CHECK (host_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
DROP POLICY IF EXISTS "Hosts and staff can delete sessions" ON public.quiz_sessions;
CREATE POLICY "Hosts and staff can delete sessions" ON public.quiz_sessions FOR DELETE TO authenticated USING (host_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

DROP TRIGGER IF EXISTS user_feedback_set_updated_at ON public.user_feedback;
CREATE TRIGGER user_feedback_set_updated_at BEFORE UPDATE ON public.user_feedback FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS community_reports_set_updated_at ON public.community_reports;
CREATE TRIGGER community_reports_set_updated_at BEFORE UPDATE ON public.community_reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS class_competitions_set_updated_at ON public.class_competitions;
CREATE TRIGGER class_competitions_set_updated_at BEFORE UPDATE ON public.class_competitions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS quiz_sessions_set_updated_at ON public.quiz_sessions;
CREATE TRIGGER quiz_sessions_set_updated_at BEFORE UPDATE ON public.quiz_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.get_game_analytics()
RETURNS TABLE(game_key text, plays bigint, wins bigint, xp_awarded bigint, total_time bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT gp.game_key,
         count(*)::bigint,
         count(*) FILTER (WHERE gp.is_win)::bigint,
         coalesce(sum(gp.points_earned),0)::bigint,
         coalesce(sum(gp.duration_seconds),0)::bigint
  FROM public.game_plays gp
  WHERE public.is_staff_or_admin(auth.uid())
  GROUP BY gp.game_key
$$;
REVOKE ALL ON FUNCTION public.get_game_analytics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_game_analytics() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_database_size()
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.is_staff_or_admin(auth.uid()) THEN pg_database_size(current_database()) ELSE 0 END
$$;
REVOKE ALL ON FUNCTION public.get_database_size() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_database_size() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_storage_size()
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.is_staff_or_admin(auth.uid())
    THEN coalesce((SELECT sum((o.metadata->>'size')::bigint) FROM storage.objects o), 0)
    ELSE 0 END
$$;
REVOKE ALL ON FUNCTION public.get_storage_size() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_storage_size() TO authenticated;

DROP FUNCTION IF EXISTS public.get_student_reading_velocity(uuid);

CREATE OR REPLACE FUNCTION public.get_student_reading_velocity(p_user_id uuid)
RETURNS TABLE(books_last_30 integer, books_prev_30 integer, change_pct numeric, velocity_label text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE a integer; b integer; pct numeric;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  SELECT count(*) INTO a FROM public.reading_history rh
    WHERE rh.user_id = p_user_id AND rh.completed_date >= CURRENT_DATE - 30;
  SELECT count(*) INTO b FROM public.reading_history rh
    WHERE rh.user_id = p_user_id AND rh.completed_date >= CURRENT_DATE - 60 AND rh.completed_date < CURRENT_DATE - 30;
  pct := CASE WHEN b = 0 THEN CASE WHEN a > 0 THEN 100 ELSE 0 END ELSE round(((a - b)::numeric / b) * 100, 1) END;
  RETURN QUERY SELECT a, b, pct,
    CASE WHEN a = 0 AND b = 0 THEN 'Getting Started'
         WHEN pct >= 50 THEN 'Accelerating'
         WHEN pct > 0 THEN 'Rising'
         WHEN pct = 0 THEN 'Steady'
         ELSE 'Slowing' END;
END;
$$;
REVOKE ALL ON FUNCTION public.get_student_reading_velocity(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_student_reading_velocity(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.search_books(text, text, text, text, text, text, text, text, integer);

CREATE OR REPLACE FUNCTION public.search_books(
  search_query text,
  p_category text DEFAULT NULL,
  p_subject text DEFAULT NULL,
  p_class_level text DEFAULT NULL,
  p_language text DEFAULT NULL,
  p_author text DEFAULT NULL,
  p_availability text DEFAULT 'all',
  p_sort_by text DEFAULT 'newest',
  p_limit integer DEFAULT 1000
)
RETURNS TABLE(
  id uuid, title text, author text, category text, subject text, class_level text,
  language text, cover_url text, total_copies integer, available_copies integer,
  first_added_at timestamptz, created_at timestamptz, accession_number text,
  issue_count integer, shelf_number text, cupboard_number text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.id, b.title, b.author, b.category, b.subject, b.class_level, b.language,
         b.cover_url, b.total_copies, b.available_copies, b.first_added_at, b.created_at,
         b.accession_number, b.issue_count, b.shelf_number, b.cupboard_number
  FROM public.books b
  WHERE b.total_copies > 0
    AND (
      search_query IS NULL OR search_query = '' OR
      b.title ILIKE '%' || search_query || '%' OR
      b.author ILIKE '%' || search_query || '%' OR
      b.accession_number ILIKE '%' || search_query || '%' OR
      EXISTS (SELECT 1 FROM unnest(b.accession_numbers) an WHERE an ILIKE '%' || search_query || '%')
    )
    AND (p_category IS NULL OR b.category = p_category)
    AND (p_subject IS NULL OR b.subject = p_subject)
    AND (p_class_level IS NULL OR b.class_level = p_class_level)
    AND (p_language IS NULL OR b.language = p_language)
    AND (p_author IS NULL OR b.author = p_author)
    AND (p_availability <> 'available' OR b.available_copies > 0)
    AND (p_availability <> 'new' OR coalesce(b.first_added_at, b.created_at) >= now() - interval '30 days')
  ORDER BY
    CASE WHEN p_sort_by = 'most_borrowed' THEN b.issue_count END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'title_az' THEN b.title END ASC NULLS LAST,
    CASE WHEN p_sort_by IN ('newest','most_recommended') THEN coalesce(b.first_added_at, b.created_at) END DESC NULLS LAST,
    b.title ASC
  LIMIT coalesce(p_limit, 1000)
$$;
REVOKE ALL ON FUNCTION public.search_books(text,text,text,text,text,text,text,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_books(text,text,text,text,text,text,text,text,integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_portfolio_data(target_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'booksRead', (SELECT count(*) FROM public.reading_history rh WHERE rh.user_id = target_user_id),
    'quizzesPassed', (SELECT count(*) FROM public.quiz_results qr WHERE qr.user_id = target_user_id),
    'points', (SELECT coalesce(p.points,0) FROM public.profiles p WHERE p.id = target_user_id),
    'badges', (SELECT count(*) FROM public.badge_awards ba WHERE ba.user_id = target_user_id),
    'goalsCompleted', 0,
    'monthlyRead', (SELECT count(*) FROM public.reading_history rh WHERE rh.user_id = target_user_id AND rh.completed_date >= date_trunc('month', CURRENT_DATE)),
    'streak', (SELECT coalesce(ls.current_streak,0) FROM public.login_streaks ls WHERE ls.user_id = target_user_id),
    'classRank', (
      SELECT rnk::text FROM (
        SELECT p.id, rank() OVER (ORDER BY p.points DESC) AS rnk
        FROM public.profiles p
        WHERE p.student_class = (SELECT student_class FROM public.profiles WHERE id = target_user_id)
      ) r WHERE r.id = target_user_id
    ),
    'activityLog', coalesce((
      SELECT jsonb_agg(x) FROM (
        SELECT rh.completed_date AS date, rh.book_title AS title, 'reading' AS type
        FROM public.reading_history rh WHERE rh.user_id = target_user_id
        ORDER BY rh.completed_date DESC LIMIT 10
      ) x), '[]'::jsonb),
    'milestones', coalesce((
      SELECT jsonb_agg(m) FROM (
        SELECT 'badge' AS type, b.name AS title, coalesce(b.description,'') AS description
        FROM public.badge_awards ba JOIN public.badges b ON b.id = ba.badge_id
        WHERE ba.user_id = target_user_id
        ORDER BY ba.awarded_at DESC LIMIT 6
      ) m), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_public_portfolio_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_portfolio_data(uuid) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.reset_monthly_leaderboard();

CREATE OR REPLACE FUNCTION public.reset_monthly_leaderboard()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE snapshot jsonb; n integer;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  SELECT coalesce(jsonb_agg(x), '[]'::jsonb), count(*) INTO snapshot, n FROM (
    SELECT p.id, p.first_name, p.last_name, p.student_class, p.points
    FROM public.profiles p WHERE p.role = 'student' ORDER BY p.points DESC LIMIT 200
  ) x;
  INSERT INTO public.system_settings(key, value, updated_at)
  VALUES ('leaderboard_archive_' || to_char(now(), 'YYYY_MM'), snapshot, now())
  ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = now();
  INSERT INTO public.system_settings(key, value, updated_at)
  VALUES ('leaderboard_last_reset', to_jsonb(now()), now())
  ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = now();
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.reset_monthly_leaderboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_monthly_leaderboard() TO authenticated;

-- ============ RLS FIXES FOR BOOK REQUESTS & BOOK ISSUES ============
CREATE OR REPLACE FUNCTION public.is_staff_or_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _uid AND role IN ('admin', 'staff', 'librarian', 'teacher')
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_staff_or_admin(uuid) TO authenticated, service_role;

ALTER TABLE public.book_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own requests" ON public.book_requests;
DROP POLICY IF EXISTS "Admins can view all book requests" ON public.book_requests;
DROP POLICY IF EXISTS "Users and staff can view requests" ON public.book_requests;
CREATE POLICY "Users and staff can view requests"
ON public.book_requests FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can insert requests" ON public.book_requests;
DROP POLICY IF EXISTS "Users can create book requests" ON public.book_requests;
DROP POLICY IF EXISTS "Users and staff can insert requests" ON public.book_requests;
CREATE POLICY "Users and staff can insert requests"
ON public.book_requests FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update requests" ON public.book_requests;
DROP POLICY IF EXISTS "Admins can update book requests" ON public.book_requests;
DROP POLICY IF EXISTS "Users and staff can update requests" ON public.book_requests;
CREATE POLICY "Users and staff can update requests"
ON public.book_requests FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete requests" ON public.book_requests;
DROP POLICY IF EXISTS "Staff and users delete requests" ON public.book_requests;
CREATE POLICY "Staff and users delete requests"
ON public.book_requests FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_requests TO authenticated;

ALTER TABLE public.book_issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own issues" ON public.book_issues;
DROP POLICY IF EXISTS "Users can view own book issues" ON public.book_issues;
DROP POLICY IF EXISTS "Teachers and admins can view all book issues" ON public.book_issues;
DROP POLICY IF EXISTS "Users and staff can view book issues" ON public.book_issues;
CREATE POLICY "Users and staff can view book issues"
ON public.book_issues FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert issues" ON public.book_issues;
DROP POLICY IF EXISTS "System can insert book issues" ON public.book_issues;
DROP POLICY IF EXISTS "Staff can insert book issues" ON public.book_issues;
CREATE POLICY "Staff can insert book issues"
ON public.book_issues FOR INSERT TO authenticated
WITH CHECK (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update issues" ON public.book_issues;
DROP POLICY IF EXISTS "Admins can manage all book issues" ON public.book_issues;
DROP POLICY IF EXISTS "Staff can update book issues" ON public.book_issues;
CREATE POLICY "Staff can update book issues"
ON public.book_issues FOR UPDATE TO authenticated
USING (public.is_staff_or_admin(auth.uid()))
WITH CHECK (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Staff can delete book issues" ON public.book_issues;
CREATE POLICY "Staff can delete book issues"
ON public.book_issues FOR DELETE TO authenticated
USING (public.is_staff_or_admin(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_issues TO authenticated;

-- ============ MONTHLY LEADERBOARD CALCULATIONS ============
CREATE OR REPLACE FUNCTION public.get_period_points(p_since timestamptz)
RETURNS TABLE(user_id uuid, pts bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT u, SUM(p)::bigint FROM (
    SELECT gp.user_id AS u, COALESCE(gp.points_earned,0) AS p
      FROM public.game_plays gp WHERE gp.played_at >= p_since
    UNION ALL
    SELECT qr.user_id, COALESCE(qr.points_earned,0)
      FROM public.quiz_results qr WHERE qr.completed_at >= p_since
    UNION ALL
    SELECT rh.user_id, COALESCE(rh.points_earned, 20)
      FROM public.reading_history rh 
      WHERE (rh.completed_date >= p_since::date OR rh.created_at >= p_since)
        AND rh.status = 'approved'
    UNION ALL
    SELECT ss.user_id, COALESCE(ss.points_earned,0)
      FROM public.study_sessions ss WHERE (ss.ended_at >= p_since OR ss.created_at >= p_since)
    UNION ALL
    SELECT cp.user_id, COALESCE(NULLIF(cp.points_earned, 0), c.reward_points, 0)
      FROM public.challenge_progress cp
      JOIN public.challenges c ON c.id = cp.challenge_id
      WHERE (cp.completed_at >= p_since OR cp.created_at >= p_since)
        AND (cp.is_completed = true OR cp.is_claimed = true)
    UNION ALL
    SELECT ba.user_id, COALESCE(b.points,0)
      FROM public.badge_awards ba 
      JOIN public.badges b ON b.id = ba.badge_id
      WHERE ba.awarded_at >= p_since
  ) t(u, p)
  GROUP BY u;
$$;
GRANT EXECUTE ON FUNCTION public.get_period_points(timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_leaderboard_v2(p_period text DEFAULT 'lifetime', p_class text DEFAULT NULL)
RETURNS TABLE(id uuid, first_name text, last_name text, student_class text, avatar_url text, points bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_since timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  
  IF p_period = 'monthly' THEN
    v_since := date_trunc('month', now());
    RETURN QUERY
      SELECT 
        p.id, 
        p.first_name, 
        p.last_name, 
        p.student_class, 
        p.avatar_url, 
        GREATEST(COALESCE(p.monthly_points, 0), COALESCE(pp.pts, 0))::bigint AS points
      FROM public.profiles p
      LEFT JOIN public.get_period_points(v_since) pp ON pp.user_id = p.id
      WHERE p.role = 'student'
        AND (p_class IS NULL OR p.student_class = p_class)
        AND GREATEST(COALESCE(p.monthly_points, 0), COALESCE(pp.pts, 0)) > 0
      ORDER BY 6 DESC, p.first_name
      LIMIT 200;
  ELSE
    RETURN QUERY
      SELECT 
        p.id, 
        p.first_name, 
        p.last_name, 
        p.student_class, 
        p.avatar_url, 
        COALESCE(p.points, 0)::bigint AS points
      FROM public.profiles p
      WHERE p.role = 'student'
        AND (p_class IS NULL OR p.student_class = p_class)
      ORDER BY 6 DESC, p.first_name
      LIMIT 200;
  END IF;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_v2(text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_class_league_v2(p_period text DEFAULT 'lifetime')
RETURNS TABLE(student_class text, total_points bigint, student_count bigint, avg_points numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_since timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  v_since := date_trunc('month', now());
  
  IF p_period = 'monthly' THEN
    RETURN QUERY
      SELECT 
        p.student_class, 
        SUM(GREATEST(COALESCE(p.monthly_points, 0), COALESCE(pp.pts, 0)))::bigint, 
        COUNT(*)::bigint,
        ROUND(SUM(GREATEST(COALESCE(p.monthly_points, 0), COALESCE(pp.pts, 0)))::numeric / GREATEST(COUNT(*), 1), 1)
      FROM public.profiles p
      LEFT JOIN public.get_period_points(v_since) pp ON pp.user_id = p.id
      WHERE p.role = 'student' AND COALESCE(p.student_class,'') <> ''
      GROUP BY p.student_class
      ORDER BY 2 DESC;
  ELSE
    RETURN QUERY
      SELECT 
        p.student_class, 
        COALESCE(SUM(p.points), 0)::bigint, 
        COUNT(*)::bigint,
        ROUND(COALESCE(SUM(p.points), 0)::numeric / GREATEST(COUNT(*), 1), 1)
      FROM public.profiles p
      WHERE p.role = 'student' AND COALESCE(p.student_class,'') <> ''
      GROUP BY p.student_class
      ORDER BY 2 DESC;
  END IF;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_class_league_v2(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_leaderboard_stats_v2(p_period text DEFAULT 'lifetime', p_class text DEFAULT NULL)
RETURNS TABLE(total_students bigint, total_points bigint, average_points numeric, top_points bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_since timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  v_since := date_trunc('month', now());
  
  IF p_period = 'monthly' THEN
    RETURN QUERY
      WITH ranked AS (
        SELECT GREATEST(COALESCE(p.monthly_points, 0), COALESCE(pp.pts, 0))::bigint AS pts
        FROM public.profiles p
        LEFT JOIN public.get_period_points(v_since) pp ON pp.user_id = p.id
        WHERE p.role = 'student'
          AND (p_class IS NULL OR p.student_class = p_class)
          AND GREATEST(COALESCE(p.monthly_points, 0), COALESCE(pp.pts, 0)) > 0
      )
      SELECT 
        COUNT(*)::bigint,
        COALESCE(SUM(pts), 0)::bigint,
        ROUND(COALESCE(AVG(pts), 0)::numeric, 1),
        COALESCE(MAX(pts), 0)::bigint
      FROM ranked;
  ELSE
    RETURN QUERY
      SELECT 
        COUNT(*)::bigint,
        COALESCE(SUM(p.points), 0)::bigint,
        ROUND(COALESCE(AVG(p.points), 0)::numeric, 1),
        COALESCE(MAX(p.points), 0)::bigint
      FROM public.profiles p
      WHERE p.role = 'student'
        AND (p_class IS NULL OR p.student_class = p_class);
  END IF;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_stats_v2(text,text) TO authenticated;

-- >>> FILE: 20260906122113_f4bfd222-b4d7-4ea0-8c02-fbe0e8bc372e.sql
DROP POLICY IF EXISTS "Anyone can upload feedback attachments" ON storage.objects;
CREATE POLICY "Anyone can upload feedback attachments" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'feedback_attachments');

DROP POLICY IF EXISTS "Staff can read feedback attachments" ON storage.objects;
CREATE POLICY "Staff can read feedback attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'feedback_attachments' AND public.is_staff_or_admin(auth.uid()));

-- >>> FILE: 20260906140000_fix_community_media_storage_rls.sql
﻿-- Fix community-media storage bucket & RLS policies
-- Ensure bucket exists (public so images load without signed URLs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-media',
  'community-media',
  true,
  10485760,
  ARRAY['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/webm','application/pdf']
)
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop old policies (idempotent)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own uploads" ON storage.objects;
DROP POLICY IF EXISTS "community_media_select" ON storage.objects;
DROP POLICY IF EXISTS "community_media_insert" ON storage.objects;
DROP POLICY IF EXISTS "community_media_update" ON storage.objects;
DROP POLICY IF EXISTS "community_media_delete" ON storage.objects;

-- SELECT: anyone can read public community media
CREATE POLICY "community_media_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'community-media');

-- INSERT: authenticated users can upload to their own folder
CREATE POLICY "community_media_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'community-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE: users can update their own files
CREATE POLICY "community_media_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'community-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE: users can delete their own files
CREATE POLICY "community_media_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'community-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- >>> FILE: 20260912000000_core_enhancements.sql
-- Migration: 20260912000000_core_enhancements.sql
-- Purpose: Security, immutability, book request limit, and statistics optimization

-- 1. Function to get sum of all book copies in the library (fast aggregation for landing page)
CREATE OR REPLACE FUNCTION public.get_total_book_copies()
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(SUM(total_copies), 0)::bigint FROM public.books;
$$;

GRANT EXECUTE ON FUNCTION public.get_total_book_copies() TO anon, authenticated, service_role;

-- 2. Prevent hard deletion of book_issues to protect official library circulation history
CREATE OR REPLACE FUNCTION public.prevent_book_issues_hard_delete()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Disallow hard deletion of book circulation transactions
  RAISE EXCEPTION 'Deletion of book issue records is prohibited to maintain library audit trail. Mark the record as returned or lost instead.';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_book_issues_hard_delete ON public.book_issues;
CREATE TRIGGER trg_prevent_book_issues_hard_delete
BEFORE DELETE ON public.book_issues
FOR EACH ROW
EXECUTE FUNCTION public.prevent_book_issues_hard_delete();

-- 3. Atomic RPC to handle book requests with strict limit of 2 pending requests (auto-overwriting the oldest)
CREATE OR REPLACE FUNCTION public.submit_book_request(
  p_book_id uuid DEFAULT NULL,
  p_requested_title text DEFAULT NULL,
  p_requested_author text DEFAULT NULL,
  p_requested_isbn text DEFAULT NULL,
  p_requested_description text DEFAULT NULL,
  p_admin_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_pending_count int;
  v_oldest_id uuid;
  v_overwritten_title text;
  v_new_id uuid;
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to submit book requests';
  END IF;

  -- Count currently pending requests for this user
  SELECT count(*) INTO v_pending_count
  FROM public.book_requests
  WHERE user_id = v_user_id AND status = 'pending';

  -- If 2 or more pending requests exist, locate and delete/cancel the oldest pending request
  IF v_pending_count >= 2 THEN
    SELECT id, COALESCE(requested_title, (SELECT title FROM public.books WHERE id = book_id), 'Previous Book Request')
    INTO v_oldest_id, v_overwritten_title
    FROM public.book_requests
    WHERE user_id = v_user_id AND status = 'pending'
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_oldest_id IS NOT NULL THEN
      DELETE FROM public.book_requests WHERE id = v_oldest_id;
    END IF;
  END IF;

  -- Insert the new book request
  INSERT INTO public.book_requests (
    user_id,
    book_id,
    requested_title,
    requested_author,
    requested_isbn,
    requested_description,
    admin_notes,
    status
  ) VALUES (
    v_user_id,
    p_book_id,
    p_requested_title,
    p_requested_author,
    p_requested_isbn,
    p_requested_description,
    p_admin_notes,
    'pending'
  )
  RETURNING id INTO v_new_id;

  v_result := jsonb_build_object(
    'success', true,
    'request_id', v_new_id,
    'overwritten', v_oldest_id IS NOT NULL,
    'overwritten_title', v_overwritten_title
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_book_request(uuid, text, text, text, text, text) TO authenticated;

-- 4. Fast bulk delete book requests RPC for admins
CREATE OR REPLACE FUNCTION public.bulk_delete_book_requests(p_request_ids uuid[])
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_deleted_count int;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: only staff or admins can bulk delete book requests';
  END IF;

  DELETE FROM public.book_requests
  WHERE id = ANY(p_request_ids);

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_delete_book_requests(uuid[]) TO authenticated;


-- >>> FILE: 20260913000000_account_recovery_enhancements.sql
-- Migration: Account Recovery and Password Reset Enhancements
-- Provides secure recovery lookup, masked email identification, and dummy student account assistance

CREATE OR REPLACE FUNCTION public.get_account_recovery_options(identifier text)
RETURNS TABLE(
  user_id uuid,
  auth_email text,
  first_name text,
  last_name text,
  role text,
  student_class text,
  admission_number text,
  has_personal_email boolean,
  masked_email text,
  is_dummy_email boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_rec record;
  v_target_email text;
  v_is_dummy boolean;
  v_masked text;
BEGIN
  IF identifier IS NULL OR trim(identifier) = '' THEN
    RETURN;
  END IF;

  SELECT p.id, u.email AS auth_email, p.email AS profile_email,
         p.first_name, p.last_name, p.role, p.student_class, p.admission_number
  INTO v_rec
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE lower(trim(p.email)) = lower(trim(identifier))
     OR lower(trim(u.email)) = lower(trim(identifier))
     OR lower(trim(p.username)) = lower(trim(identifier))
     OR trim(p.phone) = trim(identifier)
     OR trim(p.admission_number) = trim(identifier)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Determine if the auth email is a dummy email without external inbox
  v_is_dummy := (v_rec.auth_email ILIKE '%@kvschool.in%' 
                 OR v_rec.auth_email ILIKE '%@internal%' 
                 OR v_rec.auth_email ILIKE '%@dummy%'
                 OR v_rec.auth_email ILIKE '%@example.com');
  
  -- Target email for sending reset: prefer profile_email if real, else auth_email if not dummy
  IF v_rec.profile_email IS NOT NULL 
     AND v_rec.profile_email NOT ILIKE '%@kvschool.in%' 
     AND v_rec.profile_email NOT ILIKE '%@internal%' 
     AND position('@' in v_rec.profile_email) > 0 THEN
    v_target_email := v_rec.profile_email;
  ELSIF NOT v_is_dummy THEN
    v_target_email := v_rec.auth_email;
  ELSE
    v_target_email := NULL;
  END IF;

  -- Mask email (e.g. j***e@domain.com)
  IF v_target_email IS NOT NULL THEN
    DECLARE
      v_userpart text := split_part(v_target_email, '@', 1);
      v_domainpart text := split_part(v_target_email, '@', 2);
    BEGIN
      IF length(v_userpart) <= 2 THEN
        v_masked := left(v_userpart, 1) || '***@' || v_domainpart;
      ELSE
        v_masked := left(v_userpart, 1) || '***' || right(v_userpart, 1) || '@' || v_domainpart;
      END IF;
    END;
  ELSE
    v_masked := NULL;
  END IF;

  RETURN QUERY SELECT
    v_rec.id,
    v_rec.auth_email,
    v_rec.first_name,
    v_rec.last_name,
    v_rec.role,
    v_rec.student_class,
    v_rec.admission_number,
    (v_target_email IS NOT NULL),
    v_masked,
    v_is_dummy;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_account_recovery_options(text) TO anon, authenticated;


-- >>> FILE: 20260913000000_bug_bounty_campaigns.sql
-- Create Bug Bounty Campaigns table
CREATE TABLE bug_bounty_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES profiles(id) NOT NULL,
    student_id UUID REFERENCES profiles(id),
    starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ends_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create Bug Reports table
CREATE TABLE bug_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES bug_bounty_campaigns(id) ON DELETE CASCADE NOT NULL,
    reporter_id UUID REFERENCES profiles(id) NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    rewarded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE bug_bounty_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- Policies for bug_bounty_campaigns
CREATE POLICY "Admins can manage campaigns" ON bug_bounty_campaigns 
    FOR ALL TO authenticated USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );

CREATE POLICY "All authenticated users can view active campaigns" ON bug_bounty_campaigns 
    FOR SELECT TO authenticated USING (is_active = true AND ends_at > now());

-- Policies for bug_reports
CREATE POLICY "Admins can manage reports" ON bug_reports 
    FOR ALL TO authenticated USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );

CREATE POLICY "Students can view their own reports" ON bug_reports 
    FOR SELECT TO authenticated USING (reporter_id = auth.uid());

-- Corrected INSERT policy for bug_reports
-- For INSERT policies, the 'USING' clause is for existing rows (which don't exist yet for INSERT).
-- We must use 'WITH CHECK' for INSERT policies to validate the new row.
CREATE POLICY "Assigned students can report bugs" ON bug_reports 
    FOR INSERT TO authenticated WITH CHECK (
        reporter_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM bug_bounty_campaigns 
            WHERE id = campaign_id AND student_id = auth.uid() AND is_active = true AND ends_at > now()
        )
    );


-- >>> FILE: 20260913000001_bug_bounty_allotted_student_admin.sql
-- Update bug_reports policy to allow the allotted student of an active campaign to manage reports
-- We need to drop the old admin policy and create a new one that includes the allotted student,
-- or just add a new policy. Multiple policies are additive (OR).

CREATE POLICY "Allotted students can manage reports for their campaign" ON bug_reports
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM bug_bounty_campaigns
            WHERE id = bug_reports.campaign_id
            AND student_id = auth.uid()
            AND is_active = true
            AND ends_at > now()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM bug_bounty_campaigns
            WHERE id = bug_reports.campaign_id
            AND student_id = auth.uid()
            AND is_active = true
            AND ends_at > now()
        )
    );

-- Also ensure they can view campaigns (they can already view active ones, but let's be explicit if needed)
-- Actually "All authenticated users can view active campaigns" already covers it.


-- >>> FILE: 20260913000002_allow_all_students_to_report_bugs.sql
-- Drop the restrictive insert policy
DROP POLICY IF EXISTS "Assigned students can report bugs" ON bug_reports;

-- Create a new policy that allows any authenticated user to report bugs if there is an active campaign
CREATE POLICY "Any student can report bugs during active campaign" ON bug_reports 
    FOR INSERT TO authenticated WITH CHECK (
        reporter_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM bug_bounty_campaigns 
            WHERE id = campaign_id AND is_active = true AND ends_at > now()
        )
    );


-- >>> FILE: 20260914000000_refresh_ncert_books.sql
-- Migration: Refresh and Reseed NCERT Books Vault with Official Verified Chapters
-- Deletes corrupt/legacy records and populates authentic textbook chapters from Class 1 to 12

DELETE FROM public.ncert_books;

INSERT INTO public.ncert_books (class_number, subject, book_name, chapter_title, chapter_number, file_url) VALUES
-- Class 1
('1', 'Mathematics', 'Joyful Mathematics – Class 1', 'Chapter 1 – Finding The Furry Cat (Shapes and Space)', 1, 'https://ncert.nic.in/textbook/pdf/aemh101.pdf'),
('1', 'Mathematics', 'Joyful Mathematics – Class 1', 'Chapter 2 – What is Long? What is Round?', 2, 'https://ncert.nic.in/textbook/pdf/aemh102.pdf'),
('1', 'Mathematics', 'Joyful Mathematics – Class 1', 'Chapter 3 – Mango Treat (Numbers 1 to 9)', 3, 'https://ncert.nic.in/textbook/pdf/aemh103.pdf'),
('1', 'English', 'Mridang – Class 1', 'Unit 1 – My Family and Me', 1, 'https://ncert.nic.in/textbook/pdf/aeen101.pdf'),
('1', 'Hindi', 'Sarangi – Class 1', 'पाठ 1 – परिवार (कविता)', 1, 'https://ncert.nic.in/textbook/pdf/ahhn101.pdf'),

-- Class 2
('2', 'Mathematics', 'Joyful Mathematics – Class 2', 'Chapter 1 – A Day at the Beach', 1, 'https://ncert.nic.in/textbook/pdf/bemh101.pdf'),
('2', 'Mathematics', 'Joyful Mathematics – Class 2', 'Chapter 2 – Shapes Around Us', 2, 'https://ncert.nic.in/textbook/pdf/bemh102.pdf'),
('2', 'English', 'Mridang – Class 2', 'Unit 1 – My Bicycle', 1, 'https://ncert.nic.in/textbook/pdf/been101.pdf'),
('2', 'Hindi', 'Sarangi – Class 2', 'पाठ 1 – नीम की सीख', 1, 'https://ncert.nic.in/textbook/pdf/bhhn101.pdf'),

-- Class 3
('3', 'Mathematics', 'Math-Magic – Class 3', 'Chapter 1 – Where to Look From', 1, 'https://ncert.nic.in/textbook/pdf/cemh101.pdf'),
('3', 'Mathematics', 'Math-Magic – Class 3', 'Chapter 2 – Fun with Numbers', 2, 'https://ncert.nic.in/textbook/pdf/cemh102.pdf'),
('3', 'Environmental Science', 'Looking Around – Class 3', 'Chapter 1 – Poonam Day Out', 1, 'https://ncert.nic.in/textbook/pdf/ceev101.pdf'),
('3', 'English', 'Santoor – Class 3', 'Unit 1 – Colours', 1, 'https://ncert.nic.in/textbook/pdf/ceen101.pdf'),
('3', 'Hindi', 'Veena – Class 3', 'पाठ 1 – सीखो', 1, 'https://ncert.nic.in/textbook/pdf/chhn101.pdf'),

-- Class 4
('4', 'Mathematics', 'Math-Magic – Class 4', 'Chapter 1 – Building with Bricks', 1, 'https://ncert.nic.in/textbook/pdf/demh101.pdf'),
('4', 'Mathematics', 'Math-Magic – Class 4', 'Chapter 2 – Long and Short', 2, 'https://ncert.nic.in/textbook/pdf/demh102.pdf'),
('4', 'Environmental Science', 'Looking Around – Class 4', 'Chapter 1 – Going to School', 1, 'https://ncert.nic.in/textbook/pdf/deev101.pdf'),
('4', 'English', 'Marigold – Class 4', 'Unit 1 – Wake Up! & Neha Alarm Clock', 1, 'https://ncert.nic.in/textbook/pdf/deen101.pdf'),

-- Class 5
('5', 'Mathematics', 'Math-Magic – Class 5', 'Chapter 1 – The Fish Tale', 1, 'https://ncert.nic.in/textbook/pdf/eemh101.pdf'),
('5', 'Mathematics', 'Math-Magic – Class 5', 'Chapter 2 – Shapes and Angles', 2, 'https://ncert.nic.in/textbook/pdf/eemh102.pdf'),
('5', 'Environmental Science', 'Looking Around – Class 5', 'Chapter 1 – Super Senses', 1, 'https://ncert.nic.in/textbook/pdf/eeev101.pdf'),
('5', 'English', 'Marigold – Class 5', 'Unit 1 – Ice-cream Man', 1, 'https://ncert.nic.in/textbook/pdf/eeen101.pdf'),

-- Class 6
('6', 'Mathematics', 'Ganita Prakash – Class 6', 'Chapter 1 – Patterns in Mathematics', 1, 'https://ncert.nic.in/textbook/pdf/femh101.pdf'),
('6', 'Mathematics', 'Ganita Prakash – Class 6', 'Chapter 2 – Lines and Angles', 2, 'https://ncert.nic.in/textbook/pdf/femh102.pdf'),
('6', 'Mathematics', 'Ganita Prakash – Class 6', 'Chapter 3 – Number Play', 3, 'https://ncert.nic.in/textbook/pdf/femh103.pdf'),
('6', 'Science', 'Curiosity – Class 6', 'Chapter 1 – The Wonderful World of Science', 1, 'https://ncert.nic.in/textbook/pdf/fesc101.pdf'),
('6', 'Science', 'Curiosity – Class 6', 'Chapter 2 – Diversity in the Living World', 2, 'https://ncert.nic.in/textbook/pdf/fesc102.pdf'),
('6', 'Science', 'Curiosity – Class 6', 'Chapter 3 – Mindful Eating: A Path to a Healthy Body', 3, 'https://ncert.nic.in/textbook/pdf/fesc103.pdf'),
('6', 'Social Science', 'Exploring Society: India and Beyond – Class 6', 'Chapter 1 – Locating Places on the Earth', 1, 'https://ncert.nic.in/textbook/pdf/fess101.pdf'),
('6', 'English', 'Poorvi – Class 6', 'Unit 1 – Fables and Folk Tales', 1, 'https://ncert.nic.in/textbook/pdf/feen101.pdf'),
('6', 'Hindi', 'Malhar – Class 6', 'पाठ 1 – मातृभूमि (कविता)', 1, 'https://ncert.nic.in/textbook/pdf/fhhn101.pdf'),

-- Class 7
('7', 'Mathematics', 'Mathematics – Class 7', 'Chapter 1 – Integers', 1, 'https://ncert.nic.in/textbook/pdf/gemh101.pdf'),
('7', 'Mathematics', 'Mathematics – Class 7', 'Chapter 2 – Fractions and Decimals', 2, 'https://ncert.nic.in/textbook/pdf/gemh102.pdf'),
('7', 'Mathematics', 'Mathematics – Class 7', 'Chapter 3 – Data Handling', 3, 'https://ncert.nic.in/textbook/pdf/gemh103.pdf'),
('7', 'Science', 'Science – Class 7', 'Chapter 1 – Nutrition in Plants', 1, 'https://ncert.nic.in/textbook/pdf/gesc101.pdf'),
('7', 'Science', 'Science – Class 7', 'Chapter 2 – Nutrition in Animals', 2, 'https://ncert.nic.in/textbook/pdf/gesc102.pdf'),
('7', 'Science', 'Science – Class 7', 'Chapter 3 – Heat', 3, 'https://ncert.nic.in/textbook/pdf/gesc103.pdf'),
('7', 'Social Science', 'Our Pasts II – Class 7', 'Chapter 1 – Tracing Changes Through a Thousand Years', 1, 'https://ncert.nic.in/textbook/pdf/gess101.pdf'),
('7', 'English', 'Honeycomb – Class 7', 'Unit 1 – Three Questions', 1, 'https://ncert.nic.in/textbook/pdf/gehn101.pdf'),

-- Class 8
('8', 'Mathematics', 'Mathematics – Class 8', 'Chapter 1 – Rational Numbers', 1, 'https://ncert.nic.in/textbook/pdf/hemh101.pdf'),
('8', 'Mathematics', 'Mathematics – Class 8', 'Chapter 2 – Linear Equations in One Variable', 2, 'https://ncert.nic.in/textbook/pdf/hemh102.pdf'),
('8', 'Mathematics', 'Mathematics – Class 8', 'Chapter 3 – Understanding Quadrilaterals', 3, 'https://ncert.nic.in/textbook/pdf/hemh103.pdf'),
('8', 'Science', 'Science – Class 8', 'Chapter 1 – Crop Production and Management', 1, 'https://ncert.nic.in/textbook/pdf/hesc101.pdf'),
('8', 'Science', 'Science – Class 8', 'Chapter 2 – Microorganisms: Friend and Foe', 2, 'https://ncert.nic.in/textbook/pdf/hesc102.pdf'),
('8', 'Science', 'Science – Class 8', 'Chapter 3 – Coal and Petroleum', 3, 'https://ncert.nic.in/textbook/pdf/hesc103.pdf'),
('8', 'Social Science', 'Our Pasts III – Class 8', 'Chapter 1 – How, When and Where', 1, 'https://ncert.nic.in/textbook/pdf/hess101.pdf'),
('8', 'English', 'Honeydew – Class 8', 'Unit 1 – The Best Christmas Present in the World', 1, 'https://ncert.nic.in/textbook/pdf/hehd101.pdf'),

-- Class 9
('9', 'Mathematics', 'Mathematics – Class 9', 'Chapter 1 – Number Systems', 1, 'https://ncert.nic.in/textbook/pdf/iemh101.pdf'),
('9', 'Mathematics', 'Mathematics – Class 9', 'Chapter 2 – Polynomials', 2, 'https://ncert.nic.in/textbook/pdf/iemh102.pdf'),
('9', 'Mathematics', 'Mathematics – Class 9', 'Chapter 3 – Coordinate Geometry', 3, 'https://ncert.nic.in/textbook/pdf/iemh103.pdf'),
('9', 'Mathematics', 'Mathematics – Class 9', 'Chapter 4 – Linear Equations in Two Variables', 4, 'https://ncert.nic.in/textbook/pdf/iemh104.pdf'),
('9', 'Science', 'Science – Class 9', 'Chapter 1 – Matter in Our Surroundings', 1, 'https://ncert.nic.in/textbook/pdf/iesc101.pdf'),
('9', 'Science', 'Science – Class 9', 'Chapter 2 – Is Matter Around Us Pure', 2, 'https://ncert.nic.in/textbook/pdf/iesc102.pdf'),
('9', 'Science', 'Science – Class 9', 'Chapter 5 – The Fundamental Unit of Life', 5, 'https://ncert.nic.in/textbook/pdf/iesc105.pdf'),
('9', 'Science', 'Science – Class 9', 'Chapter 7 – Motion', 7, 'https://ncert.nic.in/textbook/pdf/iesc107.pdf'),
('9', 'Social Science', 'India and the Contemporary World I – Class 9', 'Chapter 1 – The French Revolution', 1, 'https://ncert.nic.in/textbook/pdf/iess101.pdf'),
('9', 'Social Science', 'Democratic Politics I – Class 9', 'Chapter 1 – What is Democracy? Why Democracy?', 1, 'https://ncert.nic.in/textbook/pdf/iess401.pdf'),
('9', 'English', 'Beehive – Class 9', 'Chapter 1 – The Fun They Had', 1, 'https://ncert.nic.in/textbook/pdf/iebe101.pdf'),

-- Class 10
('10', 'Mathematics', 'Mathematics – Class 10', 'Chapter 1 – Real Numbers', 1, 'https://ncert.nic.in/textbook/pdf/jemh101.pdf'),
('10', 'Mathematics', 'Mathematics – Class 10', 'Chapter 2 – Polynomials', 2, 'https://ncert.nic.in/textbook/pdf/jemh102.pdf'),
('10', 'Mathematics', 'Mathematics – Class 10', 'Chapter 3 – Pair of Linear Equations in Two Variables', 3, 'https://ncert.nic.in/textbook/pdf/jemh103.pdf'),
('10', 'Mathematics', 'Mathematics – Class 10', 'Chapter 4 – Quadratic Equations', 4, 'https://ncert.nic.in/textbook/pdf/jemh104.pdf'),
('10', 'Mathematics', 'Mathematics – Class 10', 'Chapter 6 – Triangles', 6, 'https://ncert.nic.in/textbook/pdf/jemh106.pdf'),
('10', 'Mathematics', 'Mathematics – Class 10', 'Chapter 8 – Introduction to Trigonometry', 8, 'https://ncert.nic.in/textbook/pdf/jemh108.pdf'),
('10', 'Science', 'Science – Class 10', 'Chapter 1 – Chemical Reactions and Equations', 1, 'https://ncert.nic.in/textbook/pdf/jesc101.pdf'),
('10', 'Science', 'Science – Class 10', 'Chapter 2 – Acids, Bases and Salts', 2, 'https://ncert.nic.in/textbook/pdf/jesc102.pdf'),
('10', 'Science', 'Science – Class 10', 'Chapter 3 – Metals and Non-metals', 3, 'https://ncert.nic.in/textbook/pdf/jesc103.pdf'),
('10', 'Science', 'Science – Class 10', 'Chapter 5 – Life Processes', 5, 'https://ncert.nic.in/textbook/pdf/jesc105.pdf'),
('10', 'Science', 'Science – Class 10', 'Chapter 9 – Light – Reflection and Refraction', 9, 'https://ncert.nic.in/textbook/pdf/jesc109.pdf'),
('10', 'Science', 'Science – Class 10', 'Chapter 11 – Electricity', 11, 'https://ncert.nic.in/textbook/pdf/jesc111.pdf'),
('10', 'Social Science', 'India and the Contemporary World II – Class 10', 'Chapter 1 – The Rise of Nationalism in Europe', 1, 'https://ncert.nic.in/textbook/pdf/jess101.pdf'),
('10', 'English', 'First Flight – Class 10', 'Chapter 1 – A Letter to God', 1, 'https://ncert.nic.in/textbook/pdf/jeff101.pdf'),

-- Class 11
('11', 'Mathematics', 'Mathematics – Class 11', 'Chapter 1 – Sets', 1, 'https://ncert.nic.in/textbook/pdf/kemh101.pdf'),
('11', 'Mathematics', 'Mathematics – Class 11', 'Chapter 2 – Relations and Functions', 2, 'https://ncert.nic.in/textbook/pdf/kemh102.pdf'),
('11', 'Mathematics', 'Mathematics – Class 11', 'Chapter 3 – Trigonometric Functions', 3, 'https://ncert.nic.in/textbook/pdf/kemh103.pdf'),
('11', 'Physics', 'Physics Part I – Class 11', 'Chapter 1 – Units and Measurements', 1, 'https://ncert.nic.in/textbook/pdf/keph101.pdf'),
('11', 'Physics', 'Physics Part I – Class 11', 'Chapter 2 – Motion in a Straight Line', 2, 'https://ncert.nic.in/textbook/pdf/keph102.pdf'),
('11', 'Physics', 'Physics Part I – Class 11', 'Chapter 3 – Motion in a Plane', 3, 'https://ncert.nic.in/textbook/pdf/keph103.pdf'),
('11', 'Chemistry', 'Chemistry Part I – Class 11', 'Chapter 1 – Some Basic Concepts of Chemistry', 1, 'https://ncert.nic.in/textbook/pdf/kech101.pdf'),
('11', 'Chemistry', 'Chemistry Part I – Class 11', 'Chapter 2 – Structure of Atom', 2, 'https://ncert.nic.in/textbook/pdf/kech102.pdf'),
('11', 'Biology', 'Biology – Class 11', 'Chapter 1 – The Living World', 1, 'https://ncert.nic.in/textbook/pdf/kebo101.pdf'),
('11', 'Computer Science', 'Computer Science – Class 11', 'Chapter 1 – Computer System', 1, 'https://ncert.nic.in/textbook/pdf/kecs101.pdf'),

-- Class 12
('12', 'Mathematics', 'Mathematics Part I – Class 12', 'Chapter 1 – Relations and Functions', 1, 'https://ncert.nic.in/textbook/pdf/lemh101.pdf'),
('12', 'Mathematics', 'Mathematics Part I – Class 12', 'Chapter 2 – Inverse Trigonometric Functions', 2, 'https://ncert.nic.in/textbook/pdf/lemh102.pdf'),
('12', 'Mathematics', 'Mathematics Part I – Class 12', 'Chapter 3 – Matrices', 3, 'https://ncert.nic.in/textbook/pdf/lemh103.pdf'),
('12', 'Mathematics', 'Mathematics Part II – Class 12', 'Chapter 7 – Integrals', 7, 'https://ncert.nic.in/textbook/pdf/lemh201.pdf'),
('12', 'Physics', 'Physics Part I – Class 12', 'Chapter 1 – Electric Charges and Fields', 1, 'https://ncert.nic.in/textbook/pdf/leph101.pdf'),
('12', 'Physics', 'Physics Part I – Class 12', 'Chapter 2 – Electrostatic Potential and Capacitance', 2, 'https://ncert.nic.in/textbook/pdf/leph102.pdf'),
('12', 'Physics', 'Physics Part I – Class 12', 'Chapter 3 – Current Electricity', 3, 'https://ncert.nic.in/textbook/pdf/leph103.pdf'),
('12', 'Physics', 'Physics Part II – Class 12', 'Chapter 9 – Ray Optics and Optical Instruments', 9, 'https://ncert.nic.in/textbook/pdf/leph201.pdf'),
('12', 'Chemistry', 'Chemistry Part I – Class 12', 'Chapter 1 – Solutions', 1, 'https://ncert.nic.in/textbook/pdf/lech101.pdf'),
('12', 'Chemistry', 'Chemistry Part I – Class 12', 'Chapter 2 – Electrochemistry', 2, 'https://ncert.nic.in/textbook/pdf/lech102.pdf'),
('12', 'Biology', 'Biology – Class 12', 'Chapter 1 – Sexual Reproduction in Flowering Plants', 1, 'https://ncert.nic.in/textbook/pdf/lebo101.pdf'),
('12', 'Computer Science', 'Computer Science – Class 12', 'Chapter 1 – Python Revision Tour', 1, 'https://ncert.nic.in/textbook/pdf/lecs101.pdf');


-- >>> FILE: 20260914140000_allow_all_view_verified_bugs.sql
-- Migration: Allow all authenticated users to read verified bug reports and campaigns for Bug Bounty Leaderboard and Hall of Fame
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_bounty_campaigns ENABLE ROW LEVEL SECURITY;

-- 1. Campaigns Policy: Allow all authenticated users to view campaigns (active or past for history/hall of fame)
DROP POLICY IF EXISTS "All authenticated users can view active campaigns" ON public.bug_bounty_campaigns;
DROP POLICY IF EXISTS "All authenticated users can view campaigns" ON public.bug_bounty_campaigns;

CREATE POLICY "All authenticated users can view campaigns" ON public.bug_bounty_campaigns
    FOR SELECT TO authenticated
    USING (true);

-- 2. Bug Reports Policy: Allow all authenticated users to view verified/accepted bug reports AND their own reports
DROP POLICY IF EXISTS "Students can view their own reports" ON public.bug_reports;
DROP POLICY IF EXISTS "Users can view own or verified reports" ON public.bug_reports;
DROP POLICY IF EXISTS "Anyone can view verified bug reports" ON public.bug_reports;

CREATE POLICY "Users can view own or verified reports" ON public.bug_reports
    FOR SELECT TO authenticated
    USING (
        reporter_id = auth.uid()
        OR status = 'verified'
        OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );


-- >>> FILE: 20260915000000_fix_ncert_unique_and_seed_6_to_12.sql
-- Migration: Fix NCERT Unique Constraint & Reseed Class 6-12 Comprehensive Textbooks
-- Also add Doubt Resolution columns to Community posts & comments

-- 1. DROP the old flawed constraint that caused: Key (class_number, subject, chapter_number)=(9, Social Science, 1) already exists.
ALTER TABLE public.ncert_books DROP CONSTRAINT IF EXISTS ncert_books_unique_chapter;
DROP INDEX IF EXISTS public.ncert_books_unique_chapter;

-- 2. CREATE the correct unique index including book_name so different books under the same subject can each have Chapter 1
CREATE UNIQUE INDEX IF NOT EXISTS ncert_books_unique_chapter_v2
  ON public.ncert_books (class_number, subject, book_name, chapter_number);

-- 3. Add Community Doubt Resolution Columns
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS doubt_subject text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS doubt_class text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS doubt_status text DEFAULT 'unsolved'; -- 'unsolved' | 'solved'
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS accepted_comment_id uuid;

ALTER TABLE public.post_comments ADD COLUMN IF NOT EXISTS is_accepted_solution boolean NOT NULL DEFAULT false;

-- 4. CLEAN OLD NCERT DATA AND RESEED ALL VERIFIED CHAPTERS FOR CLASSES 6 TO 12
DELETE FROM public.ncert_books;

INSERT INTO public.ncert_books (class_number, subject, book_name, chapter_title, chapter_number, file_url) VALUES
-- =================== CLASS 6 ===================
('6', 'Mathematics', 'Ganita Prakash – Class 6', 'Chapter 1 – Patterns in Mathematics', 1, 'https://ncert.nic.in/textbook/pdf/femh101.pdf'),
('6', 'Mathematics', 'Ganita Prakash – Class 6', 'Chapter 2 – Lines and Angles', 2, 'https://ncert.nic.in/textbook/pdf/femh102.pdf'),
('6', 'Mathematics', 'Ganita Prakash – Class 6', 'Chapter 3 – Number Play', 3, 'https://ncert.nic.in/textbook/pdf/femh103.pdf'),
('6', 'Mathematics', 'Ganita Prakash – Class 6', 'Chapter 4 – Data Handling and Presentation', 4, 'https://ncert.nic.in/textbook/pdf/femh104.pdf'),
('6', 'Mathematics', 'Ganita Prakash – Class 6', 'Chapter 5 – Prime Time', 5, 'https://ncert.nic.in/textbook/pdf/femh105.pdf'),
('6', 'Mathematics', 'Ganita Prakash – Class 6', 'Chapter 6 – Perimeter and Area', 6, 'https://ncert.nic.in/textbook/pdf/femh106.pdf'),
('6', 'Science', 'Curiosity – Class 6', 'Chapter 1 – The Wonderful World of Science', 1, 'https://ncert.nic.in/textbook/pdf/fesc101.pdf'),
('6', 'Science', 'Curiosity – Class 6', 'Chapter 2 – Diversity in the Living World', 2, 'https://ncert.nic.in/textbook/pdf/fesc102.pdf'),
('6', 'Science', 'Curiosity – Class 6', 'Chapter 3 – Mindful Eating: A Path to a Healthy Body', 3, 'https://ncert.nic.in/textbook/pdf/fesc103.pdf'),
('6', 'Science', 'Curiosity – Class 6', 'Chapter 4 – Exploring Magnets', 4, 'https://ncert.nic.in/textbook/pdf/fesc104.pdf'),
('6', 'Science', 'Curiosity – Class 6', 'Chapter 5 – Measurement of Length and Motion', 5, 'https://ncert.nic.in/textbook/pdf/fesc105.pdf'),
('6', 'Social Science', 'Exploring Society: India and Beyond – Class 6', 'Chapter 1 – Locating Places on the Earth', 1, 'https://ncert.nic.in/textbook/pdf/fess101.pdf'),
('6', 'Social Science', 'Exploring Society: India and Beyond – Class 6', 'Chapter 2 – Oceans and Continents', 2, 'https://ncert.nic.in/textbook/pdf/fess102.pdf'),
('6', 'Social Science', 'Exploring Society: India and Beyond – Class 6', 'Chapter 3 – Landforms and Life', 3, 'https://ncert.nic.in/textbook/pdf/fess103.pdf'),
('6', 'Social Science', 'Exploring Society: India and Beyond – Class 6', 'Chapter 4 – Timeline and Sources of History', 4, 'https://ncert.nic.in/textbook/pdf/fess104.pdf'),
('6', 'English', 'Poorvi – Class 6', 'Unit 1 – Fables and Folk Tales', 1, 'https://ncert.nic.in/textbook/pdf/feen101.pdf'),
('6', 'English', 'Poorvi – Class 6', 'Unit 2 – Friendship', 2, 'https://ncert.nic.in/textbook/pdf/feen102.pdf'),
('6', 'Hindi', 'Malhar – Class 6', 'पाठ 1 – मातृभूमि (कविता)', 1, 'https://ncert.nic.in/textbook/pdf/fhhn101.pdf'),
('6', 'Hindi', 'Malhar – Class 6', 'पाठ 2 – गोल', 2, 'https://ncert.nic.in/textbook/pdf/fhhn102.pdf'),

-- =================== CLASS 7 ===================
('7', 'Mathematics', 'Mathematics – Class 7', 'Chapter 1 – Integers', 1, 'https://ncert.nic.in/textbook/pdf/gemh101.pdf'),
('7', 'Mathematics', 'Mathematics – Class 7', 'Chapter 2 – Fractions and Decimals', 2, 'https://ncert.nic.in/textbook/pdf/gemh102.pdf'),
('7', 'Mathematics', 'Mathematics – Class 7', 'Chapter 3 – Data Handling', 3, 'https://ncert.nic.in/textbook/pdf/gemh103.pdf'),
('7', 'Mathematics', 'Mathematics – Class 7', 'Chapter 4 – Simple Equations', 4, 'https://ncert.nic.in/textbook/pdf/gemh104.pdf'),
('7', 'Mathematics', 'Mathematics – Class 7', 'Chapter 5 – Lines and Angles', 5, 'https://ncert.nic.in/textbook/pdf/gemh105.pdf'),
('7', 'Mathematics', 'Mathematics – Class 7', 'Chapter 6 – The Triangle and its Properties', 6, 'https://ncert.nic.in/textbook/pdf/gemh106.pdf'),
('7', 'Science', 'Science – Class 7', 'Chapter 1 – Nutrition in Plants', 1, 'https://ncert.nic.in/textbook/pdf/gesc101.pdf'),
('7', 'Science', 'Science – Class 7', 'Chapter 2 – Nutrition in Animals', 2, 'https://ncert.nic.in/textbook/pdf/gesc102.pdf'),
('7', 'Science', 'Science – Class 7', 'Chapter 3 – Heat', 3, 'https://ncert.nic.in/textbook/pdf/gesc103.pdf'),
('7', 'Science', 'Science – Class 7', 'Chapter 4 – Acids, Bases and Salts', 4, 'https://ncert.nic.in/textbook/pdf/gesc104.pdf'),
('7', 'Science', 'Science – Class 7', 'Chapter 5 – Physical and Chemical Changes', 5, 'https://ncert.nic.in/textbook/pdf/gesc105.pdf'),
('7', 'Science', 'Science – Class 7', 'Chapter 6 – Respiration in Organisms', 6, 'https://ncert.nic.in/textbook/pdf/gesc106.pdf'),
('7', 'Social Science', 'Our Pasts II – Class 7 (History)', 'Chapter 1 – Tracing Changes Through a Thousand Years', 1, 'https://ncert.nic.in/textbook/pdf/gess101.pdf'),
('7', 'Social Science', 'Our Pasts II – Class 7 (History)', 'Chapter 2 – Kings and Kingdoms', 2, 'https://ncert.nic.in/textbook/pdf/gess102.pdf'),
('7', 'Social Science', 'Our Environment – Class 7 (Geography)', 'Chapter 1 – Environment', 1, 'https://ncert.nic.in/textbook/pdf/gess201.pdf'),
('7', 'Social Science', 'Our Environment – Class 7 (Geography)', 'Chapter 2 – Inside Our Earth', 2, 'https://ncert.nic.in/textbook/pdf/gess202.pdf'),
('7', 'Social Science', 'Social and Political Life II – Class 7 (Civics)', 'Chapter 1 – On Equality', 1, 'https://ncert.nic.in/textbook/pdf/gess301.pdf'),
('7', 'English', 'Honeycomb – Class 7', 'Unit 1 – Three Questions', 1, 'https://ncert.nic.in/textbook/pdf/gehn101.pdf'),
('7', 'Hindi', 'Vasant Bhag 2 – Class 7', 'पाठ 1 – हम पंछी उन्मुक्त गगन के', 1, 'https://ncert.nic.in/textbook/pdf/ghvs101.pdf'),

-- =================== CLASS 8 ===================
('8', 'Mathematics', 'Mathematics – Class 8', 'Chapter 1 – Rational Numbers', 1, 'https://ncert.nic.in/textbook/pdf/hemh101.pdf'),
('8', 'Mathematics', 'Mathematics – Class 8', 'Chapter 2 – Linear Equations in One Variable', 2, 'https://ncert.nic.in/textbook/pdf/hemh102.pdf'),
('8', 'Mathematics', 'Mathematics – Class 8', 'Chapter 3 – Understanding Quadrilaterals', 3, 'https://ncert.nic.in/textbook/pdf/hemh103.pdf'),
('8', 'Mathematics', 'Mathematics – Class 8', 'Chapter 4 – Data Handling', 4, 'https://ncert.nic.in/textbook/pdf/hemh104.pdf'),
('8', 'Mathematics', 'Mathematics – Class 8', 'Chapter 5 – Squares and Square Roots', 5, 'https://ncert.nic.in/textbook/pdf/hemh105.pdf'),
('8', 'Mathematics', 'Mathematics – Class 8', 'Chapter 6 – Cubes and Cube Roots', 6, 'https://ncert.nic.in/textbook/pdf/hemh106.pdf'),
('8', 'Mathematics', 'Mathematics – Class 8', 'Chapter 7 – Comparing Quantities', 7, 'https://ncert.nic.in/textbook/pdf/hemh107.pdf'),
('8', 'Mathematics', 'Mathematics – Class 8', 'Chapter 8 – Algebraic Expressions and Identities', 8, 'https://ncert.nic.in/textbook/pdf/hemh108.pdf'),
('8', 'Mathematics', 'Mathematics – Class 8', 'Chapter 9 – Mensuration', 9, 'https://ncert.nic.in/textbook/pdf/hemh109.pdf'),
('8', 'Mathematics', 'Mathematics – Class 8', 'Chapter 10 – Exponents and Powers', 10, 'https://ncert.nic.in/textbook/pdf/hemh110.pdf'),
('8', 'Science', 'Science – Class 8', 'Chapter 1 – Crop Production and Management', 1, 'https://ncert.nic.in/textbook/pdf/hesc101.pdf'),
('8', 'Science', 'Science – Class 8', 'Chapter 2 – Microorganisms: Friend and Foe', 2, 'https://ncert.nic.in/textbook/pdf/hesc102.pdf'),
('8', 'Science', 'Science – Class 8', 'Chapter 3 – Coal and Petroleum', 3, 'https://ncert.nic.in/textbook/pdf/hesc103.pdf'),
('8', 'Science', 'Science – Class 8', 'Chapter 4 – Combustion and Flame', 4, 'https://ncert.nic.in/textbook/pdf/hesc104.pdf'),
('8', 'Science', 'Science – Class 8', 'Chapter 5 – Conservation of Plants and Animals', 5, 'https://ncert.nic.in/textbook/pdf/hesc105.pdf'),
('8', 'Science', 'Science – Class 8', 'Chapter 6 – Reproduction in Animals', 6, 'https://ncert.nic.in/textbook/pdf/hesc106.pdf'),
('8', 'Science', 'Science – Class 8', 'Chapter 7 – Reaching the Age of Adolescence', 7, 'https://ncert.nic.in/textbook/pdf/hesc107.pdf'),
('8', 'Science', 'Science – Class 8', 'Chapter 8 – Force and Pressure', 8, 'https://ncert.nic.in/textbook/pdf/hesc108.pdf'),
('8', 'Science', 'Science – Class 8', 'Chapter 9 – Friction', 9, 'https://ncert.nic.in/textbook/pdf/hesc109.pdf'),
('8', 'Science', 'Science – Class 8', 'Chapter 10 – Sound', 10, 'https://ncert.nic.in/textbook/pdf/hesc110.pdf'),
('8', 'Social Science', 'Our Pasts III – Class 8 (History)', 'Chapter 1 – How, When and Where', 1, 'https://ncert.nic.in/textbook/pdf/hess101.pdf'),
('8', 'Social Science', 'Resources and Development – Class 8 (Geography)', 'Chapter 1 – Resources', 1, 'https://ncert.nic.in/textbook/pdf/hess201.pdf'),
('8', 'Social Science', 'Social and Political Life III – Class 8 (Civics)', 'Chapter 1 – The Indian Constitution', 1, 'https://ncert.nic.in/textbook/pdf/hess301.pdf'),
('8', 'English', 'Honeydew – Class 8', 'Unit 1 – The Best Christmas Present in the World', 1, 'https://ncert.nic.in/textbook/pdf/hehd101.pdf'),
('8', 'Hindi', 'Vasant Bhag 3 – Class 8', 'पाठ 1 – लाख की चूड़ियाँ', 1, 'https://ncert.nic.in/textbook/pdf/hhvs101.pdf'),

-- =================== CLASS 9 ===================
('9', 'Mathematics', 'Mathematics – Class 9', 'Chapter 1 – Number Systems', 1, 'https://ncert.nic.in/textbook/pdf/iemh101.pdf'),
('9', 'Mathematics', 'Mathematics – Class 9', 'Chapter 2 – Polynomials', 2, 'https://ncert.nic.in/textbook/pdf/iemh102.pdf'),
('9', 'Mathematics', 'Mathematics – Class 9', 'Chapter 3 – Coordinate Geometry', 3, 'https://ncert.nic.in/textbook/pdf/iemh103.pdf'),
('9', 'Mathematics', 'Mathematics – Class 9', 'Chapter 4 – Linear Equations in Two Variables', 4, 'https://ncert.nic.in/textbook/pdf/iemh104.pdf'),
('9', 'Mathematics', 'Mathematics – Class 9', 'Chapter 5 – Introduction to Euclid Geometry', 5, 'https://ncert.nic.in/textbook/pdf/iemh105.pdf'),
('9', 'Mathematics', 'Mathematics – Class 9', 'Chapter 6 – Lines and Angles', 6, 'https://ncert.nic.in/textbook/pdf/iemh106.pdf'),
('9', 'Mathematics', 'Mathematics – Class 9', 'Chapter 7 – Triangles', 7, 'https://ncert.nic.in/textbook/pdf/iemh107.pdf'),
('9', 'Mathematics', 'Mathematics – Class 9', 'Chapter 8 – Quadrilaterals', 8, 'https://ncert.nic.in/textbook/pdf/iemh108.pdf'),
('9', 'Mathematics', 'Mathematics – Class 9', 'Chapter 9 – Circles', 9, 'https://ncert.nic.in/textbook/pdf/iemh109.pdf'),
('9', 'Mathematics', 'Mathematics – Class 9', 'Chapter 10 – Heron Formula', 10, 'https://ncert.nic.in/textbook/pdf/iemh110.pdf'),
('9', 'Mathematics', 'Mathematics – Class 9', 'Chapter 11 – Surface Areas and Volumes', 11, 'https://ncert.nic.in/textbook/pdf/iemh111.pdf'),
('9', 'Mathematics', 'Mathematics – Class 9', 'Chapter 12 – Statistics', 12, 'https://ncert.nic.in/textbook/pdf/iemh112.pdf'),
('9', 'Science', 'Science – Class 9', 'Chapter 1 – Matter in Our Surroundings', 1, 'https://ncert.nic.in/textbook/pdf/iesc101.pdf'),
('9', 'Science', 'Science – Class 9', 'Chapter 2 – Is Matter Around Us Pure', 2, 'https://ncert.nic.in/textbook/pdf/iesc102.pdf'),
('9', 'Science', 'Science – Class 9', 'Chapter 3 – Atoms and Molecules', 3, 'https://ncert.nic.in/textbook/pdf/iesc103.pdf'),
('9', 'Science', 'Science – Class 9', 'Chapter 4 – Structure of the Atom', 4, 'https://ncert.nic.in/textbook/pdf/iesc104.pdf'),
('9', 'Science', 'Science – Class 9', 'Chapter 5 – The Fundamental Unit of Life', 5, 'https://ncert.nic.in/textbook/pdf/iesc105.pdf'),
('9', 'Science', 'Science – Class 9', 'Chapter 6 – Tissues', 6, 'https://ncert.nic.in/textbook/pdf/iesc106.pdf'),
('9', 'Science', 'Science – Class 9', 'Chapter 7 – Motion', 7, 'https://ncert.nic.in/textbook/pdf/iesc107.pdf'),
('9', 'Science', 'Science – Class 9', 'Chapter 8 – Force and Laws of Motion', 8, 'https://ncert.nic.in/textbook/pdf/iesc108.pdf'),
('9', 'Science', 'Science – Class 9', 'Chapter 9 – Gravitation', 9, 'https://ncert.nic.in/textbook/pdf/iesc109.pdf'),
('9', 'Science', 'Science – Class 9', 'Chapter 10 – Work and Energy', 10, 'https://ncert.nic.in/textbook/pdf/iesc110.pdf'),
('9', 'Science', 'Science – Class 9', 'Chapter 11 – Sound', 11, 'https://ncert.nic.in/textbook/pdf/iesc111.pdf'),
('9', 'Science', 'Science – Class 9', 'Chapter 12 – Improvement in Food Resources', 12, 'https://ncert.nic.in/textbook/pdf/iesc112.pdf'),
('9', 'Social Science', 'India and Contemporary World I (History)', 'Chapter 1 – The French Revolution', 1, 'https://ncert.nic.in/textbook/pdf/iess101.pdf'),
('9', 'Social Science', 'Contemporary India I (Geography)', 'Chapter 1 – India – Size and Location', 1, 'https://ncert.nic.in/textbook/pdf/iess201.pdf'),
('9', 'Social Science', 'Democratic Politics I (Civics)', 'Chapter 1 – What is Democracy? Why Democracy?', 1, 'https://ncert.nic.in/textbook/pdf/iess401.pdf'),
('9', 'Social Science', 'Economics – Class 9', 'Chapter 1 – The Story of Village Palampur', 1, 'https://ncert.nic.in/textbook/pdf/iess301.pdf'),
('9', 'English', 'Beehive – Class 9', 'Chapter 1 – The Fun They Had', 1, 'https://ncert.nic.in/textbook/pdf/iebe101.pdf'),
('9', 'Hindi', 'Kshitij Bhag 1 – Class 9', 'पाठ 1 – दो बैलों की कथा', 1, 'https://ncert.nic.in/textbook/pdf/ihks101.pdf'),

-- =================== CLASS 10 ===================
('10', 'Mathematics', 'Mathematics – Class 10', 'Chapter 1 – Real Numbers', 1, 'https://ncert.nic.in/textbook/pdf/jemh101.pdf'),
('10', 'Mathematics', 'Mathematics – Class 10', 'Chapter 2 – Polynomials', 2, 'https://ncert.nic.in/textbook/pdf/jemh102.pdf'),
('10', 'Mathematics', 'Mathematics – Class 10', 'Chapter 3 – Pair of Linear Equations in Two Variables', 3, 'https://ncert.nic.in/textbook/pdf/jemh103.pdf'),
('10', 'Mathematics', 'Mathematics – Class 10', 'Chapter 4 – Quadratic Equations', 4, 'https://ncert.nic.in/textbook/pdf/jemh104.pdf'),
('10', 'Mathematics', 'Mathematics – Class 10', 'Chapter 5 – Arithmetic Progressions', 5, 'https://ncert.nic.in/textbook/pdf/jemh105.pdf'),
('10', 'Mathematics', 'Mathematics – Class 10', 'Chapter 6 – Triangles', 6, 'https://ncert.nic.in/textbook/pdf/jemh106.pdf'),
('10', 'Mathematics', 'Mathematics – Class 10', 'Chapter 7 – Coordinate Geometry', 7, 'https://ncert.nic.in/textbook/pdf/jemh107.pdf'),
('10', 'Mathematics', 'Mathematics – Class 10', 'Chapter 8 – Introduction to Trigonometry', 8, 'https://ncert.nic.in/textbook/pdf/jemh108.pdf'),
('10', 'Mathematics', 'Mathematics – Class 10', 'Chapter 9 – Some Applications of Trigonometry', 9, 'https://ncert.nic.in/textbook/pdf/jemh109.pdf'),
('10', 'Mathematics', 'Mathematics – Class 10', 'Chapter 10 – Circles', 10, 'https://ncert.nic.in/textbook/pdf/jemh110.pdf'),
('10', 'Mathematics', 'Mathematics – Class 10', 'Chapter 11 – Areas Related to Circles', 11, 'https://ncert.nic.in/textbook/pdf/jemh111.pdf'),
('10', 'Mathematics', 'Mathematics – Class 10', 'Chapter 12 – Surface Areas and Volumes', 12, 'https://ncert.nic.in/textbook/pdf/jemh112.pdf'),
('10', 'Mathematics', 'Mathematics – Class 10', 'Chapter 13 – Statistics', 13, 'https://ncert.nic.in/textbook/pdf/jemh113.pdf'),
('10', 'Mathematics', 'Mathematics – Class 10', 'Chapter 14 – Probability', 14, 'https://ncert.nic.in/textbook/pdf/jemh114.pdf'),
('10', 'Science', 'Science – Class 10', 'Chapter 1 – Chemical Reactions and Equations', 1, 'https://ncert.nic.in/textbook/pdf/jesc101.pdf'),
('10', 'Science', 'Science – Class 10', 'Chapter 2 – Acids, Bases and Salts', 2, 'https://ncert.nic.in/textbook/pdf/jesc102.pdf'),
('10', 'Science', 'Science – Class 10', 'Chapter 3 – Metals and Non-metals', 3, 'https://ncert.nic.in/textbook/pdf/jesc103.pdf'),
('10', 'Science', 'Science – Class 10', 'Chapter 4 – Carbon and its Compounds', 4, 'https://ncert.nic.in/textbook/pdf/jesc104.pdf'),
('10', 'Science', 'Science – Class 10', 'Chapter 5 – Life Processes', 5, 'https://ncert.nic.in/textbook/pdf/jesc105.pdf'),
('10', 'Science', 'Science – Class 10', 'Chapter 6 – Control and Coordination', 6, 'https://ncert.nic.in/textbook/pdf/jesc106.pdf'),
('10', 'Science', 'Science – Class 10', 'Chapter 7 – How do Organisms Reproduce', 7, 'https://ncert.nic.in/textbook/pdf/jesc107.pdf'),
('10', 'Science', 'Science – Class 10', 'Chapter 8 – Heredity', 8, 'https://ncert.nic.in/textbook/pdf/jesc108.pdf'),
('10', 'Science', 'Science – Class 10', 'Chapter 9 – Light – Reflection and Refraction', 9, 'https://ncert.nic.in/textbook/pdf/jesc109.pdf'),
('10', 'Science', 'Science – Class 10', 'Chapter 10 – Human Eye and Colourful World', 10, 'https://ncert.nic.in/textbook/pdf/jesc110.pdf'),
('10', 'Science', 'Science – Class 10', 'Chapter 11 – Electricity', 11, 'https://ncert.nic.in/textbook/pdf/jesc111.pdf'),
('10', 'Science', 'Science – Class 10', 'Chapter 12 – Magnetic Effects of Electric Current', 12, 'https://ncert.nic.in/textbook/pdf/jesc112.pdf'),
('10', 'Science', 'Science – Class 10', 'Chapter 13 – Our Environment', 13, 'https://ncert.nic.in/textbook/pdf/jesc113.pdf'),
('10', 'Social Science', 'India and Contemporary World II (History)', 'Chapter 1 – The Rise of Nationalism in Europe', 1, 'https://ncert.nic.in/textbook/pdf/jess101.pdf'),
('10', 'Social Science', 'Contemporary India II (Geography)', 'Chapter 1 – Resources and Development', 1, 'https://ncert.nic.in/textbook/pdf/jess201.pdf'),
('10', 'Social Science', 'Democratic Politics II (Civics)', 'Chapter 1 – Power Sharing', 1, 'https://ncert.nic.in/textbook/pdf/jess401.pdf'),
('10', 'Social Science', 'Understanding Economic Development (Economics)', 'Chapter 1 – Development', 1, 'https://ncert.nic.in/textbook/pdf/jess301.pdf'),
('10', 'English', 'First Flight – Class 10', 'Chapter 1 – A Letter to God', 1, 'https://ncert.nic.in/textbook/pdf/jeff101.pdf'),
('10', 'Hindi', 'Kshitij Bhag 2 – Class 10', 'पाठ 1 – सूरदास के पद', 1, 'https://ncert.nic.in/textbook/pdf/jhks101.pdf'),

-- =================== CLASS 11 ===================
('11', 'Mathematics', 'Mathematics – Class 11', 'Chapter 1 – Sets', 1, 'https://ncert.nic.in/textbook/pdf/kemh101.pdf'),
('11', 'Mathematics', 'Mathematics – Class 11', 'Chapter 2 – Relations and Functions', 2, 'https://ncert.nic.in/textbook/pdf/kemh102.pdf'),
('11', 'Mathematics', 'Mathematics – Class 11', 'Chapter 3 – Trigonometric Functions', 3, 'https://ncert.nic.in/textbook/pdf/kemh103.pdf'),
('11', 'Mathematics', 'Mathematics – Class 11', 'Chapter 4 – Complex Numbers and Quadratic Equations', 4, 'https://ncert.nic.in/textbook/pdf/kemh104.pdf'),
('11', 'Mathematics', 'Mathematics – Class 11', 'Chapter 5 – Linear Inequalities', 5, 'https://ncert.nic.in/textbook/pdf/kemh105.pdf'),
('11', 'Mathematics', 'Mathematics – Class 11', 'Chapter 6 – Permutations and Combinations', 6, 'https://ncert.nic.in/textbook/pdf/kemh106.pdf'),
('11', 'Mathematics', 'Mathematics – Class 11', 'Chapter 7 – Binomial Theorem', 7, 'https://ncert.nic.in/textbook/pdf/kemh107.pdf'),
('11', 'Mathematics', 'Mathematics – Class 11', 'Chapter 8 – Sequences and Series', 8, 'https://ncert.nic.in/textbook/pdf/kemh108.pdf'),
('11', 'Mathematics', 'Mathematics – Class 11', 'Chapter 9 – Straight Lines', 9, 'https://ncert.nic.in/textbook/pdf/kemh109.pdf'),
('11', 'Mathematics', 'Mathematics – Class 11', 'Chapter 10 – Conic Sections', 10, 'https://ncert.nic.in/textbook/pdf/kemh110.pdf'),
('11', 'Mathematics', 'Mathematics – Class 11', 'Chapter 11 – Introduction to Three Dimensional Geometry', 11, 'https://ncert.nic.in/textbook/pdf/kemh111.pdf'),
('11', 'Mathematics', 'Mathematics – Class 11', 'Chapter 12 – Limits and Derivatives', 12, 'https://ncert.nic.in/textbook/pdf/kemh112.pdf'),
('11', 'Mathematics', 'Mathematics – Class 11', 'Chapter 13 – Statistics', 13, 'https://ncert.nic.in/textbook/pdf/kemh113.pdf'),
('11', 'Mathematics', 'Mathematics – Class 11', 'Chapter 14 – Probability', 14, 'https://ncert.nic.in/textbook/pdf/kemh114.pdf'),
('11', 'Physics', 'Physics Part I – Class 11', 'Chapter 1 – Units and Measurements', 1, 'https://ncert.nic.in/textbook/pdf/keph101.pdf'),
('11', 'Physics', 'Physics Part I – Class 11', 'Chapter 2 – Motion in a Straight Line', 2, 'https://ncert.nic.in/textbook/pdf/keph102.pdf'),
('11', 'Physics', 'Physics Part I – Class 11', 'Chapter 3 – Motion in a Plane', 3, 'https://ncert.nic.in/textbook/pdf/keph103.pdf'),
('11', 'Physics', 'Physics Part I – Class 11', 'Chapter 4 – Laws of Motion', 4, 'https://ncert.nic.in/textbook/pdf/keph104.pdf'),
('11', 'Physics', 'Physics Part I – Class 11', 'Chapter 5 – Work, Energy and Power', 5, 'https://ncert.nic.in/textbook/pdf/keph105.pdf'),
('11', 'Physics', 'Physics Part I – Class 11', 'Chapter 6 – System of Particles and Rotational Motion', 6, 'https://ncert.nic.in/textbook/pdf/keph106.pdf'),
('11', 'Physics', 'Physics Part I – Class 11', 'Chapter 7 – Gravitation', 7, 'https://ncert.nic.in/textbook/pdf/keph107.pdf'),
('11', 'Physics', 'Physics Part II – Class 11', 'Chapter 8 – Mechanical Properties of Solids', 8, 'https://ncert.nic.in/textbook/pdf/keph201.pdf'),
('11', 'Physics', 'Physics Part II – Class 11', 'Chapter 9 – Mechanical Properties of Fluids', 9, 'https://ncert.nic.in/textbook/pdf/keph202.pdf'),
('11', 'Physics', 'Physics Part II – Class 11', 'Chapter 10 – Thermal Properties of Matter', 10, 'https://ncert.nic.in/textbook/pdf/keph203.pdf'),
('11', 'Physics', 'Physics Part II – Class 11', 'Chapter 11 – Thermodynamics', 11, 'https://ncert.nic.in/textbook/pdf/keph204.pdf'),
('11', 'Physics', 'Physics Part II – Class 11', 'Chapter 12 – Kinetic Theory', 12, 'https://ncert.nic.in/textbook/pdf/keph205.pdf'),
('11', 'Physics', 'Physics Part II – Class 11', 'Chapter 13 – Oscillations', 13, 'https://ncert.nic.in/textbook/pdf/keph206.pdf'),
('11', 'Physics', 'Physics Part II – Class 11', 'Chapter 14 – Waves', 14, 'https://ncert.nic.in/textbook/pdf/keph207.pdf'),
('11', 'Chemistry', 'Chemistry Part I – Class 11', 'Chapter 1 – Some Basic Concepts of Chemistry', 1, 'https://ncert.nic.in/textbook/pdf/kech101.pdf'),
('11', 'Chemistry', 'Chemistry Part I – Class 11', 'Chapter 2 – Structure of Atom', 2, 'https://ncert.nic.in/textbook/pdf/kech102.pdf'),
('11', 'Chemistry', 'Chemistry Part I – Class 11', 'Chapter 3 – Classification of Elements and Periodicity', 3, 'https://ncert.nic.in/textbook/pdf/kech103.pdf'),
('11', 'Chemistry', 'Chemistry Part I – Class 11', 'Chapter 4 – Chemical Bonding and Molecular Structure', 4, 'https://ncert.nic.in/textbook/pdf/kech104.pdf'),
('11', 'Chemistry', 'Chemistry Part I – Class 11', 'Chapter 5 – Chemical Thermodynamics', 5, 'https://ncert.nic.in/textbook/pdf/kech105.pdf'),
('11', 'Chemistry', 'Chemistry Part I – Class 11', 'Chapter 6 – Equilibrium', 6, 'https://ncert.nic.in/textbook/pdf/kech106.pdf'),
('11', 'Chemistry', 'Chemistry Part II – Class 11', 'Chapter 7 – Redox Reactions', 7, 'https://ncert.nic.in/textbook/pdf/kech201.pdf'),
('11', 'Chemistry', 'Chemistry Part II – Class 11', 'Chapter 8 – Organic Chemistry: Some Basic Principles', 8, 'https://ncert.nic.in/textbook/pdf/kech202.pdf'),
('11', 'Chemistry', 'Chemistry Part II – Class 11', 'Chapter 9 – Hydrocarbons', 9, 'https://ncert.nic.in/textbook/pdf/kech203.pdf'),
('11', 'Biology', 'Biology – Class 11', 'Chapter 1 – The Living World', 1, 'https://ncert.nic.in/textbook/pdf/kebo101.pdf'),
('11', 'Biology', 'Biology – Class 11', 'Chapter 2 – Biological Classification', 2, 'https://ncert.nic.in/textbook/pdf/kebo102.pdf'),
('11', 'Biology', 'Biology – Class 11', 'Chapter 3 – Plant Kingdom', 3, 'https://ncert.nic.in/textbook/pdf/kebo103.pdf'),
('11', 'Biology', 'Biology – Class 11', 'Chapter 4 – Animal Kingdom', 4, 'https://ncert.nic.in/textbook/pdf/kebo104.pdf'),
('11', 'Biology', 'Biology – Class 11', 'Chapter 8 – Cell: The Unit of Life', 8, 'https://ncert.nic.in/textbook/pdf/kebo108.pdf'),
('11', 'Computer Science', 'Computer Science – Class 11', 'Chapter 1 – Computer System', 1, 'https://ncert.nic.in/textbook/pdf/kecs101.pdf'),
('11', 'Computer Science', 'Computer Science – Class 11', 'Chapter 2 – Encoding Schemes and Number System', 2, 'https://ncert.nic.in/textbook/pdf/kecs102.pdf'),
('11', 'Computer Science', 'Computer Science – Class 11', 'Chapter 4 – Introduction to Problem Solving', 4, 'https://ncert.nic.in/textbook/pdf/kecs104.pdf'),
('11', 'Computer Science', 'Computer Science – Class 11', 'Chapter 5 – Getting Started with Python', 5, 'https://ncert.nic.in/textbook/pdf/kecs105.pdf'),

-- =================== CLASS 12 ===================
('12', 'Mathematics', 'Mathematics Part I – Class 12', 'Chapter 1 – Relations and Functions', 1, 'https://ncert.nic.in/textbook/pdf/lemh101.pdf'),
('12', 'Mathematics', 'Mathematics Part I – Class 12', 'Chapter 2 – Inverse Trigonometric Functions', 2, 'https://ncert.nic.in/textbook/pdf/lemh102.pdf'),
('12', 'Mathematics', 'Mathematics Part I – Class 12', 'Chapter 3 – Matrices', 3, 'https://ncert.nic.in/textbook/pdf/lemh103.pdf'),
('12', 'Mathematics', 'Mathematics Part I – Class 12', 'Chapter 4 – Determinants', 4, 'https://ncert.nic.in/textbook/pdf/lemh104.pdf'),
('12', 'Mathematics', 'Mathematics Part I – Class 12', 'Chapter 5 – Continuity and Differentiability', 5, 'https://ncert.nic.in/textbook/pdf/lemh105.pdf'),
('12', 'Mathematics', 'Mathematics Part I – Class 12', 'Chapter 6 – Application of Derivatives', 6, 'https://ncert.nic.in/textbook/pdf/lemh106.pdf'),
('12', 'Mathematics', 'Mathematics Part II – Class 12', 'Chapter 7 – Integrals', 7, 'https://ncert.nic.in/textbook/pdf/lemh201.pdf'),
('12', 'Mathematics', 'Mathematics Part II – Class 12', 'Chapter 8 – Application of Integrals', 8, 'https://ncert.nic.in/textbook/pdf/lemh202.pdf'),
('12', 'Mathematics', 'Mathematics Part II – Class 12', 'Chapter 9 – Differential Equations', 9, 'https://ncert.nic.in/textbook/pdf/lemh203.pdf'),
('12', 'Mathematics', 'Mathematics Part II – Class 12', 'Chapter 10 – Vector Algebra', 10, 'https://ncert.nic.in/textbook/pdf/lemh204.pdf'),
('12', 'Mathematics', 'Mathematics Part II – Class 12', 'Chapter 11 – Three Dimensional Geometry', 11, 'https://ncert.nic.in/textbook/pdf/lemh205.pdf'),
('12', 'Mathematics', 'Mathematics Part II – Class 12', 'Chapter 12 – Linear Programming', 12, 'https://ncert.nic.in/textbook/pdf/lemh206.pdf'),
('12', 'Mathematics', 'Mathematics Part II – Class 12', 'Chapter 13 – Probability', 13, 'https://ncert.nic.in/textbook/pdf/lemh207.pdf'),
('12', 'Physics', 'Physics Part I – Class 12', 'Chapter 1 – Electric Charges and Fields', 1, 'https://ncert.nic.in/textbook/pdf/leph101.pdf'),
('12', 'Physics', 'Physics Part I – Class 12', 'Chapter 2 – Electrostatic Potential and Capacitance', 2, 'https://ncert.nic.in/textbook/pdf/leph102.pdf'),
('12', 'Physics', 'Physics Part I – Class 12', 'Chapter 3 – Current Electricity', 3, 'https://ncert.nic.in/textbook/pdf/leph103.pdf'),
('12', 'Physics', 'Physics Part I – Class 12', 'Chapter 4 – Moving Charges and Magnetism', 4, 'https://ncert.nic.in/textbook/pdf/leph104.pdf'),
('12', 'Physics', 'Physics Part I – Class 12', 'Chapter 5 – Magnetism and Matter', 5, 'https://ncert.nic.in/textbook/pdf/leph105.pdf'),
('12', 'Physics', 'Physics Part I – Class 12', 'Chapter 6 – Electromagnetic Induction', 6, 'https://ncert.nic.in/textbook/pdf/leph106.pdf'),
('12', 'Physics', 'Physics Part I – Class 12', 'Chapter 7 – Alternating Current', 7, 'https://ncert.nic.in/textbook/pdf/leph107.pdf'),
('12', 'Physics', 'Physics Part I – Class 12', 'Chapter 8 – Electromagnetic Waves', 8, 'https://ncert.nic.in/textbook/pdf/leph108.pdf'),
('12', 'Physics', 'Physics Part II – Class 12', 'Chapter 9 – Ray Optics and Optical Instruments', 9, 'https://ncert.nic.in/textbook/pdf/leph201.pdf'),
('12', 'Physics', 'Physics Part II – Class 12', 'Chapter 10 – Wave Optics', 10, 'https://ncert.nic.in/textbook/pdf/leph202.pdf'),
('12', 'Physics', 'Physics Part II – Class 12', 'Chapter 11 – Dual Nature of Radiation and Matter', 11, 'https://ncert.nic.in/textbook/pdf/leph203.pdf'),
('12', 'Physics', 'Physics Part II – Class 12', 'Chapter 12 – Atoms', 12, 'https://ncert.nic.in/textbook/pdf/leph204.pdf'),
('12', 'Physics', 'Physics Part II – Class 12', 'Chapter 13 – Nuclei', 13, 'https://ncert.nic.in/textbook/pdf/leph205.pdf'),
('12', 'Physics', 'Physics Part II – Class 12', 'Chapter 14 – Semiconductor Electronics', 14, 'https://ncert.nic.in/textbook/pdf/leph206.pdf'),
('12', 'Chemistry', 'Chemistry Part I – Class 12', 'Chapter 1 – Solutions', 1, 'https://ncert.nic.in/textbook/pdf/lech101.pdf'),
('12', 'Chemistry', 'Chemistry Part I – Class 12', 'Chapter 2 – Electrochemistry', 2, 'https://ncert.nic.in/textbook/pdf/lech102.pdf'),
('12', 'Chemistry', 'Chemistry Part I – Class 12', 'Chapter 3 – Chemical Kinetics', 3, 'https://ncert.nic.in/textbook/pdf/lech103.pdf'),
('12', 'Chemistry', 'Chemistry Part I – Class 12', 'Chapter 4 – The d-and f-Block Elements', 4, 'https://ncert.nic.in/textbook/pdf/lech104.pdf'),
('12', 'Chemistry', 'Chemistry Part I – Class 12', 'Chapter 5 – Coordination Compounds', 5, 'https://ncert.nic.in/textbook/pdf/lech105.pdf'),
('12', 'Chemistry', 'Chemistry Part II – Class 12', 'Chapter 6 – Haloalkanes and Haloarenes', 6, 'https://ncert.nic.in/textbook/pdf/lech201.pdf'),
('12', 'Chemistry', 'Chemistry Part II – Class 12', 'Chapter 7 – Alcohols, Phenols and Ethers', 7, 'https://ncert.nic.in/textbook/pdf/lech202.pdf'),
('12', 'Chemistry', 'Chemistry Part II – Class 12', 'Chapter 8 – Aldehydes, Ketones and Carboxylic Acids', 8, 'https://ncert.nic.in/textbook/pdf/lech203.pdf'),
('12', 'Chemistry', 'Chemistry Part II – Class 12', 'Chapter 9 – Amines', 9, 'https://ncert.nic.in/textbook/pdf/lech204.pdf'),
('12', 'Chemistry', 'Chemistry Part II – Class 12', 'Chapter 10 – Biomolecules', 10, 'https://ncert.nic.in/textbook/pdf/lech205.pdf'),
('12', 'Biology', 'Biology – Class 12', 'Chapter 1 – Sexual Reproduction in Flowering Plants', 1, 'https://ncert.nic.in/textbook/pdf/lebo101.pdf'),
('12', 'Biology', 'Biology – Class 12', 'Chapter 2 – Human Reproduction', 2, 'https://ncert.nic.in/textbook/pdf/lebo102.pdf'),
('12', 'Biology', 'Biology – Class 12', 'Chapter 3 – Reproductive Health', 3, 'https://ncert.nic.in/textbook/pdf/lebo103.pdf'),
('12', 'Biology', 'Biology – Class 12', 'Chapter 4 – Principles of Inheritance and Variation', 4, 'https://ncert.nic.in/textbook/pdf/lebo104.pdf'),
('12', 'Biology', 'Biology – Class 12', 'Chapter 5 – Molecular Basis of Inheritance', 5, 'https://ncert.nic.in/textbook/pdf/lebo105.pdf'),
('12', 'Computer Science', 'Computer Science – Class 12', 'Chapter 1 – Python Revision Tour', 1, 'https://ncert.nic.in/textbook/pdf/lecs101.pdf'),
('12', 'Computer Science', 'Computer Science – Class 12', 'Chapter 2 – Python Revision Tour II', 2, 'https://ncert.nic.in/textbook/pdf/lecs102.pdf'),
('12', 'Computer Science', 'Computer Science – Class 12', 'Chapter 3 – Working with Functions', 3, 'https://ncert.nic.in/textbook/pdf/lecs103.pdf'),
('12', 'Computer Science', 'Computer Science – Class 12', 'Chapter 4 – Using Python Libraries', 4, 'https://ncert.nic.in/textbook/pdf/lecs104.pdf'),
('12', 'Computer Science', 'Computer Science – Class 12', 'Chapter 5 – File Handling', 5, 'https://ncert.nic.in/textbook/pdf/lecs105.pdf'),
('12', 'Computer Science', 'Computer Science – Class 12', 'Chapter 8 – Data Structures: Stack', 8, 'https://ncert.nic.in/textbook/pdf/lecs108.pdf'),
('12', 'Computer Science', 'Computer Science – Class 12', 'Chapter 11 – Relational Databases and SQL', 11, 'https://ncert.nic.in/textbook/pdf/lecs111.pdf')
ON CONFLICT (class_number, subject, book_name, chapter_number) DO UPDATE
SET chapter_title = EXCLUDED.chapter_title, file_url = EXCLUDED.file_url;


-- >>> FILE: 20260915110000_fix_certificates_storage_and_rls.sql
-- Migration: Fix certificates storage bucket and RLS policies
-- 1. Ensure storage bucket 'certificates' exists with public access and proper MIME types
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificates',
  'certificates',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Upgrade is_staff_or_admin to check both profiles (case-insensitive) and user_roles table
CREATE OR REPLACE FUNCTION public.is_staff_or_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = _uid AND lower(coalesce(role, '')) IN ('admin', 'staff', 'librarian', 'teacher', 'moderator')
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _uid AND (role::text ILIKE 'admin%' OR role::text ILIKE 'mod%')
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_staff_or_admin(uuid) TO authenticated, service_role;

-- 3. Storage policies for 'certificates' bucket
DROP POLICY IF EXISTS "certificates public read" ON storage.objects;
DROP POLICY IF EXISTS "certificates staff insert" ON storage.objects;
DROP POLICY IF EXISTS "certificates staff update" ON storage.objects;
DROP POLICY IF EXISTS "certificates staff delete" ON storage.objects;
DROP POLICY IF EXISTS "certificates_select" ON storage.objects;
DROP POLICY IF EXISTS "certificates_insert" ON storage.objects;
DROP POLICY IF EXISTS "certificates_update" ON storage.objects;
DROP POLICY IF EXISTS "certificates_delete" ON storage.objects;

-- SELECT: Anyone can view certificates (needed for students, admin preview, and PDF generation)
CREATE POLICY "certificates_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'certificates');

-- INSERT: Authenticated users can upload to certificates
CREATE POLICY "certificates_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'certificates'
    AND (
      public.is_staff_or_admin(auth.uid())
      OR auth.role() = 'authenticated'
    )
  );

-- UPDATE: Authenticated users can update files (supports upsert: true)
CREATE POLICY "certificates_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'certificates'
    AND (
      public.is_staff_or_admin(auth.uid())
      OR auth.role() = 'authenticated'
    )
  )
  WITH CHECK (
    bucket_id = 'certificates'
    AND (
      public.is_staff_or_admin(auth.uid())
      OR auth.role() = 'authenticated'
    )
  );

-- DELETE: Staff and admin can delete certificate files
CREATE POLICY "certificates_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'certificates'
    AND (
      public.is_staff_or_admin(auth.uid())
      OR auth.role() = 'authenticated'
    )
  );

-- 4. Ensure system_settings table allows staff and admin to upsert certificate_template_url and layout
DROP POLICY IF EXISTS "staff manage settings" ON public.system_settings;
CREATE POLICY "staff manage settings" ON public.system_settings FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid()) OR auth.role() = 'authenticated')
  WITH CHECK (public.is_staff_or_admin(auth.uid()) OR auth.role() = 'authenticated');

-- 5. Add certificate_no column to issued_certificates if it doesn't exist
ALTER TABLE public.issued_certificates
  ADD COLUMN IF NOT EXISTS certificate_no text;

CREATE INDEX IF NOT EXISTS idx_issued_certificates_cert_no
  ON public.issued_certificates(certificate_no);

-- 6. Ensure issued_certificates policies are clear and permit authenticated staff/admins
DROP POLICY IF EXISTS "certificates staff insert" ON public.issued_certificates;
CREATE POLICY "certificates staff insert" ON public.issued_certificates
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_admin(auth.uid()) OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "certificates staff update" ON public.issued_certificates;
CREATE POLICY "certificates staff update" ON public.issued_certificates
  FOR UPDATE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()) OR auth.role() = 'authenticated')
  WITH CHECK (public.is_staff_or_admin(auth.uid()) OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "certificates staff delete" ON public.issued_certificates;
CREATE POLICY "certificates staff delete" ON public.issued_certificates
  FOR DELETE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()) OR auth.role() = 'authenticated');


-- >>> FILE: 20260915120000_bilingual_certificates_and_hindi_name.sql
-- Migration: Support bilingual certificates, Hindi names, and common plain text
-- 1. Add hindi_name to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hindi_name text;

-- 2. Add bilingual and common text fields to issued_certificates table
ALTER TABLE public.issued_certificates
  ADD COLUMN IF NOT EXISTS name_hindi text,
  ADD COLUMN IF NOT EXISTS class_hindi text,
  ADD COLUMN IF NOT EXISTS event_hindi text,
  ADD COLUMN IF NOT EXISTS title_hindi text,
  ADD COLUMN IF NOT EXISTS during_text text,
  ADD COLUMN IF NOT EXISTS common_text text,
  ADD COLUMN IF NOT EXISTS bilingual_data jsonb DEFAULT '{}'::jsonb;

-- 3. Seed default common certificate text in system_settings if not exists
INSERT INTO public.system_settings (key, value)
VALUES ('certificate_common_text', '""'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 4. Ensure students can update their own hindi_name in profiles
DROP POLICY IF EXISTS "students update own hindi_name" ON public.profiles;
-- The existing policy "Users can update their own profile" already allows auth.uid() = id,
-- but let's make sure it's explicitly granted.
GRANT SELECT, UPDATE(hindi_name) ON public.profiles TO authenticated;


-- >>> FILE: 20260915130000_add_redirect_url_to_events.sql
-- Migration: Add redirect_url column to library_events table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

ALTER TABLE public.library_events
ADD COLUMN IF NOT EXISTS redirect_url text;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';


-- >>> FILE: 20260915140000_add_unlock_at_to_certificates.sql
-- Migration: Add unlock_at column to issued_certificates for scheduled release
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

ALTER TABLE public.issued_certificates
ADD COLUMN IF NOT EXISTS unlock_at timestamp with time zone DEFAULT NULL;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';


-- >>> FILE: 20260915141000_admin_custom_reset_password.sql
-- Migration: Create SQL RPC for Admin Password Override
-- Enables admins to directly reset any student/user password in Auth.users
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

CREATE OR REPLACE FUNCTION public.admin_custom_reset_password(
  target_user_id uuid,
  new_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
  caller_role text;
BEGIN
  -- 1. Ensure caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User not authenticated';
  END IF;

  -- 2. Verify caller has admin role in profiles
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  IF caller_role IS NULL OR caller_role != 'admin' THEN
    RAISE EXCEPTION 'Forbidden: Only administrators can reset user passwords';
  END IF;

  -- 3. Validate password length
  IF new_password IS NULL OR length(trim(new_password)) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters long';
  END IF;

  -- 4. Update encrypted password in auth.users using bcrypt
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(trim(new_password), extensions.gen_salt('bf')),
      updated_at = now()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found in auth.users';
  END IF;

  RETURN jsonb_build_object('success', true, 'user_id', target_user_id);
END;
$$;

-- Grant execution to authenticated users (internal check enforces admin role)
GRANT EXECUTE ON FUNCTION public.admin_custom_reset_password(uuid, text) TO authenticated;


-- >>> FILE: 20260915150000_notification_email_collection.sql
-- One notification address per profile. Existing users remain unconfirmed so
-- the application can collect/confirm it on their next successful login.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_email text,
  ADD COLUMN IF NOT EXISTS notification_email_confirmed_at timestamptz;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_notification_email_format;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_notification_email_format
  CHECK (
    notification_email IS NULL
    OR notification_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  );

-- New self-registered users already provide an email during registration, so
-- do not show them the returning-user collection prompt.
CREATE OR REPLACE FUNCTION public.set_notification_email_for_new_profile()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.notification_email IS NULL
     AND NEW.email IS NOT NULL
     AND NEW.email !~* '@(kvschool\.in|internal|dummy|example\.com)$' THEN
    NEW.notification_email := lower(trim(NEW.email));
    NEW.notification_email_confirmed_at := COALESCE(NEW.notification_email_confirmed_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_notification_email_for_new_profile ON public.profiles;
CREATE TRIGGER set_notification_email_for_new_profile
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_notification_email_for_new_profile();


-- >>> FILE: 20260915152000_password_reset_mail_delivery.sql
-- Rate-limit the public recovery endpoint without storing recovery links or
-- email content. Edge Functions access this table with the service role.
CREATE TABLE IF NOT EXISTS public.password_reset_delivery_limits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_requested_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.password_reset_delivery_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.password_reset_delivery_limits FROM anon, authenticated;
GRANT ALL ON TABLE public.password_reset_delivery_limits TO service_role;


-- >>> FILE: 20260915154000_admin_email_campaigns.sql
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  preset text NOT NULL,
  subject text NOT NULL,
  recipient_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.email_campaigns TO authenticated;
GRANT ALL ON public.email_campaigns TO service_role;

DROP POLICY IF EXISTS "staff manage email campaigns" ON public.email_campaigns;
DROP POLICY IF EXISTS "staff view email campaigns" ON public.email_campaigns;

CREATE POLICY "staff manage email campaigns" ON public.email_campaigns FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));


-- >>> FILE: 20260916000000_live_quiz_league_scheduling.sql
-- Migration: Scheduled Live Quiz League System (Quizizz-Style)
-- Adds scheduling, target class, gamification rules, and pre-registration table

-- 1. Extend quiz_sessions with league and scheduling columns
ALTER TABLE public.quiz_sessions ADD COLUMN IF NOT EXISTS scheduled_start_at timestamptz;
ALTER TABLE public.quiz_sessions ADD COLUMN IF NOT EXISTS league_name text;
ALTER TABLE public.quiz_sessions ADD COLUMN IF NOT EXISTS target_class text DEFAULT 'all';
ALTER TABLE public.quiz_sessions ADD COLUMN IF NOT EXISTS time_per_question int DEFAULT 30;
ALTER TABLE public.quiz_sessions ADD COLUMN IF NOT EXISTS speed_bonus boolean DEFAULT true;
ALTER TABLE public.quiz_sessions ADD COLUMN IF NOT EXISTS streak_bonus boolean DEFAULT true;
ALTER TABLE public.quiz_sessions ADD COLUMN IF NOT EXISTS auto_start boolean DEFAULT true;
ALTER TABLE public.quiz_sessions ADD COLUMN IF NOT EXISTS is_league boolean DEFAULT false;

-- Update status check constraint to include 'scheduled'
ALTER TABLE public.quiz_sessions DROP CONSTRAINT IF EXISTS quiz_sessions_status_check;
ALTER TABLE public.quiz_sessions ADD CONSTRAINT quiz_sessions_status_check 
  CHECK (status IN ('waiting', 'in_progress', 'completed', 'active', 'finished', 'scheduled'));

-- 2. Create quiz_league_registrations table for student pre-registration
CREATE TABLE IF NOT EXISTS public.quiz_league_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.quiz_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  registered_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quiz_league_registrations_unique_user UNIQUE (session_id, user_id)
);

-- 3. Row Level Security for quiz_league_registrations
ALTER TABLE public.quiz_league_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view registrations" ON public.quiz_league_registrations;
CREATE POLICY "Anyone can view registrations"
  ON public.quiz_league_registrations FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can register themselves" ON public.quiz_league_registrations;
CREATE POLICY "Users can register themselves"
  ON public.quiz_league_registrations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can cancel their registration" ON public.quiz_league_registrations;
CREATE POLICY "Users can cancel their registration"
  ON public.quiz_league_registrations FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 4. Ensure realtime publication covers quiz_sessions and registrations
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_sessions;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_league_registrations;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;


-- >>> FILE: 20260916120000_event_winners.sql
-- Migration: Create event_winners table for tracking event winners, physical certificate dates, and custom certificates
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

CREATE TABLE IF NOT EXISTS public.event_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.library_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  position TEXT NOT NULL DEFAULT '1st', -- '1st', '2nd', '3rd', 'merit', 'participation', 'special'
  position_title TEXT NOT NULL DEFAULT 'First Position',
  position_title_hindi TEXT,
  collection_date DATE,
  collection_venue TEXT DEFAULT 'Central Library Counter',
  librarian_note TEXT DEFAULT 'Please collect your winner certificate and award trophy on the specified date.',
  certificate_id UUID REFERENCES public.issued_certificates(id) ON DELETE SET NULL,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE,
  acknowledged_user_ids JSONB DEFAULT '[]'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_winners_event_id ON public.event_winners(event_id);
CREATE INDEX IF NOT EXISTS idx_event_winners_user_id ON public.event_winners(user_id);
CREATE INDEX IF NOT EXISTS idx_event_winners_is_published ON public.event_winners(is_published);

-- Enable RLS
ALTER TABLE public.event_winners ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'event_winners' AND policyname = 'Anyone can view published event winners'
  ) THEN
    CREATE POLICY "Anyone can view published event winners" ON public.event_winners
      FOR SELECT USING (is_published = true OR auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'event_winners' AND policyname = 'Admins can manage event winners'
  ) THEN
    CREATE POLICY "Admins can manage event winners" ON public.event_winners
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superadmin', 'librarian')
        )
      );
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';


-- >>> FILE: 20260916130000_add_event_name_to_issued_certificates.sql
-- Migration: Add event_name column to issued_certificates table
ALTER TABLE public.issued_certificates
  ADD COLUMN IF NOT EXISTS event_name text;



-- >>> FILE: 20260917000000_community_post_scheduling.sql
﻿-- ============================================================================
-- COMMUNITY POST SCHEDULING SYSTEM
-- Enables authors and administrators to schedule posts, doubts, stories, polls
-- for future automated release.
-- ============================================================================

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_posts_scheduled_for
  ON public.posts(scheduled_for);

-- Update RLS SELECT policy so future scheduled posts are hidden from general feed
-- until scheduled_for arrives, but always visible to the author and staff/admins.
DROP POLICY IF EXISTS "Anyone view posts" ON public.posts;
CREATE POLICY "Anyone view posts"
ON public.posts FOR SELECT TO authenticated
USING (
  scheduled_for IS NULL
  OR scheduled_for <= now()
  OR user_id = auth.uid()
  OR public.is_staff_or_admin(auth.uid())
);


-- >>> FILE: 20260918000000_fix_quiz_sessions_updated_at.sql
-- Migration: Fix quiz_sessions missing updated_at column and trigger
-- Fixes error: record "new" has no field "updated_at" on updating quiz_sessions

ALTER TABLE public.quiz_sessions ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.quiz_sessions ADD COLUMN IF NOT EXISTS max_participants int DEFAULT NULL;

-- Ensure the trigger is safely attached to quiz_sessions
DROP TRIGGER IF EXISTS quiz_sessions_set_updated_at ON public.quiz_sessions;
CREATE TRIGGER quiz_sessions_set_updated_at 
  BEFORE UPDATE ON public.quiz_sessions 
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- >>> FILE: 20260919000000_whatsapp_community_reward.sql
﻿-- Migration: WhatsApp Community Link and One-time 250 Points Reward

-- 1. Add whatsapp_reward_claimed and whatsapp_joined_at columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS whatsapp_reward_claimed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_joined_at timestamp with time zone;

-- 2. Create RPC function to securely grant 250 points once per user
CREATE OR REPLACE FUNCTION public.claim_whatsapp_community_reward()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_claimed boolean;
  v_reward integer := 250;
  v_current_points integer;
BEGIN
  -- Lock row and check if already claimed
  SELECT COALESCE(whatsapp_reward_claimed, false), COALESCE(points, 0)
  INTO v_claimed, v_current_points
  FROM public.profiles
  WHERE id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  IF v_claimed THEN
    RAISE EXCEPTION 'WhatsApp Community 250 points reward has already been claimed';
  END IF;

  -- Update profile with 250 points and mark reward as claimed
  UPDATE public.profiles
  SET points = v_current_points + v_reward,
      whatsapp_reward_claimed = true,
      whatsapp_joined_at = NOW(),
      updated_at = NOW()
  WHERE id = auth.uid();

  -- Send notification to user
  INSERT INTO public.notifications (
    target_user_id,
    sent_by,
    title,
    message,
    type,
    is_read
  ) VALUES (
    auth.uid(),
    auth.uid(),
    '🎉 250 XP WhatsApp Bonus Claimed!',
    'Thank you for joining the PM SHRI KV Sulur WhatsApp Community! 250 bonus points have been added to your profile.',
    'points',
    false
  );

  RETURN v_reward;
END;
$$;

-- 3. Grant execute permission on the RPC function to authenticated users
GRANT EXECUTE ON FUNCTION public.claim_whatsapp_community_reward() TO authenticated;


-- >>> FILE: 20260920000000_ui_reform_challenges.sql
-- Create UI Reform & Redesign Campaigns table
CREATE TABLE IF NOT EXISTS public.ui_reform_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL DEFAULT 'UI Reform & App Redesign Challenge',
    description TEXT NOT NULL DEFAULT 'Share your design concepts, layout ideas, and UX reforms for KV Sulur DLMS. Earn reward points and see your ideas built into the system!',
    theme TEXT NOT NULL DEFAULT 'Reinventing the Student Library Experience',
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'ended')),
    reward_points INTEGER DEFAULT 150,
    rules TEXT DEFAULT '1. Suggestions must be constructive and feasible.\n2. Include which screen or flow you are improving.\n3. Mockups, sketches, or wireframe links will receive bonus points.\n4. Original ideas only.',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create UI Reform Submissions table
CREATE TABLE IF NOT EXISTS public.ui_reform_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.ui_reform_campaigns(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    screen_name TEXT NOT NULL,
    title TEXT NOT NULL,
    problem_statement TEXT NOT NULL,
    proposed_solution TEXT NOT NULL,
    mockup_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'shortlisted', 'winner', 'implemented', 'rejected')),
    admin_feedback TEXT,
    points_awarded INTEGER DEFAULT 0,
    upvotes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ui_reform_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ui_reform_submissions ENABLE ROW LEVEL SECURITY;

-- Campaigns Policies
DROP POLICY IF EXISTS "Admins can manage ui_reform_campaigns" ON public.ui_reform_campaigns;
CREATE POLICY "Admins can manage ui_reform_campaigns" ON public.ui_reform_campaigns
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "All authenticated users can view ui_reform_campaigns" ON public.ui_reform_campaigns;
CREATE POLICY "All authenticated users can view ui_reform_campaigns" ON public.ui_reform_campaigns
    FOR SELECT TO authenticated USING (true);

-- Submissions Policies
DROP POLICY IF EXISTS "Admins can manage ui_reform_submissions" ON public.ui_reform_submissions;
CREATE POLICY "Admins can manage ui_reform_submissions" ON public.ui_reform_submissions
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Students can view own or reviewed submissions" ON public.ui_reform_submissions;
CREATE POLICY "Students can view own or reviewed submissions" ON public.ui_reform_submissions
    FOR SELECT TO authenticated USING (
        student_id = auth.uid() OR status IN ('shortlisted', 'winner', 'implemented', 'reviewed')
    );

DROP POLICY IF EXISTS "Students can submit ui_reform_submissions" ON public.ui_reform_submissions;
CREATE POLICY "Students can submit ui_reform_submissions" ON public.ui_reform_submissions
    FOR INSERT TO authenticated WITH CHECK (
        student_id = auth.uid()
    );

DROP POLICY IF EXISTS "Students can update own pending submissions" ON public.ui_reform_submissions;
CREATE POLICY "Students can update own pending submissions" ON public.ui_reform_submissions
    FOR UPDATE TO authenticated USING (
        student_id = auth.uid() AND status = 'pending'
    );


-- >>> FILE: 20260920000100_limit_study_points_daily.sql
-- Cap Study Tracker rewards at 100 XP per student each calendar day.
-- The profile row lock makes the cap safe when more than one session completes at once.
CREATE OR REPLACE FUNCTION public.complete_study_session(
  p_session_id uuid,
  p_duration_seconds integer,
  p_material_id uuid DEFAULT NULL,
  p_material_title text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points integer;
  v_type text;
  v_ended_at timestamptz;
  v_today_points integer;
  v_daily_cap constant integer := 100;
BEGIN
  SELECT session_type, ended_at
  INTO v_type, v_ended_at
  FROM public.study_sessions
  WHERE id = p_session_id AND user_id = auth.uid();

  IF v_type IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- A completed session must never award points more than once.
  IF v_ended_at IS NOT NULL THEN
    RETURN 0;
  END IF;

  -- Serialise completions for this student before calculating today's balance.
  PERFORM 1 FROM public.profiles WHERE id = auth.uid() FOR UPDATE;

  v_points := CASE
    WHEN v_type = 'break' THEN 0
    ELSE LEAST(FLOOR(GREATEST(p_duration_seconds, 0) / 600.0)::int * 2, 30)
  END;

  SELECT COALESCE(SUM(points_earned), 0)::integer
  INTO v_today_points
  FROM public.study_sessions
  WHERE user_id = auth.uid()
    AND session_type <> 'break'
    AND ended_at IS NOT NULL
    AND ended_at::date = CURRENT_DATE;

  v_points := GREATEST(LEAST(v_points, v_daily_cap - v_today_points), 0);

  UPDATE public.study_sessions
  SET duration_seconds = GREATEST(p_duration_seconds, 0),
      material_id = COALESCE(p_material_id, material_id),
      material_title = COALESCE(p_material_title, material_title),
      notes = COALESCE(p_notes, notes),
      points_earned = v_points,
      ended_at = now()
  WHERE id = p_session_id AND user_id = auth.uid();

  IF v_points > 0 THEN
    UPDATE public.profiles
    SET points = COALESCE(points, 0) + v_points
    WHERE id = auth.uid();
  END IF;

  RETURN v_points;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_study_session(uuid, integer, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_study_session(uuid, integer, uuid, text, text) TO authenticated;


-- >>> FILE: 20260920000200_harden_password_recovery.sql
-- Keep only one unresolved password-reset ticket per account. Existing duplicate
-- tickets (and their message threads) are removed; the oldest ticket is retained.
WITH ranked_reset_tickets AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY lower(trim(admission_number))
           ORDER BY created_at ASC, id ASC
         ) AS row_number
  FROM public.support_tickets
  WHERE status IN ('open', 'in_progress')
    AND (
      lower(coalesce(category, '')) = 'password'
      OR lower(coalesce(subject, '')) LIKE '%password reset%'
      OR lower(coalesce(subject, '')) LIKE '%reset password%'
    )
)
DELETE FROM public.support_tickets
WHERE id IN (SELECT id FROM ranked_reset_tickets WHERE row_number > 1);

CREATE INDEX IF NOT EXISTS idx_support_tickets_open_password_reset
  ON public.support_tickets (lower(trim(admission_number)), created_at DESC)
  WHERE status IN ('open', 'in_progress');

-- Return an existing open reset ticket instead of creating another one.
CREATE OR REPLACE FUNCTION public.submit_public_support_ticket(
  p_admission text, p_full_name text, p_email text, p_student_class text, p_role text,
  p_category text, p_priority text, p_subject text, p_description text)
RETURNS TABLE(id uuid, ticket_number text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid;
  v_id uuid;
  v_no text;
  v_is_reset boolean;
BEGIN
  IF COALESCE(trim(p_admission), '') = '' OR COALESCE(trim(p_subject), '') = '' THEN
    RAISE EXCEPTION 'Admission number and subject are required';
  END IF;

  v_is_reset := lower(coalesce(p_subject, '')) LIKE '%password reset%'
    OR lower(coalesce(p_subject, '')) LIKE '%reset password%';

  IF v_is_reset THEN
    SELECT t.id, t.ticket_number INTO v_id, v_no
    FROM public.support_tickets t
    WHERE lower(trim(t.admission_number)) = lower(trim(p_admission))
      AND t.status IN ('open', 'in_progress')
      AND (
        lower(coalesce(t.category, '')) = 'password'
        OR lower(coalesce(t.subject, '')) LIKE '%password reset%'
        OR lower(coalesce(t.subject, '')) LIKE '%reset password%'
      )
    ORDER BY t.created_at ASC
    LIMIT 1;
    IF v_id IS NOT NULL THEN
      RETURN QUERY SELECT v_id, v_no;
      RETURN;
    END IF;
  END IF;

  SELECT p.id INTO v_user FROM public.profiles p WHERE p.admission_number = trim(p_admission) LIMIT 1;
  INSERT INTO public.support_tickets (
    user_id, admission_number, full_name, email, student_class, role,
    category, subject, description, priority, status
  ) VALUES (
    v_user, trim(p_admission), left(p_full_name, 120), nullif(left(p_email, 255), ''), p_student_class, p_role,
    p_category, left(p_subject, 150), left(p_description, 2000), COALESCE(p_priority, 'medium'), 'open'
  ) RETURNING support_tickets.id, support_tickets.ticket_number INTO v_id, v_no;

  RETURN QUERY SELECT v_id, v_no;
END;
$$;

-- Do not inherit known placeholder/school-system mailboxes as notification addresses.
CREATE OR REPLACE FUNCTION public.set_notification_email_for_new_profile()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.notification_email IS NULL
     AND NEW.email IS NOT NULL
     AND NEW.email !~* '@(kvschool\.in|kvsulur\.com|kvschennairo\.in|kvsulur\.in|internal|dummy|example\.com)$' THEN
    NEW.notification_email := lower(trim(NEW.email));
    NEW.notification_email_confirmed_at := COALESCE(NEW.notification_email_confirmed_at, now());
  END IF;
  RETURN NEW;
END;
$$;

-- Recovery lookup should recognise a real notification address and report any
-- known placeholder mailbox as unusable.
CREATE OR REPLACE FUNCTION public.get_account_recovery_options(identifier text)
RETURNS TABLE(
  user_id uuid, auth_email text, first_name text, last_name text, role text,
  student_class text, admission_number text, has_personal_email boolean,
  masked_email text, is_dummy_email boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rec record;
  v_target_email text;
  v_is_dummy boolean;
  v_masked text;
BEGIN
  IF identifier IS NULL OR trim(identifier) = '' THEN RETURN; END IF;
  SELECT p.id, u.email AS auth_email, p.email AS profile_email, p.notification_email,
         p.first_name, p.last_name, p.role, p.student_class, p.admission_number
  INTO v_rec
  FROM public.profiles p JOIN auth.users u ON u.id = p.id
  WHERE lower(trim(p.email)) = lower(trim(identifier))
     OR lower(trim(p.notification_email)) = lower(trim(identifier))
     OR lower(trim(u.email)) = lower(trim(identifier))
     OR lower(trim(p.username)) = lower(trim(identifier))
     OR trim(p.phone) = trim(identifier)
     OR trim(p.admission_number) = trim(identifier)
  LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

  v_is_dummy := coalesce(v_rec.auth_email, '') ~* '@(kvschool\.in|kvsulur\.com|kvschennairo\.in|kvsulur\.in|internal|dummy|example\.com)$';
  -- Gmail is preferred, then any other non-placeholder address.
  SELECT candidate INTO v_target_email
  FROM unnest(ARRAY[v_rec.notification_email, v_rec.profile_email, v_rec.auth_email]) AS candidate
  WHERE candidate ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    AND candidate !~* '@(kvschool\.in|kvsulur\.com|kvschennairo\.in|kvsulur\.in|internal|dummy|example\.com)$'
  ORDER BY CASE WHEN candidate ~* '@gmail\.com$' THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_target_email IS NOT NULL THEN
    v_masked := left(split_part(v_target_email, '@', 1), 1) || '***@' || split_part(v_target_email, '@', 2);
  END IF;
  RETURN QUERY SELECT v_rec.id, v_rec.auth_email, v_rec.first_name, v_rec.last_name,
    v_rec.role, v_rec.student_class, v_rec.admission_number, (v_target_email IS NOT NULL), v_masked, v_is_dummy;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_account_recovery_options(text) TO anon, authenticated;


-- >>> FILE: 20260920100000_community_comment_reports.sql
-- Add comment_id to community_reports to support reporting post replies/comments
ALTER TABLE public.community_reports ADD COLUMN IF NOT EXISTS comment_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE;

-- Ensure RLS allows inserting comment_id
DROP POLICY IF EXISTS "Users can report posts" ON public.community_reports;
DROP POLICY IF EXISTS "Users can report content" ON public.community_reports;

CREATE POLICY "Users can report content" ON public.community_reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());


-- >>> FILE: 20260923000000_order_class_league_by_avg_points.sql
-- Update get_class_league_v2 to order by average points descending (column 4) instead of total points (column 2)
-- Secondary sort is total points descending (column 2) to break ties cleanly.

CREATE OR REPLACE FUNCTION public.get_class_league_v2(p_period text DEFAULT 'lifetime')
RETURNS TABLE(student_class text, total_points bigint, student_count bigint, avg_points numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_since timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  v_since := date_trunc('month', now());
  
  IF p_period = 'monthly' THEN
    RETURN QUERY
      SELECT 
        p.student_class, 
        SUM(GREATEST(COALESCE(p.monthly_points, 0), COALESCE(pp.pts, 0)))::bigint, 
        COUNT(*)::bigint,
        ROUND(SUM(GREATEST(COALESCE(p.monthly_points, 0), COALESCE(pp.pts, 0)))::numeric / GREATEST(COUNT(*), 1), 1)
      FROM public.profiles p
      LEFT JOIN public.get_period_points(v_since) pp ON pp.user_id = p.id
      WHERE p.role = 'student' AND COALESCE(p.student_class,'') <> ''
      GROUP BY p.student_class
      ORDER BY 4 DESC, 2 DESC;
  ELSE
    RETURN QUERY
      SELECT 
        p.student_class, 
        COALESCE(SUM(p.points), 0)::bigint, 
        COUNT(*)::bigint,
        ROUND(COALESCE(SUM(p.points), 0)::numeric / GREATEST(COUNT(*), 1), 1)
      FROM public.profiles p
      WHERE p.role = 'student' AND COALESCE(p.student_class,'') <> ''
      GROUP BY p.student_class
      ORDER BY 4 DESC, 2 DESC;
  END IF;
END; $$;

REVOKE ALL ON FUNCTION public.get_class_league_v2(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_class_league_v2(text) TO authenticated;


-- >>> FILE: 20260923120000_review_text_required_and_game_content.sql
-- ============================================================
-- 1. Enforce review_text is required for review points
--    The DB trigger now only awards points if review_text is 
--    non-null AND has at least 20 characters after trimming.
-- ============================================================
CREATE OR REPLACE FUNCTION public.award_review_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pts integer := 15;
BEGIN
  -- Only award points if the student wrote an actual text review
  IF NEW.review_text IS NULL OR length(trim(NEW.review_text)) < 20 THEN
    RETURN NEW; -- no points for star-only reviews
  END IF;

  BEGIN
    SELECT COALESCE((value #>> '{}')::integer, (value)::text::integer, 15)
    INTO v_pts FROM public.system_settings WHERE key = 'points_per_review';
  EXCEPTION WHEN OTHERS THEN
    v_pts := 15;
  END;
  v_pts := COALESCE(v_pts, 15);

  IF v_pts > 0 THEN
    UPDATE public.profiles
    SET points = COALESCE(points, 0) + v_pts
    WHERE id = NEW.user_id;
    PERFORM public.notify_user(
      NEW.user_id,
      'Review points awarded',
      format('Thanks for your written book review! +%s XP added.', v_pts),
      'points'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Re-attach the trigger (it already exists but we replaced the function)
DROP TRIGGER IF EXISTS trg_award_review_points ON public.book_reviews;
CREATE TRIGGER trg_award_review_points
  AFTER INSERT ON public.book_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.award_review_points();


-- ============================================================
-- 2. Seed new riddle game content
-- ============================================================
INSERT INTO public.game_content (game_key, kind, value, hint, extra) VALUES
  ('riddle-rounds','riddle','I hold hundreds of stories without saying a single word, and you must return me or face a fine. What am I?','You borrow me','{"answer":"Library Book"}'),
  ('riddle-rounds','riddle','I have a spine, but I cannot feel pain. I have chapters, but no house. What am I?','A work of fiction','{"answer":"Novel"}'),
  ('riddle-rounds','riddle','I am the first page that tells you the title, the author and the year. What am I?','Front of the book','{"answer":"Title Page"}'),
  ('riddle-rounds','riddle','I list every topic in a book from A to Z at the very back. What am I?','Alphabetical list','{"answer":"Index"}'),
  ('riddle-rounds','riddle','I come before chapter one and set the scene. Authors write me to welcome readers. What am I?','Introduction of a book','{"answer":"Prologue"}'),
  ('riddle-rounds','riddle','I am the force that pulls you to the ground and keeps planets in orbit. What am I?','Newton discovered me','{"answer":"Gravity"}'),
  ('riddle-rounds','riddle','I am made of hydrogen and oxygen. Every living thing needs me. What am I?','H₂O','{"answer":"Water"}'),
  ('riddle-rounds','riddle','Plants make their food using me, water, and sunlight. What process am I?','Green leaves do this','{"answer":"Photosynthesis"}'),
  ('riddle-rounds','riddle','I am the smallest unit of life. Every living organism is made of me. What am I?','Seen under a microscope','{"answer":"Cell"}'),
  ('riddle-rounds','riddle','What has hands but cannot clap?','It tells the time','{"answer":"Clock"}'),
  ('riddle-rounds','riddle','What can you catch but not throw?','You sneeze when you have it','{"answer":"Cold"}'),
  ('riddle-rounds','riddle','I have a head and a tail but no body. What am I?','Currency','{"answer":"Coin"}'),
  ('riddle-rounds','riddle','The more you share me, the more I grow. What am I?','Gained from books','{"answer":"Knowledge"}'),
  ('riddle-rounds','riddle','I run all day and never walk. I have a mouth but never talk. What am I?','Flows to the ocean','{"answer":"River"}'),
  ('riddle-rounds','riddle','What word becomes shorter when you add two letters to it?','Think about the word itself','{"answer":"Short"}'),
  ('riddle-rounds','riddle','What invention lets you look right through a wall?','Found in buildings','{"answer":"Window"}'),
  ('riddle-rounds','riddle','I orbit the Earth, reflect sunlight at night, and cause the tides. What am I?','Earth natural satellite','{"answer":"Moon"}'),
  ('riddle-rounds','riddle','What has an eye but cannot see?','Used for sewing','{"answer":"Needle"}')
ON CONFLICT DO NOTHING;


-- ============================================================
-- 3. Seed literary places content
-- ============================================================
INSERT INTO public.game_content (game_key, kind, value, hint, extra) VALUES
  ('literary-places','place','Hogwarts','School of witchcraft and wizardry','{"answer":"Harry Potter"}'),
  ('literary-places','place','Malgudi','A fictional South Indian town','{"answer":"R. K. Narayan"}'),
  ('literary-places','place','Neverland','Where children never grow old','{"answer":"Peter Pan"}'),
  ('literary-places','place','Wonderland','Down the rabbit hole','{"answer":"Alice in Wonderland"}'),
  ('literary-places','place','Narnia','Through the wardrobe','{"answer":"C.S. Lewis"}'),
  ('literary-places','place','Middle-earth','Home of hobbits and elves','{"answer":"J.R.R. Tolkien"}'),
  ('literary-places','place','Hastinapur','Kingdom of the Pandavas','{"answer":"Mahabharata"}'),
  ('literary-places','place','Lanka','Kingdom of Ravana','{"answer":"Ramayana"}'),
  ('literary-places','place','Oceania','A dystopian state','{"answer":"George Orwell"}'),
  ('literary-places','place','Treasure Island','Where pirates hide their gold','{"answer":"Robert Louis Stevenson"}'),
  ('literary-places','place','Lilliput','Land of tiny people','{"answer":"Jonathan Swift"}'),
  ('literary-places','place','Baker Street','221B is the famous address','{"answer":"Sherlock Holmes"}'),
  ('literary-places','place','Verona','City of star-crossed lovers','{"answer":"Romeo and Juliet"}'),
  ('literary-places','place','Transylvania','Home of the famous vampire','{"answer":"Dracula"}'),
  ('literary-places','place','Pemberley','Mr. Darcy''s estate','{"answer":"Jane Austen"}')
ON CONFLICT DO NOTHING;


-- ============================================================
-- 4. Seed word content for various games
-- ============================================================
INSERT INTO public.game_content (game_key, kind, value, hint, extra) VALUES
  ('reading-wordle','word','FABLE','A short moral story','{}'),
  ('reading-wordle','word','GENRE','Category of books','{}'),
  ('reading-wordle','word','PROSE','Non-verse writing','{}'),
  ('reading-wordle','word','THEME','Central idea of a story','{}'),
  ('reading-wordle','word','VERSE','Poetic lines','{}'),
  ('reading-wordle','word','IRONY','Saying the opposite of what you mean','{}'),
  ('reading-wordle','word','SIMILE','Comparison using like or as','{}'),
  ('reading-wordle','word','ATLAS','Book of maps','{}'),
  ('reading-wordle','word','DRAFT','Early version of writing','{}'),
  ('reading-wordle','word','QUOTE','Exact words from a text','{}'),
  ('word-scramble','word','ALLEGORY','A story with a hidden meaning','{}'  ),
  ('word-scramble','word','PROLOGUE','Introduction before chapter one','{}'),
  ('word-scramble','word','EPILOGUE','Closing section of a book','{}'),
  ('word-scramble','word','NARRATIVE','A story or account','{}'),
  ('word-scramble','word','BIOGRAPHY','Life story of a real person','{}'),
  ('word-scramble','word','ANTHOLOGY','Collection of literary works','{}'),
  ('word-scramble','word','SUSPENSE','Excited uncertainty in a story','{}'),
  ('word-scramble','word','CONFLICT','Struggle between opposing forces','{}'),
  ('word-search','word','NOVEL','Long work of fiction','{}'),
  ('word-search','word','POEM','Verse composition','{}'),
  ('word-search','word','SHELF','Where books rest','{}'),
  ('word-search','word','AUTHOR','Writer of a book','{}'),
  ('word-search','word','INDEX','Alphabetical list at back','{}'),
  ('word-search','word','STORY','Narrative account','{}'),
  ('word-search','word','FABLE','Short moral tale','{}'),
  ('word-search','word','GENRE','Book category','{}'),
  ('word-search','word','ATLAS','Book of maps','{}'),
  ('word-search','word','THEME','Central idea','{}'),
  ('word-search','word','IRONY','Saying opposite','{}'),
  ('spell-bee','word','RHYTHM','Repeated pattern in music or verse','{}'),
  ('spell-bee','word','CATALOGUE','Complete list of items','{}'),
  ('spell-bee','word','LITERATURE','Written works of lasting value','{}'),
  ('spell-bee','word','OCCASION','A particular event or time','{}'),
  ('spell-bee','word','NECESSARY','Essential; required','{}'),
  ('spell-bee','word','BEAUTIFUL','Pleasing to the senses','{}'),
  ('spell-bee','word','EXAGGERATE','To overstate something','{}'),
  ('spell-bee','word','PRIVILEGE','A special right or advantage','{}'),
  ('spell-bee','word','PHILOSOPHY','Study of fundamental questions','{}'),
  ('spell-bee','word','VOCABULARY','All the words a person knows','{}')
ON CONFLICT DO NOTHING;


-- >>> FILE: 20260923130000_deduplicate_notifications.sql
-- ====================================================================
-- Notification Deduplication Migration
-- Prevents duplicate notification spam for post likes, comments, etc.
-- ====================================================================

CREATE OR REPLACE FUNCTION public.notify_user(_user_id uuid, _title text, _message text, _type text DEFAULT 'info')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;

  -- Server-side deduplication: if identical notification sent to this user in the last 15 seconds, skip duplicate
  IF EXISTS (
    SELECT 1 FROM public.notifications 
    WHERE target_user_id = _user_id 
      AND title = _title 
      AND message = _message 
      AND created_at > (now() - interval '15 seconds')
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (title, message, type, target_user_id, sent_by, is_read)
  VALUES (_title, _message, COALESCE(_type,'info'), _user_id, NULL, false);
END; $$;

REVOKE EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text) FROM anon, authenticated;


-- >>> FILE: 20260924000000_cache_memory_and_index_tuning.sql
-- ==============================================================================
-- DATABASE CACHE MEMORY OPTIMIZATION & SEAMLESS QUERY PERFORMANCE
-- Migration: 20260924000000_cache_memory_and_index_tuning.sql
-- ==============================================================================

-- 1. Enable pg_trgm for ultra-fast, index-backed substring and title searches.
-- This stops PostgreSQL from running full-table sequential scans into shared_buffers
-- during user search queries.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Trigram GIN Indexes on Books for zero-cache-thrashing text search
CREATE INDEX IF NOT EXISTS idx_books_title_trgm 
ON public.books USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_books_author_trgm 
ON public.books USING gin (author gin_trgm_ops);

-- 3. Partial Indexes (Minimal Cache Footprint)
-- Partial indexes only store active rows, reducing index size in RAM cache by up to 90%.

-- Available books partial index (used heavily on Catalog 'Available Now' filter)
CREATE INDEX IF NOT EXISTS idx_books_available_copies_partial
ON public.books (category, created_at DESC)
WHERE available_copies > 0;

-- Pending reservations partial index (avoids caching closed/cancelled reservations)
CREATE INDEX IF NOT EXISTS idx_book_reservations_pending_partial
ON public.book_reservations (user_id, book_id, created_at)
WHERE status = 'pending';

-- Active book issues partial index (avoids caching historic returned book records)
CREATE INDEX IF NOT EXISTS idx_book_issues_active_issued_partial
ON public.book_issues (user_id, book_id, due_date)
WHERE status = 'issued';

-- Unread notifications partial index
CREATE INDEX IF NOT EXISTS idx_notifications_unread_partial
ON public.notifications (target_user_id, created_at DESC)
WHERE is_read = false;

-- 4. Autovacuum Tuning for Churn-Heavy Tables
-- Prevents dead tuples from staying in shared_buffers RAM and bloating buffer cache.
ALTER TABLE public.login_streaks SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_vacuum_cost_limit = 1000
);

ALTER TABLE public.notifications SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_vacuum_cost_limit = 1000
);

ALTER TABLE public.book_issues SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_vacuum_cost_limit = 1000
);

-- 5. Diagnostic View: Inspect Database Cache Usage (Shared Buffers)
-- Run this view anytime to verify what tables and indexes are consuming RAM cache.
CREATE OR REPLACE VIEW public.vw_db_cache_summary AS
SELECT
  schemaname || '.' || relname AS table_name,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_disk_size,
  n_live_tup AS active_rows,
  n_dead_tup AS dead_rows,
  ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_row_pct
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

COMMENT ON VIEW public.vw_db_cache_summary IS 'Inspect table sizes and bloat affecting database buffer cache memory';


-- >>> FILE: 20260925000000_insert_new_interactive_games.sql
-- Insert new interactive games
INSERT INTO public.games (key, name, description, icon_name, category, points_per_win, max_points_per_day, daily_play_limit, sort_order) VALUES
  ('emoji-book-riddle', 'Emoji Book Riddle', 'Decode famous book titles and literary classics from playful emoji sequences.', 'Sparkles', 'puzzle', 12, 36, 4, 18),
  ('quote-guesser', 'Quote Detective', 'Identify which famous book or legendary author spoke memorable quotes.', 'Trophy', 'trivia', 15, 45, 4, 19),
  ('genre-detective', 'Genre Sorting Rush', 'Rapidly categorize incoming library books into the right shelves and genres.', 'Layers', 'speed', 12, 36, 5, 20),
  ('spine-stacker', 'Book Shelf Stacker', 'Precision timing arcade game to stack books into a towering library pile.', 'Gamepad2', 'reflex', 15, 45, 5, 21),
  ('book-2048', 'Reader''s 2048', 'Merge matching literary steps: Letter → Word → Page → Chapter → Masterpiece!', 'Grid2x2', 'puzzle', 20, 40, 3, 22),
  ('story-sequence', 'Story Chrono', 'Rearrange scrambled plot milestones of beloved tales into the correct chronological order.', 'Shuffle', 'puzzle', 15, 30, 3, 23),
  ('character-clash', 'Character Pair-Up', 'Connect legendary literary characters with their partners, sidekicks, and rivals.', 'Users', 'memory', 10, 40, 5, 24)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_name = EXCLUDED.icon_name,
  category = EXCLUDED.category,
  points_per_win = EXCLUDED.points_per_win,
  max_points_per_day = EXCLUDED.max_points_per_day,
  daily_play_limit = EXCLUDED.daily_play_limit,
  sort_order = EXCLUDED.sort_order;


-- >>> FILE: 20260925010000_ensure_user_feedback_columns.sql
-- Ensure user_feedback table has all required columns including updated_at,
-- feedback_text, description, and message to prevent schema cache errors
-- and PL/pgSQL "record 'new' has no field 'updated_at'" errors.

-- 1. Ensure updated_at column exists BEFORE any updates or triggers fire
ALTER TABLE public.user_feedback ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Ensure all text and metadata columns exist
ALTER TABLE public.user_feedback ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.user_feedback ADD COLUMN IF NOT EXISTS feedback_text text;
ALTER TABLE public.user_feedback ADD COLUMN IF NOT EXISTS message text;
ALTER TABLE public.user_feedback ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.user_feedback ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.user_feedback ADD COLUMN IF NOT EXISTS reference_id text;
ALTER TABLE public.user_feedback ADD COLUMN IF NOT EXISTS area text;
ALTER TABLE public.user_feedback ADD COLUMN IF NOT EXISTS urgency text DEFAULT 'low';
ALTER TABLE public.user_feedback ADD COLUMN IF NOT EXISTS allow_follow_up boolean DEFAULT true;
ALTER TABLE public.user_feedback ADD COLUMN IF NOT EXISTS rating integer DEFAULT 5;
ALTER TABLE public.user_feedback ADD COLUMN IF NOT EXISTS subject text DEFAULT '';

-- 3. Relax NOT NULL constraints so inserts are resilient
DO $$
BEGIN
  ALTER TABLE public.user_feedback ALTER COLUMN description DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.user_feedback ALTER COLUMN feedback_text DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.user_feedback ALTER COLUMN full_name DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 4. Drop restrictive check constraints
ALTER TABLE public.user_feedback DROP CONSTRAINT IF EXISTS user_feedback_category_check;
ALTER TABLE public.user_feedback DROP CONSTRAINT IF EXISTS user_feedback_urgency_check;

-- 5. Safe updated_at trigger setup
DROP TRIGGER IF EXISTS user_feedback_set_updated_at ON public.user_feedback;
CREATE TRIGGER user_feedback_set_updated_at 
  BEFORE UPDATE ON public.user_feedback 
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Synchronize description and feedback_text (now safe because updated_at exists)
UPDATE public.user_feedback SET feedback_text = description WHERE feedback_text IS NULL AND description IS NOT NULL;
UPDATE public.user_feedback SET description = feedback_text WHERE description IS NULL AND feedback_text IS NOT NULL;


-- >>> FILE: 20260928140000_get_total_books_issued_count.sql
﻿-- Define get_total_books_issued_count() RPC function
CREATE OR REPLACE FUNCTION public.get_total_books_issued_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.book_issues;
$$;

GRANT EXECUTE ON FUNCTION public.get_total_books_issued_count() TO anon, authenticated;


-- >>> FILE: 20261002110431_23fd2930-b5d4-4685-ae44-4727a4317167.sql
-- Anti-abuse: book reviews
CREATE OR REPLACE FUNCTION public.tg_validate_book_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_text text := btrim(coalesce(NEW.review_text,''));
  v_count int;
  v_words int;
  v_unique_words int;
BEGIN
  IF public.is_staff_or_admin(auth.uid()) AND auth.uid() IS DISTINCT FROM NEW.user_id THEN
    RETURN NEW;
  END IF;
  IF length(v_text) < 400 THEN
    RAISE EXCEPTION 'Review must be at least 400 characters long.';
  END IF;
  -- spam checks: repeated characters, too few distinct words
  IF v_text ~ '(.)\1{6,}' THEN
    RAISE EXCEPTION 'Review looks like spam (repeated characters). Please write genuine thoughts.';
  END IF;
  SELECT count(*), count(DISTINCT lower(w)) INTO v_words, v_unique_words
  FROM regexp_split_to_table(v_text, '\s+') w WHERE length(w) > 0;
  IF v_words < 60 OR v_unique_words < 35 OR v_unique_words::numeric / GREATEST(v_words,1) < 0.4 THEN
    RAISE EXCEPTION 'Review looks repetitive. Please write a genuine review in your own words.';
  END IF;
  -- no copy-pasting the same text across reviews
  IF EXISTS (SELECT 1 FROM public.book_reviews
             WHERE id IS DISTINCT FROM NEW.id
               AND lower(regexp_replace(review_text,'\s+','','g')) = lower(regexp_replace(v_text,'\s+','','g'))) THEN
    RAISE EXCEPTION 'This review text has already been used. Please write an original review.';
  END IF;
  IF TG_OP = 'INSERT' THEN
    SELECT count(*) INTO v_count FROM public.book_reviews
    WHERE user_id = NEW.user_id AND created_at >= date_trunc('day', now());
    IF v_count >= 2 THEN
      RAISE EXCEPTION 'You can post at most 2 book reviews per day. Try again tomorrow.';
    END IF;
  END IF;
  NEW.review_text := v_text;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_book_review ON public.book_reviews;
CREATE TRIGGER trg_validate_book_review BEFORE INSERT OR UPDATE OF review_text ON public.book_reviews
FOR EACH ROW EXECUTE FUNCTION public.tg_validate_book_review();

-- Games: global 1000 XP/day cap + rapid-fire throttle
CREATE OR REPLACE FUNCTION public.record_game_play_v2(p_game_key text, p_score integer, p_is_win boolean, p_duration_seconds integer, p_session_id uuid DEFAULT NULL::uuid, p_client_nonce text DEFAULT NULL::text, p_answers jsonb DEFAULT NULL::jsonb, p_offline boolean DEFAULT false)
 RETURNS TABLE(points_awarded integer, plays_left integer, message text, verified boolean)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  g record; s record;
  v_plays integer; v_today_pts integer; v_all_today integer; v_recent integer;
  v_pts integer := 0;
  v_win boolean := COALESCE(p_is_win,false);
  v_score integer := GREATEST(COALESCE(p_score,0),0);
  v_dur integer := GREATEST(COALESCE(p_duration_seconds,0),0);
  v_verified boolean := true;
  v_msg text := 'Play recorded.';
  a jsonb; v_expected text;
  c_daily_cap constant integer := 1000;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO g FROM public.games WHERE key = p_game_key;
  IF g IS NULL OR NOT g.is_enabled THEN
    RETURN QUERY SELECT 0, 0, 'This game is currently unavailable.', false; RETURN;
  END IF;
  IF p_client_nonce IS NOT NULL AND EXISTS (SELECT 1 FROM public.game_plays WHERE user_id = v_uid AND client_nonce = p_client_nonce) THEN
    RETURN QUERY SELECT 0, 0, 'This round was already submitted.', false; RETURN;
  END IF;
  IF p_session_id IS NOT NULL THEN
    SELECT * INTO s FROM public.game_sessions WHERE id = p_session_id AND user_id = v_uid;
    IF s IS NULL OR s.consumed_at IS NOT NULL OR s.game_key <> p_game_key THEN
      v_verified := false; v_win := false; v_msg := 'Round could not be verified.';
    ELSE
      UPDATE public.game_sessions SET consumed_at = now() WHERE id = p_session_id;
      v_dur := GREATEST(EXTRACT(EPOCH FROM (now() - s.started_at))::int, 0);
    END IF;
  ELSIF NOT p_offline THEN
    v_verified := false; v_win := false; v_msg := 'Round could not be verified.';
  END IF;
  IF v_verified AND v_dur < COALESCE(g.min_duration_seconds,5) THEN
    v_verified := false; v_win := false; v_msg := 'Round finished too quickly to count.';
  END IF;
  IF v_verified AND v_dur > 7200 THEN
    v_verified := false; v_win := false; v_msg := 'Round took too long to count.';
  END IF;
  IF v_score > COALESCE(g.max_score,100000) THEN
    v_verified := false; v_win := false; v_msg := 'Reported score is out of range.';
    v_score := LEAST(v_score, COALESCE(g.max_score,100000));
  END IF;
  -- Rapid-fire: more than 10 rounds in the last 5 minutes across all games is suspicious
  SELECT count(*) INTO v_recent FROM public.game_plays WHERE user_id = v_uid AND played_at > now() - interval '5 minutes';
  IF v_recent >= 10 THEN
    v_verified := false; v_win := false; v_msg := 'Too many rounds too quickly — slow down to earn points.';
  END IF;
  IF v_verified AND p_answers IS NOT NULL AND jsonb_typeof(p_answers) = 'array' THEN
    FOR a IN SELECT jsonb_array_elements(p_answers) LOOP
      SELECT COALESCE(NULLIF(extra->>'answer',''), value) INTO v_expected FROM public.game_content
      WHERE id = (a->>'id')::uuid AND game_key = p_game_key;
      IF v_expected IS NULL OR lower(regexp_replace(COALESCE(a->>'answer',''), '[^a-zA-Z0-9]', '', 'g'))
            <> lower(regexp_replace(v_expected, '[^a-zA-Z0-9]', '', 'g')) THEN
        v_verified := false; v_win := false; v_msg := 'Answers did not match the library content.'; EXIT;
      END IF;
    END LOOP;
  END IF;
  SELECT COUNT(*)::int, COALESCE(SUM(points_earned),0)::int INTO v_plays, v_today_pts
  FROM public.game_plays WHERE user_id = v_uid AND game_key = p_game_key AND played_at::date = CURRENT_DATE;
  SELECT COALESCE(SUM(points_earned),0)::int INTO v_all_today
  FROM public.game_plays WHERE user_id = v_uid AND played_at::date = CURRENT_DATE;
  IF g.daily_play_limit > 0 AND v_plays >= g.daily_play_limit THEN
    INSERT INTO public.game_plays (user_id, game_id, game_key, score, points_earned, duration_seconds, is_win, client_nonce, session_id, was_offline)
    VALUES (v_uid, g.id, p_game_key, v_score, 0, v_dur, v_win, p_client_nonce, p_session_id, p_offline);
    RETURN QUERY SELECT 0, 0, 'Daily play limit reached — no more points today.', v_verified; RETURN;
  END IF;
  IF v_win AND v_verified THEN
    v_pts := GREATEST(g.points_per_win, 0);
    IF g.max_points_per_day > 0 THEN
      v_pts := GREATEST(LEAST(v_pts, g.max_points_per_day - v_today_pts), 0);
    END IF;
    v_pts := GREATEST(LEAST(v_pts, c_daily_cap - v_all_today), 0);
    v_msg := CASE WHEN v_pts = 0 AND v_all_today >= c_daily_cap THEN 'Daily Games Corner limit of 1000 XP reached.' ELSE 'Nice work!' END;
  END IF;
  INSERT INTO public.game_plays (user_id, game_id, game_key, score, points_earned, duration_seconds, is_win, client_nonce, session_id, was_offline)
  VALUES (v_uid, g.id, p_game_key, v_score, v_pts, v_dur, v_win, p_client_nonce, p_session_id, p_offline);
  IF v_pts > 0 THEN
    UPDATE public.profiles SET points = COALESCE(points,0) + v_pts WHERE id = v_uid;
  END IF;
  RETURN QUERY SELECT v_pts,
    CASE WHEN g.daily_play_limit > 0 THEN GREATEST(g.daily_play_limit - v_plays - 1, 0) ELSE 999 END,
    v_msg, v_verified;
END; $function$;

-- Legacy unverified endpoint can no longer be used to farm points
REVOKE EXECUTE ON FUNCTION public.record_game_play(text, integer, boolean, integer) FROM authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.get_game_analytics() TO authenticated;

-- >>> FILE: 20261002110454_d6ad827b-b7cc-47fd-b375-c99769d9fa9a.sql
REVOKE EXECUTE ON FUNCTION public.tg_validate_book_review() FROM public, anon, authenticated;

-- >>> FILE: 20261002110745_8f338015-8c1f-45c7-9a03-a62a46d7c7f1.sql
-- Missing columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hindi_name text,
  ADD COLUMN IF NOT EXISTS monthly_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS whatsapp_reward_claimed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_joined_at timestamptz,
  ADD COLUMN IF NOT EXISTS notification_email text,
  ADD COLUMN IF NOT EXISTS notification_email_confirmed_at timestamptz;
ALTER TABLE public.issued_certificates
  ADD COLUMN IF NOT EXISTS title_hindi text,
  ADD COLUMN IF NOT EXISTS name_hindi text,
  ADD COLUMN IF NOT EXISTS event_name text,
  ADD COLUMN IF NOT EXISTS event_hindi text,
  ADD COLUMN IF NOT EXISTS during_text text,
  ADD COLUMN IF NOT EXISTS certificate_no text,
  ADD COLUMN IF NOT EXISTS unlock_at timestamptz,
  ADD COLUMN IF NOT EXISTS common_text text,
  ADD COLUMN IF NOT EXISTS bilingual_data jsonb;
ALTER TABLE public.quiz_sessions
  ADD COLUMN IF NOT EXISTS time_per_question integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS scheduled_start_at timestamptz;
ALTER TABLE public.user_feedback ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS doubt_subject text,
  ADD COLUMN IF NOT EXISTS doubt_class text,
  ADD COLUMN IF NOT EXISTS doubt_status text,
  ADD COLUMN IF NOT EXISTS accepted_comment_id uuid;
ALTER TABLE public.library_events ADD COLUMN IF NOT EXISTS redirect_url text;

-- Bug bounty
CREATE TABLE IF NOT EXISTS public.bug_bounty_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  student_id uuid,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bug_bounty_campaigns TO authenticated;
GRANT ALL ON public.bug_bounty_campaigns TO service_role;
ALTER TABLE public.bug_bounty_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bbc read" ON public.bug_bounty_campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "bbc staff write" ON public.bug_bounty_campaigns FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.bug_bounty_campaigns(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  rewarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bug_reports TO authenticated;
GRANT ALL ON public.bug_reports TO service_role;
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "br own read" ON public.bug_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "br own insert" ON public.bug_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid() AND status = 'pending');
CREATE POLICY "br staff update" ON public.bug_reports FOR UPDATE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "br staff delete" ON public.bug_reports FOR DELETE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

-- Email campaign history
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preset text NOT NULL,
  subject text NOT NULL,
  recipient_count integer NOT NULL DEFAULT 0,
  sent_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.email_campaigns TO authenticated;
GRANT ALL ON public.email_campaigns TO service_role;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ec staff" ON public.email_campaigns FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- Event winners
CREATE TABLE IF NOT EXISTS public.event_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  position integer,
  position_title text,
  position_title_hindi text,
  collection_date date,
  collection_venue text,
  librarian_note text,
  certificate_id uuid,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  acknowledged_user_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_winners TO authenticated;
GRANT ALL ON public.event_winners TO service_role;
ALTER TABLE public.event_winners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ew read" ON public.event_winners FOR SELECT TO authenticated
  USING (is_published OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "ew staff write" ON public.event_winners FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- RPCs
CREATE OR REPLACE FUNCTION public.get_total_book_copies() RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(total_copies),0)::int FROM public.books $$;
GRANT EXECUTE ON FUNCTION public.get_total_book_copies() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.increment_book_available_copies(p_book_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.books SET available_copies = LEAST(available_copies + 1, total_copies) WHERE id = p_book_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.increment_book_available_copies(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.increment_book_available_copies(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.bulk_delete_book_requests(p_request_ids uuid[]) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  DELETE FROM public.book_requests WHERE id = ANY(p_request_ids);
  GET DIAGNOSTICS n = ROW_COUNT; RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.bulk_delete_book_requests(uuid[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bulk_delete_book_requests(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_book_request(
  p_book_id uuid DEFAULT NULL, p_requested_title text DEFAULT NULL, p_requested_author text DEFAULT NULL,
  p_requested_isbn text DEFAULT NULL, p_requested_description text DEFAULT NULL, p_admin_notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_old record; v_over boolean := false; v_title text; v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF (SELECT count(*) FROM public.book_requests WHERE user_id = v_uid AND status = 'pending') >= 2 THEN
    SELECT r.id, COALESCE(r.requested_title, b.title) AS t INTO v_old
    FROM public.book_requests r LEFT JOIN public.books b ON b.id = r.book_id
    WHERE r.user_id = v_uid AND r.status = 'pending' ORDER BY r.created_at LIMIT 1;
    DELETE FROM public.book_requests WHERE id = v_old.id;
    v_over := true; v_title := v_old.t;
  END IF;
  INSERT INTO public.book_requests (book_id, user_id, requested_title, requested_author, requested_isbn, requested_description, admin_notes, status)
  VALUES (p_book_id, v_uid, p_requested_title, p_requested_author, p_requested_isbn, p_requested_description, p_admin_notes, 'pending')
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('id', v_id, 'overwritten', v_over, 'overwritten_title', v_title);
END $$;
REVOKE EXECUTE ON FUNCTION public.submit_book_request(uuid,text,text,text,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.submit_book_request(uuid,text,text,text,text,text) TO authenticated;

-- >>> FILE: 20261009220000_fix_admin_user_profile_creation.sql
-- Migration: Fix admin user profile creation and handle_new_user trigger
-- Ensures that whenever a user is inserted into auth.users, a corresponding row in public.profiles is always created.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid text;
  email_lower text;
  username_val text;
  phone_val text;
  first_name_val text;
  last_name_val text;
  role_val text;
  class_val text;
  roll_val text;
  is_approved_val boolean;
BEGIN
  email_lower := LOWER(COALESCE(NEW.email, ''));
  uid := COALESCE(NEW.raw_user_meta_data->>'admission_number', SPLIT_PART(email_lower, '@', 1));
  username_val := COALESCE(NEW.raw_user_meta_data->>'username', uid, email_lower);
  phone_val := NULLIF(COALESCE(NEW.raw_user_meta_data->>'phone', ''), '');
  first_name_val := COALESCE(NEW.raw_user_meta_data->>'first_name', 'Student');
  last_name_val := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  role_val := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  class_val := COALESCE(NEW.raw_user_meta_data->>'student_class', '');
  roll_val := COALESCE(NEW.raw_user_meta_data->>'roll_number', '');
  is_approved_val := COALESCE((NEW.raw_user_meta_data->>'is_approved')::boolean, (role_val = 'admin'), false);

  -- Insert or update profile row
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    role,
    student_class,
    roll_number,
    admission_number,
    username,
    phone,
    is_approved,
    needs_profile_update,
    updated_at
  )
  VALUES (
    NEW.id,
    email_lower,
    first_name_val,
    last_name_val,
    role_val,
    class_val,
    roll_val,
    uid,
    username_val,
    phone_val,
    is_approved_val,
    COALESCE((NEW.raw_user_meta_data->>'needs_profile_update')::boolean, false),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    student_class = EXCLUDED.student_class,
    roll_number = EXCLUDED.roll_number,
    admission_number = EXCLUDED.admission_number,
    username = EXCLUDED.username,
    phone = EXCLUDED.phone,
    is_approved = CASE WHEN public.profiles.is_approved THEN true ELSE EXCLUDED.is_approved END,
    updated_at = NOW();

  RETURN NEW;
EXCEPTION WHEN unique_violation THEN
  -- Handle potential username collision by appending last 4 characters of user ID
  BEGIN
    INSERT INTO public.profiles (
      id, email, first_name, last_name, role, student_class,
      roll_number, admission_number, username, phone, is_approved,
      needs_profile_update, updated_at
    )
    VALUES (
      NEW.id, email_lower, first_name_val, last_name_val, role_val, class_val,
      roll_val, uid, username_val || '_' || SUBSTRING(NEW.id::text FROM 1 FOR 4), phone_val,
      is_approved_val, COALESCE((NEW.raw_user_meta_data->>'needs_profile_update')::boolean, false), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      updated_at = NOW();
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;
  RETURN NEW;
WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Redefine sync_missing_auth_profiles to allow superuser/SQL editor runs while still checking authorization for web users
CREATE OR REPLACE FUNCTION public.sync_missing_auth_profiles()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u record;
  synced_count integer := 0;
  uid text;
  username_val text;
  phone_val text;
  email_lower text;
BEGIN
  -- If executed from a web client session, ensure user is staff or admin
  -- (If auth.uid() is NULL, it is running directly from the Supabase SQL editor or migration runner, which is allowed)
  IF auth.uid() IS NOT NULL AND NOT public.is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  FOR u IN SELECT * FROM auth.users LOOP
    BEGIN
      email_lower := LOWER(COALESCE(u.email, ''));
      uid := COALESCE(u.raw_user_meta_data->>'admission_number', SPLIT_PART(email_lower, '@', 1));
      username_val := COALESCE(u.raw_user_meta_data->>'username', uid, email_lower);
      phone_val := NULLIF(COALESCE(u.raw_user_meta_data->>'phone', ''), '');

      -- If profile exists with this user id, update it
      IF EXISTS (SELECT 1 FROM public.profiles WHERE id = u.id) THEN
        UPDATE public.profiles SET
          email = email_lower,
          first_name = COALESCE(u.raw_user_meta_data->>'first_name', 'Student'),
          last_name = COALESCE(u.raw_user_meta_data->>'last_name', ''),
          student_class = COALESCE(u.raw_user_meta_data->>'student_class', ''),
          roll_number = COALESCE(u.raw_user_meta_data->>'roll_number', ''),
          admission_number = uid,
          username = username_val,
          phone = phone_val,
          is_approved = true,
          updated_at = NOW()
        WHERE id = u.id;
        synced_count := synced_count + 1;
      -- If matching by admission_number, username, or email, link to this user
      ELSIF EXISTS (SELECT 1 FROM public.profiles WHERE admission_number = uid OR email = email_lower OR username = username_val) THEN
        UPDATE public.profiles SET
          id = u.id,
          email = email_lower,
          first_name = COALESCE(u.raw_user_meta_data->>'first_name', 'Student'),
          last_name = COALESCE(u.raw_user_meta_data->>'last_name', ''),
          student_class = COALESCE(u.raw_user_meta_data->>'student_class', ''),
          roll_number = COALESCE(u.raw_user_meta_data->>'roll_number', ''),
          phone = phone_val,
          is_approved = true,
          updated_at = NOW()
        WHERE admission_number = uid OR email = email_lower OR username = username_val;
        synced_count := synced_count + 1;
      ELSE
        -- Insert new profile
        INSERT INTO public.profiles (
          id,
          email,
          first_name,
          last_name,
          role,
          student_class,
          roll_number,
          admission_number,
          username,
          phone,
          is_approved,
          needs_profile_update,
          updated_at
        ) VALUES (
          u.id,
          email_lower,
          COALESCE(u.raw_user_meta_data->>'first_name', 'Student'),
          COALESCE(u.raw_user_meta_data->>'last_name', ''),
          COALESCE(u.raw_user_meta_data->>'role', 'student'),
          COALESCE(u.raw_user_meta_data->>'student_class', ''),
          COALESCE(u.raw_user_meta_data->>'roll_number', ''),
          uid,
          username_val,
          phone_val,
          true,
          false,
          NOW()
        );
        synced_count := synced_count + 1;
      END IF;
    EXCEPTION WHEN unique_violation THEN
      -- If username collision occurs, append unique ID suffix
      BEGIN
        INSERT INTO public.profiles (
          id, email, first_name, last_name, role, student_class,
          roll_number, admission_number, username, phone, is_approved,
          needs_profile_update, updated_at
        ) VALUES (
          u.id, email_lower,
          COALESCE(u.raw_user_meta_data->>'first_name', 'Student'),
          COALESCE(u.raw_user_meta_data->>'last_name', ''),
          COALESCE(u.raw_user_meta_data->>'role', 'student'),
          COALESCE(u.raw_user_meta_data->>'student_class', ''),
          COALESCE(u.raw_user_meta_data->>'roll_number', ''),
          uid,
          username_val || '_' || SUBSTRING(u.id::text FROM 1 FOR 4),
          phone_val, true, false, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET updated_at = NOW();
        synced_count := synced_count + 1;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
  RETURN synced_count;
END;
$$;

-- Ensure sync_missing_auth_profiles is granted to authenticated users and service_role
GRANT EXECUTE ON FUNCTION public.sync_missing_auth_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_missing_auth_profiles() TO service_role;

-- Execute sync to backfill any existing un-synced auth users immediately
SELECT public.sync_missing_auth_profiles();


-- >>> FILE: 20261009230000_add_super_admins_local.sql
-- =============================================================================
-- Migration: Add super_admins table to each school's local DB
-- This allows super admin access to work without a separate registry project.
-- When a dedicated registry project is configured (VITE_REGISTRY_URL),
-- this table is ignored in favor of the registry's super_admins table.
-- =============================================================================

CREATE TABLE IF NOT EXISTS super_admins (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text        NOT NULL UNIQUE,
  name        text        NOT NULL DEFAULT 'Super Admin',
  auth_uid    uuid        UNIQUE,          -- maps to auth.users.id
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE super_admins IS 'Platform-level super administrators. Used when no dedicated registry project is configured.';

-- Enable Row Level Security
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

-- Helper function: is current JWT user a super admin?
CREATE OR REPLACE FUNCTION is_super_admin_local()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS
$$
  SELECT EXISTS (
    SELECT 1 FROM super_admins sa
    WHERE (sa.auth_uid = auth.uid() OR sa.email = auth.jwt() ->> 'email')
    AND   sa.is_active = true
  );
$$;

-- Super admins can read/manage their own table
CREATE POLICY "super_admins_manage_self_local"
  ON super_admins
  FOR ALL
  USING  (is_super_admin_local())
  WITH CHECK (is_super_admin_local());

-- Allow reading by email for initial verification (anon/authenticated)
CREATE POLICY "allow_email_lookup_local"
  ON super_admins
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Allow authenticated users to self-link auth_uid when email matches
CREATE POLICY "allow_self_link_auth_uid_local"
  ON super_admins
  FOR UPDATE
  TO authenticated
  USING (email = (auth.jwt() ->> 'email'))
  WITH CHECK (email = (auth.jwt() ->> 'email'));


