import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Row {
  email?: string;
  first_name?: string;
  last_name?: string;
  student_class?: string;
  roll_number?: string;
  admission_number?: string;
  phone?: string;
  password?: string;
  // new import columns
  student_uid?: string;
  student_name?: string;
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
      // Resolve student uid
      const uid = (row.student_uid || row.admission_number || "").toString().trim();
      if (!uid) {
        results.push({ email: "", success: false, error: "Missing student UID or admission number" });
        continue;
      }

      // Resolve email
      const email = row.email?.trim().toLowerCase() || `${uid}@kvsulur.digilib`;

      // Resolve name
      const name = (row.student_name || row.first_name || "Student").toString().trim();
      let firstName = name;
      let lastName = (row.last_name || "").toString().trim();
      
      // If we got a full name and no last name, split it
      if (name && !lastName) {
        const parts = name.split(/\s+/);
        if (parts.length > 1) {
          firstName = parts[0];
          lastName = parts.slice(1).join(" ");
        }
      }

      const rawClass = (row.student_class || "").toString().trim();

      const password = row.password?.trim() || "Welcome@123";

      try {
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            first_name: firstName,
            last_name: lastName,
            role: "student",
            student_class: rawClass,
            roll_number: row.roll_number?.trim() || "",
            admission_number: uid,
            phone: row.phone?.trim() || "",
            needs_profile_update: true, // Mark that profile needs completion on first login
          },
        });
        if (createErr) throw createErr;

        // Update the profile with the basic details.
        // needs_profile_update is tracked via auth user_metadata (set above), NOT the profiles table.
        // This makes it work without running the DB migration.
        const { error: profileErr } = await admin.from("profiles").update({
          role: "student",
          is_approved: true,
          approved_by: caller.id,
          approved_at: new Date().toISOString(),
          first_name: firstName,
          last_name: lastName,
          student_class: rawClass,
          roll_number: row.roll_number?.trim() || "",
          admission_number: uid,
          phone: row.phone?.trim() || "",
        }).eq("id", created.user.id);

        results.push({
          email,
          success: true,
          password,
          ...(profileErr ? { error: `Profile update warning: ${profileErr.message}` } : {})
        });
      } catch (e: any) {
        results.push({ email, success: false, error: e.message || String(e) });
      }
    }

    return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
