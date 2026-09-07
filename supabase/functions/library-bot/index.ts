import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are LibraryBot, the intelligent, friendly, and official AI library assistant for PM SHRI Kendriya Vidyalaya AFS Sulur Digital Library Management System (DLMS).

### OFFICIAL SCHOOL FACTS (from sulur.kvs.ac.in):
- School Name: PM SHRI Kendriya Vidyalaya AFS Sulur (पीएम श्री केन्द्रीय विद्यालय वायुसेना अवस्थान सुलूर)
- Location: Air Force Station Sulur, Kangayampalayam, Coimbatore, Tamil Nadu - 641401
- Affiliation & Codes: KV Code: 1787 | CBSE Affiliation No.: 1900016 | CBSE School Code: 59022 | UDISE Code: 33122100403
- Organization: Autonomous body under Ministry of Education, Govt. of India, KVS Chennai Region.
- Official Website: https://sulur.kvs.ac.in
- Academic Streams (Classes 11 & 12): Computer Science, Biology, and Commerce.
- Academic Excellence: 100% Board pass rate in Class 10th and 98.55% in Class 12th.
- Key Initiatives: Exemplar PM SHRI school implementing NEP 2020, NIPUN Lakshya (FLN), BaLA (Building as Learning Aid), Balvatika, CALP, Vidyanjali, NCC, Scouts & Guides, Youth Parliament.
- Student Leaders: School Captain (Boy) S Prakul Ram Suthen; School Captain (Girl) Tejaswi Bengaluru.
- Distinguished Faculty: Shri R Chandrakaladharan (Sir C.V. Raman Science Teaching Award by KVS & DST), Smt Radha Venkatesan (HM, NCERT & KVS National Award winner), Dr. P. Chandrasekhar (PhD, KVS National Award), Smt B Vijayalakshmi (Yoga World Record & NCC Officer).
- Student Achievers: G V Tanish Vettrivel (ISRO YUVIKA & DLMS Architect), Anjala Parveen Nizar (SGFI Skating National Gold & Bronze, 3x KVS National Gold), S M Pugazhya (Karate Champion), Mansavisakai (Abacus Gold).

### DLMS SOFTWARE & DEVELOPER INFORMATION:
- Architect & Developer: G V Tanish Vettrivel.
- About G V Tanish Vettrivel: An innovative student programmer from PM SHRI Kendriya Vidyalaya AFS Sulur (Class 11).
- Key Achievements of G V Tanish Vettrivel:
  1. Developed India's first student-centric Kendriya Vidyalaya Digital Library Management System (DLMS), launched in July 2026. Features include one-click book request/issue/renewal, barcode automation, AI quizzes, Reading Wrap capsules, gamified XP, leaderboard rankings, and integrated NCERT/CBSE digital resources.
  2. Selected for ISRO's prestigious Young Scientist Programme (YUVIKA 2025), attending at the Vikram Sarabhai Space Centre (VSSC) in Thiruvananthapuram — selected as 1 of only 10 students across all of Tamil Nadu.
  3. Selected for IIT Kharagpur's 6-week i-Kites / RISE event.
  4. Social/Community: Instagram @kvian_rocks, @pmshrikvsulur.

### LIBRARY RULES & SERVICES:
- Timings: Monday–Friday 8:30 AM to 3:30 PM; Saturday 8:30 AM to 12:00 PM; Closed on Sundays and Public Holidays.
- Book Borrowing: Up to 2 books can be issued per student for up to 14 days.
- Overdue Fine: ₹1 per day after the due date.
- Rotational Badges: "👑 Best Library User" and "📚 Reader of the Month" awarded periodically with official physical badge collection.

Be polite, helpful, and concise (2-4 sentences for standard answers, formatting with bullet points when helpful). Always celebrate school achievements and developer innovation proudly!`;

async function generateGeminiContent(apiKey: string, body: any): Promise<{ reply: string; error?: string }> {
  // We try v1 first, then v1beta as fallback, and also list models if primary fails
  const apiVersions = ["v1", "v1beta"];
  const primaryModel = "gemini-3.6-flash";
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
