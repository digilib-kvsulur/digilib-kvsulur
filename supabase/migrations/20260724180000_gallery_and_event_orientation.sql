-- Add image_orientation to library_events if it doesn't exist
ALTER TABLE library_events ADD COLUMN IF NOT EXISTS image_orientation TEXT DEFAULT 'horizontal';

-- Create gallery_images table
CREATE TABLE IF NOT EXISTS gallery_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    image_url TEXT NOT NULL,
    caption TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist to prevent duplicates
DROP POLICY IF EXISTS "Allow public read access" ON gallery_images;
DROP POLICY IF EXISTS "Allow admin full control" ON gallery_images;

-- Create Policies
CREATE POLICY "Allow public read access" ON gallery_images 
    FOR SELECT USING (true);

CREATE POLICY "Allow admin full control" ON gallery_images 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );
