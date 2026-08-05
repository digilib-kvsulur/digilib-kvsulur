-- Phase 3: Reservation queue enhancements

-- Max 3 active (pending) reservations per student
CREATE OR REPLACE FUNCTION public.enforce_max_reservations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_count integer;
BEGIN
  IF NEW.status = 'pending' THEN
    SELECT COUNT(*) INTO active_count
    FROM public.book_reservations
    WHERE user_id = NEW.user_id
      AND status = 'pending'
      AND (TG_OP = 'INSERT' OR id IS DISTINCT FROM NEW.id);

    IF active_count >= 3 THEN
      RAISE EXCEPTION 'Maximum 3 active reservations allowed.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_max_reservations ON public.book_reservations;
CREATE TRIGGER trg_enforce_max_reservations
  BEFORE INSERT OR UPDATE ON public.book_reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_max_reservations();

-- On return: notify first pending reservation in queue
CREATE OR REPLACE FUNCTION public.notify_reservation_on_return()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res record;
  v_title text;
BEGIN
  IF NEW.status = 'returned' AND (OLD.status IS DISTINCT FROM 'returned') THEN
    SELECT title INTO v_title FROM public.books WHERE id = NEW.book_id;

    SELECT * INTO v_res
    FROM public.book_reservations
    WHERE book_id = NEW.book_id AND status = 'pending'
    ORDER BY created_at ASC
    LIMIT 1;

    IF FOUND THEN
      INSERT INTO public.notifications (title, message, type, target_user_id, sent_by)
      VALUES (
        'Book available',
        format('"%s" you reserved is now available. Visit the library to borrow it.', COALESCE(v_title, 'A book')),
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
