import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
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

    const body = await req.json();
    const { email, password, first_name, last_name, role, student_class, roll_number, admission_number, phone, username } = body;

    if (!email || !password || !first_name) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { first_name, last_name, role: role || "student", student_class, roll_number, admission_number, phone, username },
    });
    if (createErr) throw createErr;

    const cleanEmail = email.toLowerCase().trim();
    const cleanFirstName = first_name.trim();
    const cleanLastName = (last_name || "").trim();
    const cleanRole = role || "student";
    const cleanAdmissionNo = (admission_number || "").trim() || null;
    const cleanRollNo = (roll_number || "").trim() || null;
    const cleanClass = (student_class || "").trim() || null;
    const cleanPhone = (phone || "").trim() || null;
    const cleanUsername = (username || "").trim().toLowerCase() || cleanAdmissionNo || cleanEmail.split("@")[0];

    const profileData: Record<string, any> = {
      id: created.user.id,
      email: cleanEmail,
      role: cleanRole,
      is_approved: true,
      approved_by: caller.id,
      approved_at: new Date().toISOString(),
      first_name: cleanFirstName,
      last_name: cleanLastName,
      student_class: cleanClass,
      roll_number: cleanRollNo,
      admission_number: cleanAdmissionNo,
      phone: cleanPhone,
      username: cleanUsername,
      needs_profile_update: false,
      updated_at: new Date().toISOString(),
    };

    const { error: profileErr } = await admin.from("profiles").upsert(profileData, { onConflict: "id" });

    // Handle potential username collision by appending unique suffix
    if (profileErr && (profileErr.message?.toLowerCase().includes("username") || profileErr.message?.toLowerCase().includes("unique"))) {
      profileData.username = `${cleanUsername}_${created.user.id.slice(0, 4)}`;
      const { error: retryErr } = await admin.from("profiles").upsert(profileData, { onConflict: "id" });
      if (retryErr) throw retryErr;
    } else if (profileErr) {
      throw profileErr;
    }

    return new Response(JSON.stringify({ success: true, user_id: created.user.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
