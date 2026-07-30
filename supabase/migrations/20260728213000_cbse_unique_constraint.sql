-- Add unique constraint to cbse_curriculum to allow upsert operations
-- This prevents duplicate entries during bulk imports
-- Retain the earliest row for records that were imported before this rule.
DELETE FROM public.cbse_curriculum newer
USING public.cbse_curriculum older
WHERE newer.id > older.id
  AND newer.class_number = older.class_number
  AND newer.subject = older.subject
  AND newer.chapter_title = older.chapter_title;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cbse_curriculum_unique_entry'
      AND conrelid = 'public.cbse_curriculum'::regclass
  ) THEN
    ALTER TABLE public.cbse_curriculum
      ADD CONSTRAINT cbse_curriculum_unique_entry
      UNIQUE (class_number, subject, chapter_title);
  END IF;
END $$;
