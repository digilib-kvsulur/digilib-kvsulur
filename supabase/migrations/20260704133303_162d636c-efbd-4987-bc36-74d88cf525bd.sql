-- 1. Extend books
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS language text DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS class_level text,
  ADD COLUMN IF NOT EXISTS first_added_at timestamptz DEFAULT now();

-- 2. Extend book_issues
ALTER TABLE public.book_issues
  ADD COLUMN IF NOT EXISTS renewal_count integer NOT NULL DEFAULT 0;

-- 3. book_wishlist
CREATE TABLE IF NOT EXISTS public.book_wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, book_id)
);
GRANT SELECT, INSERT, DELETE ON public.book_wishlist TO authenticated;
GRANT ALL ON public.book_wishlist TO service_role;
ALTER TABLE public.book_wishlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wishlist own select" ON public.book_wishlist FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "wishlist own insert" ON public.book_wishlist FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "wishlist own delete" ON public.book_wishlist FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

-- 4. book_reviews
CREATE TABLE IF NOT EXISTS public.book_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text text,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(book_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_reviews TO authenticated;
GRANT SELECT ON public.book_reviews TO anon;
GRANT ALL ON public.book_reviews TO service_role;
ALTER TABLE public.book_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews public select" ON public.book_reviews FOR SELECT
  USING (is_hidden = false OR user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "reviews own insert" ON public.book_reviews FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "reviews own update" ON public.book_reviews FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "reviews own delete" ON public.book_reviews FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
CREATE TRIGGER trg_book_reviews_updated BEFORE UPDATE ON public.book_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. book_renewals
CREATE TABLE IF NOT EXISTS public.book_renewals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_issue_id uuid NOT NULL REFERENCES public.book_issues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  requested_days integer NOT NULL DEFAULT 7 CHECK (requested_days BETWEEN 1 AND 30),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  student_note text,
  admin_note text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.book_renewals TO authenticated;
GRANT ALL ON public.book_renewals TO service_role;
ALTER TABLE public.book_renewals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "renewals own select" ON public.book_renewals FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "renewals own insert" ON public.book_renewals FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "renewals staff update" ON public.book_renewals FOR UPDATE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE TRIGGER trg_book_renewals_updated BEFORE UPDATE ON public.book_renewals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. library_events
CREATE TABLE IF NOT EXISTS public.library_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_date timestamptz NOT NULL,
  location text,
  capacity integer,
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.library_events TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.library_events TO authenticated;
GRANT ALL ON public.library_events TO service_role;
ALTER TABLE public.library_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events public read" ON public.library_events FOR SELECT
  USING (is_published = true OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "events staff insert" ON public.library_events FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "events staff update" ON public.library_events FOR UPDATE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "events staff delete" ON public.library_events FOR DELETE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));
CREATE TRIGGER trg_library_events_updated BEFORE UPDATE ON public.library_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. event_registrations
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.library_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.event_registrations TO authenticated;
GRANT ALL ON public.event_registrations TO service_role;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reg own select" ON public.event_registrations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "reg own insert" ON public.event_registrations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "reg own delete" ON public.event_registrations FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_book_wishlist_user ON public.book_wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_book_wishlist_book ON public.book_wishlist(book_id);
CREATE INDEX IF NOT EXISTS idx_book_reviews_book ON public.book_reviews(book_id);
CREATE INDEX IF NOT EXISTS idx_book_renewals_issue ON public.book_renewals(book_issue_id);
CREATE INDEX IF NOT EXISTS idx_book_renewals_status ON public.book_renewals(status);
CREATE INDEX IF NOT EXISTS idx_event_reg_event ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_library_events_date ON public.library_events(event_date);