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
    if (rows.length > 5000) {
      return new Response(JSON.stringify({ error: "Maximum 5000 rows per import batch" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Process a single row
    const processRow = async (row: Row) => {
      const uid = (row.student_uid || row.admission_number || "").toString().trim();
      if (!uid) {
        return { email: "", success: false, error: "Missing student UID or admission number" };
      }

      const email = row.email?.trim().toLowerCase() || `${uid}@kvsulur.com`;

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

        // First check if profile/user already exists with this admission_number or email
        const { data: existingProf } = await admin
          .from("profiles")
          .select("id")
          .or(`admission_number.eq.${uid},email.eq.${email}`)
          .maybeSingle();

        if (existingProf?.id) {
          userId = existingProf.id;
          isExisting = true;
          await admin.auth.admin.updateUserById(userId, {
            password,
            user_metadata: {
              first_name: firstName,
              last_name: lastName,
              role: "student",
              student_class: rawClass,
              roll_number: row.roll_number?.trim() || "",
              admission_number: uid,
              phone: row.phone?.trim() || "",
              needs_profile_update: true,
            }
          });
        } else {
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
            // Fallback: search profile again or rethrow
            if (createErr.message?.toLowerCase().includes("already registered") || createErr.message?.toLowerCase().includes("already exists")) {
              const { data: profByEmail } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
              if (profByEmail?.id) {
                userId = profByEmail.id;
                isExisting = true;
                await admin.auth.admin.updateUserById(userId, {
                  password,
                  user_metadata: {
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
        }

        if (userId) {
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

          return {
            email,
            success: true,
            password,
            error: isExisting ? "Updated existing account" : undefined
          };
        } else {
          return { email, success: false, error: "User ID resolution failed" };
        }
      } catch (e: any) {
        return { email, success: false, error: e.message || String(e) };
      }
    };

    // Process rows in parallel batches of 15 to avoid edge function timeouts while staying robust
    const results: Array<{ email: string; success: boolean; password?: string; error?: string }> = [];
    const BATCH_SIZE = 15;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch.map(processRow));
      results.push(...batchResults);
    }

    return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
