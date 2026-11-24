-- Private student progress for the syllabus chapter path.
-- Missing rows mean "not started"; opening a chapter does not change progress.
CREATE TABLE IF NOT EXISTS public.study_chapter_progress (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_number TEXT NOT NULL CHECK (class_number IN ('6', '7', '8', '9', '10', '11', '12')),
  subject TEXT NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 100),
  chapter_title TEXT NOT NULL CHECK (char_length(chapter_title) BETWEEN 1 AND 240),
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'needs_revision', 'completed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, class_number, subject, chapter_title),
  CHECK ((status = 'completed') = (completed_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS study_chapter_progress_resume_idx
  ON public.study_chapter_progress (user_id, class_number, updated_at DESC)
  WHERE status = 'in_progress';

ALTER TABLE public.study_chapter_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.study_chapter_progress FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.study_chapter_progress TO authenticated;

DROP POLICY IF EXISTS "Students read own chapter progress" ON public.study_chapter_progress;
CREATE POLICY "Students read own chapter progress"
  ON public.study_chapter_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Students create own chapter progress" ON public.study_chapter_progress;
CREATE POLICY "Students create own chapter progress"
  ON public.study_chapter_progress FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'student')
  );

DROP POLICY IF EXISTS "Students update own chapter progress" ON public.study_chapter_progress;
CREATE POLICY "Students update own chapter progress"
  ON public.study_chapter_progress FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'student')
  );
