-- Community uploads are available to every signed-in community member.
-- The previous policy also required the first object path segment to match
-- auth.uid(), which made otherwise valid authenticated uploads fail when the
-- storage client or caller used a different object path.
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

DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "community media own insert" ON storage.objects;
DROP POLICY IF EXISTS "community_media_insert" ON storage.objects;
DROP POLICY IF EXISTS "community media authenticated upload" ON storage.objects;

CREATE POLICY "community media authenticated upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'community-media');
