-- Student learning loop: My Day, exams, weekly goals, flashcards (spaced
-- repetition), practice mastery, mock tests, and learning analytics.
-- Every table is tenant-local and student rows are readable only by their owner.

-- ============================================================
-- 1. Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.exam_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_number TEXT NOT NULL CHECK (class_number IN ('6','7','8','9','10','11','12')),
  subject TEXT NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 100),
  exam_name TEXT NOT NULL CHECK (char_length(exam_name) BETWEEN 1 AND 160),
  exam_date DATE NOT NULL,
  syllabus JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(syllabus) = 'array'),
  instructions TEXT CHECK (instructions IS NULL OR char_length(instructions) <= 1000),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS exam_schedule_class_date_idx
  ON public.exam_schedule (class_number, exam_date);

CREATE TABLE IF NOT EXISTS public.study_weekly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  target_chapters INTEGER NOT NULL DEFAULT 0 CHECK (target_chapters BETWEEN 0 AND 50),
  target_practice INTEGER NOT NULL DEFAULT 0 CHECK (target_practice BETWEEN 0 AND 500),
  target_minutes INTEGER NOT NULL DEFAULT 0 CHECK (target_minutes BETWEEN 0 AND 3000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start, subject)
);

CREATE TABLE IF NOT EXISTS public.study_flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_number TEXT NOT NULL CHECK (class_number IN ('6','7','8','9','10','11','12')),
  subject TEXT NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 100),
  chapter_title TEXT NOT NULL DEFAULT '' CHECK (char_length(chapter_title) <= 240),
  front TEXT NOT NULL CHECK (char_length(front) BETWEEN 1 AND 1200),
  back TEXT NOT NULL CHECK (char_length(back) BETWEEN 1 AND 4000),
  source_kind TEXT NOT NULL DEFAULT 'manual'
    CHECK (source_kind IN ('manual','formula','term','mistake','teacher','revision')),
  source_resource_id UUID REFERENCES public.study_materials(id) ON DELETE SET NULL,
  content_hash TEXT NOT NULL,
  due_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  interval_days NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (interval_days >= 0 AND interval_days <= 365),
  ease NUMERIC(4,2) NOT NULL DEFAULT 2.50 CHECK (ease >= 1.30 AND ease <= 3.00),
  reps INTEGER NOT NULL DEFAULT 0 CHECK (reps >= 0),
  lapses INTEGER NOT NULL DEFAULT 0 CHECK (lapses >= 0),
  suspended BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, content_hash)
);

CREATE INDEX IF NOT EXISTS study_flashcards_due_idx
  ON public.study_flashcards (user_id, due_at)
  WHERE NOT suspended;

CREATE TABLE IF NOT EXISTS public.study_flashcard_reviews (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.study_flashcards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 4),
  interval_before NUMERIC(6,2),
  interval_after NUMERIC(6,2),
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS study_flashcard_reviews_user_idx
  ON public.study_flashcard_reviews (user_id, reviewed_at DESC);

CREATE TABLE IF NOT EXISTS public.study_flashcard_reward_claims (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  claim_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  points INTEGER NOT NULL CHECK (points > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, claim_date)
);

CREATE TABLE IF NOT EXISTS public.study_practice_attempts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.study_materials(id) ON DELETE CASCADE,
  class_number TEXT NOT NULL CHECK (class_number IN ('6','7','8','9','10','11','12')),
  subject TEXT NOT NULL,
  chapter_title TEXT NOT NULL DEFAULT '',
  topic TEXT NOT NULL DEFAULT '',
  question_index INTEGER NOT NULL CHECK (question_index >= 0),
  is_correct BOOLEAN NOT NULL,
  response_ms INTEGER CHECK (response_ms IS NULL OR response_ms BETWEEN 0 AND 3600000),
  attempt_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, resource_id, question_index, attempt_date)
);

CREATE INDEX IF NOT EXISTS study_practice_attempts_user_idx
  ON public.study_practice_attempts (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.study_chapter_mastery (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_number TEXT NOT NULL CHECK (class_number IN ('6','7','8','9','10','11','12')),
  subject TEXT NOT NULL,
  chapter_title TEXT NOT NULL DEFAULT '',
  best_score INTEGER NOT NULL DEFAULT 0 CHECK (best_score BETWEEN 0 AND 100),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  passed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, class_number, subject, chapter_title)
);

