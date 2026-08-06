-- Feature pack: event deadlines, study sessions, review/issue/return points

-- ========== EVENTS: separate registration & submission deadlines ==========
ALTER TABLE public.library_events
  ADD COLUMN IF NOT EXISTS registration_deadline timestamptz;

ALTER TABLE public.library_events
  ADD COLUMN IF NOT EXISTS submission_deadline timestamptz;

-- ========== STUDY SESSIONS (Pomodoro / tracker) ==========
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  material_id uuid REFERENCES public.study_materials(id) ON DELETE SET NULL,
  material_title text,
  duration_seconds integer NOT NULL CHECK (duration_seconds > 0),
  points_earned integer NOT NULL DEFAULT 0,
  session_type text NOT NULL DEFAULT 'pomodoro'
    CHECK (session_type IN ('pomodoro', 'focus', 'break')),
  notes text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user ON public.study_sessions(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_sessions TO authenticated;
GRANT ALL ON public.study_sessions TO service_role;

ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study sessions own" ON public.study_sessions;
CREATE POLICY "study sessions own" ON public.study_sessions
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid());

-- Points settings seeds
INSERT INTO public.system_settings (key, value) VALUES
  ('points_per_review', '15'::jsonb),
  ('points_per_issue', '100'::jsonb),
  ('points_per_timely_return', '100'::jsonb),
  ('points_per_study_minute', '1'::jsonb),
  ('study_pomodoro_minutes', '25'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ========== BOOK REVIEW POINTS ==========
CREATE OR REPLACE FUNCTION public.award_review_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pts integer := 15;
BEGIN
  BEGIN
    SELECT COALESCE((value #>> '{}')::integer, (value)::text::integer, 15)
    INTO v_pts FROM public.system_settings WHERE key = 'points_per_review';
  EXCEPTION WHEN OTHERS THEN
    v_pts := 15;
  END;
  v_pts := COALESCE(v_pts, 15);
  IF v_pts > 0 THEN
    UPDATE public.profiles
    SET points = COALESCE(points, 0) + v_pts
    WHERE id = NEW.user_id;
    PERFORM public.notify_user(
      NEW.user_id,
      'Review points awarded',
      format('Thanks for your book review! +%s points.', v_pts),
      'points'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_review_points ON public.book_reviews;
CREATE TRIGGER trg_award_review_points
  AFTER INSERT ON public.book_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.award_review_points();

-- ========== ISSUE + TIMELY RETURN POINTS ==========
ALTER TABLE public.book_issues
  ADD COLUMN IF NOT EXISTS issue_points_awarded boolean NOT NULL DEFAULT false;

ALTER TABLE public.book_issues
  ADD COLUMN IF NOT EXISTS return_points_awarded boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.award_issue_return_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_issue_pts integer := 100;
  v_return_pts integer := 100;
BEGIN
  -- On new issue
  IF TG_OP = 'INSERT' AND NEW.status = 'issued' AND NOT NEW.issue_points_awarded THEN
    BEGIN
      SELECT COALESCE((value #>> '{}')::integer, (value)::text::integer, 100)
      INTO v_issue_pts FROM public.system_settings WHERE key = 'points_per_issue';
    EXCEPTION WHEN OTHERS THEN v_issue_pts := 100; END;
    v_issue_pts := COALESCE(v_issue_pts, 100);
    IF v_issue_pts > 0 THEN
      UPDATE public.profiles SET points = COALESCE(points, 0) + v_issue_pts WHERE id = NEW.user_id;
      NEW.issue_points_awarded := true;
      PERFORM public.notify_user(
        NEW.user_id,
        'Book issued — points!',
        format('You borrowed a book. +%s points.', v_issue_pts),
        'points'
      );
    END IF;
  END IF;

  -- On timely return
  IF TG_OP = 'UPDATE'
     AND NEW.status = 'returned'
     AND (OLD.status IS DISTINCT FROM 'returned')
     AND NOT COALESCE(NEW.return_points_awarded, false)
     AND NEW.due_date IS NOT NULL
     AND COALESCE(NEW.return_date::date, CURRENT_DATE) <= NEW.due_date::date
  THEN
    BEGIN
      SELECT COALESCE((value #>> '{}')::integer, (value)::text::integer, 100)
      INTO v_return_pts FROM public.system_settings WHERE key = 'points_per_timely_return';
    EXCEPTION WHEN OTHERS THEN v_return_pts := 100; END;
    v_return_pts := COALESCE(v_return_pts, 100);
    IF v_return_pts > 0 THEN
      UPDATE public.profiles SET points = COALESCE(points, 0) + v_return_pts WHERE id = NEW.user_id;
      NEW.return_points_awarded := true;
      PERFORM public.notify_user(
        NEW.user_id,
        'Timely return — points!',
        format('Thanks for returning on time. +%s points.', v_return_pts),
        'points'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_issue_return_points ON public.book_issues;
CREATE TRIGGER trg_award_issue_return_points
  BEFORE INSERT OR UPDATE ON public.book_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.award_issue_return_points();

-- Award study points helper (called from client after session ends)
CREATE OR REPLACE FUNCTION public.complete_study_session(
  p_session_id uuid,
  p_duration_seconds integer,
  p_material_id uuid DEFAULT NULL,
  p_material_title text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_per_min integer := 1;
  v_pts integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO r FROM public.study_sessions WHERE id = p_session_id AND user_id = auth.uid();
  IF r IS NULL THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF r.ended_at IS NOT NULL THEN RETURN r.points_earned; END IF;

  BEGIN
    SELECT COALESCE((value #>> '{}')::integer, (value)::text::integer, 1)
    INTO v_per_min FROM public.system_settings WHERE key = 'points_per_study_minute';
  EXCEPTION WHEN OTHERS THEN v_per_min := 1; END;
  v_per_min := COALESCE(v_per_min, 1);

  v_pts := GREATEST(0, (GREATEST(p_duration_seconds, 0) / 60) * v_per_min);

  -- Breaks earn no study XP
  IF r.session_type = 'break' THEN
    v_pts := 0;
  END IF;

  UPDATE public.study_sessions SET
    duration_seconds = GREATEST(p_duration_seconds, 1),
    points_earned = v_pts,
    material_id = COALESCE(p_material_id, material_id),
    material_title = COALESCE(p_material_title, material_title),
    notes = COALESCE(p_notes, notes),
    ended_at = now()
  WHERE id = p_session_id;

  IF v_pts > 0 THEN
    UPDATE public.profiles SET points = COALESCE(points, 0) + v_pts WHERE id = auth.uid();
  END IF;

  RETURN v_pts;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_study_session(uuid, integer, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_study_session(uuid, integer, uuid, text, text) TO authenticated;
