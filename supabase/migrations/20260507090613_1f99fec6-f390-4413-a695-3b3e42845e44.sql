-- Study materials table
CREATE TABLE public.study_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  student_class TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view study materials"
ON public.study_materials FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert study materials"
ON public.study_materials FOR INSERT TO authenticated
WITH CHECK (get_profile_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update study materials"
ON public.study_materials FOR UPDATE TO authenticated
USING (get_profile_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete study materials"
ON public.study_materials FOR DELETE TO authenticated
USING (get_profile_role(auth.uid()) = 'admin');

CREATE TRIGGER update_study_materials_updated_at
BEFORE UPDATE ON public.study_materials
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage bucket for study materials
INSERT INTO storage.buckets (id, name, public)
VALUES ('study-materials', 'study-materials', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view study material files"
ON storage.objects FOR SELECT
USING (bucket_id = 'study-materials');

CREATE POLICY "Admins can upload study material files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'study-materials' AND get_profile_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update study material files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'study-materials' AND get_profile_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete study material files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'study-materials' AND get_profile_role(auth.uid()) = 'admin');