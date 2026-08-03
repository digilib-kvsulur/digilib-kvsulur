-- Simplified Condemnation Module Migration

-- Create Condemnation Batches table to group entries for reports
CREATE TABLE IF NOT EXISTS public.condemnation_batches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number text NOT NULL,
    fund_source text NOT NULL DEFAULT 'SCHOOL_FUND',
    created_by uuid REFERENCES public.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.condemnation_batches TO authenticated;
GRANT ALL ON public.condemnation_batches TO service_role;
ALTER TABLE public.condemnation_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage condemnation_batches" ON public.condemnation_batches FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));


-- Modify book_condemnations to add the new fields
ALTER TABLE public.book_condemnations
    ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.condemnation_batches(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS cost numeric(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discount_pct numeric(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS year_of_purchase integer,
    ADD COLUMN IF NOT EXISTS date_became_unserviceable date,
    ADD COLUMN IF NOT EXISTS other_reason_note text,
    ADD COLUMN IF NOT EXISTS fund_source text DEFAULT 'SCHOOL_FUND';

ALTER TABLE public.book_condemnations
    ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rate numeric(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS depreciation_amount numeric(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS net_value numeric(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS years_in_use integer DEFAULT 0;

CREATE OR REPLACE FUNCTION public.calculate_condemnation_financials()
RETURNS TRIGGER AS $$
DECLARE
    depreciation_rate numeric := 0.95;
BEGIN
    NEW.discount_amount := COALESCE(NEW.cost, 0) * (COALESCE(NEW.discount_pct, 0) / 100.0);
    NEW.rate := COALESCE(NEW.cost, 0) - NEW.discount_amount;
    NEW.depreciation_amount := NEW.rate * depreciation_rate;
    NEW.net_value := NEW.rate - NEW.depreciation_amount;
    
    IF NEW.year_of_purchase IS NOT NULL AND NEW.date_became_unserviceable IS NOT NULL THEN
        NEW.years_in_use := EXTRACT(YEAR FROM NEW.date_became_unserviceable) - NEW.year_of_purchase;
    ELSE
        NEW.years_in_use := 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_condemnation_financials ON public.book_condemnations;
CREATE TRIGGER trg_condemnation_financials
BEFORE INSERT OR UPDATE ON public.book_condemnations
FOR EACH ROW EXECUTE FUNCTION public.calculate_condemnation_financials();

-- Update RPC to support batch_id and financials
CREATE OR REPLACE FUNCTION public.condemn_book_v2(
    p_batch_id uuid,
    p_book_id uuid,
    p_accession_number text,
    p_title text,
    p_year integer,
    p_cost numeric,
    p_reason text,
    p_fund text DEFAULT 'SCHOOL_FUND'
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_id uuid;
    v_batch_id uuid := p_batch_id;
BEGIN
    IF NOT public.is_staff_or_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
    
    IF v_batch_id IS NULL THEN
        INSERT INTO public.condemnation_batches (batch_number, fund_source, created_by)
        VALUES ('COND-' || to_char(now(), 'YYYYMMDD-HH24MISS'), p_fund, auth.uid())
        RETURNING id INTO v_batch_id;
    END IF;

    INSERT INTO public.book_condemnations (
        batch_id, book_id, accession_number, book_title,
        year_of_purchase, cost, reason, date_became_unserviceable, condemned_by, fund_source
    ) VALUES (
        v_batch_id, p_book_id, p_accession_number, p_title,
        p_year, p_cost, p_reason, CURRENT_DATE, auth.uid(), p_fund
    ) RETURNING id INTO v_id;
    
    -- update books if book_id is provided
    IF p_book_id IS NOT NULL THEN
        UPDATE public.books
        SET total_copies = GREATEST(total_copies - 1, 0),
            available_copies = GREATEST(available_copies - 1, 0),
            condemned_copies = condemned_copies + 1,
            updated_at = now()
        WHERE id = p_book_id;
    END IF;

    RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.condemn_book_v2(uuid, uuid, text, text, integer, numeric, text, text) TO authenticated;
