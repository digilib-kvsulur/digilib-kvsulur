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

ALTER TABLE public.push_subscriptions
  ALTER COLUMN subscription_key SET NOT NULL;

ALTER TABLE public.push_subscriptions
  DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_subscription_key_key
  ON public.push_subscriptions (subscription_key);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx
  ON public.push_subscriptions (user_id);
