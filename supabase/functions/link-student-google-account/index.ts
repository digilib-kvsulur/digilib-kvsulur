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

    // 1. Verify caller has an active Google/OAuth session
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user: caller }, error: userError } = await userClient.auth.getUser();
    if (userError || !caller || !caller.email) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Active Google session is required." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const googleEmail = caller.email.trim().toLowerCase();

    // 2. Parse request body (admission_number and password)
    const body = await req.json();
    const admissionNumber = String(body.admission_number || "").trim();
    const password = String(body.password || "");

    if (!admissionNumber || !password) {
      return new Response(
        JSON.stringify({ error: "Both Admission Number and Password are required to link your account." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3. Locate the student account by admission_number
    const { data: studentProfile, error: profileErr } = await admin
      .from("profiles")
      .select("id, admission_number, first_name, last_name, role, email, notification_email, is_approved")
      .eq("admission_number", admissionNumber)
      .maybeSingle();

    if (profileErr) {
      console.error("Student lookup failed while linking Google account:", profileErr);
      return new Response(
        JSON.stringify({ error: "Could not look up the student account. Please try again or contact the librarian." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!studentProfile) {
      return new Response(
        JSON.stringify({ error: `No student account found with Admission Number: "${admissionNumber}". Please check your admission number.` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Fetch the student's auth user record to verify password
    const { data: studentAuthData, error: studentAuthErr } = await admin.auth.admin.getUserById(studentProfile.id);
    if (studentAuthErr || !studentAuthData?.user?.email) {
      return new Response(
        JSON.stringify({ error: "Could not retrieve student credentials for verification." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const studentAuthEmail = studentAuthData.user.email;

    // 5. Verify the password by attempting sign-in with an isolated client
    const testAuthClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });
    const { data: signInRes, error: passErr } = await testAuthClient.auth.signInWithPassword({
      email: studentAuthEmail,
      password: password,
    });

    if (passErr || !signInRes?.user) {
      return new Response(
        JSON.stringify({ error: `Incorrect password for Admission Number ${admissionNumber}. Please enter your valid library password.` }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Check if this Google email is already linked to ANOTHER student account
    const { data: conflictingStudent, error: conflictLookupError } = await admin
      .from("profiles")
      .select("id, admission_number, first_name, last_name")
      .ilike("google_email", googleEmail)
      .neq("id", studentProfile.id)
      .maybeSingle();

    if (conflictLookupError) {
      console.error("Google account conflict lookup failed:", conflictLookupError);
      return new Response(
        JSON.stringify({ error: "Could not verify whether this Google account is already linked. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (conflictingStudent) {
      return new Response(
        JSON.stringify({
          error: `The Google account (${googleEmail}) is already linked to another student account (Admission No: ${conflictingStudent.admission_number}).`,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Atomic linking
    // If the caller is a temporary auth user created during Google sign-in (caller.id !== studentProfile.id):
    if (caller.id !== studentProfile.id) {
      // Remove temporary auth user so googleEmail is free to become the student's primary auth email
      const { error: deleteTempErr } = await admin.auth.admin.deleteUser(caller.id);
      if (deleteTempErr) {
        console.error("Error deleting temp auth user:", deleteTempErr);
      }
    }

    // Update the student's auth.users entry
    const { error: updateAuthErr } = await admin.auth.admin.updateUserById(studentProfile.id, {
      email: googleEmail,
      email_confirm: true,
      user_metadata: {
        ...(studentAuthData.user.user_metadata || {}),
        google_email: googleEmail,
        google_linked: true,
        admission_number: studentProfile.admission_number,
      },
    });

    if (updateAuthErr) {
      return new Response(
        JSON.stringify({ error: `Failed to link authentication email: ${updateAuthErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update public.profiles
    const { error: updateProfileErr } = await admin
      .from("profiles")
      .update({
        email: googleEmail,
        google_email: googleEmail,
        notification_email: studentProfile.notification_email || googleEmail,
        is_approved: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", studentProfile.id);

    if (updateProfileErr) {
      return new Response(
        JSON.stringify({ error: `Failed to update profile record: ${updateProfileErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Google account successfully linked!",
        student: {
          id: studentProfile.id,
          admission_number: studentProfile.admission_number,
          first_name: studentProfile.first_name,
          last_name: studentProfile.last_name,
          role: studentProfile.role,
          email: googleEmail,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("link-student-google-account error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "An unexpected error occurred during account linking." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
