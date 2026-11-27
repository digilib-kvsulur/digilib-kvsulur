import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const MAX_QUESTION = 4000;
const MAX_ANSWER = 14000;
const MAX_WORDS = 1200;

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function parseJsonObject(raw: string) {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("Model did not return a JSON object.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Sign in to use the answer coach." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey || !geminiKey) {
    return json({ error: "The answer coach is not configured yet. Ask your teacher to enable AI feedback." }, 503);
  }

  try {
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser(token);
    if (authError || !user) return json({ error: "Your session has expired. Sign in again." }, 401);

    const { data: profile } = await userClient.from("profiles").select("role,student_class").eq("id", user.id).maybeSingle();
    if (profile?.role !== "student") return json({ error: "The answer coach is available to students only." }, 403);

    const payload = await req.json();
    const studentClass = String(payload?.studentClass || profile.student_class || "").replace(/[^0-9]/g, "").slice(0, 2);
    const subject = String(payload?.subject || "").trim().slice(0, 80);
    const question = String(payload?.question || "").trim().slice(0, MAX_QUESTION);
    const answer = String(payload?.answer || "").trim().slice(0, MAX_ANSWER);
    const marks = Math.round(clampNumber(payload?.marks, 1, 20, 5));

    if (!studentClass || Number(studentClass) < 6 || Number(studentClass) > 12) {
      return json({ error: "Choose a valid class." }, 400);
    }
    if (!subject) return json({ error: "Choose the subject first." }, 400);
    if (question.length < 10) return json({ error: "Paste the full question before requesting feedback." }, 400);
    if (answer.length < 25) return json({ error: "Write at least a few sentences before requesting feedback." }, 400);

    const words = answer.split(/\s+/).filter(Boolean).length;
    if (words > MAX_WORDS) return json({ error: `Keep the answer under ${MAX_WORDS} words.` }, 400);

    const { data: allowed, error: limitError } = await userClient.rpc("study_answer_coach_begin_request", { p_limit: 5 });
    if (limitError) return json({ error: "Could not verify the usage limit. Please try again." }, 503);
    if (!allowed) return json({ error: "You have used all 5 answer-coach reviews for this hour. Try again later." }, 429);

    const serviceClient = createClient(supabaseUrl, serviceKey);
    const { data: resources } = await serviceClient.from("study_materials")
      .select("id,title,chapter_title,resource_type,source_label,source_url,description,markdown_content")
      .eq("review_status", "approved")
      .in("student_class", [studentClass, "All"])
      .eq("subject", subject)
      .limit(80);

    const terms = new Set(
      `${question} ${answer}`.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3),
    );
    const scored = (resources || []).map((resource) => {
      const haystack = `${resource.title} ${resource.chapter_title || ""} ${resource.description || ""} ${resource.markdown_content || ""}`.toLowerCase();
      return { resource, score: [...terms].reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0) };
    }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 4);

    const sourceContext = scored.map(({ resource }) => `SOURCE [${resource.id}]: ${resource.title}; Chapter: ${resource.chapter_title || "unspecified"}; Type: ${resource.resource_type}; Source: ${resource.source_label || "not specified"}; URL: ${resource.source_url || "not specified"}; Content: ${(resource.markdown_content || resource.description || "No text excerpt stored.").slice(0, 1800)}`).join("\n\n");

    const rubric = [
      "Content accuracy (out of 5)",
      "Structure and organisation (out of 5)",
      "Evidence and examples (out of 5)",
      "Language and clarity (out of 5)",
    ];

    const prompt = `You are a careful CBSE/NCERT examiner and writing coach for Class ${studentClass}, subject ${subject}. A student wrote an answer for a ${marks}-mark question.

Evaluate the answer against the question. Be specific and kind, but do not inflate the score. Use the supplied DLMS resource excerpts as the only local factual sources. If the excerpts do not support a claim, do not invent a citation.

Use exactly these four rubric criteria, each scored out of 5:
${rubric.map((row) => `- ${row}`).join("\n")}

The question is worth ${marks} marks, so comment on whether the depth and length fit that mark value, but keep the rubric scores out of 5.

Return valid JSON only with exactly these keys:
{
  "overall": "2-4 sentence summary of the answer's level and the single biggest improvement",
  "scores": [{"criterion": "...", "score": number, "max": 5, "comment": "specific evidence from the answer"}],
  "strengths": ["specific thing the student did well", "..."],
  "improvements": ["specific, actionable change", "..."],
  "model_answer": "A concise model answer for the same question, at the expected length for ${marks} marks.",
  "next_step": "One short practice action for the student.",
  "source_ids": ["only IDs from the supplied sources that support the model answer"]
}

Rules:
- Scores must be integers from 0 to 5. Always return all four criteria.
- Do not claim the model answer is the only correct answer.
- If the answer is off-topic, say so clearly and score content low.
- Do not use markdown fences around the JSON.

Question:
${question}

Student answer (${words} words):
${answer}

DLMS resource excerpts:
${sourceContext || "No matching reviewed resource text is stored for this class and subject."}`;

    const model = Deno.env.get("GEMINI_TEXT_MODEL") || Deno.env.get("GEMINI_VISION_MODEL") || "gemini-2.5-flash";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(35000),
    });
    const result = await response.json();
    const raw = result?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("") || "";
    if (!response.ok || !raw) return json({ error: "The answer coach is unavailable right now. Please try again." }, 502);

    let parsed: Record<string, unknown>;
    try {
      parsed = parseJsonObject(raw);
    } catch {
      return json({ error: "The coach returned an unreadable response. Please try again." }, 502);
    }

    const rawScores = Array.isArray(parsed.scores) ? parsed.scores : [];
    const scores = rawScores.slice(0, 6).map((row) => {
      const item = (row || {}) as Record<string, unknown>;
      return {
        criterion: String(item.criterion || "Criterion").slice(0, 120),
        score: Math.round(clampNumber(item.score, 0, 5, 0)),
        max: 5,
        comment: String(item.comment || "").slice(0, 900),
      };
    });

    const sourceIds = Array.isArray(parsed.source_ids) ? parsed.source_ids.map(String) : [];
    const sources = scored.map(({ resource }) => resource)
      .filter((resource) => sourceIds.includes(resource.id))
      .map((resource) => ({
        id: resource.id,
        title: resource.title,
        source_label: resource.source_label,
        source_url: resource.source_url,
      }));

    return json({
      overall: String(parsed.overall || "").slice(0, 1600),
      scores,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String).slice(0, 6) : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements.map(String).slice(0, 6) : [],
      model_answer: String(parsed.model_answer || "").slice(0, 8000),
      next_step: String(parsed.next_step || "").slice(0, 500),
      sources,
      model_id: model,
    });
  } catch (error) {
    console.error("Answer coach failed", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "The answer could not be reviewed. Please try again." }, 500);
  }
});
