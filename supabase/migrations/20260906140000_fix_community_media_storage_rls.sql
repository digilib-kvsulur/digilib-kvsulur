-- Fix community-media storage bucket & RLS policies
-- Ensure bucket exists (public so images load without signed URLs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-media',
  'community-media',
  true,
  10485760,
  ARRAY['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/webm','application/pdf']
)
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop old policies (idempotent)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own uploads" ON storage.objects;
DROP POLICY IF EXISTS "community_media_select" ON storage.objects;
DROP POLICY IF EXISTS "community_media_insert" ON storage.objects;
DROP POLICY IF EXISTS "community_media_update" ON storage.objects;
DROP POLICY IF EXISTS "community_media_delete" ON storage.objects;

-- SELECT: anyone can read public community media
CREATE POLICY "community_media_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'community-media');

-- INSERT: authenticated users can upload to their own folder
CREATE POLICY "community_media_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'community-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE: users can update their own files
CREATE POLICY "community_media_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'community-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE: users can delete their own files
CREATE POLICY "community_media_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'community-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
