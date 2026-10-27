-- A normal quiz is one attempt per student. League results remain exempt.
-- Repair historical duplicates first: preserve the earliest result, remove later
-- rows, reverse their recorded points, and notify the affected student.
DO $$
DECLARE
  dup record;
  v_removed integer;
BEGIN
  FOR dup IN
    SELECT user_id, quiz_id,
           array_agg(id ORDER BY completed_at, id) AS result_ids,
           sum(points_earned) FILTER (WHERE rn > 1)::integer AS points_to_reverse,
           count(*)::integer - 1 AS extra_rows
    FROM (
      SELECT qr.*, row_number() OVER (PARTITION BY user_id, quiz_id ORDER BY completed_at, id) AS rn
      FROM public.quiz_results qr
      WHERE coalesce(qr.answers ->> 'league', 'false') <> 'true'
    ) ranked
    GROUP BY user_id, quiz_id
    HAVING count(*) > 1
  LOOP
    DELETE FROM public.quiz_results
    WHERE id = ANY(dup.result_ids[2:]);
    GET DIAGNOSTICS v_removed = ROW_COUNT;

    UPDATE public.profiles
    SET points = greatest(0, coalesce(points, 0) - greatest(0, coalesce(dup.points_to_reverse, 0)))
    WHERE id = dup.user_id AND coalesce(dup.points_to_reverse, 0) > 0;

    PERFORM public.notify_user(
      dup.user_id,
      'Duplicate quiz attempts removed',
      format('We found and removed %s extra attempt(s) for "%s". %s XP from those duplicate attempts was reversed. Your earliest attempt remains.',
        v_removed,
        coalesce((SELECT title FROM public.quizzes WHERE id = dup.quiz_id), 'a quiz'),
        greatest(0, coalesce(dup.points_to_reverse, 0))),
      'info'
    );
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS quiz_results_one_non_league_attempt
  ON public.quiz_results (quiz_id, user_id)
  WHERE coalesce(answers ->> 'league', 'false') <> 'true';

CREATE OR REPLACE FUNCTION public.award_first_quiz_attempt_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(NEW.answers ->> 'league', 'false') <> 'true' AND NEW.points_earned > 0 THEN
    UPDATE public.profiles
    SET points = coalesce(points, 0) + NEW.points_earned
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS quiz_results_award_first_attempt_points ON public.quiz_results;
CREATE TRIGGER quiz_results_award_first_attempt_points
  AFTER INSERT ON public.quiz_results
  FOR EACH ROW EXECUTE FUNCTION public.award_first_quiz_attempt_points();

CREATE OR REPLACE FUNCTION public.admin_repair_duplicate_quiz_attempts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dup record;
  v_removed integer;
  v_rows integer := 0;
  v_students integer := 0;
  v_points integer := 0;
BEGIN
  IF public.get_profile_role(auth.uid()) <> 'admin' THEN
    RAISE EXCEPTION 'Only admins can repair duplicate quiz attempts';
  END IF;

  FOR dup IN
    SELECT user_id, quiz_id,
           array_agg(id ORDER BY completed_at, id) AS result_ids,
           sum(points_earned) FILTER (WHERE rn > 1)::integer AS points_to_reverse
    FROM (
      SELECT qr.*, row_number() OVER (PARTITION BY user_id, quiz_id ORDER BY completed_at, id) AS rn
      FROM public.quiz_results qr
      WHERE coalesce(qr.answers ->> 'league', 'false') <> 'true'
    ) ranked
    GROUP BY user_id, quiz_id
    HAVING count(*) > 1
  LOOP
    DELETE FROM public.quiz_results WHERE id = ANY(dup.result_ids[2:]);
    GET DIAGNOSTICS v_removed = ROW_COUNT;
    v_rows := v_rows + v_removed;
    v_points := v_points + greatest(0, coalesce(dup.points_to_reverse, 0));

    UPDATE public.profiles
    SET points = greatest(0, coalesce(points, 0) - greatest(0, coalesce(dup.points_to_reverse, 0)))
    WHERE id = dup.user_id AND coalesce(dup.points_to_reverse, 0) > 0;

    PERFORM public.notify_user(
      dup.user_id,
      'Duplicate quiz attempts removed',
      format('We found and removed %s extra attempt(s) for "%s". %s XP from those duplicate attempts was reversed. Your earliest attempt remains.',
        v_removed,
        coalesce((SELECT title FROM public.quizzes WHERE id = dup.quiz_id), 'a quiz'),
        greatest(0, coalesce(dup.points_to_reverse, 0))),
      'info'
    );
    v_students := v_students + 1;
  END LOOP;

  RETURN jsonb_build_object('removed_attempts', v_rows, 'students_notified', v_students, 'points_reversed', v_points);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_repair_duplicate_quiz_attempts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_repair_duplicate_quiz_attempts() TO authenticated;
