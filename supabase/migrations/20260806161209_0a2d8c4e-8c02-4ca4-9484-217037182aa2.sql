-- ============ BOOK CLUBS ============
CREATE TABLE IF NOT EXISTS public.book_clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  book_id uuid REFERENCES public.books(id) ON DELETE SET NULL,
  created_by uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_clubs TO authenticated;
GRANT ALL ON public.book_clubs TO service_role;
ALTER TABLE public.book_clubs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clubs_read" ON public.book_clubs FOR SELECT TO authenticated USING (true);
CREATE POLICY "clubs_staff_write" ON public.book_clubs FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.book_club_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.book_clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_club_members TO authenticated;
GRANT ALL ON public.book_club_members TO service_role;
ALTER TABLE public.book_club_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "club_members_read" ON public.book_club_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "club_members_join" ON public.book_club_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "club_members_leave" ON public.book_club_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.book_club_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.book_clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_club_messages TO authenticated;
GRANT ALL ON public.book_club_messages TO service_role;
ALTER TABLE public.book_club_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "club_msgs_read" ON public.book_club_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "club_msgs_write" ON public.book_club_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "club_msgs_delete" ON public.book_club_messages FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

-- ============ BOOK SUGGESTIONS ============
CREATE TABLE IF NOT EXISTS public.book_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  author text,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_suggestions TO authenticated;
GRANT ALL ON public.book_suggestions TO service_role;
ALTER TABLE public.book_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suggestions_own_read" ON public.book_suggestions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "suggestions_insert" ON public.book_suggestions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "suggestions_staff_update" ON public.book_suggestions FOR UPDATE TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "suggestions_staff_delete" ON public.book_suggestions FOR DELETE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

-- ============ CERTIFICATES ============
CREATE TABLE IF NOT EXISTS public.issued_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  event_id uuid REFERENCES public.library_events(id) ON DELETE SET NULL,
  template_url text,
  issued_by uuid,
  issued_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.issued_certificates TO authenticated;
GRANT ALL ON public.issued_certificates TO service_role;
ALTER TABLE public.issued_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "certs_read" ON public.issued_certificates FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "certs_staff_write" ON public.issued_certificates FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- ============ FINES ============
CREATE TABLE IF NOT EXISTS public.fine_settings (
  id integer PRIMARY KEY DEFAULT 1,
  rate_per_day numeric NOT NULL DEFAULT 1,
  grace_period_days integer NOT NULL DEFAULT 0,
  upi_id text,
  upi_payee_name text DEFAULT 'PM SHRI KV AFS Sulur Library',
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.fine_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
GRANT SELECT ON public.fine_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.fine_settings TO authenticated;
GRANT ALL ON public.fine_settings TO service_role;
ALTER TABLE public.fine_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fine_settings_read" ON public.fine_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "fine_settings_staff" ON public.fine_settings FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.library_fines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  book_issue_id uuid REFERENCES public.book_issues(id) ON DELETE SET NULL,
  book_title text,
  days_overdue integer NOT NULL DEFAULT 0,
  rate_per_day numeric NOT NULL DEFAULT 1,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  payment_method text,
  payment_ref text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_fines TO authenticated;
GRANT ALL ON public.library_fines TO service_role;
ALTER TABLE public.library_fines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fines_read" ON public.library_fines FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "fines_owner_update" ON public.library_fines FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "fines_staff_all" ON public.library_fines FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- ============ LOST BOOKS ============
CREATE TABLE IF NOT EXISTS public.lost_book_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  book_issue_id uuid REFERENCES public.book_issues(id) ON DELETE SET NULL,
  book_title text NOT NULL,
  accession_number text,
  replacement_cost numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'reported',
  admin_note text,
  reported_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lost_book_reports TO authenticated;
GRANT ALL ON public.lost_book_reports TO service_role;
ALTER TABLE public.lost_book_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lost_read" ON public.lost_book_reports FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "lost_insert" ON public.lost_book_reports FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "lost_staff_all" ON public.lost_book_reports FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- ============ PERIODICALS ============
CREATE TABLE IF NOT EXISTS public.periodicals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL DEFAULT 'magazine',
  frequency text,
  publisher text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.periodicals TO authenticated;
GRANT ALL ON public.periodicals TO service_role;
ALTER TABLE public.periodicals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "periodicals_read" ON public.periodicals FOR SELECT TO authenticated USING (true);
CREATE POLICY "periodicals_staff" ON public.periodicals FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.periodical_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodical_id uuid NOT NULL REFERENCES public.periodicals(id) ON DELETE CASCADE,
  issue_date date NOT NULL,
  volume text,
  issue_number text,
  notes text,
  on_shelf boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.periodical_issues TO authenticated;
GRANT ALL ON public.periodical_issues TO service_role;
ALTER TABLE public.periodical_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "periodical_issues_read" ON public.periodical_issues FOR SELECT TO authenticated USING (true);
CREATE POLICY "periodical_issues_staff" ON public.periodical_issues FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- ============ POLLS ============
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS post_type text NOT NULL DEFAULT 'text';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS pinned_at timestamptz;

CREATE TABLE IF NOT EXISTS public.poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poll_options TO authenticated;
GRANT ALL ON public.poll_options TO service_role;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "poll_options_read" ON public.poll_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "poll_options_insert" ON public.poll_options FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.user_id = auth.uid()));
CREATE POLICY "poll_options_delete" ON public.poll_options FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.user_id = auth.uid()) OR public.is_staff_or_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poll_votes TO authenticated;
GRANT ALL ON public.poll_votes TO service_role;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "poll_votes_read" ON public.poll_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "poll_votes_insert" ON public.poll_votes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "poll_votes_delete" ON public.poll_votes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============ READING GOALS ============
CREATE TABLE IF NOT EXISTS public.reading_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  month text NOT NULL,
  target_books integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS reading_goals_school_month ON public.reading_goals (month) WHERE user_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reading_goals_user_month ON public.reading_goals (user_id, month) WHERE user_id IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_goals TO authenticated;
GRANT ALL ON public.reading_goals TO service_role;
ALTER TABLE public.reading_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goals_read" ON public.reading_goals FOR SELECT TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "goals_own_write" ON public.reading_goals FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "goals_staff_write" ON public.reading_goals FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- ============ STUDY SESSIONS ============
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  material_id uuid,
  material_title text,
  duration_seconds integer NOT NULL DEFAULT 0,
  points_earned integer NOT NULL DEFAULT 0,
  session_type text NOT NULL DEFAULT 'study',
  notes text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_sessions TO authenticated;
GRANT ALL ON public.study_sessions TO service_role;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_own" ON public.study_sessions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "sessions_staff_read" ON public.study_sessions FOR SELECT TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

-- ============ EXTRA COLUMNS ============
ALTER TABLE public.library_events ADD COLUMN IF NOT EXISTS registration_deadline timestamptz;
ALTER TABLE public.library_events ADD COLUMN IF NOT EXISTS submission_deadline timestamptz;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS ticket_number text;
CREATE UNIQUE INDEX IF NOT EXISTS support_tickets_number_uq ON public.support_tickets (ticket_number);

CREATE OR REPLACE FUNCTION public.tg_set_ticket_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := 'KVS-' || to_char(now(), 'YYMM') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS set_ticket_number ON public.support_tickets;
CREATE TRIGGER set_ticket_number BEFORE INSERT ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.tg_set_ticket_number();
UPDATE public.support_tickets SET ticket_number = 'KVS-' || to_char(created_at, 'YYMM') || '-' || upper(substr(replace(id::text, '-', ''), 1, 6)) WHERE ticket_number IS NULL;