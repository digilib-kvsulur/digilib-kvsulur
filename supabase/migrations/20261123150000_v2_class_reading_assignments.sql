-- Teacher reading assignments are tenant-local and limited to a teacher's assigned class.
CREATE TABLE IF NOT EXISTS public.reading_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_level TEXT NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  description TEXT,
  book_ids UUID[] NOT NULL DEFAULT '{}',
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'archived')),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (cardinality(book_ids) > 0)
);

CREATE INDEX IF NOT EXISTS reading_assignments_class_due_idx
  ON public.reading_assignments (class_level, due_date) WHERE status = 'published';
ALTER TABLE public.reading_assignments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_assignments TO authenticated;

DROP POLICY IF EXISTS "Read class reading assignments" ON public.reading_assignments;
CREATE POLICY "Read class reading assignments" ON public.reading_assignments FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (
    p.role = 'admin' OR (p.role = 'student' AND p.student_class = class_level AND status = 'published')
    OR (p.role = 'teacher' AND p.student_class = class_level)
  ))
);

DROP POLICY IF EXISTS "Staff create class reading assignments" ON public.reading_assignments;
CREATE POLICY "Staff create class reading assignments" ON public.reading_assignments FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (
    p.role = 'admin' OR (p.role = 'teacher' AND p.student_class = class_level)
  ))
);

DROP POLICY IF EXISTS "Staff update class reading assignments" ON public.reading_assignments;
CREATE POLICY "Staff update class reading assignments" ON public.reading_assignments FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (
    p.role = 'admin' OR (p.role = 'teacher' AND p.student_class = class_level AND created_by = auth.uid())
  ))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (
    p.role = 'admin' OR (p.role = 'teacher' AND p.student_class = class_level AND created_by = auth.uid())
  ))
);

DROP POLICY IF EXISTS "Staff delete class reading assignments" ON public.reading_assignments;
CREATE POLICY "Staff delete class reading assignments" ON public.reading_assignments FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (
    p.role = 'admin' OR (p.role = 'teacher' AND p.student_class = class_level AND created_by = auth.uid())
  ))
);

CREATE TABLE IF NOT EXISTS public.reading_assignment_progress (
  assignment_id UUID NOT NULL REFERENCES public.reading_assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ,
  student_note TEXT CHECK (student_note IS NULL OR char_length(student_note) <= 500),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (assignment_id, user_id)
);
CREATE INDEX IF NOT EXISTS reading_assignment_progress_user_idx
  ON public.reading_assignment_progress (user_id, updated_at DESC);
ALTER TABLE public.reading_assignment_progress ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.reading_assignment_progress TO authenticated;

DROP POLICY IF EXISTS "Read own or assigned class reading progress" ON public.reading_assignment_progress;
CREATE POLICY "Read own or assigned class reading progress" ON public.reading_assignment_progress FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.reading_assignments a JOIN public.profiles p ON p.id = auth.uid()
    WHERE a.id = assignment_id AND (p.role = 'admin' OR (p.role = 'teacher' AND a.created_by = auth.uid() AND a.class_level = p.student_class))
  )
);

DROP POLICY IF EXISTS "Student records own reading completion" ON public.reading_assignment_progress;
CREATE POLICY "Student records own reading completion" ON public.reading_assignment_progress FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.reading_assignments a JOIN public.profiles p ON p.id = auth.uid()
    WHERE a.id = assignment_id AND p.role = 'student' AND p.student_class = a.class_level AND a.status = 'published'
  )
);

DROP POLICY IF EXISTS "Student updates own reading completion" ON public.reading_assignment_progress;
CREATE POLICY "Student updates own reading completion" ON public.reading_assignment_progress FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.reading_assignments a JOIN public.profiles p ON p.id = auth.uid()
    WHERE a.id = assignment_id AND p.role = 'student' AND p.student_class = a.class_level AND a.status = 'published'
  )
);
