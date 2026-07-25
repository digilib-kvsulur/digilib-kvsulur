-- Create community-media storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('community-media', 'community-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for community-media
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'community-media');
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'community-media');
CREATE POLICY "Users can update their own uploads" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'community-media' AND auth.uid() = owner);
CREATE POLICY "Users can delete their own uploads" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'community-media' AND auth.uid() = owner);
