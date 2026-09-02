-- ============================================================
-- Consolidated Migration: Schema Additions & Database RPCs
-- Date: 2026-09-02
-- Covers missing tables (user_feedback, class_competitions, quiz_sessions, quiz_session_players),
-- missing table columns (profiles, books, posts, book_reviews),
-- and missing RPC functions (analytics, leaderboard, storage/db size, FTS search, public portfolio).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Table Additions
-- ------------------------------------------------------------

-- Table: user_feedback
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text text NOT NULL,
  category text DEFAULT 'general',
  subject text,
  urgency text DEFAULT 'low' CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  area text,
  reference_id text,
  allow_follow_up boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public feedback submission" ON public.user_feedback;
CREATE POLICY "Allow public feedback submission" ON public.user_feedback FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow admin to read all feedback" ON public.user_feedback;
CREATE POLICY "Allow admin to read all feedback" ON public.user_feedback FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Allow admin to delete feedback" ON public.user_feedback;
CREATE POLICY "Allow admin to delete feedback" ON public.user_feedback FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Allow own user to read own feedback" ON public.user_feedback;
CREATE POLICY "Allow own user to read own feedback" ON public.user_feedback FOR SELECT TO authenticated USING (user_id = auth.uid());


-- Table: class_competitions
CREATE TABLE IF NOT EXISTS public.class_competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  class_a text NOT NULL,
  class_b text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  metric text NOT NULL DEFAULT 'books_read' CHECK (metric IN ('books_read', 'quiz_score', 'points_earned')),
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
  winner_class text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.class_competitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone views competitions" ON public.class_competitions;
CREATE POLICY "Everyone views competitions" ON public.class_competitions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage competitions" ON public.class_competitions;
CREATE POLICY "Admins manage competitions" ON public.class_competitions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);


-- Table: quiz_sessions
CREATE TABLE IF NOT EXISTS public.quiz_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  host_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  room_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'completed', 'active', 'finished')),
  current_question_index int NOT NULL DEFAULT 0,
  max_players int NOT NULL DEFAULT 10,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quiz_session_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.quiz_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  display_name text NOT NULL,
  score int NOT NULL DEFAULT 0,
  answers jsonb DEFAULT '[]'::jsonb,
  is_ready boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_session_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone views sessions" ON public.quiz_sessions;
CREATE POLICY "Everyone views sessions" ON public.quiz_sessions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated create sessions" ON public.quiz_sessions;
CREATE POLICY "Authenticated create sessions" ON public.quiz_sessions FOR INSERT WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "Host updates sessions" ON public.quiz_sessions;
CREATE POLICY "Host updates sessions" ON public.quiz_sessions FOR UPDATE USING (auth.uid() = host_id);

DROP POLICY IF EXISTS "Everyone views players" ON public.quiz_session_players;
CREATE POLICY "Everyone views players" ON public.quiz_session_players FOR SELECT USING (true);

DROP POLICY IF EXISTS "Players manage own record" ON public.quiz_session_players;
CREATE POLICY "Players manage own record" ON public.quiz_session_players FOR ALL USING (auth.uid() = user_id);


-- ------------------------------------------------------------
-- 2. Column Additions
-- ------------------------------------------------------------

-- profiles columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS library_card_barcode text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS community_blocked_until timestamptz DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS community_warn_count integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS currently_reading jsonb DEFAULT NULL;

-- books column
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS is_book_of_the_week boolean DEFAULT false;

-- posts column
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS poll_ends_at timestamptz DEFAULT NULL;

-- book_reviews column
ALTER TABLE public.book_reviews ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT true;


-- ------------------------------------------------------------
-- 3. Stored Procedures (RPCs)
-- ------------------------------------------------------------

