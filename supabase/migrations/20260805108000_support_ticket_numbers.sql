-- Ticket numbers, public status lookup, auto-link by admission

CREATE SEQUENCE IF NOT EXISTS public.support_ticket_seq START 1001;

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS ticket_number text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_support_tickets_number
  ON public.support_tickets(ticket_number) WHERE ticket_number IS NOT NULL;

-- Backfill existing rows
UPDATE public.support_tickets
SET ticket_number = 'TKT-' || nextval('public.support_ticket_seq')::text
WHERE ticket_number IS NULL;

ALTER TABLE public.support_tickets
  ALTER COLUMN ticket_number SET NOT NULL;

CREATE OR REPLACE FUNCTION public.assign_ticket_number_and_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := 'TKT-' || nextval('public.support_ticket_seq')::text;
  END IF;

  -- Link guest tickets to profile when admission matches
  IF NEW.user_id IS NULL AND NEW.admission_number IS NOT NULL AND trim(NEW.admission_number) <> '' THEN
    SELECT p.id INTO v_uid
    FROM public.profiles p
    WHERE lower(trim(p.admission_number)) = lower(trim(NEW.admission_number))
      AND p.is_approved = true
    LIMIT 1;
    IF v_uid IS NOT NULL THEN
      NEW.user_id := v_uid;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_ticket_number ON public.support_tickets;
CREATE TRIGGER trg_assign_ticket_number
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_ticket_number_and_link();

-- Logged-in user claims orphan tickets matching their admission number
CREATE OR REPLACE FUNCTION public.link_my_support_tickets()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_adm text;
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;

  SELECT admission_number INTO v_adm FROM public.profiles WHERE id = auth.uid();
  IF v_adm IS NULL OR trim(v_adm) = '' THEN
    RETURN 0;
  END IF;

  UPDATE public.support_tickets
  SET user_id = auth.uid(), updated_at = now()
  WHERE user_id IS NULL
    AND lower(trim(admission_number)) = lower(trim(v_adm));

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_my_support_tickets() TO authenticated;

-- Public status lookup (ticket number + admission). Limited fields only.
CREATE OR REPLACE FUNCTION public.lookup_ticket_status(p_ticket_number text, p_admission text)
RETURNS TABLE (
  ticket_number text,
  subject text,
  status text,
  category text,
  priority text,
  admin_response text,
  created_at timestamptz,
  updated_at timestamptz,
  full_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.ticket_number,
    t.subject,
    t.status,
    t.category,
    t.priority,
    t.admin_response,
    t.created_at,
    t.updated_at,
    t.full_name
  FROM public.support_tickets t
  WHERE upper(trim(t.ticket_number)) = upper(trim(p_ticket_number))
    AND lower(trim(COALESCE(t.admission_number, ''))) = lower(trim(COALESCE(p_admission, '')))
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_ticket_status(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_ticket_status(text, text) TO anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_support_tickets_admission
  ON public.support_tickets (lower(trim(admission_number)));

-- Public submit that returns ticket_number (anon cannot SELECT after insert via RLS)
CREATE OR REPLACE FUNCTION public.submit_public_support_ticket(
  p_admission text,
  p_full_name text,
  p_email text,
  p_student_class text,
  p_role text,
  p_category text,
  p_priority text,
  p_subject text,
  p_description text
)
RETURNS TABLE (id uuid, ticket_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_num text;
BEGIN
  IF trim(COALESCE(p_admission, '')) = '' OR trim(COALESCE(p_full_name, '')) = ''
     OR trim(COALESCE(p_subject, '')) = '' OR trim(COALESCE(p_description, '')) = '' THEN
    RAISE EXCEPTION 'Missing required fields';
  END IF;

  INSERT INTO public.support_tickets (
    admission_number, full_name, email, student_class, role,
    category, priority, subject, description
  ) VALUES (
    trim(p_admission),
    trim(p_full_name),
    NULLIF(trim(COALESCE(p_email, '')), ''),
    NULLIF(trim(COALESCE(p_student_class, '')), ''),
    NULLIF(trim(COALESCE(p_role, '')), ''),
    COALESCE(NULLIF(trim(p_category), ''), 'general'),
    COALESCE(NULLIF(trim(p_priority), ''), 'normal'),
    left(trim(p_subject), 150),
    left(trim(p_description), 2000)
  )
  RETURNING support_tickets.id, support_tickets.ticket_number INTO v_id, v_num;

  RETURN QUERY SELECT v_id, v_num;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_support_ticket(text, text, text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_support_ticket(text, text, text, text, text, text, text, text, text) TO anon, authenticated;
