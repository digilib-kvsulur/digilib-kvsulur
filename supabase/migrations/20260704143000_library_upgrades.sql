-- 1. Extend book_issues with accession_number
ALTER TABLE public.book_issues
  ADD COLUMN IF NOT EXISTS accession_number text;

-- 2. Extend challenges with class_level
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS class_level text;

-- 3. Create class_reading_lists table
CREATE TABLE IF NOT EXISTS public.class_reading_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_level text NOT NULL,
  title text NOT NULL,
  description text,
  books jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_reading_lists TO authenticated;
GRANT ALL ON public.class_reading_lists TO service_role;
ALTER TABLE public.class_reading_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reading_lists select" ON public.class_reading_lists FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "reading_lists staff insert" ON public.class_reading_lists FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "reading_lists staff update" ON public.class_reading_lists FOR UPDATE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "reading_lists staff delete" ON public.class_reading_lists FOR DELETE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

-- 4. Create class_book_recommendations table
CREATE TABLE IF NOT EXISTS public.class_book_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_level text NOT NULL,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(class_level, book_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_book_recommendations TO authenticated;
GRANT ALL ON public.class_book_recommendations TO service_role;
ALTER TABLE public.class_book_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recs select" ON public.class_book_recommendations FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "recs staff insert" ON public.class_book_recommendations FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "recs staff update" ON public.class_book_recommendations FOR UPDATE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "recs staff delete" ON public.class_book_recommendations FOR DELETE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

-- 5. Create book_audit_logs table
CREATE TABLE IF NOT EXISTS public.book_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  accession_number text,
  status text NOT NULL CHECK (status IN ('verified', 'missing', 'damaged', 'withdrawn')),
  verified_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notes text,
  audited_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_audit_logs TO authenticated;
GRANT ALL ON public.book_audit_logs TO service_role;
ALTER TABLE public.book_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audits staff select" ON public.book_audit_logs FOR SELECT TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "audits staff insert" ON public.book_audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- 6. Create monthly_reading_goals table
CREATE TABLE IF NOT EXISTS public.monthly_reading_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month_year text NOT NULL,
  target_books integer NOT NULL CHECK (target_books > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, month_year)
);

GRANT SELECT, INSERT, UPDATE ON public.monthly_reading_goals TO authenticated;
GRANT ALL ON public.monthly_reading_goals TO service_role;
ALTER TABLE public.monthly_reading_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goals own select" ON public.monthly_reading_goals FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "goals own insert" ON public.monthly_reading_goals FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "goals own update" ON public.monthly_reading_goals FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_reading_lists_class ON public.class_reading_lists(class_level);
CREATE INDEX IF NOT EXISTS idx_recs_class ON public.class_book_recommendations(class_level);
CREATE INDEX IF NOT EXISTS idx_audit_book ON public.book_audit_logs(book_id);
CREATE INDEX IF NOT EXISTS idx_goals_user ON public.monthly_reading_goals(user_id);
