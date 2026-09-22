import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageSquare,
  X,
  Send,
  Loader2,
  Bot,
  User,
  RefreshCw,
  Ticket,
  CheckCircle2,
  LifeBuoy,
  UserCog,
  MessageSquarePlus,
  Crown,
  Award,
  Zap,
  BookOpen,
  Clock,
  HelpCircle,
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { InChatTicketWidget } from "./InChatTicketWidget";
import { InChatProfileEditor } from "./InChatProfileEditor";
import { InChatFeedbackWidget } from "./InChatFeedbackWidget";
import { InChatBadgeCard } from "./InChatBadgeCard";
import { InChatCertificateCard } from "./InChatCertificateCard";
import { InChatLevelCard } from "./InChatLevelCard";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type ActiveWidgetType = 'none' | 'ticket' | 'profile' | 'feedback' | 'badges' | 'certificates' | 'level';

const DEFAULT_PROMPTS = [
  "🎫 Raise Support Ticket",
  "✏️ Quick Profile Edit",
  "💬 Give Feedback",
  "👑 Check Badges",
  "📜 My Certificates",
  "⚡ Level & XP Info",
  "📚 My books & due dates",
  "💰 Overdue fine amount",
  "🕐 Library timings",
  "📖 Reading Wrap Capsule",
  "About Developer",
  "About KV Sulur",
];

