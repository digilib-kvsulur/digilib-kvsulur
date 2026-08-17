-- ============================================================
-- Migration: Feature upgrades batch 2
-- Features: 18 (FTS search_books RPC), 4 (reading_goals),
--           15 (reading_challenges), 26 (Realtime), 32 (velocity),
--           33 (daily study plan), 13 (class competitions),
--           36 (multiplayer quiz sessions)
-- ============================================================

-- ----------------------------------------
-- FEATURE 18: Full-Text Search RPC
-- Creates a fast search_books function using tsvector
-- ----------------------------------------
CREATE INDEX IF NOT EXISTS idx_books_fts ON books
  USING gin(
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce(author, '') || ' ' ||
      coalesce(subject, '') || ' ' ||
      coalesce(category, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(accession_number, '')
    )
  );

CREATE OR REPLACE FUNCTION search_books(
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

GRANT EXECUTE ON FUNCTION search_books TO anon, authenticated;


-- ----------------------------------------
-- FEATURE 4: Reading Goals & Heatmap
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS reading_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  goal_type text NOT NULL CHECK (goal_type IN ('books_per_month', 'pages_per_week', 'minutes_per_day')),
  target_value int NOT NULL DEFAULT 4,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reading_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  activity_date date NOT NULL DEFAULT CURRENT_DATE,
  books_read int NOT NULL DEFAULT 0,
  pages_read int NOT NULL DEFAULT 0,
  minutes_read int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, activity_date)
);

ALTER TABLE reading_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own goals" ON reading_goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins view all goals" ON reading_goals FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users manage own activity" ON reading_activity_log FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins view all activity" ON reading_activity_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);


-- ----------------------------------------
-- FEATURE 15: Reading Challenge Calendar
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS reading_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  target_books int NOT NULL DEFAULT 5,
  badge_name text,
  badge_emoji text DEFAULT '🏆',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS challenge_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid REFERENCES reading_challenges(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  books_completed int NOT NULL DEFAULT 0,
  completed_at timestamptz,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

ALTER TABLE reading_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone views challenges" ON reading_challenges FOR SELECT USING (true);
CREATE POLICY "Admins manage challenges" ON reading_challenges FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users manage own participation" ON challenge_participants FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Everyone views participants" ON challenge_participants FOR SELECT USING (true);


-- ----------------------------------------
-- FEATURE 13: Class vs Class Competitions
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS class_competitions (
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
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE class_competitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone views competitions" ON class_competitions FOR SELECT USING (true);
CREATE POLICY "Admins manage competitions" ON class_competitions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);


-- ----------------------------------------
-- FEATURE 32: Student Reading Velocity
-- ----------------------------------------
CREATE OR REPLACE FUNCTION get_student_reading_velocity(p_user_id uuid)
RETURNS TABLE(
  books_last_30_days bigint,
  books_last_60_days bigint,
  velocity_score numeric,
  velocity_label text
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH counts AS (
    SELECT
      COUNT(*) FILTER (WHERE completed_date >= CURRENT_DATE - 30) AS last_30,
      COUNT(*) FILTER (WHERE completed_date >= CURRENT_DATE - 60 AND completed_date < CURRENT_DATE - 30) AS prev_30
    FROM reading_history
    WHERE user_id = p_user_id
  )
  SELECT
    last_30,
    prev_30,
    CASE WHEN prev_30 = 0 THEN last_30::numeric ELSE round((last_30::numeric / prev_30::numeric * 100), 1) END AS velocity_score,
    CASE
      WHEN prev_30 = 0 AND last_30 > 0 THEN 'Rising ⭐'
      WHEN last_30 > prev_30 THEN 'Accelerating 🚀'
      WHEN last_30 = prev_30 THEN 'Steady 📖'
      WHEN last_30 < prev_30 THEN 'Slowing 📉'
      ELSE 'Just Starting 🌱'
    END AS velocity_label
  FROM counts;
$$;

GRANT EXECUTE ON FUNCTION get_student_reading_velocity TO authenticated;


-- ----------------------------------------
-- FEATURE 36: Multiplayer Quiz Sessions
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  host_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  room_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'completed')),
  current_question_index int NOT NULL DEFAULT 0,
  max_players int NOT NULL DEFAULT 10,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quiz_session_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES quiz_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  display_name text NOT NULL,
  score int NOT NULL DEFAULT 0,
  answers jsonb DEFAULT '[]'::jsonb,
  is_ready boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_session_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone views sessions" ON quiz_sessions FOR SELECT USING (true);
CREATE POLICY "Authenticated create sessions" ON quiz_sessions FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Host updates sessions" ON quiz_sessions FOR UPDATE USING (auth.uid() = host_id);
CREATE POLICY "Everyone views players" ON quiz_session_players FOR SELECT USING (true);
CREATE POLICY "Players manage own record" ON quiz_session_players FOR ALL USING (auth.uid() = user_id);

-- Generate unique 6-char room codes
CREATE OR REPLACE FUNCTION generate_room_code() RETURNS text LANGUAGE sql AS $$
  SELECT upper(substring(md5(random()::text), 1, 6));
$$;

-- ----------------------------------------
-- FEATURE 26: Supabase Realtime
-- Enable realtime on key tables
-- ----------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_session_players;
ALTER PUBLICATION supabase_realtime ADD TABLE book_issues;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
