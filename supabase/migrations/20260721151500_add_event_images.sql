-- Migration: Add image_url to library_events and create event-images bucket

ALTER TABLE public.library_events ADD COLUMN IF NOT EXISTS image_url text;

-- Create event-images bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for event-images
CREATE POLICY "Anyone can view event images"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-images');

CREATE POLICY "Admins can upload event images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'event-images' AND public.get_profile_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update event images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'event-images' AND public.get_profile_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete event images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'event-images' AND public.get_profile_role(auth.uid()) = 'admin');
