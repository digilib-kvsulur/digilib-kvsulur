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

    // 1. Verify caller is authenticated
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: userError } = await userClient.auth.getUser();
    if (userError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Parse request body
    const body = await req.json();
    const { email, password, first_name, last_name, student_class, roll_number, phone, username } = body;

    if (!email || !password || !first_name || !last_name || !student_class || !roll_number || !username) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

    // 3. Update auth user (email, password, metadata) using admin client to bypass verification email
    const { data: updatedAuthUser, error: authError } = await admin.auth.admin.updateUserById(caller.id, {
      email: email.trim().toLowerCase(),
      password: password,
      email_confirm: true,
      user_metadata: {
        ...caller.user_metadata,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        role: "student",
        student_class: student_class.trim(),
        roll_number: roll_number.trim(),
        phone: phone.trim() || null,
        username: username.trim().toLowerCase(),
        needs_profile_update: false
      }
    });

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 4. Update the public profiles table
    const { error: profileError } = await admin
      .from("profiles")
      .update({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        student_class: student_class.trim(),
        roll_number: roll_number.trim(),
        phone: phone.trim() || null,
        email: email.trim().toLowerCase(),
        username: username.trim().toLowerCase(),
        needs_profile_update: false,
        updated_at: new Date().toISOString()
      })
      .eq("id", caller.id);

    if (profileError) {
      // If profile update fails, we should return the database error (e.g. duplicate username/email/etc)
      let msg = profileError.message;
      if (msg?.toLowerCase().includes("unique") || msg?.toLowerCase().includes("username")) {
        msg = "This username is already taken. Please choose another username.";
      }
      return new Response(JSON.stringify({ error: msg }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
