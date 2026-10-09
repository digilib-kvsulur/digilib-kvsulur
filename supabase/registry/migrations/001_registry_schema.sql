-- =============================================================================
-- Registry Schema Migration: 001_registry_schema.sql
-- Platform: PM SHRI KV DLMS – Multi-Tenant Registry
-- Description: Central registry that maps school domains → their own Supabase
--              credentials. This schema lives in a SEPARATE "registry" Supabase
--              project (not in any individual school's DB).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- ENUM-like CHECK constraints helpers (kept as plain TEXT + CHECK for
-- portability; easy to migrate to real ENUMs later)
-- ---------------------------------------------------------------------------

-- =============================================================================
-- TABLE: schools
-- Central directory of all KV schools onboarded to the DLMS platform.
-- =============================================================================
CREATE TABLE IF NOT EXISTS schools (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text        NOT NULL,
    kv_code         text        NOT NULL UNIQUE,            -- e.g. 'KV-SULUR-001'
    slug            text        NOT NULL UNIQUE,            -- e.g. 'kvsulur'
    hostname        text        NOT NULL UNIQUE,            -- e.g. 'dlms.kvsulur.in'
    logo_url        text,
    city            text,
    state           text,
    region          text,                                   -- e.g. 'Southern Region'
    contact_email   text,
    contact_name    text,
    status          text        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'active', 'suspended', 'archived')),
    created_at      timestamptz NOT NULL DEFAULT now(),
    activated_at    timestamptz
);

COMMENT ON TABLE  schools IS 'Central directory of all KV schools on the DLMS platform.';
COMMENT ON COLUMN schools.kv_code   IS 'Unique KV identifier assigned by KVS (e.g. KV-SULUR-001).';
COMMENT ON COLUMN schools.slug      IS 'URL-safe short identifier used in routing (e.g. kvsulur).';
COMMENT ON COLUMN schools.hostname  IS 'Production hostname for this school (e.g. dlms.kvsulur.in).';
COMMENT ON COLUMN schools.status    IS 'Lifecycle state: pending → active → suspended | archived.';

-- =============================================================================
-- TABLE: school_connections
-- Per-school Supabase project credentials. One row per school.
-- The anon_key + supabase_url are intentionally readable by the frontend
-- so the tenant resolver can look up the correct project for any hostname.
-- service_key should be migrated to Supabase Vault (see README).
-- =============================================================================
CREATE TABLE IF NOT EXISTS school_connections (
    school_id       uuid        PRIMARY KEY REFERENCES schools(id) ON DELETE CASCADE,
    supabase_url    text        NOT NULL,                   -- https://<ref>.supabase.co
    anon_key        text        NOT NULL,                   -- safe for browser
    project_ref     text        NOT NULL,                   -- short project reference
    service_key     text,                                   -- ⚠ move to Vault; nullable
    db_provisioned  boolean     NOT NULL DEFAULT false,     -- migrations applied?
    migration_ver   text,                                   -- last applied migration tag
    last_health_at  timestamptz,                            -- last successful health check
    storage_mb      integer,                                -- current storage usage
    row_count       integer                                 -- approximate total row count
);

COMMENT ON TABLE  school_connections IS 'Supabase project credentials for each school. anon_key/supabase_url are public for tenant resolution; service_key should be vaulted.';
COMMENT ON COLUMN school_connections.service_key IS 'Service-role key. Keep NULL until Vault integration; never expose to browser.';

-- =============================================================================
-- TABLE: platform_announcements
-- Broadcast messages from super-admins to all schools or a specific subset.
-- =============================================================================
CREATE TABLE IF NOT EXISTS platform_announcements (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    title       text        NOT NULL,
    body        text        NOT NULL,
    type        text        NOT NULL DEFAULT 'info'
                            CHECK (type IN ('info', 'warning', 'critical')),
    target      text        NOT NULL DEFAULT 'all',         -- 'all' or comma-separated slugs
    created_by  uuid,                                       -- nullable; references super_admins
    created_at  timestamptz NOT NULL DEFAULT now(),
    expires_at  timestamptz                                 -- NULL = never expires
);

COMMENT ON TABLE  platform_announcements IS 'Platform-wide broadcast messages. target=''all'' or comma-separated school slugs.';
COMMENT ON COLUMN platform_announcements.expires_at IS 'Row is hidden from public reads after this timestamp. NULL means it never expires.';

