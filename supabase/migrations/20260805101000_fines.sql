-- Phase 2: Fine management

CREATE TABLE IF NOT EXISTS public.fine_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  rate_per_day numeric(10,2) NOT NULL DEFAULT 1,
  grace_period_days integer NOT NULL DEFAULT 0,
  upi_id text DEFAULT '',
  upi_payee_name text DEFAULT 'PM SHRI KV AFS Sulur Library',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.fine_settings (id, rate_per_day, grace_period_days)
VALUES (1, 1, 0)
ON CONFLICT (id) DO NOTHING;

-- Sync from existing system_settings if present
UPDATE public.fine_settings fs SET
  rate_per_day = COALESCE(
    (SELECT CASE
       WHEN jsonb_typeof(value) = 'number' THEN (value)::text::numeric
       ELSE NULLIF(trim(both '"' from value::text), '')::numeric
     END FROM public.system_settings WHERE key = 'fine_per_day'),
    fs.rate_per_day
  ),
  upi_id = COALESCE(
    (SELECT NULLIF(trim(both '"' from value::text), '') FROM public.system_settings WHERE key = 'upi_id'),
    fs.upi_id
  ),
  upi_payee_name = COALESCE(
    (SELECT NULLIF(trim(both '"' from value::text), '') FROM public.system_settings WHERE key = 'upi_payee_name'),
    fs.upi_payee_name
  )
WHERE fs.id = 1;

GRANT SELECT ON public.fine_settings TO anon, authenticated;
GRANT ALL ON public.fine_settings TO service_role;
GRANT UPDATE, INSERT ON public.fine_settings TO authenticated;

ALTER TABLE public.fine_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fine_settings read" ON public.fine_settings;
CREATE POLICY "fine_settings read" ON public.fine_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "fine_settings staff write" ON public.fine_settings;
CREATE POLICY "fine_settings staff write" ON public.fine_settings
  FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.library_fines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_issue_id uuid REFERENCES public.book_issues(id) ON DELETE SET NULL,
  days_overdue integer NOT NULL DEFAULT 0,
  rate_per_day numeric(10,2) NOT NULL DEFAULT 1,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'waived')),
  payment_method text,
  payment_ref text,
  paid_at timestamptz,
  book_title text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_library_fines_user ON public.library_fines(user_id);
CREATE INDEX IF NOT EXISTS idx_library_fines_status ON public.library_fines(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_library_fines_issue_unique
  ON public.library_fines(book_issue_id) WHERE book_issue_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_fines TO authenticated;
GRANT ALL ON public.library_fines TO service_role;

ALTER TABLE public.library_fines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fines own read" ON public.library_fines;
CREATE POLICY "fines own read" ON public.library_fines
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "fines staff write" ON public.library_fines;
CREATE POLICY "fines staff write" ON public.library_fines
  FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- Allow students to set payment_ref / mark pending confirmation (payment_method only)
DROP POLICY IF EXISTS "fines student pay update" ON public.library_fines;
CREATE POLICY "fines student pay update" ON public.library_fines
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.calculate_fine(p_issue_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_due date;
  v_status text;
  v_rate numeric;
  v_grace integer;
  v_days integer;
BEGIN
  SELECT due_date::date, status INTO v_due, v_status
  FROM public.book_issues WHERE id = p_issue_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  SELECT rate_per_day, grace_period_days INTO v_rate, v_grace
  FROM public.fine_settings WHERE id = 1;

  v_rate := COALESCE(v_rate, 1);
  v_grace := COALESCE(v_grace, 0);

  v_days := GREATEST(0, (CURRENT_DATE - v_due) - v_grace);
  RETURN v_days * v_rate;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_fine(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_fine_on_return()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate numeric;
  v_grace integer;
  v_days integer;
  v_amount numeric;
  v_title text;
BEGIN
  IF NEW.status = 'returned' AND (OLD.status IS DISTINCT FROM 'returned') THEN
    SELECT rate_per_day, grace_period_days INTO v_rate, v_grace
    FROM public.fine_settings WHERE id = 1;
    v_rate := COALESCE(v_rate, 1);
    v_grace := COALESCE(v_grace, 0);

    v_days := GREATEST(0, (COALESCE(NEW.return_date::date, CURRENT_DATE) - NEW.due_date::date) - v_grace);
    v_amount := v_days * v_rate;

    IF v_days > 0 AND v_amount > 0 THEN
      SELECT title INTO v_title FROM public.books WHERE id = NEW.book_id;
      IF NOT EXISTS (SELECT 1 FROM public.library_fines WHERE book_issue_id = NEW.id) THEN
        INSERT INTO public.library_fines (
          user_id, book_issue_id, days_overdue, rate_per_day, total_amount,
          status, book_title
        ) VALUES (
          NEW.user_id, NEW.id, v_days, v_rate, v_amount, 'pending', v_title
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_fine_on_return ON public.book_issues;
CREATE TRIGGER trg_create_fine_on_return
  AFTER UPDATE ON public.book_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.create_fine_on_return();
