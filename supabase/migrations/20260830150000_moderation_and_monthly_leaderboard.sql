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
BEGIN
  IF NEW.points IS DISTINCT FROM OLD.points THEN
    -- Only sync if NEW.points is set. Handles COALESCE fallback.
    DECLARE
      old_pts integer := COALESCE(OLD.points, 0);
      new_pts integer := COALESCE(NEW.points, 0);
      delta integer := new_pts - old_pts;
    BEGIN
      -- We check a session variable or flag if we want to skip sync during resets,
      -- but since reset clears points (or sets monthly_points to 0 directly),
      -- we only update monthly_points if points has changed and monthly_points is not being reset.
      -- During a points change:
      IF delta > 0 THEN
        NEW.monthly_points := COALESCE(NEW.monthly_points, 0) + delta;
      ELSIF delta < 0 THEN
        NEW.monthly_points := GREATEST(0, COALESCE(NEW.monthly_points, 0) + delta);
      END IF;
    END;
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
  -- We temporarily disable the sync trigger so setting monthly_points = 0 does not trigger points sync logic
  ALTER TABLE public.profiles DISABLE TRIGGER trigger_sync_monthly_points;
  UPDATE public.profiles SET monthly_points = 0;
  ALTER TABLE public.profiles ENABLE TRIGGER trigger_sync_monthly_points;
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
