/** Local datetime helpers for event deadlines (avoids UTC skew with datetime-local inputs). */

const pad = (n: number) => String(n).padStart(2, "0");

/** Convert an ISO/timestamptz string to `YYYY-MM-DDTHH:mm` in the user's local timezone. */
export function toLocalDatetimeInput(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parse a datetime-local value as local time and return ISO UTC for DB storage. */
export function fromLocalDatetimeInput(localValue?: string | null): string | null {
  if (!localValue?.trim()) return null;
  const d = new Date(localValue);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function isDeadlinePassed(deadline?: string | null, now: Date = new Date()): boolean {
  if (!deadline) return false;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < now.getTime();
}

/**
 * Registration is open until registration_deadline (if set),
 * otherwise until event end_date / event_date.
 */
export function isRegistrationClosed(ev: {
  registration_deadline?: string | null;
  end_date?: string | null;
  event_date?: string | null;
}, now: Date = new Date()): boolean {
  if (ev.registration_deadline) return isDeadlinePassed(ev.registration_deadline, now);
  if (ev.end_date) return isDeadlinePassed(ev.end_date, now);
  if (ev.event_date) return isDeadlinePassed(ev.event_date, now);
  return false;
}

/**
 * Submissions/uploads are open until submission_deadline (if set),
 * otherwise until event end_date / event_date.
 */
export function isSubmissionClosed(ev: {
  submission_deadline?: string | null;
  end_date?: string | null;
  event_date?: string | null;
}, now: Date = new Date()): boolean {
  if (ev.submission_deadline) return isDeadlinePassed(ev.submission_deadline, now);
  if (ev.end_date) return isDeadlinePassed(ev.end_date, now);
  if (ev.event_date) return isDeadlinePassed(ev.event_date, now);
  return false;
}

export function formatDeadline(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