export const LibraryBot = ({ suggestedPrompts }: { suggestedPrompts?: string[] }) => {
  const prompts = suggestedPrompts && suggestedPrompts.length > 0 ? suggestedPrompts : DEFAULT_PROMPTS;
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [botName, setBotName] = useState("Avenyx");
  const [customBotMessages, setCustomBotMessages] = useState<any[] | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Active Interactive Card Widget State
  const [activeWidget, setActiveWidget] = useState<ActiveWidgetType>('none');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadUserProfile = async () => {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        const res = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
        if (res.data) {
          setCurrentUser(res.data);
        }
      }
    } catch (e) {
      console.warn("Could not load user profile for bot:", e);
    }
  };

  useEffect(() => {
    loadUserProfile();

    supabase.from("system_settings").select("key, value").in("key", ["library_bot_visible", "library_bot_name", "library_bot_messages"])
      .then(res => {
        let activeName = "Avenyx";
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
            content: `Hello! 👋 I am **${activeName}** — your official AI assistant for PM SHRI KV AFS Sulur Digital Library.\n\nI can help you with:\n• 🎫 **Raise & Track Support Tickets**\n• ✏️ **Edit Profile Details** (bio, phone, roll no, class)\n• 💬 **Submit Library Feedback & Ratings**\n• 👑 **Check Rotational & Earned Badges**\n• 📜 **View Issued Certificates**\n• ⚡ **Check XP, Level & Class Rank**\n• 📚 **Borrowing Rules, Timings & Fines**\n\nHow can I help you today? Tap any prompt below or type your question!` 
          }
        ]);
      });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeWidget]);

  // Widget Event Handlers
  const handleTicketCreated = (ticketInfo: { ticket_number: string; subject: string; category: string; status: string }) => {
    setActiveWidget('none');
    setMessages(prev => [
      ...prev,
      {
        role: "assistant",
        content: `🎉 **Support Ticket Created Successfully!**\n\n• **Ticket Number:** \`${ticketInfo.ticket_number}\`\n• **Category:** ${ticketInfo.category.replace("_", " ").toUpperCase()}\n• **Subject:** ${ticketInfo.subject}\n• **Status:** ${ticketInfo.status || "Open"}\n\nThe librarian has received your ticket and will respond soon. You can ask me to *'track ticket'* anytime!`
      }
    ]);
  };

  const handleProfileUpdated = (updatedUser: any) => {
    setCurrentUser(updatedUser);
    setActiveWidget('none');
    setMessages(prev => [
      ...prev,
      {
        role: "assistant",
        content: `✨ **Profile Updated Successfully!**\n\n• **Class:** ${updatedUser.student_class || "—"}\n• **Roll Number:** ${updatedUser.roll_number || "—"}\n• **Phone:** ${updatedUser.phone || "—"}\n• **Username:** @${updatedUser.username || "—"}\n• **Bio:** ${updatedUser.bio || "None"}\n\nYour public profile and library cards have been synced.`
      }
    ]);
  };

  const handleFeedbackSubmitted = (fbInfo: { rating: number; category: string; subject: string }) => {
    setActiveWidget('none');
    const stars = "⭐".repeat(fbInfo.rating);
    setMessages(prev => [
      ...prev,
      {
        role: "assistant",
        content: `💌 **Feedback Submitted!**\n\n• **Rating:** ${stars} (${fbInfo.rating}/5)\n• **Category:** ${fbInfo.category.toUpperCase()}\n• **Topic:** ${fbInfo.subject}\n\nThank you for helping us improve PM SHRI KV Sulur Digital Library! 🌟`
      }
    ]);
  };

  // Answers questions about the signed-in user's own library records & triggers widgets
  const checkPersonalAnswer = async (text: string): Promise<string | null> => {
    const t = text.toLowerCase().trim();

    // 1. Support Ticket Intent
    if (
      t.includes("ticket") || t.includes("raise ticket") || t.includes("create ticket") ||
      t.includes("support ticket") || t.includes("complaint") || t.includes("help request") ||
      t.includes("track ticket") || t.includes("ticket status") ||
      /\b(i have an? (?:issue|problem) with (?:the library|my account|my fine|my book|the app|the system|dlms))\b/.test(t) ||
      /\b(report (?:an? )?(?:issue|problem|bug)|contact (?:the )?librarian|contact support)\b/.test(t)
    ) {
      setActiveWidget('ticket');
      return "🎫 I have opened the **Support Desk** above! You can submit a new ticket or track an existing ticket's status.";
    }

    // 2. Profile Edit Intent
    if (
      t.includes("edit profile") || t.includes("update profile") || t.includes("change profile") ||
      t.includes("change bio") || t.includes("update bio") || t.includes("edit bio") ||
      t.includes("change phone") || t.includes("update phone") || t.includes("change roll") ||
      t.includes("update roll") || t.includes("change class") || t.includes("update class") ||
      t.includes("change username") || t.includes("profile edit") || t.includes("quick profile edit")
    ) {
      if (!currentUser?.id) {
        return "🔒 Please sign in to your library account to edit your bio, phone number, class, or username.";
      }
      setActiveWidget('profile');
      return "✏️ I have opened the **Quick Profile Editor** above! You can update your bio, class, roll number, phone, and username right here.";
    }

    // 3. Feedback Intent
    if (
      t.includes("feedback") || t.includes("give feedback") || t.includes("submit feedback") ||
      t.includes("rate library") || t.includes("rate the library") || t.includes("suggestion") ||
      t.includes("give rating") || t.includes("leave a review") || t.includes("compliment") ||
      t.includes("report a bug") || t.includes("app feedback")
    ) {
      setActiveWidget('feedback');
      return "💬 I have opened the **Feedback & Rating Form** above! Please share your rating (1–5 stars) and thoughts to help us improve.";
    }

    // 4. Badge Check Intent
    if (
      t.includes("badge") || t.includes("my badge") || t.includes("check badge") ||
      t.includes("rotational badge") || t.includes("best library user") || t.includes("reader of the month") ||
      t.includes("badge status") || t.includes("my achievements") || t.includes("award slip") ||
      t.includes("check my badge") || t.includes("badge check")
    ) {
      setActiveWidget('badges');
      return "👑 I have loaded your **Badge & Recognition Hub** above! Check out your rotational awards, verified cycle details, collection slips, and unlocked badges.";
    }

    // 5. Certificate Info Intent
    if (
      t.includes("certificate") || t.includes("my certificate") || t.includes("issued certificate") ||
      t.includes("certificate info") || t.includes("download certificate") || t.includes("cert info") ||
      t.includes("reading certificate") || t.includes("quiz certificate")
    ) {
      setActiveWidget('certificates');
      return "📜 I have opened your **Issued Certificates Hub** above! View all your official KV Sulur reading and event certificates.";
    }

    // 6. Level & XP Info Intent
    if (
      t.includes("level info") || t.includes("level & xp") || t.includes("my level") ||
      t.includes("what level") || t.includes("level progress") || t.includes("next level") ||
      t.includes("xp info") || t.includes("my rank") || t.includes("my xp") ||
      t.includes("how many points") || t.includes("how much xp") || t.includes("rank in class") ||
      /\b(my points?|my score|what(?:'s| is) my (?:rank|score|level|xp|points?))\b/.test(t)
    ) {
      setActiveWidget('level');
      return "⚡ I have loaded your live **Level & XP Progression Card** above! Check your current Level, XP target, and class leaderboard ranking.";
    }

    const isPersonal = /\b(my|mine|i have|do i)\b/.test(t);
    if (!isPersonal) return null;
    if (!currentUser?.id) {
      return "🔒 Please sign in to your library account and I can show your borrowed books, due dates, fines, and XP records instantly.";
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

      // My requests
      if (/\b(my requests?|my book request|request status|approve my|my pending)\b/.test(t)) {
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
        return `Hello! 👋 I am **${botName}** — your official AI assistant for PM SHRI KV AFS Sulur Digital Library.\n\nI can help you with:\n• 🎫 Support Tickets & Issues\n• ✏️ Quick Profile Edits (bio, phone, class)\n• 💬 Feedback & Star Ratings\n• 👑 Rotational & Earned Badges\n• 📜 Official Certificates\n• ⚡ Level, XP & Class Rankings\n• 📚 Book Borrowing & Rules\n• 💻 Developer & School Info\n\nWhat would you like to do?`;
      }

      // Developer Information (G V Tanish Vettrivel)
      if (
        /\b(who (?:developed|made|built|created|designed) (?:dlms|this app|this system|this library system|the dlms))\b/.test(t) ||
        t.includes("developer contact") || t.includes("developer phone") || t.includes("developer number") ||
        t.includes("about developer") || t.includes("tanish") || t.includes("vettrivel") ||
        t.includes("gvtanish") || t.includes("9865190190") ||
        /\bdeveloper\b/.test(t)
      ) {
        return "👨‍💻 **DLMS Developer: G V Tanish Vettrivel**\n\nThe PM SHRI KV AFS Sulur Digital Library Management System (DLMS) was architected and developed by **G V Tanish Vettrivel**, an innovative student programmer and ISRO Yuvika participant from PM SHRI Kendriya Vidyalaya AFS Sulur (Class 11).\n\n🚀 **Key Achievements:**\n• **Software Innovation:** Developed India's first student-centric Kendriya Vidyalaya DLMS featuring one-click book issues, automated barcode stickers, Reading Wrap capsules, gamified XP, and integrated NCERT/CBSE digital resources (launched July 2026).\n• **ISRO Yuvika:** Selected for ISRO's prestigious Young Scientist Programme (YUVIKA 2025) at the Vikram Sarabhai Space Centre (VSSC) in Thiruvananthapuram — chosen as 1 of only 10 students across all of Tamil Nadu.\n• **IIT Kharagpur:** Selected for a 6-week program for IIT Kharagpur's i-Kites / RISE event.\n\n📞 **Developer Contact Details:**\n• **Phone / WhatsApp:** **+91 9865190190**\n• **Social Media Handles:** **@gvtanish** (Instagram, GitHub, LinkedIn)\n• **School Channels:** `@pmshrikvsulur` · `@kvian_rocks`";
      }

      // PM SHRI KV AFS Sulur School Information
      if (t.includes("kv sulur") || t.includes("about kv sulur") || t.includes("sulur.kvs.ac.in") || t.includes("school code") || t.includes("affiliation") || t.includes("about school") || t.includes("kendriya vidyalaya sulur") || t.includes("afs sulur") || t.includes("school info") || t.includes("principal") || t.includes("udise") || t.includes("board result") || t.includes("topper")) {
        return "🏫 **PM SHRI Kendriya Vidyalaya AFS Sulur**\n*(पीएम श्री केन्द्रीय विद्यालय वायुसेना अवस्थान सुलूर)*\n\n• **Location:** Air Force Station Sulur, Kangayampalayam, Coimbatore, Tamil Nadu - 641401\n• **Affiliation Codes:** KV Code: **1787** | CBSE Affiliation: **1900016** | School Code: **59022** | UDISE: **33122100403**\n• **Academic Excellence:** 100% pass rate in Class 10 Board Exams & 98.55% in Class 12.\n• **Senior Secondary Streams:** Computer Science, Biology, and Commerce.\n• **Key Features:** NEP 2020 PM SHRI exemplar school, NIPUN Lakshya, Digital Language Lab, ICT E-Classrooms, BaLA (Building as Learning Aid), NCC & Scouts, and our student-built DLMS digital library!\n• **Official Website:** [sulur.kvs.ac.in](https://sulur.kvs.ac.in)";
      }

      // Reading Wrap / Memory Capsule
      if (t.includes("reading wrap") || t.includes("memory capsule") || t.includes("monthly wrap") || t.includes("reading stats")) {
        return "📖 **Reading Wrap (Memory Capsule)**\n\nThe Reading Wrap is your personalized monthly reading celebration!\n\n✨ **What it shows:**\n• 📚 Total books read & chapters completed this cycle\n• 🎯 Reading streak and consistency score\n• 🧠 Quiz scores and knowledge XP gained\n• 🏷️ Your top favorite reading genres\n\n📍 **How to open:** Go to your **Student Dashboard** and tap the **'Monthly Reading Wrap'** banner at the top!";
      }

      // Community Tagging & Mentions
      if (t.includes("tag") || t.includes("@everyone") || t.includes("mention") || t.includes("how to tag") || t.includes("tag friends")) {
        return "🏷️ **How to Tag Friends in Community**\n\n1. Go to the **Community** tab and click **'New Post'**.\n2. In the post composer, click the **'@ Tag'** button.\n3. **Students:** Search and pick from your confirmed friends.\n4. **Admins / Moderators:** Can tag any student or select **'@everyone'** for a school-wide broadcast alert.\n5. When you post, tagged students receive instant in-app sound & push notifications!";
      }

      // Student Barcode / Digital ID
      if (t.includes("barcode") || t.includes("library card") || t.includes("student id") || t.includes("scan id") || t.includes("my barcode")) {
        return "💳 **Student Library Barcode**\n\nEvery student has a unique library barcode:\n1. Open your **Student Dashboard** or **Student Portfolio**.\n2. View your digital student barcode card.\n3. Show this barcode on your phone (or carry a printout) to the librarian at the counter for 1-second instant checkout!";
      }

      // Book Clubs
      if (t.includes("book club") || t.includes("reading club") || t.includes("join club")) {
        return "👥 **Book Clubs Feature**\n\n1. Go to the **Community** tab -> **Book Clubs** sub-tab.\n2. Browse existing clubs (e.g., Sci-Fi, Mystery, Classics, CBSE Study Groups).\n3. Join any club to participate in dedicated group discussions and book sharing.\n4. You can also create your own student club and invite friends!";
      }

      // Timings / Hours
      if (t.includes("timing") || t.includes("opening hour") || t.includes("opening time") || t.includes("what time") || t.includes("when open") || t.includes("library hour") || t.includes("library time") || t.includes("open today") || t.includes("closed")) {
        return "🕐 **Library Timings**\n\nThe PM SHRI KV AFS Sulur Library is open:\n• **Monday – Friday:** 8:30 AM – 3:30 PM\n• **Saturday:** 8:30 AM – 12:00 PM (half-day)\n• **Sundays & Public Holidays:** Closed\n\nPlease note: The library may close early on exam and event days.";
      }

      // Rules & Regulations
      if ((t.includes("rule") || t.includes("regulation") || t.includes("policy") || t.includes("guideline")) && !t.includes("borrow") && !t.includes("fine")) {
        return "📋 **Library Rules & Regulations**\n\n1. Maintain silence inside the library at all times.\n2. Food and drinks are strictly not allowed.\n3. Handle books with care — do not fold pages or write in books.\n4. Return books on or before the due date.\n5. A maximum of 1 book can be issued at a time per student (5 for staff).\n6. Students must carry their ID card when borrowing books.\n7. Damaged or lost books must be reported immediately.\n8. Mobiles must be kept on silent mode inside the library.";
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
      if (t.includes("fine") || t.includes("overdue") || t.includes("late fee") || t.includes("late return")) {
        return "💰 **Overdue Fines**\n\n• Fine rate: **₹1 per day** after the due date.\n• Fines can be paid at the library counter (cash or UPI).\n• Unpaid fines must be cleared before issuing new books.\n• Fines can be viewed in the **My Requests** tab.\n\n📊 Example: If a book is 10 days overdue → Fine = ₹10.";
      }

      // How to pay fine
      if (t.includes("pay fine") || t.includes("how to pay") || t.includes("upi") || t.includes("payment") || t.includes("pay dues")) {
        return "💳 **How to Pay a Fine**\n\n1. Check your fine amount in **My Requests** tab.\n2. Visit the library counter to pay in **cash** or via **UPI**.\n3. Ask the librarian for the UPI QR code if paying digitally.\n4. Your fine will be cleared and recorded after payment.\n\n🧾 Always request a receipt/confirmation after payment.";
      }

      // Lost book
      if (t.includes("lost book") || t.includes("lost the book") || t.includes("book is lost") || t.includes("cannot find") || t.includes("i lost") || t.includes("missing book")) {
        return "😟 **Lost Book Procedure**\n\n1. Report the lost book immediately to the librarian.\n2. You will need to **pay the cost of the book** (as per the book's current price).\n3. Click **🎫 Raise Support Ticket** to submit a Lost Book report.\n4. The librarian will process the report and update the records.\n\n⚠️ Delay in reporting increases the penalty. Report as soon as possible!";
      }

      // Catalog / Search books
      if (t.includes("catalog") || t.includes("search book") || t.includes("find book") || t.includes("search for a book") || t.includes("available book")) {
        return "🔍 **How to Search for Books**\n\n1. Click on **Catalog** in the navigation menu.\n2. Use the search bar to search by **Title**, **Author**, or **Subject**.\n3. Use filters to narrow by class, genre, or availability.\n4. Click on a book to view details and request it.\n\n📖 The catalog shows real-time availability — if it shows 0 copies, the book is currently issued.";
      }

      // Password reset
      if (t.includes("forgot password") || t.includes("reset password") || t.includes("change password") || t.includes("can't login") || t.includes("cannot login") || t.includes("login problem")) {
        return "🔑 **Password Help**\n\n**Forgot your password?**\n1. Click **'Forgot Password'** on the login screen.\n2. Enter your registered email.\n3. Check your email for a reset link.\n4. Click the link and set a new password.\n\n**Still having trouble?**\nContact the librarian or submit a ticket by clicking **🎫 Raise Support Ticket**.";
      }

      // Study materials / NCERT
      if (
        t.includes("study material") || t.includes("ncert") || t.includes("cbse resource") ||
        t.includes("study guide") || t.includes("study hub") ||
        /\b(chapter (pdf|notes|summary|resource)|ncert (pdf|notes|chapter)|cbse (notes|chapter)|download (notes|pdf))\b/.test(t)
      ) {
        return "📚 **Study Materials**\n\nDigital study materials are available in the **Study Hub** tab:\n• NCERT chapter PDFs (Class 6–12)\n• CBSE curriculum resources\n• AI-generated chapter summaries\n• Subject-wise key concept notes\n\nGo to your dashboard → **Study Hub** tab to access them.";
      }

      // Quiz
      if (
        /\b(library quiz|book quiz|generate quiz|take a quiz|start quiz|quiz feature|quiz for (a )?book|earn points? (?:from|with|via) quiz)\b/.test(t) ||
        t.includes("mcq")
      ) {
        return "📝 **Library Quizzes**\n\n1. Go to a book in the **Catalog** and open its detail page.\n2. Click **'Generate Quiz'** to create an AI quiz on that book.\n3. Answer the MCQs to earn points!\n\nYou can also find quizzes in the **Study Hub** for your NCERT chapters.";
      }

      // Book recommendation
      if (t.includes("recommend") || t.includes("suggestion") || t.includes("suggest") || t.includes("good book") || t.includes("which book") || t.includes("what should i read") || t.includes("best book")) {
        return "📖 **Book Recommendations**\n\nHere are some great reads by level:\n\n**Class 6–8:** Ruskin Bond stories, Diary of a Wimpy Kid, Famous Five series\n**Class 9–10:** To Kill a Mockingbird, Wings of Fire (A.P.J. Abdul Kalam), Animal Farm\n**Class 11–12:** The Alchemist, Rich Dad Poor Dad, 1984 by George Orwell\n\nFor personalized recommendations, ask me: *'Suggest a science fiction book'* or *'Best book for Class 8'* — I'll use AI to help you!";
      }

      // Thank you / bye
      if (t === "thank you" || t === "thanks" || t === "thank u" || t === "thx" || t === "bye" || t === "goodbye" || t.includes("that's all") || t.includes("that is all")) {
        return "You're welcome! 😊 Feel free to ask me anything else. Happy reading! 📚";
      }

      return null;
    };

    // ─────────────────────────────────────────────────────────────
    // Personalised live answers from the student's own records
    // ─────────────────────────────────────────────────────────────
    const personalAnswer = await checkPersonalAnswer(textToSend);
    if (personalAnswer) {
      setMessages([...newMessages, { role: 'assistant', content: personalAnswer }]);
      setLoading(false);
      return;
    }

    const localAnswer = checkPredefinedAnswer(textToSend);
    if (localAnswer) {
      setTimeout(() => {
        setMessages([...newMessages, { role: 'assistant', content: localAnswer }]);
        setLoading(false);
      }, 300);
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
        content: `I am currently operating in **Fast Rule-Based Mode**! ⚡\n\nQuick Information:\n• 📚 **Borrowing Rules:** 7-day loan for students (max 1 book), 30-day loan for teachers.\n• 🕐 **Timings:** Mon–Fri 8:30 AM – 3:30 PM, Sat 8:30 AM – 12:00 PM.\n• 💰 **Fines:** ₹1 per day overdue penalty.\n• 👨‍💻 **Developer:** G V Tanish Vettrivel (+91 9865190190)\n\nHave a specific question or issue? Click **🎫 Raise Support Ticket** to connect directly with the librarian!`
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
        <div className="bg-background border shadow-2xl rounded-2xl w-[360px] sm:w-[400px] max-w-[calc(100vw-1.5rem)] h-[520px] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 border-border/60">

          {/* ── Gradient Header ──────────────────────────── */}
          <div className="shrink-0 bg-gradient-to-r from-primary/15 via-primary/8 to-violet-500/10 border-b border-border/50 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center shadow-md ring-2 ring-primary/20">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground leading-tight">{botName}</h3>
                <p className="text-[10px] text-muted-foreground">KV Sulur Library Assistant · Online</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" aria-label="Close chat" onClick={() => setIsOpen(false)} className="h-8 w-8 rounded-full hover:bg-background/80 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* ── Messages & Widget Area ────────────────────── */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-auto ring-1 ring-primary/15">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div className="flex flex-col gap-1 max-w-[84%]">
                  <div className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-gradient-to-br from-primary to-primary/85 text-primary-foreground rounded-tr-xs shadow-sm'
                      : 'bg-muted/60 text-foreground rounded-tl-xs border border-border/40 shadow-xs'
                  }`}>
                    {renderFormattedMessage(m.content)}
                  </div>
                  {m.role === 'assistant' && i === messages.length - 1 && (m.content.includes("trouble") || m.content.includes("failed")) && (
                    <Button variant="outline" size="sm" onClick={() => {
                      const lastUserMsg = [...messages].reverse().find(msg => msg.role === 'user');
                      if (lastUserMsg) { setMessages(prev => prev.slice(0, -1)); sendMessage(lastUserMsg.content); }
                    }} className="text-[10px] self-start gap-1 py-1 px-2.5 h-auto rounded-full bg-background border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
                      <RefreshCw className="h-3 w-3" /> Retry Connection
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {/* ── Animated typing dots ─────────────────────── */}
            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-auto ring-1 ring-primary/15">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-xs bg-muted/60 border border-border/40 shadow-xs flex items-center gap-1">
                  {[0, 150, 300].map((delay) => (
                    <span key={delay} className="h-1.5 w-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: `${delay}ms`, animationDuration: "900ms" }} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Interactive Cards ────────────────────────── */}
            {activeWidget === 'ticket' && <InChatTicketWidget currentUser={currentUser} onClose={() => setActiveWidget('none')} onTicketCreated={handleTicketCreated} />}
            {activeWidget === 'profile' && <InChatProfileEditor currentUser={currentUser} onClose={() => setActiveWidget('none')} onProfileUpdated={handleProfileUpdated} />}
            {activeWidget === 'feedback' && <InChatFeedbackWidget currentUser={currentUser} onClose={() => setActiveWidget('none')} onFeedbackSubmitted={handleFeedbackSubmitted} />}
            {activeWidget === 'badges' && <InChatBadgeCard currentUser={currentUser} onClose={() => setActiveWidget('none')} />}
            {activeWidget === 'certificates' && <InChatCertificateCard currentUser={currentUser} onClose={() => setActiveWidget('none')} />}
            {activeWidget === 'level' && <InChatLevelCard currentUser={currentUser} onClose={() => setActiveWidget('none')} />}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Bottom: Chip strip + Input ───────────────── */}
          <div className="shrink-0 border-t border-border/50 bg-background/95 backdrop-blur-sm">
            {prompts.length > 0 && (
              <div className="px-3 pt-2 pb-1">
                <div
                  className="flex gap-1.5 overflow-x-auto scrollbar-none"
                  style={{
                    maskImage: "linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent)",
                    WebkitMaskImage: "linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent)",
                  }}
                >
                  <div className="w-2 shrink-0" />
                  {prompts.map((p, idx) => (
                    <button key={idx} onClick={() => sendMessage(p)}
                      className="whitespace-nowrap text-[10px] px-2.5 py-1 rounded-full border border-primary/30 text-primary bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-xs transition-all duration-150 shrink-0 font-medium">
                      {p}
                    </button>
                  ))}
                  <div className="w-2 shrink-0" />
                </div>
              </div>
            )}
            <div className="flex gap-1.5 items-center px-3 pb-3 pt-1.5">
              <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !loading && sendMessage()}
                placeholder="Ask or command Avenyx…"
                className="bg-muted/40 text-xs h-9 rounded-full border-border/40 focus-visible:ring-primary/30 focus-visible:bg-background transition-colors placeholder:text-muted-foreground/60"
              />
              <Button size="icon" aria-label="Send message" onClick={() => sendMessage()} disabled={!input.trim() || loading}
                className="h-9 w-9 rounded-full shrink-0 bg-primary hover:bg-primary/90 disabled:opacity-35 shadow-sm transition-all hover:scale-105 active:scale-95">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* ── FAB with presence ring ─────────────────────── */
        <div className="relative">
          <Button onClick={() => setIsOpen(true)}
            aria-label="Open library assistant chat"
            className="h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-2xl bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105 active:scale-95 transition-transform animate-in zoom-in border border-primary-foreground/20 p-0 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-500 border-2 border-background shadow-sm flex items-center justify-center">
            <span className="h-full w-full rounded-full bg-emerald-400 animate-ping opacity-70" />
          </span>
        </div>
      )}
    </div>
  );
};
