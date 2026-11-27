import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function generateGeminiContent(apiKey: string, body: any): Promise<{ reply: string; error?: string }> {
  const apiVersions = ["v1", "v1beta"];
  const primaryModel = Deno.env.get("GEMINI_TEXT_MODEL") || "gemini-3.8-flash";
  let lastError = "";

  for (const apiVer of apiVersions) {
    try {
      const url = `https://generativelanguage.googleapis.com/${apiVer}/models/${primaryModel}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (response.ok && !data.error) {
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply) return { reply };
      }
      
      const errMsg = data.error?.message || "Unknown error";
      lastError = `${apiVer}/${primaryModel}: ${errMsg}`;
      
      if (response.status === 404 || errMsg.includes("not found") || errMsg.includes("not supported")) {
        console.log(`Model ${primaryModel} failed on ${apiVer}. Querying ListModels...`);
        const listRes = await fetch(`https://generativelanguage.googleapis.com/${apiVer}/models?key=${apiKey}`);
        if (listRes.ok) {
          const listData = await listRes.json();
          const models = listData.models || [];
          const found = models.find((m: any) => 
            m.name.includes("gemini") && 
            m.supportedGenerationMethods?.includes("generateContent")
          );
          if (found) {
            const fallbackModel = found.name.replace("models/", "");
            console.log(`Retrying with fallback model ${fallbackModel} on ${apiVer}`);
            const retryUrl = `https://generativelanguage.googleapis.com/${apiVer}/models/${fallbackModel}:generateContent?key=${apiKey}`;
            const retryResponse = await fetch(retryUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });
            const retryData = await retryResponse.json();
            if (retryResponse.ok && !retryData.error) {
              const reply = retryData.candidates?.[0]?.content?.parts?.[0]?.text;
              if (reply) return { reply };
            }
            lastError = `Fallback ${fallbackModel} failed: ${retryData.error?.message || "Unknown"}`;
          }
        }
      }
    } catch (e: any) {
      lastError = e.message || "Network error";
    }
  }

  return { reply: "", error: `Gemini API failed. Last attempt details: ${lastError}` };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { title, author, description, numQuestions = 5 } = await req.json();

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    const groqKey = Deno.env.get('GROQ_API_KEY');
    if (!apiKey && !groqKey) throw new Error('Configure GEMINI_API_KEY or GROQ_API_KEY');

    const prompt = `Generate a ${numQuestions}-question multiple choice quiz for the book "${title}" by ${author || 'unknown'}. 
    ${description ? `Context about the book: ${description}` : ''}
    
    Return the result EXACTLY as a JSON array of objects. 
    Each object should have:
    - "question" (string)
    - "options" (array of 4 strings)
    - "correctAnswer" (string, must exactly match one of the options)
    
    Do not wrap the JSON in markdown code blocks, just return the raw JSON array.`;

    const promptBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
      }
    };

    let result = apiKey ? await generateGeminiContent(apiKey, promptBody) : { reply: "", error: "Gemini is not configured" };
    if (!result.reply && groqKey) {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: Deno.env.get('GROQ_MODEL') || 'llama-3.3-70b-versatile',
          temperature: 0.7,
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: `${prompt}\nReturn an object with a single key "questions" containing the quiz array.` }],
        }),
      });
      const groqData = await groqRes.json();
      if (groqRes.ok) {
        const content = groqData?.choices?.[0]?.message?.content || '';
        try {
          const parsed = JSON.parse(content);
          result = { reply: JSON.stringify(Array.isArray(parsed) ? parsed : parsed.questions || []) };
        } catch {
          console.error('Groq quiz returned invalid JSON');
        }
      } else {
        console.error('Groq quiz request failed', groqRes.status, groqData?.error?.message || 'No provider details');
      }
    }
    if (result.error && !result.reply) throw new Error('AI quiz generation failed. Check provider configuration and try again.');

    let textResponse = result.reply || '[]';
    
    // Clean up potential markdown formatting
    textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let questions;
    try {
      questions = JSON.parse(textResponse);
      if (!Array.isArray(questions)) questions = questions?.questions;
      if (!Array.isArray(questions)) throw new Error('Quiz was not an array');
    } catch (e) {
      throw new Error('Failed to parse AI response as JSON');
    }

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
