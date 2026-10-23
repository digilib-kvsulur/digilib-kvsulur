-- Games Corner: new arcade entries, weekly class standings and secured duel rooms.
INSERT INTO public.games (key, name, description, icon_name, category, is_enabled, points_per_win, max_points_per_day, daily_play_limit, sort_order)
VALUES
  ('logic-grid', 'Logic Grid', 'Crack clues and solve increasingly tricky logic puzzles.', 'Brain', 'logic', true, 15, 45, 3, 25),
  ('map-quest', 'Map Quest', 'Explore geography, maps, landmarks and our planet.', 'Map', 'geography', true, 12, 48, 4, 26),
  ('science-sprint', 'Science Sprint', 'Race through quick science rounds and build your streak.', 'FlaskConical', 'science', true, 12, 48, 4, 27),
  ('code-breakers', 'Code Breakers', 'Solve patterns, logic and beginner coding challenges.', 'Code2', 'coding', true, 15, 45, 3, 28),
  ('eco-sort', 'Eco Sort', 'Make planet-friendly choices in a fast five-round challenge.', 'Leaf', 'environment', true, 12, 48, 4, 29)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.game_challenge_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_key text NOT NULL REFERENCES public.games(key) ON DELETE CASCADE,
  difficulty smallint NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  prompt text NOT NULL,
  options jsonb NOT NULL CHECK (jsonb_typeof(options)='array' AND jsonb_array_length(options) >= 2),
  answer text NOT NULL,
  hint text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.game_challenge_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff manage arcade challenge questions" ON public.game_challenge_questions;
CREATE POLICY "Staff manage arcade challenge questions" ON public.game_challenge_questions FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));
REVOKE ALL ON public.game_challenge_questions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_challenge_questions TO authenticated;

