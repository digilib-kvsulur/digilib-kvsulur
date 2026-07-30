-- Approving a reading entry is one operation: it cannot remain pending or
-- credit points twice.
ALTER TABLE public.reading_history ADD COLUMN IF NOT EXISTS points_awarded boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.award_approved_reading_points()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND NOT NEW.points_awarded AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved') THEN
    UPDATE public.profiles SET points = COALESCE(points, 0) + COALESCE(NEW.points_earned, 0) WHERE id = NEW.user_id;
    UPDATE public.reading_history SET points_awarded = true WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_reading_history_insert ON public.reading_history;
CREATE TRIGGER on_reading_history_insert AFTER INSERT OR UPDATE OF status ON public.reading_history
FOR EACH ROW EXECUTE FUNCTION public.award_approved_reading_points();

CREATE OR REPLACE FUNCTION public.approve_reading_entry(p_reading_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE entry public.reading_history%ROWTYPE;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN RAISE EXCEPTION 'Only staff can approve reading entries'; END IF;
  SELECT * INTO entry FROM public.reading_history WHERE id = p_reading_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reading entry not found'; END IF;
  IF entry.status <> 'pending' THEN RAISE EXCEPTION 'This reading entry has already been processed'; END IF;
  UPDATE public.reading_history SET status = 'approved' WHERE id = entry.id;
  -- The existing approval trigger awards points. Return the amount for UI feedback.
  RETURN COALESCE(entry.points_earned, 0);
END;
$$;
GRANT EXECUTE ON FUNCTION public.approve_reading_entry(uuid) TO authenticated;

-- Award the daily base amount for every active streak day, once per day.
CREATE OR REPLACE FUNCTION public.claim_streak_points()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE current_streak integer; base_points integer; earned integer; last_claimed date;
BEGIN
  SELECT streak_last_claimed INTO last_claimed FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF last_claimed = CURRENT_DATE THEN RAISE EXCEPTION 'Today''s streak reward has already been claimed'; END IF;
  SELECT COALESCE(current_streak, 0) INTO current_streak FROM public.login_streaks WHERE user_id = auth.uid();
  IF COALESCE(current_streak, 0) < 1 THEN RAISE EXCEPTION 'No active streak to claim'; END IF;
  SELECT COALESCE((value #>> '{}')::integer, 10) INTO base_points FROM public.system_settings WHERE key = 'points_per_daily_streak';
  earned := COALESCE(base_points, 10) * current_streak;
  UPDATE public.profiles SET points = COALESCE(points, 0) + earned, streak_last_claimed = CURRENT_DATE WHERE id = auth.uid();
  RETURN earned;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_streak_points() TO authenticated;

-- Centralised circulation rules: teachers have 30-day unlimited loans;
-- students have one active 7-day loan.
CREATE OR REPLACE FUNCTION public.issue_book_to_user(p_book_id uuid, p_user_id uuid, p_issue_date date DEFAULT CURRENT_DATE)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE borrower public.profiles%ROWTYPE; book_row public.books%ROWTYPE; issue_id uuid; due_on date;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN RAISE EXCEPTION 'Only staff can issue books'; END IF;
  SELECT * INTO borrower FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND OR NOT borrower.is_approved OR borrower.role NOT IN ('student', 'teacher') THEN RAISE EXCEPTION 'Select an approved student or teacher'; END IF;
  IF borrower.role = 'student' AND EXISTS (SELECT 1 FROM public.book_issues WHERE user_id = p_user_id AND status = 'issued') THEN
    RAISE EXCEPTION 'Students may only have one active book issue';
  END IF;
  SELECT * INTO book_row FROM public.books WHERE id = p_book_id FOR UPDATE;
  IF NOT FOUND OR book_row.available_copies < 1 THEN RAISE EXCEPTION 'Book is not available'; END IF;
  due_on := p_issue_date + CASE WHEN borrower.role = 'teacher' THEN 30 ELSE 7 END;
  INSERT INTO public.book_issues (book_id, user_id, issue_date, due_date, status, accession_number)
  VALUES (p_book_id, p_user_id, p_issue_date, due_on, 'issued', book_row.accession_number) RETURNING id INTO issue_id;
  UPDATE public.books SET available_copies = available_copies - 1 WHERE id = p_book_id;
  RETURN issue_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.issue_book_to_user(uuid, uuid, date) TO authenticated;

-- Repair NCERT records on deployment and ensure displayed titles never remain blank.
UPDATE public.ncert_books
SET chapter_title = 'Chapter ' || COALESCE(chapter_number::text, 'Untitled')
WHERE COALESCE(btrim(chapter_title), '') = '';

DELETE FROM public.ncert_books a
USING public.ncert_books b
WHERE a.id > b.id
  AND a.class_number = b.class_number
  AND lower(a.subject) = lower(b.subject)
  AND COALESCE(a.chapter_number, -1) = COALESCE(b.chapter_number, -1)
  AND lower(a.chapter_title) = lower(b.chapter_title);

-- Teachers can reliably load their assigned class even when profile RLS is
-- tightened for student privacy.
CREATE OR REPLACE FUNCTION public.get_teacher_class_students(p_class text)
RETURNS TABLE(id uuid, first_name text, last_name text, roll_number text, points integer, student_class text, is_approved boolean, avatar_url text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE caller_class text;
BEGIN
  SELECT student_class INTO caller_class FROM public.profiles WHERE id = auth.uid();
  IF public.get_profile_role(auth.uid()) NOT IN ('teacher', 'admin') THEN RAISE EXCEPTION 'Only teachers and admins can view class lists'; END IF;
  IF public.get_profile_role(auth.uid()) = 'teacher' AND caller_class IS DISTINCT FROM p_class THEN RAISE EXCEPTION 'Teachers may only view their assigned class'; END IF;
  RETURN QUERY SELECT p.id, p.first_name, p.last_name, p.roll_number, p.points, p.student_class, p.is_approved, p.avatar_url
  FROM public.profiles p WHERE p.role = 'student' AND p.student_class = p_class ORDER BY p.points DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_teacher_class_students(text) TO authenticated;

-- Include profile pictures in network cards without exposing private profile data.
DROP FUNCTION IF EXISTS public.get_public_profiles(uuid[]);
CREATE FUNCTION public.get_public_profiles(_ids uuid[])
RETURNS TABLE(id uuid, first_name text, last_name text, username text, student_class text, points integer, role text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.first_name, p.last_name, p.username, p.student_class, p.points, p.role, p.avatar_url
  FROM public.profiles p WHERE p.id = ANY(_ids);
$$;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO authenticated;
