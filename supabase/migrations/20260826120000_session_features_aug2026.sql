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

-- ──────────────────────────────────────────────────────────────
-- 3. posts table: ensure post_type column allows suggestion types
--    SuggestionVoting inserts posts with post_type IN
--    ('suggestion_book', 'suggestion_feature')
--    The posts table has a post_type column; if it has a CHECK
--    constraint we need to expand it.
-- ──────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Drop the existing post_type check constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'posts'
      AND column_name = 'post_type'
      AND constraint_name LIKE '%check%'
  ) THEN
    ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_post_type_check;
  END IF;

  -- Add a new permissive constraint that includes suggestion types
  ALTER TABLE public.posts
    DROP CONSTRAINT IF EXISTS posts_post_type_check;

  ALTER TABLE public.posts
    ADD CONSTRAINT posts_post_type_check
      CHECK (post_type IN (
        'post', 'review', 'poll', 'event', 'announcement',
        'suggestion_book', 'suggestion_feature'
      ));

EXCEPTION
  WHEN others THEN
    -- If the column has no existing constraint, just move on
    NULL;
END;
$$;

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
