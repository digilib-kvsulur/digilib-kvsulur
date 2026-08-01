-- ============ 1. COLUMN ADDITIONS ============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS needs_profile_update boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak_last_claimed date;

ALTER TABLE public.notifications ALTER COLUMN sent_by DROP NOT NULL;

ALTER TABLE public.reading_history ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';

ALTER TABLE public.library_events
  ADD COLUMN IF NOT EXISTS end_date timestamptz,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS image_orientation text DEFAULT 'landscape',
  ADD COLUMN IF NOT EXISTS schedule_files text;

ALTER TABLE public.books ADD COLUMN IF NOT EXISTS condemned_copies integer NOT NULL DEFAULT 0;

-- ============ 2. NEW TABLES ============
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings readable" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "staff manage settings" ON public.system_settings FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.gallery_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  caption text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gallery_images TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gallery_images TO authenticated;
GRANT ALL ON public.gallery_images TO service_role;
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gallery public read" ON public.gallery_images FOR SELECT USING (true);
CREATE POLICY "staff manage gallery" ON public.gallery_images FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.ncert_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_number text NOT NULL,
  subject text NOT NULL,
  book_name text NOT NULL DEFAULT '',
  chapter_title text NOT NULL DEFAULT '',
  chapter_number integer,
  file_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ncert_books_unique_chapter
  ON public.ncert_books (class_number, subject, chapter_number);
GRANT SELECT ON public.ncert_books TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ncert_books TO authenticated;
GRANT ALL ON public.ncert_books TO service_role;
ALTER TABLE public.ncert_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ncert public read" ON public.ncert_books FOR SELECT USING (true);
CREATE POLICY "staff manage ncert" ON public.ncert_books FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.cbse_curriculum (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'General',
  class_number text NOT NULL DEFAULT 'All',
  subject text NOT NULL DEFAULT 'General',
  chapter_title text NOT NULL DEFAULT '',
  chapter_number integer,
  file_url text NOT NULL DEFAULT '',
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cbse_curriculum TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cbse_curriculum TO authenticated;
GRANT ALL ON public.cbse_curriculum TO service_role;
ALTER TABLE public.cbse_curriculum ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cbse public read" ON public.cbse_curriculum FOR SELECT USING (true);
CREATE POLICY "staff manage cbse" ON public.cbse_curriculum FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.book_condemnations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid REFERENCES public.books(id) ON DELETE SET NULL,
  accession_number text,
  book_title text NOT NULL DEFAULT '',
  copies integer NOT NULL DEFAULT 1,
  reason text NOT NULL DEFAULT 'damaged',
  book_condition text,
  notes text,
  condemned_by uuid,
  condemned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_condemnations TO authenticated;
GRANT ALL ON public.book_condemnations TO service_role;
ALTER TABLE public.book_condemnations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read condemnations" ON public.book_condemnations FOR SELECT TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "staff manage condemnations" ON public.book_condemnations FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- ============ 3. NOTIFICATION HELPER + TRIGGERS ============
CREATE OR REPLACE FUNCTION public.notify_user(_user_id uuid, _title text, _message text, _type text DEFAULT 'info')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.notifications (title, message, type, target_user_id, sent_by, is_read)
  VALUES (_title, _message, COALESCE(_type,'info'), _user_id, NULL, false);
END; $$;
REVOKE EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.tg_notify_book_issue()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_title text;
BEGIN
  SELECT title INTO v_title FROM public.books WHERE id = NEW.book_id;
  PERFORM public.notify_user(NEW.user_id, 'Book issued',
    'You have borrowed "' || COALESCE(v_title,'a book') || '". Please return it by ' || NEW.due_date || '.', 'success');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS notify_book_issue ON public.book_issues;
CREATE TRIGGER notify_book_issue AFTER INSERT ON public.book_issues
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_book_issue();

CREATE OR REPLACE FUNCTION public.tg_notify_book_return()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_title text;
BEGIN
  IF NEW.status = 'returned' AND COALESCE(OLD.status,'') <> 'returned' THEN
    SELECT title INTO v_title FROM public.books WHERE id = NEW.book_id;
    PERFORM public.notify_user(NEW.user_id, 'Book returned',
      'Thanks! "' || COALESCE(v_title,'Your book') || '" has been returned successfully.', 'success');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS notify_book_return ON public.book_issues;
CREATE TRIGGER notify_book_return AFTER UPDATE ON public.book_issues
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_book_return();

CREATE OR REPLACE FUNCTION public.tg_notify_badge_award()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text; v_points integer;
BEGIN
  SELECT name, points INTO v_name, v_points FROM public.badges WHERE id = NEW.badge_id;
  PERFORM public.notify_user(NEW.user_id, 'New badge unlocked!',
    'You earned the "' || COALESCE(v_name,'New') || '" badge (+' || COALESCE(v_points,0) || ' XP).', 'success');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS notify_badge_award ON public.badge_awards;
CREATE TRIGGER notify_badge_award AFTER INSERT ON public.badge_awards
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_badge_award();

CREATE OR REPLACE FUNCTION public.tg_notify_friendship()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) INTO v_name FROM public.profiles WHERE id = NEW.requester_id;
    PERFORM public.notify_user(NEW.addressee_id, 'New friend request',
      COALESCE(NULLIF(v_name,''),'Someone') || ' sent you a friend request.', 'info');
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND COALESCE(OLD.status,'') <> 'accepted' THEN
    SELECT TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) INTO v_name FROM public.profiles WHERE id = NEW.addressee_id;
    PERFORM public.notify_user(NEW.requester_id, 'New friend',
      COALESCE(NULLIF(v_name,''),'Someone') || ' accepted your friend request.', 'success');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS notify_friendship ON public.friendships;
