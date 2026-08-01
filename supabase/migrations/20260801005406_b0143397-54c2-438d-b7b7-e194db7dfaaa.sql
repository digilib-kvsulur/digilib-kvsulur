ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_type text;

DROP POLICY IF EXISTS "community media read" ON storage.objects;
CREATE POLICY "community media read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'community-media');

DROP POLICY IF EXISTS "community media own insert" ON storage.objects;
CREATE POLICY "community media own insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'community-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "community media own update" ON storage.objects;
CREATE POLICY "community media own update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'community-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "community media own delete" ON storage.objects;
CREATE POLICY "community media own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'community-media' AND (storage.foldername(name))[1] = auth.uid()::text);