import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { title, author, description, numQuestions = 5 } = await req.json();

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    const prompt = `Generate a ${numQuestions}-question multiple choice quiz for the book "${title}" by ${author || 'unknown'}. 
    ${description ? `Context about the book: ${description}` : ''}
    
    Return the result EXACTLY as a JSON array of objects. 
    Each object should have:
    - "question" (string)
    - "options" (array of 4 strings)
    - "correctAnswer" (string, must exactly match one of the options)
    
    Do not wrap the JSON in markdown code blocks, just return the raw JSON array.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
        }
      }),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || 'Error from Gemini API');
    }

    let textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    
    // Clean up potential markdown formatting
    textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let questions;
    try {
      questions = JSON.parse(textResponse);
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
