import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LifeBuoy, Send, MessageSquare, Loader2, CheckCircle2, Clock, AlertCircle, Copy } from "lucide-react";
import { sendTicketEmail } from "@/lib/ticketEmail";

export const TICKET_CATEGORIES = [
  { value: "book_issue", label: "Book issue / return problem" },
  { value: "fine", label: "Fine or overdue query" },
  { value: "account", label: "Account / login problem" },
  { value: "quiz", label: "Quiz or points issue" },
  { value: "suggestion", label: "Suggestion / feedback" },
  { value: "general", label: "Other" },
];

export const statusMeta: Record<string, { label: string; className: string; icon: any }> = {
  open: { label: "Open", className: "bg-amber-500/10 text-amber-700 border-amber-500/20", icon: Clock },
  in_progress: { label: "In progress", className: "bg-sky-500/10 text-sky-700 border-sky-500/20", icon: AlertCircle },
  resolved: { label: "Resolved", className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20", icon: CheckCircle2 },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground border-border", icon: CheckCircle2 },
};

interface Props {
  user: any;
}

export default function SupportCenter({ user }: Props) {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState("");

  const [form, setForm] = useState({ category: "general", priority: "normal", subject: "", description: "" });

  const fullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "Library member";

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    await supabase.rpc("link_my_support_tickets").catch(() => undefined);
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .or(`user_id.eq.${user.id},admission_number.eq.${user.admission_number || "__none__"}`)
      .order("created_at", { ascending: false });
    setTickets(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const openTicket = async (t: any) => {
    setActive(t);
    const { data } = await supabase
      .from("support_ticket_messages")
      .select("*")
      .eq("ticket_id", t.id)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  };

  const submit = async () => {
    if (!form.subject.trim() || !form.description.trim()) {
      toast({ title: "Please add a subject and describe the issue", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.from("support_tickets").insert({
      user_id: user.id,
      admission_number: user.admission_number || null,
      full_name: fullName,
      email: user.email || null,
      student_class: user.student_class || null,
      role: user.role || null,
      category: form.category,
      priority: form.priority,
      subject: form.subject.trim().slice(0, 150),
      description: form.description.trim().slice(0, 2000),
    }).select("id, ticket_number, email, full_name, subject, status").single();
    setSaving(false);
    if (error) {
      toast({ title: "Could not submit ticket", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Ticket submitted",
      description: `Ticket number: ${data.ticket_number}. Save it for future reference.`,
    });
    if (data.email) {
      sendTicketEmail({
        type: "created",
        ticket_id: data.id,
        ticket_number: data.ticket_number,
        to_email: data.email,
        full_name: data.full_name,
        subject: data.subject,
        status: data.status,
      });
    }
    setForm({ category: "general", priority: "normal", subject: "", description: "" });
    load();
  };

  const sendReply = async () => {
    if (!reply.trim() || !active) return;
    const { error } = await supabase.from("support_ticket_messages").insert({
      ticket_id: active.id,
      sender_id: user.id,
      sender_name: fullName,
      is_staff: false,
      message: reply.trim().slice(0, 1000),
    });
    if (error) {
      toast({ title: "Could not send", description: error.message, variant: "destructive" });
      return;
    }
    setReply("");
    openTicket(active);
  };

  return (
    <div className="space-y-5">
      <Card className="border-border/50 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />
        <CardHeader className="pb-3">
          <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
            <LifeBuoy className="h-5 w-5 text-primary" /> Raise a Support Ticket
          </CardTitle>
          <CardDescription className="text-xs">
            Your details are attached automatically — just tell us what went wrong.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3 text-xs">
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Name</p>
              <p className="font-semibold truncate">{fullName}</p>
            </div>
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Admission No.</p>
              <p className="font-semibold truncate">{user?.admission_number || "—"}</p>
            </div>
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Class / Email</p>
              <p className="font-semibold truncate">{user?.student_class || user?.email || "—"}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TICKET_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Subject</Label>
            <Input value={form.subject} maxLength={150} placeholder="Short summary of the issue"
              onChange={(e) => setForm({ ...form, subject: e.target.value })} className="h-10" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Describe the issue</Label>
            <Textarea value={form.description} maxLength={2000} rows={4}
              placeholder="Give as much detail as possible (book name, accession number, date, what happened)…"
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <Button onClick={submit} disabled={saving} className="w-full gradient-primary border-0 text-primary-foreground font-semibold h-11">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Submit Ticket
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> My Tickets</CardTitle>
          <CardDescription className="text-xs">Track the status of everything you've reported</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></div>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No tickets yet — you're all good!</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {tickets.map(t => {
                const meta = statusMeta[t.status] || statusMeta.open;
                const Icon = meta.icon;
                return (
                  <button key={t.id} onClick={() => openTicket(t)}
                    className="text-left p-4 rounded-xl border border-border/50 bg-card hover:shadow-md hover:border-primary/30 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[10px] text-primary font-bold">{t.ticket_number || "—"}</p>
                        <p className="font-semibold text-sm truncate">{t.subject}</p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${meta.className}`}>
                        <Icon className="h-3 w-3 mr-1" />{meta.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5">{t.description}</p>
                    <p className="text-[10px] text-muted-foreground/80 mt-2">{new Date(t.created_at).toLocaleString()}</p>
                    {t.admin_response && (
                      <div className="mt-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-xs text-primary">
                        <span className="font-bold">Library: </span>{t.admin_response}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-lg max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base pr-6">{active?.subject}</DialogTitle>
          </DialogHeader>
          {active && (
            <div className="space-y-3">
              {active.ticket_number && (
                <p className="text-xs font-mono font-bold text-primary">Ticket {active.ticket_number}</p>
              )}
              <Badge variant="outline" className={`text-[10px] ${(statusMeta[active.status] || statusMeta.open).className}`}>
                {(statusMeta[active.status] || statusMeta.open).label}
              </Badge>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{active.description}</p>
              <div className="space-y-2 border-t pt-3">
                {messages.length === 0 && <p className="text-xs text-muted-foreground">No replies yet.</p>}
                {messages.map(m => (
                  <div key={m.id} className={`rounded-lg px-3 py-2 text-xs ${m.is_staff ? "bg-primary/10 border border-primary/20" : "bg-muted"}`}>
                    <p className="font-semibold text-[11px]">{m.is_staff ? "Library Team" : m.sender_name || "You"}</p>
                    <p className="whitespace-pre-wrap mt-0.5">{m.message}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Add a reply…" className="h-10" />
                <Button onClick={sendReply} size="icon" className="h-10 w-10 shrink-0"><Send className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
