-- Missing columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hindi_name text,
  ADD COLUMN IF NOT EXISTS monthly_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS whatsapp_reward_claimed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_joined_at timestamptz,
  ADD COLUMN IF NOT EXISTS notification_email text,
  ADD COLUMN IF NOT EXISTS notification_email_confirmed_at timestamptz;
ALTER TABLE public.issued_certificates
  ADD COLUMN IF NOT EXISTS title_hindi text,
  ADD COLUMN IF NOT EXISTS name_hindi text,
  ADD COLUMN IF NOT EXISTS event_name text,
  ADD COLUMN IF NOT EXISTS event_hindi text,
  ADD COLUMN IF NOT EXISTS during_text text,
  ADD COLUMN IF NOT EXISTS certificate_no text,
  ADD COLUMN IF NOT EXISTS unlock_at timestamptz,
  ADD COLUMN IF NOT EXISTS common_text text,
  ADD COLUMN IF NOT EXISTS bilingual_data jsonb;
ALTER TABLE public.quiz_sessions
  ADD COLUMN IF NOT EXISTS time_per_question integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS scheduled_start_at timestamptz;
ALTER TABLE public.user_feedback ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS doubt_subject text,
  ADD COLUMN IF NOT EXISTS doubt_class text,
  ADD COLUMN IF NOT EXISTS doubt_status text,
  ADD COLUMN IF NOT EXISTS accepted_comment_id uuid;
ALTER TABLE public.library_events ADD COLUMN IF NOT EXISTS redirect_url text;

-- Bug bounty
CREATE TABLE IF NOT EXISTS public.bug_bounty_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  student_id uuid,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bug_bounty_campaigns TO authenticated;
GRANT ALL ON public.bug_bounty_campaigns TO service_role;
ALTER TABLE public.bug_bounty_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bbc read" ON public.bug_bounty_campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "bbc staff write" ON public.bug_bounty_campaigns FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.bug_bounty_campaigns(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  rewarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bug_reports TO authenticated;
GRANT ALL ON public.bug_reports TO service_role;
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "br own read" ON public.bug_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "br own insert" ON public.bug_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid() AND status = 'pending');
CREATE POLICY "br staff update" ON public.bug_reports FOR UPDATE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "br staff delete" ON public.bug_reports FOR DELETE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

-- Email campaign history
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preset text NOT NULL,
  subject text NOT NULL,
  recipient_count integer NOT NULL DEFAULT 0,
  sent_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.email_campaigns TO authenticated;
GRANT ALL ON public.email_campaigns TO service_role;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ec staff" ON public.email_campaigns FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- Event winners
CREATE TABLE IF NOT EXISTS public.event_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  position integer,
  position_title text,
  position_title_hindi text,
  collection_date date,
  collection_venue text,
  librarian_note text,
  certificate_id uuid,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  acknowledged_user_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_winners TO authenticated;
GRANT ALL ON public.event_winners TO service_role;
ALTER TABLE public.event_winners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ew read" ON public.event_winners FOR SELECT TO authenticated
  USING (is_published OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "ew staff write" ON public.event_winners FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- RPCs
CREATE OR REPLACE FUNCTION public.get_total_book_copies() RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(total_copies),0)::int FROM public.books $$;
GRANT EXECUTE ON FUNCTION public.get_total_book_copies() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.increment_book_available_copies(p_book_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.books SET available_copies = LEAST(available_copies + 1, total_copies) WHERE id = p_book_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.increment_book_available_copies(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.increment_book_available_copies(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.bulk_delete_book_requests(p_request_ids uuid[]) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  DELETE FROM public.book_requests WHERE id = ANY(p_request_ids);
  GET DIAGNOSTICS n = ROW_COUNT; RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.bulk_delete_book_requests(uuid[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bulk_delete_book_requests(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_book_request(
  p_book_id uuid DEFAULT NULL, p_requested_title text DEFAULT NULL, p_requested_author text DEFAULT NULL,
  p_requested_isbn text DEFAULT NULL, p_requested_description text DEFAULT NULL, p_admin_notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_old record; v_over boolean := false; v_title text; v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF (SELECT count(*) FROM public.book_requests WHERE user_id = v_uid AND status = 'pending') >= 2 THEN
    SELECT r.id, COALESCE(r.requested_title, b.title) AS t INTO v_old
    FROM public.book_requests r LEFT JOIN public.books b ON b.id = r.book_id
    WHERE r.user_id = v_uid AND r.status = 'pending' ORDER BY r.created_at LIMIT 1;
    DELETE FROM public.book_requests WHERE id = v_old.id;
    v_over := true; v_title := v_old.t;
  END IF;
  INSERT INTO public.book_requests (book_id, user_id, requested_title, requested_author, requested_isbn, requested_description, admin_notes, status)
  VALUES (p_book_id, v_uid, p_requested_title, p_requested_author, p_requested_isbn, p_requested_description, p_admin_notes, 'pending')
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('id', v_id, 'overwritten', v_over, 'overwritten_title', v_title);
END $$;
REVOKE EXECUTE ON FUNCTION public.submit_book_request(uuid,text,text,text,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.submit_book_request(uuid,text,text,text,text,text) TO authenticated;