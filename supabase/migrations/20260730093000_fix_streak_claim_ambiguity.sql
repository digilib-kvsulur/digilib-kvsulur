-- Avoid shadowing login_streaks.current_streak with a PL/pgSQL variable.
CREATE OR REPLACE FUNCTION public.claim_streak_points()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE streak_days integer; base_points integer; earned integer; last_claimed date;
BEGIN
  SELECT p.streak_last_claimed INTO last_claimed
  FROM public.profiles p WHERE p.id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF last_claimed = CURRENT_DATE THEN RAISE EXCEPTION 'Today''s streak reward has already been claimed'; END IF;

  SELECT COALESCE(ls.current_streak, 0) INTO streak_days
  FROM public.login_streaks ls WHERE ls.user_id = auth.uid();
  IF COALESCE(streak_days, 0) < 1 THEN RAISE EXCEPTION 'No active streak to claim'; END IF;

  SELECT COALESCE((s.value #>> '{}')::integer, 10) INTO base_points
  FROM public.system_settings s WHERE s.key = 'points_per_daily_streak';
  earned := COALESCE(base_points, 10) * streak_days;
  UPDATE public.profiles
  SET points = COALESCE(points, 0) + earned, streak_last_claimed = CURRENT_DATE
  WHERE id = auth.uid();
  RETURN earned;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_streak_points() TO authenticated;
