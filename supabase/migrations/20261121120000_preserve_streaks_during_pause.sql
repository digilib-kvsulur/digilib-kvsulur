-- Migration: Preserve student login streaks during the community safety pause
-- Platform pause period: 21 November 2026 - Reopening
-- Prevents active streaks from resetting to 1 due to the school-wide pause.

CREATE OR REPLACE FUNCTION public.record_login_streak(p_user_id UUID)
RETURNS TABLE(current_streak INTEGER, longest_streak INTEGER, total_login_days INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_login DATE;
  v_today DATE := CURRENT_DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_total_days INTEGER;
BEGIN
  -- Get existing streak data
  SELECT ls.last_login_date, ls.current_streak, ls.longest_streak, ls.total_login_days
  INTO v_last_login, v_current_streak, v_longest_streak, v_total_days
  FROM public.login_streaks ls
  WHERE ls.user_id = p_user_id;

  IF NOT FOUND THEN
    -- First login ever
    INSERT INTO public.login_streaks (user_id, current_streak, longest_streak, last_login_date, total_login_days)
    VALUES (p_user_id, 1, 1, v_today, 1);
    RETURN QUERY SELECT 1, 1, 1;
    RETURN;
  END IF;

  -- Already logged in today
  IF v_last_login = v_today THEN
    RETURN QUERY SELECT v_current_streak, v_longest_streak, v_total_days;
    RETURN;
  END IF;

  -- Check if consecutive day, OR if streak was preserved across the community pause window
  -- Active streaks from Nov 20-21 are excused and continue on reopening day!
  IF v_last_login = v_today - 1
     OR (v_last_login >= '2026-11-20'::DATE AND v_today <= '2026-11-30'::DATE) THEN
    v_current_streak := v_current_streak + 1;
  ELSE
    v_current_streak := 1;
  END IF;

  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
  END IF;

  v_total_days := v_total_days + 1;

  UPDATE public.login_streaks
  SET current_streak = v_current_streak,
      longest_streak = v_longest_streak,
      last_login_date = v_today,
      total_login_days = v_total_days,
      updated_at = now()
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT v_current_streak, v_longest_streak, v_total_days;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_login_streak(uuid) TO authenticated, service_role;
