-- When a book is returned, convert the first pending reservation into a book_request
-- so admin fulfills it from Book Requests (no separate Reservations page).

CREATE OR REPLACE FUNCTION public.notify_reservation_on_return()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res record;
  v_title text;
  v_request_id uuid;
BEGIN
  IF NEW.status = 'returned' AND (OLD.status IS DISTINCT FROM 'returned') THEN
    SELECT title INTO v_title FROM public.books WHERE id = NEW.book_id;

    SELECT * INTO v_res
    FROM public.book_reservations
    WHERE book_id = NEW.book_id AND status = 'pending'
    ORDER BY created_at ASC
    LIMIT 1;

    IF FOUND THEN
      -- Reuse existing pending borrow request if present
      SELECT id INTO v_request_id
      FROM public.book_requests
      WHERE user_id = v_res.user_id
        AND book_id = NEW.book_id
        AND status = 'pending'
      LIMIT 1;

      IF v_request_id IS NULL THEN
        INSERT INTO public.book_requests (user_id, book_id, status, admin_notes)
        VALUES (
          v_res.user_id,
          NEW.book_id,
          'pending',
          'Waitlist: book returned and now available'
        )
        RETURNING id INTO v_request_id;
      END IF;

      UPDATE public.book_reservations
      SET status = 'fulfilled', fulfilled_at = now(), updated_at = now()
      WHERE id = v_res.id;

      INSERT INTO public.notifications (title, message, type, target_user_id, sent_by)
      VALUES (
        'Book available',
        format(
          '"%s" you reserved is now available. A borrow request was created for you — visit the library to collect it.',
          COALESCE(v_title, 'A book')
        ),
        'success',
        v_res.user_id,
        NEW.user_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_reservation_on_return ON public.book_issues;
CREATE TRIGGER trg_notify_reservation_on_return
  AFTER UPDATE ON public.book_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_reservation_on_return();

-- When a borrow request is approved, mark any matching pending/fulfilled reservation as fulfilled
CREATE OR REPLACE FUNCTION public.fulfill_reservation_on_request_approve()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') AND NEW.book_id IS NOT NULL THEN
    UPDATE public.book_reservations
    SET status = 'fulfilled',
        fulfilled_at = COALESCE(fulfilled_at, now()),
        updated_at = now()
    WHERE user_id = NEW.user_id
      AND book_id = NEW.book_id
      AND status IN ('pending', 'fulfilled');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fulfill_reservation_on_request_approve ON public.book_requests;
CREATE TRIGGER trg_fulfill_reservation_on_request_approve
  AFTER UPDATE ON public.book_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.fulfill_reservation_on_request_approve();
