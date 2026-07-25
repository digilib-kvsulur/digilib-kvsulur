-- Add media_url and media_type columns to posts table
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS media_url text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS media_type text DEFAULT NULL; -- 'image', 'video', 'pdf'