INSERT INTO public.game_challenge_questions(game_key,difficulty,prompt,options,answer,hint) VALUES
('logic-grid',1,'Asha, Ben and Cara chose a mystery, poem and science book. Asha did not choose the poem. Ben chose the mystery. What did Cara choose?','["A mystery","A poem","A science book"]','A poem','Ben has the mystery, and Asha cannot have the poem.'),
('logic-grid',2,'Three books weigh 2, 3 and 5 units. The atlas is heavier than the storybook. The poem is lighter than the storybook. Which weighs 5?','["Atlas","Storybook","Poem"]','Atlas','Order the books from lightest to heaviest.'),
('logic-grid',3,'Mia, Dev and Sam read on Monday, Tuesday and Wednesday. Mia read before Sam. Dev read on Wednesday. When did Mia read?','["Monday","Tuesday","Wednesday"]','Monday','Dev has Wednesday, so Mia must be before Sam.'),
('logic-grid',4,'A red, blue and green bookmark are in three different books. Red is not in the poem. Blue is in the novel. Which color is in the poem?','["Red","Blue","Green"]','Green','Blue is already in the novel.'),
('logic-grid',5,'History is above science. Science is above art. Which subject is on the lowest shelf?','["History","Science","Art"]','Art','Above means a higher shelf.'),
('map-quest',1,'Which imaginary line divides Earth into Northern and Southern Hemispheres?','["Equator","Prime Meridian","Tropic of Cancer"]','Equator','It circles Earth halfway between the poles.'),
('map-quest',2,'Which ocean lies between Africa and Australia?','["Atlantic Ocean","Indian Ocean","Arctic Ocean"]','Indian Ocean','Its name is shared with a large South Asian country.'),
('map-quest',3,'On a map, a compass rose helps you find…','["Directions","Altitude","Population"]','Directions','It shows north, south, east and west.'),
('map-quest',4,'Which continent is the Sahara Desert in?','["Africa","Asia","South America"]','Africa','It is the world’s largest hot desert.'),
('map-quest',5,'Travel east from India across the Bay of Bengal. Which country can you reach?','["Sri Lanka","Myanmar","Maldives"]','Myanmar','It shares a land border with India’s northeast.'),
('science-sprint',1,'What gas do plants absorb from the air during photosynthesis?','["Carbon dioxide","Oxygen","Nitrogen"]','Carbon dioxide','Plants use it with water and sunlight to make food.'),
('science-sprint',2,'What force pulls objects toward Earth?','["Gravity","Friction","Magnetism"]','Gravity','It keeps your feet on the ground.'),
('science-sprint',3,'Which part of a plant absorbs most of its water?','["Roots","Flowers","Leaves"]','Roots','They grow below the soil.'),
('science-sprint',4,'At sea level, water boils at about…','["100°C","50°C","150°C"]','100°C','It is twice 50 degrees Celsius.'),
('science-sprint',5,'Which organ pumps blood around the human body?','["Heart","Lungs","Stomach"]','Heart','It beats continuously.'),
('code-breakers',1,'A robot repeats “move forward” 4 times. How many steps does it move?','["4","3","5"]','4','A repeat count tells how many times a command runs.'),
('code-breakers',2,'Each number increases by 3: 2, 5, 8, __. What comes next?','["11","10","12"]','11','Add 3 to the last number.'),
('code-breakers',3,'Which value is even?','["18","17","21"]','18','An even number divides by 2 with no remainder.'),
('code-breakers',4,'A light turns on only when both switches A and B are on. This is…','["AND","OR","NOT"]','AND','Both conditions must be true.'),
('code-breakers',5,'What does a bug in a computer program usually mean?','["An error","A faster feature","A saved file"]','An error','Programmers debug to find and fix it.'),
('eco-sort',1,'A clean glass bottle should usually go into which waste stream?','["Recycling","Food waste","General waste"]','Recycling','Glass can be processed into new glass.'),
('eco-sort',2,'Which action saves water while brushing your teeth?','["Turn off the tap","Use hotter water","Fill the sink"]','Turn off the tap','Do not let clean water run when you are not using it.'),
('eco-sort',3,'Which item can be composted?','["Fruit peel","Plastic wrapper","Battery"]','Fruit peel','It is natural food waste.'),
('eco-sort',4,'Which choice reduces single-use plastic?','["Carry a reusable bottle","Use two straws","Take a new bag each time"]','Carry a reusable bottle','Use the same item many times.'),
('eco-sort',5,'Switching off an unused light mainly saves…','["Electricity","Paper","Drinking water"]','Electricity','Lights use electrical energy.'),
('logic-grid',1,'Ravi, Noor and Lee each chose a fruit: mango, apple or pear. Noor chose the apple. Ravi did not choose the pear. What did Lee choose?','["Mango","Apple","Pear"]','Pear','Noor already chose the apple, and Ravi cannot take the pear.'),
('logic-grid',2,'The red book is heavier than the green book. The blue book is lighter than the green book. Which book is lightest?','["Red","Green","Blue"]','Blue','Compare the two clues in order.'),
('logic-grid',3,'Three students sit in a row. Ana sits left of Bilal. Chitra sits right of Bilal. Who sits in the middle?','["Ana","Bilal","Chitra"]','Bilal','Bilal has Ana on one side and Chitra on the other.'),
('logic-grid',4,'The library opens before the lab. The lab opens before the art room. Which opens last?','["Library","Lab","Art room"]','Art room','Follow the order from first to last.'),
('logic-grid',5,'Four cards show 1, 2, 3 and 4. The even cards are placed together. Which pair is together?','["1 and 3","2 and 4","1 and 4"]','2 and 4','Even numbers divide by two with no remainder.'),
('map-quest',1,'Which direction is opposite east?','["West","North","South"]','West','It is on the other side of a compass.'),
('map-quest',2,'Which is the largest continent by area?','["Asia","Europe","Australia"]','Asia','It includes many countries in the eastern hemisphere.'),
('map-quest',3,'A map scale is used to compare map distance with…','["Real distance","Temperature","Time zones"]','Real distance','It helps estimate how far apart places are.'),
('map-quest',4,'Which mountain range contains Mount Everest?','["Himalayas","Andes","Alps"]','Himalayas','It stretches across South Asia.'),
('map-quest',5,'Which direction does the sun appear to rise from?','["East","West","South"]','East','It is opposite the direction of sunset.'),
('science-sprint',1,'Which state of matter has a fixed shape?','["Solid","Liquid","Gas"]','Solid','A book is an example of this state.'),
('science-sprint',2,'What do we call animals that eat only plants?','["Herbivores","Carnivores","Omnivores"]','Herbivores','The word begins with “herb”.'),
('science-sprint',3,'Which planet is known as the Red Planet?','["Mars","Venus","Jupiter"]','Mars','Its rusty surface gives it a reddish color.'),
('science-sprint',4,'Which simple machine is a ramp?','["Inclined plane","Pulley","Lever"]','Inclined plane','It is a flat surface set at an angle.'),
('science-sprint',5,'What is the center of an atom called?','["Nucleus","Cell wall","Orbit"]','Nucleus','It contains protons and neutrons.'),
('code-breakers',1,'A sequence doubles each time: 2, 4, 8, __. What comes next?','["16","12","10"]','16','Multiply the last number by 2.'),
('code-breakers',2,'Which symbol commonly starts a comment in many programming languages?','["#","=","+"]','#','It is often used for a note that code does not execute.'),
('code-breakers',3,'If x = 7, what is x + 5?','["12","13","2"]','12','Substitute 7 for x and add.'),
('code-breakers',4,'A condition checks whether a number is greater than 10. If it is 12, the condition is…','["True","False","Unknown"]','True','12 is greater than 10.'),
('code-breakers',5,'Which data type best represents a yes-or-no value?','["Boolean","Decimal","Text"]','Boolean','It has two possible values: true and false.'),
('eco-sort',1,'Which item is reusable instead of disposable?','["Cloth shopping bag","Plastic carry bag","Paper napkin"]','Cloth shopping bag','It can be used many times.'),
('eco-sort',2,'What should you do with an electronic battery?','["Take it to a proper collection point","Put it in compost","Leave it outdoors"]','Take it to a proper collection point','Batteries need special handling.'),
('eco-sort',3,'Which travel choice usually creates fewer emissions for a short trip?','["Walk","Drive alone","Take a taxi alone"]','Walk','It uses no fuel.'),
('eco-sort',4,'What is a good way to reduce food waste?','["Plan meals and use leftovers","Buy extra food each day","Throw away older food first"]','Plan meals and use leftovers','Use what you already have before buying more.'),
('eco-sort',5,'Rainwater harvesting helps conserve…','["Water","Plastic","Electricity"]','Water','It collects and stores rainfall for later use.');

