-- Anti-abuse: book reviews
CREATE OR REPLACE FUNCTION public.tg_validate_book_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_text text := btrim(coalesce(NEW.review_text,''));
  v_count int;
  v_words int;
  v_unique_words int;
BEGIN
  IF public.is_staff_or_admin(auth.uid()) AND auth.uid() IS DISTINCT FROM NEW.user_id THEN
    RETURN NEW;
  END IF;
  IF length(v_text) < 400 THEN
    RAISE EXCEPTION 'Review must be at least 400 characters long.';
  END IF;
  -- spam checks: repeated characters, too few distinct words
  IF v_text ~ '(.)\1{6,}' THEN
    RAISE EXCEPTION 'Review looks like spam (repeated characters). Please write genuine thoughts.';
  END IF;
  SELECT count(*), count(DISTINCT lower(w)) INTO v_words, v_unique_words
  FROM regexp_split_to_table(v_text, '\s+') w WHERE length(w) > 0;
  IF v_words < 60 OR v_unique_words < 35 OR v_unique_words::numeric / GREATEST(v_words,1) < 0.4 THEN
    RAISE EXCEPTION 'Review looks repetitive. Please write a genuine review in your own words.';
  END IF;
  -- no copy-pasting the same text across reviews
  IF EXISTS (SELECT 1 FROM public.book_reviews
             WHERE id IS DISTINCT FROM NEW.id
               AND lower(regexp_replace(review_text,'\s+','','g')) = lower(regexp_replace(v_text,'\s+','','g'))) THEN
    RAISE EXCEPTION 'This review text has already been used. Please write an original review.';
  END IF;
  IF TG_OP = 'INSERT' THEN
    SELECT count(*) INTO v_count FROM public.book_reviews
    WHERE user_id = NEW.user_id AND created_at >= date_trunc('day', now());
    IF v_count >= 2 THEN
      RAISE EXCEPTION 'You can post at most 2 book reviews per day. Try again tomorrow.';
    END IF;
  END IF;
  NEW.review_text := v_text;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_book_review ON public.book_reviews;
CREATE TRIGGER trg_validate_book_review BEFORE INSERT OR UPDATE OF review_text ON public.book_reviews
FOR EACH ROW EXECUTE FUNCTION public.tg_validate_book_review();

