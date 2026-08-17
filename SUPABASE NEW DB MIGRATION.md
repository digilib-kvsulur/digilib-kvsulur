# Supabase Migration Plan for digilib-kvsulur

This is a project-specific plan to migrate your `digilib-kvsulur` Supabase Free project to a new Free project without incurring costs.

## User Review Required

> [!IMPORTANT]
> The database migration process will require some downtime for your application. Please ensure users are not actively writing to the database while taking the dump.

> [!WARNING]
> Restoring users and their passwords might involve specific configurations if you want existing login sessions to remain valid. You'll need to decide whether to copy the JWT Secret (which invalidates API keys) or just let users log in again.

## Proposed Changes

Here is the step-by-step migration process tailored to your repository.

### Prerequisites
1. **Install PostgreSQL**: Ensure `psql` is available in your command line.
2. **Install Docker Desktop**: Required for the Supabase CLI to take database dumps.
3. **Install Supabase CLI**: `npm install -g supabase` or `scoop install supabase`.

### Phase 1: Project Setup & Connection Strings
1. **Create the New Supabase Project**: Go to the Supabase Dashboard, create a new project in your preferred region, and save the database password securely.
2. **Get Connection Strings**:
   - `OLD_DB_URL`: The Session Pooler or Direct connection string from your old project.
   - `NEW_DB_URL`: The Session Pooler or Direct connection string from your new project.

### Phase 2: Database Migration
Run the following commands using the Supabase CLI to export your old database and import it into the new one. This will bring over all 107 migrations and your existing data.

```bash
# Export Roles
supabase db dump --db-url "$OLD_DB_URL" -f roles.sql --role-only

# Export Schema
supabase db dump --db-url "$OLD_DB_URL" -f schema.sql

# Export Data
supabase db dump --db-url "$OLD_DB_URL" -f data.sql --use-copy --data-only -x storage.buckets_vectors -x storage.vector_indexes

# Restore Everything to New Project
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" --single-transaction --variable ON_ERROR_STOP=1 --file roles.sql --file schema.sql --command "SET session_replication_role = replica" --file data.sql --dbname "$NEW_DB_URL"
```

*Note: If you encounter `permission denied to grant role "postgres"`, edit `roles.sql` and comment out the `GRANT "postgres" TO "cli_login_postgres";` and `OWNER TO supabase_admin` lines before restoring.*

### Phase 3: Storage Migration
Your project uses multiple storage buckets (e.g., `gallery_images_bucket`, `community_media_bucket`, etc.). 
- The database restore (Step 2) restores the bucket definitions.
- You must manually transfer the actual files. Use the Supabase official migration script or download/upload files from your old project buckets to the new project buckets using the Supabase Dashboard.

### Phase 4: Edge Functions Migration
Your project relies on 8 Edge Functions (`admin-bulk-create-users`, `admin-create-user`, `admin-delete-user`, `admin-reset-password`, `create-admin`, `push-notification`, `send-ticket-email`, `student-first-login-setup`). 

1. **Set Secrets in the New Project**: 
   These functions rely on specific environment variables that must be configured in your new project's Edge Functions settings. Run the following CLI commands to set the secrets on the new project:
   ```bash
   # Link the CLI to your new project
   supabase link --project-ref <your-new-project-id>
   
   # Set the custom secrets
   supabase secrets set VAPID_PUBLIC_KEY="your-vapid-public-key"
   supabase secrets set VAPID_PRIVATE_KEY="your-vapid-private-key"
   supabase secrets set VAPID_SUBJECT="your-vapid-subject"
   supabase secrets set RESEND_API_KEY="your-resend-api-key"
   supabase secrets set LIBRARY_FROM_EMAIL="your-library-email"
   ```
   *Note: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are automatically available to edge functions, but you might need to update them if you are explicitly providing them in your functions.*

2. **Deploy the Edge Functions**:
   ```bash
   supabase functions deploy
   ```

### Phase 5: Authentication Settings
1. **Providers**: Copy over your OAuth settings (Google, GitHub, Microsoft, Discord) from the old project to the new project in the Supabase Dashboard under Authentication -> Providers.
2. **SMTP/Email Templates**: If you use custom email templates or SMTP for Resend, copy those settings over.

### Phase 6: Update Frontend Environment Variables
Update the `.env` file in your `digilib-kvsulur` repository and in your Vercel deployment settings:

```env
VITE_SUPABASE_PROJECT_ID="your-new-supabase-project-id"
VITE_SUPABASE_URL="https://your-new-project-ref.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-new-supabase-anon-key"
```

## Verification Plan

### Manual Verification
Once the application is updated and deployed:
- Attempt to log in with an existing user.
- Test edge functions by triggering an action that sends a push notification or a ticket email.
- Verify file uploads and images from the migrated storage buckets load correctly on the frontend.
- Confirm database read and write operations function as expected across the application.
