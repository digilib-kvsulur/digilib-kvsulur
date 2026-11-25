-- Skills Lab and Career Hub.
-- Content is tenant-local and readable by every signed-in member of the school.
-- Student progress and challenge submissions are private and written through RPCs.

CREATE TABLE IF NOT EXISTS public.skill_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{2,60}$'),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  summary TEXT NOT NULL DEFAULT '' CHECK (char_length(summary) <= 400),
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'Code2' CHECK (char_length(icon) <= 40),
  accent TEXT NOT NULL DEFAULT '#6366f1' CHECK (accent ~ '^#[0-9a-fA-F]{6}$'),
  min_class TEXT NOT NULL DEFAULT '6' CHECK (min_class IN ('6','7','8','9','10','11','12')),
  max_class TEXT NOT NULL DEFAULT '12' CHECK (max_class IN ('6','7','8','9','10','11','12')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (min_class <= max_class)
);

CREATE TABLE IF NOT EXISTS public.skill_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES public.skill_tracks(id) ON DELETE CASCADE,
  slug TEXT NOT NULL CHECK (slug ~ '^[a-z0-9-]{2,80}$'),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  summary TEXT NOT NULL DEFAULT '' CHECK (char_length(summary) <= 400),
  content_md TEXT NOT NULL CHECK (char_length(content_md) BETWEEN 20 AND 30000),
  est_minutes INTEGER NOT NULL DEFAULT 10 CHECK (est_minutes BETWEEN 3 AND 120),
  sort_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (track_id, slug)
);

CREATE INDEX IF NOT EXISTS skill_lessons_track_idx
  ON public.skill_lessons (track_id, sort_order) WHERE published;

CREATE TABLE IF NOT EXISTS public.skill_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.skill_lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  prompt_md TEXT NOT NULL CHECK (char_length(prompt_md) BETWEEN 10 AND 6000),
  starter_code TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'javascript' CHECK (language IN ('javascript', 'html')),
  tests JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(tests) = 'array'),
  sort_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, title)
);

CREATE INDEX IF NOT EXISTS skill_challenges_lesson_idx
  ON public.skill_challenges (lesson_id, sort_order) WHERE published;

