CREATE OR REPLACE FUNCTION public.admin_increase_login_streak(p_user_id uuid, p_days integer)
RETURNS TABLE(previous_streak integer, new_streak integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous integer;
BEGIN
  IF auth.uid() IS NULL OR public.get_profile_role(auth.uid()) IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL OR p_days IS NULL OR p_days < 1 OR p_days > 3650 THEN
    RAISE EXCEPTION 'Days to add must be between 1 and 3650' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND role = 'student') THEN
    RAISE EXCEPTION 'Student not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.login_streaks AS current_record
    (user_id, current_streak, longest_streak, total_login_days, last_login_date, updated_at)
  VALUES (p_user_id, p_days, p_days, p_days, current_date, now())
  ON CONFLICT (user_id) DO UPDATE
    SET current_streak = current_record.current_streak + p_days,
        longest_streak = greatest(current_record.longest_streak, current_record.current_streak + p_days),
        total_login_days = current_record.total_login_days + p_days,
        last_login_date = current_date,
        updated_at = now()
  RETURNING current_record.current_streak - p_days, current_record.current_streak
  INTO v_previous, new_streak;

  previous_streak := v_previous;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_increase_login_streak(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_increase_login_streak(uuid, integer) TO authenticated;
