-- Migration: 20260912000000_core_enhancements.sql
-- Purpose: Security, immutability, book request limit, and statistics optimization

-- 1. Function to get sum of all book copies in the library (fast aggregation for landing page)
CREATE OR REPLACE FUNCTION public.get_total_book_copies()
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(SUM(total_copies), 0)::bigint FROM public.books;
$$;

GRANT EXECUTE ON FUNCTION public.get_total_book_copies() TO anon, authenticated, service_role;

-- 2. Prevent hard deletion of book_issues to protect official library circulation history
CREATE OR REPLACE FUNCTION public.prevent_book_issues_hard_delete()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Disallow hard deletion of book circulation transactions
  RAISE EXCEPTION 'Deletion of book issue records is prohibited to maintain library audit trail. Mark the record as returned or lost instead.';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_book_issues_hard_delete ON public.book_issues;
CREATE TRIGGER trg_prevent_book_issues_hard_delete
BEFORE DELETE ON public.book_issues
FOR EACH ROW
EXECUTE FUNCTION public.prevent_book_issues_hard_delete();

-- 3. Atomic RPC to handle book requests with strict limit of 2 pending requests (auto-overwriting the oldest)
CREATE OR REPLACE FUNCTION public.submit_book_request(
  p_book_id uuid DEFAULT NULL,
  p_requested_title text DEFAULT NULL,
  p_requested_author text DEFAULT NULL,
  p_requested_isbn text DEFAULT NULL,
  p_requested_description text DEFAULT NULL,
  p_admin_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_pending_count int;
  v_oldest_id uuid;
  v_overwritten_title text;
  v_new_id uuid;
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to submit book requests';
  END IF;

  -- Count currently pending requests for this user
  SELECT count(*) INTO v_pending_count
  FROM public.book_requests
  WHERE user_id = v_user_id AND status = 'pending';

  -- If 2 or more pending requests exist, locate and delete/cancel the oldest pending request
  IF v_pending_count >= 2 THEN
    SELECT id, COALESCE(requested_title, (SELECT title FROM public.books WHERE id = book_id), 'Previous Book Request')
    INTO v_oldest_id, v_overwritten_title
    FROM public.book_requests
    WHERE user_id = v_user_id AND status = 'pending'
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_oldest_id IS NOT NULL THEN
      DELETE FROM public.book_requests WHERE id = v_oldest_id;
    END IF;
  END IF;

  -- Insert the new book request
  INSERT INTO public.book_requests (
    user_id,
    book_id,
    requested_title,
    requested_author,
    requested_isbn,
    requested_description,
    admin_notes,
    status
  ) VALUES (
    v_user_id,
    p_book_id,
    p_requested_title,
    p_requested_author,
    p_requested_isbn,
    p_requested_description,
    p_admin_notes,
    'pending'
  )
  RETURNING id INTO v_new_id;

  v_result := jsonb_build_object(
    'success', true,
    'request_id', v_new_id,
    'overwritten', v_oldest_id IS NOT NULL,
    'overwritten_title', v_overwritten_title
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_book_request(uuid, text, text, text, text, text) TO authenticated;

-- 4. Fast bulk delete book requests RPC for admins
CREATE OR REPLACE FUNCTION public.bulk_delete_book_requests(p_request_ids uuid[])
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_deleted_count int;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: only staff or admins can bulk delete book requests';
  END IF;

  DELETE FROM public.book_requests
  WHERE id = ANY(p_request_ids);

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_delete_book_requests(uuid[]) TO authenticated;
