export interface MaintenanceConfig {
  enabled: boolean;
  until: string; // ISO 8601 UTC timestamp
  displayUntil: string; // Human readable e.g. "today, 2:00 PM IST"
  heading: string;
  subheading: string;
  modalBody: string;
  author: string;
  authorRole: string;
  supportEmail: string;
}

export const MAINTENANCE_CONFIG: MaintenanceConfig = {
  enabled: true,
  until: "2026-10-21T12:34:00.000Z",
  displayUntil: "today, 6:04 PM IST",
  heading: "Site Under Maintenance",
  subheading:
    "DLMS is currently undergoing idle to provide a better experience during the Quiz Championship League. We'll be back online by: today, 6:04 PM IST.",
  modalBody:
    "DLMS is currently undergoing idle to provide a better experience during the Quiz Championship League.\n\nThe site will be back online smoothly by today, 6:04 PM IST.\n\nThank you for your patience and cooperation. 🙏",
  author: "G V Tanish Vettrivel",
  authorRole: "Developer · PM SHRI KV AFS Sulur",
  supportEmail: "dlms@kvsulur.in",
};

/**
 * Returns true if maintenance is currently enabled and the until timestamp has not elapsed.
 */
export function isMaintenanceActive(config: MaintenanceConfig = MAINTENANCE_CONFIG): boolean {
  if (!config.enabled) return false;
  const endMs = new Date(config.until).getTime();
  if (Number.isNaN(endMs)) return false;
  return Date.now() < endMs;
}

/**
 * Returns remaining milliseconds until maintenance lifts.
 */
export function getMaintenanceRemainingMs(config: MaintenanceConfig = MAINTENANCE_CONFIG): number {
  if (!config.enabled) return 0;
  const endMs = new Date(config.until).getTime();
  if (Number.isNaN(endMs)) return 0;
  return Math.max(0, endMs - Date.now());
}
