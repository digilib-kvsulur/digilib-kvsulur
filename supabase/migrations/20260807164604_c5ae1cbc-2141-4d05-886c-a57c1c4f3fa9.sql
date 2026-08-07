CREATE TABLE public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon_name text NOT NULL DEFAULT 'Gamepad2',
  category text NOT NULL DEFAULT 'puzzle',
  is_enabled boolean NOT NULL DEFAULT true,
  points_per_win integer NOT NULL DEFAULT 10,
  max_points_per_day integer NOT NULL DEFAULT 50,
  daily_play_limit integer NOT NULL DEFAULT 5,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.games TO authenticated;
GRANT ALL ON public.games TO service_role;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view games" ON public.games
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage games" ON public.games
  FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE TRIGGER trg_games_updated BEFORE UPDATE ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.game_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  game_id uuid REFERENCES public.games(id) ON DELETE SET NULL,
  game_key text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  points_earned integer NOT NULL DEFAULT 0,
  duration_seconds integer NOT NULL DEFAULT 0,
  is_win boolean NOT NULL DEFAULT false,
  played_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.game_plays TO authenticated;
GRANT ALL ON public.game_plays TO service_role;
ALTER TABLE public.game_plays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own plays" ON public.game_plays
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Users insert own plays" ON public.game_plays
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_game_plays_user_day ON public.game_plays (user_id, game_key, played_at);

CREATE OR REPLACE FUNCTION public.record_game_play(
  p_game_key text,
  p_score integer,
  p_is_win boolean,
  p_duration_seconds integer DEFAULT 0
) RETURNS TABLE(points_awarded integer, plays_left integer, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  g record;
  v_plays integer;
  v_today_pts integer;
  v_pts integer := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO g FROM public.games WHERE key = p_game_key;
  IF g IS NULL OR NOT g.is_enabled THEN
    RETURN QUERY SELECT 0, 0, 'This game is currently unavailable.'; RETURN;
  END IF;

  SELECT COUNT(*)::int, COALESCE(SUM(points_earned),0)::int
    INTO v_plays, v_today_pts
  FROM public.game_plays
  WHERE user_id = v_uid AND game_key = p_game_key AND played_at::date = CURRENT_DATE;

  IF g.daily_play_limit > 0 AND v_plays >= g.daily_play_limit THEN
    INSERT INTO public.game_plays (user_id, game_id, game_key, score, points_earned, duration_seconds, is_win)
    VALUES (v_uid, g.id, p_game_key, COALESCE(p_score,0), 0, GREATEST(COALESCE(p_duration_seconds,0),0), COALESCE(p_is_win,false));
    RETURN QUERY SELECT 0, 0, 'Daily play limit reached — no more points today.'; RETURN;
  END IF;

  IF COALESCE(p_is_win, false) THEN
    v_pts := GREATEST(g.points_per_win, 0);
    IF g.max_points_per_day > 0 THEN
      v_pts := GREATEST(LEAST(v_pts, g.max_points_per_day - v_today_pts), 0);
    END IF;
  END IF;

  INSERT INTO public.game_plays (user_id, game_id, game_key, score, points_earned, duration_seconds, is_win)
  VALUES (v_uid, g.id, p_game_key, COALESCE(p_score,0), v_pts, GREATEST(COALESCE(p_duration_seconds,0),0), COALESCE(p_is_win,false));

  IF v_pts > 0 THEN
    UPDATE public.profiles SET points = COALESCE(points,0) + v_pts WHERE id = v_uid;
  END IF;

  RETURN QUERY SELECT v_pts,
    CASE WHEN g.daily_play_limit > 0 THEN GREATEST(g.daily_play_limit - v_plays - 1, 0) ELSE 999 END,
    CASE WHEN v_pts > 0 THEN 'Nice work!' ELSE 'Play recorded.' END;
END; $$;

REVOKE EXECUTE ON FUNCTION public.record_game_play(text, integer, boolean, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_game_play(text, integer, boolean, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.award_material_reading(
  p_material_id uuid,
  p_material_title text,
  p_seconds integer
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_secs integer := GREATEST(COALESCE(p_seconds,0), 0);
  v_rate integer;
  v_cap integer;
  v_today integer;
  v_pts integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF v_secs < 60 THEN RETURN 0; END IF;

  SELECT COALESCE((value)::text::integer, 1) INTO v_rate FROM public.system_settings WHERE key = 'points_per_reading_minute';
  v_rate := COALESCE(v_rate, 1);
  SELECT COALESCE((value)::text::integer, 30) INTO v_cap FROM public.system_settings WHERE key = 'max_reading_points_per_day';
  v_cap := COALESCE(v_cap, 30);

  v_pts := LEAST(FLOOR(v_secs / 60.0)::int * v_rate, 20);

  SELECT COALESCE(SUM(points_earned),0)::int INTO v_today
  FROM public.study_sessions
  WHERE user_id = v_uid AND session_type = 'reading' AND started_at::date = CURRENT_DATE;

  IF v_cap > 0 THEN v_pts := GREATEST(LEAST(v_pts, v_cap - v_today), 0); END IF;

  INSERT INTO public.study_sessions (user_id, material_id, material_title, duration_seconds, points_earned, session_type, started_at, ended_at)
  VALUES (v_uid, p_material_id, p_material_title, v_secs, v_pts, 'reading', now() - make_interval(secs => v_secs), now());

  IF v_pts > 0 THEN
    UPDATE public.profiles SET points = COALESCE(points,0) + v_pts WHERE id = v_uid;
  END IF;
  RETURN v_pts;
END; $$;

REVOKE EXECUTE ON FUNCTION public.award_material_reading(uuid, text, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.award_material_reading(uuid, text, integer) TO authenticated;

INSERT INTO public.games (key, name, description, icon_name, category, points_per_win, max_points_per_day, daily_play_limit, sort_order) VALUES
  ('book-match', 'Book Match', 'Flip cards and match book titles with their authors.', 'Layers', 'memory', 10, 40, 5, 1),
  ('library-bingo', 'Library Bingo', 'Complete a row of library reading tasks to win.', 'Grid3x3', 'bingo', 15, 30, 3, 2),
  ('word-scramble', 'Word Scramble', 'Unscramble book titles and literary words against the clock.', 'Shuffle', 'word', 8, 40, 6, 3),
  ('sliding-puzzle', 'Jigsaw Slider', 'Slide the tiles to rebuild a book cover.', 'PuzzleIcon', 'puzzle', 12, 36, 4, 4),
  ('book-cards', 'Book Card Duel', 'Guess which book is more popular in the library.', 'Spade', 'cards', 10, 40, 5, 5),
  ('crossword', 'Mini Crossword', 'Solve a crossword built from library and book clues.', 'Grid2x2', 'word', 20, 40, 2, 6);

INSERT INTO public.system_settings (key, value) VALUES
  ('points_per_reading_minute', '1'::jsonb),
  ('max_reading_points_per_day', '30'::jsonb)
ON CONFLICT (key) DO NOTHING;