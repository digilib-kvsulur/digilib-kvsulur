-- Community: pin posts + polls
-- Fines: auto-create/accrue overdue fines while book is still out
-- Support: allow students to see tickets linked by admission number

-- ========== SUPPORT TICKETS: broader student SELECT ==========
DROP POLICY IF EXISTS "Users view own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets select" ON public.support_tickets;
DROP POLICY IF EXISTS "Tickets select own or staff" ON public.support_tickets;
DROP POLICY IF EXISTS "Users view own tickets, staff view all" ON public.support_tickets;
DROP POLICY IF EXISTS "Tickets select own staff or admission match" ON public.support_tickets;

CREATE POLICY "Tickets select own staff or admission match"
ON public.support_tickets FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_staff_or_admin(auth.uid())
  OR (
    admission_number IS NOT NULL
    AND lower(trim(admission_number)) = lower(trim(COALESCE(
      (SELECT admission_number FROM public.profiles WHERE id = auth.uid()),
      ''
    )))
    AND length(trim(COALESCE(
      (SELECT admission_number FROM public.profiles WHERE id = auth.uid()),
      ''
    ))) > 0
  )
);

-- ========== FINES: accrue while overdue ==========
ALTER TABLE public.library_fines
  ADD COLUMN IF NOT EXISTS accruing boolean NOT NULL DEFAULT false;

ALTER TABLE public.library_fines
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.sync_overdue_fines()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate numeric;
  v_grace integer;
  r record;
  v_days integer;
  v_amount numeric;
  v_title text;
  v_count integer := 0;
BEGIN
  -- Anyone authenticated can trigger sync (idempotent); staff/cron preferred
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT rate_per_day, grace_period_days INTO v_rate, v_grace
  FROM public.fine_settings WHERE id = 1;
  v_rate := COALESCE(v_rate, 1);
  v_grace := COALESCE(v_grace, 0);

  FOR r IN
    SELECT bi.id, bi.user_id, bi.book_id, bi.due_date
    FROM public.book_issues bi
    WHERE bi.status IN ('issued', 'overdue')
      AND bi.due_date IS NOT NULL
      AND (CURRENT_DATE - bi.due_date::date) > v_grace
  LOOP
    v_days := GREATEST(0, (CURRENT_DATE - r.due_date::date) - v_grace);
    IF v_days <= 0 THEN CONTINUE; END IF;
    v_amount := v_days * v_rate;
    SELECT title INTO v_title FROM public.books WHERE id = r.book_id;

    INSERT INTO public.library_fines (
      user_id, book_issue_id, days_overdue, rate_per_day, total_amount,
      status, book_title, accruing, updated_at
    ) VALUES (
      r.user_id, r.id, v_days, v_rate, v_amount,
      'pending', v_title, true, now()
    )
    ON CONFLICT (book_issue_id) WHERE book_issue_id IS NOT NULL
    DO UPDATE SET
      days_overdue = EXCLUDED.days_overdue,
      rate_per_day = EXCLUDED.rate_per_day,
      total_amount = EXCLUDED.total_amount,
      book_title = COALESCE(EXCLUDED.book_title, public.library_fines.book_title),
      accruing = true,
      updated_at = now()
    WHERE public.library_fines.status = 'pending';

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Unique partial index already exists; ON CONFLICT needs constraint name.
-- Recreate as named constraint-friendly unique index if needed:
DROP INDEX IF EXISTS idx_library_fines_issue_unique;
CREATE UNIQUE INDEX idx_library_fines_issue_unique
  ON public.library_fines(book_issue_id) WHERE book_issue_id IS NOT NULL;

-- Fix sync to use the unique index properly via ON CONFLICT (book_issue_id)
CREATE OR REPLACE FUNCTION public.sync_overdue_fines()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate numeric;
  v_grace integer;
  r record;
  v_days integer;
  v_amount numeric;
  v_title text;
  v_count integer := 0;
  v_existing uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT rate_per_day, grace_period_days INTO v_rate, v_grace
  FROM public.fine_settings WHERE id = 1;
  v_rate := COALESCE(v_rate, 1);
  v_grace := COALESCE(v_grace, 0);

  FOR r IN
    SELECT bi.id, bi.user_id, bi.book_id, bi.due_date
    FROM public.book_issues bi
    WHERE bi.status IN ('issued', 'overdue')
      AND bi.due_date IS NOT NULL
      AND (CURRENT_DATE - bi.due_date::date) > v_grace
  LOOP
    v_days := GREATEST(0, (CURRENT_DATE - r.due_date::date) - v_grace);
    IF v_days <= 0 THEN CONTINUE; END IF;
    v_amount := v_days * v_rate;
    SELECT title INTO v_title FROM public.books WHERE id = r.book_id;

    SELECT id INTO v_existing
    FROM public.library_fines
    WHERE book_issue_id = r.id
    LIMIT 1;

    IF v_existing IS NULL THEN
      INSERT INTO public.library_fines (
        user_id, book_issue_id, days_overdue, rate_per_day, total_amount,
        status, book_title, accruing, updated_at
      ) VALUES (
        r.user_id, r.id, v_days, v_rate, v_amount,
        'pending', v_title, true, now()
      );
    ELSE
      UPDATE public.library_fines
      SET days_overdue = v_days,
          rate_per_day = v_rate,
          total_amount = v_amount,
          book_title = COALESCE(v_title, book_title),
          accruing = CASE WHEN status = 'pending' THEN true ELSE accruing END,
          updated_at = now()
      WHERE id = v_existing
        AND status = 'pending';
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_overdue_fines() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_overdue_fines() TO authenticated;

