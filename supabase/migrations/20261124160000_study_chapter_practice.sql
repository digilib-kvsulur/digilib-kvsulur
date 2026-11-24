-- Add teacher-reviewed, interactive multiple-choice practice to chapter packs.
ALTER TABLE public.study_materials
  DROP CONSTRAINT IF EXISTS study_materials_resource_type_check;

ALTER TABLE public.study_materials
  ADD CONSTRAINT study_materials_resource_type_check
  CHECK (resource_type IN ('chapter_lesson', 'chapter_practice', 'short_notes', 'formula_sheet', 'pyq', 'quick_revision', 'textbook', 'other'));
