-- Migration: Fix quiz_sessions missing updated_at column and trigger
-- Fixes error: record "new" has no field "updated_at" on updating quiz_sessions

ALTER TABLE public.quiz_sessions ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.quiz_sessions ADD COLUMN IF NOT EXISTS max_participants int DEFAULT NULL;

-- Ensure the trigger is safely attached to quiz_sessions
DROP TRIGGER IF EXISTS quiz_sessions_set_updated_at ON public.quiz_sessions;
CREATE TRIGGER quiz_sessions_set_updated_at 
  BEFORE UPDATE ON public.quiz_sessions 
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
