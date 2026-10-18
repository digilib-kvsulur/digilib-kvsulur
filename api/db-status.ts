type ApiRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  setHeader(name: string, value: string): void;
  status(code: number): ApiResponse;
  json(body: unknown): void;
};

const CACHE_HEADERS = {
  // Browser cache is brief; Vercel's shared CDN cache protects Supabase from
  // a burst of public status-page visitors.
  "Cache-Control": "public, max-age=30, stale-while-revalidate=30",
  "Vercel-CDN-Cache-Control": "public, s-maxage=120, stale-while-revalidate=300, stale-if-error=600",
};

function respond(res: ApiResponse, status: number, body: unknown) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  Object.entries(CACHE_HEADERS).forEach(([name, value]) => res.setHeader(name, value));
  res.status(status).json(body);
}

function env(name: string): string {
  return ((globalThis as any).process?.env?.[name] || "").trim();
}

function getHost(req: ApiRequest): string {
  const raw = req.headers["x-forwarded-host"] || req.headers.host || "";
  const host = (Array.isArray(raw) ? raw[0] : raw).split(",")[0].trim().toLowerCase();
  return host.replace(/:\d+$/, "");
}

async function fetchJson(url: URL, apiKey: string, timeoutMs = 5000): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`upstream returned ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return respond(res, 405, { status: "unknown", checked_at: new Date().toISOString() });
  }

  const hostname = getHost(req);
  if (!/^[a-z0-9.-]{1,253}$/.test(hostname)) {
    return respond(res, 400, { status: "unknown", checked_at: new Date().toISOString() });
  }

  try {
    let databaseUrl = env("VITE_SUPABASE_URL");
    let databaseAnonKey = env("VITE_SUPABASE_PUBLISHABLE_KEY") || env("VITE_SUPABASE_ANON_KEY");
    const registryUrl = env("VITE_REGISTRY_URL");
    const registryAnonKey = env("VITE_REGISTRY_ANON_KEY");

    // Resolve the current school's own project, matching the client tenant resolver.
    if (registryUrl && registryAnonKey) {
      const url = new URL(`${registryUrl.replace(/\/$/, "")}/rest/v1/schools`);
      url.searchParams.set("select", "status,school_connections(supabase_url,anon_key)");
      url.searchParams.set("hostname", `eq.${hostname}`);
      url.searchParams.set("limit", "1");
      const schools = await fetchJson(url, registryAnonKey);
      const school = Array.isArray(schools) ? schools[0] : null;
      const connection = Array.isArray(school?.school_connections)
        ? school.school_connections[0]
        : school?.school_connections;

      if (school?.status !== "active" || !connection?.supabase_url || !connection?.anon_key) {
        return respond(res, 200, { status: "unknown", checked_at: new Date().toISOString() });
      }
      databaseUrl = connection.supabase_url;
      databaseAnonKey = connection.anon_key;
    }

    if (!databaseUrl || !databaseAnonKey) {
      return respond(res, 200, { status: "unknown", checked_at: new Date().toISOString() });
    }

    const url = new URL(`${databaseUrl.replace(/\/$/, "")}/rest/v1/books`);
    url.searchParams.set("select", "id");
    url.searchParams.set("limit", "1");
    await fetchJson(url, databaseAnonKey);

    return respond(res, 200, { status: "operational", checked_at: new Date().toISOString() });
  } catch {
    // Do not expose project URLs, keys, or upstream error details on a public page.
    return respond(res, 200, { status: "degraded", checked_at: new Date().toISOString() });
  }
}
