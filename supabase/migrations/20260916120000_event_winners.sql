-- Migration: Create event_winners table for tracking event winners, physical certificate dates, and custom certificates
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

CREATE TABLE IF NOT EXISTS public.event_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.library_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  position TEXT NOT NULL DEFAULT '1st', -- '1st', '2nd', '3rd', 'merit', 'participation', 'special'
  position_title TEXT NOT NULL DEFAULT 'First Position',
  position_title_hindi TEXT,
  collection_date DATE,
  collection_venue TEXT DEFAULT 'Central Library Counter',
  librarian_note TEXT DEFAULT 'Please collect your winner certificate and award trophy on the specified date.',
  certificate_id UUID REFERENCES public.issued_certificates(id) ON DELETE SET NULL,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE,
  acknowledged_user_ids JSONB DEFAULT '[]'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_winners_event_id ON public.event_winners(event_id);
CREATE INDEX IF NOT EXISTS idx_event_winners_user_id ON public.event_winners(user_id);
CREATE INDEX IF NOT EXISTS idx_event_winners_is_published ON public.event_winners(is_published);

-- Enable RLS
ALTER TABLE public.event_winners ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'event_winners' AND policyname = 'Anyone can view published event winners'
  ) THEN
    CREATE POLICY "Anyone can view published event winners" ON public.event_winners
      FOR SELECT USING (is_published = true OR auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'event_winners' AND policyname = 'Admins can manage event winners'
  ) THEN
    CREATE POLICY "Admins can manage event winners" ON public.event_winners
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superadmin', 'librarian')
        )
      );
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
