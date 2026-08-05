
-- Add submission configuration columns to library_events
ALTER TABLE public.library_events ADD COLUMN IF NOT EXISTS allow_submissions BOOLEAN DEFAULT false;
ALTER TABLE public.library_events ADD COLUMN IF NOT EXISTS submission_types TEXT[] DEFAULT ARRAY['image', 'pdf']::TEXT[];
ALTER TABLE public.library_events ADD COLUMN IF NOT EXISTS max_submission_days INTEGER DEFAULT 1;

-- Create event_submissions table
CREATE TABLE IF NOT EXISTS public.event_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.library_events(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    day_number integer NOT NULL,
    file_url text NOT NULL,
    file_type text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(event_id, user_id, day_number)
);

-- RLS policies for event_submissions
ALTER TABLE public.event_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "submissions own read" ON public.event_submissions;
CREATE POLICY "submissions own read" ON public.event_submissions FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "submissions own insert" ON public.event_submissions;
CREATE POLICY "submissions own insert" ON public.event_submissions FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "submissions own update" ON public.event_submissions;
CREATE POLICY "submissions own update" ON public.event_submissions FOR UPDATE TO authenticated
    USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "submissions own delete" ON public.event_submissions;
CREATE POLICY "submissions own delete" ON public.event_submissions FOR DELETE TO authenticated
    USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

-- Add storage bucket for event submissions if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-submissions', 'event-submissions', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT
USING ( bucket_id = 'event-submissions' );

DROP POLICY IF EXISTS "Auth Insert" ON storage.objects;
CREATE POLICY "Auth Insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK ( bucket_id = 'event-submissions' );

DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE TO authenticated
USING ( bucket_id = 'event-submissions' );

DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;
CREATE POLICY "Auth Delete" ON storage.objects FOR DELETE TO authenticated
USING ( bucket_id = 'event-submissions' );


