
-- Add DELETE policy for book_requests so admins can delete
CREATE POLICY "Admins can delete requests"
ON public.book_requests FOR DELETE
TO authenticated
USING (get_profile_role(auth.uid()) = 'admin');

-- Create login_streaks table
CREATE TABLE public.login_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_login_date DATE,
  total_login_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.login_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streaks"
ON public.login_streaks FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR get_profile_role(auth.uid()) = 'admin');

CREATE POLICY "Users can insert own streaks"
ON public.login_streaks FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own streaks"
ON public.login_streaks FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Function to record a login and update streak
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

  -- Check if consecutive day
  IF v_last_login = v_today - 1 THEN
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
  WHERE login_streaks.user_id = p_user_id;

  RETURN QUERY SELECT v_current_streak, v_longest_streak, v_total_days;
END;
$$;
