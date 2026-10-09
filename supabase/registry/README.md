# DLMS Platform Registry — Supabase Project

> **This folder belongs to the _Registry_ Supabase project — a separate, dedicated project that acts as the platform backbone. It is NOT the same as any individual school's Supabase project.**

---

## What Is the Registry?

The Registry is a single Supabase project that answers one question for the frontend:

> *"Given a hostname (e.g. `dlms.kvsulur.in`), which Supabase project should I connect to?"*

It stores:

| Table | Purpose |
|---|---|
| `schools` | Directory of every KV school on the platform |
| `school_connections` | Each school's Supabase URL + anon key (tenant credentials) |
| `platform_announcements` | Broadcast messages from super-admins to schools |
| `super_admins` | Platform-level administrators |
| `super_admin_audit` | Append-only audit log of privileged actions |

The frontend resolves the correct school Supabase client at runtime by querying `school_connections` using the current `window.location.hostname`.

---

## Folder Structure

```
supabase/registry/
├── README.md                       ← you are here
└── migrations/
    └── 001_registry_schema.sql     ← initial schema, RLS, indexes, seed
```

---

## Setup: Creating the Registry Project

### 1. Create a new Supabase project

Go to [https://supabase.com/dashboard](https://supabase.com/dashboard) and create a **brand-new project** dedicated to the registry. Give it a descriptive name like `dlms-registry` or `kvs-dlms-platform`.

> ⚠️ **Do not reuse an existing school's Supabase project for the registry.** They must remain isolated.

### 2. Run the migration

Open the Supabase **SQL Editor** for the registry project and paste the entire contents of [`migrations/001_registry_schema.sql`](./migrations/001_registry_schema.sql), then click **Run**.

This will create all tables, enable RLS, add indexes, and seed the first school row (KV Sulur).

Alternatively, if you have the Supabase CLI linked to the registry project:

```bash
supabase db push --db-url "postgresql://postgres:<password>@db.<registry-ref>.supabase.co:5432/postgres"
```

### 3. Add environment variables

Copy `.env.example` to `.env` (if not already done) and fill in the registry credentials:

```env
VITE_REGISTRY_URL="https://<registry-project-ref>.supabase.co"
VITE_REGISTRY_ANON_KEY="<registry-anon-key>"
```

Find these values in:  
**Supabase Dashboard → Registry Project → Project Settings → API**

---

## Adding a New School

### Step 1 — Provision a school Supabase project

Create another new Supabase project for the school (e.g. `dlms-kvnagpur`). Apply the school-level migrations to it.

### Step 2 — Insert into `schools`

```sql
INSERT INTO schools (name, kv_code, slug, hostname, city, state, region, status, activated_at)
VALUES (
    'PM SHRI KV Nagpur',          -- full school name
    'KV-NAGPUR-001',              -- unique KVS code
    'kvnagpur',                   -- URL-safe slug
    'dlms.kvnagpur.in',           -- production hostname
    'Nagpur',
    'Maharashtra',
    'Pune Region',
    'active',
    now()
);
```

Set `status = 'pending'` if the school is not yet ready to go live.

### Step 3 — Insert into `school_connections`

```sql
INSERT INTO school_connections (
    school_id,
    supabase_url,
    anon_key,
    project_ref,
    db_provisioned,
    migration_ver
)
SELECT
    id,
    'https://<school-project-ref>.supabase.co',
    '<school-anon-key>',
    '<school-project-ref>',
    true,
    '001'
FROM schools
WHERE slug = 'kvnagpur';
```

> The `anon_key` here is the **school project's** anon key — safe for browsers.  
> Leave `service_key` NULL for now (see section below on Vault).

### Step 4 — Verify

Query the registry to confirm the tenant resolver will work:

```sql
SELECT s.hostname, sc.supabase_url, sc.anon_key
FROM   schools s
JOIN   school_connections sc ON sc.school_id = s.id
WHERE  s.slug = 'kvnagpur'
AND    s.status = 'active';
```

---

## Row-Level Security Summary

| Table | Anon (public) | Authenticated Super-Admin |
|---|---|---|
| `schools` | SELECT active rows only | Full access |
| `school_connections` | SELECT active rows (anon_key + supabase_url) | Full access |
| `platform_announcements` | SELECT non-expired rows | Full access |
| `super_admins` | ❌ No access | Full access |
| `super_admin_audit` | ❌ No access | SELECT + INSERT |

A user is considered a **super-admin** if their `auth.uid()` matches a row in `super_admins` where `is_active = true`.

---

## Security Notes

### `service_key` and Supabase Vault

The `school_connections.service_key` column exists as a placeholder only. **Do not store production service-role keys in plain text in this column.**

Once the platform matures:

1. Store each school's service key in **Supabase Vault** (the registry project's secrets store).
2. Reference the Vault secret by name in `service_key` (e.g. `vault:kvnagpur_service_key`).
3. Remove direct string storage from the column, or drop the column entirely.

See [Supabase Vault docs](https://supabase.com/docs/guides/database/vault) for setup.

### `anon_key` is public by design

The school's `anon_key` is intentionally readable by anonymous users — this is how the frontend performs tenant resolution without requiring a login. Supabase anon keys are safe for browsers; they are scoped by RLS policies on the school's own project.

---

## Environment Variables Reference

| Variable | Description |
|---|---|
| `VITE_REGISTRY_URL` | Supabase URL of the registry project |
| `VITE_REGISTRY_ANON_KEY` | Anon key of the registry project |
| `VITE_SUPABASE_URL` | _(Legacy / single-tenant)_ Direct school project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | _(Legacy / single-tenant)_ School project anon key |

In the multi-tenant setup, the frontend resolves `VITE_SUPABASE_URL` dynamically at runtime from the registry, so the legacy variables may eventually be removed.

---

*Last updated: Phase 1 – Registry Bootstrap*
