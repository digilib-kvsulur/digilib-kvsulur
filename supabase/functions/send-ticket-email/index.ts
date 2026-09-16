import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Payload = {
  type: "created" | "updated" | "reply";
  ticket_id?: string;
  ticket_number?: string;
  to_email?: string;
  full_name?: string;
  subject?: string;
  status?: string;
  admin_response?: string;
  message?: string;
};

async function sendResendEmail(opts: { to: string; subject: string; html: string }) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("LIBRARY_FROM_EMAIL") || "PM SHRI KV Sulur Library <dlms@kvsulur.in>";
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — email skipped");
    return { skipped: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.message || "Email send failed");
  return body;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = (await req.json()) as Payload;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let ticket: any = null;
    if (payload.ticket_id || payload.ticket_number) {
      let q = admin.from("support_tickets").select("*");
      if (payload.ticket_id) q = q.eq("id", payload.ticket_id);
      else q = q.eq("ticket_number", payload.ticket_number);
      const { data } = await q.maybeSingle();
      ticket = data;
    }

    const to = (payload.to_email || ticket?.email || "").trim();
    if (!to) {
      return new Response(JSON.stringify({ ok: true, skipped: "no email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = payload.full_name || ticket?.full_name || "Student";
    const ticketNo = payload.ticket_number || ticket?.ticket_number || "—";
    const subjectLine = payload.subject || ticket?.subject || "Support ticket";
    const status = payload.status || ticket?.status || "open";

    let emailSubject = "";
    let html = "";

    if (payload.type === "created") {
      emailSubject = `Ticket ${ticketNo} received — KV Sulur Library`;
      html = `
        <p>Dear ${name},</p>
        <p>Your support ticket has been submitted successfully.</p>
        <p><strong>Ticket number:</strong> ${ticketNo}<br/>
        <strong>Subject:</strong> ${subjectLine}</p>
        <p>Keep this ticket number. You can check status anytime on the Help &amp; Support page using your ticket number and admission number — even without logging in.</p>
        <p>— PM SHRI KV AFS Sulur Library</p>`;
    } else if (payload.type === "reply") {
      emailSubject = `Reply on ticket ${ticketNo} — KV Sulur Library`;
      html = `
        <p>Dear ${name},</p>
        <p>The library team replied on ticket <strong>${ticketNo}</strong> (${subjectLine}):</p>
        <blockquote>${payload.message || payload.admin_response || ticket?.admin_response || ""}</blockquote>
        <p>Status: <strong>${status}</strong></p>
        <p>— PM SHRI KV AFS Sulur Library</p>`;
    } else {
      emailSubject = `Ticket ${ticketNo} updated — KV Sulur Library`;
      html = `
        <p>Dear ${name},</p>
        <p>Your ticket <strong>${ticketNo}</strong> (${subjectLine}) is now <strong>${status}</strong>.</p>
        ${payload.admin_response || ticket?.admin_response
          ? `<p><strong>Response:</strong> ${payload.admin_response || ticket.admin_response}</p>`
          : ""}
        <p>— PM SHRI KV AFS Sulur Library</p>`;
    }

    const wrapBranded = (contentHtml: string) => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>${emailSubject}</title></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 12px;">
    <tr><td align="center">
      <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:580px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(15,23,42,0.08);border:1px solid #e2e8f0;">
        <tr>
          <td style="background:linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%);padding:24px 30px;text-align:left;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td width="56" style="vertical-align:middle;padding-right:16px;">
                  <img src="https://dlms.kvsulur.in/logos/kv-square.png" alt="KV Sulur Logo" width="52" height="52" style="display:block;border-radius:50%;background:#ffffff;padding:2px;box-shadow:0 3px 10px rgba(0,0,0,0.25);border:2px solid #ffffff;object-fit:cover;" />
                </td>
                <td style="vertical-align:middle;">
                  <p style="margin:0;color:#bfdbfe;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;">PM SHRI KENDRIYA VIDYALAYA AFS SULUR</p>
                  <h1 style="margin:4px 0 0 0;color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.5px;line-height:1.2;">🎫 Helpdesk &amp; Support</h1>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:32px;color:#1e293b;font-size:15px;line-height:1.7;">${contentHtml}</td></tr>
        <tr>
          <td align="center" style="padding:0 32px 32px 32px;">
            <a href="https://dlms.kvsulur.in/support" target="_blank" style="display:inline-block;background:linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;box-shadow:0 4px 12px rgba(37,99,235,0.25);">
              View Ticket Status Online →
            </a>
          </td>
        </tr>
        <tr>
          <td style="background-color:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;font-size:12px;color:#64748b;font-weight:600;">PM SHRI Kendriya Vidyalaya AFS Sulur</p>
            <p style="margin:4px 0 0 0;font-size:11px;color:#94a3b8;">Coimbatore, Tamil Nadu · Official Library Support Desk</p>
            <p style="margin:8px 0 0 0;font-size:10px;color:#cbd5e1;">dlms@kvsulur.in · <a href="https://dlms.kvsulur.in" style="color:#64748b;text-decoration:underline;">dlms.kvsulur.in</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    const result = await sendResendEmail({ to, subject: emailSubject, html: wrapBranded(html) });
    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
