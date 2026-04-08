import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const adminEmail = "admin@kvsulur.edu.in";
    const adminPassword = "Admin@KVSulur2024";

    // Create admin user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });

    if (authError) {
      // If user already exists, that's OK
      if (authError.message.includes("already been registered")) {
        return new Response(
          JSON.stringify({ message: "Admin user already exists", email: adminEmail }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw authError;
    }

    // Update profile to admin role and auto-approve
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        role: "admin",
        is_approved: true,
        first_name: "Admin",
        last_name: "Library",
        approved_at: new Date().toISOString(),
      })
      .eq("id", authData.user.id);

    if (profileError) throw profileError;

    return new Response(
      JSON.stringify({ 
        message: "Admin user created successfully",
        email: adminEmail,
        password: adminPassword
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
