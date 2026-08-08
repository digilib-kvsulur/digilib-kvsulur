-- Fix claim_streak_points to apply the same tier multipliers shown in the UI
-- Tiers (matching LoginStreakCard.tsx):
--   streak >= 28 → 2.0×
--   streak >= 14 → 1.8×
--   streak >= 7  → 1.5×
--   streak >= 3  → 1.2×
--   else         → 1.0×

CREATE OR REPLACE FUNCTION public.claim_streak_points()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  streak_days  integer;
  base_points  integer;
  multiplier   numeric;
  earned       integer;
  last_claimed date;
BEGIN
  -- Guard: already claimed today?
  SELECT p.streak_last_claimed INTO last_claimed
  FROM public.profiles p WHERE p.id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF last_claimed = CURRENT_DATE THEN
    RAISE EXCEPTION 'Today''s streak reward has already been claimed';
  END IF;

  -- Current streak length
  SELECT COALESCE(ls.current_streak, 0) INTO streak_days
  FROM public.login_streaks ls WHERE ls.user_id = auth.uid();
  IF COALESCE(streak_days, 0) < 1 THEN
    RAISE EXCEPTION 'No active streak to claim';
  END IF;

  -- Base points per day from settings (default 10)
  SELECT COALESCE((s.value #>> '{}')::integer, 10) INTO base_points
  FROM public.system_settings s WHERE s.key = 'points_per_daily_streak';
  base_points := COALESCE(base_points, 10);

  -- Apply tier multiplier (mirrors LoginStreakCard.tsx getStreakMultiplier)
  IF    streak_days >= 28 THEN multiplier := 2.0;
  ELSIF streak_days >= 14 THEN multiplier := 1.8;
  ELSIF streak_days >= 7  THEN multiplier := 1.5;
  ELSIF streak_days >= 3  THEN multiplier := 1.2;
  ELSE                        multiplier := 1.0;
  END IF;

  -- earned = base × multiplier (rounded)
  earned := ROUND(base_points * multiplier);

  UPDATE public.profiles
  SET points              = COALESCE(points, 0) + earned,
      streak_last_claimed = CURRENT_DATE
  WHERE id = auth.uid();

  RETURN earned;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_streak_points() TO authenticated;
