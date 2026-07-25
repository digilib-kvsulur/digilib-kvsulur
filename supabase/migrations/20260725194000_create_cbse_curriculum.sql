-- Create cbse_curriculum table for admin-managed CBSE resources
CREATE TABLE IF NOT EXISTS public.cbse_curriculum (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL DEFAULT 'CBSE Curriculum',
  chapter_title text NOT NULL,
  chapter_number integer,
  file_url text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.cbse_curriculum ENABLE ROW LEVEL SECURITY;

-- Anyone can view CBSE curriculum
CREATE POLICY "Anyone can view cbse curriculum"
  ON public.cbse_curriculum FOR SELECT
  USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can manage cbse curriculum"
  ON public.cbse_curriculum FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