CREATE TABLE IF NOT EXISTS public.game_round_question_links (
  session_id uuid NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.game_challenge_questions(id) ON DELETE CASCADE,
  question_order smallint NOT NULL,
  PRIMARY KEY(session_id,question_id),
  UNIQUE(session_id,question_order)
);
ALTER TABLE public.game_round_question_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.game_round_question_links FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.start_arcade_challenge(p_game_key text)
RETURNS TABLE(session_id uuid, questions jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid:=auth.uid(); v_session uuid; v_game public.games%ROWTYPE; v_questions jsonb;
BEGIN
  IF v_uid IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=v_uid AND role='student' AND COALESCE(is_approved,true)) THEN RAISE EXCEPTION 'Approved students only'; END IF;
  SELECT * INTO v_game FROM public.games WHERE key=p_game_key AND is_enabled;
  IF v_game.id IS NULL THEN RAISE EXCEPTION 'Game unavailable'; END IF;
  PERFORM 1 FROM public.profiles WHERE id=v_uid FOR UPDATE;
  IF v_game.daily_play_limit > 0 AND (SELECT count(*) FROM public.game_plays WHERE user_id=v_uid AND game_key=p_game_key AND played_at::date=CURRENT_DATE) >= v_game.daily_play_limit THEN RAISE EXCEPTION 'Daily play limit reached'; END IF;
  INSERT INTO public.game_sessions(user_id,game_key) VALUES(v_uid,p_game_key) RETURNING id INTO v_session;
  WITH selected AS (
    SELECT q.*,row_number() OVER(PARTITION BY q.difficulty ORDER BY md5(q.id::text||CURRENT_DATE::text||v_uid::text)) AS pick
    FROM public.game_challenge_questions q WHERE q.game_key=p_game_key AND q.is_active
  ), chosen AS (
    SELECT * FROM selected WHERE pick=1 ORDER BY difficulty LIMIT 5
  ), linked AS (
    INSERT INTO public.game_round_question_links(session_id,question_id,question_order)
    SELECT v_session,id,row_number() OVER(ORDER BY difficulty)::smallint FROM chosen RETURNING question_id,question_order
  )
  SELECT jsonb_agg(jsonb_build_object('id',q.id,'prompt',q.prompt,'options',q.options,'hint',q.hint,'difficulty',q.difficulty) ORDER BY l.question_order)
  INTO v_questions FROM linked l JOIN public.game_challenge_questions q ON q.id=l.question_id;
  IF jsonb_array_length(COALESCE(v_questions,'[]'::jsonb)) <> 5 THEN RAISE EXCEPTION 'Challenge questions are being prepared'; END IF;
  RETURN QUERY SELECT v_session,v_questions;
