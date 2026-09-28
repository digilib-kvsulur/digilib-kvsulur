-- Define get_total_books_issued_count() RPC function
CREATE OR REPLACE FUNCTION public.get_total_books_issued_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.book_issues;
$$;

GRANT EXECUTE ON FUNCTION public.get_total_books_issued_count() TO anon, authenticated;
