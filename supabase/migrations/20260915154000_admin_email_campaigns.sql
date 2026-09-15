CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  preset text NOT NULL,
  subject text NOT NULL,
  recipient_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.email_campaigns TO authenticated;
GRANT ALL ON public.email_campaigns TO service_role;

DROP POLICY IF EXISTS "staff manage email campaigns" ON public.email_campaigns;
DROP POLICY IF EXISTS "staff view email campaigns" ON public.email_campaigns;

CREATE POLICY "staff manage email campaigns" ON public.email_campaigns FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));
