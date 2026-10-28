-- Repair installations where the scheduled email column was added after the
-- original event-winner migration or PostgREST did not refresh its schema cache.
ALTER TABLE public.event_winners
  ADD COLUMN IF NOT EXISTS scheduled_send_email boolean NOT NULL DEFAULT false;

NOTIFY pgrst, 'reload schema';
