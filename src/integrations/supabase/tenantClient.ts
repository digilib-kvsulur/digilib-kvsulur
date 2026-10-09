import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';
import type { SchoolMeta } from '@/context/TenantContext';

// ─── Module-level singleton ───────────────────────────────────────────────────

const DEFAULT_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const DEFAULT_SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

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

let _defaultClient: SupabaseClient<Database> | null = null;

export function getDefaultClient(): SupabaseClient<Database> {
  if (!_defaultClient && DEFAULT_SUPABASE_URL && DEFAULT_SUPABASE_KEY) {
    _defaultClient = createClient<Database>(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY, {
      auth: buildAuthOptions(),
    });
  }
  return _defaultClient!;
}

// Initialise eagerly so any module importing getSupabase() gets an active client immediately
export let _tenantClient: SupabaseClient<Database> | null = getDefaultClient();

export function setTenantClient(client: SupabaseClient<Database> | null) {
  _tenantClient = client;
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
    _tenantClient = fallback;
    return fallback;
  }
  throw new Error(
    "[DLMS] Tenant client not initialised and no default Supabase credentials found."
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export interface CachedTenantData {
  school: SchoolMeta;
  connection?: {
    supabase_url: string;
    anon_key: string;
  };
  cachedAt: number;
}

function cacheSchool(
  hostname: string,
  school: SchoolMeta,
  connection?: { supabase_url: string; anon_key: string }
): void {
  try {
    localStorage.setItem(
      `dlms_tenant_${hostname}`,
      JSON.stringify({ school, connection, cachedAt: Date.now() })
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
 * Reuses the default singleton client whenever connecting to the default school
 * to avoid session destruction and GoTrue token collisions.
 */
export async function initTenantClient(
  hostname: string
): Promise<{ client: SupabaseClient<Database>; school: SchoolMeta } | null> {

  // ── Development shortcut ───────────────────────────────────────────────────
  if (DEV_HOSTNAMES.has(hostname)) {
    const client = getDefaultClient();
    _tenantClient = client;
    const school = makeDevSchool();
    return { client, school };
  }

  // ── Registry lookup ────────────────────────────────────────────────────────
  const registryUrl = import.meta.env.VITE_REGISTRY_URL as string;
  const registryKey = import.meta.env.VITE_REGISTRY_ANON_KEY as string;

  if (!registryUrl || !registryKey) {
    // If registry is not configured yet, fallback to default Supabase env variables
    const fallback = getDefaultClient();
    if (fallback) {
      _tenantClient = fallback;
      return { client: fallback, school: makeDevSchool() };
    }
    _tenantClient = null;
    return null;
  }

  const registry = createClient(registryUrl, registryKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

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

  const connection = Array.isArray(data.school_connections)
    ? data.school_connections[0]
    : (data.school_connections as any);

  // Cache school info and connection
  cacheSchool(
    hostname,
    school,
    connection ? { supabase_url: connection.supabase_url, anon_key: connection.anon_key } : undefined
  );

  if (school.status === "suspended") {
    // Don't create a client for suspended schools
    _tenantClient = null;
    return { client: null as unknown as SupabaseClient<Database>, school };
  }

  // ── Build per-school client ────────────────────────────────────────────────
  if (!connection?.supabase_url || !connection?.anon_key) {
    _tenantClient = null;
    return null;
  }

  // If the school uses the same credentials as default, reuse defaultClient to preserve session
  if (connection.supabase_url === DEFAULT_SUPABASE_URL && connection.anon_key === DEFAULT_SUPABASE_KEY) {
    const client = getDefaultClient();
    _tenantClient = client;
    return { client, school };
  }

  const client = createClient<Database>(
    connection.supabase_url as string,
    connection.anon_key as string,
    { auth: buildAuthOptions() }
  );

  _tenantClient = client;
  return { client, school };
}
