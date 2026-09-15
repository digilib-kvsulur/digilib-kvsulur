-- Rate-limit the public recovery endpoint without storing recovery links or
-- email content. Edge Functions access this table with the service role.
CREATE TABLE IF NOT EXISTS public.password_reset_delivery_limits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_requested_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.password_reset_delivery_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.password_reset_delivery_limits FROM anon, authenticated;
GRANT ALL ON TABLE public.password_reset_delivery_limits TO service_role;