-- =============================================================================
-- TABLE: super_admins
-- Platform-level administrators (KVS/DLMS team).
-- =============================================================================
CREATE TABLE IF NOT EXISTS super_admins (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    email       text        NOT NULL UNIQUE,
    name        text        NOT NULL,
    auth_uid    uuid        UNIQUE,                         -- maps to auth.users.id in THIS registry project
    is_active   boolean     NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  super_admins IS 'Platform administrators who manage the registry. auth_uid links to the registry Supabase auth.users.';

-- =============================================================================
-- TABLE: super_admin_audit
-- Append-only audit log of all privileged actions.
-- =============================================================================
CREATE TABLE IF NOT EXISTS super_admin_audit (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id    uuid        NOT NULL,                       -- super_admins.id (not FK to allow historic retention)
    school_id   uuid        REFERENCES schools(id) ON DELETE SET NULL,
    action      text        NOT NULL,                       -- e.g. 'school.activate', 'creds.rotate'
    payload     jsonb,                                      -- contextual data (no secrets)
    ip_address  text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  super_admin_audit IS 'Immutable audit log for all super-admin actions on the platform registry.';

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_schools_hostname  ON schools(hostname);
CREATE INDEX IF NOT EXISTS idx_schools_slug      ON schools(slug);
CREATE INDEX IF NOT EXISTS idx_schools_status    ON schools(status);
CREATE INDEX IF NOT EXISTS idx_school_conn_sid   ON school_connections(school_id);
CREATE INDEX IF NOT EXISTS idx_announcements_exp ON platform_announcements(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_admin_id    ON super_admin_audit(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_school_id   ON super_admin_audit(school_id);

-- =============================================================================
-- ROW-LEVEL SECURITY
-- =============================================================================
ALTER TABLE schools                ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_connections     ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admins           ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admin_audit      ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Helper: is the current JWT user a super-admin?
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS
$$
    SELECT EXISTS (
        SELECT 1
        FROM   super_admins sa
        WHERE  sa.auth_uid  = auth.uid()
        AND    sa.is_active = true
    );
$$;

-- ---------------------------------------------------------------------------
-- schools policies
-- ---------------------------------------------------------------------------
-- Super-admins can do everything.
CREATE POLICY "super_admins_all_schools"
    ON schools
    FOR ALL
    USING  (is_super_admin())
    WITH CHECK (is_super_admin());

-- Anyone (anon + authed) can read active schools – needed for landing pages.
CREATE POLICY "public_read_active_schools"
    ON schools
    FOR SELECT
    USING (status = 'active');

-- ---------------------------------------------------------------------------
-- school_connections policies
-- ---------------------------------------------------------------------------
-- Super-admins: full access.
CREATE POLICY "super_admins_all_connections"
    ON school_connections
    FOR ALL
    USING  (is_super_admin())
    WITH CHECK (is_super_admin());

-- Public (anonymous) SELECT: only anon_key + supabase_url for active schools.
-- The frontend tenant resolver queries ONLY these columns.
-- Enforced at query level; RLS permits the row access.
CREATE POLICY "public_read_active_connections"
    ON school_connections
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM schools s
            WHERE s.id = school_connections.school_id
            AND   s.status = 'active'
        )
    );

-- ---------------------------------------------------------------------------
-- platform_announcements policies
-- ---------------------------------------------------------------------------
-- Super-admins: full access.
CREATE POLICY "super_admins_all_announcements"
    ON platform_announcements
    FOR ALL
    USING  (is_super_admin())
    WITH CHECK (is_super_admin());

-- Public read: non-expired announcements only.
CREATE POLICY "public_read_announcements"
    ON platform_announcements
    FOR SELECT
    USING (
        expires_at IS NULL
        OR expires_at > now()
    );

-- ---------------------------------------------------------------------------
-- super_admins policies
-- ---------------------------------------------------------------------------
-- Only super-admins can read/manage the super_admins table.
CREATE POLICY "super_admins_manage_self"
    ON super_admins
    FOR ALL
    USING  (is_super_admin())
    WITH CHECK (is_super_admin());

-- ---------------------------------------------------------------------------
-- super_admin_audit policies
-- ---------------------------------------------------------------------------
-- Only super-admins can read the audit log; inserts happen via service role.
CREATE POLICY "super_admins_read_audit"
    ON super_admin_audit
    FOR SELECT
    USING (is_super_admin());

CREATE POLICY "super_admins_insert_audit"
    ON super_admin_audit
    FOR INSERT
    WITH CHECK (is_super_admin());

-- =============================================================================
-- SEED DATA: KV Sulur (first school)
-- school_connections is intentionally left empty – credentials will be
-- inserted by the platform admin after provisioning the school's Supabase project.
-- =============================================================================
INSERT INTO schools (name, kv_code, slug, hostname, city, state, region, status, activated_at)
VALUES (
    'PM SHRI KV AFS Sulur',
    'KV-SULUR-001',
    'kvsulur',
    'dlms.kvsulur.in',
    'Sulur',
    'Tamil Nadu',
    'Southern Region',
    'active',
    now()
)
ON CONFLICT (kv_code) DO NOTHING;

-- =============================================================================
-- END OF MIGRATION 001_registry_schema.sql
-- =============================================================================
