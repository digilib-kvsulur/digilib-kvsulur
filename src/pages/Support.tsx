import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LifeBuoy, Send, Loader2, CheckCircle2, ArrowLeft, BadgeCheck, Search } from "lucide-react";
import { TICKET_CATEGORIES, statusMeta } from "@/components/support/SupportCenter";
import { sendTicketEmail } from "@/lib/ticketEmail";

export default function Support() {
  const { toast } = useToast();
  const [admission, setAdmission] = useState("");
  const [matched, setMatched] = useState<{ full_name: string; student_class: string | null; role: string | null } | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [submittedNo, setSubmittedNo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "", email: "", student_class: "", category: "general", priority: "normal", subject: "", description: "",
  });

  const [trackNo, setTrackNo] = useState("");
  const [trackAdm, setTrackAdm] = useState("");
  const [tracking, setTracking] = useState(false);
  const [tracked, setTracked] = useState<any | null>(null);

  const lookup = async (value: string) => {
    setAdmission(value);
    setMatched(null);
    if (value.trim().length < 4) return;
    setLookingUp(true);
    const { data } = await supabase.rpc("lookup_member_by_admission", { p_admission: value.trim() });
    setLookingUp(false);
    const row = Array.isArray(data) ? data[0] : null;
    if (row) {
      setMatched(row as any);
      setForm((f) => ({
        ...f,
        full_name: (row as any).full_name || f.full_name,
        student_class: (row as any).student_class || f.student_class,
      }));
    }
  };

  const submit = async () => {
    if (!form.full_name.trim() || !form.subject.trim() || !form.description.trim()) {
      toast({ title: "Please fill your name, subject and issue details", variant: "destructive" });
      return;
    }
    if (!admission.trim()) {
      toast({ title: "Admission number required", description: "Needed to track your ticket later.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.rpc("submit_public_support_ticket", {
      p_admission: admission.trim(),
      p_full_name: form.full_name.trim().slice(0, 120),
      p_email: form.email.trim().slice(0, 255) || null,
      p_student_class: form.student_class.trim() || null,
      p_role: matched?.role || null,
      p_category: form.category,
      p_priority: form.priority,
      p_subject: form.subject.trim().slice(0, 150),
      p_description: form.description.trim().slice(0, 2000),
    });
    setSaving(false);
    if (error) {
      toast({ title: "Could not submit", description: error.message, variant: "destructive" });
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    setSubmittedNo(row?.ticket_number || null);
    if (form.email.trim() && row) {
      sendTicketEmail({
        type: "created",
        ticket_id: row.id,
        ticket_number: row.ticket_number,
        to_email: form.email.trim(),
        full_name: form.full_name.trim(),
        subject: form.subject.trim(),
        status: "open",
      });
    }
  };

  const track = async () => {
    if (!trackNo.trim() || !trackAdm.trim()) {
      toast({ title: "Enter ticket number and admission number", variant: "destructive" });
      return;
    }
    setTracking(true);
    setTracked(null);
    const { data, error } = await supabase.rpc("lookup_ticket_status", {
      p_ticket_number: trackNo.trim(),
      p_admission: trackAdm.trim(),
    });
    setTracking(false);
    if (error) {
      toast({ title: "Lookup failed", description: error.message, variant: "destructive" });
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      toast({ title: "Not found", description: "Check the ticket number and admission number.", variant: "destructive" });
      return;
    }
    setTracked(row);
  };

  const StatusIcon = tracked ? statusMeta[tracked.status]?.icon : null;

  return (
    <main className="min-h-screen bg-background animate-in fade-in duration-300">
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-14">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        <div className="text-center mb-7">
          <div className="w-14 h-14 rounded-2xl gradient-primary mx-auto flex items-center justify-center mb-3">
            <LifeBuoy className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground">Library Help & Support</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Submit a ticket or check status with your ticket number — no login required.
          </p>
        </div>

        <Tabs defaultValue="submit" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="submit">Submit ticket</TabsTrigger>
            <TabsTrigger value="track">Track status</TabsTrigger>
          </TabsList>

          <TabsContent value="submit">
            {submittedNo ? (
              <Card className="border-emerald-500/30">
                <CardContent className="p-8 text-center space-y-3">
                  <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
                  <h2 className="text-lg font-bold">Ticket submitted</h2>
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 inline-block">
                    <p className="text-[10px] uppercase tracking-wide text-emerald-700 font-semibold">Your ticket number</p>
                    <p className="text-2xl font-black text-emerald-800 tracking-wide font-mono">{submittedNo}</p>
                  </div>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Save this number. Use it with your admission number on the <strong>Track status</strong> tab anytime.
                    {form.email ? " A confirmation email has been sent." : " Add an email next time for updates by mail."}
                  </p>
                  <Button
                    onClick={() => {
                      setSubmittedNo(null);
                      setForm({ ...form, subject: "", description: "" });
                    }}
                    variant="outline"
                  >
                    Raise another ticket
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/50 overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Tell us about the issue</CardTitle>
                  <CardDescription className="text-xs">
                    Enter your admission number — if you have an account, the ticket is linked automatically.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Admission number *</Label>
                    <div className="relative">
                      <Input value={admission} onChange={(e) => lookup(e.target.value)} maxLength={20} placeholder="e.g. 12345" className="h-11 pr-10" />
                      {lookingUp && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                      {matched && !lookingUp && <BadgeCheck className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />}
                    </div>
                    {matched && (
                      <p className="text-[11px] text-emerald-600 font-medium">
                        Matched: {matched.full_name}{matched.student_class ? ` · Class ${matched.student_class}` : ""}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Full name *</Label>
                      <Input value={form.full_name} maxLength={120} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="h-11" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Class</Label>
                      <Input value={form.student_class} maxLength={20} onChange={(e) => setForm({ ...form, student_class: e.target.value })} className="h-11" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Email (for updates)</Label>
                    <Input type="email" value={form.email} maxLength={255} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-11" placeholder="you@example.com" />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Category</Label>
                      <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>{TICKET_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Priority</Label>
                      <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Subject *</Label>
                    <Input value={form.subject} maxLength={150} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="h-11" placeholder="Short summary" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Describe the issue *</Label>
                    <Textarea value={form.description} maxLength={2000} rows={4} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>

                  <Button className="w-full h-11" onClick={submit} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                    Submit ticket
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="track">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Search className="h-5 w-5" /> Track ticket status</CardTitle>
                <CardDescription className="text-xs">
                  Enter the ticket number you received and your admission number.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Ticket number</Label>
                    <Input value={trackNo} onChange={(e) => setTrackNo(e.target.value.toUpperCase())} placeholder="TKT-1001" className="h-11 font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Admission number</Label>
                    <Input value={trackAdm} onChange={(e) => setTrackAdm(e.target.value)} placeholder="Your admission no." className="h-11" />
                  </div>
                </div>
                <Button className="w-full h-11" onClick={track} disabled={tracking}>
                  {tracking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                  Check status
                </Button>

                {tracked && (
                  <div className="rounded-xl border p-4 space-y-3 bg-muted/20">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-mono font-bold text-lg">{tracked.ticket_number}</p>
                      <Badge className={statusMeta[tracked.status]?.className || ""}>
                        {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
                        {statusMeta[tracked.status]?.label || tracked.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{tracked.subject}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {tracked.full_name} · Updated {new Date(tracked.updated_at).toLocaleString()}
                      </p>
                    </div>
                    {tracked.admin_response && (
                      <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm">
                        <p className="text-[10px] uppercase font-bold text-primary mb-1">Library response</p>
                        {tracked.admin_response}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
