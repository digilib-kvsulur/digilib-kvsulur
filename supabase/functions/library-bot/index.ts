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

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents: geminiContents,
        generationConfig: {
          temperature: 0.7,
        }
      }),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || 'Error from Gemini API');
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not understand that.';

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
