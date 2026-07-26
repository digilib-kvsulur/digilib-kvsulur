-- Add unique constraint to prevent NCERT book duplication on refetch
ALTER TABLE public.ncert_books
  ADD CONSTRAINT ncert_books_unique_chapter
  UNIQUE (class_number, subject, chapter_number);
