const ALLOWED_EMAIL_DOMAINS = new Set(["gmail.com", "kvsulur.in"]);

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isAllowedEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  const match = normalized.match(/^[^\s@]+@([^\s@]+)$/);
  return Boolean(match && ALLOWED_EMAIL_DOMAINS.has(match[1]));
}

export const ALLOWED_EMAIL_HINT = "Use a Gmail address (@gmail.com) or a KV Sulur address (@kvsulur.in).";