CREATE TABLE IF NOT EXISTS public.study_mock_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  paper_id UUID NOT NULL REFERENCES public.study_materials(id) ON DELETE CASCADE,
  class_number TEXT NOT NULL CHECK (class_number IN ('6','7','8','9','10','11','12')),
  subject TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ,
  answers JSONB,
  score INTEGER,
  max_score INTEGER,
  section_scores JSONB,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','submitted','expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS study_mock_attempts_one_active_idx
  ON public.study_mock_attempts (user_id, paper_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS study_mock_attempts_user_idx
  ON public.study_mock_attempts (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.learning_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event TEXT NOT NULL CHECK (char_length(event) BETWEEN 1 AND 60),
  entity_type TEXT CHECK (entity_type IS NULL OR char_length(entity_type) <= 40),
  entity_id TEXT CHECK (entity_id IS NULL OR char_length(entity_id) <= 80),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS learning_events_user_idx
  ON public.learning_events (user_id, created_at DESC);

-- ============================================================
-- 2. Row level security
-- ============================================================

ALTER TABLE public.exam_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_weekly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_flashcard_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_flashcard_reward_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_practice_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_chapter_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_mock_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read class exams" ON public.exam_schedule;
CREATE POLICY "Read class exams" ON public.exam_schedule FOR SELECT TO authenticated
USING (public.is_staff_or_admin(auth.uid()) OR class_number = public.study_current_class());

DROP POLICY IF EXISTS "Staff manage exams" ON public.exam_schedule;
CREATE POLICY "Staff manage exams" ON public.exam_schedule FOR ALL TO authenticated
USING (public.is_staff_or_admin(auth.uid()))
WITH CHECK (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Students manage own weekly goals" ON public.study_weekly_goals;
CREATE POLICY "Students manage own weekly goals" ON public.study_weekly_goals FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'student')
);

DROP POLICY IF EXISTS "Students read own flashcards" ON public.study_flashcards;
CREATE POLICY "Students read own flashcards" ON public.study_flashcards FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Students update own flashcards" ON public.study_flashcards;
CREATE POLICY "Students update own flashcards" ON public.study_flashcards FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Students delete own flashcards" ON public.study_flashcards;
CREATE POLICY "Students delete own flashcards" ON public.study_flashcards FOR DELETE TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Students read own flashcard reviews" ON public.study_flashcard_reviews;
CREATE POLICY "Students read own flashcard reviews" ON public.study_flashcard_reviews FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Students read own flashcard rewards" ON public.study_flashcard_reward_claims;
CREATE POLICY "Students read own flashcard rewards" ON public.study_flashcard_reward_claims FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Students read own practice attempts" ON public.study_practice_attempts;
CREATE POLICY "Students read own practice attempts" ON public.study_practice_attempts FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Students read own chapter mastery" ON public.study_chapter_mastery;
CREATE POLICY "Students read own chapter mastery" ON public.study_chapter_mastery FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Students read own mock attempts" ON public.study_mock_attempts;
CREATE POLICY "Students read own mock attempts" ON public.study_mock_attempts FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Students read own learning events" ON public.learning_events;
CREATE POLICY "Students read own learning events" ON public.learning_events FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

-- Explicit grants: writes go through SECURITY DEFINER RPCs below.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_schedule TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_weekly_goals TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.study_flashcards TO authenticated;
GRANT SELECT ON public.study_flashcard_reviews TO authenticated;
GRANT SELECT ON public.study_flashcard_reward_claims TO authenticated;
GRANT SELECT ON public.study_practice_attempts TO authenticated;
GRANT SELECT ON public.study_chapter_mastery TO authenticated;
GRANT SELECT ON public.study_mock_attempts TO authenticated;
GRANT SELECT ON public.learning_events TO authenticated;
GRANT ALL ON public.exam_schedule, public.study_weekly_goals, public.study_flashcards,
  public.study_flashcard_reviews, public.study_flashcard_reward_claims,
  public.study_practice_attempts, public.study_chapter_mastery,
  public.study_mock_attempts, public.learning_events TO service_role;

-- ============================================================
-- 3. Flashcards: create, seed, review, reward
-- ============================================================

CREATE OR REPLACE FUNCTION public.study_add_flashcards(p_cards JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_role TEXT;
  v_class TEXT;
  v_item JSONB;
  v_added INTEGER := 0;
  v_front TEXT;
  v_back TEXT;
  v_subject TEXT;
  v_chapter TEXT;
  v_kind TEXT;
  v_source UUID;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '28000';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_user;
  IF v_role IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'Student access required' USING errcode = '42501';
  END IF;

  IF p_cards IS NULL OR jsonb_typeof(p_cards) <> 'array' THEN
    RAISE EXCEPTION 'Cards must be an array' USING errcode = '22023';
  END IF;
  IF jsonb_array_length(p_cards) > 100 THEN
    RAISE EXCEPTION 'Add at most 100 cards at a time' USING errcode = '22023';
  END IF;

  v_class := coalesce(public.study_current_class(), '6');

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_cards) LOOP
    v_front := left(trim(coalesce(v_item->>'front', '')), 1200);
    v_back := left(trim(coalesce(v_item->>'back', '')), 4000);
    CONTINUE WHEN v_front = '' OR v_back = '';

    v_subject := left(trim(coalesce(v_item->>'subject', 'General')), 100);
    v_chapter := left(trim(coalesce(v_item->>'chapter_title', '')), 240);
    v_kind := coalesce(v_item->>'source_kind', 'manual');
    IF v_kind NOT IN ('manual','formula','term','mistake','teacher','revision') THEN
      v_kind := 'manual';
    END IF;

    BEGIN
      v_source := (v_item->>'source_resource_id')::uuid;
    EXCEPTION WHEN others THEN
      v_source := NULL;
    END;

    INSERT INTO public.study_flashcards (
      user_id, class_number, subject, chapter_title, front, back,
      source_kind, source_resource_id, content_hash, due_at
    ) VALUES (
      v_user, v_class, v_subject, v_chapter, v_front, v_back,
      v_kind, v_source, md5(lower(v_front) || '|' || lower(v_back)), now()
    )
    ON CONFLICT (user_id, content_hash) DO NOTHING;

    IF FOUND THEN
      v_added := v_added + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('added', v_added);
END;
$$;

REVOKE ALL ON FUNCTION public.study_add_flashcards(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.study_add_flashcards(JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.study_seed_flashcards(p_resource UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_role TEXT;
  v_class TEXT;
  v_type TEXT;
  v_subject TEXT;
  v_chapter TEXT;
  v_content TEXT;
  v_json JSONB;
  v_cards JSONB;
  v_item JSONB;
  v_chunk TEXT;
  v_front TEXT;
  v_back TEXT;
  v_kind TEXT;
  v_added INTEGER := 0;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '28000';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_user;
  IF v_role IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'Student access required' USING errcode = '42501';
  END IF;

  SELECT resource_type, subject, coalesce(chapter_title, ''), markdown_content
    INTO v_type, v_subject, v_chapter, v_content
  FROM public.study_materials
  WHERE id = p_resource AND review_status = 'approved';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resource not found or not approved' USING errcode = '22023';
  END IF;

  v_class := coalesce(public.study_current_class(), '6');

  IF v_type = 'flashcards' THEN
    BEGIN
      v_json := coalesce(v_content, '[]')::jsonb;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'This flashcard set is not valid JSON' USING errcode = '22023';
    END;
    v_cards := CASE WHEN jsonb_typeof(v_json) = 'object' THEN v_json->'cards' ELSE v_json END;
    IF v_cards IS NULL OR jsonb_typeof(v_cards) <> 'array' THEN
      RETURN jsonb_build_object('added', 0);
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(v_cards) LOOP
      v_front := left(trim(coalesce(v_item->>'front', '')), 1200);
      v_back := left(trim(coalesce(v_item->>'back', '')), 4000);
      CONTINUE WHEN v_front = '' OR v_back = '';
      INSERT INTO public.study_flashcards (
        user_id, class_number, subject, chapter_title, front, back,
        source_kind, source_resource_id, content_hash, due_at
      ) VALUES (
        v_user, v_class, v_subject, v_chapter, v_front, v_back,
        'teacher', p_resource, md5(lower(v_front) || '|' || lower(v_back)), now()
      )
      ON CONFLICT (user_id, content_hash) DO NOTHING;
      IF FOUND THEN v_added := v_added + 1; END IF;
    END LOOP;
  ELSIF v_type IN ('quick_revision','formula_sheet','short_notes','chapter_lesson') THEN
    v_kind := CASE
      WHEN v_type = 'quick_revision' THEN 'revision'
      WHEN v_type = 'formula_sheet' THEN 'formula'
      ELSE 'term'
    END;

    FOR v_chunk IN
      SELECT trim(chunk) FROM regexp_split_to_table(coalesce(v_content, ''), E'\n\s*\n') AS chunk
    LOOP
      CONTINUE WHEN length(v_chunk) < 20;
      v_front := left(regexp_replace(split_part(v_chunk, E'\n', 1), '[#*_`>~-]', '', 'g'), 300);
      IF trim(v_front) = '' THEN
        v_front := left(v_chunk, 120);
      END IF;
      v_back := left(v_chunk, 4000);
      INSERT INTO public.study_flashcards (
        user_id, class_number, subject, chapter_title, front, back,
        source_kind, source_resource_id, content_hash, due_at
      ) VALUES (
        v_user, v_class, v_subject, v_chapter, trim(v_front), v_back,
        v_kind, p_resource, md5(lower(trim(v_front)) || '|' || lower(v_back)), now()
      )
      ON CONFLICT (user_id, content_hash) DO NOTHING;
      IF FOUND THEN v_added := v_added + 1; END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('added', v_added);
END;
$$;

REVOKE ALL ON FUNCTION public.study_seed_flashcards(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.study_seed_flashcards(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.study_flashcards_due(p_limit INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_cards JSONB;
  v_due INTEGER;
  v_total INTEGER;
  v_learned INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '28000';
  END IF;

  SELECT count(*) INTO v_due
  FROM public.study_flashcards
  WHERE user_id = v_user AND NOT suspended AND due_at <= now();

  SELECT count(*) INTO v_total
  FROM public.study_flashcards
  WHERE user_id = v_user AND NOT suspended;

  SELECT count(*) INTO v_learned
  FROM public.study_flashcards
  WHERE user_id = v_user AND NOT suspended AND reps >= 3;

  SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.due_at), '[]'::jsonb) INTO v_cards
  FROM (
    SELECT id, front, back, subject, chapter_title, source_kind,
           due_at, interval_days, ease, reps, lapses
    FROM public.study_flashcards
    WHERE user_id = v_user AND NOT suspended AND due_at <= now()
    ORDER BY due_at ASC
    LIMIT greatest(1, least(coalesce(p_limit, 30), 100))
  ) c;

  RETURN jsonb_build_object(
    'cards', v_cards,
    'due_count', v_due,
    'total', v_total,
    'learned', v_learned
  );
END;
$$;

REVOKE ALL ON FUNCTION public.study_flashcards_due(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.study_flashcards_due(INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.study_review_flashcard(p_card UUID, p_rating INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_card public.study_flashcards%ROWTYPE;
  v_interval NUMERIC(6,2);
  v_ease NUMERIC(4,2);
  v_reps INTEGER;
  v_lapses INTEGER;
  v_due TIMESTAMPTZ;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '28000';
  END IF;
  IF p_rating IS NULL OR p_rating NOT BETWEEN 1 AND 4 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 4' USING errcode = '22023';
  END IF;

  SELECT * INTO v_card
  FROM public.study_flashcards
  WHERE id = p_card AND user_id = v_user
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Flashcard not found' USING errcode = '22023';
  END IF;

  v_interval := v_card.interval_days;
  v_ease := v_card.ease;
  v_reps := v_card.reps;
  v_lapses := v_card.lapses;

  IF p_rating = 1 THEN
    v_lapses := v_lapses + 1;
    v_reps := 0;
    v_ease := greatest(1.30, v_ease - 0.20);
    v_interval := 0;
    v_due := now() + interval '10 minutes';
  ELSIF p_rating = 2 THEN
    v_ease := greatest(1.30, v_ease - 0.15);
    v_interval := greatest(1, round(v_interval * 1.2));
    v_reps := v_reps + 1;
    v_due := now() + (v_interval || ' days')::interval;
  ELSIF p_rating = 3 THEN
    IF v_reps = 0 THEN
      v_interval := 1;
    ELSIF v_reps = 1 THEN
      v_interval := 3;
    ELSE
      v_interval := round(v_interval * v_ease);
    END IF;
    v_reps := v_reps + 1;
    v_due := now() + (v_interval || ' days')::interval;
  ELSE
    v_ease := least(3.00, v_ease + 0.15);
    IF v_reps = 0 THEN
      v_interval := 2;
    ELSIF v_reps = 1 THEN
      v_interval := 5;
    ELSE
      v_interval := round(v_interval * v_ease * 1.3);
    END IF;
    v_reps := v_reps + 1;
    v_due := now() + (v_interval || ' days')::interval;
  END IF;

  v_interval := least(v_interval, 180);

  UPDATE public.study_flashcards
  SET due_at = v_due,
      interval_days = v_interval,
      ease = v_ease,
      reps = v_reps,
      lapses = v_lapses,
      updated_at = now()
  WHERE id = p_card;

  INSERT INTO public.study_flashcard_reviews (
    card_id, user_id, rating, interval_before, interval_after
  ) VALUES (
    p_card, v_user, p_rating, v_card.interval_days, v_interval
  );

  RETURN jsonb_build_object(
    'due_at', v_due,
    'interval_days', v_interval,
    'ease', v_ease,
    'reps', v_reps,
    'lapses', v_lapses
  );
END;
$$;

REVOKE ALL ON FUNCTION public.study_review_flashcard(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.study_review_flashcard(UUID, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_flashcard_reward()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_role TEXT;
  v_reviews INTEGER;
  v_claim UUID;
  v_points CONSTANT INTEGER := 15;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '28000';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_user FOR UPDATE;
  IF v_role IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'Only students can claim review rewards' USING errcode = '42501';
  END IF;

  SELECT count(*) INTO v_reviews
  FROM public.study_flashcard_reviews
  WHERE user_id = v_user AND reviewed_at >= date_trunc('day', now());

  IF v_reviews < 10 THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'need_more_reviews', 'reviews', v_reviews);
  END IF;

  INSERT INTO public.study_flashcard_reward_claims (user_id, points)
  VALUES (v_user, v_points)
  ON CONFLICT (user_id, claim_date) DO NOTHING
  RETURNING user_id INTO v_claim;

  IF v_claim IS NULL THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'already_claimed', 'reviews', v_reviews);
  END IF;

  UPDATE public.profiles SET points = coalesce(points, 0) + v_points WHERE id = v_user;

  RETURN jsonb_build_object('awarded', true, 'points', v_points, 'reviews', v_reviews);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_flashcard_reward() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_flashcard_reward() TO authenticated;

-- ============================================================
-- 4. Practice mastery and chapter checkpoint
-- ============================================================

CREATE OR REPLACE FUNCTION public.study_record_practice_answer(
  p_resource UUID,
  p_question_index INTEGER,
  p_selected_index INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_role TEXT;
  v_class TEXT;
  v_subject TEXT;
  v_chapter TEXT;
  v_topic TEXT;
  v_type TEXT;
  v_json JSONB;
  v_question JSONB;
  v_correct INTEGER;
  v_recorded BOOLEAN := false;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '28000';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_user;
  IF v_role IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'Student access required' USING errcode = '42501';
  END IF;

  SELECT student_class, subject, coalesce(chapter_title, ''), coalesce(topic, ''),
         resource_type, markdown_content
    INTO v_class, v_subject, v_chapter, v_topic, v_type, v_json
  FROM public.study_materials
  WHERE id = p_resource AND review_status = 'approved';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Practice set not found' USING errcode = '22023';
  END IF;
  IF v_type NOT IN ('chapter_practice','checkpoint') THEN
    RAISE EXCEPTION 'This resource is not a practice set' USING errcode = '22023';
  END IF;

  BEGIN
    v_json := coalesce(v_json, '{}')::jsonb;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'Practice set is not valid JSON' USING errcode = '22023';
  END;

  IF jsonb_typeof(v_json->'questions') <> 'array' THEN
    RAISE EXCEPTION 'Practice set has no questions' USING errcode = '22023';
  END IF;
  IF p_question_index IS NULL OR p_question_index < 0
     OR p_question_index >= jsonb_array_length(v_json->'questions') THEN
    RAISE EXCEPTION 'Question index out of range' USING errcode = '22023';
  END IF;

  v_question := v_json->'questions'->p_question_index;
  IF coalesce(v_question->>'correct_index', '') !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'Question has no correct answer' USING errcode = '22023';
  END IF;
  v_correct := (v_question->>'correct_index')::int;

  INSERT INTO public.study_practice_attempts (
    user_id, resource_id, class_number, subject, chapter_title, topic,
    question_index, is_correct, attempt_date
  ) VALUES (
    v_user, p_resource,
    coalesce(nullif(substring(coalesce(v_class, '') FROM '[0-9]{1,2}'), ''), public.study_current_class(), '6'),
    v_subject, v_chapter,
    coalesce(nullif(v_question->>'topic', ''), v_topic),
    p_question_index,
    coalesce(p_selected_index, -1) = v_correct,
    (now() AT TIME ZONE 'utc')::date
  )
  ON CONFLICT (user_id, resource_id, question_index, attempt_date) DO NOTHING;

  v_recorded := FOUND;

  RETURN jsonb_build_object(
    'recorded', v_recorded,
    'correct_index', v_correct,
    'is_correct', coalesce(p_selected_index, -1) = v_correct
  );
END;
$$;

REVOKE ALL ON FUNCTION public.study_record_practice_answer(UUID, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.study_record_practice_answer(UUID, INTEGER, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.study_mastery_summary(p_class TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_rows JSONB;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '28000';
  END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.accuracy ASC), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT
      a.subject,
      a.chapter_title,
      count(*)::int AS attempts,
      round(100.0 * sum(CASE WHEN a.is_correct THEN 1 ELSE 0 END) / count(*))::int AS accuracy,
      max(a.created_at) AS last_practiced,
      coalesce(m.passed_at IS NOT NULL, false) AS checkpoint_passed,
      coalesce(m.best_score, 0) AS checkpoint_score
    FROM public.study_practice_attempts a
    LEFT JOIN public.study_chapter_mastery m
      ON m.user_id = a.user_id
     AND m.class_number = a.class_number
     AND m.subject = a.subject
     AND m.chapter_title = a.chapter_title
    WHERE a.user_id = v_user
      AND (p_class IS NULL OR a.class_number = p_class)
    GROUP BY a.subject, a.chapter_title, m.passed_at, m.best_score
  ) t;

  RETURN jsonb_build_object('chapters', v_rows);
END;
$$;

REVOKE ALL ON FUNCTION public.study_mastery_summary(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.study_mastery_summary(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.study_chapter_checkpoint(p_resource UUID, p_answers JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_role TEXT;
  v_class TEXT;
  v_subject TEXT;
  v_chapter TEXT;
  v_topic TEXT;
  v_type TEXT;
  v_json JSONB;
  v_total INTEGER;
  v_correct_count INTEGER := 0;
  v_score INTEGER;
  v_i INTEGER;
  v_q JSONB;
  v_correct INTEGER;
  v_selected INTEGER;
  v_prev_passed TIMESTAMPTZ;
  v_new_pass BOOLEAN := false;
  v_awarded INTEGER := 0;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '28000';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_user;
  IF v_role IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'Student access required' USING errcode = '42501';
  END IF;

  SELECT student_class, subject, coalesce(chapter_title, ''), coalesce(topic, ''),
         resource_type, markdown_content
    INTO v_class, v_subject, v_chapter, v_topic, v_type, v_json
  FROM public.study_materials
  WHERE id = p_resource AND review_status = 'approved';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checkpoint not found' USING errcode = '22023';
  END IF;
  IF v_type <> 'checkpoint' THEN
    RAISE EXCEPTION 'This resource is not a chapter checkpoint' USING errcode = '22023';
  END IF;
  IF p_answers IS NULL OR jsonb_typeof(p_answers) <> 'array' THEN
    RAISE EXCEPTION 'Answers must be an array' USING errcode = '22023';
  END IF;

  BEGIN
    v_json := coalesce(v_json, '{}')::jsonb;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'Checkpoint is not valid JSON' USING errcode = '22023';
  END;

  IF jsonb_typeof(v_json->'questions') <> 'array' THEN
    RAISE EXCEPTION 'Checkpoint has no questions' USING errcode = '22023';
  END IF;

  v_total := jsonb_array_length(v_json->'questions');
  IF v_total = 0 THEN
    RAISE EXCEPTION 'Checkpoint has no questions' USING errcode = '22023';
  END IF;

  FOR v_i IN 0..v_total - 1 LOOP
    v_q := v_json->'questions'->v_i;
    v_correct := CASE WHEN coalesce(v_q->>'correct_index', '') ~ '^[0-9]+$'
                      THEN (v_q->>'correct_index')::int ELSE -1 END;
    v_selected := CASE WHEN coalesce(p_answers->>v_i, '') ~ '^[0-9]+$'
                       THEN (p_answers->>v_i)::int ELSE -1 END;

    IF v_selected = v_correct AND v_correct >= 0 THEN
      v_correct_count := v_correct_count + 1;
    END IF;

    INSERT INTO public.study_practice_attempts (
      user_id, resource_id, class_number, subject, chapter_title, topic,
      question_index, is_correct, attempt_date
    ) VALUES (
      v_user, p_resource,
      coalesce(nullif(substring(coalesce(v_class, '') FROM '[0-9]{1,2}'), ''), public.study_current_class(), '6'),
      v_subject, v_chapter,
      coalesce(nullif(v_q->>'topic', ''), v_topic),
      v_i,
      v_selected = v_correct,
      (now() AT TIME ZONE 'utc')::date
    )
    ON CONFLICT (user_id, resource_id, question_index, attempt_date) DO NOTHING;
  END LOOP;

  v_score := round(100.0 * v_correct_count / v_total)::int;

  SELECT passed_at INTO v_prev_passed
  FROM public.study_chapter_mastery
  WHERE user_id = v_user
    AND class_number = coalesce(nullif(substring(coalesce(v_class, '') FROM '[0-9]{1,2}'), ''), public.study_current_class(), '6')
    AND subject = v_subject
    AND chapter_title = v_chapter
  FOR UPDATE;

  v_new_pass := (v_score >= 80 AND v_prev_passed IS NULL);

  INSERT INTO public.study_chapter_mastery (
    user_id, class_number, subject, chapter_title, best_score, attempts, passed_at, updated_at
  ) VALUES (
    v_user,
    coalesce(nullif(substring(coalesce(v_class, '') FROM '[0-9]{1,2}'), ''), public.study_current_class(), '6'),
    v_subject, v_chapter, v_score, 1,
    CASE WHEN v_score >= 80 THEN now() ELSE NULL END,
    now()
  )
  ON CONFLICT (user_id, class_number, subject, chapter_title) DO UPDATE
  SET best_score = greatest(public.study_chapter_mastery.best_score, excluded.best_score),
      attempts = public.study_chapter_mastery.attempts + 1,
      passed_at = coalesce(public.study_chapter_mastery.passed_at, excluded.passed_at),
      updated_at = now();

  IF v_new_pass THEN
    v_awarded := 25;
    UPDATE public.profiles SET points = coalesce(points, 0) + v_awarded WHERE id = v_user;
  END IF;

  RETURN jsonb_build_object(
    'score', v_score,
    'correct', v_correct_count,
    'total', v_total,
    'passed', v_score >= 80,
    'awarded', v_awarded
  );
END;
$$;

REVOKE ALL ON FUNCTION public.study_chapter_checkpoint(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.study_chapter_checkpoint(UUID, JSONB) TO authenticated;

-- ============================================================
-- 5. Mock tests (objective papers, server-graded)
-- ============================================================

CREATE OR REPLACE FUNCTION public.study_mock_start(p_paper UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_role TEXT;
  v_class TEXT;
  v_subject TEXT;
  v_title TEXT;
  v_type TEXT;
  v_json JSONB;
  v_sections JSONB;
  v_duration INTEGER;
  v_attempt public.study_mock_attempts%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '28000';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_user;
  IF v_role IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'Student access required' USING errcode = '42501';
  END IF;

  SELECT student_class, subject, title, resource_type, markdown_content
    INTO v_class, v_subject, v_title, v_type, v_json
  FROM public.study_materials
  WHERE id = p_paper AND review_status = 'approved';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mock paper not found' USING errcode = '22023';
  END IF;
  IF v_type <> 'mock_paper' THEN
    RAISE EXCEPTION 'This resource is not a mock paper' USING errcode = '22023';
  END IF;

  BEGIN
    v_json := coalesce(v_json, '{}')::jsonb;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'Mock paper is not valid JSON' USING errcode = '22023';
  END;

  IF jsonb_typeof(v_json->'sections') <> 'array' OR jsonb_array_length(v_json->'sections') = 0 THEN
    RAISE EXCEPTION 'Mock paper has no sections' USING errcode = '22023';
  END IF;

  v_duration := greatest(5, least(
    CASE WHEN coalesce(v_json->>'duration_minutes', '') ~ '^[0-9]+$'
         THEN (v_json->>'duration_minutes')::int ELSE 60 END,
    240
  ));

  -- Reuse an active attempt that has not expired.
  SELECT * INTO v_attempt
  FROM public.study_mock_attempts
  WHERE user_id = v_user AND paper_id = p_paper AND status = 'active'
  LIMIT 1
  FOR UPDATE;

  IF FOUND AND v_attempt.expires_at <= now() THEN
    UPDATE public.study_mock_attempts SET status = 'expired' WHERE id = v_attempt.id;
    v_attempt := NULL;
  END IF;

  IF v_attempt.id IS NULL THEN
    INSERT INTO public.study_mock_attempts (
      user_id, paper_id, class_number, subject, expires_at
    ) VALUES (
      v_user, p_paper,
      coalesce(nullif(substring(coalesce(v_class, '') FROM '[0-9]{1,2}'), ''), public.study_current_class(), '6'),
      v_subject,
      now() + (v_duration || ' minutes')::interval
    )
    RETURNING * INTO v_attempt;
  END IF;

  -- Strip correct answers before sending the paper to the browser.
  SELECT jsonb_agg(
    jsonb_build_object(
      'name', coalesce(s.value->>'name', 'Section'),
      'marks_per_question', CASE
        WHEN coalesce(s.value->>'marks_per_question', '') ~ '^[0-9]+$'
        THEN (s.value->>'marks_per_question')::int ELSE 1 END,
      'questions', CASE
        WHEN jsonb_typeof(s.value->'questions') = 'array' THEN coalesce((
          SELECT jsonb_agg(jsonb_build_object(
            'prompt', q.value->>'prompt',
            'options', q.value->'options'
          ))
          FROM jsonb_array_elements(s.value->'questions') q
        ), '[]'::jsonb)
        ELSE '[]'::jsonb END
    )
  ) INTO v_sections
  FROM jsonb_array_elements(v_json->'sections') s;

  RETURN jsonb_build_object(
    'attempt_id', v_attempt.id,
    'started_at', v_attempt.started_at,
    'expires_at', v_attempt.expires_at,
    'paper', jsonb_build_object(
      'id', p_paper,
      'title', v_title,
      'subject', v_subject,
      'duration_minutes', v_duration,
      'sections', v_sections
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.study_mock_start(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.study_mock_start(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.study_mock_submit(p_attempt UUID, p_answers JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_attempt public.study_mock_attempts%ROWTYPE;
  v_json JSONB;
  v_s JSONB;
  v_q JSONB;
  v_s_idx INTEGER;
  v_q_idx INTEGER;
  v_marks INTEGER;
  v_correct INTEGER;
  v_selected_text TEXT;
  v_selected INTEGER;
  v_score INTEGER := 0;
  v_max_score INTEGER := 0;
  v_section_score INTEGER;
  v_section_max INTEGER;
  v_sections JSONB := '[]'::jsonb;
  v_percent INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '28000';
  END IF;

  SELECT * INTO v_attempt
  FROM public.study_mock_attempts
  WHERE id = p_attempt AND user_id = v_user
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attempt not found' USING errcode = '22023';
  END IF;
  IF v_attempt.status <> 'active' THEN
    RAISE EXCEPTION 'This attempt is already submitted' USING errcode = '22023';
  END IF;

  SELECT markdown_content INTO v_json
  FROM public.study_materials
  WHERE id = v_attempt.paper_id AND review_status = 'approved';

  BEGIN
    v_json := coalesce(v_json, '{}')::jsonb;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'Mock paper is not valid JSON' USING errcode = '22023';
  END;

  IF p_answers IS NULL OR jsonb_typeof(p_answers) <> 'object' THEN
    p_answers := '{}'::jsonb;
  END IF;

  FOR v_s, v_s_idx IN
    SELECT value, ordinality FROM jsonb_array_elements(v_json->'sections') WITH ORDINALITY
  LOOP
    CONTINUE WHEN jsonb_typeof(v_s->'questions') <> 'array';
    v_marks := CASE
      WHEN coalesce(v_s->>'marks_per_question', '') ~ '^[0-9]+$'
      THEN (v_s->>'marks_per_question')::int ELSE 1 END;
    v_section_score := 0;
    v_section_max := 0;

    FOR v_q, v_q_idx IN
      SELECT value, ordinality FROM jsonb_array_elements(v_s->'questions') WITH ORDINALITY
    LOOP
      -- Only objective questions are auto-graded.
      CONTINUE WHEN jsonb_typeof(v_q->'options') <> 'array';
      CONTINUE WHEN coalesce(v_q->>'correct_index', '') !~ '^[0-9]+$';
      v_correct := (v_q->>'correct_index')::int;

      v_section_max := v_section_max + v_marks;
      v_max_score := v_max_score + v_marks;

      v_selected_text := p_answers->>((v_s_idx - 1)::text || '-' || (v_q_idx - 1)::text);
      v_selected := CASE
        WHEN v_selected_text ~ '^[0-9]+$' THEN v_selected_text::int
        ELSE -1
      END;

      IF v_selected = v_correct THEN
        v_section_score := v_section_score + v_marks;
        v_score := v_score + v_marks;
      END IF;
    END LOOP;

    v_sections := v_sections || jsonb_build_array(jsonb_build_object(
      'name', coalesce(v_s->>'name', 'Section'),
      'score', v_section_score,
      'max', v_section_max
    ));
  END LOOP;

  v_percent := CASE WHEN v_max_score > 0 THEN round(100.0 * v_score / v_max_score)::int ELSE 0 END;

  UPDATE public.study_mock_attempts
  SET answers = p_answers,
      score = v_score,
      max_score = v_max_score,
      section_scores = v_sections,
      submitted_at = now(),
      status = 'submitted'
  WHERE id = p_attempt;

  RETURN jsonb_build_object(
    'attempt_id', p_attempt,
    'score', v_score,
    'max_score', v_max_score,
    'percent', v_percent,
    'section_scores', v_sections
  );
END;
$$;

REVOKE ALL ON FUNCTION public.study_mock_submit(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.study_mock_submit(UUID, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.study_mock_result(p_attempt UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_attempt public.study_mock_attempts%ROWTYPE;
  v_json JSONB;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '28000';
  END IF;

  SELECT * INTO v_attempt
  FROM public.study_mock_attempts
  WHERE id = p_attempt AND user_id = v_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attempt not found' USING errcode = '22023';
  END IF;
  IF v_attempt.status <> 'submitted' THEN
    RAISE EXCEPTION 'Attempt has not been submitted' USING errcode = '22023';
  END IF;

  SELECT markdown_content INTO v_json FROM public.study_materials WHERE id = v_attempt.paper_id;

  RETURN jsonb_build_object(
    'attempt', to_jsonb(v_attempt),
    'paper', coalesce(v_json, '{}')::jsonb
  );
END;
$$;

REVOKE ALL ON FUNCTION public.study_mock_result(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.study_mock_result(UUID) TO authenticated;

-- ============================================================
-- 6. Exams, weekly goals, My Day, learning report
-- ============================================================

CREATE OR REPLACE FUNCTION public.student_exam_countdown()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_class TEXT := public.study_current_class();
  v_exam public.exam_schedule%ROWTYPE;
  v_total INTEGER;
  v_done INTEGER;
  v_next TEXT;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '28000';
  END IF;

  SELECT * INTO v_exam
  FROM public.exam_schedule
  WHERE class_number = v_class AND exam_date >= current_date
  ORDER BY exam_date ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('exam', NULL);
  END IF;

  v_total := coalesce(jsonb_array_length(v_exam.syllabus), 0);

  SELECT count(*) INTO v_done
  FROM public.study_chapter_progress
  WHERE user_id = v_user
    AND class_number = v_class
    AND subject = v_exam.subject
    AND status = 'completed'
    AND chapter_title IN (SELECT jsonb_array_elements_text(v_exam.syllabus));

  SELECT value INTO v_next
  FROM jsonb_array_elements_text(v_exam.syllabus) AS value
  WHERE value NOT IN (
    SELECT chapter_title FROM public.study_chapter_progress
    WHERE user_id = v_user AND class_number = v_class
      AND subject = v_exam.subject AND status = 'completed'
  )
  LIMIT 1;

  RETURN jsonb_build_object(
    'exam', jsonb_build_object(
      'id', v_exam.id,
      'exam_name', v_exam.exam_name,
      'subject', v_exam.subject,
      'exam_date', v_exam.exam_date,
      'days_left', v_exam.exam_date - current_date,
      'chapters_total', v_total,
      'chapters_done', v_done,
      'next_chapter', v_next,
      'instructions', v_exam.instructions
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.student_exam_countdown() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.student_exam_countdown() TO authenticated;

CREATE OR REPLACE FUNCTION public.study_set_weekly_goal(
  p_subject TEXT DEFAULT '',
  p_chapters INTEGER DEFAULT 0,
  p_practice INTEGER DEFAULT 0,
  p_minutes INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_role TEXT;
  v_subject TEXT := left(trim(coalesce(p_subject, '')), 100);
  v_week DATE := date_trunc('week', now())::date;
  v_row public.study_weekly_goals%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '28000';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_user;
  IF v_role IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'Student access required' USING errcode = '42501';
  END IF;

  IF p_chapters NOT BETWEEN 0 AND 50
     OR p_practice NOT BETWEEN 0 AND 500
     OR p_minutes NOT BETWEEN 0 AND 3000 THEN
    RAISE EXCEPTION 'Goal values are out of range' USING errcode = '22023';
  END IF;

  INSERT INTO public.study_weekly_goals (
    user_id, week_start, subject, target_chapters, target_practice, target_minutes
  ) VALUES (
    v_user, v_week, v_subject, p_chapters, p_practice, p_minutes
  )
  ON CONFLICT (user_id, week_start, subject) DO UPDATE
  SET target_chapters = excluded.target_chapters,
      target_practice = excluded.target_practice,
      target_minutes = excluded.target_minutes,
      updated_at = now()
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

REVOKE ALL ON FUNCTION public.study_set_weekly_goal(TEXT, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.study_set_weekly_goal(TEXT, INTEGER, INTEGER, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.study_week_progress()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_week DATE := date_trunc('week', now())::date;
  v_goals JSONB;
  v_chapters INTEGER;
  v_practice INTEGER;
  v_minutes INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '28000';
  END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(g) ORDER BY g.subject), '[]'::jsonb) INTO v_goals
  FROM public.study_weekly_goals g
  WHERE g.user_id = v_user AND g.week_start = v_week;

  SELECT count(*) INTO v_chapters
  FROM public.study_chapter_progress
  WHERE user_id = v_user AND status = 'completed' AND completed_at >= v_week;

  SELECT count(*) INTO v_practice
  FROM public.study_practice_attempts
  WHERE user_id = v_user AND created_at >= v_week;

  SELECT coalesce(sum(duration_seconds), 0) / 60 INTO v_minutes
  FROM public.study_sessions
  WHERE user_id = v_user AND coalesce(ended_at, started_at) >= v_week;

  RETURN jsonb_build_object(
    'week_start', v_week,
    'goals', v_goals,
    'actuals', jsonb_build_object(
      'chapters', v_chapters,
      'practice', v_practice,
      'minutes', v_minutes
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.study_week_progress() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.study_week_progress() TO authenticated;

CREATE OR REPLACE FUNCTION public.student_today()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_class TEXT := public.study_current_class();
  v_items JSONB := '[]'::jsonb;
  v_due INTEGER;
  v_exam public.exam_schedule%ROWTYPE;
  v_exam_total INTEGER;
  v_exam_done INTEGER;
  v_prog public.study_chapter_progress%ROWTYPE;
  v_weak_subject TEXT;
  v_weak_chapter TEXT;
  v_weak_accuracy INTEGER;
  v_ra_title TEXT;
  v_ra_due DATE;
  v_book_title TEXT;
  v_book_due DATE;
  v_book_days INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '28000';
  END IF;

  -- Flashcards due
  SELECT count(*) INTO v_due
  FROM public.study_flashcards
  WHERE user_id = v_user AND NOT suspended AND due_at <= now();
  IF v_due > 0 THEN
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'kind', 'flashcards',
      'priority', 1,
      'title', v_due || ' flashcard' || CASE WHEN v_due = 1 THEN '' ELSE 's' END || ' due',
      'detail', 'Review now to keep them in long-term memory',
      'cta_tab', 'study-resources',
      'cta_params', jsonb_build_object('studyTab', 'revise'),
      'due_at', now()
    ));
  END IF;

  -- Next exam
  SELECT * INTO v_exam
  FROM public.exam_schedule
  WHERE class_number = v_class AND exam_date >= current_date
  ORDER BY exam_date ASC LIMIT 1;

  IF FOUND THEN
    v_exam_total := coalesce(jsonb_array_length(v_exam.syllabus), 0);
    SELECT count(*) INTO v_exam_done
    FROM public.study_chapter_progress
    WHERE user_id = v_user AND class_number = v_class
      AND subject = v_exam.subject AND status = 'completed'
      AND chapter_title IN (SELECT jsonb_array_elements_text(v_exam.syllabus));
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'kind', 'exam',
      'priority', CASE WHEN v_exam.exam_date - current_date <= 7 THEN 0 ELSE 2 END,
      'title', v_exam.exam_name || ' in ' || (v_exam.exam_date - current_date) || ' days',
      'detail', v_exam.subject || ' · ' || v_exam_done || ' of ' || v_exam_total || ' syllabus chapters done',
      'cta_tab', 'study-resources',
      'cta_params', jsonb_build_object('classNumber', v_class, 'subject', v_exam.subject),
      'due_at', v_exam.exam_date
    ));
  END IF;

  -- Continue the chapter already in progress
  SELECT * INTO v_prog
  FROM public.study_chapter_progress
  WHERE user_id = v_user AND status IN ('in_progress', 'needs_revision')
  ORDER BY updated_at DESC LIMIT 1;

  IF FOUND THEN
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'kind', 'chapter',
      'priority', 3,
      'title', 'Continue ' || v_prog.chapter_title,
      'detail', v_prog.subject || ' · ' || CASE WHEN v_prog.status = 'needs_revision' THEN 'marked for revision' ELSE 'in progress' END,
      'cta_tab', 'study-resources',
      'cta_params', jsonb_build_object(
        'classNumber', v_prog.class_number,
        'subject', v_prog.subject,
        'chapterTitle', v_prog.chapter_title
      ),
      'due_at', v_prog.updated_at
    ));
  END IF;

  -- Weakest practised chapter
  SELECT subject, chapter_title, accuracy
    INTO v_weak_subject, v_weak_chapter, v_weak_accuracy
  FROM (
    SELECT subject, chapter_title,
           round(100.0 * sum(CASE WHEN is_correct THEN 1 ELSE 0 END) / count(*))::int AS accuracy,
           count(*) AS attempts
    FROM public.study_practice_attempts
    WHERE user_id = v_user
    GROUP BY subject, chapter_title
  ) t
  WHERE attempts >= 5 AND accuracy < 60
  ORDER BY accuracy ASC
  LIMIT 1;

  IF v_weak_chapter IS NOT NULL THEN
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'kind', 'weak_topic',
      'priority', 4,
      'title', 'Practise ' || v_weak_chapter,
      'detail', v_weak_subject || ' · ' || v_weak_accuracy || '% accuracy so far',
      'cta_tab', 'study-resources',
      'cta_params', jsonb_build_object('subject', v_weak_subject, 'chapterTitle', v_weak_chapter),
      'due_at', now()
    ));
  END IF;

  -- Reading assignment due soon
  SELECT ra.title, ra.due_date INTO v_ra_title, v_ra_due
  FROM public.reading_assignments ra
  WHERE ra.status = 'published'
    AND ra.class_level = v_class
    AND ra.due_date IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.reading_assignment_progress p
      WHERE p.assignment_id = ra.id AND p.user_id = v_user AND p.completed_at IS NOT NULL
    )
  ORDER BY ra.due_date ASC
  LIMIT 1;

  IF v_ra_title IS NOT NULL THEN
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'kind', 'reading_assignment',
      'priority', CASE WHEN v_ra_due - current_date <= 2 THEN 1 ELSE 3 END,
      'title', v_ra_title,
      'detail', CASE
        WHEN v_ra_due < current_date THEN 'Reading assignment overdue'
        WHEN v_ra_due = current_date THEN 'Reading assignment due today'
        ELSE 'Reading assignment due in ' || (v_ra_due - current_date) || ' days'
      END,
      'cta_tab', 'issued',
      'cta_params', jsonb_build_object(),
      'due_at', v_ra_due
    ));
  END IF;

  -- Library book due soon
  SELECT b.title, bi.due_date INTO v_book_title, v_book_due
  FROM public.book_issues bi
  JOIN public.books b ON b.id = bi.book_id
  WHERE bi.user_id = v_user AND bi.status = 'issued' AND bi.due_date IS NOT NULL
  ORDER BY bi.due_date ASC
  LIMIT 1;

  IF v_book_title IS NOT NULL THEN
    v_book_days := v_book_due - current_date;
    IF v_book_days <= 7 THEN
      v_items := v_items || jsonb_build_array(jsonb_build_object(
        'kind', 'book_due',
        'priority', CASE WHEN v_book_days < 0 THEN 0 ELSE 2 END,
        'title', 'Return ' || v_book_title,
        'detail', CASE
          WHEN v_book_days < 0 THEN 'Overdue by ' || abs(v_book_days) || ' days'
          WHEN v_book_days = 0 THEN 'Due today'
          ELSE 'Due in ' || v_book_days || ' days'
        END,
        'cta_tab', 'issued',
        'cta_params', jsonb_build_object(),
        'due_at', v_book_due
      ));
    END IF;
  END IF;

  SELECT coalesce(jsonb_agg(item), '[]'::jsonb) INTO v_items
  FROM (
    SELECT item
    FROM jsonb_array_elements(v_items) AS item
    ORDER BY (item->>'priority')::int, item->>'due_at' NULLS LAST
    LIMIT 8
  ) t;

  RETURN jsonb_build_object('items', v_items, 'generated_at', now());
END;
$$;

REVOKE ALL ON FUNCTION public.student_today() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.student_today() TO authenticated;

CREATE OR REPLACE FUNCTION public.student_learning_report(
  p_from DATE DEFAULT NULL,
  p_to DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_from DATE := coalesce(p_from, date_trunc('month', current_date)::date);
  v_to DATE := coalesce(p_to, current_date);
  v_minutes INTEGER;
  v_sessions INTEGER;
  v_chapters INTEGER;
  v_attempts INTEGER;
  v_correct INTEGER;
  v_reviews INTEGER;
  v_cards INTEGER;
  v_mocks INTEGER;
  v_best_mock INTEGER;
  v_books INTEGER;
  v_points INTEGER;
  v_daily JSONB;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '28000';
  END IF;
  IF v_from > v_to THEN
    RAISE EXCEPTION 'Start date must be before end date' USING errcode = '22023';
  END IF;
  IF v_to - v_from > 366 THEN
    RAISE EXCEPTION 'Report range cannot exceed one year' USING errcode = '22023';
  END IF;

  SELECT coalesce(sum(duration_seconds), 0) / 60, count(*)
    INTO v_minutes, v_sessions
  FROM public.study_sessions
  WHERE user_id = v_user
    AND coalesce(ended_at, started_at)::date BETWEEN v_from AND v_to;

  SELECT count(*) INTO v_chapters
  FROM public.study_chapter_progress
  WHERE user_id = v_user AND status = 'completed'
    AND completed_at::date BETWEEN v_from AND v_to;

  SELECT count(*), coalesce(sum(CASE WHEN is_correct THEN 1 ELSE 0 END), 0)
    INTO v_attempts, v_correct
  FROM public.study_practice_attempts
  WHERE user_id = v_user AND created_at::date BETWEEN v_from AND v_to;

  SELECT count(*), count(DISTINCT card_id)
    INTO v_reviews, v_cards
  FROM public.study_flashcard_reviews
  WHERE user_id = v_user AND reviewed_at::date BETWEEN v_from AND v_to;

  SELECT count(*), coalesce(max(CASE WHEN max_score > 0 THEN round(100.0 * score / max_score)::int ELSE 0 END), 0)
    INTO v_mocks, v_best_mock
  FROM public.study_mock_attempts
  WHERE user_id = v_user AND status = 'submitted'
    AND submitted_at::date BETWEEN v_from AND v_to;

  SELECT count(*) INTO v_books
  FROM public.reading_history
  WHERE user_id = v_user AND status = 'approved'
    AND completed_date BETWEEN v_from AND v_to;

  SELECT coalesce(sum(delta), 0) INTO v_points
  FROM public.point_transactions
  WHERE user_id = v_user AND delta > 0
    AND created_at::date BETWEEN v_from AND v_to;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'date', d.day::date,
    'minutes', coalesce((
      SELECT sum(s.duration_seconds) / 60 FROM public.study_sessions s
      WHERE s.user_id = v_user AND coalesce(s.ended_at, s.started_at)::date = d.day::date
    ), 0),
    'practice', coalesce((
      SELECT count(*) FROM public.study_practice_attempts a
      WHERE a.user_id = v_user AND a.created_at::date = d.day::date
    ), 0),
    'reviews', coalesce((
      SELECT count(*) FROM public.study_flashcard_reviews r
      WHERE r.user_id = v_user AND r.reviewed_at::date = d.day::date
    ), 0)
  ) ORDER BY d.day), '[]'::jsonb)
  INTO v_daily
  FROM generate_series(v_from, v_to, interval '1 day') AS d(day);

  RETURN jsonb_build_object(
    'from', v_from,
    'to', v_to,
    'study_minutes', v_minutes,
    'study_sessions', v_sessions,
    'chapters_completed', v_chapters,
    'practice_attempts', v_attempts,
    'practice_correct', v_correct,
    'practice_accuracy', CASE WHEN v_attempts > 0 THEN round(100.0 * v_correct / v_attempts)::int ELSE 0 END,
    'flashcard_reviews', v_reviews,
    'flashcards_practised', v_cards,
    'mock_attempts', v_mocks,
    'best_mock_percent', v_best_mock,
    'books_read', v_books,
    'points_earned', v_points,
    'daily', v_daily
  );
END;
$$;

REVOKE ALL ON FUNCTION public.student_learning_report(DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.student_learning_report(DATE, DATE) TO authenticated;

-- ============================================================
-- 7. Lightweight learning analytics
-- ============================================================

CREATE OR REPLACE FUNCTION public.study_log_event(
  p_event TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RETURN;
  END IF;
  IF p_event IS NULL OR char_length(trim(p_event)) = 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.learning_events (user_id, event, entity_type, entity_id, metadata)
  VALUES (
    v_user,
    left(trim(p_event), 60),
    left(nullif(trim(coalesce(p_entity_type, '')), ''), 40),
    left(nullif(trim(coalesce(p_entity_id, '')), ''), 80),
    CASE WHEN p_metadata IS NULL OR jsonb_typeof(p_metadata) <> 'object' THEN '{}'::jsonb ELSE p_metadata END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.study_log_event(TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.study_log_event(TEXT, TEXT, TEXT, JSONB) TO authenticated;
