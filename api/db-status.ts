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
    // OpenAPI defines `services` as an array. Repeating the key uses the
    // standard form/explode encoding and avoids proxies treating the comma-
    // delimited form as one invalid service name.
    SERVICE_NAMES.forEach((service) => url.searchParams.append("services", service));
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
      const upstreamStatus = response.status;
      const upstreamText = await response.text().catch(() => "");
      let upstreamMessage = "";
      try {
        const errorBody = JSON.parse(upstreamText);
        upstreamMessage = String(errorBody?.message || errorBody?.error_description || errorBody?.error || "").slice(0, 500);
      } catch {
        upstreamMessage = upstreamText.slice(0, 500);
      }
      const upstreamHint = upstreamStatus === 400
        ? /services/i.test(upstreamMessage) ? "Supabase rejected the services query parameter."
          : /timeout_ms/i.test(upstreamMessage) ? "Supabase rejected the timeout_ms query parameter."
          : /ref|project/i.test(upstreamMessage) ? "Supabase rejected the project reference."
          : "Supabase rejected a query parameter or project reference."
        : undefined;
      const status = upstreamStatus === 401 || upstreamStatus === 403
        ? "configuration_required"
        : upstreamStatus === 429
          ? "rate_limited"
          : upstreamStatus === 404
            ? "project_not_found"
            : upstreamStatus >= 500
              ? "upstream_unavailable"
              : "request_rejected";
      const descriptions: Record<string, string> = {
        configuration_required: "Supabase rejected the token. Check that it has Project Settings → Read access for this project.",
        rate_limited: "Supabase is rate limiting health checks. The cached result will be retried shortly.",
        project_not_found: "Supabase could not find this project. Check SUPABASE_PROJECT_REF or the VITE_SUPABASE project ID in Vercel.",
        upstream_unavailable: "Supabase’s Management API returned a server error. The database health is not confirmed by this response.",
        request_rejected: upstreamHint || "Supabase rejected the health request. Check the project reference and service health API configuration.",
      };
      return respond(res, 200, {
        status,
        description: descriptions[status],
        // HTTP status alone helps diagnose configuration without exposing the
        // token, raw upstream body, or project-specific internal details.
        upstream_status: upstreamStatus,
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
