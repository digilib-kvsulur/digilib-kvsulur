-- Create user_feedback table
CREATE TABLE IF NOT EXISTS public.user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    category TEXT NOT NULL CHECK (category IN ('suggestion', 'bug', 'compliment', 'other')),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Allow anonymous and authenticated insertions
CREATE POLICY "Allow public feedback submission" ON public.user_feedback
    FOR INSERT WITH CHECK (true);

-- Allow admins to read all feedback
CREATE POLICY "Allow admin to read all feedback" ON public.user_feedback
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Add book_reviews table
CREATE TABLE IF NOT EXISTS public.book_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(book_id, user_id)
);

ALTER TABLE public.book_reviews ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE public.book_reviews ADD COLUMN IF NOT EXISTS helpful_votes INTEGER DEFAULT 0;

-- Enable RLS for book reviews
ALTER TABLE public.book_reviews ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read approved reviews
CREATE POLICY "Allow public to read approved reviews" ON public.book_reviews
    FOR SELECT USING (is_approved = TRUE);

-- Allow authenticated users to create/update reviews
CREATE POLICY "Allow authenticated users to manage reviews" ON public.book_reviews
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Allow admins full access to reviews
CREATE POLICY "Allow admin full access to reviews" ON public.book_reviews
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Add is_book_of_the_week column to books
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS is_book_of_the_week BOOLEAN DEFAULT FALSE;

-- Add currently_reading status metadata column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS currently_reading JSONB;
