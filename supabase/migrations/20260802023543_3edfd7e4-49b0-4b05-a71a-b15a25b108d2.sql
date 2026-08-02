ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS shelf_number text,
  ADD COLUMN IF NOT EXISTS cupboard_number text,
  ADD COLUMN IF NOT EXISTS accession_numbers text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS issue_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS books_title_lower_idx ON public.books (lower(title));
CREATE INDEX IF NOT EXISTS books_author_lower_idx ON public.books (lower(author));
CREATE INDEX IF NOT EXISTS books_accession_idx ON public.books (accession_number);
CREATE INDEX IF NOT EXISTS books_issue_count_idx ON public.books (issue_count DESC);

CREATE OR REPLACE FUNCTION public.get_distinct_book_filters()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'categories', (SELECT coalesce(jsonb_agg(DISTINCT category ORDER BY category), '[]'::jsonb) FROM public.books WHERE category IS NOT NULL AND category <> ''),
    'subjects', (SELECT coalesce(jsonb_agg(DISTINCT subject ORDER BY subject), '[]'::jsonb) FROM public.books WHERE subject IS NOT NULL AND subject <> ''),
    'class_levels', (SELECT coalesce(jsonb_agg(DISTINCT class_level ORDER BY class_level), '[]'::jsonb) FROM public.books WHERE class_level IS NOT NULL AND class_level <> ''),
    'languages', (SELECT coalesce(jsonb_agg(DISTINCT language ORDER BY language), '[]'::jsonb) FROM public.books WHERE language IS NOT NULL AND language <> ''),
    'authors', (SELECT coalesce(jsonb_agg(DISTINCT author ORDER BY author), '[]'::jsonb) FROM public.books WHERE author IS NOT NULL AND author <> '')
  );
$$;

REVOKE ALL ON FUNCTION public.get_distinct_book_filters() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_distinct_book_filters() TO anon, authenticated;

UPDATE public.books b
SET issue_count = c.cnt
FROM (SELECT book_id, count(*) cnt FROM public.book_issues GROUP BY book_id) c
WHERE c.book_id = b.id AND b.issue_count = 0;