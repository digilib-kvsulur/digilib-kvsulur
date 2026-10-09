-- =============================================================================
-- Migration: Add super_admins table to each school's local DB
-- This allows super admin access to work without a separate registry project.
-- When a dedicated registry project is configured (VITE_REGISTRY_URL),
-- this table is ignored in favor of the registry's super_admins table.
-- =============================================================================

CREATE TABLE IF NOT EXISTS super_admins (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text        NOT NULL UNIQUE,
  name        text        NOT NULL DEFAULT 'Super Admin',
  auth_uid    uuid        UNIQUE,          -- maps to auth.users.id
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE super_admins IS 'Platform-level super administrators. Used when no dedicated registry project is configured.';

-- Enable Row Level Security
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

-- Helper function: is current JWT user a super admin?
CREATE OR REPLACE FUNCTION is_super_admin_local()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS
$$
  SELECT EXISTS (
    SELECT 1 FROM super_admins sa
    WHERE (sa.auth_uid = auth.uid() OR sa.email = auth.jwt() ->> 'email')
    AND   sa.is_active = true
  );
$$;

-- Super admins can read/manage their own table
CREATE POLICY "super_admins_manage_self_local"
  ON super_admins
  FOR ALL
  USING  (is_super_admin_local())
  WITH CHECK (is_super_admin_local());

-- Allow reading by email for initial verification (anon/authenticated)
CREATE POLICY "allow_email_lookup_local"
  ON super_admins
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Allow authenticated users to self-link auth_uid when email matches
CREATE POLICY "allow_self_link_auth_uid_local"
  ON super_admins
  FOR UPDATE
  TO authenticated
  USING (email = (auth.jwt() ->> 'email'))
  WITH CHECK (email = (auth.jwt() ->> 'email'));
