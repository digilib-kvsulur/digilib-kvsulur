import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c] || c));
const PRESETS: Record<string, { subject: string; heading: string; body: string }> = {
  library_update: { subject: "KV Sulur Library update", heading: "Library update", body: "There is a new update from the PM SHRI KV AFS Sulur Digital Library." },
  due_reminder: { subject: "Library book reminder", heading: "Book return reminder", body: "Please check your library account for any books due for return or renewal." },
  event_invite: { subject: "You're invited: KV Sulur Library", heading: "Library event invitation", body: "You are invited to take part in an upcoming library activity. Please check the DLMS for details." },
  certificate_notice: { subject: "Your library certificate is available", heading: "Certificate update", body: "A library certificate has been issued or updated for you. Sign in to view it." },
};

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
    if (!Array.isArray(recipientIds) || recipientIds.length < 1 || recipientIds.length > 200 || !PRESETS[preset]) throw new Error("Invalid campaign");
    const { data: recipients } = await admin.from("profiles").select("id, first_name, notification_email, notification_email_confirmed_at").in("id", recipientIds).not("notification_email_confirmed_at", "is", null);
    const valid = (recipients || []).filter((p: any) => p.notification_email);
    const key = Deno.env.get("RESEND_API_KEY"), from = Deno.env.get("LIBRARY_FROM_EMAIL");
    if (!key || !from) throw new Error("Email sender is not configured");
    const template = PRESETS[preset];
    const extra = String(customMessage || "").trim().slice(0, 2000);
    const results = await Promise.all(valid.map(async (p: any) => {
      const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [p.notification_email], subject: template.subject, html: `<p>Dear ${escapeHtml(p.first_name || "Library Member")},</p><h2>${template.heading}</h2><p>${template.body}</p>${extra ? `<p>${escapeHtml(extra)}</p>` : ""}<p>— PM SHRI KV AFS Sulur Library</p>` }) });
      return response.ok;
    }));
    const sent = results.filter(Boolean).length;
    await admin.from("email_campaigns").insert({ sent_by: user.id, preset, subject: template.subject, recipient_count: sent });
    return new Response(JSON.stringify({ sent, skipped: recipientIds.length - valid.length }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || "Unable to send email" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
