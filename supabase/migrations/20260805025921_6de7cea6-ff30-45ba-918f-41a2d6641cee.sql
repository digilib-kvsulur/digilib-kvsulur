-- Notifications: rich content
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_link text;

-- Library events: multi-day activity submissions
ALTER TABLE public.library_events ADD COLUMN IF NOT EXISTS allow_submissions boolean NOT NULL DEFAULT false;
ALTER TABLE public.library_events ADD COLUMN IF NOT EXISTS submission_types text[] NOT NULL DEFAULT ARRAY['image','pdf'];
ALTER TABLE public.library_events ADD COLUMN IF NOT EXISTS max_submission_days integer NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS public.event_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.library_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  day_number integer NOT NULL DEFAULT 1,
  file_url text,
  file_type text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id, day_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_submissions TO authenticated;
GRANT ALL ON public.event_submissions TO service_role;
ALTER TABLE public.event_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own or staff view submissions" ON public.event_submissions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Users add own submissions" ON public.event_submissions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own submissions" ON public.event_submissions FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Users delete own submissions" ON public.event_submissions FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

CREATE TRIGGER trg_event_submissions_updated BEFORE UPDATE ON public.event_submissions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Web push subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  subscription_object jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subscription" ON public.push_subscriptions FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_push_subscriptions_updated BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Condemnation batches + richer condemnation entries
CREATE TABLE IF NOT EXISTS public.condemnation_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number text NOT NULL,
  fund_source text NOT NULL DEFAULT 'VVN',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.condemnation_batches TO authenticated;
GRANT ALL ON public.condemnation_batches TO service_role;
ALTER TABLE public.condemnation_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view batches" ON public.condemnation_batches FOR SELECT TO authenticated
USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff manage batches" ON public.condemnation_batches FOR ALL TO authenticated
USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

ALTER TABLE public.book_condemnations ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.condemnation_batches(id) ON DELETE CASCADE;
ALTER TABLE public.book_condemnations ADD COLUMN IF NOT EXISTS cost numeric NOT NULL DEFAULT 0;
ALTER TABLE public.book_condemnations ADD COLUMN IF NOT EXISTS discount_pct numeric NOT NULL DEFAULT 0;
ALTER TABLE public.book_condemnations ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.book_condemnations ADD COLUMN IF NOT EXISTS rate numeric NOT NULL DEFAULT 0;
ALTER TABLE public.book_condemnations ADD COLUMN IF NOT EXISTS depreciation_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.book_condemnations ADD COLUMN IF NOT EXISTS net_value numeric NOT NULL DEFAULT 0;
ALTER TABLE public.book_condemnations ADD COLUMN IF NOT EXISTS year_of_purchase integer;
ALTER TABLE public.book_condemnations ADD COLUMN IF NOT EXISTS date_became_unserviceable date DEFAULT CURRENT_DATE;
ALTER TABLE public.book_condemnations ADD COLUMN IF NOT EXISTS fund_source text;

CREATE OR REPLACE FUNCTION public.condemn_book_v2(
  p_batch_id uuid,
  p_book_id uuid,
  p_accession_number text,
  p_title text,
  p_year integer,
  p_cost numeric,
  p_reason text,
  p_fund text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
  v_years integer;
  v_rate numeric;
  v_dep numeric;
  v_net numeric;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;

  v_years := GREATEST(EXTRACT(YEAR FROM CURRENT_DATE)::int - COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::int), 0);
  v_rate := LEAST(v_years * 10, 90);
  v_dep := ROUND(COALESCE(p_cost,0) * v_rate / 100.0, 2);
  v_net := GREATEST(COALESCE(p_cost,0) - v_dep, 0);

  INSERT INTO public.book_condemnations (
    book_id, accession_number, book_title, copies, reason, condemned_by,
    batch_id, cost, rate, depreciation_amount, net_value, year_of_purchase,
    date_became_unserviceable, fund_source
  ) VALUES (
    p_book_id, p_accession_number, p_title, 1, COALESCE(p_reason,'damaged'), auth.uid(),
    p_batch_id, COALESCE(p_cost,0), v_rate, v_dep, v_net, p_year,
    CURRENT_DATE, p_fund
  ) RETURNING id INTO v_id;

  IF p_book_id IS NOT NULL THEN
    UPDATE public.books
      SET total_copies = GREATEST(total_copies - 1, 0),
          available_copies = GREATEST(available_copies - 1, 0),
          condemned_copies = condemned_copies + 1,
          updated_at = now()
    WHERE id = p_book_id;
  END IF;

  RETURN v_id;
END; $$;

REVOKE ALL ON FUNCTION public.condemn_book_v2(uuid, uuid, text, text, integer, numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.condemn_book_v2(uuid, uuid, text, text, integer, numeric, text, text) TO authenticated;