CREATE TRIGGER notify_friendship AFTER INSERT OR UPDATE ON public.friendships
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_friendship();

CREATE OR REPLACE FUNCTION public.tg_notify_post_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid; v_name text; v_title text;
BEGIN
  SELECT user_id, title INTO v_owner, v_title FROM public.posts WHERE id = NEW.post_id;
  IF v_owner IS NOT NULL AND v_owner <> NEW.user_id THEN
    SELECT TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) INTO v_name FROM public.profiles WHERE id = NEW.user_id;
    PERFORM public.notify_user(v_owner, 'New reply on your post',
      COALESCE(NULLIF(v_name,''),'Someone') || ' replied to "' || COALESCE(v_title,'your post') || '".', 'info');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS notify_post_comment ON public.post_comments;
CREATE TRIGGER notify_post_comment AFTER INSERT ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_post_comment();

CREATE OR REPLACE FUNCTION public.tg_notify_post_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid; v_name text; v_title text;
BEGIN
  SELECT user_id, title INTO v_owner, v_title FROM public.posts WHERE id = NEW.post_id;
  IF v_owner IS NOT NULL AND v_owner <> NEW.user_id THEN
    SELECT TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) INTO v_name FROM public.profiles WHERE id = NEW.user_id;
    PERFORM public.notify_user(v_owner, 'New like on your post',
      COALESCE(NULLIF(v_name,''),'Someone') || ' liked "' || COALESCE(v_title,'your post') || '".', 'info');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS notify_post_like ON public.post_likes;
CREATE TRIGGER notify_post_like AFTER INSERT ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_post_like();

CREATE OR REPLACE FUNCTION public.tg_notify_level_up()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old_level integer; new_level integer; new_name text;
BEGIN
  IF NEW.points IS DISTINCT FROM OLD.points THEN
    SELECT level_number INTO old_level FROM public.levels WHERE min_points <= COALESCE(OLD.points,0) ORDER BY min_points DESC LIMIT 1;
    SELECT level_number, name INTO new_level, new_name FROM public.levels WHERE min_points <= COALESCE(NEW.points,0) ORDER BY min_points DESC LIMIT 1;
    IF new_level IS NOT NULL AND COALESCE(new_level,0) > COALESCE(old_level,0) THEN
      PERFORM public.notify_user(NEW.id, 'Level up!',
        'Congratulations! You reached Level ' || new_level || ' — ' || COALESCE(new_name,'') || '.', 'success');
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS notify_level_up ON public.profiles;
CREATE TRIGGER notify_level_up AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_level_up();

