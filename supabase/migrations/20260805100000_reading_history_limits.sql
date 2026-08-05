-- Phase 1: Reading history anti-abuse (server-side)

-- Allow suspicious status
ALTER TABLE public.reading_history DROP CONSTRAINT IF EXISTS reading_history_status_check;
ALTER TABLE public.reading_history
  ADD CONSTRAINT reading_history_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'suspicious'));

-- Optional book_id for future catalog-linked reads
ALTER TABLE public.reading_history
  ADD COLUMN IF NOT EXISTS book_id uuid REFERENCES public.books(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reading_history_user_day
  ON public.reading_history (user_id, completed_date);

CREATE INDEX IF NOT EXISTS idx_reading_history_user_title
  ON public.reading_history (user_id, lower(trim(book_title)));

-- Enforce daily rate limit + 7-day same-book cooldown + auto-flag
CREATE OR REPLACE FUNCTION public.enforce_reading_history_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_count integer;
  recent_same integer;
BEGIN
  -- Count entries for this user today (any status)
  SELECT COUNT(*) INTO today_count
  FROM public.reading_history
  WHERE user_id = NEW.user_id
    AND completed_date = CURRENT_DATE
    AND (TG_OP = 'INSERT' OR id IS DISTINCT FROM NEW.id);

  -- Hard rate limit: reject 3rd+ entry today (≥ 2 already exist)
  IF today_count >= 2 THEN
    RAISE EXCEPTION 'Daily reading limit reached: maximum 2 entries per day.'
      USING ERRCODE = 'P0001';
  END IF;

  -- Cooldown: same book title (or book_id) within last 7 days
  SELECT COUNT(*) INTO recent_same
  FROM public.reading_history
  WHERE user_id = NEW.user_id
    AND created_at >= (now() - interval '7 days')
    AND (TG_OP = 'INSERT' OR id IS DISTINCT FROM NEW.id)
    AND (
      (NEW.book_id IS NOT NULL AND book_id = NEW.book_id)
      OR lower(trim(book_title)) = lower(trim(NEW.book_title))
    );

  IF recent_same > 0 THEN
    RAISE EXCEPTION 'Cooldown active: you already logged this book within the last 7 days.'
      USING ERRCODE = 'P0001';
  END IF;

  -- Auto-flag: if already 1 entry today, mark this (2nd) as suspicious
  IF today_count >= 1 AND COALESCE(NEW.status, 'pending') = 'pending' THEN
    NEW.status := 'suspicious';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_reading_history_limits ON public.reading_history;
CREATE TRIGGER trg_enforce_reading_history_limits
  BEFORE INSERT ON public.reading_history
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_reading_history_limits();
