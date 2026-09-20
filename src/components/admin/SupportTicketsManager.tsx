import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  LifeBuoy, Loader2, Search, Send, Trash2, Mail, GraduationCap, Hash,
  KeyRound, RefreshCw, Copy, Eye, EyeOff, ShieldCheck
} from "lucide-react";
import { statusMeta, TICKET_CATEGORIES } from "@/components/support/SupportCenter";
import { sendTicketEmail } from "@/lib/ticketEmail";

/** LOGIN-ISSUE categories that get the password-reset quick-action banner */
const LOGIN_CATEGORIES = ["login_issue", "account", "password"];

export default function SupportTicketsManager() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [q, setQ] = useState("");
  const [active, setActive] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState("");
  const [response, setResponse] = useState("");
  const [saving, setSaving] = useState(false);

  // Password-reset state
  const [pwResetting, setPwResetting] = useState(false);
  const [newPw, setNewPw] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [sendingPwEmail, setSendingPwEmail] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
    if (error) toast({ title: "Error loading tickets", description: error.message, variant: "destructive" });
    setTickets(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => tickets.filter(t => {
    if (status !== "all" && t.status !== status) return false;
    if (category !== "all" && t.category !== category) return false;
    if (q.trim()) {
      const s = q.toLowerCase();
      return [t.ticket_number, t.subject, t.full_name, t.admission_number, t.email, t.description].some((v: any) => (v || "").toLowerCase().includes(s));
    }
    return true;
  }), [tickets, status, category, q]);

  const counts = useMemo(() => ({
    open: tickets.filter(t => t.status === "open").length,
    in_progress: tickets.filter(t => t.status === "in_progress").length,
    resolved: tickets.filter(t => t.status === "resolved").length,
    total: tickets.length,
  }), [tickets]);

  const openTicket = async (t: any) => {
    setActive(t);
    setResponse(t.admin_response || "");
    setNewPw(null);
    setShowPw(false);
    const { data } = await supabase.from("support_ticket_messages").select("*").eq("ticket_id", t.id).order("created_at", { ascending: true });
    setMessages(data || []);
  };

  const updateTicket = async (patch: any) => {
    if (!active) return;
    setSaving(true);
    const { error } = await supabase.from("support_tickets").update(patch).eq("id", active.id);
    setSaving(false);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Ticket updated" });
    const next = { ...active, ...patch };
    setActive(next);
    if (active.email && (patch.status || patch.admin_response)) {
      sendTicketEmail({
        type: "updated",
        ticket_id: active.id,
        ticket_number: active.ticket_number,
        to_email: active.email,
        full_name: active.full_name,
        subject: active.subject,
        status: patch.status || active.status,
        admin_response: patch.admin_response ?? active.admin_response,
      });
    }
    load();
  };

  const sendReply = async () => {
    if (!reply.trim() || !active) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("support_ticket_messages").insert({
      ticket_id: active.id, sender_id: user?.id, sender_name: "Library Team", is_staff: true, message: reply.trim().slice(0, 1000),
    });
    if (error) { toast({ title: "Could not send", description: error.message, variant: "destructive" }); return; }
    if (active.email) {
      sendTicketEmail({
        type: "reply",
        ticket_id: active.id,
        ticket_number: active.ticket_number,
        to_email: active.email,
        full_name: active.full_name,
        subject: active.subject,
        status: active.status,
        message: reply.trim(),
      });
    }
    setReply("");
    openTicket(active);
  };

  const removeTicket = async (id: string) => {
    const { error } = await supabase.from("support_tickets").delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    setActive(null);
    load();
  };

  // ─── Password Reset helpers ──────────────────────────────────────────────
  /** Look up the user account by admission number (or email) and reset password. */
  const handleResetPassword = async () => {
    if (!active?.admission_number && !active?.email) {
      toast({ title: "No identifier", description: "Ticket has no admission number or email to look up.", variant: "destructive" });
      return;
    }
    setPwResetting(true);
    try {
      // Resolve profile → user_id
      let profileId: string | null = null;
      if (active.admission_number) {
        const { data: p } = await supabase
          .from("profiles")
          .select("id")
          .eq("admission_number", active.admission_number)
          .maybeSingle();
        profileId = p?.id ?? null;
      }
      if (!profileId && active.email) {
        const { data: p } = await supabase
          .from("profiles")
          .select("id")
          .ilike("email", active.email)
          .maybeSingle();
        profileId = p?.id ?? null;
      }
      if (!profileId) {
        toast({ title: "User not found", description: "No account matched this ticket's admission number or email.", variant: "destructive" });
        return;
      }

      // Call admin-reset-password edge function
      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        body: { user_id: profileId },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error || "Reset failed");

      setNewPw(data.password as string);
      toast({ title: "Password reset!", description: "New temporary password generated." });

      // Auto-resolve the ticket
      await updateTicket({ status: "resolved", admin_response: "Password was reset by admin. Please login with the new temporary password provided to you." });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Reset failed", description: msg, variant: "destructive" });
    } finally {
      setPwResetting(false);
    }
  };

  /** Send the newly generated password to the student's email via ticket email edge function. */
  const handleEmailNewPassword = async () => {
    if (!newPw || !active?.email) {
      toast({ title: "No email or password", description: "Generate a password first and ensure the ticket has an email.", variant: "destructive" });
      return;
    }
    setSendingPwEmail(true);
    try {
      await supabase.functions.invoke("send-ticket-email", {
        body: {
          type: "reply",
          ticket_id: active.id,
          ticket_number: active.ticket_number,
          to_email: active.email,
          full_name: active.full_name,
          subject: active.subject,
          status: "resolved",
          message: `Your library account password has been reset by the admin.\n\nYour new temporary password is: ${newPw}\n\nPlease login at https://dlms.kvsulur.in and change this password immediately from your profile settings.`,
        },
      });
      toast({ title: "Email sent!", description: `New password mailed to ${active.email}.` });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Email failed", description: msg, variant: "destructive" });
    } finally {
      setSendingPwEmail(false);
    }
  };

  const copyPw = () => {
    if (!newPw) return;
    navigator.clipboard.writeText(newPw);
    toast({ title: "Copied!", description: "Password copied to clipboard." });
  };
  // ─────────────────────────────────────────────────────────────────────────

  const isLoginIssue = active && (
    LOGIN_CATEGORIES.some(c => (active.category || "").toLowerCase().includes(c)) ||
    (active.subject || "").toLowerCase().includes("password") ||
    (active.subject || "").toLowerCase().includes("login") ||
    (active.description || "").toLowerCase().includes("password") ||
    (active.description || "").toLowerCase().includes("login")
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total", value: counts.total, cls: "text-foreground" },
          { label: "Open", value: counts.open, cls: "text-amber-600" },
          { label: "In progress", value: counts.in_progress, cls: "text-sky-600" },
          { label: "Resolved", value: counts.resolved, cls: "text-emerald-600" },
        ].map(s => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-black ${s.cls}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2"><LifeBuoy className="h-5 w-5 text-primary" /> Support &amp; Tickets</CardTitle>
          <CardDescription className="text-xs">Handle issues reported by students, teachers and website visitors</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, admission no., subject…" className="pl-9 h-10" />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-10 sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-10 sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {TICKET_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="py-10 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No tickets match these filters.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filtered.map(t => {
                const meta = statusMeta[t.status] || statusMeta.open;
                const looksLikeLogin = LOGIN_CATEGORIES.some(c => (t.category || "").toLowerCase().includes(c)) ||
                  (t.subject || "").toLowerCase().includes("password") ||
                  (t.subject || "").toLowerCase().includes("login");
                return (
                  <button key={t.id} onClick={() => openTicket(t)}
                    className="text-left p-4 rounded-xl border border-border/50 bg-card hover:shadow-md hover:border-primary/30 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {t.ticket_number && (
                          <p className="font-mono text-[10px] font-bold text-primary mb-0.5">{t.ticket_number}</p>
                        )}
                        <p className="font-semibold text-sm truncate">{t.subject}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {looksLikeLogin && <KeyRound className="h-3.5 w-3.5 text-amber-500" title="Login issue" />}
                        <Badge variant="outline" className={`text-[10px] ${meta.className}`}>{meta.label}</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5">{t.description}</p>
                    <div className="flex flex-wrap gap-2 mt-2.5 text-[10px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1 bg-muted rounded px-1.5 py-0.5">{t.full_name}</span>
                      {t.admission_number && <span className="inline-flex items-center gap-1 bg-muted rounded px-1.5 py-0.5"><Hash className="h-3 w-3" />{t.admission_number}</span>}
                      {t.student_class && <span className="inline-flex items-center gap-1 bg-muted rounded px-1.5 py-0.5"><GraduationCap className="h-3 w-3" />{t.student_class}</span>}
                      {t.priority === "high" && <span className="bg-destructive/10 text-destructive rounded px-1.5 py-0.5 font-bold">Urgent</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-lg max-h-[88dvh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base pr-6">{active?.subject}</DialogTitle></DialogHeader>
          {active && (
            <div className="space-y-4">
              {active.ticket_number && (
                <p className="font-mono text-sm font-bold text-primary">Ticket {active.ticket_number}</p>
              )}
              <div className="grid gap-2 text-xs sm:grid-cols-2">
                <div className="rounded-lg bg-muted/50 px-3 py-2"><p className="text-[10px] text-muted-foreground">Reported by</p><p className="font-semibold">{active.full_name}</p></div>
                <div className="rounded-lg bg-muted/50 px-3 py-2"><p className="text-[10px] text-muted-foreground">Admission no.</p><p className="font-semibold">{active.admission_number || "—"}</p></div>
                <div className="rounded-lg bg-muted/50 px-3 py-2"><p className="text-[10px] text-muted-foreground">Class</p><p className="font-semibold">{active.student_class || "—"}</p></div>
                <div className="rounded-lg bg-muted/50 px-3 py-2"><p className="text-[10px] text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />Email</p><p className="font-semibold truncate">{active.email || "—"}</p></div>
              </div>

              <p className="text-sm whitespace-pre-wrap">{active.description}</p>

              {/* ─── LOGIN / PASSWORD QUICK ACTIONS ─── */}
              {isLoginIssue && (
                <div className="rounded-2xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700/40 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-300">Login / Password Issue — Quick Actions</p>
                  </div>

                  {newPw ? (
                    <div className="space-y-2.5">
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">New temporary password generated:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 font-mono bg-card border border-border rounded-lg px-3 py-2 text-sm font-bold tracking-wider">
                          {showPw ? newPw : "•".repeat(newPw.length)}
                        </code>
                        <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => setShowPw(v => !v)}>
                          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={copyPw}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          className="h-9 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 flex-1 sm:flex-none"
                          disabled={sendingPwEmail || !active.email}
                          onClick={handleEmailNewPassword}
                        >
                          {sendingPwEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                          Email Password to Student
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 text-xs gap-1.5"
                          disabled={pwResetting}
                          onClick={handleResetPassword}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Re-generate
                        </Button>
                      </div>
                      {!active.email && (
                        <p className="text-[11px] text-muted-foreground">⚠ No email on this ticket — share the password manually.</p>
                      )}
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="h-9 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-2 w-full sm:w-auto"
                      disabled={pwResetting}
                      onClick={handleResetPassword}
                    >
                      {pwResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                      1-Click Reset Password &amp; Resolve Ticket
                    </Button>
                  )}
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-2">
                <Select value={active.status} onValueChange={(v) => updateTicket({ status: v, resolved_at: v === "resolved" ? new Date().toISOString() : null })}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="destructive" onClick={() => removeTicket(active.id)} className="h-10"><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
              </div>

              <div className="space-y-2">
                <Textarea value={response} onChange={(e) => setResponse(e.target.value)} rows={3} placeholder="Official response shown on the ticket…" />
                <Button disabled={saving} onClick={() => updateTicket({ admin_response: response.trim() || null })} className="w-full h-10">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Save response
                </Button>
              </div>

              <div className="space-y-2 border-t pt-3">
                {messages.map(m => (
                  <div key={m.id} className={`rounded-lg px-3 py-2 text-xs ${m.is_staff ? "bg-primary/10 border border-primary/20" : "bg-muted"}`}>
                    <p className="font-semibold text-[11px]">{m.is_staff ? "Library Team" : m.sender_name || "Member"}</p>
                    <p className="whitespace-pre-wrap mt-0.5">{m.message}</p>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply in thread…" className="h-10"
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendReply()}
                  />
                  <Button onClick={sendReply} size="icon" className="h-10 w-10 shrink-0"><Send className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
