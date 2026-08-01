-- 1. Create a function to get distinct values for catalog filters efficiently
CREATE OR REPLACE FUNCTION public.get_distinct_book_filters()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  res json;
BEGIN
  SELECT json_build_object(
    'categories', (SELECT coalesce(json_agg(distinct category), '[]'::json) FROM public.books WHERE category IS NOT NULL AND category <> ''),
    'subjects', (SELECT coalesce(json_agg(distinct subject), '[]'::json) FROM public.books WHERE subject IS NOT NULL AND subject <> ''),
    'class_levels', (SELECT coalesce(json_agg(distinct class_level), '[]'::json) FROM public.books WHERE class_level IS NOT NULL AND class_level <> ''),
    'languages', (SELECT coalesce(json_agg(distinct language), '[]'::json) FROM public.books WHERE language IS NOT NULL AND language <> ''),
    'authors', (SELECT coalesce(json_agg(distinct author), '[]'::json) FROM public.books WHERE author IS NOT NULL AND author <> '')
  ) INTO res;
  RETURN res;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_distinct_book_filters() TO authenticated;

-- 2. Make avatars bucket public so getPublicUrl works instantly and synchronously
UPDATE storage.buckets
SET public = true
WHERE id = 'avatars';
