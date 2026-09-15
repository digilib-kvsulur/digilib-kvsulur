import { useEffect, useMemo, useState } from "react";
import {
  Mail, Send, CheckCircle2, Eye, History, Users, BookOpen,
  Bell, Award, BookMarked, AlertCircle, Newspaper, Coffee,
  Calendar, ChevronRight, X, Filter,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────
type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  student_class: string | null;
  admission_number: string | null;
  email: string | null;
  notification_email: string | null;
  notification_email_confirmed_at: string | null;
};

type Campaign = {
  id: string;
  preset: string;
  subject: string;
  recipient_count: number;
  created_at: string;
};

// ─── Template Definitions ────────────────────────────────────────────────────
interface Template {
  id: string;
  label: string;
  description: string;
  subject: string;
  previewHtml: (name: string, note: string) => string;
  icon: React.ElementType;
  color: string;
}

const TEMPLATES: Template[] = [
  {
    id: "library_update",
    label: "Library Update",
    description: "General news or announcement from the library",
    subject: "KV Sulur Library — Important Update",
    icon: Bell,
    color: "text-blue-500",
    previewHtml: (name, note) => `
      <p>Dear <strong>${name}</strong>,</p>
      <p>There is a new update from the <strong>PM SHRI KV AFS Sulur Digital Library</strong>.</p>
      ${note ? `<p>${note}</p>` : ""}
      <p>— KV Sulur Library Team</p>`,
  },
  {
    id: "due_reminder",
    label: "Book Return Reminder",
    description: "Remind students to return or renew overdue books",
    subject: "Reminder: Library Book Return Due",
    icon: BookOpen,
    color: "text-amber-500",
    previewHtml: (name, note) => `
      <p>Dear <strong>${name}</strong>,</p>
      <p>This is a friendly reminder that you have <strong>one or more library books due for return</strong>.</p>
      <p>Please return or renew them to avoid fines. You can renew online through the Digital Library.</p>
      ${note ? `<p>${note}</p>` : ""}
      <p>— KV Sulur Library Team</p>`,
  },
  {
    id: "event_invite",
    label: "Event Invitation",
    description: "Invite students to an upcoming library event or activity",
    subject: "You're Invited: KV Sulur Library Event",
    icon: Calendar,
    color: "text-purple-500",
    previewHtml: (name, note) => `
      <p>Dear <strong>${name}</strong>,</p>
      <p>We are excited to invite you to an <strong>upcoming library event</strong>!</p>
      ${note ? `<p>${note}</p>` : "<p>Please check the Digital Library for full event details and timing.</p>"}
      <p>We look forward to seeing you there!</p>
      <p>— KV Sulur Library Team</p>`,
  },
  {
    id: "certificate_notice",
    label: "Certificate Available",
    description: "Notify that a library certificate has been issued",
    subject: "Your Library Certificate is Ready",
    icon: Award,
    color: "text-yellow-500",
    previewHtml: (name, note) => `
      <p>Dear <strong>${name}</strong>,</p>
      <p>Great news! A <strong>library certificate</strong> has been issued for you.</p>
      <p>Sign in to the Digital Library to view and download your certificate.</p>
      ${note ? `<p>${note}</p>` : ""}
      <p>— KV Sulur Library Team</p>`,
  },
  {
    id: "welcome",
    label: "Welcome",
    description: "Warmly welcome a newly approved student member",
    subject: "Welcome to KV Sulur Digital Library!",
    icon: Coffee,
    color: "text-emerald-500",
    previewHtml: (name, note) => `
      <p>Dear <strong>${name}</strong>,</p>
      <p>Welcome to the <strong>PM SHRI KV AFS Sulur Digital Library</strong>! 🎉</p>
      <p>Your account has been approved. You can now borrow books, join quizzes, earn badges, and much more.</p>
      ${note ? `<p>${note}</p>` : ""}
      <p>Happy reading!</p>
      <p>— KV Sulur Library Team</p>`,
  },
  {
    id: "fine_notice",
    label: "Fine Notice",
    description: "Inform a student of an outstanding library fine",
    subject: "Outstanding Library Fine — Action Required",
    icon: AlertCircle,
    color: "text-red-500",
    previewHtml: (name, note) => `
      <p>Dear <strong>${name}</strong>,</p>
      <p>Our records show that you have an <strong>outstanding library fine</strong>.</p>
      <p>Please clear the fine at the library counter or online at the earliest to continue borrowing.</p>
      ${note ? `<p>${note}</p>` : ""}
      <p>— KV Sulur Library Team</p>`,
  },
  {
    id: "book_available",
    label: "Book Now Available",
    description: "Tell a student their reserved/requested book is ready for pickup",
    subject: "Your Requested Book is Now Available",
    icon: BookMarked,
    color: "text-teal-500",
    previewHtml: (name, note) => `
      <p>Dear <strong>${name}</strong>,</p>
      <p>Good news! A book you requested is now <strong>available for pickup</strong> at the library.</p>
      <p>Please collect it within <strong>2 working days</strong> to avoid losing your reservation.</p>
      ${note ? `<p>${note}</p>` : ""}
      <p>— KV Sulur Library Team</p>`,
  },
  {
    id: "quiz_result",
    label: "Quiz Result / Achievement",
    description: "Share a quiz score, leaderboard position, or badge earned",
    subject: "Your Quiz Result — KV Sulur Library",
    icon: CheckCircle2,
    color: "text-indigo-500",
    previewHtml: (name, note) => `
      <p>Dear <strong>${name}</strong>,</p>
      <p>Results are in for a recent <strong>Library Quiz</strong>!</p>
      ${note ? `<p>${note}</p>` : "<p>Log in to the Digital Library to see your score and leaderboard position.</p>"}
      <p>Keep reading and keep participating — every quiz earns you points!</p>
      <p>— KV Sulur Library Team</p>`,
  },
  {
    id: "book_club",
    label: "Book Club Update",
    description: "Send a book club meeting notice or chapter discussion reminder",
    subject: "Book Club Update — KV Sulur Library",
    icon: Users,
    color: "text-orange-500",
    previewHtml: (name, note) => `
      <p>Dear <strong>${name}</strong>,</p>
      <p>Your <strong>Library Book Club</strong> has a new update!</p>
      ${note ? `<p>${note}</p>` : "<p>Check the Digital Library for the latest discussion schedule and reading list.</p>"}
      <p>— KV Sulur Library Team</p>`,
  },
  {
    id: "newsletter",
    label: "Monthly Newsletter",
    description: "Send the library's monthly digest / newsletter",
    subject: "KV Sulur Library — Monthly Newsletter",
    icon: Newspaper,
    color: "text-pink-500",
    previewHtml: (name, note) => `
      <p>Dear <strong>${name}</strong>,</p>
      <p>Here is the latest edition of the <strong>KV Sulur Library Newsletter</strong>!</p>
      ${note ? `<p>${note}</p>` : "<p>Discover new arrivals, upcoming events, quiz toppers, and more inside.</p>"}
      <p>Happy reading!</p>
      <p>— KV Sulur Library Team</p>`,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PREVIEW_NAME = "Arjun Kumar";

function buildFullPreviewHtml(template: Template, note: string): string {
  const body = template.previewHtml(PREVIEW_NAME, note);
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <div style="background:#1a56db;padding:20px 24px;">
        <p style="color:#fff;margin:0;font-weight:700;font-size:16px;">📚 PM SHRI KV AFS Sulur — Digital Library</p>
      </div>
      <div style="padding:24px;background:#fff;color:#111;font-size:14px;line-height:1.7;">
        ${body}
      </div>
      <div style="background:#f9fafb;padding:12px 24px;border-top:1px solid #e5e7eb;font-size:11px;color:#6b7280;text-align:center;">
        PM SHRI Kendriya Vidyalaya AFS Sulur · KV Digital Library Management System
      </div>
    </div>`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function EmailCampaignManager() {
  const { toast } = useToast();

  // Data
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  // Selection / filter
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");

  // Compose
  const [activeTemplate, setActiveTemplate] = useState<Template>(TEMPLATES[0]);
  const [customNote, setCustomNote] = useState("");
  const [sending, setSending] = useState(false);

  // UI tab
  const [tab, setTab] = useState<"compose" | "history">("compose");

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadProfiles = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, student_class, admission_number, email, notification_email, notification_email_confirmed_at")
      .eq("is_approved", true)
      .order("first_name");
    setProfiles((data as Profile[]) || []);
  };

  const loadCampaigns = async () => {
    const { data } = await supabase
      .from("email_campaigns")
      .select("id, preset, subject, recipient_count, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setCampaigns(data as Campaign[]);
  };

  useEffect(() => {
    loadProfiles();
    loadCampaigns();
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const verifiedProfiles = profiles.filter(
    (p) => Boolean(p.notification_email || p.email),
  );

  const classes = useMemo(
    () => Array.from(new Set(verifiedProfiles.map((p) => p.student_class).filter(Boolean))).sort() as string[],
    [verifiedProfiles],
  );

  const visible = useMemo(
    () =>
      verifiedProfiles.filter((p) => {
        const q = search.toLowerCase();
        const matchText = `${p.first_name} ${p.last_name} ${p.admission_number} ${p.student_class}`.toLowerCase().includes(q);
        const matchClass = classFilter === "all" || p.student_class === classFilter;
        return matchText && matchClass;
      }),
    [verifiedProfiles, search, classFilter],
  );

  // ── Handlers ───────────────────────────────────────────────────────────────
  const toggle = (id: string) =>
    setSelected((old) => {
      const next = new Set(old);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selectAllVisible = () => setSelected(new Set(visible.map((p) => p.id)));
  const clearSelection = () => setSelected(new Set());

  const handleSend = async () => {
    if (!selected.size) {
      return toast({ title: "Select recipients", description: "Choose at least one verified email recipient.", variant: "destructive" });
    }
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-email-campaign", {
        body: { recipientIds: [...selected], preset: activeTemplate.id, customMessage: customNote },
      });

      if (error) {
        let errorMsg = error.message;
        if ((error as any).context) {
          try {
            const body = await (error as any).context.json();
            if (body?.error) errorMsg = body.error;
          } catch (_) {}
        }
        if (errorMsg.includes("Failed to send a request") || errorMsg.includes("CORS") || errorMsg.includes("preflight")) {
          errorMsg = "The Edge Function 'send-email-campaign' is not deployed on your Supabase project (bgwvkpcqmroaokkmpwmb). Please deploy it using CLI: supabase functions deploy send-email-campaign";
        }
        throw new Error(errorMsg);
      }

      toast({
        title: "Email campaign sent ✉️",
        description: `${data?.sent ?? 0} email(s) sent successfully. ${data?.skipped ? `${data.skipped} skipped.` : ""}`,
      });

      clearSelection();
      setCustomNote("");
      loadCampaigns();
    } catch (e: any) {
      toast({
        title: "Email not sent",
        description: e.message || "Failed to send email campaign.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Mail className="h-6 w-6 text-primary" /> Email Centre
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Send branded email campaigns to verified library members using ready-made templates.
          &nbsp;<span className="font-medium text-foreground">{verifiedProfiles.length}</span> of{" "}
          {profiles.length} approved users have a confirmed update email.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="mb-4">
          <TabsTrigger value="compose" className="gap-1.5">
            <Send className="h-4 w-4" /> Compose
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-4 w-4" /> Campaign History
          </TabsTrigger>
        </TabsList>

        {/* ── Compose Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="compose" className="space-y-6 mt-0">
          {/* Template Gallery */}
          <div>
            <Label className="text-base font-semibold mb-3 block">1. Choose a Template</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {TEMPLATES.map((t) => {
                const Icon = t.icon;
                const active = activeTemplate.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTemplate(t)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all text-xs font-medium cursor-pointer ${
                      active
                        ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary"
                        : "border-border/60 hover:border-primary/40 hover:bg-muted/40"
                    }`}
                  >
                    <div className={`p-2 rounded-full ${active ? "bg-primary/10" : "bg-muted"}`}>
                      <Icon className={`h-5 w-5 ${active ? "text-primary" : t.color}`} />
                    </div>
                    <span className="leading-tight text-foreground">{t.label}</span>
                    {active && <Badge variant="default" className="text-[9px] px-1.5 py-0 h-4">Selected</Badge>}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="font-medium">{activeTemplate.label}:</span> {activeTemplate.description}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recipients */}
            <div className="lg:col-span-1 space-y-3">
              <Label className="text-base font-semibold block">2. Select Recipients</Label>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name / admission / class…"
                    className="pr-8 h-9"
                  />
                  {search && (
                    <button className="absolute right-2 top-2 text-muted-foreground hover:text-foreground" onClick={() => setSearch("")}>
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger className="w-28 h-9">
                    <Filter className="h-3.5 w-3.5 mr-1 shrink-0" />
                    <SelectValue placeholder="Class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All classes</SelectItem>
                    {classes.map((c) => (
                      <SelectItem key={c} value={c}>Class {c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
                <span>Showing {visible.length} verified · {selected.size} selected</span>
                <div className="flex gap-2">
                  <button className="text-primary hover:underline" onClick={selectAllVisible}>Select shown</button>
                  {selected.size > 0 && (
                    <button className="text-destructive hover:underline" onClick={clearSelection}>Clear</button>
                  )}
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-lg border divide-y divide-border/50 bg-background">
                {visible.length === 0 && (
                  <p className="p-6 text-center text-sm text-muted-foreground">No verified email users found.</p>
                )}
                {visible.map((p) => (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                      className="rounded text-primary accent-primary"
                    />
                    <span className="flex-1 min-w-0">
                      <span className="font-medium text-foreground">
                        {p.first_name} {p.last_name}
                      </span>
                      <span className="text-muted-foreground text-xs ml-1">
                        {p.admission_number ? `· ${p.admission_number}` : ""}{" "}
                        {p.student_class ? `· Class ${p.student_class}` : ""}
                      </span>
                    </span>
                    <Badge variant="outline" className="text-[9px] px-1.5 shrink-0">
                      <CheckCircle2 className="mr-0.5 h-2.5 w-2.5 text-emerald-600" />
                      Verified
                    </Badge>
                  </label>
                ))}
              </div>
            </div>

            {/* Compose + Preview */}
            <div className="lg:col-span-2 space-y-4">
              <Label className="text-base font-semibold block">3. Compose &amp; Preview</Label>

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Subject line</Label>
                <Input value={activeTemplate.subject} readOnly className="bg-muted/30 text-sm" />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Optional personal note <span className="text-[10px]">(appended to the template body · max 2 000 chars)</span>
                </Label>
                <Textarea
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder="Add a date, specific instructions, or a personal message…"
                />
              </div>

              {/* Live HTML Preview */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-xs text-muted-foreground">Live email preview</Label>
                </div>
                <div className="rounded-xl border border-border/60 overflow-hidden shadow-sm">
                  <iframe
                    title="Email preview"
                    className="w-full"
                    style={{ minHeight: 320, border: "none" }}
                    srcDoc={`<!doctype html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:16px;background:#f3f4f6;">${buildFullPreviewHtml(activeTemplate, customNote)}</body></html>`}
                  />
                </div>
              </div>

              <Button
                className="w-full gradient-primary border-0 gap-2"
                onClick={handleSend}
                disabled={sending || selected.size === 0}
              >
                <Send className="h-4 w-4" />
                {sending ? "Sending…" : `Send "${activeTemplate.label}" to ${selected.size} recipient${selected.size !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* ── History Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="history" className="mt-0">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4 text-primary" /> Sent Campaigns
              </CardTitle>
              <CardDescription>Last 20 email campaigns dispatched from this library</CardDescription>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">No campaigns sent yet.</p>
              ) : (
                <div className="space-y-2">
                  {campaigns.map((c) => {
                    const tpl = TEMPLATES.find((t) => t.id === c.preset);
                    const Icon = tpl?.icon ?? Mail;
                    return (
                      <div
                        key={c.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-transparent hover:border-border/40 transition-all"
                      >
                        <div className={`p-1.5 rounded-full bg-white border border-border/50 shrink-0`}>
                          <Icon className={`h-4 w-4 ${tpl?.color ?? "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{c.subject}</p>
                          <p className="text-xs text-muted-foreground">
                            {tpl?.label ?? c.preset} · {c.recipient_count} recipient{c.recipient_count !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground shrink-0">
                          {new Date(c.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
