import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Bot, Plus, Save, Trash2, RefreshCw, Edit2, X, Eye, ChevronDown, ChevronUp, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BotMessage {
  id: string;
  label: string;
  keywords: string[];
  response: string;
  isBuiltin?: boolean;
  isNew?: boolean;
}

const BUILTIN_DEFAULTS: BotMessage[] = [
  { id: "timings", label: "Library Timings", isBuiltin: true,
    keywords: ["timing", "opening hour", "opening time", "what time", "when open", "library hour", "library time", "open today", "closed"],
    response: "🕐 **Library Timings**\n\nThe PM SHRI KV AFS Sulur Library is open:\n• **Monday – Friday:** 8:30 AM – 3:30 PM\n• **Saturday:** 8:30 AM – 12:00 PM (half-day)\n• **Sundays & Public Holidays:** Closed\n\nPlease note: The library may close early on exam and event days." },
  { id: "borrow", label: "How to Borrow a Book", isBuiltin: true,
    keywords: ["how to borrow", "how to issue", "how do i borrow", "issue book", "borrow book", "get a book", "checkout"],
    response: "📚 **How to Borrow a Book**\n\n1. Search for the book in the **Catalog** tab.\n2. Click on the book and press **'Request'**.\n3. Wait for the librarian to approve your request.\n4. Visit the library counter with your **Student ID card**.\n5. The librarian will scan your barcode and issue the book.\n\n⏰ Books can be borrowed for **up to 14 days**.\n📌 Maximum **2 books** can be issued at a time." },
  { id: "return", label: "How to Return a Book", isBuiltin: true,
    keywords: ["how to return", "return book", "return a book", "give back", "submit book"],
    response: "🔄 **How to Return a Book**\n\n1. Visit the library counter before or on the **due date**.\n2. Hand the book to the librarian.\n3. The librarian will scan your ID and mark the return.\n4. You will receive a confirmation in your **My Requests** tab.\n\n⚠️ Late returns are charged **₹1 per day** after the due date." },
  { id: "renew", label: "How to Renew a Book", isBuiltin: true,
    keywords: ["renew", "extend", "re-issue", "reissue"],
    response: "🔁 **How to Renew a Book**\n\n1. Go to **My Requests** tab in your dashboard.\n2. Find your active issue and click **'Request Renewal'**.\n3. The librarian will approve or deny the renewal.\n4. Renewals extend the due date by **7 more days**.\n\n⚠️ A book can only be renewed **once**." },
  { id: "fine", label: "Overdue Fines", isBuiltin: true,
    keywords: ["fine", "overdue", "late fee", "penalty", "late return"],
    response: "💰 **Overdue Fines**\n\n• Fine rate: **₹1 per day** after the due date.\n• Fines can be paid at the library counter (cash or UPI).\n• Unpaid fines must be cleared before issuing new books.\n• Fines can be viewed in the **My Requests** tab.\n\n📊 Example: If a book is 10 days overdue → Fine = ₹10." },
  { id: "lost", label: "Lost Book Procedure", isBuiltin: true,
    keywords: ["lost book", "lost the book", "book is lost", "cannot find", "i lost", "missing book"],
    response: "😟 **Lost Book Procedure**\n\n1. Report the lost book immediately to the librarian.\n2. You will need to **pay the cost of the book** (as per the book's current price).\n3. Go to **Help & Support** tab to submit a Lost Book ticket.\n4. The librarian will process the report and update the records.\n\n⚠️ Delay in reporting increases the penalty. Report as soon as possible!" },
  { id: "points", label: "Points & Rewards", isBuiltin: true,
    keywords: ["point", "reward", "score", "badge", "level", "rank", "xp", "leaderboard"],
    response: "🏆 **Points & Rewards System**\n\nYou earn points for:\n• ✅ Borrowing and returning books on time → **+10 pts**\n• 📝 Completing quizzes → **+5 pts each**\n• 🔥 Daily login streak → **+2–10 pts**\n• ⭐ Writing book reviews → **+3 pts**\n• 📅 Attending events → **+5 pts**\n\nPoints appear on the **Rankings** tab. Top students earn special badges and certificates!" },
  { id: "contact", label: "Contact & Support", isBuiltin: true,
    keywords: ["contact", "email", "support", "help", "ticket", "complaint", "problem", "issue"],
    response: "📞 **Contact & Support**\n\n• 📧 Email: kvafssulurlibrary@gmail.com\n• 🎫 Support Tickets: Go to **Help & Support** tab in your dashboard\n• 🏫 In-person: Visit the library counter during opening hours\n\nFor urgent matters, please speak directly to the librarian at the library counter." },
  { id: "rules", label: "Library Rules", isBuiltin: true,
    keywords: ["rule", "regulation", "policy", "guideline"],
    response: "📋 **Library Rules & Regulations**\n\n1. Maintain silence inside the library at all times.\n2. Food and drinks are strictly not allowed.\n3. Handle books with care — do not fold pages or write in books.\n4. Return books on or before the due date.\n5. A maximum of 2 books can be issued at a time per student.\n6. Students must carry their ID card when borrowing books.\n7. Damaged or lost books must be reported immediately.\n8. Mobiles must be kept on silent mode inside the library." },
  { id: "password", label: "Password Help", isBuiltin: true,
    keywords: ["forgot password", "reset password", "change password", "password", "can't login", "cannot login", "login problem"],
    response: "🔑 **Password Help**\n\n**Forgot your password?**\n1. Click **'Forgot Password'** on the login screen.\n2. Enter your registered email.\n3. Check your email for a reset link.\n4. Click the link and set a new password.\n\n**Still having trouble?**\nContact the librarian or submit a ticket in **Help & Support**." },
  { id: "catalog", label: "How to Search Books", isBuiltin: true,
    keywords: ["catalog", "search book", "find book", "look up", "search for a book", "available book"],
    response: "🔍 **How to Search for Books**\n\n1. Click on **Catalog** in the navigation menu.\n2. Use the search bar to search by **Title**, **Author**, or **Subject**.\n3. Use filters to narrow by class, genre, or availability.\n4. Click on a book to view details and request it.\n\n📖 The catalog shows real-time availability — if it shows 0 copies, the book is currently issued." },
  { id: "recommend", label: "Book Recommendations", isBuiltin: true,
    keywords: ["recommend", "suggestion", "suggest", "good book", "which book", "what should i read", "best book"],
    response: "📖 **Book Recommendations**\n\n**Class 6–8:** Ruskin Bond stories, Diary of a Wimpy Kid, Famous Five series\n**Class 9–10:** To Kill a Mockingbird, Wings of Fire (A.P.J. Abdul Kalam), Animal Farm\n**Class 11–12:** The Alchemist, Rich Dad Poor Dad, 1984 by George Orwell\n\nFor personalized recommendations, ask me: *'Suggest a science fiction book'* — I'll use AI to help you!" },
];

