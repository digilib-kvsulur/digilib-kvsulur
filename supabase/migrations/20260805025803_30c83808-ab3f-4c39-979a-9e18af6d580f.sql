CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  admission_number text,
  full_name text NOT NULL,
  email text,
  student_class text,
  role text,
  category text NOT NULL DEFAULT 'general',
  subject text NOT NULL,
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  admin_response text,
  assigned_to uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT INSERT ON public.support_tickets TO anon;
GRANT ALL ON public.support_tickets TO service_role;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit a ticket" ON public.support_tickets;
CREATE POLICY "Anyone can submit a ticket" ON public.support_tickets FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Users view own tickets, staff view all" ON public.support_tickets;
CREATE POLICY "Users view own tickets, staff view all" ON public.support_tickets FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
DROP POLICY IF EXISTS "Staff update tickets" ON public.support_tickets;
CREATE POLICY "Staff update tickets" ON public.support_tickets FOR UPDATE TO authenticated USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));
DROP POLICY IF EXISTS "Staff delete tickets" ON public.support_tickets;
CREATE POLICY "Staff delete tickets" ON public.support_tickets FOR DELETE TO authenticated USING (public.is_staff_or_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_support_tickets_updated ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_updated BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);

CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid,
  sender_name text,
  is_staff boolean NOT NULL DEFAULT false,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.support_ticket_messages TO authenticated;
GRANT ALL ON public.support_ticket_messages TO service_role;

ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View messages on visible tickets" ON public.support_ticket_messages;
CREATE POLICY "View messages on visible tickets" ON public.support_ticket_messages FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()))));
DROP POLICY IF EXISTS "Reply on visible tickets" ON public.support_ticket_messages;
CREATE POLICY "Reply on visible tickets" ON public.support_ticket_messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()))));

DROP TRIGGER IF EXISTS trg_ticket_messages_updated ON public.support_ticket_messages;
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON public.support_ticket_messages(ticket_id);

-- Lookup for the public support form (no email/contact exposure)
CREATE OR REPLACE FUNCTION public.lookup_member_by_admission(p_admission text)
RETURNS TABLE(full_name text, student_class text, role text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT TRIM(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,'')), p.student_class, p.role
  FROM public.profiles p
  WHERE p.admission_number = p_admission AND p.is_approved = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_member_by_admission(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_member_by_admission(text) TO anon, authenticated;

-- Notify staff-free helper: notify ticket owner when admin responds
CREATE OR REPLACE FUNCTION public.tg_notify_ticket_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND (NEW.status IS DISTINCT FROM OLD.status OR NEW.admin_response IS DISTINCT FROM OLD.admin_response) THEN
    PERFORM public.notify_user(NEW.user_id, 'Support ticket updated',
      'Your ticket "' || COALESCE(NEW.subject,'') || '" is now ' || COALESCE(NEW.status,'open') || '.',
      CASE WHEN NEW.status = 'resolved' THEN 'success' ELSE 'info' END);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS notify_ticket_update ON public.support_tickets;
CREATE TRIGGER notify_ticket_update AFTER UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.tg_notify_ticket_update();