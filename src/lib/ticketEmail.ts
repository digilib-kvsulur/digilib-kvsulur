import { supabase } from "@/integrations/supabase/client";

/** Fire-and-forget ticket email via edge function (requires RESEND_API_KEY). */
export async function sendTicketEmail(payload: {
  type: "created" | "updated" | "reply";
  ticket_id?: string;
  ticket_number?: string;
  to_email?: string | null;
  full_name?: string | null;
  subject?: string | null;
  status?: string | null;
  admin_response?: string | null;
  message?: string | null;
}) {
  try {
    await supabase.functions.invoke("send-ticket-email", { body: payload });
  } catch (e) {
    console.warn("Ticket email failed", e);
  }
}
