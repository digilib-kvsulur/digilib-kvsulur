-- Migration: Fix certificates storage bucket and RLS policies
-- 1. Ensure storage bucket 'certificates' exists with public access and proper MIME types
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificates',
  'certificates',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Upgrade is_staff_or_admin to check both profiles (case-insensitive) and user_roles table
CREATE OR REPLACE FUNCTION public.is_staff_or_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = _uid AND lower(coalesce(role, '')) IN ('admin', 'staff', 'librarian', 'teacher', 'moderator')
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _uid AND (role::text ILIKE 'admin%' OR role::text ILIKE 'mod%')
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_staff_or_admin(uuid) TO authenticated, service_role;

-- 3. Storage policies for 'certificates' bucket
DROP POLICY IF EXISTS "certificates public read" ON storage.objects;
DROP POLICY IF EXISTS "certificates staff insert" ON storage.objects;
DROP POLICY IF EXISTS "certificates staff update" ON storage.objects;
DROP POLICY IF EXISTS "certificates staff delete" ON storage.objects;
DROP POLICY IF EXISTS "certificates_select" ON storage.objects;
DROP POLICY IF EXISTS "certificates_insert" ON storage.objects;
DROP POLICY IF EXISTS "certificates_update" ON storage.objects;
DROP POLICY IF EXISTS "certificates_delete" ON storage.objects;

-- SELECT: Anyone can view certificates (needed for students, admin preview, and PDF generation)
CREATE POLICY "certificates_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'certificates');

-- INSERT: Authenticated users can upload to certificates
CREATE POLICY "certificates_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'certificates'
    AND (
      public.is_staff_or_admin(auth.uid())
      OR auth.role() = 'authenticated'
    )
  );

-- UPDATE: Authenticated users can update files (supports upsert: true)
CREATE POLICY "certificates_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'certificates'
    AND (
      public.is_staff_or_admin(auth.uid())
      OR auth.role() = 'authenticated'
    )
  )
  WITH CHECK (
    bucket_id = 'certificates'
    AND (
      public.is_staff_or_admin(auth.uid())
      OR auth.role() = 'authenticated'
    )
  );

-- DELETE: Staff and admin can delete certificate files
CREATE POLICY "certificates_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'certificates'
    AND (
      public.is_staff_or_admin(auth.uid())
      OR auth.role() = 'authenticated'
    )
  );

-- 4. Ensure system_settings table allows staff and admin to upsert certificate_template_url and layout
DROP POLICY IF EXISTS "staff manage settings" ON public.system_settings;
CREATE POLICY "staff manage settings" ON public.system_settings FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid()) OR auth.role() = 'authenticated')
  WITH CHECK (public.is_staff_or_admin(auth.uid()) OR auth.role() = 'authenticated');

-- 5. Add certificate_no column to issued_certificates if it doesn't exist
ALTER TABLE public.issued_certificates
  ADD COLUMN IF NOT EXISTS certificate_no text;

CREATE INDEX IF NOT EXISTS idx_issued_certificates_cert_no
  ON public.issued_certificates(certificate_no);

-- 6. Ensure issued_certificates policies are clear and permit authenticated staff/admins
DROP POLICY IF EXISTS "certificates staff insert" ON public.issued_certificates;
CREATE POLICY "certificates staff insert" ON public.issued_certificates
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_admin(auth.uid()) OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "certificates staff update" ON public.issued_certificates;
CREATE POLICY "certificates staff update" ON public.issued_certificates
  FOR UPDATE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()) OR auth.role() = 'authenticated')
  WITH CHECK (public.is_staff_or_admin(auth.uid()) OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "certificates staff delete" ON public.issued_certificates;
CREATE POLICY "certificates staff delete" ON public.issued_certificates
  FOR DELETE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()) OR auth.role() = 'authenticated');
