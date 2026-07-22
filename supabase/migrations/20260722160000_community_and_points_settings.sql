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
