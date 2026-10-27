-- Persist the student-facing winner celebration design selected during result import.
ALTER TABLE public.event_winners
  ADD COLUMN IF NOT EXISTS popup_preset text NOT NULL DEFAULT 'classic'
  CHECK (popup_preset IN ('classic', 'royal', 'modern'));

NOTIFY pgrst, 'reload schema';
