-- ============ COLUMNS ============
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS is_book_of_the_week boolean NOT NULL DEFAULT false;
ALTER TABLE public.book_reviews ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT true;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS poll_ends_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS library_card_barcode text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS community_warn_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS community_blocked_until timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS currently_reading jsonb;

-- ============ user_feedback ============
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  full_name text,
  email text,
  category text NOT NULL DEFAULT 'suggestion',
  area text,
  urgency text NOT NULL DEFAULT 'low',
  reference_id text,
  allow_follow_up boolean NOT NULL DEFAULT true,
  rating integer NOT NULL DEFAULT 5,
  subject text NOT NULL,
  feedback_text text,
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_feedback TO authenticated;
GRANT INSERT ON public.user_feedback TO anon;
GRANT ALL ON public.user_feedback TO service_role;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.user_feedback;
CREATE POLICY "Anyone can submit feedback" ON public.user_feedback FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Staff can read feedback" ON public.user_feedback;
CREATE POLICY "Staff can read feedback" ON public.user_feedback FOR SELECT TO authenticated USING (public.is_staff_or_admin(auth.uid()));
DROP POLICY IF EXISTS "Staff can update feedback" ON public.user_feedback;
CREATE POLICY "Staff can update feedback" ON public.user_feedback FOR UPDATE TO authenticated USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));
DROP POLICY IF EXISTS "Staff can delete feedback" ON public.user_feedback;
CREATE POLICY "Staff can delete feedback" ON public.user_feedback FOR DELETE TO authenticated USING (public.is_staff_or_admin(auth.uid()));

-- ============ community_reports ============
CREATE TABLE IF NOT EXISTS public.community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  reporter_id uuid,
  reason text NOT NULL DEFAULT 'inappropriate',
  details text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_reports TO authenticated;
GRANT ALL ON public.community_reports TO service_role;
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can report posts" ON public.community_reports;
CREATE POLICY "Users can report posts" ON public.community_reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
DROP POLICY IF EXISTS "Staff can read reports" ON public.community_reports;
CREATE POLICY "Staff can read reports" ON public.community_reports FOR SELECT TO authenticated USING (public.is_staff_or_admin(auth.uid()));
DROP POLICY IF EXISTS "Staff can update reports" ON public.community_reports;
CREATE POLICY "Staff can update reports" ON public.community_reports FOR UPDATE TO authenticated USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));
DROP POLICY IF EXISTS "Staff can delete reports" ON public.community_reports;
CREATE POLICY "Staff can delete reports" ON public.community_reports FOR DELETE TO authenticated USING (public.is_staff_or_admin(auth.uid()));

-- ============ class_competitions ============
CREATE TABLE IF NOT EXISTS public.class_competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  class_a text NOT NULL,
  class_b text NOT NULL,
  metric text NOT NULL DEFAULT 'points',
  status text NOT NULL DEFAULT 'active',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_competitions TO authenticated;
GRANT ALL ON public.class_competitions TO service_role;
ALTER TABLE public.class_competitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Signed-in users can view competitions" ON public.class_competitions;
CREATE POLICY "Signed-in users can view competitions" ON public.class_competitions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Staff manage competitions" ON public.class_competitions;
CREATE POLICY "Staff manage competitions" ON public.class_competitions FOR ALL TO authenticated USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- ============ quiz_sessions ============
CREATE TABLE IF NOT EXISTS public.quiz_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  host_id uuid,
  room_code text,
  status text NOT NULL DEFAULT 'waiting',
  current_question_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_sessions TO authenticated;
