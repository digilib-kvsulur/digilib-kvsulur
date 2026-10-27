ALTER TABLE public.event_winners
  ADD COLUMN IF NOT EXISTS scheduled_release_at timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_release_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "Anyone can view published event winners" ON public.event_winners;
DROP POLICY IF EXISTS "ew read" ON public.event_winners;
CREATE POLICY "event winners public after scheduled release" ON public.event_winners
  FOR SELECT TO anon, authenticated
  USING (
    (is_published = true AND (scheduled_release_at IS NULL OR scheduled_release_at <= now()))
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'superadmin', 'librarian', 'teacher')
    )
  );

CREATE INDEX IF NOT EXISTS idx_event_winners_scheduled_release
  ON public.event_winners(scheduled_release_at)
  WHERE scheduled_release_at IS NOT NULL AND is_published = false;

CREATE OR REPLACE FUNCTION public.release_scheduled_event_winners()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  released_count integer := 0;
BEGIN
  WITH due AS (
    UPDATE public.event_winners
    SET is_published = true,
        published_at = now()
    WHERE is_published = false
      AND scheduled_release_at IS NOT NULL
      AND scheduled_release_at <= now()
    RETURNING id, event_id, user_id, position_title, collection_date,
              collection_venue, librarian_note, scheduled_release_by
  ), event_state AS (
    UPDATE public.library_events e
    SET is_published = true
    WHERE e.id IN (SELECT DISTINCT event_id FROM due)
  ), notices AS (
    INSERT INTO public.notifications (target_user_id, sent_by, title, message, type)
    SELECT d.user_id,
           COALESCE(d.scheduled_release_by, d.user_id),
           '🏆 Winner Announced: ' || COALESCE(d.position_title, 'Event Winner') || '!',
           'Your event results are now available. ' || COALESCE(d.position_title, 'Winner') ||
             CASE WHEN d.collection_date IS NOT NULL THEN ' · Collection date: ' || to_char(d.collection_date, 'FMDay, FMMonth DD, YYYY') ELSE '' END ||
             CASE WHEN d.collection_venue IS NOT NULL THEN ' · Venue: ' || d.collection_venue ELSE '' END ||
             CASE WHEN d.librarian_note IS NOT NULL THEN ' · ' || d.librarian_note ELSE '' END,
           'award'
    FROM due d
  )
  SELECT count(*) INTO released_count FROM due;

  RETURN released_count;
END;
$$;

REVOKE ALL ON FUNCTION public.release_scheduled_event_winners() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'release-scheduled-event-winners',
      '* * * * *',
      'SELECT public.release_scheduled_event_winners()'
    );
  ELSE
    RAISE NOTICE 'pg_cron is not enabled; scheduled event results will require an external scheduler.';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not schedule event winner release: %', SQLERRM;
END;
$$;

NOTIFY pgrst, 'reload schema';
