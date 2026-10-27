CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

ALTER TABLE public.event_winners
  ADD COLUMN IF NOT EXISTS scheduled_send_email boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.release_scheduled_event_winners()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  r record;
  released_count integer := 0;
  supabase_url text;
  email_webhook_secret text;
  pg_net_schema text;
BEGIN
  SELECT decrypted_secret INTO supabase_url
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_url'
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT decrypted_secret INTO email_webhook_secret
  FROM vault.decrypted_secrets
  WHERE name IN ('scheduled_email_webhook_secret', 'push_webhook_secret')
  ORDER BY CASE name WHEN 'scheduled_email_webhook_secret' THEN 0 ELSE 1 END, created_at DESC
  LIMIT 1;

  SELECT n.nspname INTO pg_net_schema
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.proname = 'http_post'
    AND p.proargtypes = '25 3802 3802 3802 23'::oidvector
  ORDER BY CASE WHEN n.nspname = 'net' THEN 0 ELSE 1 END
  LIMIT 1;

  FOR r IN
    SELECT ew.id, ew.event_id, ew.user_id, ew.position_title, ew.collection_date,
           ew.collection_venue, ew.librarian_note, ew.scheduled_release_by,
           ew.scheduled_send_email, ew.certificate_id, le.title AS event_title
    FROM public.event_winners ew
    JOIN public.library_events le ON le.id = ew.event_id
    WHERE ew.is_published = false
      AND ew.scheduled_release_at IS NOT NULL
      AND ew.scheduled_release_at <= now()
    ORDER BY ew.scheduled_release_at, ew.event_id, ew.created_at
    FOR UPDATE OF ew SKIP LOCKED
  LOOP
    UPDATE public.event_winners
    SET is_published = true, published_at = now()
    WHERE id = r.id;

    UPDATE public.library_events SET is_published = true WHERE id = r.event_id;

    INSERT INTO public.notifications (target_user_id, sent_by, title, message, type)
    VALUES (
      r.user_id,
      COALESCE(r.scheduled_release_by, r.user_id),
      '🏆 Winner Announced: ' || COALESCE(r.position_title, 'Event Winner') || '!',
      'Your event results for ' || r.event_title || ' are now available. Award: ' || COALESCE(r.position_title, 'Winner') ||
        CASE WHEN r.collection_date IS NOT NULL THEN ' · Collection date: ' || to_char(r.collection_date, 'FMDay, FMMonth DD, YYYY') ELSE '' END ||
        CASE WHEN r.collection_venue IS NOT NULL THEN ' · Venue: ' || r.collection_venue ELSE '' END ||
        CASE WHEN r.librarian_note IS NOT NULL THEN ' · ' || r.librarian_note ELSE '' END,
      'award'
    );

    IF r.scheduled_send_email THEN
      IF supabase_url IS NULL OR email_webhook_secret IS NULL OR pg_net_schema IS NULL THEN
        RAISE WARNING 'Scheduled winner email for % skipped: configure supabase_url, scheduled_email_webhook_secret (or push_webhook_secret), and pg_net', r.id;
      ELSE
        EXECUTE format(
          'SELECT %I.http_post(url := $1, headers := $2, body := $3, timeout_milliseconds := $4)',
          pg_net_schema
        ) USING
          rtrim(supabase_url, '/') || '/functions/v1/send-email-campaign',
          jsonb_build_object('Content-Type', 'application/json', 'x-scheduled-email-secret', email_webhook_secret),
          jsonb_build_object(
            'sentBy', r.scheduled_release_by,
            'recipientIds', jsonb_build_array(r.user_id),
            'preset', 'event_winner',
            'customMessage', 'Event: ' || r.event_title || E'\nAward: ' || COALESCE(r.position_title, 'Winner'),
            'details', jsonb_build_object(
              'eventTitle', r.event_title,
              'positionTitle', r.position_title,
              'hasCertificate', r.certificate_id IS NOT NULL
            )
          ),
          10000;
      END IF;
    END IF;

    released_count := released_count + 1;
  END LOOP;

  RETURN released_count;
END;
$$;

REVOKE ALL ON FUNCTION public.release_scheduled_event_winners() FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
