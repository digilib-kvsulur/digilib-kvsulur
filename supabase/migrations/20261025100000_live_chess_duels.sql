-- Add live chess to the existing tenant-local duel rooms.
INSERT INTO public.games
  (key, name, description, icon_name, category, is_enabled, points_per_win, max_points_per_day, daily_play_limit, sort_order)
VALUES
  ('chess', 'Chess', 'Challenge a friend to a live chess match. Every move is checked on the server.', 'Crown', 'strategy', true, 20, 40, 2, 35)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.create_game_duel(p_game_key text)
RETURNS TABLE(room_id uuid, room_code text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_code text; v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=v_uid AND role='student' AND COALESCE(is_approved,true)) THEN RAISE EXCEPTION 'Approved students only'; END IF;
  IF p_game_key NOT IN ('logic-grid','map-quest','science-sprint','code-breakers','eco-sort','ping-pong','snake','tic-tac-toe','snakes-ladders','ludo-dash','chess') THEN RAISE EXCEPTION 'Choose an available head-to-head game'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.games WHERE key=p_game_key AND is_enabled) THEN RAISE EXCEPTION 'Game unavailable'; END IF;
  UPDATE public.game_duel_rooms SET status='expired',updated_at=now() WHERE status IN ('waiting','active') AND expires_at<now();
  v_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  INSERT INTO public.game_duel_rooms(room_code,game_key,host_id) VALUES(v_code,p_game_key,v_uid) RETURNING id INTO v_id;
  RETURN QUERY SELECT v_id,v_code;
END $$;
REVOKE ALL ON FUNCTION public.create_game_duel(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_game_duel(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.join_game_duel(p_room_code text)
RETURNS TABLE(room_id uuid, game_key text, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); r public.game_duel_rooms%ROWTYPE; v_state jsonb := '{}'::jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=v_uid AND role='student' AND COALESCE(is_approved,true)) THEN RAISE EXCEPTION 'Approved students only'; END IF;
  SELECT * INTO r FROM public.game_duel_rooms WHERE room_code=upper(btrim(p_room_code)) FOR UPDATE;
  IF r.id IS NULL OR r.expires_at<now() OR r.status<>'waiting' THEN RAISE EXCEPTION 'Room is unavailable'; END IF;
  IF r.host_id=v_uid THEN RAISE EXCEPTION 'You cannot join your own room'; END IF;
  IF r.game_key='chess' THEN v_state := jsonb_build_object('fen','rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1','history','[]'::jsonb,'reason',NULL);
  ELSIF r.game_key='tic-tac-toe' THEN v_state := jsonb_build_object('board',jsonb_build_array('','','','','','','','',''),'moves',0);
  ELSIF r.game_key='snakes-ladders' THEN v_state := jsonb_build_object('players',jsonb_build_object('host',0,'guest',0),'last_roll',NULL);
  ELSIF r.game_key='ludo-dash' THEN v_state := jsonb_build_object('players',jsonb_build_object('host',0,'guest',0),'last_roll',NULL,'captured',false);
  END IF;
  UPDATE public.game_duel_rooms SET guest_id=v_uid,status='active',activated_at=now(),turn_user_id=CASE WHEN r.game_key='chess' THEN r.host_id ELSE r.host_id END,board_state=v_state,updated_at=now(),expires_at=now()+interval '2 hours' WHERE id=r.id;
  RETURN QUERY SELECT r.id,r.game_key,'active'::text;
END $$;
REVOKE ALL ON FUNCTION public.join_game_duel(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_game_duel(text) TO authenticated;

-- Private persistence step, called by the chess edge function after it replays
-- the complete move list with chess.js. Compare-and-swap makes concurrent moves safe.
CREATE OR REPLACE FUNCTION public.persist_verified_chess_state(
  p_room_id uuid, p_expected_history jsonb, p_board_state jsonb,
  p_status text, p_turn_user_id uuid, p_winner_id uuid
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.game_duel_rooms%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.game_duel_rooms WHERE id=p_room_id FOR UPDATE;
  IF r.id IS NULL OR r.game_key<>'chess' OR r.status<>'active' OR r.expires_at<now() THEN RAISE EXCEPTION 'Match is unavailable'; END IF;
  IF r.board_state->'history' IS DISTINCT FROM p_expected_history THEN RAISE EXCEPTION 'The board changed; refresh and try again'; END IF;
  IF p_status NOT IN ('active','completed') THEN RAISE EXCEPTION 'Invalid match status'; END IF;
  IF p_turn_user_id IS NOT NULL AND p_turn_user_id NOT IN (r.host_id,r.guest_id) THEN RAISE EXCEPTION 'Invalid next turn'; END IF;
  IF p_winner_id IS NOT NULL AND p_winner_id NOT IN (r.host_id,r.guest_id) THEN RAISE EXCEPTION 'Invalid winner'; END IF;
  UPDATE public.game_duel_rooms SET board_state=p_board_state,status=p_status,turn_user_id=p_turn_user_id,winner_id=p_winner_id,updated_at=now() WHERE id=r.id;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.persist_verified_chess_state(uuid,jsonb,jsonb,text,uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.persist_verified_chess_state(uuid,jsonb,jsonb,text,uuid,uuid) TO service_role;
