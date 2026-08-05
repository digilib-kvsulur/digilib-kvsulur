import { supabase } from "@/integrations/supabase/client";

export interface LibraryFineSettings {
  finePerDay: number;
  upiId: string;
  upiPayeeName: string;
}

export interface LibraryGoalSettings {
  monthlyReadingGoal: number;
}

const DEFAULT_FINE: LibraryFineSettings = {
  finePerDay: 1,
  upiId: "",
  upiPayeeName: "PM SHRI KV AFS Sulur Library",
};

function parseJsonSetting(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return String(value);
}

function parseNumberSetting(value: unknown, fallback: number): number {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.replace(/^"|"$/g, ""));
    return Number.isNaN(n) ? fallback : n;
  }
  return fallback;
}

/** Days overdue: calendar-date comparison (avoids UTC midnight skew). */
export function getDaysOverdue(dueDate: string | Date): number {
  const dueStr =
    typeof dueDate === "string"
      ? dueDate.slice(0, 10)
      : `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`;
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const dueMs = Date.parse(`${dueStr}T00:00:00`);
  const todayMs = Date.parse(`${todayStr}T00:00:00`);
  if (Number.isNaN(dueMs) || Number.isNaN(todayMs)) return 0;
  return Math.max(0, Math.floor((todayMs - dueMs) / (1000 * 60 * 60 * 24)));
}

export function calculateFine(daysOverdue: number, finePerDay: number): number {
  if (daysOverdue <= 0 || finePerDay <= 0) return 0;
  return daysOverdue * finePerDay;
}

/** UPI deep link usable by GPay / PhonePe / Paytm / BHIM. */
export function buildUpiPaymentLink(opts: {
  upiId: string;
  payeeName: string;
  amount: number;
  note?: string;
}): string | null {
  const pa = opts.upiId.trim();
  if (!pa || opts.amount <= 0) return null;
  const params = new URLSearchParams({
    pa,
    pn: opts.payeeName || "Library",
    am: opts.amount.toFixed(2),
    cu: "INR",
    tn: opts.note || "Library overdue fine",
  });
  return `upi://pay?${params.toString()}`;
}

export async function fetchFineSettings(): Promise<LibraryFineSettings> {
  const { data } = await supabase
    .from("system_settings")
    .select("key, value")
    .in("key", ["fine_per_day", "upi_id", "upi_payee_name"]);

  const settings = { ...DEFAULT_FINE };
  (data || []).forEach((row: { key: string; value: unknown }) => {
    if (row.key === "fine_per_day") settings.finePerDay = parseNumberSetting(row.value, 1);
    if (row.key === "upi_id") settings.upiId = parseJsonSetting(row.value).replace(/^"|"$/g, "");
    if (row.key === "upi_payee_name") settings.upiPayeeName = parseJsonSetting(row.value).replace(/^"|"$/g, "") || DEFAULT_FINE.upiPayeeName;
  });
  return settings;
}

export async function fetchMonthlyReadingGoal(): Promise<number> {
  const { data } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "monthly_reading_goal")
    .maybeSingle();
  return parseNumberSetting(data?.value, 3);
}

export async function fetchCertificateTemplateUrl(): Promise<string | null> {
  const { data } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "certificate_template_url")
    .maybeSingle();
  if (!data?.value || data.value === null) return null;
  const raw = parseJsonSetting(data.value).replace(/^"|"$/g, "");
  if (!raw || raw === "null") return null;
  return raw;
}

export type CertAlign = "left" | "center" | "right";

export interface CertFieldLayout {
  x: number;
  y: number;
  fontSize: number;
  visible: boolean;
  align: CertAlign;
}

export interface CertificateLayout {
  name: CertFieldLayout;
  className: CertFieldLayout;
  event: CertFieldLayout;
  title: CertFieldLayout;
  description: CertFieldLayout;
  date: CertFieldLayout;
}

export const DEFAULT_CERTIFICATE_LAYOUT: CertificateLayout = {
  name: { x: 50, y: 42, fontSize: 28, visible: true, align: "center" },
  className: { x: 50, y: 50, fontSize: 14, visible: true, align: "center" },
  event: { x: 50, y: 56, fontSize: 16, visible: true, align: "center" },
  title: { x: 50, y: 64, fontSize: 18, visible: true, align: "center" },
  description: { x: 50, y: 72, fontSize: 13, visible: true, align: "center" },
  date: { x: 50, y: 82, fontSize: 12, visible: true, align: "center" },
};

function parseFieldLayout(raw: unknown, fallback: CertFieldLayout): CertFieldLayout {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const o = raw as Record<string, unknown>;
  const align = o.align === "left" || o.align === "right" || o.align === "center" ? o.align : fallback.align;
  return {
    x: typeof o.x === "number" ? o.x : fallback.x,
    y: typeof o.y === "number" ? o.y : fallback.y,
    fontSize: typeof o.fontSize === "number" ? o.fontSize : fallback.fontSize,
    visible: typeof o.visible === "boolean" ? o.visible : fallback.visible,
    align,
  };
}

export async function fetchCertificateLayout(): Promise<CertificateLayout> {
  const { data } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "certificate_layout")
    .maybeSingle();
  let raw: any = data?.value;
  if (typeof raw === "string") {
    try { raw = JSON.parse(raw); } catch { raw = null; }
  }
  if (!raw || typeof raw !== "object") return { ...DEFAULT_CERTIFICATE_LAYOUT };
  return {
    name: parseFieldLayout(raw.name, DEFAULT_CERTIFICATE_LAYOUT.name),
    className: parseFieldLayout(raw.className, DEFAULT_CERTIFICATE_LAYOUT.className),
    event: parseFieldLayout(raw.event, DEFAULT_CERTIFICATE_LAYOUT.event),
    title: parseFieldLayout(raw.title, DEFAULT_CERTIFICATE_LAYOUT.title),
    description: parseFieldLayout(raw.description, DEFAULT_CERTIFICATE_LAYOUT.description),
    date: parseFieldLayout(raw.date, DEFAULT_CERTIFICATE_LAYOUT.date),
  };
}

export async function saveCertificateLayout(layout: CertificateLayout): Promise<void> {
  const { error } = await supabase.from("system_settings").upsert(
    { key: "certificate_layout", value: layout as any },
    { onConflict: "key" }
  );
  if (error) throw error;
}
