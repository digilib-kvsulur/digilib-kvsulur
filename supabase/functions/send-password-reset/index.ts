import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const placeholderEmail = (email = "") => /@(kvschool\.in|kvsulur\.com|kvschennairo\.in|kvsulur\.in|internal|dummy|example\.com)$/i.test(email.trim());
const isEmail = (email = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
const isGmail = (email = "") => /@gmail\.com$/i.test(email.trim());
const preferredRecipient = (...candidates: Array<string | null | undefined>) => {
  const emails = candidates.map((email) => (email || "").trim().toLowerCase()).filter((email) => isEmail(email) && !placeholderEmail(email));
  return emails.find(isGmail) || emails[0] || "";
};
const resetRedirectUrl = () => Deno.env.get("PASSWORD_RESET_REDIRECT_URL") || "https://dlms.kvsulur.in/reset-password";
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character] || character));

async function sendMail(to: string, link: string, name: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("LIBRARY_FROM_EMAIL") || "Team DLMS <dlms@kvsulur.in>";
  if (!apiKey || !from) throw new Error("Password-reset email is not configured");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Reset your KV Sulur Library password",
      html: `<div style="font-family:Arial,sans-serif;color:#1e293b;max-width:560px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px"><div style="text-align:center;margin-bottom:20px"><img src="https://dlms.kvsulur.in/apple-touch-icon.png" alt="Team DLMS" width="72" height="72" style="display:inline-block;border-radius:14px" /><p style="margin:8px 0 0;font-weight:700;color:#1e3a8a">Team DLMS</p></div><p>Dear ${escapeHtml(name)},</p><p>We received a request to reset your KV Sulur Digital Library password.</p><p style="text-align:center;margin:24px 0"><a href="${link}" ses:no-track style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700">Reset my password</a></p><p style="font-size:12px;color:#64748b;line-height:1.5;word-break:break-all">If the button doesn't work, copy and paste this link into your browser:<br/><a href="${link}" ses:no-track style="color:#2563eb;text-decoration:underline">${escapeHtml(link)}</a></p><p>This link expires automatically. If you did not request it, you can safely ignore this email.</p><p>— Team DLMS</p></div>`,
    }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.message || "Email delivery failed");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  // Always return the same public response so this endpoint does not reveal
  // whether a particular account or mailbox exists.
  const accepted = () => new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { identifier } = await request.json();
    const lookup = String(identifier || "").trim();
    if (!lookup || lookup.length > 255) return accepted();

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const [byEmail, byUsername, byAdmission] = await Promise.all([
      admin.from("profiles").select("id, first_name, last_name, email, notification_email").ilike("email", lookup).maybeSingle(),
      admin.from("profiles").select("id, first_name, last_name, email, notification_email").ilike("username", lookup).maybeSingle(),
      admin.from("profiles").select("id, first_name, last_name, email, notification_email").eq("admission_number", lookup).maybeSingle(),
    ]);
    const profile = byEmail.data || byUsername.data || byAdmission.data;
    if (!profile) return accepted();

    const { data: authUserData } = await admin.auth.admin.getUserById(profile.id);
    const recipient = preferredRecipient(profile.notification_email, profile.email, authUserData.user?.email);
    if (!recipient) return accepted();

    const { data: lastRequest } = await admin.from("password_reset_delivery_limits").select("last_requested_at").eq("user_id", profile.id).maybeSingle();
    if (lastRequest && Date.now() - new Date(lastRequest.last_requested_at).getTime() < 60_000) return accepted();
    await admin.from("password_reset_delivery_limits").upsert({ user_id: profile.id, last_requested_at: new Date().toISOString() });

    if (!authUserData.user?.email) return accepted();
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: authUserData.user.email,
      // Use the configured canonical URL so recovery links cannot be broken by
      // an unapproved preview, local, or malicious browser redirect.
      options: { redirectTo: resetRedirectUrl() },
    });
    if (linkError || !linkData.properties?.action_link) throw linkError || new Error("Could not create recovery link");

    await sendMail(recipient, linkData.properties.action_link, `${profile.first_name || "Library"} ${profile.last_name || "Member"}`.trim());
  } catch (error) {
    // Do not surface configuration/account details to an unauthenticated caller.
    console.error("Password reset delivery failed", error);
  }
  return accepted();
});
