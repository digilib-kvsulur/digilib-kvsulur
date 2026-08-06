-- Enforce event registration & submission deadlines at the database level

CREATE OR REPLACE FUNCTION public.enforce_event_registration_deadline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deadline timestamptz;
  v_end timestamptz;
  v_start timestamptz;
BEGIN
  SELECT registration_deadline, end_date, event_date
  INTO v_deadline, v_end, v_start
  FROM public.library_events
  WHERE id = NEW.event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF v_deadline IS NOT NULL THEN
    IF now() > v_deadline THEN
      RAISE EXCEPTION 'Registration deadline has passed (%).', v_deadline;
    END IF;
  ELSIF v_end IS NOT NULL THEN
    IF now() > v_end THEN
      RAISE EXCEPTION 'This event has ended. Registration is closed.';
    END IF;
  ELSIF v_start IS NOT NULL THEN
    IF now() > v_start THEN
      RAISE EXCEPTION 'This event has already started. Registration is closed.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_event_registration_deadline ON public.event_registrations;
CREATE TRIGGER trg_enforce_event_registration_deadline
  BEFORE INSERT ON public.event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_event_registration_deadline();

CREATE OR REPLACE FUNCTION public.enforce_event_submission_deadline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deadline timestamptz;
  v_end timestamptz;
  v_start timestamptz;
  v_allow boolean;
BEGIN
  SELECT submission_deadline, end_date, event_date, COALESCE(allow_submissions, false)
  INTO v_deadline, v_end, v_start, v_allow
  FROM public.library_events
  WHERE id = NEW.event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF NOT v_allow THEN
    RAISE EXCEPTION 'Submissions are not enabled for this event.';
  END IF;

  IF v_deadline IS NOT NULL THEN
    IF now() > v_deadline THEN
      RAISE EXCEPTION 'Submission deadline has passed (%).', v_deadline;
    END IF;
  ELSIF v_end IS NOT NULL THEN
    IF now() > v_end THEN
      RAISE EXCEPTION 'This event has ended. Submissions are closed.';
    END IF;
  ELSIF v_start IS NOT NULL THEN
    IF now() > v_start THEN
      RAISE EXCEPTION 'Submission window for this event is closed.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_event_submission_deadline ON public.event_submissions;
CREATE TRIGGER trg_enforce_event_submission_deadline
  BEFORE INSERT OR UPDATE ON public.event_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_event_submission_deadline();
