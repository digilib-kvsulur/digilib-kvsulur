-- ============================================================
-- MULTI-ACCESSION & POPULARITY TRACKING MIGRATION
-- ============================================================

-- 1. Add accession_numbers array column to books
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS accession_numbers text[] DEFAULT '{}';

-- 2. Add issue_count column for catalog popularity sorting
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS issue_count integer NOT NULL DEFAULT 0;

-- 3. Migrate existing single accession_number into the array
UPDATE public.books
SET accession_numbers = ARRAY[accession_number]
WHERE accession_number IS NOT NULL
  AND accession_number != ''
  AND (accession_numbers IS NULL OR accession_numbers = '{}' OR array_length(accession_numbers, 1) IS NULL);

-- 4. Back-fill issue_count from existing book_issues records
UPDATE public.books b
SET issue_count = (
  SELECT COUNT(*)
  FROM public.book_issues bi
  WHERE bi.book_id = b.id
);

-- 5. Function to keep issue_count in sync
CREATE OR REPLACE FUNCTION public.update_book_issue_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.books SET issue_count = issue_count + 1 WHERE id = NEW.book_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.books SET issue_count = GREATEST(issue_count - 1, 0) WHERE id = OLD.book_id;
  END IF;
  RETURN NULL;
END;
$$;

-- 6. Trigger on book_issues to keep issue_count updated
DROP TRIGGER IF EXISTS trg_update_book_issue_count ON public.book_issues;
CREATE TRIGGER trg_update_book_issue_count
  AFTER INSERT OR DELETE ON public.book_issues
  FOR EACH ROW EXECUTE FUNCTION public.update_book_issue_count();

-- 7. Helper: get available accession numbers for a book
CREATE OR REPLACE FUNCTION public.get_available_accessions(p_book_id uuid)
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT unnest(b.accession_numbers)
      EXCEPT
      SELECT bi.accession_number
      FROM public.book_issues bi
      WHERE bi.book_id = p_book_id
        AND bi.status = 'issued'
        AND bi.accession_number IS NOT NULL
    ),
    b.accession_numbers
  )
  FROM public.books b
  WHERE b.id = p_book_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_accessions(uuid) TO authenticated;

-- 8. Redefine issue_book_to_user to support explicit physical copy accession number selection
DROP FUNCTION IF EXISTS public.issue_book_to_user(uuid, uuid, date);
CREATE OR REPLACE FUNCTION public.issue_book_to_user(
  p_book_id uuid,
  p_user_id uuid,
  p_issue_date date DEFAULT CURRENT_DATE,
  p_accession_number text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE 
  v_id uuid; 
  v_acc text; 
  v_avail integer;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT available_copies INTO v_avail FROM public.books WHERE id = p_book_id FOR UPDATE;
  IF v_avail IS NULL OR v_avail < 1 THEN RAISE EXCEPTION 'No copies available'; END IF;

  -- Resolve accession number to use
  IF p_accession_number IS NOT NULL AND p_accession_number != '' THEN
    v_acc := p_accession_number;
  ELSE
    -- Fetch the first available accession number that is not currently checked out
    SELECT unnest(available_accs) INTO v_acc
    FROM (
      SELECT public.get_available_accessions(p_book_id) AS available_accs
    ) sub
    LIMIT 1;
    
    -- Fallback to the default single accession_number column if no array matches
    IF v_acc IS NULL THEN
      SELECT accession_number INTO v_acc FROM public.books WHERE id = p_book_id;
    END IF;
  END IF;

  INSERT INTO public.book_issues (book_id, user_id, issue_date, due_date, status, accession_number)
  VALUES (p_book_id, p_user_id, p_issue_date, p_issue_date, 'issued', v_acc)
  RETURNING id INTO v_id;

  UPDATE public.books SET available_copies = GREATEST(available_copies - 1, 0) WHERE id = p_book_id;
  RETURN v_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.issue_book_to_user(uuid, uuid, date, text) TO authenticated;