-- RPC: get_game_analytics
CREATE OR REPLACE FUNCTION public.get_game_analytics()
RETURNS TABLE (
  game_key text,
  plays bigint,
  wins bigint,
  xp_awarded bigint,
  total_time bigint
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gp.game_key,
    COUNT(gp.id) as plays,
    COUNT(gp.id) FILTER (WHERE gp.is_win) as wins,
    COALESCE(SUM(gp.points_earned), 0) as xp_awarded,
    COALESCE(SUM(gp.duration_seconds), 0) as total_time
  FROM game_plays gp
  GROUP BY gp.game_key;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_game_analytics TO authenticated, anon;

-- RPC: get_database_size
CREATE OR REPLACE FUNCTION public.get_database_size()
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN pg_database_size(current_database());
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_database_size TO authenticated, anon;

-- RPC: get_storage_size
CREATE OR REPLACE FUNCTION public.get_storage_size()
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  total_size bigint;
BEGIN
  SELECT SUM((metadata->>'size')::bigint) INTO total_size FROM storage.objects;
  RETURN COALESCE(total_size, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_storage_size TO authenticated, anon;

-- RPC: reset_monthly_leaderboard
CREATE OR REPLACE FUNCTION public.reset_monthly_leaderboard()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  month_key text := to_char(now() - interval '1 day', 'YYYY-MM');
BEGIN
  INSERT INTO public.monthly_leaderboard_history (month, user_id, rank, monthly_points)
  SELECT 
    month_key,
    id,
    ROW_NUMBER() OVER (ORDER BY monthly_points DESC),
    monthly_points
  FROM public.profiles
  WHERE role = 'student' AND monthly_points > 0;
  
  UPDATE public.profiles SET monthly_points = 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_monthly_leaderboard TO authenticated, anon;

-- RPC: search_books
CREATE OR REPLACE FUNCTION public.search_books(
  search_query text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_subject text DEFAULT NULL,
  p_class_level text DEFAULT NULL,
  p_language text DEFAULT NULL,
  p_author text DEFAULT NULL,
  p_availability text DEFAULT 'all',
  p_sort_by text DEFAULT 'newest',
  p_limit int DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  title text,
  author text,
  category text,
  subject text,
  class_level text,
  language text,
  cover_url text,
  total_copies int,
  available_copies int,
  first_added_at timestamptz,
  created_at timestamptz,
  accession_number text,
  issue_count int,
  shelf_number text,
  cupboard_number text,
  rank real
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    b.id, b.title, b.author, b.category, b.subject, b.class_level,
    b.language, b.cover_url, b.total_copies, b.available_copies,
    b.first_added_at, b.created_at, b.accession_number, b.issue_count,
    b.shelf_number, b.cupboard_number,
    CASE
      WHEN search_query IS NOT NULL AND search_query <> ''
      THEN ts_rank(
        to_tsvector('english',
          coalesce(b.title, '') || ' ' ||
          coalesce(b.author, '') || ' ' ||
          coalesce(b.subject, '') || ' ' ||
          coalesce(b.category, '') || ' ' ||
          coalesce(b.description, '') || ' ' ||
          coalesce(b.accession_number, '')
        ),
        plainto_tsquery('english', search_query)
      )
      ELSE 0.0
    END AS rank
  FROM books b
  WHERE b.total_copies > 0
    AND (
      search_query IS NULL OR search_query = '' OR
      to_tsvector('english',
        coalesce(b.title, '') || ' ' ||
        coalesce(b.author, '') || ' ' ||
        coalesce(b.subject, '') || ' ' ||
        coalesce(b.category, '') || ' ' ||
        coalesce(b.description, '') || ' ' ||
        coalesce(b.accession_number, '')
      ) @@ plainto_tsquery('english', search_query) OR
      b.title ILIKE '%' || search_query || '%' OR
      b.author ILIKE '%' || search_query || '%' OR
      b.accession_number ILIKE '%' || search_query || '%'
    )
    AND (p_category IS NULL OR b.category = p_category)
    AND (p_subject IS NULL OR b.subject = p_subject)
    AND (p_class_level IS NULL OR b.class_level = p_class_level)
    AND (p_language IS NULL OR b.language = p_language)
    AND (p_author IS NULL OR b.author = p_author)
    AND (
      p_availability = 'all' OR
      (p_availability = 'available' AND b.available_copies > 0) OR
      (p_availability = 'new' AND b.first_added_at >= now() - interval '30 days')
    )
  ORDER BY
    CASE WHEN search_query IS NOT NULL AND search_query <> '' THEN
      ts_rank(
        to_tsvector('english',
          coalesce(b.title, '') || ' ' || coalesce(b.author, '') || ' ' ||
          coalesce(b.subject, '') || ' ' || coalesce(b.category, '') || ' ' ||
          coalesce(b.description, '') || ' ' || coalesce(b.accession_number, '')
        ),
        plainto_tsquery('english', search_query)
      )
    END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'most_borrowed' THEN b.issue_count END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'title_az' THEN b.title END ASC NULLS LAST,
    CASE WHEN p_sort_by = 'newest' THEN b.created_at END DESC NULLS LAST,
    b.issue_count DESC NULLS LAST,
    b.cover_url DESC NULLS LAST
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.search_books TO anon, authenticated;

-- RPC: get_public_portfolio_data
CREATE OR REPLACE FUNCTION public.get_public_portfolio_data(target_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_books_read INT;
  v_quizzes_passed INT;
  v_badges INT;
  v_goals_completed INT;
  v_monthly_read INT;
  v_streak INT;
  v_class_rank INT;
  v_points INT;
  v_class TEXT;
  v_milestones JSONB;
  v_activity_log JSONB;
  v_month_start TIMESTAMPTZ;
BEGIN
  SELECT points, student_class INTO v_points, v_class FROM public.profiles WHERE id = target_user_id;
  
  SELECT COUNT(*)::INT INTO v_books_read FROM public.reading_history WHERE user_id = target_user_id;
  SELECT COUNT(*)::INT INTO v_quizzes_passed FROM public.quiz_results WHERE user_id = target_user_id;
  SELECT COUNT(*)::INT INTO v_badges FROM public.badge_awards WHERE user_id = target_user_id;
  SELECT COUNT(*)::INT INTO v_goals_completed FROM public.challenge_progress WHERE user_id = target_user_id AND is_completed = true;
  
  v_month_start := date_trunc('month', now());
  SELECT COUNT(*)::INT INTO v_monthly_read FROM public.reading_history 
  WHERE user_id = target_user_id AND completed_date >= v_month_start;
  
  SELECT current_streak INTO v_streak FROM public.login_streaks WHERE user_id = target_user_id;
  IF v_streak IS NULL THEN
    v_streak := 0;
  END IF;

  IF v_class IS NOT NULL AND v_points IS NOT NULL THEN
    SELECT (COUNT(*) + 1)::INT INTO v_class_rank 
    FROM public.profiles 
    WHERE student_class = v_class AND points > v_points AND is_approved = true;
  ELSE
    v_class_rank := NULL;
  END IF;

  SELECT coalesce(jsonb_agg(m), '[]'::jsonb) INTO v_milestones FROM (
    SELECT 'badge' as type, b.name as title, b.description, a.awarded_at as date
    FROM public.badge_awards a
    JOIN public.badges b ON a.badge_id = b.id
    WHERE a.user_id = target_user_id
    UNION ALL
    SELECT 'challenge' as type, c.title, 'Earned ' || c.reward_points || ' bonus points.' as description, p.completed_at as date
    FROM public.challenge_progress p
    JOIN public.challenges c ON p.challenge_id = c.id
    WHERE p.user_id = target_user_id AND p.is_completed = true
    ORDER BY date DESC
    LIMIT 5
  ) m;

  SELECT coalesce(jsonb_agg(log_row), '[]'::jsonb) INTO v_activity_log FROM (
    SELECT completed_date::date::text as date, COUNT(*)::int as value
    FROM public.reading_history
    WHERE user_id = target_user_id AND completed_date IS NOT NULL
    GROUP BY completed_date::date
  ) log_row;

  RETURN jsonb_build_object(
    'booksRead', v_books_read,
    'quizzesPassed', v_quizzes_passed,
    'points', COALESCE(v_points, 0),
    'badges', v_badges,
    'goalsCompleted', v_goals_completed,
    'monthlyRead', v_monthly_read,
    'streak', v_streak,
    'classRank', COALESCE(v_class_rank::text, '—'),
    'milestones', v_milestones,
    'activityLog', v_activity_log
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_portfolio_data(UUID) TO anon, authenticated;
