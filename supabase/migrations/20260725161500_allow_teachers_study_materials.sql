-- Update policies on study_materials to allow teachers
DROP POLICY IF EXISTS "Admins can insert study materials" ON public.study_materials;
DROP POLICY IF EXISTS "Admins can update study materials" ON public.study_materials;
DROP POLICY IF EXISTS "Admins can delete study materials" ON public.study_materials;
DROP POLICY IF EXISTS "Admins and teachers can insert study materials" ON public.study_materials;
DROP POLICY IF EXISTS "Admins and teachers can update study materials" ON public.study_materials;
DROP POLICY IF EXISTS "Admins and teachers can delete study materials" ON public.study_materials;

CREATE POLICY "Admins and teachers can insert study materials"
ON public.study_materials FOR INSERT TO authenticated
WITH CHECK (get_profile_role(auth.uid()) IN ('admin', 'teacher'));

CREATE POLICY "Admins and teachers can update study materials"
ON public.study_materials FOR UPDATE TO authenticated
USING (get_profile_role(auth.uid()) IN ('admin', 'teacher'));

CREATE POLICY "Admins and teachers can delete study materials"
ON public.study_materials FOR DELETE TO authenticated
USING (get_profile_role(auth.uid()) IN ('admin', 'teacher'));

-- Update storage policies for study-materials bucket to allow teachers
DROP POLICY IF EXISTS "Admins can upload study material files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update study material files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete study material files" ON storage.objects;
DROP POLICY IF EXISTS "Admins and teachers can upload study material files" ON storage.objects;
DROP POLICY IF EXISTS "Admins and teachers can update study material files" ON storage.objects;
DROP POLICY IF EXISTS "Admins and teachers can delete study material files" ON storage.objects;

CREATE POLICY "Admins and teachers can upload study material files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'study-materials' AND get_profile_role(auth.uid()) IN ('admin', 'teacher'));

CREATE POLICY "Admins and teachers can update study material files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'study-materials' AND get_profile_role(auth.uid()) IN ('admin', 'teacher'));

CREATE POLICY "Admins and teachers can delete study material files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'study-materials' AND get_profile_role(auth.uid()) IN ('admin', 'teacher'));