export default function LibraryBotMessagesManager() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<BotMessage>>({});
  const [newKeywordInput, setNewKeywordInput] = useState("");

  const loadMessages = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("system_settings").select("value").eq("key", "library_bot_messages").maybeSingle();
      if (data?.value) {
        try {
          const val = typeof data.value === "string" ? data.value : JSON.stringify(data.value);
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed) && parsed.length > 0) { setMessages(parsed); return; }
        } catch { /* fall through */ }
      }
      setMessages(BUILTIN_DEFAULTS);
    } catch { setMessages(BUILTIN_DEFAULTS); }
    finally { setLoading(false); }
  };

  const saveMessages = async (updatedMessages: BotMessage[]) => {
    setSaving(true);
    try {
      const cleanMessages = updatedMessages.map(({ isNew, ...m }) => m);
      const { error } = await (supabase as any).from("system_settings")
        .upsert({ key: "library_bot_messages", value: JSON.stringify(cleanMessages) }, { onConflict: "key" });
      if (error) throw error;
      setMessages(cleanMessages);
      toast({ title: "Bot messages saved ✅", description: "LibraryBot will now use the updated responses." });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  useEffect(() => { loadMessages(); }, []);

  const startEdit = (msg: BotMessage) => { setEditingId(msg.id); setEditForm({ ...msg }); setExpandedId(msg.id); };
  const cancelEdit = () => {
    if (editForm.isNew) setMessages((prev) => prev.filter((m) => m.id !== editingId));
    setEditingId(null); setEditForm({}); setNewKeywordInput("");
  };
  const applyEdit = () => {
    if (!editForm.label?.trim() || !editForm.response?.trim()) {
      toast({ title: "Label and response are required", variant: "destructive" }); return;
    }
    setMessages((prev) => prev.map((m) => m.id === editingId ? { ...m, ...editForm, isNew: false } : m));
    setEditingId(null); setEditForm({}); setNewKeywordInput("");
  };
  const addNewMessage = () => {
    const newId = `custom_${Date.now()}`;
    const newMsg: BotMessage = { id: newId, label: "New Response", keywords: [], response: "", isNew: true };
    setMessages((prev) => [...prev, newMsg]);
    setTimeout(() => startEdit(newMsg), 0);
  };
  const deleteMessage = (id: string) => {
    if (!window.confirm("Remove this response?")) return;
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };
  const addKeyword = () => {
    const kw = newKeywordInput.trim().toLowerCase();
    if (!kw) return;
    if (!(editForm.keywords || []).includes(kw)) setEditForm((f) => ({ ...f, keywords: [...(f.keywords || []), kw] }));
    setNewKeywordInput("");
  };
  const removeKeyword = (kw: string) => setEditForm((f) => ({ ...f, keywords: (f.keywords || []).filter((k) => k !== kw) }));

  if (loading) return (
    <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
      <RefreshCw className="h-5 w-5 animate-spin" /> Loading bot messages...
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900">
            <Bot className="h-5 w-5 text-indigo-600" /> LibraryBot — Predefined Responses
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage keyword-triggered responses for LibraryBot. Changes are saved to the database and take effect immediately.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="h-8 text-xs"
            onClick={() => { if (window.confirm("Reset all messages to factory defaults?")) saveMessages(BUILTIN_DEFAULTS); }}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Reset Defaults
          </Button>
          <Button size="sm" className="h-8 text-xs" onClick={addNewMessage}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Response
          </Button>
          <Button size="sm" disabled={saving} onClick={() => saveMessages(messages)}
            className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
            {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
            Save All
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 flex items-start gap-2 text-xs text-blue-800">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
        <span><strong>How keywords work:</strong> When a student's message <em>contains</em> any listed keyword (case-insensitive), the predefined response is shown instantly without using AI. Unmatched messages fall back to AI.</span>
      </div>

      <div className="space-y-2.5">
        {messages.map((msg) => {
          const isEditing = editingId === msg.id;
          const isExpanded = expandedId === msg.id || isEditing;
          const displayKws = isEditing ? (editForm.keywords || []) : msg.keywords;
          return (
            <Card key={msg.id} className={`border transition-all duration-200 ${isEditing ? "border-indigo-400 shadow-md shadow-indigo-100" : "border-slate-200 hover:border-slate-300"}`}>
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <CardTitle className="text-sm font-bold text-slate-900 truncate">
                      {isEditing ? (editForm.label || "Editing…") : msg.label}
                    </CardTitle>
                    {msg.isBuiltin && !isEditing && <Badge variant="secondary" className="text-[10px] shrink-0 py-0">Built-in</Badge>}
                    {msg.isNew && <Badge className="text-[10px] shrink-0 py-0 bg-emerald-100 text-emerald-700 border-emerald-200">New</Badge>}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => setExpandedId(isExpanded && !isEditing ? null : msg.id)}>
                      {isExpanded && !isEditing ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    {!isEditing && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-600 hover:bg-indigo-50" onClick={() => startEdit(msg)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {!isEditing && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => deleteMessage(msg.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {displayKws.slice(0, 6).map((kw) => (
                    <span key={kw} className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 rounded-full px-2 py-0.5 font-mono">{kw}</span>
                  ))}
                  {displayKws.length > 6 && <span className="text-[10px] text-muted-foreground">+{displayKws.length - 6} more</span>}
                  {displayKws.length === 0 && <span className="text-[10px] text-amber-600 italic">No keywords — won't be triggered</span>}
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="px-4 pb-4 pt-3 space-y-4 border-t border-slate-100">
                  {isEditing ? (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Label / Title</Label>
                        <Input value={editForm.label || ""} onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
                          placeholder="e.g. Library Timings" className="h-9 text-sm" />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Trigger Keywords</Label>
                        <p className="text-[11px] text-muted-foreground">When a student's message contains any of these (case-insensitive), this response is shown.</p>
                        <div className="flex flex-wrap gap-1.5 p-2.5 border border-slate-200 rounded-lg min-h-[44px] bg-slate-50">
                          {(editForm.keywords || []).map((kw) => (
                            <span key={kw} className="flex items-center gap-1 text-[11px] bg-white border border-slate-300 rounded-full px-2.5 py-0.5 font-mono text-slate-700">
                              {kw}
                              <button type="button" onClick={() => removeKeyword(kw)} className="text-slate-400 hover:text-red-500">
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </span>
                          ))}
                          {(editForm.keywords || []).length === 0 && <span className="text-[11px] text-muted-foreground italic">Add keywords below…</span>}
                        </div>
                        <div className="flex gap-2">
                          <Input value={newKeywordInput} onChange={(e) => setNewKeywordInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                            placeholder="Type keyword and press Enter" className="h-8 text-xs" />
                          <Button type="button" size="sm" variant="outline" onClick={addKeyword} className="h-8 text-xs shrink-0">
                            <Plus className="h-3.5 w-3.5 mr-1" /> Add
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold">Response Text</Label>
                          <span className="text-[10px] text-muted-foreground font-mono">{(editForm.response || "").length} chars</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Use **bold**, • bullet points, and line breaks. Emojis are supported.</p>
                        <Textarea value={editForm.response || ""} onChange={(e) => setEditForm((f) => ({ ...f, response: e.target.value }))}
                          rows={8} className="text-xs font-mono resize-y" placeholder="Enter the response text..." />
                      </div>

                      {(editForm.response || "").length > 0 && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Eye className="h-3 w-3" /> Preview — as students see it
                          </p>
                          <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">{editForm.response}</div>
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-1">
                        <Button type="button" variant="outline" size="sm" onClick={cancelEdit} className="text-xs h-8">Cancel</Button>
                        <Button type="button" size="sm" onClick={applyEdit} className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white">
                          <Save className="h-3.5 w-3.5 mr-1" /> Apply Changes
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Eye className="h-3 w-3" /> Response Preview
                      </p>
                      <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{msg.response}</div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {messages.length === 0 && (
        <div className="text-center py-14 text-muted-foreground">
          <Bot className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No predefined responses yet.</p>
          <Button className="mt-4" size="sm" onClick={addNewMessage}><Plus className="h-4 w-4 mr-1.5" /> Add First Response</Button>
        </div>
      )}
    </div>
  );
}
