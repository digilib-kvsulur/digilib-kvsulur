-- Create gallery-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery-images', 'gallery-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for gallery-images bucket
DROP POLICY IF EXISTS "Anyone can view gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Admins and teachers can upload gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Admins and teachers can update gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Admins and teachers can delete gallery images" ON storage.objects;

CREATE POLICY "Anyone can view gallery images"
ON storage.objects FOR SELECT
USING (bucket_id = 'gallery-images');

CREATE POLICY "Admins and teachers can upload gallery images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'gallery-images' AND get_profile_role(auth.uid()) IN ('admin', 'teacher'));

CREATE POLICY "Admins and teachers can update gallery images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'gallery-images' AND get_profile_role(auth.uid()) IN ('admin', 'teacher'));

CREATE POLICY "Admins and teachers can delete gallery images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'gallery-images' AND get_profile_role(auth.uid()) IN ('admin', 'teacher'));
