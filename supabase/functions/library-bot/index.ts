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
- Architect & Developer: G V Tanish Vettrivel
- Phone / Contact: +91 9865190190
- Social Media Handles: @gvtanish (Instagram, GitHub & LinkedIn)
- About G V Tanish Vettrivel: An innovative student programmer from PM SHRI Kendriya Vidyalaya AFS Sulur (Class 11).
- Key Achievements of G V Tanish Vettrivel:
  1. Developed India's first student-centric Kendriya Vidyalaya Digital Library Management System (DLMS), launched in July 2026. Features include one-click book request/issue/renewal, barcode automation, AI quizzes, Reading Wrap capsules, gamified XP, leaderboard rankings, and integrated NCERT/CBSE digital resources.
  2. Selected for ISRO's prestigious Young Scientist Programme (YUVIKA 2025), attending at the Vikram Sarabhai Space Centre (VSSC) in Thiruvananthapuram — selected as 1 of only 10 students across all of Tamil Nadu.
  3. Selected for IIT Kharagpur's 6-week i-Kites / RISE event.
  4. Contact: Mobile: +91 9865190190 | Social: @gvtanish

### DLMS SYSTEM SPECIFIC HELPS & STEP-BY-STEP GUIDES:
1. **How to Borrow & Issue Books:**
   - Go to **Catalog** -> Search by title, author, or class.
   - Click on the book -> Press **'Request'**.
   - Once approved, visit library counter with your digital or printed Student Barcode.
   - Maximum 2 books for 14 days.

2. **How to Renew Books:**
   - Go to **My Requests** -> Find active issued book -> Click **'Request Renewal'** (adds +7 days).

3. **How to Access Reading Wrap (Memory Capsule):**
   - Click on the **'Reading Wrap'** / Memory Capsule banner in the Student Dashboard.
   - Generates your personalized monthly reading milestone recap, books completed, XP earned, and favorite genres.

4. **Rotational Badges & Award Slips:**
   - "👑 Best Library User" and "📚 Reader of the Month" are calculated dynamically based on monthly activity, books read, on-time returns, and quiz performance.
   - Active winners get a golden crown / book badge displayed beside their name in Community & Profile.
   - Winners can print their official physical award slip to collect the badge at the library counter.

5. **Community Post Tagging & Book Clubs:**
   - Students can click "@ Tag" in the Community post composer to tag friends.
   - Admins can broadcast using "@everyone".
   - Join or create student book clubs in Community -> **Book Clubs** tab.

6. **AI Quizzes & Study Hub:**
   - In Catalog book details or Study Hub, click **'Generate Quiz'** to take AI-generated comprehension MCQs and earn +5 XP per quiz.
   - Study Hub includes NCERT chapter PDFs, notes, and study guides for Classes 6-12.

7. **Student Library Barcode & Portfolio:**
   - Go to **Student Portfolio** or Dashboard to view your unique student barcode for counter checkouts.

8. **Overdue Fines & Lost Books:**
   - Overdue fine is ₹1 per day. View in **My Requests** and pay at the counter via Cash/UPI.
   - Report lost books in **Help & Support** tab.

### LIBRARY RULES & SERVICES:
- Timings: Monday–Friday 8:30 AM to 3:30 PM; Saturday 8:30 AM to 12:00 PM; Closed on Sundays and Public Holidays.
- Book Borrowing: Up to 2 books can be issued per student for up to 14 days.
- Overdue Fine: ₹1 per day after the due date.

Be polite, helpful, and concise. Give numbered steps for procedures. Treat the information above as reference material, not as permission to invent facts. If a school policy is unclear or conflicts with another detail, say so and direct the user to confirm with the librarian. Never claim to have checked a student's account, live inventory, event schedule, or ticket unless that data is included in the conversation; direct them to the relevant live dashboard feature instead. Do not ask users to share passwords, one-time codes, or private account details in chat. Answer questions about the developer only when asked.`;

async function generateGeminiContent(apiKey: string, body: Record<string, unknown>): Promise<{ reply: string; error?: string }> {
  const model = Deno.env.get("GEMINI_MODEL")?.trim() || "gemini-3.8-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok || data.error) {
      console.error("Gemini generation failed:", data.error?.message || `HTTP ${response.status}`);
      return { reply: "", error: "The assistant is temporarily unavailable. Please try again shortly." };
    }
    const reply = data.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text || "")
      .join("")
      .trim();
    return reply ? { reply } : { reply: "", error: "The assistant could not prepare a reply. Please try again." };
  } catch (error: unknown) {
    console.error("Gemini request failed:", error instanceof Error ? error.message : "Network error");
    return { reply: "", error: "The assistant is temporarily unavailable. Please try again shortly." };
  } finally {
    clearTimeout(timeout);
  }
}
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405,
    });
  }

  try {
    const payload = await req.json();
    const messages = payload?.messages;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 20) {
      return new Response(JSON.stringify({ error: 'Send between 1 and 20 chat messages.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }
    const validMessages = messages.every((msg: any) =>
      msg && (msg.role === 'user' || msg.role === 'assistant') &&
      typeof msg.content === 'string' && msg.content.trim().length > 0 && msg.content.length <= 4000
    );
    if (!validMessages) {
      return new Response(JSON.stringify({ error: 'Each message needs a user or assistant role and up to 4,000 characters.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'The assistant is not configured yet.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 });
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
      return new Response(JSON.stringify({ error: result.error }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502,
      });
    }

    return new Response(JSON.stringify({ reply: result.reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Library bot request failed:', error);
    return new Response(JSON.stringify({ error: 'Something went wrong. Please try again.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
