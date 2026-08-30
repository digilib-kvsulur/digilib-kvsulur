import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, X, Send, Loader2, Bot, User, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const DEFAULT_PROMPTS = [
  "Library timings",
  "How to borrow a book",
  "Overdue fine amount",
  "How to renew a book",
  "Lost book procedure",
  "Reset password",
  "How to search books",
  "Points & rewards",
];

export const LibraryBot = ({ suggestedPrompts }: { suggestedPrompts?: string[] }) => {
  const prompts = suggestedPrompts && suggestedPrompts.length > 0 ? suggestedPrompts : DEFAULT_PROMPTS;
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! 👋 I'm **LibraryBot** — your library assistant.\n\nI can answer questions about timings, borrowing, fines, lost books, catalog, points, and more — instantly, without waiting for AI!\n\nFor complex questions, I'll use AI to help. What would you like to know?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    supabase.from("system_settings").select("value").eq("key", "library_bot_visible").maybeSingle()
      .then(res => {
        if (res.data?.value) {
           const v = res.data.value;
           setIsVisible(v === "true" || v === true);
        }
      });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

      // Greetings
      if (/^(hi|hello|hey|good morning|good afternoon|good evening|namaste|greetings|sup|howdy)$/.test(t) || t === "hi there" || t === "hello there") {
        return "Hello! 👋 I am LibraryBot — your digital library assistant at PM SHRI KV AFS Sulur.\n\nI can help you with:\n• Library timings & rules\n• How to borrow, return or renew books\n• Overdue fines & penalties\n• Lost book procedure\n• Catalog & book search tips\n• Points & rewards system\n• Account & password help\n\nWhat would you like to know?";
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
      if (t.includes("how to borrow") || t.includes("how to issue") || t.includes("how do i borrow") || t.includes("how do i issue") || t.includes("issue book") || t.includes("borrow book") || t.includes("get a book") || t.includes("take a book") || t.includes("checkout")) {
        return "📚 **How to Borrow a Book**\n\n1. Search for the book in the **Catalog** tab.\n2. Click on the book and press **'Request'**.\n3. Wait for the librarian to approve your request.\n4. Visit the library counter with your **Student ID card**.\n5. The librarian will scan your barcode and issue the book.\n\n⏰ Books can be borrowed for **up to 14 days**.\n📌 Maximum **2 books** can be issued at a time.";
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

      // Contact / Support
      if (t.includes("contact") || t.includes("email") || t.includes("support") || t.includes("help") || t.includes("ticket") || t.includes("complaint") || t.includes("problem") || t.includes("issue")) {
        return "📞 **Contact & Support**\n\n• 📧 Email: kvafssulurlibrary@gmail.com\n• 🎫 Support Tickets: Go to **Help & Support** tab in your dashboard\n• 🏫 In-person: Visit the library counter during opening hours\n\nFor urgent matters, please speak directly to the librarian at the library counter.";
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
      console.error(e);
      const errMsg = e.message || "";
      let userFriendlyMsg = `Oops! I am having trouble connecting right now. Details: ${errMsg}`;
      if (errMsg.includes("GEMINI_API_KEY")) {
        userFriendlyMsg = "AI Bot connection failed: GEMINI_API_KEY secret is not set in Supabase. Please configure it in your settings.";
      }
      setMessages([...newMessages, { role: 'assistant', content: userFriendlyMsg }]);
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
    <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50">
      {isOpen ? (
        <div className="bg-background border shadow-2xl rounded-2xl w-[350px] max-w-[calc(100vw-2rem)] h-[450px] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-primary/10 p-4 border-b flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="bg-primary text-primary-foreground p-2 rounded-full">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">LibraryBot</h3>
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
          className="h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105 transition-transform animate-in zoom-in"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
};
