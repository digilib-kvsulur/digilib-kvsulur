export async function supabaseFunctionErrorMessage(error: unknown, fallback: string): Promise<string> {
  const context = (error as { context?: unknown } | null)?.context;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json();
      if (typeof body?.error === "string") return body.error;
      if (typeof body?.message === "string") return body.message;
    } catch {
      // The function may return a non-JSON proxy error.
    }
  }
  return error instanceof Error ? error.message : fallback;
}
