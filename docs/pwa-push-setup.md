# PWA background push setup

Web Push is delivered by the browser's push service to the registered service worker, even when the PWA is closed. The site needs a matching VAPID key pair, and the database needs to call the deployed Edge Function whenever notification rows are inserted.

## One-time Supabase setup

1. Apply the migrations, including `20261024100000_dispatch_web_push_on_notification.sql`.
2. Generate one long random secret. Store the exact same value in these two places:
   - Edge Function secret `PUSH_WEBHOOK_SECRET` (Supabase Dashboard → Edge Functions → Secrets, or `supabase secrets set PUSH_WEBHOOK_SECRET=<secret>`).
   - Supabase Vault secret named `push_webhook_secret`.
3. Store the project URL in Supabase Vault as `supabase_url` (for this project: `https://qbpnsqdtfuhdbiqajsfr.supabase.co`). For example, in the SQL Editor:

   ```sql
   select vault.create_secret('https://qbpnsqdtfuhdbiqajsfr.supabase.co', 'supabase_url');
   select vault.create_secret('<same-long-random-secret>', 'push_webhook_secret');
   ```

4. Set the VAPID secrets on the Edge Function: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`. The public key must match `VITE_VAPID_PUBLIC_KEY` used to build the PWA.
5. Deploy `push-notification` after setting the secrets: `supabase functions deploy push-notification`.
6. Rebuild and deploy the PWA after setting `VITE_VAPID_PUBLIC_KEY`.

The database trigger batches all notification rows from one insert statement into a single Edge Function request. The function retries temporary push-service failures up to three attempts and deletes subscriptions that the push service reports as expired. Browser permission, a valid subscription, and network access are still required on each recipient device.
