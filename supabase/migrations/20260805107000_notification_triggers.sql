-- Phase 7: Automated notification triggers

-- Return confirmation notification
CREATE OR REPLACE FUNCTION public.notify_on_book_return()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
BEGIN
  IF NEW.status = 'returned' AND (OLD.status IS DISTINCT FROM 'returned') THEN
    SELECT title INTO v_title FROM public.books WHERE id = NEW.book_id;
    INSERT INTO public.notifications (title, message, type, target_user_id, sent_by)
    VALUES (
      'Book returned',
      format('"%s" has been marked as returned. Thank you!', COALESCE(v_title, 'Your book')),
      'success',
      NEW.user_id,
      NEW.user_id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_book_return ON public.book_issues;
CREATE TRIGGER trg_notify_on_book_return
  AFTER UPDATE ON public.book_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_book_return();

-- New arrival / availability alert for wishlist when copies go from 0 to >0
CREATE OR REPLACE FUNCTION public.notify_wishlist_on_availability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  IF COALESCE(OLD.available_copies, 0) = 0 AND COALESCE(NEW.available_copies, 0) > 0 THEN
    FOR r IN
      SELECT user_id FROM public.book_wishlist WHERE book_id = NEW.id
    LOOP
      INSERT INTO public.notifications (title, message, type, target_user_id, sent_by)
      VALUES (
        'Wishlist book available',
        format('"%s" from your wishlist is now available to borrow.', NEW.title),
        'info',
        r.user_id,
        r.user_id
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_wishlist_on_availability ON public.books;
CREATE TRIGGER trg_notify_wishlist_on_availability
  AFTER UPDATE ON public.books
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_wishlist_on_availability();

-- Admin-triggerable due-soon reminders (free-tier safe RPC)
CREATE OR REPLACE FUNCTION public.send_due_soon_reminders(p_days integer DEFAULT 2)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_count integer := 0;
  v_title text;
  v_admin uuid;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only staff can send due reminders';
  END IF;

  v_admin := auth.uid();

  FOR r IN
    SELECT bi.id, bi.user_id, bi.due_date, bi.book_id
    FROM public.book_issues bi
    WHERE bi.status = 'issued'
      AND bi.due_date::date BETWEEN CURRENT_DATE AND (CURRENT_DATE + p_days)
  LOOP
    SELECT title INTO v_title FROM public.books WHERE id = r.book_id;
    INSERT INTO public.notifications (title, message, type, target_user_id, sent_by)
    VALUES (
      'Book due soon',
      format('"%s" is due on %s. Please return or renew on time.', COALESCE(v_title, 'Your book'), r.due_date::date),
      'warning',
      r.user_id,
      v_admin
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_due_soon_reminders(integer) TO authenticated;
