-- Student learning loop: resource types, topic metadata, and student preferences.
-- Tenant-local: every school owns its own Supabase project, so no school_id is used.

ALTER TABLE public.study_materials
  ADD COLUMN IF NOT EXISTS topic TEXT;

ALTER TABLE public.study_materials
  DROP CONSTRAINT IF EXISTS study_materials_resource_type_check;
ALTER TABLE public.study_materials
  ADD CONSTRAINT study_materials_resource_type_check
  CHECK (resource_type IN (
    'chapter_lesson', 'chapter_practice', 'short_notes', 'formula_sheet',
    'pyq', 'quick_revision', 'textbook', 'other', 'flashcards', 'mock_paper', 'checkpoint'
  ));

CREATE INDEX IF NOT EXISTS study_materials_topic_idx
  ON public.study_materials (student_class, subject, chapter_title, resource_type);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reading_prefs JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS data_saver BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'en';

-- The class value in profiles is stored as "6".."12" in most tenants but some
-- older rows carry "Class 10". Normalise to the two-digit form used by content.
CREATE OR REPLACE FUNCTION public.study_current_class()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(
    substring(
      COALESCE((SELECT student_class FROM public.profiles WHERE id = auth.uid()), '')
      FROM '[0-9]{1,2}'
    ),
    ''
  );
$$;

REVOKE ALL ON FUNCTION public.study_current_class() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.study_current_class() TO authenticated;
