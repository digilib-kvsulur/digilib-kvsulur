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

async function fetchJson(url: string, timeoutMs = 5000): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
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

  try {
    // Read Supabase's public platform-status feed only. This intentionally
    // never contacts the tenant registry or any school database.
    const summary = await fetchJson("https://status.supabase.com/api/v2/summary.json");
    const indicator = String(summary?.status?.indicator || "unknown").toLowerCase();
    const status = indicator === "none" ? "operational"
      : indicator === "unknown" ? "unknown"
      : "degraded";
    return respond(res, 200, {
      status,
      description: String(summary?.status?.description || "Supabase platform status unavailable").slice(0, 120),
      indicator,
      updated_at: summary?.page?.updated_at || null,
      checked_at: new Date().toISOString(),
      components: Array.isArray(summary?.components)
        ? summary.components.slice(0, 20).map((component: any) => ({
          name: String(component?.name || "Service").slice(0, 80),
          status: String(component?.status || "unknown").slice(0, 40),
        }))
        : [],
    });
  } catch {
    // Do not expose upstream error details on a public page.
    return respond(res, 200, { status: "unknown", description: "Supabase status feed unavailable", checked_at: new Date().toISOString() });
  }
}
