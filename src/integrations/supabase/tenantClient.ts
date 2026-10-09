import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';
import type { SchoolMeta } from '@/context/TenantContext';

// ─── Module-level singleton ───────────────────────────────────────────────────

export let _tenantClient: SupabaseClient<Database> | null = null;

// Default fallback client using standard env vars (ensures zero crash before async init resolves)
const DEFAULT_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const DEFAULT_SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

let _defaultClient: SupabaseClient<Database> | null = null;
function getDefaultClient(): SupabaseClient<Database> {
  if (!_defaultClient && DEFAULT_SUPABASE_URL && DEFAULT_SUPABASE_KEY) {
    _defaultClient = createClient<Database>(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY, {
      auth: buildAuthOptions(),
    });
  }
  return _defaultClient!;
}

/**
 * Returns the active per-school Supabase client.
 * Falls back to the default client instead of throwing if called before async tenant init finishes.
 */
export function getSupabase(): SupabaseClient<Database> {
  if (_tenantClient) {
    return _tenantClient;
  }
  const fallback = getDefaultClient();
  if (fallback) {
    return fallback;
  }
  throw new Error(
    "[DLMS] Tenant client not initialised and no default Supabase credentials found."
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DEV_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

/** Mirror the auth options used by the original single-tenant client.ts */
const isNativeOrPWA =
  typeof window !== "undefined" &&
  (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true ||
    navigator.userAgent.toLowerCase().includes("electron") ||
    !!(window as any).Capacitor?.isNativePlatform?.()
  );

function buildAuthOptions() {
  return {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: !isNativeOrPWA,
  } as const;
}

function cacheSchool(hostname: string, school: SchoolMeta): void {
  try {
    localStorage.setItem(
      `dlms_tenant_${hostname}`,
      JSON.stringify({ school, cachedAt: Date.now() })
    );
  } catch {
    // Storage might be full or unavailable — silently ignore
  }
}

// ─── Dev fallback school ──────────────────────────────────────────────────────

function makeDevSchool(): SchoolMeta {
  return {
    id: "dev-local",
    name: "Local Dev School",
    slug: "dev",
    hostname: "localhost",
    logoUrl: null,
    city: null,
    state: null,
    region: null,
    status: "active",
  };
}

// ─── initTenantClient ─────────────────────────────────────────────────────────

/**
 * Resolves the correct Supabase credentials for the given hostname.
 *
 * - **Dev hostnames** (`localhost`, `127.0.0.1`, `0.0.0.0`): uses
 *   `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` directly and
 *   returns a mock school so the app works without a registry.
 * - **Production hostnames**: queries the central registry Supabase project
 *   (`VITE_REGISTRY_URL` + `VITE_REGISTRY_ANON_KEY`) to look up the school's
 *   own credentials, then creates a scoped client for that school.
 *
 * Returns `null` when the hostname is not registered (caller should redirect
 * to `/setup`) or the school object when status is `'suspended'` (caller
 * should redirect to `/suspended`).
 */
export async function initTenantClient(
  hostname: string
): Promise<{ client: SupabaseClient<Database>; school: SchoolMeta } | null> {

  // ── Development shortcut ───────────────────────────────────────────────────
  if (DEV_HOSTNAMES.has(hostname)) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

    const client = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: buildAuthOptions(),
    });

    _tenantClient = client;
    const school = makeDevSchool();
    return { client, school };
  }

  // ── Registry lookup ────────────────────────────────────────────────────────
  const registryUrl = import.meta.env.VITE_REGISTRY_URL as string;
  const registryKey = import.meta.env.VITE_REGISTRY_ANON_KEY as string;

  if (!registryUrl || !registryKey) {
    // If registry is not configured yet, fallback to default Supabase env variables
    const fallbackUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const fallbackKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
    if (fallbackUrl && fallbackKey) {
      const client = createClient<Database>(fallbackUrl, fallbackKey, {
        auth: buildAuthOptions(),
      });
      _tenantClient = client;
      return { client, school: makeDevSchool() };
    }
    _tenantClient = null;
    return null;
  }

  const registry = createClient(registryUrl, registryKey);

  const { data, error } = await registry
    .from("schools")
    .select(`
      id,
      name,
      slug,
      hostname,
      logo_url,
      city,
      state,
      region,
      status,
      school_connections (
        supabase_url,
        anon_key
      )
    `)
    .eq("hostname", hostname)
    .single();

  if (error || !data) {
    // Hostname not registered → caller redirects to /setup
    _tenantClient = null;
    return null;
  }

  // Map DB row → SchoolMeta
  const school: SchoolMeta = {
    id: data.id as string,
    name: data.name as string,
    slug: data.slug as string,
    hostname: data.hostname as string,
    logoUrl: (data.logo_url as string | null) ?? null,
    city: (data.city as string | null) ?? null,
    state: (data.state as string | null) ?? null,
    region: (data.region as string | null) ?? null,
    status: data.status as string,
  };

  // Cache the school info regardless of status (so /suspended can display info)
  cacheSchool(hostname, school);

  if (school.status === "suspended") {
    // Don't create a client for suspended schools
    _tenantClient = null;
    return { client: null as unknown as SupabaseClient<Database>, school };
  }

  // ── Build per-school client ────────────────────────────────────────────────
  const connection = Array.isArray(data.school_connections)
    ? data.school_connections[0]
    : (data.school_connections as any);

  if (!connection?.supabase_url || !connection?.anon_key) {
    _tenantClient = null;
    return null;
  }

  const client = createClient<Database>(
    connection.supabase_url as string,
    connection.anon_key as string,
    { auth: buildAuthOptions() }
  );

  _tenantClient = client;
  return { client, school };
}
