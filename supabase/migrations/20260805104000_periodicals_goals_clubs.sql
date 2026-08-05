-- Phase 5: Periodicals + reading goals + book clubs

CREATE TABLE IF NOT EXISTS public.periodicals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL DEFAULT 'magazine'
    CHECK (type IN ('newspaper', 'magazine', 'journal')),
  frequency text,
  publisher text,
  cover_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.periodical_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodical_id uuid NOT NULL REFERENCES public.periodicals(id) ON DELETE CASCADE,
  issue_date date NOT NULL,
  volume text,
  issue_number text,
  notes text,
  on_shelf boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_periodical_issues_periodical ON public.periodical_issues(periodical_id);

GRANT SELECT ON public.periodicals TO anon, authenticated;
GRANT SELECT ON public.periodical_issues TO anon, authenticated;
GRANT ALL ON public.periodicals TO authenticated;
GRANT ALL ON public.periodical_issues TO authenticated;
GRANT ALL ON public.periodicals TO service_role;
GRANT ALL ON public.periodical_issues TO service_role;

ALTER TABLE public.periodicals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodical_issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "periodicals read" ON public.periodicals;
CREATE POLICY "periodicals read" ON public.periodicals FOR SELECT USING (true);
DROP POLICY IF EXISTS "periodicals staff write" ON public.periodicals;
CREATE POLICY "periodicals staff write" ON public.periodicals
  FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "periodical_issues read" ON public.periodical_issues;
CREATE POLICY "periodical_issues read" ON public.periodical_issues FOR SELECT USING (true);
DROP POLICY IF EXISTS "periodical_issues staff write" ON public.periodical_issues;
CREATE POLICY "periodical_issues staff write" ON public.periodical_issues
  FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- School-wide / per-user reading goals (admin sets school target via system_settings;
-- this table stores optional per-user overrides or snapshots)
CREATE TABLE IF NOT EXISTS public.reading_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  month text NOT NULL, -- YYYY-MM
  target_books integer NOT NULL CHECK (target_books > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, month)
);

-- School-wide row: user_id IS NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_reading_goals_school_month
  ON public.reading_goals (month) WHERE user_id IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_goals TO authenticated;
GRANT ALL ON public.reading_goals TO service_role;
ALTER TABLE public.reading_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reading_goals read" ON public.reading_goals;
CREATE POLICY "reading_goals read" ON public.reading_goals
  FOR SELECT TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "reading_goals staff write" ON public.reading_goals;
CREATE POLICY "reading_goals staff write" ON public.reading_goals
  FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.get_reading_goal_progress(p_user_id uuid, p_month text)
RETURNS TABLE(target_books integer, books_read integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target integer;
  v_start date;
  v_end date;
BEGIN
  -- Prefer user-specific, then school-wide, then system_settings
  SELECT rg.target_books INTO v_target
  FROM public.reading_goals rg
  WHERE rg.month = p_month AND rg.user_id = p_user_id
  LIMIT 1;

  IF v_target IS NULL THEN
    SELECT rg.target_books INTO v_target
    FROM public.reading_goals rg
    WHERE rg.month = p_month AND rg.user_id IS NULL
    LIMIT 1;
  END IF;

  IF v_target IS NULL THEN
    SELECT COALESCE(
      CASE WHEN jsonb_typeof(value) = 'number' THEN (value)::text::integer
           ELSE NULLIF(trim(both '"' from value::text), '')::integer END,
      3
    ) INTO v_target
    FROM public.system_settings WHERE key = 'monthly_reading_goal';
  END IF;

  v_target := COALESCE(v_target, 3);
  v_start := (p_month || '-01')::date;
  v_end := (v_start + interval '1 month')::date;

  RETURN QUERY
  SELECT v_target,
    (SELECT COUNT(*)::integer FROM public.reading_history rh
     WHERE rh.user_id = p_user_id
       AND rh.status = 'approved'
       AND rh.completed_date >= v_start
       AND rh.completed_date < v_end);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_reading_goal_progress(uuid, text) TO authenticated;

-- Book clubs
CREATE TABLE IF NOT EXISTS public.book_clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  book_id uuid REFERENCES public.books(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  cover_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.book_club_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.book_clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.book_club_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.book_clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_club_messages_club ON public.book_club_messages(club_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_clubs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_club_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_club_messages TO authenticated;
GRANT ALL ON public.book_clubs TO service_role;
GRANT ALL ON public.book_club_members TO service_role;
GRANT ALL ON public.book_club_messages TO service_role;

ALTER TABLE public.book_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_club_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clubs read" ON public.book_clubs;
CREATE POLICY "clubs read" ON public.book_clubs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "clubs staff write" ON public.book_clubs;
CREATE POLICY "clubs staff write" ON public.book_clubs
  FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "club members read" ON public.book_club_members;
CREATE POLICY "club members read" ON public.book_club_members FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "club members join" ON public.book_club_members;
CREATE POLICY "club members join" ON public.book_club_members
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "club members leave" ON public.book_club_members;
CREATE POLICY "club members leave" ON public.book_club_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "club messages member read" ON public.book_club_messages;
CREATE POLICY "club messages member read" ON public.book_club_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.book_club_members m
      WHERE m.club_id = book_club_messages.club_id AND m.user_id = auth.uid()
    )
    OR public.is_staff_or_admin(auth.uid())
  );

DROP POLICY IF EXISTS "club messages member insert" ON public.book_club_messages;
CREATE POLICY "club messages member insert" ON public.book_club_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.book_club_members m
      WHERE m.club_id = book_club_messages.club_id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "club messages staff delete" ON public.book_club_messages;
CREATE POLICY "club messages staff delete" ON public.book_club_messages
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));
