-- V2: structured learning resources, personal bookmarks, and private doubt history.
-- Data remains tenant-local because each school uses its own Supabase project.

ALTER TABLE public.study_materials
  ADD COLUMN IF NOT EXISTS chapter_title TEXT,
  ADD COLUMN IF NOT EXISTS resource_type TEXT NOT NULL DEFAULT 'short_notes',
  ADD COLUMN IF NOT EXISTS academic_session TEXT NOT NULL DEFAULT '2026-27',
  ADD COLUMN IF NOT EXISTS exam_year INTEGER,
  ADD COLUMN IF NOT EXISTS marks INTEGER,
  ADD COLUMN IF NOT EXISTS source_label TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS markdown_content TEXT;

ALTER TABLE public.study_materials
  DROP CONSTRAINT IF EXISTS study_materials_resource_type_check;
ALTER TABLE public.study_materials
  ADD CONSTRAINT study_materials_resource_type_check
  CHECK (resource_type IN ('short_notes', 'formula_sheet', 'pyq', 'quick_revision', 'textbook', 'other'));

CREATE INDEX IF NOT EXISTS study_materials_curriculum_idx
  ON public.study_materials (student_class, subject, chapter_title, resource_type, academic_session);

CREATE TABLE IF NOT EXISTS public.study_resource_bookmarks (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.study_materials(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, resource_id)
);
ALTER TABLE public.study_resource_bookmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students manage their own resource bookmarks" ON public.study_resource_bookmarks;
CREATE POLICY "Students manage their own resource bookmarks"
  ON public.study_resource_bookmarks FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.study_doubt_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_class TEXT NOT NULL,
  subject TEXT NOT NULL,
  question_text TEXT NOT NULL CHECK (char_length(question_text) <= 8000),
  answer_text TEXT NOT NULL CHECK (char_length(answer_text) <= 16000),
  formulas TEXT[] NOT NULL DEFAULT '{}',
  related_resource_ids UUID[] NOT NULL DEFAULT '{}',
  model_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS study_doubt_history_user_recent_idx
  ON public.study_doubt_history (user_id, created_at DESC);
ALTER TABLE public.study_doubt_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students read own doubt history" ON public.study_doubt_history;
CREATE POLICY "Students read own doubt history"
  ON public.study_doubt_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Students delete own doubt history" ON public.study_doubt_history;
CREATE POLICY "Students delete own doubt history"
  ON public.study_doubt_history FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
-- Inserts are intentionally service-side only after the Edge Function validates the student,
-- confirms the per-user rate limit, and completes the model request.

CREATE TABLE IF NOT EXISTS public.study_doubt_usage (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS study_doubt_usage_recent_idx
  ON public.study_doubt_usage (user_id, created_at DESC);
ALTER TABLE public.study_doubt_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.study_doubt_usage FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.study_doubt_begin_request(p_limit INTEGER DEFAULT 10)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_role TEXT;
  v_recent INTEGER;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = v_user;
  IF v_role <> 'student' THEN RAISE EXCEPTION 'Student access required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user::text, 0));
  SELECT count(*) INTO v_recent FROM public.study_doubt_usage
    WHERE user_id = v_user AND created_at > now() - interval '1 hour';
  IF v_recent >= greatest(1, least(p_limit, 30)) THEN RETURN FALSE; END IF;
  INSERT INTO public.study_doubt_usage (user_id) VALUES (v_user);
  RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.study_doubt_begin_request(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.study_doubt_begin_request(INTEGER) TO authenticated;
