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
      const uid = String(row.student_uid || row.admission_number || "").trim();
      if (!uid) {
        return { email: "", success: false, error: "Missing student UID or admission number" };
      }

      const email = String(row.email || "").trim().toLowerCase() || `${uid}@kvsulur.com`;

      const name = String(row.student_name || row.first_name || "Student").trim();
      let firstName = name;
      let lastName = String(row.last_name || "").trim();
      
      if (name && !lastName) {
        const parts = name.split(/\s+/);
        if (parts.length > 1) {
          firstName = parts[0];
          lastName = parts.slice(1).join(" ");
        }
      }

      const rawClass = String(row.student_class || "").trim();
      const password = String(row.password || "").trim() || "Welcome@123";

      try {
        let userId: string | null = null;
        let isExisting = false;

        // 1. Check if profile already exists with this admission_number or email
        let existingProf: { id: string } | null = null;

        const { data: pByUid } = await admin.from("profiles").select("id").eq("admission_number", uid).limit(1).maybeSingle();
        if (pByUid) {
          existingProf = pByUid;
        } else {
          const { data: pByEmail } = await admin.from("profiles").select("id").eq("email", email).limit(1).maybeSingle();
          if (pByEmail) existingProf = pByEmail;
        }

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
              roll_number: String(row.roll_number || "").trim(),
              admission_number: uid,
              phone: String(row.phone || "").trim(),
              needs_profile_update: true,
            }
          });
        } else {
          // 2. Try creating new user in Auth
          const { data: created, error: createErr } = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
              first_name: firstName,
              last_name: lastName,
              role: "student",
              student_class: rawClass,
              roll_number: String(row.roll_number || "").trim(),
              admission_number: uid,
              phone: String(row.phone || "").trim(),
              needs_profile_update: true,
            },
          });

          if (createErr) {
            // Handle any database trigger error or user existing error gracefully
            const { data: fallbackProf } = await admin.from("profiles").select("id").or(`admission_number.eq.${uid},email.eq.${email}`).limit(1).maybeSingle();
            if (fallbackProf?.id) {
              userId = fallbackProf.id;
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
              throw new Error(createErr.message || "Database error creating new user");
            }
          } else if (created?.user) {
            userId = created.user.id;
          }
        }

        if (userId) {
          // 3. Guarantee profile record exists in public.profiles table
          await admin.from("profiles").upsert({
            id: userId,
            role: "student",
            is_approved: true,
            approved_by: caller.id,
            approved_at: new Date().toISOString(),
            first_name: firstName,
            last_name: lastName,
            student_class: rawClass,
            roll_number: String(row.roll_number || "").trim(),
            admission_number: uid,
            phone: String(row.phone || "").trim(),
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

    // Process rows in parallel batches of 15
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
