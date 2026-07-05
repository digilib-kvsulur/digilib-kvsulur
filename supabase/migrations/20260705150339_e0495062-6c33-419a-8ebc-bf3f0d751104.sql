
-- 1. accession_number columns
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS accession_number text;
ALTER TABLE public.book_issues ADD COLUMN IF NOT EXISTS accession_number text;

-- 2. challenges.class_level
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS class_level text;

-- 3. book_audit_logs
CREATE TABLE IF NOT EXISTS public.book_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  accession_number text,
  status text NOT NULL DEFAULT 'verified',
  notes text,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  audited_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_audit_logs TO authenticated;
GRANT ALL ON public.book_audit_logs TO service_role;
ALTER TABLE public.book_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed-in can view audit logs" ON public.book_audit_logs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert audit logs" ON public.book_audit_logs
  FOR INSERT TO authenticated WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can update audit logs" ON public.book_audit_logs
  FOR UPDATE TO authenticated USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can delete audit logs" ON public.book_audit_logs
  FOR DELETE TO authenticated USING (public.is_staff_or_admin(auth.uid()));

-- 4. monthly_reading_goals
CREATE TABLE IF NOT EXISTS public.monthly_reading_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year text NOT NULL,
  target_books integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, month_year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_reading_goals TO authenticated;
GRANT ALL ON public.monthly_reading_goals TO service_role;
ALTER TABLE public.monthly_reading_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own goals" ON public.monthly_reading_goals
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
CREATE TRIGGER trg_monthly_goals_updated
  BEFORE UPDATE ON public.monthly_reading_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. class_book_recommendations
CREATE TABLE IF NOT EXISTS public.class_book_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_level text NOT NULL,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_level, book_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_book_recommendations TO authenticated;
GRANT ALL ON public.class_book_recommendations TO service_role;
ALTER TABLE public.class_book_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed-in can view class recs" ON public.class_book_recommendations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage class recs" ON public.class_book_recommendations
  FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- 6. class_reading_lists
CREATE TABLE IF NOT EXISTS public.class_reading_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_level text NOT NULL,
  title text NOT NULL,
  description text,
  books jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_reading_lists TO authenticated;
GRANT ALL ON public.class_reading_lists TO service_role;
ALTER TABLE public.class_reading_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed-in can view reading lists" ON public.class_reading_lists
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage reading lists" ON public.class_reading_lists
  FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE TRIGGER trg_class_reading_lists_updated
  BEFORE UPDATE ON public.class_reading_lists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
