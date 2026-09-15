import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const esc = (v: string) =>
  v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c] || c));

// ─── Template registry ────────────────────────────────────────────────────────
interface TemplateData {
  subject: string;
  heading: string;
  body: (name: string, note: string) => string;
}

const PRESETS: Record<string, TemplateData> = {
  library_update: {
    subject: "KV Sulur Library — Important Update",
    heading: "Library Update",
    body: (name, note) => `
      <p>Dear <strong>${esc(name)}</strong>,</p>
      <p>There is a new update from the <strong>PM SHRI KV AFS Sulur Digital Library</strong>.</p>
      ${note ? `<p>${esc(note)}</p>` : ""}
      <p>— KV Sulur Library Team</p>`,
  },
  due_reminder: {
    subject: "Reminder: Library Book Return Due",
    heading: "Book Return Reminder",
    body: (name, note) => `
      <p>Dear <strong>${esc(name)}</strong>,</p>
      <p>This is a friendly reminder that you have <strong>one or more library books due for return</strong>.</p>
      <p>Please return or renew them to avoid fines. Renewals can be done online through the Digital Library.</p>
      ${note ? `<p>${esc(note)}</p>` : ""}
      <p>— KV Sulur Library Team</p>`,
  },
  event_invite: {
    subject: "You're Invited: KV Sulur Library Event",
    heading: "Library Event Invitation",
    body: (name, note) => `
      <p>Dear <strong>${esc(name)}</strong>,</p>
      <p>We are excited to invite you to an <strong>upcoming library event or activity</strong>!</p>
      ${note ? `<p>${esc(note)}</p>` : "<p>Please check the Digital Library for full event details and timing.</p>"}
      <p>We look forward to seeing you there!</p>
      <p>— KV Sulur Library Team</p>`,
  },
  certificate_notice: {
    subject: "Your Library Certificate is Ready",
    heading: "Certificate Available",
    body: (name, note) => `
      <p>Dear <strong>${esc(name)}</strong>,</p>
      <p>A <strong>library certificate</strong> has been issued for you. 🎉</p>
      <p>Sign in to the Digital Library to view and download your certificate.</p>
      ${note ? `<p>${esc(note)}</p>` : ""}
      <p>— KV Sulur Library Team</p>`,
  },
  welcome: {
    subject: "Welcome to KV Sulur Digital Library!",
    heading: "Welcome Aboard!",
    body: (name, note) => `
      <p>Dear <strong>${esc(name)}</strong>,</p>
      <p>Welcome to the <strong>PM SHRI KV AFS Sulur Digital Library</strong>! 🎉</p>
      <p>Your account has been approved. You can now borrow books, join quizzes, earn badges, participate in book clubs, and much more.</p>
      ${note ? `<p>${esc(note)}</p>` : ""}
      <p>Happy reading!</p>
      <p>— KV Sulur Library Team</p>`,
  },
  fine_notice: {
    subject: "Outstanding Library Fine — Action Required",
    heading: "Fine Notice",
    body: (name, note) => `
      <p>Dear <strong>${esc(name)}</strong>,</p>
      <p>Our records show that you have an <strong>outstanding library fine</strong>.</p>
      <p>Please clear the fine at the library counter or through the Digital Library at the earliest to continue borrowing books.</p>
      ${note ? `<p>${esc(note)}</p>` : ""}
      <p>— KV Sulur Library Team</p>`,
  },
  book_available: {
    subject: "Your Requested Book is Now Available",
    heading: "Book Now Available for Pickup",
    body: (name, note) => `
      <p>Dear <strong>${esc(name)}</strong>,</p>
      <p>Great news! A book you requested is now <strong>available for pickup</strong> at the library.</p>
      <p>Please collect it within <strong>2 working days</strong> to avoid losing your reservation.</p>
      ${note ? `<p>${esc(note)}</p>` : ""}
      <p>— KV Sulur Library Team</p>`,
  },
  quiz_result: {
    subject: "Your Quiz Result — KV Sulur Library",
    heading: "Quiz Result & Achievement",
    body: (name, note) => `
      <p>Dear <strong>${esc(name)}</strong>,</p>
      <p>Results are in for a recent <strong>Library Quiz</strong>!</p>
      ${note ? `<p>${esc(note)}</p>` : "<p>Log in to the Digital Library to see your score, rank, and any badges earned.</p>"}
      <p>Keep reading and participating — every quiz earns you points on the leaderboard!</p>
      <p>— KV Sulur Library Team</p>`,
  },
  book_club: {
    subject: "Book Club Update — KV Sulur Library",
    heading: "Book Club Update",
    body: (name, note) => `
      <p>Dear <strong>${esc(name)}</strong>,</p>
      <p>Your <strong>Library Book Club</strong> has a new update!</p>
      ${note ? `<p>${esc(note)}</p>` : "<p>Check the Digital Library for the latest discussion schedule and reading list.</p>"}
      <p>— KV Sulur Library Team</p>`,
  },
  newsletter: {
    subject: "KV Sulur Library — Monthly Newsletter",
    heading: "Monthly Library Newsletter",
    body: (name, note) => `
      <p>Dear <strong>${esc(name)}</strong>,</p>
      <p>Here is the latest edition of the <strong>KV Sulur Library Newsletter</strong>!</p>
      ${note ? `<p>${esc(note)}</p>` : "<p>Discover new arrivals, upcoming events, quiz toppers, and more inside.</p>"}
      <p>Happy reading!</p>
      <p>— KV Sulur Library Team</p>`,
  },
};

