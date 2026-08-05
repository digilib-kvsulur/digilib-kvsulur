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
  const from = Deno.env.get("LIBRARY_FROM_EMAIL") || "KV Sulur Library <onboarding@resend.dev>";
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

    const result = await sendResendEmail({ to, subject: emailSubject, html });
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
