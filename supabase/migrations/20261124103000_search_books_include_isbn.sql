-- Include ISBN in search_books so catalog can resolve Open Library covers
-- and support edition-aware grouping in the client.
DROP FUNCTION IF EXISTS public.search_books(text, text, text, text, text, text, text, text, integer);

CREATE OR REPLACE FUNCTION public.search_books(
  search_query text,
  p_category text DEFAULT NULL,
  p_subject text DEFAULT NULL,
  p_class_level text DEFAULT NULL,
  p_language text DEFAULT NULL,
  p_author text DEFAULT NULL,
  p_availability text DEFAULT 'all',
  p_sort_by text DEFAULT 'newest',
  p_limit integer DEFAULT 1000
)
RETURNS TABLE(
  id uuid, title text, author text, category text, subject text, class_level text,
  language text, cover_url text, isbn text, total_copies integer, available_copies integer,
  first_added_at timestamptz, created_at timestamptz, accession_number text,
  issue_count integer, shelf_number text, cupboard_number text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.id, b.title, b.author, b.category, b.subject, b.class_level, b.language,
         b.cover_url, b.isbn, b.total_copies, b.available_copies, b.first_added_at, b.created_at,
         b.accession_number, b.issue_count, b.shelf_number, b.cupboard_number
  FROM public.books b
  WHERE b.total_copies > 0
    AND (
      search_query IS NULL OR search_query = '' OR
      b.title ILIKE '%' || search_query || '%' OR
      b.author ILIKE '%' || search_query || '%' OR
      b.accession_number ILIKE '%' || search_query || '%' OR
      coalesce(b.isbn, '') ILIKE '%' || search_query || '%' OR
      EXISTS (SELECT 1 FROM unnest(b.accession_numbers) an WHERE an ILIKE '%' || search_query || '%')
    )
    AND (p_category IS NULL OR b.category = p_category)
    AND (p_subject IS NULL OR b.subject = p_subject)
    AND (p_class_level IS NULL OR b.class_level = p_class_level)
    AND (p_language IS NULL OR b.language = p_language)
    AND (p_author IS NULL OR b.author = p_author)
    AND (p_availability <> 'available' OR b.available_copies > 0)
    AND (p_availability <> 'new' OR coalesce(b.first_added_at, b.created_at) >= now() - interval '14 days')
  ORDER BY
    CASE WHEN p_sort_by = 'most_borrowed' THEN b.issue_count END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'title_az' THEN b.title END ASC NULLS LAST,
    CASE WHEN p_sort_by IN ('newest','most_recommended') THEN coalesce(b.first_added_at, b.created_at) END DESC NULLS LAST,
    b.title ASC
  LIMIT coalesce(p_limit, 1000)
$$;
REVOKE ALL ON FUNCTION public.search_books(text,text,text,text,text,text,text,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_books(text,text,text,text,text,text,text,text,integer) TO anon, authenticated;
