CREATE OR REPLACE FUNCTION public.get_available_accessions(p_book_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(array_agg(a ORDER BY a), '{}')
  FROM (
    SELECT unnest(
      CASE WHEN coalesce(array_length(b.accession_numbers, 1), 0) > 0
           THEN b.accession_numbers
           ELSE array_remove(ARRAY[b.accession_number], NULL)
      END
    ) AS a
    FROM public.books b
    WHERE b.id = p_book_id
  ) s
  WHERE a IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.book_issues i
      WHERE i.book_id = p_book_id
        AND i.accession_number = s.a
        AND i.status <> 'returned'
    );
$$;

REVOKE ALL ON FUNCTION public.get_available_accessions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_available_accessions(uuid) TO authenticated;