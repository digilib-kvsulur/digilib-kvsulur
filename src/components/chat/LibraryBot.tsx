import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, X, Send, Loader2, Bot, User, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const LibraryBot = ({ suggestedPrompts }: { suggestedPrompts?: string[] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi there! I am LibraryBot. How can I help you today?' }
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

  const sendMessage = async (overrideText?: string) => {
    const textToSend = overrideText || input;
    if (!textToSend.trim()) return;

    const userMessage: Message = { role: 'user', content: textToSend };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    if (!overrideText) setInput("");
    setLoading(true);

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
      let userFriendlyMsg = "Oops! I am having trouble connecting right now. Please check if GEMINI_API_KEY is configured in Supabase secrets.";
      if (errMsg.includes("GEMINI_API_KEY")) {
        userFriendlyMsg = "AI Bot connection failed: GEMINI_API_KEY secret is not set in Supabase. Please configure it in your settings.";
      }
      setMessages([...newMessages, { role: 'assistant', content: userFriendlyMsg }]);
    } finally {
      setLoading(false);
    }
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
                    {m.content}
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
            {suggestedPrompts && suggestedPrompts.length > 0 && messages.length < 3 && (
              <div className="flex flex-wrap gap-2 mb-1">
                {suggestedPrompts.map((p, idx) => (
                  <Button key={idx} variant="outline" size="sm" className="text-xs py-1 h-auto rounded-full" onClick={() => sendMessage(p)}>
                    {p}
                  </Button>
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
