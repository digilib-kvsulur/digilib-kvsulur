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
import { LifeBuoy, Loader2, Search, Send, Trash2, Mail, GraduationCap, Hash } from "lucide-react";
import { statusMeta, TICKET_CATEGORIES } from "@/components/support/SupportCenter";
import { sendTicketEmail } from "@/lib/ticketEmail";

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
          <CardTitle className="text-lg flex items-center gap-2"><LifeBuoy className="h-5 w-5 text-primary" /> Support & Tickets</CardTitle>
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
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${meta.className}`}>{meta.label}</Badge>
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
                  <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply in thread…" className="h-10" />
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