CREATE TABLE IF NOT EXISTS public.skill_progress (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.skill_lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS skill_progress_user_idx
  ON public.skill_progress (user_id, completed_at DESC);

CREATE TABLE IF NOT EXISTS public.skill_submissions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.skill_challenges(id) ON DELETE CASCADE,
  code TEXT NOT NULL CHECK (char_length(code) <= 20000),
  passed BOOLEAN NOT NULL DEFAULT false,
  output TEXT CHECK (output IS NULL OR char_length(output) <= 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS skill_submissions_user_idx
  ON public.skill_submissions (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.career_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{2,80}$'),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 180),
  category TEXT NOT NULL CHECK (category IN ('stream', 'exam', 'career', 'scholarship', 'skill')),
  stream TEXT,
  summary TEXT NOT NULL DEFAULT '' CHECK (char_length(summary) <= 400),
  content_md TEXT NOT NULL CHECK (char_length(content_md) BETWEEN 20 AND 30000),
  link_url TEXT CHECK (link_url IS NULL OR link_url ~ '^https://'),
  min_class TEXT NOT NULL DEFAULT '6' CHECK (min_class IN ('6','7','8','9','10','11','12')),
  max_class TEXT NOT NULL DEFAULT '12' CHECK (max_class IN ('6','7','8','9','10','11','12')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS career_resources_category_idx
  ON public.career_resources (category, sort_order) WHERE published;

CREATE TABLE IF NOT EXISTS public.career_bookmarks (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.career_resources(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, resource_id)
);

ALTER TABLE public.skill_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read published skill tracks" ON public.skill_tracks;
CREATE POLICY "Read published skill tracks" ON public.skill_tracks FOR SELECT TO authenticated
USING (published OR public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Staff manage skill tracks" ON public.skill_tracks;
CREATE POLICY "Staff manage skill tracks" ON public.skill_tracks FOR ALL TO authenticated
USING (public.is_staff_or_admin(auth.uid()))
WITH CHECK (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Read published skill lessons" ON public.skill_lessons;
CREATE POLICY "Read published skill lessons" ON public.skill_lessons FOR SELECT TO authenticated
USING (published OR public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Staff manage skill lessons" ON public.skill_lessons;
CREATE POLICY "Staff manage skill lessons" ON public.skill_lessons FOR ALL TO authenticated
USING (public.is_staff_or_admin(auth.uid()))
WITH CHECK (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Read published skill challenges" ON public.skill_challenges;
CREATE POLICY "Read published skill challenges" ON public.skill_challenges FOR SELECT TO authenticated
USING (published OR public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Staff manage skill challenges" ON public.skill_challenges;
CREATE POLICY "Staff manage skill challenges" ON public.skill_challenges FOR ALL TO authenticated
USING (public.is_staff_or_admin(auth.uid()))
WITH CHECK (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Students read own skill progress" ON public.skill_progress;
CREATE POLICY "Students read own skill progress" ON public.skill_progress FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Students read own skill submissions" ON public.skill_submissions;
CREATE POLICY "Students read own skill submissions" ON public.skill_submissions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Read published career resources" ON public.career_resources;
CREATE POLICY "Read published career resources" ON public.career_resources FOR SELECT TO authenticated
USING (published OR public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Staff manage career resources" ON public.career_resources;
CREATE POLICY "Staff manage career resources" ON public.career_resources FOR ALL TO authenticated
USING (public.is_staff_or_admin(auth.uid()))
WITH CHECK (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Students manage own career bookmarks" ON public.career_bookmarks;
CREATE POLICY "Students manage own career bookmarks" ON public.career_bookmarks FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

GRANT SELECT ON public.skill_tracks, public.skill_lessons, public.skill_challenges TO authenticated;
GRANT SELECT ON public.skill_progress, public.skill_submissions TO authenticated;
GRANT SELECT ON public.career_resources TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.career_bookmarks TO authenticated;
GRANT ALL ON public.skill_tracks, public.skill_lessons, public.skill_challenges,
  public.skill_progress, public.skill_submissions, public.career_resources,
  public.career_bookmarks TO service_role;

DROP TRIGGER IF EXISTS skill_tracks_set_updated_at ON public.skill_tracks;
CREATE TRIGGER skill_tracks_set_updated_at BEFORE UPDATE ON public.skill_tracks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS skill_lessons_set_updated_at ON public.skill_lessons;
CREATE TRIGGER skill_lessons_set_updated_at BEFORE UPDATE ON public.skill_lessons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS career_resources_set_updated_at ON public.career_resources;
CREATE TRIGGER career_resources_set_updated_at BEFORE UPDATE ON public.career_resources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Progress and submission RPCs
-- ============================================================

CREATE OR REPLACE FUNCTION public.skill_complete_lesson(p_lesson UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_role TEXT;
  v_inserted BOOLEAN := false;
  v_today INTEGER;
  v_points INTEGER := 0;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '28000';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_user;
  IF v_role IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'Student access required' USING errcode = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.skill_lessons l
    JOIN public.skill_tracks t ON t.id = l.track_id
    WHERE l.id = p_lesson AND l.published AND t.published
  ) THEN
    RAISE EXCEPTION 'Lesson not found' USING errcode = '22023';
  END IF;

  INSERT INTO public.skill_progress (user_id, lesson_id)
  VALUES (v_user, p_lesson)
  ON CONFLICT (user_id, lesson_id) DO NOTHING;

  v_inserted := FOUND;

  IF NOT v_inserted THEN
    RETURN jsonb_build_object('completed', true, 'already_completed', true, 'awarded', 0);
  END IF;

  -- 5 points per new lesson, capped at 6 lessons (30 points) per UTC day.
  SELECT count(*) INTO v_today
  FROM public.skill_progress
  WHERE user_id = v_user AND completed_at >= date_trunc('day', now() AT TIME ZONE 'utc');

  IF v_today <= 6 THEN
    v_points := 5;
    UPDATE public.profiles SET points = coalesce(points, 0) + v_points WHERE id = v_user;
  END IF;

  RETURN jsonb_build_object(
    'completed', true,
    'already_completed', false,
    'awarded', v_points,
    'lessons_today', v_today
  );
END;
$$;

REVOKE ALL ON FUNCTION public.skill_complete_lesson(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.skill_complete_lesson(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.skill_submit_challenge(
  p_challenge UUID,
  p_code TEXT,
  p_passed BOOLEAN DEFAULT false,
  p_output TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_role TEXT;
  v_code TEXT := left(coalesce(p_code, ''), 20000);
  v_first BOOLEAN;
  v_today INTEGER;
  v_points INTEGER := 0;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '28000';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_user;
  IF v_role IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'Student access required' USING errcode = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.skill_challenges c
    JOIN public.skill_lessons l ON l.id = c.lesson_id
    JOIN public.skill_tracks t ON t.id = l.track_id
    WHERE c.id = p_challenge AND c.published AND l.published AND t.published
  ) THEN
    RAISE EXCEPTION 'Challenge not found' USING errcode = '22023';
  END IF;

  IF char_length(trim(v_code)) = 0 THEN
    RAISE EXCEPTION 'Write some code before submitting' USING errcode = '22023';
  END IF;

  SELECT count(*) INTO v_today
  FROM public.skill_submissions
  WHERE user_id = v_user AND created_at >= date_trunc('day', now() AT TIME ZONE 'utc');

  IF v_today >= 30 THEN
    RAISE EXCEPTION 'Daily submission limit reached. Try again tomorrow.' USING errcode = '22023';
  END IF;

  v_first := NOT EXISTS (
    SELECT 1 FROM public.skill_submissions
    WHERE user_id = v_user AND challenge_id = p_challenge
  );

  INSERT INTO public.skill_submissions (user_id, challenge_id, code, passed, output)
  VALUES (v_user, p_challenge, v_code, coalesce(p_passed, false), left(p_output, 4000));

  -- Effort reward: first submission of a challenge, capped at 4 per day (20 points).
  IF v_first AND v_today < 4 THEN
    v_points := 5;
    UPDATE public.profiles SET points = coalesce(points, 0) + v_points WHERE id = v_user;
  END IF;

  RETURN jsonb_build_object(
    'saved', true,
    'first_submission', v_first,
    'awarded', v_points
  );
END;
$$;

REVOKE ALL ON FUNCTION public.skill_submit_challenge(UUID, TEXT, BOOLEAN, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.skill_submit_challenge(UUID, TEXT, BOOLEAN, TEXT) TO authenticated;
