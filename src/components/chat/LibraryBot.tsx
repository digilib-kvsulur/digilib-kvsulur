import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, X, Send, Loader2, Bot, User, RefreshCw, Ticket, CheckCircle2, LifeBuoy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const DEFAULT_PROMPTS = [
  "🎫 Raise Support Ticket",
  "How to borrow a book",
  "Library timings",
  "Overdue fine amount",
  "Reading Wrap Capsule",
  "About Developer",
  "About KV Sulur",
];

export const LibraryBot = ({ suggestedPrompts }: { suggestedPrompts?: string[] }) => {
  const prompts = suggestedPrompts && suggestedPrompts.length > 0 ? suggestedPrompts : DEFAULT_PROMPTS;
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [botName, setBotName] = useState("LibraryBot");
  const [customBotMessages, setCustomBotMessages] = useState<any[] | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // In-Chat Support Ticket State
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketCategory, setTicketCategory] = useState("book_issue");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDesc, setTicketDesc] = useState("");
  const [ticketAdmission, setTicketAdmission] = useState("");
  const [submittingTicket, setSubmittingTicket] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle().then(res => {
          if (res.data) {
            setCurrentUser(res.data);
            if (res.data.admission_number) setTicketAdmission(res.data.admission_number);
          }
        });
      }
    });

    supabase.from("system_settings").select("key, value").in("key", ["library_bot_visible", "library_bot_name", "library_bot_messages"])
      .then(res => {
        let activeName = "LibraryBot";
        if (res.data) {
          const visibleRow = res.data.find(r => r.key === "library_bot_visible");
          if (visibleRow !== undefined) {
            const v = visibleRow.value;
            setIsVisible(v === "true" || v === true || v === "1" || v === 1);
          }
          const nameRow = res.data.find(r => r.key === "library_bot_name");
          if (nameRow?.value) {
            activeName = String(nameRow.value).trim();
            setBotName(activeName);
          }
          const msgRow = res.data.find(r => r.key === "library_bot_messages");
          if (msgRow?.value) {
            try {
              const val = typeof msgRow.value === "string" ? msgRow.value : JSON.stringify(msgRow.value);
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setCustomBotMessages(parsed);
              }
            } catch {}
          }
        }
        
        // Initialize messages with dynamic botName
        setMessages([
          { 
            role: 'assistant', 
            content: `Hi! 👋 I'm **${activeName}** — your KV Sulur library assistant.\n\nI can help you with borrowing rules (7-day student loan, 1-month teacher loan), timings, fines, NCERT books, or **create a support ticket** for the librarian!\n\nHow can I help you today?` 
          }
        ]);
      });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, showTicketForm]);

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDesc.trim()) return;
    setSubmittingTicket(true);
    try {
      const fullName = currentUser ? `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim() : "Student";
      const { data, error } = await supabase.from("support_tickets").insert({
        user_id: currentUser?.id || null,
        admission_number: ticketAdmission.trim() || currentUser?.admission_number || null,
        full_name: fullName || "Student",
        email: currentUser?.email || null,
        student_class: currentUser?.student_class || null,
        role: currentUser?.role || "student",
        category: ticketCategory,
        priority: "normal",
        subject: ticketSubject.trim().slice(0, 150),
        description: ticketDesc.trim().slice(0, 2000),
      }).select("id, ticket_number, status").single();

      if (error) throw error;

      setShowTicketForm(false);
      setTicketSubject("");
      setTicketDesc("");

      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: `🎉 **Support Ticket Created Successfully!**\n\n• **Ticket Number:** \`${data.ticket_number}\`\n• **Category:** ${ticketCategory.replace("_", " ").toUpperCase()}\n• **Subject:** ${ticketSubject}\n• **Status:** ${data.status || "Open"}\n\nThe librarian has received your ticket and will respond soon. You can also view it in your **Help & Support** tab.`
        }
      ]);
    } catch (err: any) {
      console.error("Ticket submission error:", err);
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: `❌ Could not create ticket: ${err.message || "Please check your network and try again."}`
        }
      ]);
    } finally {
      setSubmittingTicket(false);
    }
  };

  // Answers questions about the signed-in user's own library records
  const checkPersonalAnswer = async (text: string): Promise<string | null> => {
    const t = text.toLowerCase().trim();
    const isPersonal = /\b(my|mine|i have|do i)\b/.test(t);
    if (!isPersonal) return null;
    if (!currentUser?.id) {
      return "🔒 Please sign in to your library account and I can show your borrowed books, due dates, fines and XP instantly.";
    }

    try {
      // My books / due dates
      if (t.includes("book") || t.includes("due") || t.includes("borrow") || t.includes("issue") || t.includes("return")) {
        const { data } = await supabase
          .from("book_issues")
          .select("book_title, due_date, status, accession_number")
          .eq("user_id", currentUser.id)
          .eq("status", "issued")
          .order("due_date", { ascending: true });

        if (!data || data.length === 0) {
          return "📚 **Your borrowed books**\n\nYou have no books with you right now. Head to the **Catalog** and request a book — students may keep 1 book for 7 days.";
        }

        const today = new Date();
        const lines = data.map((b: any) => {
          const due = new Date(b.due_date);
          const days = Math.ceil((due.getTime() - today.getTime()) / 86400000);
          const when =
            days < 0 ? `**${Math.abs(days)} day(s) overdue** (fine ₹${Math.abs(days)})` :
            days === 0 ? "**due today**" :
            `due in **${days} day(s)**`;
          return `• ${b.book_title || "Library book"} — ${when} (${due.toLocaleDateString("en-IN")})`;
        });
        return `📚 **Your borrowed books (${data.length})**\n\n${lines.join("\n")}\n\nNeed more time? Open **My Requests** and tap *Request Renewal*.`;
      }

      // My fines
      if (t.includes("fine") || t.includes("due amount") || t.includes("pay") || t.includes("penalty")) {
        const { data } = await supabase
          .from("library_fines")
          .select("book_title, total_amount, status")
          .eq("user_id", currentUser.id)
          .neq("status", "paid");

        const total = (data || []).reduce((s: number, f: any) => s + Number(f.total_amount || 0), 0);
        if (!data || data.length === 0 || total === 0) {
          return "✅ **No pending fines**\n\nYour library account is clear. Keep returning books on time!";
        }
        const lines = data.map((f: any) => `• ${f.book_title || "Library book"} — ₹${Number(f.total_amount).toFixed(0)}`);
        return `💰 **Your pending fines: ₹${total.toFixed(0)}**\n\n${lines.join("\n")}\n\nPay at the library counter in cash or UPI to clear your account.`;
      }

      // My points / rank / level
      if (t.includes("point") || t.includes("xp") || t.includes("rank") || t.includes("level") || t.includes("score")) {
        const points = currentUser.points || 0;
        let rankLine = "";
        if (currentUser.student_class) {
          const { data: rank } = await supabase.rpc("get_user_class_rank", {
            user_class: currentUser.student_class,
            user_points: points,
          });
          if (rank) rankLine = `\n• Rank in ${currentUser.student_class}: **#${rank}**`;
        }
        return `🏆 **Your library score**\n\n• Total XP: **${points}**${rankLine}\n\nEarn more by returning books on time, daily logins, quizzes, reviews and the Games Corner.`;
      }

      // My requests
      if (t.includes("request") || t.includes("status") || t.includes("approve")) {
        const { data } = await supabase
          .from("book_requests")
          .select("requested_title, status, created_at")
          .eq("user_id", currentUser.id)
          .order("created_at", { ascending: false })
          .limit(5);

        if (!data || data.length === 0) {
          return "📄 **Your requests**\n\nYou have not made any book requests yet. Find a book in the **Catalog** and tap *Request*.";
        }
        const lines = data.map((r: any) => `• ${r.requested_title || "Book request"} — **${r.status}**`);
        return `📄 **Your latest requests**\n\n${lines.join("\n")}`;
      }
    } catch (err) {
      console.warn("Personal answer lookup failed", err);
      return null;
    }

    return null;
  };

  const sendMessage = async (overrideText?: string | React.MouseEvent) => {
    const textToSend = typeof overrideText === 'string' ? overrideText : input;
    if (!textToSend.trim()) return;

    const userMessage: Message = { role: 'user', content: textToSend };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    if (!overrideText) setInput("");
    setLoading(true);

    // ─────────────────────────────────────────────────────────────
    // Predefined local answers — no AI tokens consumed for these
    // ─────────────────────────────────────────────────────────────
    const checkPredefinedAnswer = (text: string): string | null => {
      const t = text.toLowerCase().trim();

      // Check dynamic admin-configured messages first
      if (customBotMessages && customBotMessages.length > 0) {
        for (const msg of customBotMessages) {
          if (Array.isArray(msg.keywords) && msg.response) {
            if (msg.keywords.some((kw: string) => kw && t.includes(String(kw).toLowerCase().trim()))) {
              return msg.response;
            }
          }
        }
      }

      // Greetings
      if (/^(hi|hello|hey|good morning|good afternoon|good evening|namaste|greetings|sup|howdy)$/.test(t) || t === "hi there" || t === "hello there") {
        return "Hello! 👋 I am LibraryBot — your official AI assistant for PM SHRI KV AFS Sulur Digital Library.\n\nI can help you with:\n• 💻 Developer info (G V Tanish Vettrivel: 9865190190 / @gvtanish)\n• 🏫 PM SHRI KV AFS Sulur official facts\n• 📖 Reading Wrap (Monthly Memory Capsule)\n• 📚 Book borrowing, returns & renewals\n• 👑 Rotational Badges & physical claim slips\n• 🏷️ Community tagging (@friends & @everyone)\n• 💰 Overdue fines & lost book policies\n• 🏆 Gamified XP, quiz & study materials\n\nWhat would you like to know?";
      }

      // Developer Information (G V Tanish Vettrivel)
      if (t.includes("developer") || t.includes("who developed") || t.includes("who made") || t.includes("who built") || t.includes("who created") || t.includes("tanish") || t.includes("vettrivel") || t.includes("about developer") || t.includes("creator") || t.includes("programmer") || t.includes("who designed") || t.includes("developer contact") || t.includes("developer phone") || t.includes("developer number")) {
        return "👨‍💻 **DLMS Developer: G V Tanish Vettrivel**\n\nThe PM SHRI KV AFS Sulur Digital Library Management System (DLMS) was architected and developed by **G V Tanish Vettrivel**, an innovative student programmer and ISRO Yuvika participant from PM SHRI Kendriya Vidyalaya AFS Sulur (Class 11).\n\n🚀 **Key Achievements:**\n• **Software Innovation:** Developed India's first student-centric Kendriya Vidyalaya DLMS featuring one-click book issues, automated barcode stickers, Reading Wrap capsules, gamified XP, and integrated NCERT/CBSE digital resources (launched July 2026).\n• **ISRO Yuvika:** Selected for ISRO's prestigious Young Scientist Programme (YUVIKA 2025) at the Vikram Sarabhai Space Centre (VSSC) in Thiruvananthapuram — chosen as 1 of only 10 students across all of Tamil Nadu.\n• **IIT Kharagpur:** Selected for a 6-week program for IIT Kharagpur's i-Kites / RISE event.\n\n📞 **Developer Contact Details:**\n• **Phone / WhatsApp:** **+91 9865190190**\n• **Social Media Handles:** **@gvtanish** (Instagram, GitHub, LinkedIn)\n• **School Channels:** `@pmshrikvsulur` · `@kvian_rocks`";
      }

      // PM SHRI KV AFS Sulur School Information (analyzed from sulur.kvs.ac.in)
      if (t.includes("kv sulur") || t.includes("about kv sulur") || t.includes("sulur.kvs.ac.in") || t.includes("school code") || t.includes("affiliation") || t.includes("about school") || t.includes("kendriya vidyalaya sulur") || t.includes("afs sulur") || t.includes("school info") || t.includes("principal") || t.includes("udise") || t.includes("board result") || t.includes("topper")) {
        return "🏫 **PM SHRI Kendriya Vidyalaya AFS Sulur**\n*(पीएम श्री केन्द्रीय विद्यालय वायुसेना अवस्थान सुलूर)*\n\n• **Location:** Air Force Station Sulur, Kangayampalayam, Coimbatore, Tamil Nadu - 641401\n• **Affiliation Codes:** KV Code: **1787** | CBSE Affiliation: **1900016** | School Code: **59022** | UDISE: **33122100403**\n• **Academic Excellence:** 100% pass rate in Class 10 Board Exams & 98.55% in Class 12.\n• **Senior Secondary Streams:** Computer Science, Biology, and Commerce.\n• **Key Features:** NEP 2020 PM SHRI exemplar school, NIPUN Lakshya, Digital Language Lab, ICT E-Classrooms, BaLA (Building as Learning Aid), NCC & Scouts, and our student-built DLMS digital library!\n• **Official Website:** [sulur.kvs.ac.in](https://sulur.kvs.ac.in)";
      }

      // Reading Wrap / Memory Capsule
      if (t.includes("reading wrap") || t.includes("wrap") || t.includes("memory capsule") || t.includes("capsule") || t.includes("monthly wrap") || t.includes("reading stats")) {
        return "📖 **Reading Wrap (Memory Capsule)**\n\nThe Reading Wrap is your personalized monthly reading celebration!\n\n✨ **What it shows:**\n• 📚 Total books read & chapters completed this cycle\n• 🎯 Reading streak and consistency score\n• 🧠 Quiz scores and knowledge XP gained\n• 🏷️ Your top favorite reading genres\n\n📍 **How to open:** Go to your **Student Dashboard** and tap the **'Monthly Reading Wrap'** banner at the top!";
      }

      // Community Tagging & Mentions
      if (t.includes("tag") || t.includes("@everyone") || t.includes("mention") || t.includes("how to tag") || t.includes("tag friends")) {
        return "🏷️ **How to Tag Friends in Community**\n\n1. Go to the **Community** tab and click **'New Post'**.\n2. In the post composer, click the **'@ Tag'** button.\n3. **Students:** Search and pick from your confirmed friends.\n4. **Admins / Moderators:** Can tag any student or select **'@everyone'** for a school-wide broadcast alert.\n5. When you post, tagged students receive instant in-app sound & push notifications!";
      }

      // Rotational Badges
      if (t.includes("rotational") || t.includes("best library user") || t.includes("reader of the month") || t.includes("badge holder") || t.includes("winner badge") || t.includes("award slip") || t.includes("claim pass")) {
        return "👑 **Rotational Badges Program**\n\nThe library awards prestigious physical & digital rotational badges every period:\n• **👑 Best Library User:** Top student in each class based on XP, books read, and active library engagement.\n• **📚 Reader of the Month:** School-wide overall champion of reading.\n\n✨ **Perks & Collection:**\n1. A custom small golden crown badge (`👑` / `📚`) is displayed beside your name across Community feeds and your profile!\n2. Open the winning popup or **Badge Cabinet** to print your official **Physical Badge Collection Slip**.\n3. Bring the slip to the library counter on the collection date to receive your physical medal/badge!";
      }

      // Student Barcode / Digital ID
      if (t.includes("barcode") || t.includes("library card") || t.includes("student id") || t.includes("scan id") || t.includes("my barcode")) {
        return "💳 **Student Library Barcode**\n\nEvery student has a unique library barcode:\n1. Open your **Student Dashboard** or **Student Portfolio**.\n2. View your digital student barcode card.\n3. Show this barcode on your phone (or carry a printout) to the librarian at the counter for 1-second instant checkout!";
      }

      // Book Clubs
      if (t.includes("book club") || t.includes("clubs") || t.includes("reading club") || t.includes("join club")) {
        return "👥 **Book Clubs Feature**\n\n1. Go to the **Community** tab -> **Book Clubs** sub-tab.\n2. Browse existing clubs (e.g., Sci-Fi, Mystery, Classics, CBSE Study Groups).\n3. Join any club to participate in dedicated group discussions and book sharing.\n4. You can also create your own student club and invite friends!";
      }

      // Timings / Hours
      if (t.includes("timing") || t.includes("opening hour") || t.includes("opening time") || t.includes("what time") || t.includes("when open") || t.includes("library hour") || t.includes("library time") || t.includes("open today") || t.includes("closed")) {
        return "🕐 **Library Timings**\n\nThe PM SHRI KV AFS Sulur Library is open:\n• **Monday – Friday:** 8:30 AM – 3:30 PM\n• **Saturday:** 8:30 AM – 12:00 PM (half-day)\n• **Sundays & Public Holidays:** Closed\n\nPlease note: The library may close early on exam and event days.";
      }

      // Rules & Regulations
      if ((t.includes("rule") || t.includes("regulation") || t.includes("policy") || t.includes("guideline")) && !t.includes("borrow") && !t.includes("fine")) {
        return "📋 **Library Rules & Regulations**\n\n1. Maintain silence inside the library at all times.\n2. Food and drinks are strictly not allowed.\n3. Handle books with care — do not fold pages or write in books.\n4. Return books on or before the due date.\n5. A maximum of 2 books can be issued at a time per student.\n6. Students must carry their ID card when borrowing books.\n7. Damaged or lost books must be reported immediately.\n8. Mobiles must be kept on silent mode inside the library.";
      }

      // Borrow / Issue a book
      if (t.includes("how to borrow") || t.includes("how to issue") || t.includes("how do i borrow") || t.includes("how do i issue") || t.includes("issue book") || t.includes("borrow book") || t.includes("get a book") || t.includes("take a book") || t.includes("checkout") || t.includes("borrowing rule")) {
        return "📚 **Borrowing & Circulation Rules**\n\n• **👨‍🎓 Students:**\n  - Loan Limit: **1 Book at a time**\n  - Loan Duration: **7 Days**\n\n• **👩‍🏫 Teachers & Staff:**\n  - Loan Limit: **Up to 5 Books**\n  - Loan Duration: **30 Days (1 Month)**\n\n**Fast Counter Issue:** Visit the library circulation counter with your Student ID barcode for instant 2-second scan & issue!";
      }

      // Return a book
      if (t.includes("how to return") || t.includes("return book") || t.includes("return a book") || t.includes("give back") || t.includes("submit book")) {
        return "🔄 **How to Return a Book**\n\n1. Visit the library counter before or on the **due date**.\n2. Hand the book to the librarian.\n3. The librarian will scan your ID and mark the return.\n4. You will receive a confirmation in your **My Requests** tab.\n\n⚠️ Late returns are charged **₹1 per day** after the due date.";
      }

      // Renew a book
      if (t.includes("renew") || t.includes("extend") || t.includes("re-issue") || t.includes("reissue")) {
        return "🔁 **How to Renew a Book**\n\n1. Go to **My Requests** tab in your dashboard.\n2. Find your active issue and click **'Request Renewal'**.\n3. The librarian will approve or deny the renewal.\n4. Renewals extend the due date by **7 more days**.\n\n⚠️ A book can only be renewed **once**. It cannot be renewed if another student has requested it.";
      }

      // Fines & overdue
      if (t.includes("fine") || t.includes("overdue") || t.includes("late fee") || t.includes("penalty") || t.includes("late return") || t.includes("penalty")) {
        return "💰 **Overdue Fines**\n\n• Fine rate: **₹1 per day** after the due date.\n• Fines can be paid at the library counter (cash or UPI).\n• Unpaid fines must be cleared before issuing new books.\n• Fines can be viewed in the **My Requests** tab.\n\n📊 Example: If a book is 10 days overdue → Fine = ₹10.";
      }

      // How to pay fine
      if (t.includes("pay fine") || t.includes("how to pay") || t.includes("upi") || t.includes("payment") || t.includes("pay dues")) {
        return "💳 **How to Pay a Fine**\n\n1. Check your fine amount in **My Requests** tab.\n2. Visit the library counter to pay in **cash** or via **UPI**.\n3. Ask the librarian for the UPI QR code if paying digitally.\n4. Your fine will be cleared and recorded after payment.\n\n🧾 Always request a receipt/confirmation after payment.";
      }

      // Lost book
      if (t.includes("lost book") || t.includes("lost the book") || t.includes("book is lost") || t.includes("cannot find") || t.includes("i lost") || t.includes("missing book")) {
        return "😟 **Lost Book Procedure**\n\n1. Report the lost book immediately to the librarian.\n2. You will need to **pay the cost of the book** (as per the book's current price).\n3. Go to **Help & Support** tab to submit a Lost Book ticket.\n4. The librarian will process the report and update the records.\n\n⚠️ Delay in reporting increases the penalty. Report as soon as possible!";
      }

      // Catalog / Search books
      if (t.includes("catalog") || t.includes("search book") || t.includes("find book") || t.includes("look up") || t.includes("search for a book") || t.includes("available book")) {
        return "🔍 **How to Search for Books**\n\n1. Click on **Catalog** in the navigation menu.\n2. Use the search bar to search by **Title**, **Author**, or **Subject**.\n3. Use filters to narrow by class, genre, or availability.\n4. Click on a book to view details and request it.\n\n📖 The catalog shows real-time availability — if it shows 0 copies, the book is currently issued.";
      }

      // Book reservation / hold
      if (t.includes("reserve") || t.includes("hold") || t.includes("waitlist") || t.includes("not available") || t.includes("book reserved")) {
        return "⏳ **Book Reservation**\n\nIf a book shows 0 available copies:\n1. Click **'Request'** on the book — your request will be queued.\n2. The librarian will notify you when the book is available.\n3. You can track your request status in **My Requests** tab.";
      }

      // Points & Rewards
      if (t.includes("point") || t.includes("reward") || t.includes("score") || t.includes("badge") || t.includes("level") || t.includes("rank") || t.includes("xp") || t.includes("leaderboard")) {
        return "🏆 **Points & Rewards System**\n\nYou earn points for:\n• ✅ Borrowing and returning books on time → **+10 pts**\n• 📝 Completing quizzes → **+5 pts each**\n• 🔥 Daily login streak → **+2–10 pts**\n• ⭐ Writing book reviews → **+3 pts**\n• 📅 Attending events → **+5 pts**\n\nPoints appear on the **Rankings** tab. Top students earn special badges and certificates!";
      }

      // Password reset
      if (t.includes("forgot password") || t.includes("reset password") || t.includes("change password") || t.includes("password") || t.includes("can't login") || t.includes("cannot login") || t.includes("login problem")) {
        return "🔑 **Password Help**\n\n**Forgot your password?**\n1. Click **'Forgot Password'** on the login screen.\n2. Enter your registered email.\n3. Check your email for a reset link.\n4. Click the link and set a new password.\n\n**Still having trouble?**\nContact the librarian or submit a ticket in **Help & Support**.";
      }

      // Account / Registration
      if (t.includes("register") || t.includes("sign up") || t.includes("create account") || t.includes("new account") || t.includes("admission number") || t.includes("how to join")) {
        return "📝 **How to Register**\n\n1. Click **'Register'** on the home page.\n2. Fill in your name, email, class, and admission number.\n3. Set a password and submit.\n4. Wait for the librarian/admin to **approve your account**.\n5. Once approved, you will receive an email confirmation.\n\n📌 Use your school email address for registration.";
      }

      // Study materials / NCERT
      if (t.includes("study material") || t.includes("ncert") || t.includes("cbse") || t.includes("chapter") || t.includes("notes") || t.includes("pdf") || t.includes("study guide")) {
        return "📚 **Study Materials**\n\nDigital study materials are available in the **Study Hub** tab:\n• NCERT chapter PDFs (Class 6–12)\n• CBSE curriculum resources\n• AI-generated chapter summaries\n• Subject-wise key concept notes\n\nGo to your dashboard → **Study Hub** tab to access them.";
      }

      // Quiz
      if (t.includes("quiz") || t.includes("test") || t.includes("mcq") || t.includes("question")) {
        return "📝 **Library Quizzes**\n\n1. Go to a book in the **Catalog** and open its detail page.\n2. Click **'Generate Quiz'** to create an AI quiz on that book.\n3. Answer the MCQs to earn points!\n\nYou can also find quizzes in the **Study Hub** for your NCERT chapters.";
      }

      // Book recommendation
      if (t.includes("recommend") || t.includes("suggestion") || t.includes("suggest") || t.includes("good book") || t.includes("which book") || t.includes("what should i read") || t.includes("best book")) {
        return "📖 **Book Recommendations**\n\nHere are some great reads by level:\n\n**Class 6–8:** Ruskin Bond stories, Diary of a Wimpy Kid, Famous Five series\n**Class 9–10:** To Kill a Mockingbird, Wings of Fire (A.P.J. Abdul Kalam), Animal Farm\n**Class 11–12:** The Alchemist, Rich Dad Poor Dad, 1984 by George Orwell\n\nFor personalized recommendations, ask me: *'Suggest a science fiction book'* or *'Best book for Class 8'* — I'll use AI to help you!";
      }

      // Community / social
      if ((t.includes("community") || t.includes("post") || t.includes("friend") || t.includes("feed")) && !t.includes("community_blocked")) {
        return "👥 **Community Features**\n\nThe **Community** tab lets you:\n• Post updates, share links, and run polls\n• Connect with friends and classmates\n• Join or create **Book Clubs**\n• Vote on book suggestions in the **Suggestions Survey**\n\nGo to your dashboard → **Community** tab to explore!";
      }

      // Events
      if (t.includes("event") || t.includes("activity") || t.includes("competition") || t.includes("programme") || t.includes("program")) {
        return "📅 **Library Events**\n\nCheck the **Events** section in your dashboard for:\n• Upcoming reading competitions\n• Book fairs and author visits\n• Quiz competitions\n• Reading week activities\n\nAttending events earns you extra points!";
      }

      // Library map / location
      if (t.includes("map") || t.includes("locate") || t.includes("where is") || t.includes("floor") || t.includes("section") || t.includes("shelf") || t.includes("location")) {
        return "🗺️ **Library Map**\n\nThe PM SHRI KV AFS Sulur Library is located inside the school campus.\n\nLibrary sections:\n• 📗 Fiction & Novels — Left wing\n• 🔬 Science & Math — Center shelves\n• 📜 History & Geography — Right wing\n• 📚 NCERT & Textbooks — Reference section\n• 📰 Periodicals & Magazines — Reading lounge\n\nOpen the **Library Map** tab in your dashboard for the interactive map!";
      }

      // Contact / Support / Tickets
      if (t.includes("ticket") || t.includes("raise ticket") || t.includes("create ticket") || t.includes("support") || t.includes("complaint") || t.includes("help request") || t.includes("issue") || t.includes("problem")) {
        setShowTicketForm(true);
        return "🎫 I have opened the **Support Ticket Form** above! Please fill in your subject and details, and hit **Submit Ticket**. The librarian will review it promptly.";
      }

      // Thank you / bye
      if (t === "thank you" || t === "thanks" || t === "thank u" || t === "thx" || t === "bye" || t === "goodbye" || t.includes("that's all") || t.includes("that is all")) {
        return "You're welcome! 😊 Feel free to ask me anything else. Happy reading! 📚";
      }

      return null;
    };

    const localAnswer = checkPredefinedAnswer(textToSend);
    if (localAnswer) {
      setTimeout(() => {
        setMessages([...newMessages, { role: 'assistant', content: localAnswer }]);
        setLoading(false);
      }, 300);
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // Personalised live answers from the student's own records
    // ─────────────────────────────────────────────────────────────
    const personalAnswer = await checkPersonalAnswer(textToSend);
    if (personalAnswer) {
      setMessages([...newMessages, { role: 'assistant', content: personalAnswer }]);
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/library-bot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ messages: newMessages })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${res.status}`);
      }
      
      const data = await res.json();
      setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
    } catch (e: any) {
      console.warn("AI Chatbot fallback invoked:", e);
      setMessages([...newMessages, {
        role: 'assistant',
        content: `I am currently operating in **Fast Rule-Based Mode** to save tokens! ⚡\n\nQuick Information:\n• 📚 **Borrowing Rules:** 7-day loan for students (max 1 book), 30-day loan for teachers.\n• 🕐 **Timings:** Mon–Fri 8:30 AM – 3:30 PM, Sat 8:30 AM – 12:00 PM.\n• 💰 **Fines:** ₹1 per day overdue penalty.\n• 👨‍💻 **Developer:** G V Tanish Vettrivel (+91 9865190190)\n\nHave a specific question or issue? Click **🎫 Raise Support Ticket** to connect directly with the librarian!`
      }]);
    } finally {
      setLoading(false);
    }
  };


  const renderFormattedMessage = (content: string) => {
    if (!content) return null;
    const lines = content.split('\n');
    return lines.map((line, lineIdx) => {
      const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('* ');
      const isNumbered = /^\d+\.\s/.test(line.trim());
      
      const parseBold = (text: string) => {
        const parts = text.split(/\*\*([^*]+)\*\*/g);
        return parts.map((part, partIdx) => {
          if (partIdx % 2 === 1) {
            return <strong key={partIdx} className="font-extrabold text-foreground dark:text-white">{part}</strong>;
          }
          return part;
        });
      };

      return (
        <div key={lineIdx} className={`${isBullet || isNumbered ? 'pl-2 my-0.5' : 'my-0.5'} min-h-[1.1rem] break-words`}>
          {isBullet ? (
            <span className="flex items-start gap-1">
              <span className="text-primary font-bold">•</span>
              <span>{parseBold(line.trim().replace(/^[•\-\*]\s*/, ''))}</span>
            </span>
          ) : isNumbered ? (
            <span className="flex items-start gap-1">
              <span className="font-bold text-primary">{line.trim().match(/^\d+\./)?.[0]}</span>
              <span>{parseBold(line.trim().replace(/^\d+\.\s*/, ''))}</span>
            </span>
          ) : (
            parseBold(line)
          )}
        </div>
      );
    });
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-3.5 md:right-6 z-40">
      {isOpen ? (
        <div className="bg-background border shadow-2xl rounded-2xl w-[350px] max-w-[calc(100vw-2rem)] h-[450px] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-primary/10 p-4 border-b flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="bg-primary text-primary-foreground p-2 rounded-full">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{botName}</h3>
                <p className="text-xs text-muted-foreground">AI Assistant</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8 rounded-full hover:bg-background/80">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-auto">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div className="flex flex-col gap-1.5 max-w-[80%]">
                  <div className={`px-4 py-2 rounded-2xl text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'}`}>
                    {renderFormattedMessage(m.content)}
                  </div>
                  {m.role === 'assistant' && i === messages.length - 1 && (m.content.includes("trouble") || m.content.includes("failed")) && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        const lastUserMsg = [...messages].reverse().find(msg => msg.role === 'user');
                        if (lastUserMsg) {
                          setMessages(prev => prev.slice(0, -1));
                          sendMessage(lastUserMsg.content);
                        }
                      }} 
                      className="text-[10px] self-start gap-1 py-1 px-2.5 h-auto rounded-full bg-background border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <RefreshCw className="h-3 w-3" /> Retry Connection
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-auto">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="px-4 py-2 rounded-2xl bg-muted rounded-bl-sm text-sm flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> Thinking...
                </div>
              </div>
            )}
            {/* Interactive In-Chat Ticket Creation Form */}
            {showTicketForm && (
              <div className="p-3.5 bg-card border border-primary/25 rounded-2xl shadow-md space-y-3 animate-in fade-in slide-in-from-bottom-2 text-xs">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <LifeBuoy className="h-4 w-4 text-primary" />
                    <span>Create Support Ticket</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 rounded-full text-muted-foreground"
                    onClick={() => setShowTicketForm(false)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <form onSubmit={handleTicketSubmit} className="space-y-2.5">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase">Category</label>
                    <select
                      value={ticketCategory}
                      onChange={(e) => setTicketCategory(e.target.value)}
                      className="w-full text-xs h-8 px-2 rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary outline-hidden"
                    >
                      <option value="book_issue">Book Issue / Return Problem</option>
                      <option value="fine_inquiry">Overdue Fine Query</option>
                      <option value="account_login">Account / Password Issue</option>
                      <option value="quiz_points">Quiz & Points Discrepancy</option>
                      <option value="study_materials">NCERT / Study Material Request</option>
                      <option value="other">Other Library Question</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase">Admission No. (Optional)</label>
                    <Input
                      placeholder="e.g. 13412"
                      value={ticketAdmission}
                      onChange={(e) => setTicketAdmission(e.target.value)}
                      className="h-8 text-xs font-mono rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase">Subject</label>
                    <Input
                      placeholder="Brief summary of the issue..."
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      className="h-8 text-xs rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase">Description</label>
                    <textarea
                      placeholder="Describe what happened or what you need help with..."
                      value={ticketDesc}
                      onChange={(e) => setTicketDesc(e.target.value)}
                      className="w-full text-xs min-h-[55px] p-2 rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary outline-hidden resize-none"
                      required
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTicketForm(false)}
                      className="h-8 text-xs flex-1 rounded-lg"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={submittingTicket || !ticketSubject.trim() || !ticketDesc.trim()}
                      className="h-8 text-xs flex-1 rounded-lg bg-primary text-primary-foreground font-semibold"
                    >
                      {submittingTicket ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Ticket className="h-3 w-3 mr-1" />}
                      Submit Ticket
                    </Button>
                  </div>
                </form>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-muted/30 border-t flex flex-col gap-2">
            {prompts.length > 0 && messages.length < 3 && (
              <div className="flex flex-wrap gap-1.5 mb-1">
                {prompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(p)}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors bg-background"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
            <Input 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Ask me anything..." 
              className="bg-background rounded-full border-muted-foreground/20 focus-visible:ring-primary/30"
            />
            <Button size="icon" onClick={sendMessage} disabled={!input.trim() || loading} className="rounded-full shrink-0">
              <Send className="h-4 w-4" />
            </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button 
          onClick={() => setIsOpen(true)}
          className="h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-2xl bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105 active:scale-95 transition-transform animate-in zoom-in border border-primary-foreground/20 p-0 flex items-center justify-center"
        >
          <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />
        </Button>
      )}
    </div>
  );
};