GRANT ALL ON public.quiz_sessions TO service_role;
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Signed-in users can view quiz sessions" ON public.quiz_sessions;
CREATE POLICY "Signed-in users can view quiz sessions" ON public.quiz_sessions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can host quiz sessions" ON public.quiz_sessions;
CREATE POLICY "Users can host quiz sessions" ON public.quiz_sessions FOR INSERT TO authenticated WITH CHECK (host_id = auth.uid());
DROP POLICY IF EXISTS "Hosts and staff can update sessions" ON public.quiz_sessions;
CREATE POLICY "Hosts and staff can update sessions" ON public.quiz_sessions FOR UPDATE TO authenticated USING (host_id = auth.uid() OR public.is_staff_or_admin(auth.uid())) WITH CHECK (host_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
DROP POLICY IF EXISTS "Hosts and staff can delete sessions" ON public.quiz_sessions;
CREATE POLICY "Hosts and staff can delete sessions" ON public.quiz_sessions FOR DELETE TO authenticated USING (host_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

CREATE TRIGGER user_feedback_set_updated_at BEFORE UPDATE ON public.user_feedback FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER community_reports_set_updated_at BEFORE UPDATE ON public.community_reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER class_competitions_set_updated_at BEFORE UPDATE ON public.class_competitions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER quiz_sessions_set_updated_at BEFORE UPDATE ON public.quiz_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.get_game_analytics()
RETURNS TABLE(game_key text, plays bigint, wins bigint, xp_awarded bigint, total_time bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT gp.game_key,
         count(*)::bigint,
         count(*) FILTER (WHERE gp.is_win)::bigint,
         coalesce(sum(gp.points_earned),0)::bigint,
         coalesce(sum(gp.duration_seconds),0)::bigint
  FROM public.game_plays gp
  WHERE public.is_staff_or_admin(auth.uid())
  GROUP BY gp.game_key
$$;
REVOKE ALL ON FUNCTION public.get_game_analytics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_game_analytics() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_database_size()
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.is_staff_or_admin(auth.uid()) THEN pg_database_size(current_database()) ELSE 0 END
$$;
REVOKE ALL ON FUNCTION public.get_database_size() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_database_size() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_storage_size()
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.is_staff_or_admin(auth.uid())
    THEN coalesce((SELECT sum((o.metadata->>'size')::bigint) FROM storage.objects o), 0)
    ELSE 0 END
$$;
REVOKE ALL ON FUNCTION public.get_storage_size() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_storage_size() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_student_reading_velocity(p_user_id uuid)
RETURNS TABLE(books_last_30 integer, books_prev_30 integer, change_pct numeric, velocity_label text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE a integer; b integer; pct numeric;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  SELECT count(*) INTO a FROM public.reading_history rh
    WHERE rh.user_id = p_user_id AND rh.completed_date >= CURRENT_DATE - 30;
  SELECT count(*) INTO b FROM public.reading_history rh
    WHERE rh.user_id = p_user_id AND rh.completed_date >= CURRENT_DATE - 60 AND rh.completed_date < CURRENT_DATE - 30;
  pct := CASE WHEN b = 0 THEN CASE WHEN a > 0 THEN 100 ELSE 0 END ELSE round(((a - b)::numeric / b) * 100, 1) END;
  RETURN QUERY SELECT a, b, pct,
    CASE WHEN a = 0 AND b = 0 THEN 'Getting Started'
         WHEN pct >= 50 THEN 'Accelerating'
         WHEN pct > 0 THEN 'Rising'
         WHEN pct = 0 THEN 'Steady'
         ELSE 'Slowing' END;
END;
$$;
REVOKE ALL ON FUNCTION public.get_student_reading_velocity(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_student_reading_velocity(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.search_books(
  search_query text,
  p_category text DEFAULT NULL,
  p_subject text DEFAULT NULL,
  p_class_level text DEFAULT NULL,
  p_language text DEFAULT NULL,
  p_author text DEFAULT NULL,
  p_availability text DEFAULT 'all',
  p_sort_by text DEFAULT 'newest',
  p_limit integer DEFAULT 1000
)
RETURNS TABLE(
  id uuid, title text, author text, category text, subject text, class_level text,
  language text, cover_url text, total_copies integer, available_copies integer,
  first_added_at timestamptz, created_at timestamptz, accession_number text,
  issue_count integer, shelf_number text, cupboard_number text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.id, b.title, b.author, b.category, b.subject, b.class_level, b.language,
         b.cover_url, b.total_copies, b.available_copies, b.first_added_at, b.created_at,
         b.accession_number, b.issue_count, b.shelf_number, b.cupboard_number
  FROM public.books b
  WHERE b.total_copies > 0
    AND (
      search_query IS NULL OR search_query = '' OR
      b.title ILIKE '%' || search_query || '%' OR
      b.author ILIKE '%' || search_query || '%' OR
      b.accession_number ILIKE '%' || search_query || '%' OR
      EXISTS (SELECT 1 FROM unnest(b.accession_numbers) an WHERE an ILIKE '%' || search_query || '%')
    )
    AND (p_category IS NULL OR b.category = p_category)
    AND (p_subject IS NULL OR b.subject = p_subject)
    AND (p_class_level IS NULL OR b.class_level = p_class_level)
    AND (p_language IS NULL OR b.language = p_language)
    AND (p_author IS NULL OR b.author = p_author)
    AND (p_availability <> 'available' OR b.available_copies > 0)
    AND (p_availability <> 'new' OR coalesce(b.first_added_at, b.created_at) >= now() - interval '30 days')
  ORDER BY
    CASE WHEN p_sort_by = 'most_borrowed' THEN b.issue_count END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'title_az' THEN b.title END ASC NULLS LAST,
    CASE WHEN p_sort_by IN ('newest','most_recommended') THEN coalesce(b.first_added_at, b.created_at) END DESC NULLS LAST,
    b.title ASC
  LIMIT coalesce(p_limit, 1000)
$$;
REVOKE ALL ON FUNCTION public.search_books(text,text,text,text,text,text,text,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_books(text,text,text,text,text,text,text,text,integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_portfolio_data(target_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'booksRead', (SELECT count(*) FROM public.reading_history rh WHERE rh.user_id = target_user_id),
    'quizzesPassed', (SELECT count(*) FROM public.quiz_results qr WHERE qr.user_id = target_user_id),
    'points', (SELECT coalesce(p.points,0) FROM public.profiles p WHERE p.id = target_user_id),
    'badges', (SELECT count(*) FROM public.badge_awards ba WHERE ba.user_id = target_user_id),
    'goalsCompleted', 0,
    'monthlyRead', (SELECT count(*) FROM public.reading_history rh WHERE rh.user_id = target_user_id AND rh.completed_date >= date_trunc('month', CURRENT_DATE)),
    'streak', (SELECT coalesce(ls.current_streak,0) FROM public.login_streaks ls WHERE ls.user_id = target_user_id),
    'classRank', (
      SELECT rnk::text FROM (
        SELECT p.id, rank() OVER (ORDER BY p.points DESC) AS rnk
        FROM public.profiles p
        WHERE p.student_class = (SELECT student_class FROM public.profiles WHERE id = target_user_id)
      ) r WHERE r.id = target_user_id
    ),
    'activityLog', coalesce((
      SELECT jsonb_agg(x) FROM (
        SELECT rh.completed_date AS date, rh.book_title AS title, 'reading' AS type
        FROM public.reading_history rh WHERE rh.user_id = target_user_id
        ORDER BY rh.completed_date DESC LIMIT 10
      ) x), '[]'::jsonb),
    'milestones', coalesce((
      SELECT jsonb_agg(m) FROM (
        SELECT 'badge' AS type, b.name AS title, coalesce(b.description,'') AS description
        FROM public.badge_awards ba JOIN public.badges b ON b.id = ba.badge_id
        WHERE ba.user_id = target_user_id
        ORDER BY ba.awarded_at DESC LIMIT 6
      ) m), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_public_portfolio_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_portfolio_data(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.reset_monthly_leaderboard()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE snapshot jsonb; n integer;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  SELECT coalesce(jsonb_agg(x), '[]'::jsonb), count(*) INTO snapshot, n FROM (
    SELECT p.id, p.first_name, p.last_name, p.student_class, p.points
    FROM public.profiles p WHERE p.role = 'student' ORDER BY p.points DESC LIMIT 200
  ) x;
  INSERT INTO public.system_settings(key, value, updated_at)
  VALUES ('leaderboard_archive_' || to_char(now(), 'YYYY_MM'), snapshot, now())
  ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = now();
  INSERT INTO public.system_settings(key, value, updated_at)
  VALUES ('leaderboard_last_reset', to_jsonb(now()), now())
  ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = now();
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.reset_monthly_leaderboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_monthly_leaderboard() TO authenticated;