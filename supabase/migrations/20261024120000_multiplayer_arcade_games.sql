-- Add short arcade games plus server-backed shared boards for Tic-Tac-Toe and
-- Snakes & Ladders. Existing game history and room codes remain compatible.
INSERT INTO public.games
  (key, name, description, icon_name, category, is_enabled, points_per_win, max_points_per_day, daily_play_limit, sort_order)
VALUES
  ('ping-pong', 'Ping Pong', 'Rally against the arcade bot and race to five points.', 'Gamepad2', 'arcade', true, 15, 45, 3, 30),
  ('snake', 'Snake', 'Guide your growing snake, collect fruit and beat your best run.', 'Gamepad2', 'arcade', true, 12, 48, 4, 31),
  ('tic-tac-toe', 'Tic-Tac-Toe', 'Practice against the computer or challenge a friend live.', 'Grid3x3', 'strategy', true, 10, 40, 4, 32),
  ('snakes-ladders', 'Snakes & Ladders', 'Race up the ladders and dodge the snakes. Play against a friend live.', 'Grid2x2', 'strategy', true, 12, 48, 3, 33)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.game_duel_rooms
  ADD COLUMN IF NOT EXISTS board_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS turn_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.create_game_duel(p_game_key text)
RETURNS TABLE(room_id uuid, room_code text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_code text; v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid AND role = 'student' AND COALESCE(is_approved,true)) THEN
    RAISE EXCEPTION 'Approved students only';
  END IF;
  IF p_game_key NOT IN ('logic-grid','map-quest','science-sprint','code-breakers','eco-sort','ping-pong','snake','tic-tac-toe','snakes-ladders') THEN
    RAISE EXCEPTION 'Choose an available head-to-head game';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.games WHERE key = p_game_key AND is_enabled) THEN RAISE EXCEPTION 'Game unavailable'; END IF;
  UPDATE public.game_duel_rooms SET status='expired', updated_at=now() WHERE status IN ('waiting','active') AND expires_at < now();
  v_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  INSERT INTO public.game_duel_rooms(room_code,game_key,host_id) VALUES(v_code,p_game_key,v_uid) RETURNING id INTO v_id;
  RETURN QUERY SELECT v_id,v_code;
END $$;

CREATE OR REPLACE FUNCTION public.join_game_duel(p_room_code text)
RETURNS TABLE(room_id uuid, game_key text, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); r public.game_duel_rooms%ROWTYPE; v_state jsonb := '{}'::jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=v_uid AND role='student' AND COALESCE(is_approved,true)) THEN RAISE EXCEPTION 'Approved students only'; END IF;
  SELECT * INTO r FROM public.game_duel_rooms WHERE room_code=upper(btrim(p_room_code)) FOR UPDATE;
  IF r.id IS NULL OR r.expires_at < now() OR r.status <> 'waiting' THEN RAISE EXCEPTION 'Room is unavailable'; END IF;
  IF r.host_id = v_uid THEN RAISE EXCEPTION 'You cannot join your own room'; END IF;
  IF r.game_key='tic-tac-toe' THEN
    v_state := jsonb_build_object('board',jsonb_build_array('','','','','','','','',''),'moves',0);
  ELSIF r.game_key='snakes-ladders' THEN
    v_state := jsonb_build_object('players',jsonb_build_object('host',0,'guest',0),'last_roll',NULL);
  END IF;
  UPDATE public.game_duel_rooms
  SET guest_id=v_uid,status='active',activated_at=now(),turn_user_id=r.host_id,board_state=v_state,
      updated_at=now(),expires_at=now()+interval '30 minutes'
  WHERE id=r.id;
  RETURN QUERY SELECT r.id,r.game_key,'active'::text;
END $$;

