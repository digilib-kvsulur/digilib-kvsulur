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

      // Valid standard email domain format
      const email = row.email?.trim().toLowerCase() || `${uid}@kvsulur.com`;

      // Resolve name
      const name = (row.student_name || row.first_name || "Student").toString().trim();
      let firstName = name;
      let lastName = (row.last_name || "").toString().trim();
      
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
        let userId: string | null = null;
        let isExisting = false;

        // Try creating new user
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
            needs_profile_update: true,
          },
        });

        if (createErr) {
          // If user already registered, update existing user
          if (createErr.message?.toLowerCase().includes("already registered") || createErr.message?.toLowerCase().includes("already exists")) {
            isExisting = true;
            const { data: usersList } = await admin.auth.admin.listUsers();
            const existingUser = usersList?.users?.find(u => u.email?.toLowerCase() === email);
            if (existingUser) {
              userId = existingUser.id;
              await admin.auth.admin.updateUserById(userId, {
                password,
                user_metadata: {
                  ...existingUser.user_metadata,
                  first_name: firstName,
                  last_name: lastName,
                  student_class: rawClass,
                  admission_number: uid,
                  needs_profile_update: true,
                }
              });
            } else {
              throw createErr;
            }
          } else {
            throw createErr;
          }
        } else if (created?.user) {
          userId = created.user.id;
        }

        if (userId) {
          // Update profile in DB
          await admin.from("profiles").upsert({
            id: userId,
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
            email: email,
            updated_at: new Date().toISOString()
          }, { onConflict: "id" });

          results.push({
            email,
            success: true,
            password,
            error: isExisting ? "Updated existing account" : undefined
          });
        } else {
          results.push({ email, success: false, error: "User ID resolution failed" });
        }
      } catch (e: any) {
        results.push({ email, success: false, error: e.message || String(e) });
      }
    }

    return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
