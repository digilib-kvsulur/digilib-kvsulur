-- Phase 4: Book suggestions + lost book reports

CREATE TABLE IF NOT EXISTS public.book_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  author text,
  reason text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_book_suggestions_status ON public.book_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_book_suggestions_user ON public.book_suggestions(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_suggestions TO authenticated;
GRANT ALL ON public.book_suggestions TO service_role;
ALTER TABLE public.book_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suggestions own read" ON public.book_suggestions;
CREATE POLICY "suggestions own read" ON public.book_suggestions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "suggestions own insert" ON public.book_suggestions;
CREATE POLICY "suggestions own insert" ON public.book_suggestions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "suggestions staff update" ON public.book_suggestions;
CREATE POLICY "suggestions staff update" ON public.book_suggestions
  FOR UPDATE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "suggestions staff delete" ON public.book_suggestions;
CREATE POLICY "suggestions staff delete" ON public.book_suggestions
  FOR DELETE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.lost_book_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_issue_id uuid REFERENCES public.book_issues(id) ON DELETE SET NULL,
  book_title text NOT NULL,
  accession_number text,
  reported_at timestamptz NOT NULL DEFAULT now(),
  replacement_cost numeric(10,2) NOT NULL DEFAULT 300,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'settled')),
  admin_note text,
  settled_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_lost_book_reports_status ON public.lost_book_reports(status);
CREATE INDEX IF NOT EXISTS idx_lost_book_reports_user ON public.lost_book_reports(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lost_book_reports TO authenticated;
GRANT ALL ON public.lost_book_reports TO service_role;
ALTER TABLE public.lost_book_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lost own read" ON public.lost_book_reports;
CREATE POLICY "lost own read" ON public.lost_book_reports
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "lost own insert" ON public.lost_book_reports;
CREATE POLICY "lost own insert" ON public.lost_book_reports
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "lost staff update" ON public.lost_book_reports;
CREATE POLICY "lost staff update" ON public.lost_book_reports
  FOR UPDATE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "lost staff delete" ON public.lost_book_reports;
CREATE POLICY "lost staff delete" ON public.lost_book_reports
  FOR DELETE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.calculate_replacement_cost(p_book_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- books table has no price column; default ₹300
  IF EXISTS (SELECT 1 FROM public.books WHERE id = p_book_id) THEN
    RETURN 300;
  END IF;
  RETURN 300;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_replacement_cost(uuid) TO authenticated;
