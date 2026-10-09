// Multi-tenant client — use getSupabase() for dynamic per-school client.
// This file re-exports for backward compatibility with existing imports.
// During the transition, this module lazy-initialises from tenantClient.
import { getSupabase } from './tenantClient';
import type { Database } from './types';
import type { SupabaseClient } from '@supabase/supabase-js';

// Backward-compatible named export used by all existing components.
// Returns the initialised tenant client (set during app boot in TenantProvider).
export const supabase: SupabaseClient<Database> = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    return (getSupabase() as any)[prop];
  },
});