/**
 * Utility to parse and extract target URLs from Email Service Provider (ESP) tracking URLs,
 * such as Amazon SES / Resend / SendGrid click-tracking wrappers (/CL0/... and /CL1/...).
 *
 * This occurs when an email provider rewrites links in outgoing emails for open/click analytics
 * using a domain that points to the web app instead of the tracking redirector.
 */

export function extractSESRedirectUrl(rawHref: string): string | null {
  if (!rawHref) return null;

  // Check for SES / ESP link-tracking paths: /CL0/ or /CL1/
  const markerMatch = rawHref.match(/\/CL[01]\/(.*)$/i);
  if (!markerMatch) return null;

  let payload = markerMatch[1];

  // In CL1, the structure is /CL1/{customPath}/{encodedUrl}/...
  // Find where the actual URL scheme starts (http: or https:, encoded or raw)
  const httpIndex = payload.search(/https?(:|%3A)/i);
  if (httpIndex !== -1) {
    payload = payload.slice(httpIndex);
  }

  // AWS SES trailing tracking metadata format: /{index}/{messageId}/{hmac}
  // e.g. /1/010601a0d8b43f18-08bc21a4-5e7a-44d0-a81a-b7e999fa8631-000000/bytVr7p...
  const sesPattern = /\/\d+\/[a-zA-Z0-9_-]{10,}(?:-[a-zA-Z0-9_-]+)*\/[^\/\?#]+(?:\?.*)?$/;
  let cleanTarget = payload.replace(sesPattern, "");
  if (cleanTarget === payload) {
    const altPattern = /\/\d+\/[a-zA-Z0-9_-]+(?:\/.*)?$/;
    cleanTarget = payload.replace(altPattern, "");
  }

  // Decode URI component iteratively in case of nested encoding
  let decoded = cleanTarget;
  for (let i = 0; i < 3; i++) {
    if (
      decoded.includes("%2F") ||
      decoded.includes("%3A") ||
      decoded.includes("%3F") ||
      decoded.includes("%26") ||
      decoded.includes("%3D")
    ) {
      try {
        decoded = decodeURIComponent(decoded);
      } catch {
        break;
      }
    } else {
      break;
    }
  }

  // Fix malformed protocol if the single slash was collapsed: https:/example -> https://example
  if (!/^https?:\/\//i.test(decoded)) {
    if (/^https?:\/[^\/]/i.test(decoded)) {
      decoded = decoded.replace(/^(https?):\/([^\/])/, "$1//$2");
    } else {
      return null;
    }
  }

  // Strict domain whitelist check to prevent open-redirect vulnerabilities
  try {
    const urlObj = new URL(decoded);
    const host = urlObj.hostname.toLowerCase();
    const isAllowed =
      host === "dlms.kvsulur.in" ||
      host.endsWith(".kvsulur.in") ||
      host === "kvsulur.in" ||
      host.endsWith(".supabase.co") ||
      host === "localhost" ||
      host === "127.0.0.1";

    if (isAllowed) {
      return urlObj.toString();
    }
  } catch {
    return null;
  }

  return null;
}
