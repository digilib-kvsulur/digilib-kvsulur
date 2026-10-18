type ApiRequest = { method?: string };
type ApiResponse = {
  setHeader(name: string, value: string): void;
  status(code: number): ApiResponse;
  json(body: unknown): void;
};

const CACHE_HEADERS = {
  // Keep a shared CDN cache so a burst of status-page viewers triggers only
  // one lightweight Management API request every two minutes.
  "Cache-Control": "public, max-age=30, stale-while-revalidate=30",
  "Vercel-CDN-Cache-Control": "public, s-maxage=120, stale-while-revalidate=300, stale-if-error=600",
};

const SERVICE_LABELS: Record<string, string> = {
  db: "Database",
  pooler: "Connection pooler",
  rest: "PostgREST",
  auth: "Auth",
  realtime: "Realtime",
  storage: "Storage",
};
const SERVICE_NAMES = Object.keys(SERVICE_LABELS);

function respond(res: ApiResponse, statusCode: number, body: unknown) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  Object.entries(CACHE_HEADERS).forEach(([name, value]) => res.setHeader(name, value));
  res.status(statusCode).json(body);
}

function projectRef(): string | undefined {
  const explicit = process.env.SUPABASE_PROJECT_REF || process.env.VITE_SUPABASE_PROJECT_ID;
  if (explicit && /^[a-z0-9]{20}$/.test(explicit)) return explicit;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return undefined;
  try {
    const host = new URL(supabaseUrl).hostname;
    const match = host.match(/^([a-z0-9]{20})\.supabase\.co$/);
    return match?.[1];
  } catch {
    return undefined;
  }
}

function emptyServices() {
  return SERVICE_NAMES.map((name) => ({ name, label: SERVICE_LABELS[name], healthy: null, status: "unknown" }));
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return respond(res, 405, { status: "unknown", checked_at: new Date().toISOString(), services: emptyServices() });
  }

  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = projectRef();
  if (!token || !ref) {
    return respond(res, 200, {
      status: "configuration_required",
      description: "Project-specific monitoring needs a Supabase Management API token and project reference configured in Vercel.",
      checked_at: new Date().toISOString(),
      services: emptyServices(),
    });
  }

  try {
    const url = new URL(`https://api.supabase.com/v1/projects/${ref}/health`);
    url.searchParams.set("services", SERVICE_NAMES.join(","));
    url.searchParams.set("timeout_ms", "8000");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const status = response.status === 401 || response.status === 403
        ? "configuration_required"
        : "unknown";
      return respond(res, 200, {
        status,
        description: status === "configuration_required"
          ? "The monitoring token needs project health read access."
          : "Supabase project health could not be retrieved right now.",
        checked_at: new Date().toISOString(),
        services: emptyServices(),
      });
    }

    const upstream = await response.json() as Array<{ name?: string; healthy?: boolean; status?: string }>;
    const healthByName = new Map(
      (Array.isArray(upstream) ? upstream : []).map((item) => [String(item?.name || "").toLowerCase(), item]),
    );
    const services = SERVICE_NAMES.map((name) => {
      const result = healthByName.get(name);
      if (!result) return { name, label: SERVICE_LABELS[name], healthy: null, status: "not_reported" };
      const rawStatus = String(result.status || "unknown").toUpperCase();
      const healthy = result.healthy === true && rawStatus === "ACTIVE_HEALTHY";
      const status = healthy ? "operational"
        : result.healthy === false ? "outage"
        : rawStatus === "COMING_UP" || rawStatus === "GOING_DOWN" ? "degraded"
        : "unknown";
      return { name, label: SERVICE_LABELS[name], healthy: result.healthy === true ? true : result.healthy === false ? false : null, status };
    });

    const hasOutage = services.some((service) => service.status === "outage");
    const hasDegraded = services.some((service) => service.status === "degraded");
    const allReported = services.every((service) => service.status === "operational");
    const status = hasOutage ? "outage" : hasDegraded ? "degraded" : allReported ? "operational" : "unknown";

    return respond(res, 200, {
      status,
      description: status === "operational" ? "All reported DLMS Supabase services are operational."
        : status === "outage" ? "Supabase reports an unhealthy DLMS project service."
        : status === "degraded" ? "One or more DLMS project services are starting or changing state."
        : "Some DLMS project service health is not currently available.",
      checked_at: new Date().toISOString(),
      services,
    });
  } catch {
    // Avoid leaking upstream response details, project identifiers, or secrets.
    return respond(res, 200, {
      status: "unknown",
      description: "Could not reach the project health service. This does not by itself confirm an outage.",
      checked_at: new Date().toISOString(),
      services: emptyServices(),
    });
  }
}
