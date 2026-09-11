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
