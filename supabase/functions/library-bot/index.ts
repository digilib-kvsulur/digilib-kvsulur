import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are LibraryBot, a helpful and friendly AI assistant for the PM SHRI KV AFS Sulur Digital Library.
Your job is to help students find books, understand library rules, and provide recommendations.
Be encouraging, concise, and polite. 
If a user asks about library rules, remind them that books can be borrowed for 14 days and overdue fines are calculated at 1 rupee per day.
If they ask for book recommendations, suggest genres or ask what they like.
Keep your answers brief (1-3 sentences) as they will be displayed in a small chat widget.`;

async function generateGeminiContent(apiKey: string, body: any): Promise<{ reply: string; error?: string }> {
  // We try v1 first, then v1beta as fallback, and also list models if primary fails
  const apiVersions = ["v1", "v1beta"];
  const primaryModel = "gemini-1.5-flash";
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
      
      // If model not found, try listing models to find a working one
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
    const { messages } = await req.json();

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    // Convert OpenAI-style messages to Gemini format
    const geminiContents = messages.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const result = await generateGeminiContent(apiKey, {
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      },
      contents: geminiContents,
      generationConfig: {
        temperature: 0.7,
      }
    });

    if (result.error) {
      throw new Error(result.error);
    }

    return new Response(JSON.stringify({ reply: result.reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
