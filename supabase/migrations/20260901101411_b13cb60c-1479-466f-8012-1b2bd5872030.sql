
-- 1. PWA install reward
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pwa_installed_at timestamptz;

CREATE OR REPLACE FUNCTION public.award_pwa_install()
RETURNS TABLE(points_awarded integer, already_claimed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_existing timestamptz;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT pwa_installed_at INTO v_existing FROM public.profiles WHERE id = v_uid;
  IF v_existing IS NOT NULL THEN
    RETURN QUERY SELECT 0, true; RETURN;
  END IF;
  UPDATE public.profiles
    SET pwa_installed_at = now(), points = COALESCE(points,0) + 500
  WHERE id = v_uid;
  PERFORM public.notify_user(v_uid, 'App installed 🎉', 'You earned 500 XP for installing the DLMS app!', 'success');
  RETURN QUERY SELECT 500, false;
END; $$;

REVOKE ALL ON FUNCTION public.award_pwa_install() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_pwa_install() TO authenticated;

-- 2. Game anti-cheat scaffolding
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS min_duration_seconds integer NOT NULL DEFAULT 5;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS max_score integer NOT NULL DEFAULT 100000;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS offline_capable boolean NOT NULL DEFAULT false;

UPDATE public.games SET offline_capable = true
WHERE key IN ('word-scramble','sliding-puzzle','reading-wordle','book-hangman','word-search','word-chain','speed-typing','reaction-test','spot-difference','book-cards','library-bingo');

ALTER TABLE public.game_plays ADD COLUMN IF NOT EXISTS client_nonce text;
ALTER TABLE public.game_plays ADD COLUMN IF NOT EXISTS session_id uuid;
ALTER TABLE public.game_plays ADD COLUMN IF NOT EXISTS was_offline boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS game_plays_user_nonce_uidx
  ON public.game_plays (user_id, client_nonce) WHERE client_nonce IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  game_key text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.game_sessions TO authenticated;
GRANT ALL ON public.game_sessions TO service_role;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own game sessions read" ON public.game_sessions;
CREATE POLICY "own game sessions read" ON public.game_sessions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "own game sessions insert" ON public.game_sessions;
CREATE POLICY "own game sessions insert" ON public.game_sessions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.start_game_session(p_game_key text)
RETURNS TABLE(session_id uuid, server_time timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.games WHERE key = p_game_key AND is_enabled) THEN
    RAISE EXCEPTION 'Game unavailable';
  END IF;
  DELETE FROM public.game_sessions
    WHERE user_id = v_uid AND consumed_at IS NULL AND started_at < now() - interval '6 hours';
  INSERT INTO public.game_sessions (user_id, game_key) VALUES (v_uid, p_game_key) RETURNING id INTO v_id;
  RETURN QUERY SELECT v_id, now();
END; $$;

REVOKE ALL ON FUNCTION public.start_game_session(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_game_session(text) TO authenticated;

-- Verified scoring
CREATE OR REPLACE FUNCTION public.record_game_play_v2(
  p_game_key text,
  p_score integer,
  p_is_win boolean,
  p_duration_seconds integer,
  p_session_id uuid DEFAULT NULL,
  p_client_nonce text DEFAULT NULL,
  p_answers jsonb DEFAULT NULL,
  p_offline boolean DEFAULT false
)
RETURNS TABLE(points_awarded integer, plays_left integer, message text, verified boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  g record;
  s record;
  v_plays integer;
  v_today_pts integer;
  v_pts integer := 0;
  v_win boolean := COALESCE(p_is_win,false);
  v_score integer := GREATEST(COALESCE(p_score,0),0);
  v_dur integer := GREATEST(COALESCE(p_duration_seconds,0),0);
  v_verified boolean := true;
  v_msg text := 'Play recorded.';
  a jsonb;
  v_expected text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO g FROM public.games WHERE key = p_game_key;
  IF g IS NULL OR NOT g.is_enabled THEN
    RETURN QUERY SELECT 0, 0, 'This game is currently unavailable.', false; RETURN;
  END IF;

  -- Replay protection via nonce
  IF p_client_nonce IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.game_plays WHERE user_id = v_uid AND client_nonce = p_client_nonce
  ) THEN
    RETURN QUERY SELECT 0, 0, 'This round was already submitted.', false; RETURN;
  END IF;

  -- Session verification (online plays)
  IF p_session_id IS NOT NULL THEN
    SELECT * INTO s FROM public.game_sessions WHERE id = p_session_id AND user_id = v_uid;
    IF s IS NULL OR s.consumed_at IS NOT NULL OR s.game_key <> p_game_key THEN
      v_verified := false; v_win := false; v_msg := 'Round could not be verified.';
    ELSE
      UPDATE public.game_sessions SET consumed_at = now() WHERE id = p_session_id;
      -- trust the server clock, not the client
      v_dur := GREATEST(EXTRACT(EPOCH FROM (now() - s.started_at))::int, 0);
    END IF;
  ELSIF NOT p_offline THEN
    v_verified := false; v_win := false; v_msg := 'Round could not be verified.';
  END IF;

  -- Timing plausibility
  IF v_verified AND v_dur < COALESCE(g.min_duration_seconds,5) THEN
    v_verified := false; v_win := false; v_msg := 'Round finished too quickly to count.';
  END IF;
  IF v_verified AND v_dur > 7200 THEN
    v_verified := false; v_win := false; v_msg := 'Round took too long to count.';
  END IF;

  -- Score bounds
  IF v_score > COALESCE(g.max_score,100000) THEN
    v_verified := false; v_win := false; v_msg := 'Reported score is out of range.';
    v_score := LEAST(v_score, COALESCE(g.max_score,100000));
  END IF;

  -- Answer verification against admin content
  IF v_verified AND p_answers IS NOT NULL AND jsonb_typeof(p_answers) = 'array' THEN
    FOR a IN SELECT jsonb_array_elements(p_answers) LOOP
      SELECT COALESCE(NULLIF(extra->>'answer',''), value) INTO v_expected
      FROM public.game_content
      WHERE id = (a->>'id')::uuid AND game_key = p_game_key;
      IF v_expected IS NULL
         OR lower(regexp_replace(COALESCE(a->>'answer',''), '[^a-zA-Z0-9]', '', 'g'))
            <> lower(regexp_replace(v_expected, '[^a-zA-Z0-9]', '', 'g')) THEN
        v_verified := false; v_win := false; v_msg := 'Answers did not match the library content.';
        EXIT;
      END IF;
    END LOOP;
  END IF;

  SELECT COUNT(*)::int, COALESCE(SUM(points_earned),0)::int
    INTO v_plays, v_today_pts
  FROM public.game_plays
  WHERE user_id = v_uid AND game_key = p_game_key AND played_at::date = CURRENT_DATE;

  IF g.daily_play_limit > 0 AND v_plays >= g.daily_play_limit THEN
    INSERT INTO public.game_plays (user_id, game_id, game_key, score, points_earned, duration_seconds, is_win, client_nonce, session_id, was_offline)
    VALUES (v_uid, g.id, p_game_key, v_score, 0, v_dur, v_win, p_client_nonce, p_session_id, p_offline);
    RETURN QUERY SELECT 0, 0, 'Daily play limit reached — no more points today.', v_verified; RETURN;
  END IF;

  IF v_win AND v_verified THEN
    v_pts := GREATEST(g.points_per_win, 0);
    IF g.max_points_per_day > 0 THEN
      v_pts := GREATEST(LEAST(v_pts, g.max_points_per_day - v_today_pts), 0);
    END IF;
    v_msg := 'Nice work!';
  END IF;

  INSERT INTO public.game_plays (user_id, game_id, game_key, score, points_earned, duration_seconds, is_win, client_nonce, session_id, was_offline)
  VALUES (v_uid, g.id, p_game_key, v_score, v_pts, v_dur, v_win, p_client_nonce, p_session_id, p_offline);

  IF v_pts > 0 THEN
    UPDATE public.profiles SET points = COALESCE(points,0) + v_pts WHERE id = v_uid;
  END IF;

  RETURN QUERY SELECT v_pts,
    CASE WHEN g.daily_play_limit > 0 THEN GREATEST(g.daily_play_limit - v_plays - 1, 0) ELSE 999 END,
    v_msg, v_verified;
END; $$;

REVOKE ALL ON FUNCTION public.record_game_play_v2(text,integer,boolean,integer,uuid,text,jsonb,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_game_play_v2(text,integer,boolean,integer,uuid,text,jsonb,boolean) TO authenticated;

-- 3. Period-aware leaderboards
CREATE OR REPLACE FUNCTION public.get_period_points(p_since timestamptz)
RETURNS TABLE(user_id uuid, pts bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT u, SUM(p)::bigint FROM (
    SELECT gp.user_id AS u, COALESCE(gp.points_earned,0) AS p
      FROM public.game_plays gp WHERE gp.played_at >= p_since
    UNION ALL
    SELECT qr.user_id, COALESCE(qr.points_earned,0)
      FROM public.quiz_results qr WHERE qr.completed_at >= p_since
    UNION ALL
    SELECT rh.user_id, COALESCE(rh.points_earned,0)
      FROM public.reading_history rh WHERE rh.completed_date >= p_since::date
    UNION ALL
    SELECT ss.user_id, COALESCE(ss.points_earned,0)
      FROM public.study_sessions ss WHERE ss.created_at >= p_since
    UNION ALL
    SELECT cp.user_id, COALESCE(cp.points_earned,0)
      FROM public.challenge_progress cp WHERE cp.completed_at >= p_since
    UNION ALL
    SELECT ba.user_id, COALESCE(b.points,0)
      FROM public.badge_awards ba JOIN public.badges b ON b.id = ba.badge_id
      WHERE ba.awarded_at >= p_since
  ) t(u, p)
  GROUP BY u;
$$;

REVOKE ALL ON FUNCTION public.get_period_points(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_period_points(timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_leaderboard_v2(p_period text DEFAULT 'lifetime', p_class text DEFAULT NULL)
RETURNS TABLE(id uuid, first_name text, last_name text, student_class text, avatar_url text, points bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_since timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_period = 'monthly' THEN
    v_since := date_trunc('month', now());
    RETURN QUERY
      SELECT p.id, p.first_name, p.last_name, p.student_class, p.avatar_url, COALESCE(pp.pts,0)::bigint
      FROM public.profiles p
      LEFT JOIN public.get_period_points(v_since) pp ON pp.user_id = p.id
      WHERE p.role = 'student'
        AND (p_class IS NULL OR p.student_class = p_class)
        AND COALESCE(pp.pts,0) > 0
      ORDER BY 6 DESC, p.first_name
      LIMIT 200;
  ELSE
    RETURN QUERY
      SELECT p.id, p.first_name, p.last_name, p.student_class, p.avatar_url, COALESCE(p.points,0)::bigint
      FROM public.profiles p
      WHERE p.role = 'student'
        AND (p_class IS NULL OR p.student_class = p_class)
      ORDER BY 6 DESC, p.first_name
      LIMIT 200;
  END IF;
END; $$;

REVOKE ALL ON FUNCTION public.get_leaderboard_v2(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_v2(text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_class_league_v2(p_period text DEFAULT 'lifetime')
RETURNS TABLE(student_class text, total_points bigint, student_count bigint, avg_points numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_since timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  v_since := date_trunc('month', now());
  IF p_period = 'monthly' THEN
    RETURN QUERY
      SELECT p.student_class, COALESCE(SUM(pp.pts),0)::bigint, COUNT(*)::bigint,
             ROUND(COALESCE(SUM(pp.pts),0)::numeric / GREATEST(COUNT(*),1), 1)
      FROM public.profiles p
      LEFT JOIN public.get_period_points(v_since) pp ON pp.user_id = p.id
      WHERE p.role = 'student' AND COALESCE(p.student_class,'') <> ''
      GROUP BY p.student_class
      ORDER BY 2 DESC;
  ELSE
    RETURN QUERY
      SELECT p.student_class, COALESCE(SUM(p.points),0)::bigint, COUNT(*)::bigint,
             ROUND(COALESCE(SUM(p.points),0)::numeric / GREATEST(COUNT(*),1), 1)
      FROM public.profiles p
      WHERE p.role = 'student' AND COALESCE(p.student_class,'') <> ''
      GROUP BY p.student_class
      ORDER BY 2 DESC;
  END IF;
END; $$;

REVOKE ALL ON FUNCTION public.get_class_league_v2(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_class_league_v2(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_leaderboard_stats_v2(p_period text DEFAULT 'lifetime', p_class text DEFAULT NULL)
RETURNS TABLE(total_students bigint, total_points bigint, average_points numeric, top_points bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  RETURN QUERY
    SELECT COUNT(*)::bigint,
           COALESCE(SUM(l.points),0)::bigint,
           ROUND(COALESCE(AVG(l.points),0)::numeric, 1),
           COALESCE(MAX(l.points),0)::bigint
    FROM public.get_leaderboard_v2(p_period, p_class) l;
END; $$;

REVOKE ALL ON FUNCTION public.get_leaderboard_stats_v2(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_stats_v2(text,text) TO authenticated;
