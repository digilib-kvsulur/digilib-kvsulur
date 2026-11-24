import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Sign in to use the doubt solver." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey || !geminiKey) return json({ error: "The study assistant is not configured." }, 503);

  try {
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser(token);
    if (authError || !user) return json({ error: "Your session has expired. Sign in again." }, 401);
    const { data: profile } = await userClient.from("profiles").select("role,student_class").eq("id", user.id).maybeSingle();
    if (profile?.role !== "student") return json({ error: "The doubt solver is available to students only." }, 403);

    const payload = await req.json();
    const studentClass = String(payload?.studentClass || profile.student_class || "").replace(/[^0-9]/g, "").slice(0, 2);
    const subject = String(payload?.subject || "").trim().slice(0, 80);
    const action = String(payload?.action || "solve");
    if (!studentClass || !subject) return json({ error: "Choose your class and subject first." }, 400);
    if (!["solve", "simpler", "formula", "similar"].includes(action)) return json({ error: "Unsupported follow-up." }, 400);

    let question = String(payload?.question || "").trim().slice(0, 8000);
    let imagePart: Record<string, unknown> | null = null;
    if (payload?.imageBase64) {
      const base64 = String(payload.imageBase64).replace(/^data:[^;]+;base64,/, "");
      const mimeType = String(payload?.mimeType || "");
      if (!/^image\/(jpeg|png|webp)$/.test(mimeType) || base64.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3)) {
        return json({ error: "Upload a JPG, PNG, or WebP image under 5 MB." }, 400);
      }
      imagePart = { inline_data: { mime_type: mimeType, data: base64 } };
    }
    if (!question && !imagePart) return json({ error: "Enter a question or upload its photo." }, 400);

    const { data: allowed, error: limitError } = await userClient.rpc("study_doubt_begin_request", { p_limit: 10 });
    if (limitError) return json({ error: "Could not verify the usage limit. Please try again." }, 503);
    if (!allowed) return json({ error: "You’ve reached the limit of 10 study questions per hour. Try again later." }, 429);

    const serviceClient = createClient(supabaseUrl, serviceKey);
    const { data: classResources } = await serviceClient.from("study_materials")
      .select("id,title,chapter_title,resource_type,source_label,source_url,description,markdown_content,exam_year,marks,file_url")
      .eq("review_status", "approved").in("student_class", [studentClass, "All"]).eq("subject", subject).limit(100);
    const normalizedQuestion = `${question} ${String(payload?.previousQuestion || "")}`.toLowerCase();
    const terms = new Set(normalizedQuestion.split(/[^a-z0-9]+/).filter((word) => word.length > 3));
    const scoredResources = (classResources || []).map((resource) => {
      const haystack = `${resource.title} ${resource.chapter_title || ""} ${resource.description || ""} ${resource.markdown_content || ""}`.toLowerCase();
      return { resource, score: [...terms].reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0) };
    }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
    const sourceContext = scoredResources.map(({ resource }) => `SOURCE [${resource.id}]: ${resource.title}; Chapter: ${resource.chapter_title || "unspecified"}; Type: ${resource.resource_type}; Source: ${resource.source_label || "not specified"}; URL: ${resource.source_url || "not specified"}; Content: ${(resource.markdown_content || resource.description || "No text excerpt stored; link only.").slice(0, 2500)}`).join("\n\n");

    if (action === "similar") {
      const pyqs = scoredResources.map(({ resource }) => resource).filter((resource) => resource.resource_type === "pyq");
      return json({ related_resources: pyqs.map((resource) => ({ id: resource.id, title: resource.title, chapter: resource.chapter_title, year: resource.exam_year, marks: resource.marks, source_label: resource.source_label, source_url: resource.source_url, file_url: resource.file_url })) });
    }

    const actionInstructions: Record<string, string> = {
      solve: "Read the image with OCR if present, then solve the student's question step by step.",
      simpler: "Explain the same question again using simpler language and smaller steps.",
      formula: "Explain the formulas used for the same question, define each symbol and unit, and show substitution.",
      similar: "Give guidance on the same question and identify the kind of related PYQs the student should practise. Do not invent or claim an actual past paper question.",
    };
    const previousAnswer = String(payload?.previousAnswer || "").slice(0, 12000);
    const prompt = `You are a careful NCERT/CBSE study tutor for Class ${studentClass}, subject ${subject}. ${actionInstructions[action]}
The following DLMS class/subject resources are the only local sources available. Use them when relevant, cite exact source IDs in confidence_note, and never claim an official answer unless the source says it is official. If no excerpt supports the answer, clearly say this is a general explanation and ask the student to verify it against their textbook/teacher. Do not invent syllabus coverage, PYQ provenance, or source citations. Use class-appropriate language and numbered reasoning. If the image is unreadable or topic alignment is uncertain, ask for clarification. Return valid JSON only with keys: extracted_question, answer, final_answer, formulas (array of strings), source_ids (array containing only supplied source IDs), confidence_note. Question: ${question || "Extract it from the image."}

Previous explanation to clarify (if any):\n${previousAnswer || "None."}\n\nDLMS RESOURCE CONTEXT:\n${sourceContext || "No matching reviewed resource text is currently stored for this class and subject."}`;
    const parts: Record<string, unknown>[] = [{ text: prompt }];
    if (imagePart) parts.push(imagePart);
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(Deno.env.get("GEMINI_VISION_MODEL") || "gemini-2.5-flash")}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
      body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { temperature: 0.2, responseMimeType: "application/json" } }),
      signal: AbortSignal.timeout(30000),
    });
    const result = await response.json();
    const raw = result?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("") || "";
    if (!response.ok || !raw) return json({ error: "The study assistant is unavailable. Please try again." }, 502);
    const answer = JSON.parse(raw);
    const citedIds = Array.isArray(answer.source_ids) ? answer.source_ids.map(String) : [];
    const citedSources = scoredResources.map(({ resource }) => resource).filter((resource) => citedIds.includes(resource.id));
    const extractedQuestion = String(answer.extracted_question || question || "").slice(0, 8000);
    const answerText = `${String(answer.answer || "").slice(0, 14000)}\n\nFinal answer: ${String(answer.final_answer || "").slice(0, 1500)}\n\n${String(answer.confidence_note || "")}`.slice(0, 16000);
    const formulas = Array.isArray(answer.formulas) ? answer.formulas.map((item: unknown) => String(item).slice(0, 500)).slice(0, 20) : [];
    const { error: saveError } = await serviceClient.from("study_doubt_history").insert({ user_id: user.id, student_class: studentClass, subject, question_text: extractedQuestion, answer_text: answerText, formulas, related_resource_ids: citedSources.map((resource) => resource.id), model_id: Deno.env.get("GEMINI_VISION_MODEL") || "gemini-2.5-flash" });
    if (saveError) console.error("Could not save study doubt history", saveError.message);
    return json({ ...answer, extracted_question: extractedQuestion, formulas, sources: citedSources.map((resource) => ({ id: resource.id, title: resource.title, source_label: resource.source_label, source_url: resource.source_url || resource.file_url })) });
  } catch (error) {
    console.error("Study doubt request failed", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "The question could not be processed. Check the image and try again." }, 500);
  }
});
