CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  b record;
  v_val integer;
  v_awarded integer := 0;
BEGIN
  IF p_user_id IS NULL THEN RETURN 0; END IF;
  IF auth.uid() IS DISTINCT FROM p_user_id AND NOT public.is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  FOR b IN SELECT * FROM public.badges WHERE is_active = true AND criteria_type IS NOT NULL AND criteria_value IS NOT NULL LOOP
    IF EXISTS (SELECT 1 FROM public.badge_awards WHERE user_id = p_user_id AND badge_id = b.id) THEN
      CONTINUE;
    END IF;

    v_val := CASE b.criteria_type
      WHEN 'books_read' THEN (SELECT COUNT(*)::int FROM public.reading_history WHERE user_id = p_user_id AND status = 'approved')
      WHEN 'books_issued' THEN (SELECT COUNT(*)::int FROM public.book_issues WHERE user_id = p_user_id)
      WHEN 'quizzes_completed' THEN (SELECT COUNT(*)::int FROM public.quiz_results WHERE user_id = p_user_id)
      WHEN 'login_streak' THEN COALESCE((SELECT current_streak FROM public.login_streaks WHERE user_id = p_user_id), 0)
      WHEN 'points' THEN COALESCE((SELECT points FROM public.profiles WHERE id = p_user_id), 0)
      WHEN 'posts_count' THEN (SELECT COUNT(*)::int FROM public.posts WHERE user_id = p_user_id)
      WHEN 'comments_count' THEN (SELECT COUNT(*)::int FROM public.post_comments WHERE user_id = p_user_id)
      WHEN 'reviews_count' THEN (SELECT COUNT(*)::int FROM public.book_reviews WHERE user_id = p_user_id)
      WHEN 'friends_count' THEN (SELECT COUNT(*)::int FROM public.friendships WHERE status = 'accepted' AND (requester_id = p_user_id OR addressee_id = p_user_id))
      ELSE 0
    END;

    IF v_val >= b.criteria_value THEN
      INSERT INTO public.badge_awards (user_id, badge_id, award_type, note)
      VALUES (p_user_id, b.id, 'auto', 'Automatically awarded')
      ON CONFLICT DO NOTHING;
      v_awarded := v_awarded + 1;
    END IF;
  END LOOP;

  RETURN v_awarded;
END; $$;

REVOKE ALL ON FUNCTION public.check_and_award_badges(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_and_award_badges(uuid) TO authenticated;