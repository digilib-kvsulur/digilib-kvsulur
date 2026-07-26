ALTER TABLE library_events ADD COLUMN IF NOT EXISTS image_orientation TEXT DEFAULT 'horizontal';

CREATE TABLE IF NOT EXISTS gallery_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    image_url TEXT NOT NULL,
    caption TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ADDED FOR EVENT FILES AND END DATE
ALTER TABLE library_events ADD COLUMN IF NOT EXISTS schedule_files TEXT;
ALTER TABLE library_events ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE;