// ─── Branded HTML wrapper ─────────────────────────────────────────────────────
function buildHtml(heading: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;max-width:560px;">
        <!-- Header -->
        <tr>
          <td style="background:#1a56db;padding:20px 28px;">
            <p style="margin:0;color:#fff;font-size:15px;font-weight:700;">📚 PM SHRI KV AFS Sulur — Digital Library</p>
          </td>
        </tr>
        <!-- Heading banner -->
        <tr>
          <td style="background:#eff6ff;padding:14px 28px;border-bottom:1px solid #dbeafe;">
            <p style="margin:0;color:#1d4ed8;font-size:18px;font-weight:700;">${esc(heading)}</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:24px 28px;color:#111827;font-size:14px;line-height:1.75;">
            ${bodyHtml}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:14px 28px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:11px;color:#6b7280;text-align:center;">
              PM SHRI Kendriya Vidyalaya AFS Sulur · KV Digital Library Management System<br/>
              This email was sent to you because you opted in to library email updates.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ─── Handler ──────────────────────────────────────────────────────────────────
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!token) throw new Error("Unauthorized");

    const caller = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user } } = await caller.auth.getUser(token);
    if (!user) throw new Error("Unauthorized");

    const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: adminProfile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (adminProfile?.role !== "admin") throw new Error("Forbidden");

    const { recipientIds, preset, customMessage } = await request.json();

    if (
      !Array.isArray(recipientIds) ||
      recipientIds.length < 1 ||
      recipientIds.length > 300 ||
      !PRESETS[preset]
    ) {
      throw new Error("Invalid campaign payload");
    }

    const { data: recipients } = await admin
      .from("profiles")
      .select("id, first_name, email, notification_email")
      .in("id", recipientIds);

    const valid = (recipients || [])
      .map((p: any) => ({
        ...p,
        targetEmail: (p.notification_email || p.email || "").trim(),
      }))
      .filter((p: any) => Boolean(p.targetEmail));

    const key = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("LIBRARY_FROM_EMAIL") || "KV Sulur Library <onboarding@resend.dev>";
    if (!key) throw new Error("Email sender is not configured (RESEND_API_KEY missing)");

    const template = PRESETS[preset];
    const note = String(customMessage || "").trim().slice(0, 2000);

    const errors: string[] = [];

    const results = await Promise.all(
      valid.map(async (p: any) => {
        const recipientName = p.first_name || "Library Member";
        const bodyHtml = template.body(recipientName, note);
        const html = buildHtml(template.heading, bodyHtml);

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to: [p.targetEmail],
            subject: template.subject,
            html,
          }),
        });

        const resBody = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = resBody?.message || resBody?.error?.message || `HTTP ${res.status}`;
          console.error(`Resend send failed for ${p.targetEmail}:`, msg);
          errors.push(msg);
          return false;
        }
        return true;
      }),
    );

    const sent = results.filter(Boolean).length;

    if (sent === 0 && valid.length > 0 && errors.length > 0) {
      throw new Error(`Resend error: ${errors[0]}`);
    }

    await admin.from("email_campaigns").insert({
      sent_by: user.id,
      preset,
      subject: template.subject,
      recipient_count: sent,
    });

    return new Response(
      JSON.stringify({ sent, skipped: recipientIds.length - valid.length }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Unable to send email" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
