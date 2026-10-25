-- Deliver every in-app notification through Web Push, including notifications
-- created by database triggers and while the PWA is closed.
-- Before enabling delivery, store two secrets in Supabase Vault:
--   supabase_url        = https://qbpnsqdtfuhdbiqajsfr.supabase.co
--   push_webhook_secret = the same random secret configured as the
--                         PUSH_WEBHOOK_SECRET Edge Function secret
-- The Edge Function is configured with verify_jwt=false and validates this
-- shared secret for database-triggered calls.

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.dispatch_notification_web_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_supabase_url text;
  v_push_secret text;
  v_records jsonb;
  v_pg_net_schema text;
BEGIN
  SELECT jsonb_agg(jsonb_build_object('id', id))
  INTO v_records
  FROM inserted_notifications;
  IF v_records IS NULL OR jsonb_array_length(v_records) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_supabase_url
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_url'
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT decrypted_secret INTO v_push_secret
  FROM vault.decrypted_secrets
  WHERE name = 'push_webhook_secret'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_supabase_url IS NULL OR v_push_secret IS NULL THEN
    RAISE WARNING 'Push delivery skipped: configure supabase_url and push_webhook_secret in Supabase Vault';
    RETURN NULL;
  END IF;

  -- pg_net's extension schema is not necessarily the schema containing its
  -- API functions (Supabase commonly exposes them from `net`). Resolve the
  -- callable function itself instead of assuming both schemas are identical.
  SELECT n.nspname INTO v_pg_net_schema
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.proname = 'http_post'
    AND p.proargtypes = '25 3802 3802 3802 23'::oidvector
  ORDER BY CASE WHEN n.nspname = 'net' THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_pg_net_schema IS NULL THEN
    RAISE WARNING 'Push delivery skipped: pg_net is not installed';
    RETURN NULL;
  END IF;

  EXECUTE format(
    'SELECT %I.http_post(url := $1, headers := $2, body := $3, timeout_milliseconds := $4)',
    v_pg_net_schema
  ) USING
    rtrim(v_supabase_url, '/') || '/functions/v1/push-notification',
    jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_push_secret),
    jsonb_build_object('records', v_records),
    10000;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS notifications_dispatch_web_push ON public.notifications;
CREATE TRIGGER notifications_dispatch_web_push
AFTER INSERT ON public.notifications
REFERENCING NEW TABLE AS inserted_notifications
FOR EACH STATEMENT
EXECUTE FUNCTION public.dispatch_notification_web_push();

REVOKE ALL ON FUNCTION public.dispatch_notification_web_push() FROM PUBLIC, anon, authenticated;
