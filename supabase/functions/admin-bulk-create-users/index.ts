import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Row {
  email: string;
  first_name: string;
  last_name?: string;
  student_class?: string;
  roll_number?: string;
  admission_number?: string;
  phone?: string;
  password?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: callerProfile } = await admin.from("profiles").select("role").eq("id", caller.id).single();
    if (callerProfile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { rows } = await req.json() as { rows: Row[] };
    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: "No rows provided" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (rows.length > 500) {
      return new Response(JSON.stringify({ error: "Maximum 500 rows per import" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results: Array<{ email: string; success: boolean; password?: string; error?: string }> = [];

    for (const row of rows) {
      const email = (row.email || "").trim().toLowerCase();
      const first_name = (row.first_name || "").trim();
      if (!email || !first_name) {
        results.push({ email, success: false, error: "Missing email or first_name" });
        continue;
      }
      const password = row.password?.trim() ||
        `Welcome@${(row.admission_number || row.roll_number || "Student").trim()}`;

      try {
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            first_name,
            last_name: row.last_name?.trim() || "",
            role: "student",
            student_class: row.student_class?.trim(),
            roll_number: row.roll_number?.trim(),
            admission_number: row.admission_number?.trim(),
            phone: row.phone?.trim(),
          },
        });
        if (createErr) throw createErr;

        await admin.from("profiles").update({
          role: "student",
          is_approved: true,
          approved_by: caller.id,
          approved_at: new Date().toISOString(),
          first_name,
          last_name: row.last_name?.trim() || "",
          student_class: row.student_class?.trim(),
          roll_number: row.roll_number?.trim(),
          admission_number: row.admission_number?.trim(),
          phone: row.phone?.trim(),
        }).eq("id", created.user.id);

        results.push({ email, success: true, password });
      } catch (e: any) {
        results.push({ email, success: false, error: e.message || String(e) });
      }
    }

    return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