-- Finalize fine amount on return (update accruing row or create)
CREATE OR REPLACE FUNCTION public.create_fine_on_return()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate numeric;
  v_grace integer;
  v_days integer;
  v_amount numeric;
  v_title text;
  v_existing uuid;
BEGIN
  IF NEW.status = 'returned' AND (OLD.status IS DISTINCT FROM 'returned') THEN
    SELECT rate_per_day, grace_period_days INTO v_rate, v_grace
    FROM public.fine_settings WHERE id = 1;
    v_rate := COALESCE(v_rate, 1);
    v_grace := COALESCE(v_grace, 0);

    v_days := GREATEST(0, (COALESCE(NEW.return_date::date, CURRENT_DATE) - NEW.due_date::date) - v_grace);
    v_amount := v_days * v_rate;
    SELECT title INTO v_title FROM public.books WHERE id = NEW.book_id;

    SELECT id INTO v_existing FROM public.library_fines WHERE book_issue_id = NEW.id LIMIT 1;

    IF v_days > 0 AND v_amount > 0 THEN
      IF v_existing IS NULL THEN
        INSERT INTO public.library_fines (
          user_id, book_issue_id, days_overdue, rate_per_day, total_amount,
          status, book_title, accruing, updated_at
        ) VALUES (
          NEW.user_id, NEW.id, v_days, v_rate, v_amount,
          'pending', v_title, false, now()
        );
      ELSE
        UPDATE public.library_fines
        SET days_overdue = v_days,
            rate_per_day = v_rate,
            total_amount = v_amount,
            book_title = COALESCE(v_title, book_title),
            accruing = false,
            updated_at = now()
        WHERE id = v_existing AND status = 'pending';
      END IF;
    ELSIF v_existing IS NOT NULL THEN
      -- Returned on time / within grace: stop accruing; waive zero-day pending if unused
      UPDATE public.library_fines
      SET accruing = false,
          days_overdue = v_days,
          total_amount = v_amount,
          updated_at = now(),
          status = CASE WHEN v_amount <= 0 AND status = 'pending' THEN 'waived' ELSE status END
      WHERE id = v_existing;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_fine_on_return ON public.book_issues;
CREATE TRIGGER trg_create_fine_on_return
  AFTER UPDATE ON public.book_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.create_fine_on_return();

-- Clients call sync_overdue_fines on My Fines / Fine Manager / Overdue load.

-- ========== COMMUNITY: pin + polls ==========
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS pinned_at timestamptz;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS post_type text NOT NULL DEFAULT 'text'
    CHECK (post_type IN ('text', 'poll'));

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS poll_ends_at timestamptz;

DROP POLICY IF EXISTS "Users edit own posts" ON public.posts;
CREATE POLICY "Users or staff edit posts"
ON public.posts FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_poll_options_post ON public.poll_options(post_id);

CREATE TABLE IF NOT EXISTS public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_poll_votes_post ON public.poll_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_option ON public.poll_votes(option_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.poll_options TO authenticated;
GRANT ALL ON public.poll_options TO service_role;
GRANT SELECT, INSERT, DELETE ON public.poll_votes TO authenticated;
GRANT ALL ON public.poll_votes TO service_role;

ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "poll options read" ON public.poll_options;
CREATE POLICY "poll options read" ON public.poll_options
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "poll options write author staff" ON public.poll_options;
CREATE POLICY "poll options write author staff" ON public.poll_options
  FOR ALL TO authenticated
  USING (
    public.is_staff_or_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.user_id = auth.uid())
  )
  WITH CHECK (
    public.is_staff_or_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "poll votes read" ON public.poll_votes;
CREATE POLICY "poll votes read" ON public.poll_votes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "poll votes insert own" ON public.poll_votes;
CREATE POLICY "poll votes insert own" ON public.poll_votes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "poll votes delete own" ON public.poll_votes;
CREATE POLICY "poll votes delete own" ON public.poll_votes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_posts_pinned ON public.posts (is_pinned DESC, created_at DESC);
