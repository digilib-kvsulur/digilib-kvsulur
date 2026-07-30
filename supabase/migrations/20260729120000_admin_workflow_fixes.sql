-- Award a badge's XP exactly once, when the award record is created.
CREATE OR REPLACE FUNCTION public.add_badge_award_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  badge_points integer;
BEGIN
  SELECT points INTO badge_points FROM public.badges WHERE id = NEW.badge_id;
  UPDATE public.profiles
  SET points = COALESCE(points, 0) + COALESCE(badge_points, 0)
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_add_badge_award_points ON public.badge_awards;
CREATE TRIGGER trg_add_badge_award_points
  AFTER INSERT ON public.badge_awards
  FOR EACH ROW EXECUTE FUNCTION public.add_badge_award_points();

-- Issue a requested book in one transaction. This prevents partial approvals,
-- double issuing, and negative inventory when admins act at the same time.
CREATE OR REPLACE FUNCTION public.approve_book_request(
  p_request_id uuid,
  p_admin_notes text,
  p_due_date date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_row public.book_requests%ROWTYPE;
  book_row public.books%ROWTYPE;
  issue_id uuid;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only staff can approve book requests';
  END IF;

  SELECT * INTO request_row FROM public.book_requests
  WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Book request not found'; END IF;
  IF request_row.status <> 'pending' THEN RAISE EXCEPTION 'This request has already been processed'; END IF;
  IF request_row.book_id IS NULL THEN RAISE EXCEPTION 'Purchase suggestions cannot be issued'; END IF;

  SELECT * INTO book_row FROM public.books WHERE id = request_row.book_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'The requested book no longer exists'; END IF;
  IF book_row.available_copies <= 0 THEN RAISE EXCEPTION 'Book is not available'; END IF;

  INSERT INTO public.book_issues (user_id, book_id, accession_number, due_date)
  VALUES (request_row.user_id, request_row.book_id, book_row.accession_number, p_due_date)
  RETURNING id INTO issue_id;

  UPDATE public.books SET available_copies = available_copies - 1 WHERE id = book_row.id;
  UPDATE public.book_requests SET status = 'approved', admin_notes = p_admin_notes WHERE id = request_row.id;
  RETURN issue_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_book_request(uuid, text, date) TO authenticated;