-- ============ 4. BORROW LIMITS ============
CREATE OR REPLACE FUNCTION public.tg_enforce_issue_limits()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role text; v_active integer; v_limit integer; v_days integer;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = NEW.user_id;
  IF v_role IN ('teacher','staff','librarian','admin') THEN
    v_limit := 5; v_days := 30;
  ELSE
    v_limit := 1; v_days := 7;
  END IF;

  SELECT COUNT(*) INTO v_active FROM public.book_issues
    WHERE user_id = NEW.user_id AND status = 'issued';
  IF v_active >= v_limit THEN
    RAISE EXCEPTION 'Borrow limit reached: % may hold only % book(s) at a time.',
      COALESCE(v_role,'student'), v_limit;
  END IF;

  NEW.issue_date := COALESCE(NEW.issue_date, CURRENT_DATE);
  NEW.due_date := NEW.issue_date + v_days;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS enforce_issue_limits ON public.book_issues;
CREATE TRIGGER enforce_issue_limits BEFORE INSERT ON public.book_issues
FOR EACH ROW EXECUTE FUNCTION public.tg_enforce_issue_limits();

-- ============ 5. RPCs USED BY THE APP ============
CREATE OR REPLACE FUNCTION public.issue_book_to_user(p_book_id uuid, p_user_id uuid, p_issue_date date DEFAULT CURRENT_DATE)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_acc text; v_avail integer;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT accession_number, available_copies INTO v_acc, v_avail FROM public.books WHERE id = p_book_id FOR UPDATE;
  IF v_avail IS NULL OR v_avail < 1 THEN RAISE EXCEPTION 'No copies available'; END IF;

  INSERT INTO public.book_issues (book_id, user_id, issue_date, due_date, status, accession_number)
  VALUES (p_book_id, p_user_id, p_issue_date, p_issue_date, 'issued', v_acc)
  RETURNING id INTO v_id;

  UPDATE public.books SET available_copies = GREATEST(available_copies - 1, 0) WHERE id = p_book_id;
  RETURN v_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.issue_book_to_user(uuid, uuid, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.issue_book_to_user(uuid, uuid, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_book_request(p_request_id uuid, p_admin_notes text DEFAULT NULL, p_due_date date DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_issue uuid;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO r FROM public.book_requests WHERE id = p_request_id;
  IF r IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;

  UPDATE public.book_requests SET status = 'approved', admin_notes = COALESCE(p_admin_notes, admin_notes) WHERE id = p_request_id;
  IF r.book_id IS NOT NULL THEN
    v_issue := public.issue_book_to_user(r.book_id, r.user_id, CURRENT_DATE);
  END IF;
  RETURN v_issue;
END; $$;
REVOKE EXECUTE ON FUNCTION public.approve_book_request(uuid, text, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_book_request(uuid, text, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.condemn_book(p_book_id uuid, p_copies integer, p_reason text, p_condition text DEFAULT NULL, p_notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; b record; n integer;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO b FROM public.books WHERE id = p_book_id FOR UPDATE;
  IF b IS NULL THEN RAISE EXCEPTION 'Book not found'; END IF;
  n := GREATEST(COALESCE(p_copies,1), 1);
  IF n > COALESCE(b.total_copies,0) THEN RAISE EXCEPTION 'Cannot condemn more copies than exist'; END IF;

  INSERT INTO public.book_condemnations (book_id, accession_number, book_title, copies, reason, book_condition, notes, condemned_by)
  VALUES (p_book_id, b.accession_number, b.title, n, COALESCE(p_reason,'damaged'), p_condition, p_notes, auth.uid())
  RETURNING id INTO v_id;

  UPDATE public.books
    SET total_copies = GREATEST(total_copies - n, 0),
        available_copies = GREATEST(available_copies - n, 0),
        condemned_copies = condemned_copies + n,
        updated_at = now()
  WHERE id = p_book_id;
  RETURN v_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.condemn_book(uuid, integer, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.condemn_book(uuid, integer, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_reading_entry(p_reading_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_pts integer;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO r FROM public.reading_history WHERE id = p_reading_id;
  IF r IS NULL THEN RAISE EXCEPTION 'Entry not found'; END IF;
  IF r.status = 'approved' THEN RETURN 0; END IF;

  v_pts := COALESCE(r.points_earned, 0);
  IF v_pts = 0 THEN
    SELECT COALESCE((value)::text::integer, 25) INTO v_pts FROM public.system_settings WHERE key = 'points_per_book_read';
    v_pts := COALESCE(v_pts, 25);
  END IF;

  UPDATE public.reading_history SET status = 'approved', points_earned = v_pts WHERE id = p_reading_id;
  UPDATE public.profiles SET points = COALESCE(points,0) + v_pts WHERE id = r.user_id;
  PERFORM public.notify_user(r.user_id, 'Reading approved',
    'Your reading entry "' || COALESCE(r.book_title,'') || '" was approved (+' || v_pts || ' points).', 'success');
  RETURN v_pts;
END; $$;
REVOKE EXECUTE ON FUNCTION public.approve_reading_entry(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_reading_entry(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_streak_points()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_pts integer; v_last date; v_streak integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT streak_last_claimed INTO v_last FROM public.profiles WHERE id = v_uid;
  IF v_last = CURRENT_DATE THEN RETURN 0; END IF;
  SELECT current_streak INTO v_streak FROM public.login_streaks WHERE user_id = v_uid;
  IF COALESCE(v_streak,0) < 1 THEN RETURN 0; END IF;

  SELECT COALESCE((value)::text::integer, 10) INTO v_pts FROM public.system_settings WHERE key = 'points_per_daily_streak';
  v_pts := COALESCE(v_pts, 10);

  UPDATE public.profiles
    SET points = COALESCE(points,0) + v_pts, streak_last_claimed = CURRENT_DATE
  WHERE id = v_uid;
  RETURN v_pts;
END; $$;
REVOKE EXECUTE ON FUNCTION public.claim_streak_points() FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_streak_points() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_book_borrow_counts()
RETURNS TABLE(book_id uuid, borrow_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT bi.book_id, COUNT(*)::bigint FROM public.book_issues bi GROUP BY bi.book_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_book_borrow_counts() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_school_leaderboard_stats()
RETURNS TABLE(total_students bigint, total_points bigint, average_points numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::bigint, COALESCE(SUM(points),0)::bigint,
         COALESCE(AVG(points),0)::numeric
  FROM public.profiles WHERE role = 'student' AND is_approved = true;
$$;
REVOKE EXECUTE ON FUNCTION public.get_school_leaderboard_stats() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_school_leaderboard_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_teacher_class_students(p_class text)
RETURNS TABLE(id uuid, first_name text, last_name text, username text, student_class text, admission_number text, points integer, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.first_name, p.last_name, p.username, p.student_class, p.admission_number, p.points, p.avatar_url
  FROM public.profiles p
  WHERE p.role = 'student' AND p.is_approved = true AND p.student_class = p_class
  ORDER BY p.first_name;
$$;
REVOKE EXECUTE ON FUNCTION public.get_teacher_class_students(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_teacher_class_students(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_missing_auth_profiles()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  INSERT INTO public.profiles (id, email, first_name, last_name, role, student_class, roll_number, admission_number, username, phone, is_approved, needs_profile_update)
  SELECT u.id, u.email,
    COALESCE(u.raw_user_meta_data->>'first_name',''),
    COALESCE(u.raw_user_meta_data->>'last_name',''),
    COALESCE(u.raw_user_meta_data->>'role','student'),
    u.raw_user_meta_data->>'student_class',
    u.raw_user_meta_data->>'roll_number',
    u.raw_user_meta_data->>'admission_number',
    COALESCE(u.raw_user_meta_data->>'username', u.raw_user_meta_data->>'admission_number'),
    u.raw_user_meta_data->>'phone',
    true, true
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE p.id IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END; $$;
REVOKE EXECUTE ON FUNCTION public.sync_missing_auth_profiles() FROM anon;
GRANT EXECUTE ON FUNCTION public.sync_missing_auth_profiles() TO authenticated;

-- ============ 6. COMMUNITY / SOCIAL BADGE STATS ============
CREATE OR REPLACE FUNCTION public.get_user_activity_stats(_user_id uuid)
RETURNS TABLE(posts_count integer, comments_count integer, friends_count integer, books_issued integer, reviews_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT COUNT(*)::int FROM public.posts WHERE user_id = _user_id),
    (SELECT COUNT(*)::int FROM public.post_comments WHERE user_id = _user_id),
    (SELECT COUNT(*)::int FROM public.friendships f WHERE f.status = 'accepted' AND (f.requester_id = _user_id OR f.addressee_id = _user_id)),
    (SELECT COUNT(*)::int FROM public.book_issues WHERE user_id = _user_id),
    (SELECT COUNT(*)::int FROM public.book_reviews WHERE user_id = _user_id);
$$;
REVOKE EXECUTE ON FUNCTION public.get_user_activity_stats(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_activity_stats(uuid) TO authenticated;

-- ============ 7. SEED SETTINGS + BADGES ============
INSERT INTO public.system_settings (key, value) VALUES
  ('points_per_daily_streak', '10'::jsonb),
  ('points_per_book_read', '25'::jsonb),
  ('points_per_quiz_passed', '20'::jsonb),
  ('points_per_review', '5'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.badges (name, description, icon_name, color, points, criteria_type, criteria_value, is_active)
SELECT v.name, v.description, v.icon_name, v.color, v.points, v.criteria_type, v.criteria_value, true
FROM (VALUES
  ('First Post', 'Share your first post in the community', 'MessageSquare', 'blue', 10, 'posts_count', 1),
  ('Community Voice', 'Publish 10 community posts', 'Megaphone', 'blue', 40, 'posts_count', 10),
  ('Story Teller', 'Publish 25 community posts', 'PenLine', 'indigo', 80, 'posts_count', 25),
  ('Helpful Reply', 'Post your first reply', 'MessageCircle', 'green', 10, 'comments_count', 1),
  ('Conversation Starter', 'Post 25 replies in the community', 'MessagesSquare', 'green', 50, 'comments_count', 25),
  ('Discussion Master', 'Post 100 replies in the community', 'Users', 'emerald', 120, 'comments_count', 100),
  ('First Friend', 'Make your first friend', 'UserPlus', 'pink', 10, 'friends_count', 1),
  ('Well Connected', 'Make 10 friends', 'Users2', 'pink', 50, 'friends_count', 10),
  ('Social Star', 'Make 25 friends', 'Sparkles', 'purple', 100, 'friends_count', 25),
  ('Borrower', 'Borrow your first library book', 'BookOpen', 'amber', 10, 'books_issued', 1),
  ('Frequent Borrower', 'Borrow 10 library books', 'Library', 'amber', 60, 'books_issued', 10),
  ('Book Critic', 'Write 5 book reviews', 'Star', 'yellow', 40, 'reviews_count', 5)
) AS v(name, description, icon_name, color, points, criteria_type, criteria_value)
WHERE NOT EXISTS (SELECT 1 FROM public.badges b WHERE b.name = v.name);