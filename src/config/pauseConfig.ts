export interface PauseConfig {
  enabled: boolean;
  indefinite?: boolean;
  until: string; // ISO 8601 UTC timestamp
  displayDate: string; // Human-readable date e.g. "Saturday, 28 November 2026"
  displayTime: string; // Human-readable time e.g. "8:00 AM IST"
  title: string;
  badge: string;
  salutation: string;
  paragraphs: string[];
  closing: string;
  author: string;
  supportEmail: string;
}

export const PAUSE_CONFIG: PauseConfig = {
  enabled: true,
  indefinite: true,
  until: "2099-12-31T00:00:00.000Z",
  displayDate: "",
  displayTime: "",
  title: "DLMS 2.0 is coming soon ✨",
  badge: "A better DLMS experience is on the way",
  salutation: "Dear students and teachers,",
  paragraphs: [
    "We are rebuilding DLMS with a refreshed experience and new ways to learn, read, and explore. The updated platform will be available soon.",
    "During this preparation period, student and teacher access is paused. Your existing account and learning data will be available when DLMS reopens.",
    "Thank you for being part of DLMS. We look forward to welcoming you back.",
  ],
  closing: "With care,",
  author: "Team DLMS, PM SHRI KV AFS Sulur",
  supportEmail: "dlms@kvsulur.in",
};

/**
 * Returns true if community pause is currently enabled and the until timestamp has not elapsed.
 */
export function isPauseActive(config: PauseConfig = PAUSE_CONFIG): boolean {
  if (!config.enabled) return false;
  if (config.indefinite) return true;
  const endMs = new Date(config.until).getTime();
  if (Number.isNaN(endMs)) return false;
  return Date.now() < endMs;
}

/**
 * Returns remaining milliseconds until community pause lifts.
 */
export function getPauseRemainingMs(config: PauseConfig = PAUSE_CONFIG): number {
  if (!config.enabled) return 0;
  if (config.indefinite) return Number.POSITIVE_INFINITY;
  const endMs = new Date(config.until).getTime();
  if (Number.isNaN(endMs)) return 0;
  return Math.max(0, endMs - Date.now());
}
