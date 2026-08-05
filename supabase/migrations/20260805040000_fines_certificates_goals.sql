-- Library fines (UPI), school-wide reading goal, and certificates

-- 1. Seed / upsert library settings
INSERT INTO public.system_settings (key, value) VALUES
  ('fine_per_day', '1'::jsonb),
  ('upi_id', '""'::jsonb),
  ('upi_payee_name', '"PM SHRI KV AFS Sulur Library"'::jsonb),
  ('monthly_reading_goal', '3'::jsonb),
  ('certificate_template_url', 'null'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Issued certificates
CREATE TABLE IF NOT EXISTS public.issued_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_id uuid REFERENCES public.library_events(id) ON DELETE SET NULL,
  template_url text,
  issued_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_issued_certificates_user ON public.issued_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_issued_certificates_issued_at ON public.issued_certificates(issued_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.issued_certificates TO authenticated;
GRANT ALL ON public.issued_certificates TO service_role;

ALTER TABLE public.issued_certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "certificates own read" ON public.issued_certificates;
CREATE POLICY "certificates own read" ON public.issued_certificates
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "certificates staff insert" ON public.issued_certificates;
CREATE POLICY "certificates staff insert" ON public.issued_certificates
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "certificates staff update" ON public.issued_certificates;
CREATE POLICY "certificates staff update" ON public.issued_certificates
  FOR UPDATE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "certificates staff delete" ON public.issued_certificates;
CREATE POLICY "certificates staff delete" ON public.issued_certificates
  FOR DELETE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

-- 3. Allow staff to manage school-wide goals via monthly_reading_goals (optional sync)
DROP POLICY IF EXISTS "goals staff insert" ON public.monthly_reading_goals;
CREATE POLICY "goals staff insert" ON public.monthly_reading_goals
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "goals staff update" ON public.monthly_reading_goals;
CREATE POLICY "goals staff update" ON public.monthly_reading_goals
  FOR UPDATE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

-- 4. Certificates storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "certificates public read" ON storage.objects;
CREATE POLICY "certificates public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'certificates');

DROP POLICY IF EXISTS "certificates staff insert" ON storage.objects;
CREATE POLICY "certificates staff insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'certificates' AND public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "certificates staff update" ON storage.objects;
CREATE POLICY "certificates staff update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'certificates' AND public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "certificates staff delete" ON storage.objects;
CREATE POLICY "certificates staff delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'certificates' AND public.is_staff_or_admin(auth.uid()));
