import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const placeholderEmail = (email = "") => /@(kvschool\.in|internal|dummy|example\.com)$/i.test(email);
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character] || character));

async function sendMail(to: string, link: string, name: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("LIBRARY_FROM_EMAIL");
  if (!apiKey || !from) throw new Error("Password-reset email is not configured");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Reset your KV Sulur Library password",
      html: `<p>Dear ${escapeHtml(name)},</p><p>We received a request to reset your KV Sulur Digital Library password.</p><p><a href="${link}">Reset my password</a></p><p>This link expires automatically. If you did not request it, you can safely ignore this email.</p><p>— PM SHRI KV AFS Sulur Library</p>`,
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
    const { identifier, redirectTo } = await request.json();
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

    const recipient = (profile.notification_email || profile.email || "").trim().toLowerCase();
    if (!recipient || placeholderEmail(recipient)) return accepted();

    const { data: lastRequest } = await admin.from("password_reset_delivery_limits").select("last_requested_at").eq("user_id", profile.id).maybeSingle();
    if (lastRequest && Date.now() - new Date(lastRequest.last_requested_at).getTime() < 60_000) return accepted();
    await admin.from("password_reset_delivery_limits").upsert({ user_id: profile.id, last_requested_at: new Date().toISOString() });

    const { data: authUserData } = await admin.auth.admin.getUserById(profile.id);
    if (!authUserData.user?.email) return accepted();
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: authUserData.user.email,
      options: { redirectTo: typeof redirectTo === "string" ? redirectTo : undefined },
    });
    if (linkError || !linkData.properties?.action_link) throw linkError || new Error("Could not create recovery link");

    await sendMail(recipient, linkData.properties.action_link, `${profile.first_name || "Library"} ${profile.last_name || "Member"}`.trim());
  } catch (error) {
    // Do not surface configuration/account details to an unauthenticated caller.
    console.error("Password reset delivery failed", error);
  }
  return accepted();
});
