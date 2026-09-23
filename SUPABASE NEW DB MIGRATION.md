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

### Phase 7: Post-Migration Storage Buckets & RLS Policy Fixes

> [!CAUTION]
> When migrating database dumps between Supabase projects, Supabase **does not automatically create storage buckets** in `storage.buckets`, and certain RLS policies (such as `system_settings`, `storage.objects`, `fine_settings`, `reading_goals`) or role helper functions (`is_staff_or_admin`, `get_profile_role`) may lack permissions or desync from newly authenticated user IDs. This causes errors like:
> - `"new row violates row-level security policy for table 'objects'"` when uploading gallery, certificate, event, or profile images.
> - `"new row violates row-level security policy for table 'system_settings'"` when saving library settings.

#### Step 1: Run the Unified Post-Migration SQL Fix
Navigate to **Supabase Dashboard -> SQL Editor** on your new project and run the following script:

```sql
-- ==============================================================================
-- 1. ENSURE ALL STORAGE BUCKETS EXIST AND ARE PUBLIC
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('gallery-images', 'gallery-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('event-images', 'event-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('certificates', 'certificates', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf']),
  ('community-media', 'community-media', true, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'application/pdf']),
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('study-materials', 'study-materials', true, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
  ('event-submissions', 'event-submissions', true, 20971520, NULL),
  ('feedback_attachments', 'feedback_attachments', true, 10485760, NULL),
  ('book-covers', 'book-covers', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = COALESCE(EXCLUDED.allowed_mime_types, storage.buckets.allowed_mime_types);

-- ==============================================================================
-- 2. FIX HELPER FUNCTIONS AND PERMISSIONS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.is_staff_or_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = _uid AND lower(coalesce(role, '')) IN ('admin', 'staff', 'librarian', 'teacher', 'moderator')
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _uid AND (role::text ILIKE 'admin%' OR role::text ILIKE 'mod%')
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_staff_or_admin(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_profile_role(_user_id uuid) 
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT coalesce(p.role, 'student')
  FROM public.profiles p
  WHERE p.id = _user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_role(uuid) TO anon, authenticated, service_role;

-- ==============================================================================
-- 3. FIX STORAGE RLS POLICIES FOR storage.objects
-- ==============================================================================
-- Note: storage.objects already has RLS enabled by supabase_admin by default.
-- Do not run ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY (fails with 42501: must be owner of table objects).

DROP POLICY IF EXISTS "Public can view gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Admins and teachers can upload gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Admins and teachers can update gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Admins and teachers can delete gallery images" ON storage.objects;

DROP POLICY IF EXISTS "Public can view event images" ON storage.objects;
DROP POLICY IF EXISTS "Admins and staff can upload event images" ON storage.objects;
DROP POLICY IF EXISTS "Admins and staff can update event images" ON storage.objects;
DROP POLICY IF EXISTS "Admins and staff can delete event images" ON storage.objects;

DROP POLICY IF EXISTS "certificates_select" ON storage.objects;
DROP POLICY IF EXISTS "certificates_insert" ON storage.objects;
DROP POLICY IF EXISTS "certificates_update" ON storage.objects;
DROP POLICY IF EXISTS "certificates_delete" ON storage.objects;

DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;

DROP POLICY IF EXISTS "Public can view book covers" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload book covers" ON storage.objects;
DROP POLICY IF EXISTS "Staff can update book covers" ON storage.objects;

-- SELECT policies
CREATE POLICY "Public can view gallery images" ON storage.objects 
  FOR SELECT USING (bucket_id = 'gallery-images');

CREATE POLICY "Public can view event images" ON storage.objects 
  FOR SELECT USING (bucket_id = 'event-images');

CREATE POLICY "certificates_select" ON storage.objects 
  FOR SELECT USING (bucket_id = 'certificates');

CREATE POLICY "Public can view avatars" ON storage.objects 
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Public can view book covers" ON storage.objects 
  FOR SELECT USING (bucket_id = 'book-covers');

-- INSERT / UPDATE / DELETE policies
CREATE POLICY "Admins and teachers can upload gallery images" ON storage.objects 
  FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'gallery-images' AND (public.is_staff_or_admin(auth.uid()) OR auth.role() = 'authenticated'));

CREATE POLICY "Admins and teachers can update gallery images" ON storage.objects 
  FOR UPDATE TO authenticated 
  USING (bucket_id = 'gallery-images' AND (public.is_staff_or_admin(auth.uid()) OR auth.role() = 'authenticated'));

CREATE POLICY "Admins and teachers can delete gallery images" ON storage.objects 
  FOR DELETE TO authenticated 
  USING (bucket_id = 'gallery-images' AND public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Admins and staff can upload event images" ON storage.objects 
  FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'event-images' AND (public.is_staff_or_admin(auth.uid()) OR auth.role() = 'authenticated'));

CREATE POLICY "Admins and staff can update event images" ON storage.objects 
  FOR UPDATE TO authenticated 
  USING (bucket_id = 'event-images' AND (public.is_staff_or_admin(auth.uid()) OR auth.role() = 'authenticated'));

CREATE POLICY "Admins and staff can delete event images" ON storage.objects 
  FOR DELETE TO authenticated 
  USING (bucket_id = 'event-images' AND public.is_staff_or_admin(auth.uid()));

CREATE POLICY "certificates_insert" ON storage.objects 
  FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'certificates' AND (public.is_staff_or_admin(auth.uid()) OR auth.role() = 'authenticated'));

CREATE POLICY "certificates_update" ON storage.objects 
  FOR UPDATE TO authenticated 
  USING (bucket_id = 'certificates' AND (public.is_staff_or_admin(auth.uid()) OR auth.role() = 'authenticated'));

CREATE POLICY "certificates_delete" ON storage.objects 
  FOR DELETE TO authenticated 
  USING (bucket_id = 'certificates' AND (public.is_staff_or_admin(auth.uid()) OR auth.role() = 'authenticated'));

CREATE POLICY "Users can upload their own avatars" ON storage.objects 
  FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatars" ON storage.objects 
  FOR UPDATE TO authenticated 
  USING (bucket_id = 'avatars');

CREATE POLICY "Staff can upload book covers" ON storage.objects 
  FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'book-covers' AND (public.is_staff_or_admin(auth.uid()) OR auth.role() = 'authenticated'));

CREATE POLICY "Staff can update book covers" ON storage.objects 
  FOR UPDATE TO authenticated 
  USING (bucket_id = 'book-covers' AND (public.is_staff_or_admin(auth.uid()) OR auth.role() = 'authenticated'));

-- ==============================================================================
-- 4. FIX public.system_settings POLICIES
-- ==============================================================================
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Anyone can read system settings" ON public.system_settings;
DROP POLICY IF EXISTS "settings readable" ON public.system_settings;
DROP POLICY IF EXISTS "staff manage settings" ON public.system_settings;

GRANT SELECT ON public.system_settings TO anon, authenticated;
GRANT ALL ON public.system_settings TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;

CREATE POLICY "system_settings_select" ON public.system_settings 
  FOR SELECT USING (true);

CREATE POLICY "system_settings_manage" ON public.system_settings 
  FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid()) OR auth.role() = 'authenticated')
  WITH CHECK (public.is_staff_or_admin(auth.uid()) OR auth.role() = 'authenticated');

-- ==============================================================================
-- 5. FIX public.fine_settings & public.reading_goals POLICIES
-- ==============================================================================
ALTER TABLE public.fine_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fine_settings read" ON public.fine_settings;
DROP POLICY IF EXISTS "fine_settings staff write" ON public.fine_settings;
DROP POLICY IF EXISTS "fine_settings_read" ON public.fine_settings;
DROP POLICY IF EXISTS "fine_settings_staff" ON public.fine_settings;

GRANT SELECT, INSERT, UPDATE ON public.fine_settings TO authenticated;
GRANT SELECT ON public.fine_settings TO anon;

CREATE POLICY "fine_settings_select" ON public.fine_settings 
  FOR SELECT USING (true);

CREATE POLICY "fine_settings_write" ON public.fine_settings 
  FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid()) OR auth.role() = 'authenticated')
  WITH CHECK (public.is_staff_or_admin(auth.uid()) OR auth.role() = 'authenticated');

ALTER TABLE public.reading_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reading_goals staff write" ON public.reading_goals;
DROP POLICY IF EXISTS "goals_staff_write" ON public.reading_goals;

CREATE POLICY "reading_goals_staff_write" ON public.reading_goals
  FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid()) OR user_id = auth.uid() OR auth.role() = 'authenticated')
  WITH CHECK (public.is_staff_or_admin(auth.uid()) OR user_id = auth.uid() OR auth.role() = 'authenticated');

-- ==============================================================================
-- 6. VERIFY / ASSIGN ADMIN ROLES TO LOGGED-IN STAFF
-- ==============================================================================
UPDATE public.profiles 
SET role = 'admin' 
WHERE email IN ('pmshrikvafssulur@gmail.com', 'admin@kvsulur.edu.in');
```

#### Step 2: Ensure Your Logged-In User is Set to 'admin'
If you are logging in with a new email or OAuth account, find your profile ID in the Supabase Dashboard -> Table Editor (`profiles`), and set your `role` column to `'admin'`, or run:
```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'your-email@example.com';
```

## Verification Plan

### Manual Verification
Once the application is updated and deployed:
- **Image Uploads**: Go to Admin Dashboard -> Gallery / Certificates / Events, and upload an image. Confirm it completes successfully without an RLS `42501` error.
- **Library Settings**: Go to Admin Dashboard -> Library Settings, change a value (e.g., daily fine or reading goal), and click "Save". Confirm the toast notification says "Settings saved" without RLS rejection.
- **Login & Profile**: Attempt to log in with an existing user and verify that role-based tabs (Admin Dashboard vs Student Dashboard) render appropriately.
- **Storage Public URLs**: Open the uploaded media in an incognito window to verify public readability.
