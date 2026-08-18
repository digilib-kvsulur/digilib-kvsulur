-- Migration: Allow public/anonymous visitors to view student portfolio stats securely via security definer function
CREATE OR REPLACE FUNCTION public.get_public_portfolio_data(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_books_read INT;
  v_quizzes_passed INT;
  v_badges INT;
  v_goals_completed INT;
  v_monthly_read INT;
  v_streak INT;
  v_class_rank INT;
  v_points INT;
  v_class TEXT;
  v_milestones JSONB;
  v_activity_log JSONB;
  v_month_start TIMESTAMPTZ;
BEGIN
  -- Get user info
  SELECT points, student_class INTO v_points, v_class FROM public.profiles WHERE id = target_user_id;
  
  -- Calculate counts
  SELECT COUNT(*)::INT INTO v_books_read FROM public.reading_history WHERE user_id = target_user_id;
  SELECT COUNT(*)::INT INTO v_quizzes_passed FROM public.quiz_results WHERE user_id = target_user_id;
  SELECT COUNT(*)::INT INTO v_badges FROM public.badge_awards WHERE user_id = target_user_id;
  SELECT COUNT(*)::INT INTO v_goals_completed FROM public.challenge_progress WHERE user_id = target_user_id AND is_completed = true;
  
  v_month_start := date_trunc('month', now());
  SELECT COUNT(*)::INT INTO v_monthly_read FROM public.reading_history 
  WHERE user_id = target_user_id AND completed_date >= v_month_start;
  
  SELECT current_streak INTO v_streak FROM public.login_streaks WHERE user_id = target_user_id;
  IF v_streak IS NULL THEN
    v_streak := 0;
  END IF;

  -- Get rank
  IF v_class IS NOT NULL AND v_points IS NOT NULL THEN
    SELECT (COUNT(*) + 1)::INT INTO v_class_rank 
    FROM public.profiles 
    WHERE student_class = v_class AND points > v_points AND is_approved = true;
  ELSE
    v_class_rank := NULL;
  END IF;

  -- Milestones (badges + challenges)
  SELECT coalesce(jsonb_agg(m), '[]'::jsonb) INTO v_milestones FROM (
    SELECT 'badge' as type, b.name as title, b.description, a.awarded_at as date
    FROM public.badge_awards a
    JOIN public.badges b ON a.badge_id = b.id
    WHERE a.user_id = target_user_id
    UNION ALL
    SELECT 'challenge' as type, c.title, 'Earned ' || c.reward_points || ' bonus points.' as description, p.completed_at as date
    FROM public.challenge_progress p
    JOIN public.challenges c ON p.challenge_id = c.id
    WHERE p.user_id = target_user_id AND p.is_completed = true
    ORDER BY date DESC
    LIMIT 5
  ) m;

  -- Activity Log
  SELECT coalesce(jsonb_agg(log_row), '[]'::jsonb) INTO v_activity_log FROM (
    SELECT completed_date::date::text as date, COUNT(*)::int as value
    FROM public.reading_history
    WHERE user_id = target_user_id AND completed_date IS NOT NULL
    GROUP BY completed_date::date
  ) log_row;

  RETURN jsonb_build_object(
    'booksRead', v_books_read,
    'quizzesPassed', v_quizzes_passed,
    'points', COALESCE(v_points, 0),
    'badges', v_badges,
    'goalsCompleted', v_goals_completed,
    'monthlyRead', v_monthly_read,
    'streak', v_streak,
    'classRank', COALESCE(v_class_rank::text, '—'),
    'milestones', v_milestones,
    'activityLog', v_activity_log
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_portfolio_data(UUID) TO anon, authenticated;
