ALTER TABLE public.reading_history ADD COLUMN IF NOT EXISTS book_id uuid REFERENCES public.books(id) ON DELETE SET NULL;

-- Sync overdue fines
CREATE OR REPLACE FUNCTION public.sync_overdue_fines()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rate numeric; v_grace integer; r record; v_days integer; v_count integer := 0;
BEGIN
  SELECT rate_per_day, grace_period_days INTO v_rate, v_grace FROM public.fine_settings WHERE id = 1;
  v_rate := COALESCE(v_rate, 1); v_grace := COALESCE(v_grace, 0);

  FOR r IN
    SELECT bi.id, bi.user_id, bi.due_date, b.title
    FROM public.book_issues bi
    LEFT JOIN public.books b ON b.id = bi.book_id
    WHERE bi.return_date IS NULL
      AND bi.due_date < (CURRENT_DATE - v_grace)
  LOOP
    v_days := GREATEST((CURRENT_DATE - r.due_date) - v_grace, 0);
    IF v_days <= 0 THEN CONTINUE; END IF;
    IF EXISTS (SELECT 1 FROM public.library_fines f WHERE f.book_issue_id = r.id) THEN
      UPDATE public.library_fines
      SET days_overdue = v_days,
          rate_per_day = v_rate,
          total_amount = v_days * v_rate,
          updated_at = now()
      WHERE book_issue_id = r.id AND status <> 'paid';
    ELSE
      INSERT INTO public.library_fines (user_id, book_issue_id, book_title, days_overdue, rate_per_day, total_amount, status)
      VALUES (r.user_id, r.id, COALESCE(r.title, 'Book'), v_days, v_rate, v_days * v_rate, 'pending');
    END IF;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END; $$;
REVOKE EXECUTE ON FUNCTION public.sync_overdue_fines() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_overdue_fines() TO authenticated;