-- Games: global 1000 XP/day cap + rapid-fire throttle
CREATE OR REPLACE FUNCTION public.record_game_play_v2(p_game_key text, p_score integer, p_is_win boolean, p_duration_seconds integer, p_session_id uuid DEFAULT NULL::uuid, p_client_nonce text DEFAULT NULL::text, p_answers jsonb DEFAULT NULL::jsonb, p_offline boolean DEFAULT false)
 RETURNS TABLE(points_awarded integer, plays_left integer, message text, verified boolean)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  g record; s record;
  v_plays integer; v_today_pts integer; v_all_today integer; v_recent integer;
  v_pts integer := 0;
  v_win boolean := COALESCE(p_is_win,false);
  v_score integer := GREATEST(COALESCE(p_score,0),0);
  v_dur integer := GREATEST(COALESCE(p_duration_seconds,0),0);
  v_verified boolean := true;
  v_msg text := 'Play recorded.';
  a jsonb; v_expected text;
  c_daily_cap constant integer := 1000;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO g FROM public.games WHERE key = p_game_key;
  IF g IS NULL OR NOT g.is_enabled THEN
    RETURN QUERY SELECT 0, 0, 'This game is currently unavailable.', false; RETURN;
  END IF;
  IF p_client_nonce IS NOT NULL AND EXISTS (SELECT 1 FROM public.game_plays WHERE user_id = v_uid AND client_nonce = p_client_nonce) THEN
    RETURN QUERY SELECT 0, 0, 'This round was already submitted.', false; RETURN;
  END IF;
  IF p_session_id IS NOT NULL THEN
    SELECT * INTO s FROM public.game_sessions WHERE id = p_session_id AND user_id = v_uid;
    IF s IS NULL OR s.consumed_at IS NOT NULL OR s.game_key <> p_game_key THEN
      v_verified := false; v_win := false; v_msg := 'Round could not be verified.';
    ELSE
      UPDATE public.game_sessions SET consumed_at = now() WHERE id = p_session_id;
      v_dur := GREATEST(EXTRACT(EPOCH FROM (now() - s.started_at))::int, 0);
    END IF;
  ELSIF NOT p_offline THEN
    v_verified := false; v_win := false; v_msg := 'Round could not be verified.';
  END IF;
  IF v_verified AND v_dur < COALESCE(g.min_duration_seconds,5) THEN
    v_verified := false; v_win := false; v_msg := 'Round finished too quickly to count.';
  END IF;
  IF v_verified AND v_dur > 7200 THEN
    v_verified := false; v_win := false; v_msg := 'Round took too long to count.';
  END IF;
  IF v_score > COALESCE(g.max_score,100000) THEN
    v_verified := false; v_win := false; v_msg := 'Reported score is out of range.';
    v_score := LEAST(v_score, COALESCE(g.max_score,100000));
  END IF;
  -- Rapid-fire: more than 10 rounds in the last 5 minutes across all games is suspicious
  SELECT count(*) INTO v_recent FROM public.game_plays WHERE user_id = v_uid AND played_at > now() - interval '5 minutes';
  IF v_recent >= 10 THEN
    v_verified := false; v_win := false; v_msg := 'Too many rounds too quickly — slow down to earn points.';
  END IF;
  IF v_verified AND p_answers IS NOT NULL AND jsonb_typeof(p_answers) = 'array' THEN
    FOR a IN SELECT jsonb_array_elements(p_answers) LOOP
      SELECT COALESCE(NULLIF(extra->>'answer',''), value) INTO v_expected FROM public.game_content
      WHERE id = (a->>'id')::uuid AND game_key = p_game_key;
      IF v_expected IS NULL OR lower(regexp_replace(COALESCE(a->>'answer',''), '[^a-zA-Z0-9]', '', 'g'))
            <> lower(regexp_replace(v_expected, '[^a-zA-Z0-9]', '', 'g')) THEN
        v_verified := false; v_win := false; v_msg := 'Answers did not match the library content.'; EXIT;
      END IF;
    END LOOP;
  END IF;
  SELECT COUNT(*)::int, COALESCE(SUM(points_earned),0)::int INTO v_plays, v_today_pts
  FROM public.game_plays WHERE user_id = v_uid AND game_key = p_game_key AND played_at::date = CURRENT_DATE;
  SELECT COALESCE(SUM(points_earned),0)::int INTO v_all_today
  FROM public.game_plays WHERE user_id = v_uid AND played_at::date = CURRENT_DATE;
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
    v_pts := GREATEST(LEAST(v_pts, c_daily_cap - v_all_today), 0);
    v_msg := CASE WHEN v_pts = 0 AND v_all_today >= c_daily_cap THEN 'Daily Games Corner limit of 1000 XP reached.' ELSE 'Nice work!' END;
  END IF;
  INSERT INTO public.game_plays (user_id, game_id, game_key, score, points_earned, duration_seconds, is_win, client_nonce, session_id, was_offline)
  VALUES (v_uid, g.id, p_game_key, v_score, v_pts, v_dur, v_win, p_client_nonce, p_session_id, p_offline);
  IF v_pts > 0 THEN
    UPDATE public.profiles SET points = COALESCE(points,0) + v_pts WHERE id = v_uid;
  END IF;
  RETURN QUERY SELECT v_pts,
    CASE WHEN g.daily_play_limit > 0 THEN GREATEST(g.daily_play_limit - v_plays - 1, 0) ELSE 999 END,
    v_msg, v_verified;
END; $function$;

-- Legacy unverified endpoint can no longer be used to farm points
REVOKE EXECUTE ON FUNCTION public.record_game_play(text, integer, boolean, integer) FROM authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.get_game_analytics() TO authenticated;