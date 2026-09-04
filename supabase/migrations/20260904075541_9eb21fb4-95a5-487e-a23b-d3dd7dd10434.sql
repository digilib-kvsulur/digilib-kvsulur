ALTER TABLE public.book_issues
  ADD COLUMN IF NOT EXISTS book_title text,
  ADD COLUMN IF NOT EXISTS book_author text;

ALTER TABLE public.book_issues ALTER COLUMN book_id DROP NOT NULL;

ALTER TABLE public.book_issues DROP CONSTRAINT IF EXISTS book_issues_book_id_fkey;
ALTER TABLE public.book_issues
  ADD CONSTRAINT book_issues_book_id_fkey
  FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE SET NULL;

UPDATE public.book_issues bi
SET book_title = COALESCE(bi.book_title, b.title),
    book_author = COALESCE(bi.book_author, b.author)
FROM public.books b
WHERE b.id = bi.book_id AND bi.book_title IS NULL;

CREATE OR REPLACE FUNCTION public.tg_snapshot_issue_book()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.book_id IS NOT NULL AND (NEW.book_title IS NULL OR NEW.book_title = '') THEN
    SELECT b.title, b.author INTO NEW.book_title, NEW.book_author
    FROM public.books b WHERE b.id = NEW.book_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS snapshot_issue_book ON public.book_issues;
CREATE TRIGGER snapshot_issue_book
BEFORE INSERT OR UPDATE OF book_id ON public.book_issues
FOR EACH ROW EXECUTE FUNCTION public.tg_snapshot_issue_book();