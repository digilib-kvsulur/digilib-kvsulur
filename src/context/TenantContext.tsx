import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  initTenantClient,
  getDefaultClient,
  setTenantClient,
  type SchoolMeta,
  type CachedTenantData,
} from "@/integrations/supabase/tenantClient";

// ─── Types ────────────────────────────────────────────────────────────────────

export type { SchoolMeta };

interface TenantContextValue {
  school: SchoolMeta | null;
  loading: boolean;
  error: string | null;
}

// ─── Context ─────────────────────────────────────────────────────────────────

export const TenantContext = createContext<TenantContextValue>({
  school: null,
  loading: true,
  error: null,
});

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTenant(): TenantContextValue {
  return useContext(TenantContext);
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCachedSchool(hostname: string): CachedTenantData | null {
  try {
    const raw = localStorage.getItem(`dlms_tenant_${hostname}`);
    if (!raw) return null;
    const parsed: CachedTenantData = JSON.parse(raw);
    if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) return null;
    return parsed.school ? parsed : null;
  } catch {
    return null;
  }
}

// ─── Dev hostnames ────────────────────────────────────────────────────────────

const DEV_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function TenantProvider({ children }: { children: ReactNode }) {
  const [school, setSchool] = useState<SchoolMeta | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const hostname = window.location.hostname;

    async function bootstrap() {
      // 1. Try localStorage cache first for instant render
      if (!DEV_HOSTNAMES.has(hostname)) {
        const cached = getCachedSchool(hostname);
        if (cached?.school) {
          if (!cancelled) {
            setSchool(cached.school);
            setLoading(false);
          }
          // Ensure client is pointing to the default client if no custom URL
          if (!cached.connection?.supabase_url) {
            setTenantClient(getDefaultClient());
          }
        }
      }

      // 2. Fetch / initialise the tenant client
      try {
        const result = await initTenantClient(hostname);
        if (cancelled) return;

        if (!result) {
          // Unknown hostname → redirect to setup
          window.location.replace("/setup");
          return;
        }

        setSchool(result.school);
      } catch (err: unknown) {
        if (!cancelled && !school) {
          setError(err instanceof Error ? err.message : "Failed to load school info");
          setSchool(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    bootstrap();
    return () => { cancelled = true; };
  }, []);

  // Redirect suspended schools
  useEffect(() => {
    if (school?.status === "suspended" && window.location.pathname !== "/suspended") {
      window.location.replace("/suspended");
    }
  }, [school]);

  return (
    <TenantContext.Provider value={{ school, loading, error }}>
      {children}
    </TenantContext.Provider>
  );
}
