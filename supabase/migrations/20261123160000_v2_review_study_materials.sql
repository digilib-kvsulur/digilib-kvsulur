-- Keep previously published materials available, but place new submissions in a review queue.
ALTER TABLE public.study_materials
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS review_note TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS content_version INTEGER NOT NULL DEFAULT 1;

UPDATE public.study_materials SET review_status = 'approved', reviewed_at = coalesce(updated_at, created_at)
WHERE review_status = 'pending';

ALTER TABLE public.study_materials DROP CONSTRAINT IF EXISTS study_materials_review_status_check;
ALTER TABLE public.study_materials ADD CONSTRAINT study_materials_review_status_check
  CHECK (review_status IN ('pending', 'approved', 'needs_revision'));
CREATE INDEX IF NOT EXISTS study_materials_review_queue_idx
  ON public.study_materials (student_class, review_status, updated_at DESC);

DROP POLICY IF EXISTS "Anyone authenticated can view study materials" ON public.study_materials;
CREATE POLICY "Read approved or assigned class study materials" ON public.study_materials FOR SELECT TO authenticated
USING (
  review_status = 'approved'
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (
    p.role = 'admin'
    OR (p.role = 'teacher' AND (study_materials.student_class = p.student_class OR study_materials.student_class = 'All'))
  ))
);

DROP POLICY IF EXISTS "Admins and teachers can insert study materials" ON public.study_materials;
CREATE POLICY "Staff submit study materials for review" ON public.study_materials FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid() AND review_status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (
    p.role = 'admin' OR (p.role = 'teacher' AND (study_materials.student_class = p.student_class OR study_materials.student_class = 'All'))
  ))
);

DROP POLICY IF EXISTS "Admins and teachers can update study materials" ON public.study_materials;
DROP POLICY IF EXISTS "Staff update or review study materials" ON public.study_materials;
DROP POLICY IF EXISTS "Uploader edits unapproved study materials" ON public.study_materials;
DROP POLICY IF EXISTS "Staff review peer study materials" ON public.study_materials;
CREATE POLICY "Uploader edits unapproved study materials" ON public.study_materials FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (
    p.role = 'admin' OR (p.role = 'teacher' AND (study_materials.student_class = p.student_class OR study_materials.student_class = 'All')
      AND study_materials.uploaded_by = auth.uid() AND study_materials.review_status <> 'approved')
  ))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (
    p.role = 'admin' OR (p.role = 'teacher' AND (study_materials.student_class = p.student_class OR study_materials.student_class = 'All')
      AND study_materials.uploaded_by = auth.uid() AND study_materials.review_status = 'pending')
  ))
);

CREATE POLICY "Staff review peer study materials" ON public.study_materials FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (
    p.role = 'admin' OR (p.role = 'teacher' AND (study_materials.student_class = p.student_class OR study_materials.student_class = 'All')
      AND study_materials.uploaded_by <> auth.uid())
  ))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (
    p.role = 'admin' OR (p.role = 'teacher' AND (study_materials.student_class = p.student_class OR study_materials.student_class = 'All'))
  ))
);

CREATE OR REPLACE FUNCTION public.audit_study_material_review()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role = 'teacher' AND OLD.uploaded_by <> auth.uid() AND (
    NEW.uploaded_by IS DISTINCT FROM OLD.uploaded_by OR
    NEW.title IS DISTINCT FROM OLD.title OR NEW.description IS DISTINCT FROM OLD.description OR
    NEW.subject IS DISTINCT FROM OLD.subject OR NEW.student_class IS DISTINCT FROM OLD.student_class OR
    NEW.chapter_title IS DISTINCT FROM OLD.chapter_title OR NEW.resource_type IS DISTINCT FROM OLD.resource_type OR
    NEW.academic_session IS DISTINCT FROM OLD.academic_session OR NEW.markdown_content IS DISTINCT FROM OLD.markdown_content OR
    NEW.file_url IS DISTINCT FROM OLD.file_url OR NEW.file_name IS DISTINCT FROM OLD.file_name OR NEW.file_type IS DISTINCT FROM OLD.file_type OR
    NEW.source_label IS DISTINCT FROM OLD.source_label OR NEW.source_url IS DISTINCT FROM OLD.source_url OR
    NEW.exam_year IS DISTINCT FROM OLD.exam_year OR NEW.marks IS DISTINCT FROM OLD.marks
  ) THEN RAISE EXCEPTION 'Reviewers may change review status and notes only'; END IF;
  IF NEW.title IS DISTINCT FROM OLD.title OR NEW.description IS DISTINCT FROM OLD.description OR
     NEW.subject IS DISTINCT FROM OLD.subject OR NEW.student_class IS DISTINCT FROM OLD.student_class OR
     NEW.chapter_title IS DISTINCT FROM OLD.chapter_title OR NEW.resource_type IS DISTINCT FROM OLD.resource_type OR
     NEW.academic_session IS DISTINCT FROM OLD.academic_session OR NEW.markdown_content IS DISTINCT FROM OLD.markdown_content OR
     NEW.file_url IS DISTINCT FROM OLD.file_url OR NEW.file_name IS DISTINCT FROM OLD.file_name OR NEW.file_type IS DISTINCT FROM OLD.file_type OR
     NEW.source_label IS DISTINCT FROM OLD.source_label OR NEW.source_url IS DISTINCT FROM OLD.source_url OR
     NEW.exam_year IS DISTINCT FROM OLD.exam_year OR NEW.marks IS DISTINCT FROM OLD.marks THEN
    NEW.content_version := OLD.content_version + 1;
    NEW.review_status := 'pending'; NEW.review_note := NULL; NEW.reviewed_by := NULL; NEW.reviewed_at := NULL;
  ELSIF NEW.review_status IS DISTINCT FROM OLD.review_status THEN
    NEW.reviewed_by := auth.uid(); NEW.reviewed_at := now();
  ELSE
    NEW.content_version := OLD.content_version;
    NEW.reviewed_by := OLD.reviewed_by;
    NEW.reviewed_at := OLD.reviewed_at;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS study_material_review_audit ON public.study_materials;
CREATE TRIGGER study_material_review_audit BEFORE UPDATE ON public.study_materials
FOR EACH ROW EXECUTE FUNCTION public.audit_study_material_review();

DROP POLICY IF EXISTS "Admins and teachers can delete study materials" ON public.study_materials;
CREATE POLICY "Admin or uploader deletes study materials" ON public.study_materials FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (
    p.role = 'admin' OR (p.role = 'teacher' AND p.student_class = study_materials.student_class AND study_materials.uploaded_by = auth.uid())
  ))
);
