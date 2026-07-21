-- Migration: Make statistics helper functions SECURITY DEFINER so anonymous homepage visitors can see real counts

CREATE OR REPLACE FUNCTION public.get_active_users_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.profiles WHERE is_approved = true;
$$;

CREATE OR REPLACE FUNCTION public.get_total_books_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.books;
$$;

CREATE OR REPLACE FUNCTION public.get_books_issued_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.book_issues WHERE status = 'issued';
$$;
