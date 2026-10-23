-- Keep one push endpoint/token per device so signing in on a second device
-- does not silently disable notifications on the first one.
ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS subscription_key text;

UPDATE public.push_subscriptions
SET subscription_key = COALESCE(
  subscription_object->>'endpoint',
  'capacitor:' || (subscription_object->>'token'),
  'legacy:' || id::text
)
WHERE subscription_key IS NULL;

-- Older versions replaced a user's subscription inconsistently, which could
-- leave the same device endpoint attached to multiple rows. Keep the newest.
WITH ranked_subscriptions AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY subscription_key
           ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
         ) AS row_number
  FROM public.push_subscriptions
)
DELETE FROM public.push_subscriptions AS subscriptions
USING ranked_subscriptions AS ranked
WHERE subscriptions.id = ranked.id
  AND ranked.row_number > 1;

ALTER TABLE public.push_subscriptions
  ALTER COLUMN subscription_key SET NOT NULL;

ALTER TABLE public.push_subscriptions
  DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_subscription_key_key
  ON public.push_subscriptions (subscription_key);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx
  ON public.push_subscriptions (user_id);