CREATE OR REPLACE FUNCTION public.play_game_duel_turn(p_room_id uuid, p_action jsonb)
RETURNS TABLE(board_state jsonb, status text, turn_user_id uuid, winner_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid(); r public.game_duel_rooms%ROWTYPE; v_state jsonb; v_status text := 'active';
  v_turn uuid; v_winner uuid; v_role text; v_mark text; v_index integer; v_marks text[];
  v_moves integer; v_won boolean := false; v_draw boolean := false;
  v_roll integer; v_old_pos integer; v_new_pos integer; v_players jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO r FROM public.game_duel_rooms WHERE id=p_room_id FOR UPDATE;
  IF r.id IS NULL OR r.status <> 'active' OR r.expires_at < now() THEN RAISE EXCEPTION 'Match is unavailable'; END IF;
  IF v_uid NOT IN (r.host_id,r.guest_id) THEN RAISE EXCEPTION 'You are not a player in this match'; END IF;
  IF r.turn_user_id <> v_uid THEN RAISE EXCEPTION 'Wait for your turn'; END IF;
  v_state := r.board_state;

  IF r.game_key='tic-tac-toe' THEN
    IF p_action->>'type' <> 'place' OR (p_action->>'index') !~ '^[0-8]$' THEN RAISE EXCEPTION 'Choose a square on the board'; END IF;
    v_index := (p_action->>'index')::integer;
    v_marks := ARRAY(SELECT jsonb_array_elements_text(v_state->'board'));
    IF array_length(v_marks,1) <> 9 THEN RAISE EXCEPTION 'The board is not ready'; END IF;
    IF COALESCE(v_marks[v_index+1],'') <> '' THEN RAISE EXCEPTION 'That square is taken'; END IF;
    v_role := CASE WHEN v_uid=r.host_id THEN 'host' ELSE 'guest' END;
    v_mark := CASE WHEN v_role='host' THEN 'X' ELSE 'O' END;
    v_marks[v_index+1] := v_mark;
    v_state := jsonb_set(v_state,'{board}',to_jsonb(v_marks),false);
    v_moves := COALESCE((v_state->>'moves')::integer,0)+1;
    v_state := jsonb_set(v_state,'{moves}',to_jsonb(v_moves),true);
    v_won := (v_marks[1]=v_mark AND v_marks[2]=v_mark AND v_marks[3]=v_mark)
      OR (v_marks[4]=v_mark AND v_marks[5]=v_mark AND v_marks[6]=v_mark)
      OR (v_marks[7]=v_mark AND v_marks[8]=v_mark AND v_marks[9]=v_mark)
      OR (v_marks[1]=v_mark AND v_marks[4]=v_mark AND v_marks[7]=v_mark)
      OR (v_marks[2]=v_mark AND v_marks[5]=v_mark AND v_marks[8]=v_mark)
      OR (v_marks[3]=v_mark AND v_marks[6]=v_mark AND v_marks[9]=v_mark)
      OR (v_marks[1]=v_mark AND v_marks[5]=v_mark AND v_marks[9]=v_mark)
      OR (v_marks[3]=v_mark AND v_marks[5]=v_mark AND v_marks[7]=v_mark);
    v_draw := NOT v_won AND v_moves=9;
    IF v_won THEN v_status:='completed'; v_winner:=v_uid; v_turn:=NULL;
    ELSIF v_draw THEN v_status:='completed'; v_winner:=NULL; v_turn:=NULL;
    ELSE v_turn:=CASE WHEN v_uid=r.host_id THEN r.guest_id ELSE r.host_id END;
    END IF;
  ELSIF r.game_key='snakes-ladders' THEN
    IF p_action->>'type' <> 'roll' THEN RAISE EXCEPTION 'Roll the dice to take your turn'; END IF;
    v_role := CASE WHEN v_uid=r.host_id THEN 'host' ELSE 'guest' END;
    v_old_pos := COALESCE((v_state->'players'->>v_role)::integer,0);
    v_roll := floor(random()*6)::integer+1;
    v_new_pos := v_old_pos;
    IF v_old_pos+v_roll <= 100 THEN
      v_new_pos := v_old_pos+v_roll;
      v_new_pos := CASE v_new_pos
        WHEN 4 THEN 14 WHEN 9 THEN 31 WHEN 20 THEN 38 WHEN 28 THEN 84 WHEN 40 THEN 59 WHEN 51 THEN 67 WHEN 63 THEN 81 WHEN 71 THEN 91
        WHEN 17 THEN 7 WHEN 54 THEN 34 WHEN 62 THEN 19 WHEN 64 THEN 60 WHEN 87 THEN 36 WHEN 93 THEN 73 WHEN 95 THEN 75 WHEN 99 THEN 78
        ELSE v_new_pos END;
    END IF;
    v_players := jsonb_set(v_state->'players',ARRAY[v_role],to_jsonb(v_new_pos),true);
    v_state := jsonb_set(v_state,'{players}',v_players,true);
    v_state := jsonb_set(v_state,'{last_roll}',to_jsonb(v_roll),true);
    IF v_new_pos=100 THEN v_status:='completed'; v_winner:=v_uid; v_turn:=NULL;
    ELSE v_turn:=CASE WHEN v_uid=r.host_id THEN r.guest_id ELSE r.host_id END;
    END IF;
  ELSE
    RAISE EXCEPTION 'This room does not use a live board';
  END IF;

  UPDATE public.game_duel_rooms SET board_state=v_state,status=v_status,turn_user_id=v_turn,winner_id=v_winner,updated_at=now() WHERE id=r.id;
  RETURN QUERY SELECT v_state,v_status,v_turn,v_winner;
END $$;

REVOKE ALL ON FUNCTION public.play_game_duel_turn(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.play_game_duel_turn(uuid,jsonb) TO authenticated;