END $$;

CREATE OR REPLACE FUNCTION public.complete_arcade_challenge(p_session_id uuid,p_answers jsonb)
RETURNS TABLE(play_id uuid,points_awarded integer,correct_answers integer,is_win boolean,message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid:=auth.uid(); v_session public.game_sessions%ROWTYPE; v_game public.games%ROWTYPE; v_answer jsonb; v_q uuid; v_text text; v_correct integer:=0; v_score integer; v_points integer:=0; v_day_points integer; v_game_points integer; v_play_id uuid; v_done boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM 1 FROM public.profiles WHERE id=v_uid FOR UPDATE;
  SELECT * INTO v_session FROM public.game_sessions WHERE id=p_session_id AND user_id=v_uid FOR UPDATE;
  IF v_session.id IS NULL OR v_session.consumed_at IS NOT NULL OR v_session.game_key NOT IN ('logic-grid','map-quest','science-sprint','code-breakers','eco-sort') THEN RAISE EXCEPTION 'Challenge session is invalid or already used'; END IF;
  IF jsonb_typeof(p_answers)<>'array' OR jsonb_array_length(p_answers)<>5 THEN RAISE EXCEPTION 'Submit all five round answers'; END IF;
  IF now()-v_session.started_at < interval '8 seconds' OR now()-v_session.started_at > interval '20 minutes' THEN RAISE EXCEPTION 'Challenge timing could not be verified'; END IF;
  IF (SELECT count(*) FROM (SELECT DISTINCT value->>'question_id' FROM jsonb_array_elements(p_answers)) a) <> 5 THEN RAISE EXCEPTION 'Each round must be answered once'; END IF;
  FOR v_answer IN SELECT value FROM jsonb_array_elements(p_answers) LOOP
    v_q:=(v_answer->>'question_id')::uuid; v_text:=COALESCE(v_answer->>'answer','');
    IF NOT EXISTS(SELECT 1 FROM public.game_round_question_links WHERE session_id=p_session_id AND question_id=v_q) THEN RAISE EXCEPTION 'Answer does not belong to this challenge'; END IF;
    IF EXISTS(SELECT 1 FROM public.game_challenge_questions WHERE id=v_q AND lower(btrim(answer))=lower(btrim(v_text))) THEN v_correct:=v_correct+1; END IF;
  END LOOP;
  UPDATE public.game_sessions SET consumed_at=now() WHERE id=p_session_id;
  SELECT * INTO v_game FROM public.games WHERE key=v_session.game_key AND is_enabled;
  IF v_game.id IS NULL THEN RAISE EXCEPTION 'Game unavailable'; END IF;
  SELECT COALESCE(sum(points_earned),0)::int INTO v_day_points FROM public.game_plays WHERE user_id=v_uid AND played_at::date=CURRENT_DATE;
  SELECT COALESCE(sum(points_earned),0)::int INTO v_game_points FROM public.game_plays WHERE user_id=v_uid AND game_key=v_session.game_key AND played_at::date=CURRENT_DATE;
  IF v_game.daily_play_limit > 0 AND (SELECT count(*) FROM public.game_plays WHERE user_id=v_uid AND game_key=v_session.game_key AND played_at::date=CURRENT_DATE) >= v_game.daily_play_limit THEN RAISE EXCEPTION 'Daily play limit reached'; END IF;
  v_done:=v_correct>=3; v_score:=v_correct*20;
  IF v_done THEN
    v_points:=GREATEST(LEAST(COALESCE(v_game.points_per_win,0),1000-v_day_points),0);
    IF v_game.max_points_per_day>0 THEN v_points:=GREATEST(LEAST(v_points,v_game.max_points_per_day-v_game_points),0); END IF;
  END IF;
  INSERT INTO public.game_plays(user_id,game_id,game_key,score,points_earned,duration_seconds,is_win,client_nonce,session_id,was_offline)
    VALUES(v_uid,v_game.id,v_game.key,v_score,v_points,EXTRACT(EPOCH FROM (now()-v_session.started_at))::int,v_done,'arcade:'||p_session_id,p_session_id,false) RETURNING id INTO v_play_id;
  IF v_points>0 THEN UPDATE public.profiles SET points=COALESCE(points,0)+v_points WHERE id=v_uid; END IF;
  RETURN QUERY SELECT v_play_id,v_points,v_correct,v_done,CASE WHEN v_day_points+v_points>=1000 THEN 'Daily Games Corner limit of 1,000 XP reached.' WHEN v_points=0 AND v_done THEN 'Challenge cleared. Your daily game XP cap has been reached.' ELSE 'Challenge result verified.' END;
END $$;
GRANT EXECUTE ON FUNCTION public.start_arcade_challenge(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_arcade_challenge(uuid,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.start_arcade_challenge(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_arcade_challenge(uuid,jsonb) FROM PUBLIC, anon;

-- Serialize all existing game XP awards per student so the shared daily cap
-- cannot be exceeded by two simultaneous completions.
CREATE OR REPLACE FUNCTION public.record_game_play_v2(p_game_key text, p_score integer, p_is_win boolean, p_duration_seconds integer, p_session_id uuid DEFAULT NULL::uuid, p_client_nonce text DEFAULT NULL::text, p_answers jsonb DEFAULT NULL::jsonb, p_offline boolean DEFAULT false)
RETURNS TABLE(points_awarded integer, plays_left integer, message text, verified boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_uid uuid := auth.uid(); g record; s record;
  v_plays integer; v_today_pts integer; v_all_today integer; v_recent integer;
  v_pts integer := 0; v_win boolean := COALESCE(p_is_win,false);
  v_score integer := GREATEST(COALESCE(p_score,0),0); v_dur integer := GREATEST(COALESCE(p_duration_seconds,0),0);
  v_verified boolean := true; v_msg text := 'Play recorded.'; a jsonb; v_expected text;
  c_daily_cap constant integer := 1000;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM 1 FROM public.profiles WHERE id=v_uid FOR UPDATE;
  SELECT * INTO g FROM public.games WHERE key=p_game_key;
  IF g IS NULL OR NOT g.is_enabled THEN RETURN QUERY SELECT 0,0,'This game is currently unavailable.',false; RETURN; END IF;
  IF p_client_nonce IS NOT NULL AND EXISTS(SELECT 1 FROM public.game_plays WHERE user_id=v_uid AND client_nonce=p_client_nonce) THEN RETURN QUERY SELECT 0,0,'This round was already submitted.',false; RETURN; END IF;
  IF p_session_id IS NOT NULL THEN
    SELECT * INTO s FROM public.game_sessions WHERE id=p_session_id AND user_id=v_uid;
    IF s IS NULL OR s.consumed_at IS NOT NULL OR s.game_key<>p_game_key THEN v_verified:=false; v_win:=false; v_msg:='Round could not be verified.';
    ELSE UPDATE public.game_sessions SET consumed_at=now() WHERE id=p_session_id; v_dur:=GREATEST(EXTRACT(EPOCH FROM(now()-s.started_at))::int,0); END IF;
  ELSIF NOT p_offline THEN v_verified:=false; v_win:=false; v_msg:='Round could not be verified.';
  END IF;
  IF v_verified AND v_dur<COALESCE(g.min_duration_seconds,5) THEN v_verified:=false; v_win:=false; v_msg:='Round finished too quickly to count.'; END IF;
  IF v_verified AND v_dur>7200 THEN v_verified:=false; v_win:=false; v_msg:='Round took too long to count.'; END IF;
  IF v_score>COALESCE(g.max_score,100000) THEN v_verified:=false; v_win:=false; v_msg:='Reported score is out of range.'; v_score:=LEAST(v_score,COALESCE(g.max_score,100000)); END IF;
  SELECT count(*) INTO v_recent FROM public.game_plays WHERE user_id=v_uid AND played_at>now()-interval '5 minutes';
  IF v_recent>=10 THEN v_verified:=false; v_win:=false; v_msg:='Too many rounds too quickly — slow down to earn points.'; END IF;
  IF v_verified AND p_answers IS NOT NULL AND jsonb_typeof(p_answers)='array' THEN
    FOR a IN SELECT jsonb_array_elements(p_answers) LOOP
      SELECT COALESCE(NULLIF(extra->>'answer',''),value) INTO v_expected FROM public.game_content WHERE id=(a->>'id')::uuid AND game_key=p_game_key;
      IF v_expected IS NULL OR lower(regexp_replace(COALESCE(a->>'answer',''),'[^a-zA-Z0-9]','','g'))<>lower(regexp_replace(v_expected,'[^a-zA-Z0-9]','','g')) THEN
        v_verified:=false; v_win:=false; v_msg:='Answers did not match the library content.'; EXIT;
      END IF;
    END LOOP;
  END IF;
  SELECT COUNT(*)::int,COALESCE(SUM(points_earned),0)::int INTO v_plays,v_today_pts FROM public.game_plays WHERE user_id=v_uid AND game_key=p_game_key AND played_at::date=CURRENT_DATE;
  SELECT COALESCE(SUM(points_earned),0)::int INTO v_all_today FROM public.game_plays WHERE user_id=v_uid AND played_at::date=CURRENT_DATE;
  IF g.daily_play_limit>0 AND v_plays>=g.daily_play_limit THEN
    INSERT INTO public.game_plays(user_id,game_id,game_key,score,points_earned,duration_seconds,is_win,client_nonce,session_id,was_offline)
    VALUES(v_uid,g.id,p_game_key,v_score,0,v_dur,v_win,p_client_nonce,p_session_id,p_offline);
    RETURN QUERY SELECT 0,0,'Daily play limit reached — no more points today.',v_verified; RETURN;
  END IF;
  IF v_win AND v_verified THEN
    v_pts:=GREATEST(g.points_per_win,0);
    IF g.max_points_per_day>0 THEN v_pts:=GREATEST(LEAST(v_pts,g.max_points_per_day-v_today_pts),0); END IF;
    v_pts:=GREATEST(LEAST(v_pts,c_daily_cap-v_all_today),0);
    v_msg:=CASE WHEN v_pts=0 AND v_all_today>=c_daily_cap THEN 'Daily Games Corner limit of 1000 XP reached.' ELSE 'Nice work!' END;
  END IF;
  INSERT INTO public.game_plays(user_id,game_id,game_key,score,points_earned,duration_seconds,is_win,client_nonce,session_id,was_offline)
  VALUES(v_uid,g.id,p_game_key,v_score,v_pts,v_dur,v_win,p_client_nonce,p_session_id,p_offline);
  IF v_pts>0 THEN UPDATE public.profiles SET points=COALESCE(points,0)+v_pts WHERE id=v_uid; END IF;
  RETURN QUERY SELECT v_pts,CASE WHEN g.daily_play_limit>0 THEN GREATEST(g.daily_play_limit-v_plays-1,0) ELSE 999 END,v_msg,v_verified;
END; $function$;

CREATE OR REPLACE FUNCTION public.get_game_weekly_class_standings()
RETURNS TABLE(student_class text, total_xp bigint, students bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(NULLIF(btrim(p.student_class), ''), 'Unassigned') AS student_class,
         COALESCE(SUM(gp.points_earned), 0)::bigint AS total_xp,
         COUNT(DISTINCT p.id)::bigint AS students
  FROM public.profiles p
  LEFT JOIN public.game_plays gp ON gp.user_id = p.id
    AND gp.played_at >= date_trunc('week', now())
    AND gp.played_at < date_trunc('week', now()) + interval '7 days'
  WHERE p.role = 'student' AND COALESCE(p.is_approved, true)
  GROUP BY COALESCE(NULLIF(btrim(p.student_class), ''), 'Unassigned')
  ORDER BY total_xp DESC, student_class ASC;
$$;
GRANT EXECUTE ON FUNCTION public.get_game_weekly_class_standings() TO authenticated;
REVOKE ALL ON FUNCTION public.get_game_weekly_class_standings() FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.get_game_progress()
RETURNS TABLE(total_xp integer,today_xp integer,total_plays integer,wins integer,current_streak integer,level integer,xp_to_next integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  WITH mine AS (
    SELECT COALESCE(SUM(points_earned),0)::int xp,COUNT(*)::int plays,COUNT(*) FILTER(WHERE is_win)::int wins,
           COALESCE(SUM(points_earned) FILTER(WHERE played_at::date=CURRENT_DATE),0)::int today_xp
    FROM public.game_plays WHERE user_id=auth.uid()
  ), active_days AS (
    SELECT DISTINCT played_at::date AS played_day FROM public.game_plays WHERE user_id=auth.uid()
  ), anchor AS (
    SELECT CASE WHEN EXISTS(SELECT 1 FROM active_days WHERE played_day=CURRENT_DATE) THEN CURRENT_DATE ELSE CURRENT_DATE-1 END AS day
  ), streak AS (
    SELECT COUNT(*)::int AS days FROM (
      SELECT played_day,row_number() OVER(ORDER BY played_day DESC) AS rn FROM active_days,anchor WHERE played_day<=anchor.day
    ) ranked,anchor WHERE ranked.played_day=anchor.day-(ranked.rn::int-1)
  ), level_data AS (
    SELECT GREATEST(floor(mine.xp/250.0)::int+1,1) AS level,mine.xp FROM mine
  )
  SELECT mine.xp,mine.today_xp,mine.plays,mine.wins,COALESCE(streak.days,0),level_data.level,(level_data.level*250-level_data.xp)
  FROM mine CROSS JOIN level_data LEFT JOIN streak ON true;
$$;
GRANT EXECUTE ON FUNCTION public.get_game_progress() TO authenticated;
REVOKE ALL ON FUNCTION public.get_game_progress() FROM PUBLIC, anon;

CREATE TABLE IF NOT EXISTS public.game_duel_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code text NOT NULL UNIQUE,
  game_key text NOT NULL REFERENCES public.games(key) ON DELETE CASCADE,
  host_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  guest_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','active','completed','cancelled','expired')),
  host_play_id uuid REFERENCES public.game_plays(id) ON DELETE SET NULL,
  guest_play_id uuid REFERENCES public.game_plays(id) ON DELETE SET NULL,
  winner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '15 minutes',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (guest_id IS NULL OR guest_id <> host_id)
);
CREATE INDEX IF NOT EXISTS game_duel_rooms_active_idx ON public.game_duel_rooms(status, expires_at);
ALTER TABLE public.game_duel_rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Duel participants can view room" ON public.game_duel_rooms;
CREATE POLICY "Duel participants can view room" ON public.game_duel_rooms FOR SELECT TO authenticated
  USING (auth.uid() = host_id OR auth.uid() = guest_id OR public.is_staff_or_admin(auth.uid()));
REVOKE INSERT, UPDATE, DELETE ON public.game_duel_rooms FROM authenticated, anon;
GRANT SELECT ON public.game_duel_rooms TO authenticated;

CREATE OR REPLACE FUNCTION public.create_game_duel(p_game_key text)
RETURNS TABLE(room_id uuid, room_code text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_code text; v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid AND role = 'student' AND COALESCE(is_approved,true)) THEN
    RAISE EXCEPTION 'Approved students only';
  END IF;
  IF p_game_key NOT IN ('logic-grid','map-quest','science-sprint','code-breakers','eco-sort') THEN RAISE EXCEPTION 'Choose a server-verified arcade game'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.games WHERE key = p_game_key AND is_enabled) THEN RAISE EXCEPTION 'Game unavailable'; END IF;
  UPDATE public.game_duel_rooms SET status='expired', updated_at=now() WHERE status IN ('waiting','active') AND expires_at < now();
  v_code := upper(substr(encode(gen_random_bytes(8),'hex'),1,6));
  INSERT INTO public.game_duel_rooms(room_code,game_key,host_id) VALUES(v_code,p_game_key,v_uid) RETURNING id INTO v_id;
  RETURN QUERY SELECT v_id,v_code;
END $$;

CREATE OR REPLACE FUNCTION public.join_game_duel(p_room_code text)
RETURNS TABLE(room_id uuid, game_key text, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); r public.game_duel_rooms%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=v_uid AND role='student' AND COALESCE(is_approved,true)) THEN RAISE EXCEPTION 'Approved students only'; END IF;
  SELECT * INTO r FROM public.game_duel_rooms WHERE room_code=upper(btrim(p_room_code)) FOR UPDATE;
  IF r.id IS NULL OR r.expires_at < now() OR r.status <> 'waiting' THEN RAISE EXCEPTION 'Room is unavailable'; END IF;
  IF r.host_id = v_uid THEN RAISE EXCEPTION 'You cannot join your own room'; END IF;
  UPDATE public.game_duel_rooms SET guest_id=v_uid,status='active',updated_at=now(),expires_at=now()+interval '15 minutes' WHERE id=r.id;
  RETURN QUERY SELECT r.id,r.game_key,'active'::text;
END $$;

CREATE OR REPLACE FUNCTION public.submit_game_duel_play(p_room_id uuid,p_play_id uuid)
RETURNS TABLE(status text,winner_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); r public.game_duel_rooms%ROWTYPE; p public.game_plays%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO r FROM public.game_duel_rooms WHERE id=p_room_id FOR UPDATE;
  IF r.id IS NULL OR r.status <> 'active' OR r.expires_at < now() OR v_uid NOT IN (r.host_id,r.guest_id) THEN RAISE EXCEPTION 'Duel is unavailable'; END IF;
  SELECT * INTO p FROM public.game_plays WHERE id=p_play_id AND user_id=v_uid AND game_key=r.game_key;
  IF p.id IS NULL OR p.played_at < r.created_at OR p.client_nonce NOT LIKE 'arcade:%' THEN RAISE EXCEPTION 'A verified arcade round for this duel is required'; END IF;
  IF v_uid=r.host_id THEN
    IF r.host_play_id IS NOT NULL THEN RAISE EXCEPTION 'Play already submitted'; END IF;
    UPDATE public.game_duel_rooms SET host_play_id=p.id,updated_at=now() WHERE id=r.id;
  ELSE
    IF r.guest_play_id IS NOT NULL THEN RAISE EXCEPTION 'Play already submitted'; END IF;
    UPDATE public.game_duel_rooms SET guest_play_id=p.id,updated_at=now() WHERE id=r.id;
  END IF;
  SELECT * INTO r FROM public.game_duel_rooms WHERE id=p_room_id;
  IF r.host_play_id IS NOT NULL AND r.guest_play_id IS NOT NULL THEN
    UPDATE public.game_duel_rooms SET status='completed',winner_id=(SELECT CASE WHEN h.score>g.score THEN r.host_id WHEN g.score>h.score THEN r.guest_id ELSE NULL END FROM public.game_plays h,public.game_plays g WHERE h.id=r.host_play_id AND g.id=r.guest_play_id),updated_at=now() WHERE id=r.id RETURNING * INTO r;
  END IF;
  RETURN QUERY SELECT r.status,r.winner_id;
END $$;
GRANT EXECUTE ON FUNCTION public.create_game_duel(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_game_duel(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_game_duel_play(uuid,uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.create_game_duel(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_game_duel(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_game_duel_play(uuid,uuid) FROM PUBLIC, anon;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='game_duel_rooms') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.game_duel_rooms;
  END IF;
END $$;
