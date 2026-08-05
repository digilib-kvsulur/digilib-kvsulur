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
import { LifeBuoy, Send, Loader2, CheckCircle2, ArrowLeft, BadgeCheck } from "lucide-react";
import { TICKET_CATEGORIES } from "@/components/support/SupportCenter";

export default function Support() {
  const { toast } = useToast();
  const [admission, setAdmission] = useState("");
  const [matched, setMatched] = useState<{ full_name: string; student_class: string | null; role: string | null } | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", student_class: "", category: "general", priority: "normal", subject: "", description: "" });

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
      setForm(f => ({ ...f, full_name: (row as any).full_name || f.full_name, student_class: (row as any).student_class || f.student_class }));
    }
  };

  const submit = async () => {
    if (!form.full_name.trim() || !form.subject.trim() || !form.description.trim()) {
      toast({ title: "Please fill your name, subject and issue details", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("support_tickets").insert({
      admission_number: admission.trim() || null,
      full_name: form.full_name.trim().slice(0, 120),
      email: form.email.trim().slice(0, 255) || null,
      student_class: form.student_class.trim() || null,
      role: matched?.role || null,
      category: form.category,
      priority: form.priority,
      subject: form.subject.trim().slice(0, 150),
      description: form.description.trim().slice(0, 2000),
    });
    setSaving(false);
    if (error) { toast({ title: "Could not submit", description: error.message, variant: "destructive" }); return; }
    setSubmitted(true);
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-14">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <div className="text-center mb-7">
          <div className="w-14 h-14 rounded-2xl gradient-primary mx-auto flex items-center justify-center mb-3">
            <LifeBuoy className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground">Library Help & Support</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Facing a problem with a book, your account or the portal? Tell us and the library team will get back to you.
          </p>
        </div>

        {submitted ? (
          <Card className="border-emerald-500/30">
            <CardContent className="p-8 text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
              <h2 className="text-lg font-bold">Ticket submitted</h2>
              <p className="text-sm text-muted-foreground">
                Our librarian will review your request. Sign in to your dashboard to follow the conversation.
              </p>
              <Button onClick={() => { setSubmitted(false); setForm({ ...form, subject: "", description: "" }); }} variant="outline">
                Raise another ticket
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Tell us about the issue</CardTitle>
              <CardDescription className="text-xs">Enter your admission number and we'll fill in the rest automatically.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Admission number</Label>
                <div className="relative">
                  <Input value={admission} onChange={(e) => lookup(e.target.value)} maxLength={20} placeholder="e.g. 12345" className="h-11 pr-10" />
                  {lookingUp && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                  {matched && !lookingUp && <BadgeCheck className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />}
                </div>
                {matched && <p className="text-[11px] text-emerald-600 font-medium">Matched: {matched.full_name}{matched.student_class ? ` · Class ${matched.student_class}` : ""}</p>}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Full name</Label>
                  <Input value={form.full_name} maxLength={120} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Class</Label>
                  <Input value={form.student_class} maxLength={20} onChange={(e) => setForm({ ...form, student_class: e.target.value })} className="h-11" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Email (so we can reply)</Label>
                <Input type="email" value={form.email} maxLength={255} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-11" placeholder="you@example.com" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>{TICKET_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
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
                <Label className="text-xs">Subject</Label>
                <Input value={form.subject} maxLength={150} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="h-11" placeholder="Short summary" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Describe the issue</Label>
                <Textarea rows={5} value={form.description} maxLength={2000} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Book name, accession number, date, and what went wrong…" />
              </div>

              <Button onClick={submit} disabled={saving} className="w-full h-12 gradient-primary border-0 text-primary-foreground font-bold">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}Submit Ticket
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
