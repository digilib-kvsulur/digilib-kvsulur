-- Add teacher-reviewed, bite-sized chapter lessons to the Study resource catalog.
ALTER TABLE public.study_materials
  DROP CONSTRAINT IF EXISTS study_materials_resource_type_check;

ALTER TABLE public.study_materials
  ADD CONSTRAINT study_materials_resource_type_check
  CHECK (resource_type IN ('chapter_lesson', 'short_notes', 'formula_sheet', 'pyq', 'quick_revision', 'textbook', 'other'));

CREATE INDEX IF NOT EXISTS study_materials_lesson_lookup_idx
  ON public.study_materials (student_class, subject, chapter_title, academic_session)
  WHERE resource_type = 'chapter_lesson' AND review_status = 'approved';
