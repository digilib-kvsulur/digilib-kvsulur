DROP POLICY IF EXISTS "Anyone can upload feedback attachments" ON storage.objects;
CREATE POLICY "Anyone can upload feedback attachments" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'feedback_attachments');

DROP POLICY IF EXISTS "Staff can read feedback attachments" ON storage.objects;
CREATE POLICY "Staff can read feedback attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'feedback_attachments' AND public.is_staff_or_admin(auth.uid()));