-- Complete a study session
DROP FUNCTION IF EXISTS public.complete_study_session(uuid, integer, uuid, text, text);
CREATE FUNCTION public.complete_study_session(
  p_session_id uuid, p_duration_seconds integer, p_material_id uuid DEFAULT NULL,
  p_material_title text DEFAULT NULL, p_notes text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_points integer; v_type text;
BEGIN
  SELECT session_type INTO v_type FROM public.study_sessions
  WHERE id = p_session_id AND user_id = auth.uid();
  IF v_type IS NULL THEN RAISE EXCEPTION 'Session not found'; END IF;

  v_points := CASE WHEN v_type = 'break' THEN 0
                   ELSE LEAST(FLOOR(GREATEST(p_duration_seconds,0) / 600.0)::int * 2, 30) END;

  UPDATE public.study_sessions
  SET duration_seconds = GREATEST(p_duration_seconds, 0),
      material_id = COALESCE(p_material_id, material_id),
      material_title = COALESCE(p_material_title, material_title),
      notes = COALESCE(p_notes, notes),
      points_earned = v_points,
      ended_at = now()
  WHERE id = p_session_id AND user_id = auth.uid();

  IF v_points > 0 THEN
    UPDATE public.profiles SET points = COALESCE(points,0) + v_points WHERE id = auth.uid();
  END IF;
  RETURN v_points;
END; $$;
REVOKE EXECUTE ON FUNCTION public.complete_study_session(uuid, integer, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_study_session(uuid, integer, uuid, text, text) TO authenticated;

-- Reading goal progress
CREATE OR REPLACE FUNCTION public.get_reading_goal_progress(p_user_id uuid, p_month text)
RETURNS TABLE(target_books integer, books_read integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE(
      (SELECT rg.target_books FROM public.reading_goals rg WHERE rg.user_id = p_user_id AND rg.month = p_month),
      (SELECT rg.target_books FROM public.reading_goals rg WHERE rg.user_id IS NULL AND rg.month = p_month),
      0
    )::int,
    (SELECT COUNT(*) FROM public.reading_history rh
      WHERE rh.user_id = p_user_id
        AND rh.status = 'approved'
        AND to_char(rh.completed_date, 'YYYY-MM') = p_month)::int
$$;
REVOKE EXECUTE ON FUNCTION public.get_reading_goal_progress(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_reading_goal_progress(uuid, text) TO authenticated;

-- Due soon reminders
CREATE OR REPLACE FUNCTION public.send_due_soon_reminders(p_days integer DEFAULT 2)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_count integer := 0;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorised'; END IF;
  FOR r IN
    SELECT bi.user_id, bi.due_date, b.title
    FROM public.book_issues bi
    LEFT JOIN public.books b ON b.id = bi.book_id
    WHERE bi.return_date IS NULL
      AND bi.due_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + COALESCE(p_days,2))
  LOOP
    PERFORM public.notify_user(
      r.user_id, 'Book due soon',
      format('"%s" is due on %s. Please return or request a renewal.', COALESCE(r.title,'Your book'), to_char(r.due_date,'DD Mon YYYY')),
      'warning');
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END; $$;
REVOKE EXECUTE ON FUNCTION public.send_due_soon_reminders(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_due_soon_reminders(integer) TO authenticated;

-- Scrap a reading entry
CREATE OR REPLACE FUNCTION public.scrap_reading_entry(p_reading_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_deducted integer := 0;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorised'; END IF;
  SELECT * INTO r FROM public.reading_history WHERE id = p_reading_id;
  IF r.id IS NULL THEN RETURN 0; END IF;
  IF r.status = 'approved' AND COALESCE(r.points_earned,0) > 0 THEN
    v_deducted := r.points_earned;
    UPDATE public.profiles SET points = GREATEST(COALESCE(points,0) - v_deducted, 0) WHERE id = r.user_id;
  END IF;
  DELETE FROM public.reading_history WHERE id = p_reading_id;
  RETURN v_deducted;
END; $$;
REVOKE EXECUTE ON FUNCTION public.scrap_reading_entry(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.scrap_reading_entry(uuid) TO authenticated;

-- Public ticket submission
CREATE OR REPLACE FUNCTION public.submit_public_support_ticket(
  p_admission text, p_full_name text, p_email text, p_student_class text, p_role text,
  p_category text, p_priority text, p_subject text, p_description text)
RETURNS TABLE(id uuid, ticket_number text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid; v_id uuid; v_no text;
BEGIN
  IF COALESCE(trim(p_admission),'') = '' OR COALESCE(trim(p_subject),'') = '' THEN
    RAISE EXCEPTION 'Admission number and subject are required';
  END IF;
  SELECT p.id INTO v_user FROM public.profiles p WHERE p.admission_number = trim(p_admission) LIMIT 1;

  INSERT INTO public.support_tickets (
    user_id, admission_number, full_name, email, student_class, role,
    category, subject, description, priority, status)
  VALUES (v_user, trim(p_admission), left(p_full_name,120), nullif(left(p_email,255),''), p_student_class, p_role,
    p_category, left(p_subject,150), left(p_description,2000), COALESCE(p_priority,'medium'), 'open')
  RETURNING support_tickets.id, support_tickets.ticket_number INTO v_id, v_no;

  RETURN QUERY SELECT v_id, v_no;
END; $$;
REVOKE EXECUTE ON FUNCTION public.submit_public_support_ticket(text,text,text,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_support_ticket(text,text,text,text,text,text,text,text,text) TO anon, authenticated;

-- Public ticket lookup
DROP FUNCTION IF EXISTS public.lookup_ticket_status(text, text);
CREATE FUNCTION public.lookup_ticket_status(p_ticket_number text, p_admission text)
RETURNS TABLE(id uuid, ticket_number text, subject text, category text, status text,
              priority text, admin_response text, created_at timestamptz, resolved_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.ticket_number, t.subject, t.category, t.status, t.priority,
         t.admin_response, t.created_at, t.resolved_at
  FROM public.support_tickets t
  WHERE upper(t.ticket_number) = upper(trim(p_ticket_number))
    AND t.admission_number = trim(p_admission)
  LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.lookup_ticket_status(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_ticket_status(text,text) TO anon, authenticated;

-- Link guest tickets to the signed-in member
CREATE OR REPLACE FUNCTION public.link_my_support_tickets()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_adm text; v_count integer := 0;
BEGIN
  SELECT admission_number INTO v_adm FROM public.profiles WHERE id = auth.uid();
  IF v_adm IS NULL OR v_adm = '' THEN RETURN 0; END IF;
  UPDATE public.support_tickets SET user_id = auth.uid()
  WHERE user_id IS NULL AND admission_number = v_adm;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END; $$;
REVOKE EXECUTE ON FUNCTION public.link_my_support_tickets() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_my_support_tickets() TO authenticated;