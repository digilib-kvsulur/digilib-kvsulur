# Supabase connection capacity

## DLMS clients

The web, PWA, and desktop clients use `@supabase/supabase-js` with the project's HTTPS Supabase URL and publishable key. These requests go through Supabase's API gateway; they do not open PostgreSQL connections from each browser. Do not replace `VITE_SUPABASE_URL` with a PostgreSQL pooler URL. Keep the module-level tenant client singleton and use the publishable/anon key with RLS.

The app caches ordinary React Query results for five minutes and avoids refetching on focus/reconnect. Keep that behavior for read-heavy screens. Realtime should be reserved for live features; don't add polling for data already covered by a Realtime listener. Notification lists now fetch when opened, while the app-wide listener handles live notification delivery.

High-traffic screens also avoid preloading data they do not yet need: games fetch content for the selected game and cache it briefly, quiz lists are loaded when the quiz tab opens, quiz history omits question JSON, and live quiz cards request titles/counts instead of full quiz records. Game timers run locally in the browser and do not send a request every second.

The community feed uses aggregate stats RPCs to avoid transferring every like, comment, and vote row. Apply `supabase/migrations/20261016090000_reduce_community_feed_egress.sql` to every tenant project before deploying the app changes.

## Direct PostgreSQL clients and maintenance scripts

For a backend process or maintenance script that must connect directly to PostgreSQL, use the pooler connection string shown in the Supabase project's **Connect** panel. Store it as `SUPABASE_DB_URL` in the local ignored `.env` file or the server's secret settings; never commit it or put it in a `VITE_` variable. Use the pooler host and port from that project rather than guessing a region. The database health monitor uses this setting and does not fall back to a direct database host.

Prefer transaction pooling (usually port `6543`) for short-lived/stateless workers. Use session pooling (usually port `5432`) only when a client needs session-level features such as prepared statements or session settings. Keep direct database connections limited to trusted server-side jobs. The browser app should continue using the Supabase API.

Before changing database connection settings in production, copy the project's exact pooler URI and verify its username, database, TLS option, and network access. A pooler URI contains a database password and must be treated as a secret.
