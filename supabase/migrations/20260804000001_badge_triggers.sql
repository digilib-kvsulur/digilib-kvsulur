
-- Database function to check and award badges
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_badge RECORD;
  v_val INTEGER;
  v_books_read INTEGER;
  v_quizzes_completed INTEGER;
  v_current_streak INTEGER;
  v_posts_count INTEGER;
  v_comments_count INTEGER;
  v_friends_count INTEGER;
  v_books_issued INTEGER;
  v_reviews_count INTEGER;
  v_points INTEGER;
BEGIN
  -- Fetch current stats
  SELECT COALESCE(points, 0) INTO v_points FROM public.profiles WHERE id = p_user_id;
  
  SELECT COUNT(*)::integer INTO v_books_read FROM public.reading_history WHERE user_id = p_user_id AND status = 'approved';
  SELECT COUNT(*)::integer INTO v_quizzes_completed FROM public.quiz_results WHERE user_id = p_user_id;
  SELECT COALESCE(current_streak, 0) INTO v_current_streak FROM public.login_streaks WHERE user_id = p_user_id;
  SELECT COUNT(*)::integer INTO v_posts_count FROM public.posts WHERE user_id = p_user_id;
  SELECT COUNT(*)::integer INTO v_comments_count FROM public.post_comments WHERE user_id = p_user_id;
  
  SELECT COUNT(*)::integer INTO v_friends_count FROM public.friendships 
  WHERE (requester_id = p_user_id OR addressee_id = p_user_id) AND status = 'accepted';
  
  SELECT COUNT(*)::integer INTO v_books_issued FROM public.book_issues WHERE user_id = p_user_id;
  SELECT COUNT(*)::integer INTO v_reviews_count FROM public.book_reviews WHERE user_id = p_user_id;

  -- Loop through active auto-badges
  FOR v_badge IN 
    SELECT * FROM public.badges WHERE is_active = true AND criteria_type IS NOT NULL AND criteria_type <> 'manual'
  LOOP
    -- Get metric value
    CASE v_badge.criteria_type
      WHEN 'points' THEN v_val := v_points;
      WHEN 'books_read' THEN v_val := v_books_read;
      WHEN 'quizzes_completed' THEN v_val := v_quizzes_completed;
      WHEN 'login_streak' THEN v_val := v_current_streak;
      WHEN 'posts_count' THEN v_val := v_posts_count;
      WHEN 'comments_count' THEN v_val := v_comments_count;
      WHEN 'friends_count' THEN v_val := v_friends_count;
      WHEN 'books_issued' THEN v_val := v_books_issued;
      WHEN 'reviews_count' THEN v_val := v_reviews_count;
      ELSE v_val := 0;
    END CASE;

    -- Award if qualifies and not already awarded
    IF v_val >= COALESCE(v_badge.criteria_value, 0) THEN
      INSERT INTO public.badge_awards (user_id, badge_id, award_type)
      VALUES (p_user_id, v_badge.id, 'auto')
      ON CONFLICT (user_id, badge_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Expose function as RPC for frontend calls
GRANT EXECUTE ON FUNCTION public.check_and_award_badges(uuid) TO authenticated;

-- Trigger functions for auto-awarding on inserts/updates
CREATE OR REPLACE FUNCTION public.tg_check_user_badges()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.check_and_award_badges(OLD.user_id);
    RETURN OLD;
  END IF;
  PERFORM public.check_and_award_badges(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers for various tables
DROP TRIGGER IF EXISTS trg_profile_points_badge ON public.profiles;
CREATE TRIGGER trg_profile_points_badge
  AFTER UPDATE OF points ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_check_user_badges();

DROP TRIGGER IF EXISTS trg_reading_badge ON public.reading_history;
CREATE TRIGGER trg_reading_badge
  AFTER INSERT OR UPDATE ON public.reading_history
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_check_user_badges();

DROP TRIGGER IF EXISTS trg_quiz_badge ON public.quiz_results;
CREATE TRIGGER trg_quiz_badge
  AFTER INSERT ON public.quiz_results
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_check_user_badges();

DROP TRIGGER IF EXISTS trg_streak_badge ON public.login_streaks;
CREATE TRIGGER trg_streak_badge
  AFTER INSERT OR UPDATE ON public.login_streaks
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_check_user_badges();

