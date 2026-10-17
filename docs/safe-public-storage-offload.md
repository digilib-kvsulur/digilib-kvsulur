# Safe public storage offload

## Scope

This staged path copies only objects from buckets that the migrations explicitly make public:

- `community-media`
- `event-images`
- `gallery-images`

It does not change database rows, upload flows, bucket policies, authentication, or Supabase objects. The source files remain available in Supabase for rollback. Each R2 key is prefixed with the tenant's Supabase project reference so separate school projects cannot overwrite one another.

Do not add `avatars`, `certificates`, `feedback_attachments`, `event-submissions`, or `study-materials` to this copy. Those buckets can contain personal, private, or school-restricted content. `book-covers` is also excluded because the checked-in policy does not establish that its bucket is public.

## What must be configured

Create an R2 bucket and attach an HTTPS custom domain for public reads. Add these values to an ignored local `.env` file or a secured CI environment. Do not prefix secrets with `VITE_`, commit them, or paste them into chat.

```dotenv
SUPABASE_URL=https://<tenant-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-for-this-tenant>
R2_ACCOUNT_ID=<cloudflare-account-id>
R2_ACCESS_KEY_ID=<r2-access-key-id>
R2_SECRET_ACCESS_KEY=<r2-secret-access-key>
R2_BUCKET_NAME=<r2-bucket-name>
R2_PUBLIC_BASE_URL=https://<r2-custom-domain>
```

The Supabase service-role key grants elevated access. Use it only in this local migration script or a secured one-time job, then remove it from that environment when the copy is complete.

## Copy and verify

First run a no-write preflight:

```sh
npm run storage:r2:copy
```

When the values and destination are confirmed, run the copy:

```sh
R2_MIGRATION_CONFIRM_COPY=YES npm run storage:r2:copy
```

On PowerShell:

```powershell
$env:R2_MIGRATION_CONFIRM_COPY = "YES"
npm run storage:r2:copy
Remove-Item Env:R2_MIGRATION_CONFIRM_COPY
```

The script copies files and verifies each destination object's byte count and SHA-256 metadata. It writes a manifest under `tmp/`, records failures, and never deletes source files or edits database URLs. Run it once for each tenant project, using that tenant's Supabase URL and service-role key. Re-running safely overwrites destination objects with the current source copy.

## Before routing traffic to R2

The copy step alone does **not** change the app's asset URLs. Review the manifest and failures, then verify representative objects through the R2 custom domain. Only after that should a separate cutover map public Supabase URLs to the manifest's R2 URLs. Keep Supabase originals for at least 30 days after cutover. Rollback consists of routing reads back to the original Supabase URLs; no restore from R2 is needed because the originals were retained.

Do not run the script until the R2 bucket and custom domain are configured and the required secrets are available. This repository cannot perform that external copy without those credentials.
