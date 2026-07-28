-- Add unique constraint to cbse_curriculum to allow upsert operations
-- This prevents duplicate entries during bulk imports
ALTER TABLE public.cbse_curriculum
  ADD CONSTRAINT cbse_curriculum_unique_entry
  UNIQUE (class_number, subject, chapter_title);
