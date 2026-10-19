CREATE OR REPLACE FUNCTION public.get_public_profile_stats(_id uuid)
RETURNS TABLE(books_read integer, quizzes integer, current_streak integer, longest_streak integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*)::int FROM public.reading_history WHERE user_id = _id),
    (SELECT COUNT(*)::int FROM public.quiz_results
      WHERE user_id = _id AND answers ->> 'league' IS DISTINCT FROM 'true'),
    COALESCE((SELECT current_streak FROM public.login_streaks WHERE user_id = _id), 0),
    COALESCE((SELECT longest_streak FROM public.login_streaks WHERE user_id = _id), 0);
$$;
