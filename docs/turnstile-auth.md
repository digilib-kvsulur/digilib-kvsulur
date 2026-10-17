# Turnstile for authentication

The app renders Cloudflare Turnstile on sign-in, registration, and password-reset email requests. Supabase Auth verifies sign-in and sign-up tokens when CAPTCHA is enabled for each tenant project. The password-reset Edge Function verifies its token directly with Cloudflare.

## Cloudflare

Create a Turnstile widget for the site and allow every hostname used by the app (production domains and any preview domains where authentication is expected). Keep the **site key** and **secret key** separate.

## Vercel

The configured site key is already included in the frontend. If you need to override it for another environment, add this variable for Production and Preview, then redeploy:

```text
VITE_TURNSTILE_SITE_KEY=<Cloudflare site key>
```

The site key is public and is safe to include in the frontend. Never put the secret key in Vercel variables prefixed with `VITE_` or in client code.

## Each tenant Supabase project

For every school project:

1. In **Authentication → Bot and Abuse Protection**, enable CAPTCHA and select **Turnstile**.
2. Enter the Turnstile secret key and save.
3. Add the same secret as an Edge Function secret named `TURNSTILE_SECRET_KEY`, then deploy the `send-password-reset` function:

   ```sh
   supabase secrets set TURNSTILE_SECRET_KEY=<Cloudflare secret key> --project-ref <tenant-project-ref>
   supabase functions deploy send-password-reset --project-ref <tenant-project-ref>
   ```

If you use additional Vercel preview hostnames, add them to `TURNSTILE_ALLOWED_HOSTNAMES` as a comma-separated Edge Function secret and add those same hostnames to the Turnstile widget. The function checks Cloudflare's returned hostname against this allowlist; local development hostnames are not accepted by the deployed function.

The frontend widget can display without the Supabase settings, but authentication will only be protected after the project settings and Edge Function secret are configured. Keep the Cloudflare hostname list and each tenant's Supabase settings in sync.
