-- Migration: Add streak_last_claimed to profiles and seed quiz_completion_bonus setting

-- 1. Add streak_last_claimed column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak_last_claimed date;

-- 2. Seed quiz_completion_bonus setting in system_settings
INSERT INTO public.system_settings(key, value) VALUES
  ('quiz_completion_bonus', '10'::jsonb)
ON CONFLICT (key) DO NOTHING;
