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
