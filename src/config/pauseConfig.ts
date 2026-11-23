export interface PauseConfig {
  enabled: boolean;
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
  enabled: false,
  until: "2026-11-28T02:30:00.000Z", // Saturday, 28 Nov 2026, 8:00 AM IST
  displayDate: "Saturday, 28 November 2026",
  displayTime: "8:00 AM IST",
  title: "DLMS is taking a short break 💙",
  badge: "School Community & Well-Being Notice",
  salutation: "Dear students and teachers,",
  paragraphs: [
    "DLMS was built for all of us, to learn, share and grow together. Recently, a comment was posted on the platform that hurt a fellow member of our school family. This goes against the spirit of DLMS.",
    "Because we care about every one of you, the school has decided to pause DLMS for one week. It will be back in a week, and we'll use this time to make the platform safer.",
    "A single unkind comment can stay with someone long after it's deleted. Kindness costs nothing, and it is what makes a community strong.",
    "To everyone who uses DLMS respectfully, thank you. This break isn't a punishment for you. It's a promise that this space will be safe for you.",
    "If anything on DLMS ever upsets you, please tell a teacher or the school counsellor. Please also keep your passwords private.",
    "Your daily streak will be preserved and will resume on the reopening day. Don't worry!",
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
  const endMs = new Date(config.until).getTime();
  if (Number.isNaN(endMs)) return false;
  return Date.now() < endMs;
}

/**
 * Returns remaining milliseconds until community pause lifts.
 */
export function getPauseRemainingMs(config: PauseConfig = PAUSE_CONFIG): number {
  if (!config.enabled) return 0;
  const endMs = new Date(config.until).getTime();
  if (Number.isNaN(endMs)) return 0;
  return Math.max(0, endMs - Date.now());
}
