import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImportRow {
  rowNumber: number;
  identifier: string;
  days: number;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const key = (value: string) => value.trim().toLowerCase();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authorization = req.headers.get("Authorization") ?? "";
    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: callerProfile } = await admin.from("profiles").select("role").eq("id", caller.id).maybeSingle();
    if (callerProfile?.role !== "admin") return json({ error: "Forbidden" }, 403);

    const body = await req.json();
    const rows = body?.rows as ImportRow[];
    if (!Array.isArray(rows) || rows.length === 0 || rows.length > 1000) return json({ error: "Provide between 1 and 1000 rows" }, 400);

    const invalid = rows.find((row) => !row || !String(row.identifier || "").trim() || !Number.isInteger(row.days) || row.days < 1 || row.days > 3650);
    if (invalid) return json({ error: "Each row needs an identifier and a whole-number days_to_add value between 1 and 3650" }, 400);
    const identifiers = [...new Set(rows.map((row) => String(row.identifier).trim()))];
    const normalizedIdentifiers = new Set(identifiers.map(key));
    if (normalizedIdentifiers.size !== identifiers.length) return json({ error: "Each student may appear only once per import" }, 400);

    const [admission, roll, username] = await Promise.all([
      admin.from("profiles").select("id, admission_number, roll_number, username").eq("role", "student").in("admission_number", identifiers),
      admin.from("profiles").select("id, admission_number, roll_number, username").eq("role", "student").in("roll_number", identifiers),
      admin.from("profiles").select("id, admission_number, roll_number, username").eq("role", "student").in("username", identifiers),
    ]);
    if (admission.error || roll.error || username.error) throw admission.error || roll.error || username.error;

    const matches = new Map<string, { id: string }[]>();
    for (const profile of [...(admission.data || []), ...(roll.data || []), ...(username.data || [])]) {
      for (const value of [profile.admission_number, profile.roll_number, profile.username]) {
        if (!value || !normalizedIdentifiers.has(key(value))) continue;
        const profileMatches = matches.get(key(value)) || [];
        if (!profileMatches.some((match) => match.id === profile.id)) profileMatches.push({ id: profile.id });
        matches.set(key(value), profileMatches);
      }
    }

    const results = [];
    for (const row of rows) {
      const found = matches.get(key(row.identifier)) || [];
      if (found.length === 0) { results.push({ rowNumber: row.rowNumber, identifier: row.identifier, success: false, error: "Student not found" }); continue; }
      if (found.length > 1) { results.push({ rowNumber: row.rowNumber, identifier: row.identifier, success: false, error: "Identifier matches multiple students" }); continue; }
      const { data, error } = await callerClient.rpc("admin_increase_login_streak", { p_user_id: found[0].id, p_days: row.days });
      if (error) { results.push({ rowNumber: row.rowNumber, identifier: row.identifier, success: false, error: error.message }); continue; }
      const result = Array.isArray(data) ? data[0] : data;
      results.push({ rowNumber: row.rowNumber, identifier: row.identifier, success: true, previousStreak: result?.previous_streak, newStreak: result?.new_streak });
    }

    return json({ results });
  } catch (error: any) {
    return json({ error: error.message || "Unexpected server error" }, 500);
  }
});
