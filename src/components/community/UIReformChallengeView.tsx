import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Palette, Sparkles, Trophy, Plus, Clock, ExternalLink, Layers,
  Lightbulb, Award, ImagePlus, LinkIcon, Brush, Smartphone, Monitor,
  LayoutDashboard, BookOpen, Gamepad2, Users, ChevronRight, Lock, Star
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Campaign {
  id: string;
  title: string;
  description: string;
  theme: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  status: "scheduled" | "active" | "ended";
  reward_points: number;
  rules: string;
}

interface Submission {
  id: string;
  campaign_id: string;
  student_id: string;
  screen_name: string;
  title: string;
  problem_statement: string;
  proposed_solution: string;
  mockup_url?: string;
  status: "pending" | "reviewed" | "shortlisted" | "winner" | "implemented" | "rejected";
  admin_feedback?: string;
  points_awarded: number;
  upvotes: number;
  created_at: string;
  student?: { first_name: string; last_name: string; student_class: string };
}

interface UIReformChallengeViewProps {
  userId?: string;
  onOpenCatalog?: () => void;
}

// ── Focus area cards ──────────────────────────────────────────────────────────
const FOCUS_AREAS = [
  { id: "Student Dashboard",                icon: LayoutDashboard, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950",  title: "Student Dashboard",           desc: "Home widgets, XP cards, quick-stats & gamification" },
  { id: "Books Catalog",                    icon: BookOpen,         color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950", title: "Books Catalog",               desc: "Filters, card grid, book viewer & search UX" },
  { id: "Quizzes & Gamification",           icon: Gamepad2,         color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950",  title: "Quizzes & Gamification",      desc: "Live quiz UI, badges, leaderboards & challenge cards" },
  { id: "Mobile Bottom Bar & Menus",        icon: Smartphone,       color: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-950",    title: "Mobile Navigation",           desc: "Bottom bar, drawer menus & thumb-friendly gestures" },
  { id: "Community & Clubs",                icon: Users,            color: "text-pink-600 dark:text-pink-400",     bg: "bg-pink-50 dark:bg-pink-950",      title: "Community & Clubs",           desc: "Feed, book clubs, forum threads & social cards" },
  { id: "Admin Dashboard",                  icon: Monitor,          color: "text-sky-600 dark:text-sky-400",       bg: "bg-sky-50 dark:bg-sky-950",        title: "Admin Dashboard",             desc: "Analytics, ticket manager & content panels" },
  { id: "Book Reader & Details",            icon: BookOpen,         color: "text-teal-600 dark:text-teal-400",     bg: "bg-teal-50 dark:bg-teal-950",      title: "Book Details & E-Reader",     desc: "Immersive detail pages, reviews & reading tracker" },
  { id: "Other UI Feature",                 icon: Brush,            color: "text-rose-600 dark:text-rose-400",     bg: "bg-rose-50 dark:bg-rose-950",      title: "Other UI / Design",           desc: "Color themes, accessibility, illustrations & micro-animations" },
];

// ── Visual style tags ─────────────────────────────────────────────────────────
const STYLE_TAGS = [
  "Minimalist", "Dark Mode", "Glassmorphism", "Neumorphism", "Card-based",
  "Sidebar-free", "Floating FAB", "Tabbed Layout", "Full-bleed Hero",
  "Micro-animations", "High Contrast", "Illustration-first",
];

// ── Color palette presets ─────────────────────────────────────────────────────
const PALETTE_PRESETS = [
  { name: "Ocean",    colors: ["#0ea5e9","#38bdf8","#0284c7","#f0f9ff"] },
  { name: "Forest",  colors: ["#16a34a","#4ade80","#15803d","#f0fdf4"] },
  { name: "Sunset",  colors: ["#f97316","#fb923c","#ea580c","#fff7ed"] },
  { name: "Violet",  colors: ["#7c3aed","#a78bfa","#5b21b6","#f5f3ff"] },
  { name: "Rose",    colors: ["#e11d48","#fb7185","#be123c","#fff1f2"] },
  { name: "Slate",   colors: ["#334155","#64748b","#1e293b","#f8fafc"] },
];

// ── Countdown hook ────────────────────────────────────────────────────────────
function useCountdown(targetDate: string | null) {
  const [diff, setDiff] = useState(0);
  useEffect(() => {
    if (!targetDate) return;
    const tick = () => setDiff(Math.max(0, new Date(targetDate).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  const total = Math.floor(diff / 1000);
  return {
    days:    Math.floor(total / 86400),
    hours:   Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    expired: diff === 0,
  };
}

export default function UIReformChallengeView({ userId }: UIReformChallengeViewProps) {
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [mySubmissions, setMySubmissions] = useState<Submission[]>([]);
  const [showcaseSubmissions, setShowcaseSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Visual submission form state ───────────────────────────────────────────
  const [selectedFocusArea, setSelectedFocusArea] = useState(FOCUS_AREAS[0]);
  const [title, setTitle] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [proposedSolution, setProposedSolution] = useState("");
  const [mockupUrl, setMockupUrl] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedPalette, setSelectedPalette] = useState<string | null>(null);
  const [designApproach, setDesignApproach] = useState<"wireframe" | "mockup" | "description" | "">("");
  const [inspirationLinks, setInspirationLinks] = useState<string[]>(["", ""]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const countdown = useCountdown(campaign?.starts_at ?? null);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: cData, error: cErr } = await supabase
        .from("ui_reform_campaigns" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);

      if (!cErr && cData && (cData as unknown as Campaign[]).length > 0) {
        const camp = (cData as unknown as Campaign[])[0];
        setCampaign(camp);

        if (userId) {
          const { data: myData } = await supabase
            .from("ui_reform_submissions" as never)
            .select("*")
            .eq("campaign_id", camp.id)
            .eq("student_id", userId)
            .order("created_at", { ascending: false });
          if (myData) setMySubmissions(myData as unknown as Submission[]);
        }

        const { data: showData } = await supabase
          .from("ui_reform_submissions" as never)
          .select("*, profiles:student_id(first_name, last_name, student_class)")
          .eq("campaign_id", camp.id)
          .in("status", ["shortlisted", "winner", "implemented", "reviewed"])
          .order("points_awarded", { ascending: false })
          .limit(15);

        if (showData) {
          const rawList = showData as unknown as Array<Submission & { profiles?: Submission["student"] }>;
          setShowcaseSubmissions(rawList.map((s) => ({ ...s, student: s.profiles })));
        }
      }
    } catch (e) {
      console.warn("Error loading UI reform campaign:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [userId]);

  // ── Computed state ─────────────────────────────────────────────────────────
  const isLive = campaign && (
    campaign.status === "active" ||
    (campaign.is_active && new Date(campaign.starts_at) <= new Date())
  );
  const isScheduled = campaign && campaign.status === "scheduled" && new Date(campaign.starts_at) > new Date();
  const isEnded = campaign && campaign.status === "ended";
  const canSubmit = isLive && !isScheduled && !isEnded;

  const handleToggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : prev.length < 5 ? [...prev, tag] : prev);
  };

  const handleSubmitProposal = async () => {
    if (!userId) { toast({ title: "Please Log In", variant: "destructive" }); return; }
    if (!canSubmit) {
      toast({ title: "Submissions not open yet", description: "The challenge hasn't started. Check back when it goes live.", variant: "destructive" });
      return;
    }
    if (!title.trim() || !problemStatement.trim() || !proposedSolution.trim()) {
      toast({ title: "Missing Information", description: "Please fill out all required fields.", variant: "destructive" });
      return;
    }
    if (!campaign) return;

    const enrichedSolution = [
      proposedSolution.trim(),
      selectedTags.length > 0 ? `\n\n🎨 Design Style: ${selectedTags.join(", ")}` : "",
      selectedPalette ? `\n🖌️ Color Palette: ${selectedPalette}` : "",
      designApproach ? `\n📐 Approach: ${designApproach.charAt(0).toUpperCase() + designApproach.slice(1)}` : "",
      inspirationLinks.filter(l => l.trim()).length > 0
        ? `\n🔗 Inspiration: ${inspirationLinks.filter(l => l.trim()).join(", ")}`
        : "",
    ].join("");

    setSubmitting(true);
    try {
      const { error } = await supabase.from("ui_reform_submissions" as never).insert([{
        campaign_id: campaign.id,
        student_id: userId,
        screen_name: selectedFocusArea.id,
        title: title.trim(),
        problem_statement: problemStatement.trim(),
        proposed_solution: enrichedSolution,
        mockup_url: mockupUrl.trim() || null,
        status: "pending",
      }] as never);
      if (error) throw error;

      toast({ title: "🎉 Design Proposal Submitted!", description: `Your idea has been received! Earn up to +${campaign.reward_points} XP once reviewed.` });
      setTitle(""); setProblemStatement(""); setProposedSolution(""); setMockupUrl("");
      setSelectedTags([]); setSelectedPalette(null); setDesignApproach("");
      setInspirationLinks(["", ""]);
      setSubmitModalOpen(false);
      loadData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "An error occurred";
      toast({ title: "Submission Failed", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* ── Hero Banner ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 text-white shadow-xl">
        {/* Decorative blobs */}
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-600/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-purple-200 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              <Palette className="h-3.5 w-3.5 text-purple-300" /> UI Reform &amp; Redesign Challenge
            </div>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-none">
              {campaign?.title || "DLMS Redesign Challenge"}
            </h2>
            <p className="text-xs sm:text-sm text-purple-100/80 leading-relaxed">
              Design the future of KV Sulur's library. Submit mockups, wireframes, or visual ideas — the best designs get built into DLMS.
            </p>

            {/* Prize pills */}
            <div className="flex flex-wrap gap-2">
              {[
                { emoji: "🥇", label: "1st", pts: "10,000 XP", cls: "bg-amber-500/20 border-amber-400/40 text-amber-200" },
                { emoji: "🥈", label: "2nd", pts: "7,500 XP",  cls: "bg-slate-400/20 border-slate-300/40 text-slate-200" },
                { emoji: "🥉", label: "3rd", pts: "5,000 XP",  cls: "bg-orange-500/20 border-orange-400/40 text-orange-200" },
                { emoji: "✅", label: "Good Submission", pts: "1,000 XP", cls: "bg-emerald-500/20 border-emerald-400/40 text-emerald-200" },
              ].map(p => (
                <div key={p.label} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold ${p.cls}`}>
                  <span>{p.emoji}</span><span>{p.label}:</span><span className="font-black">{p.pts}</span>
                </div>
              ))}
            </div>

            {/* Scheduled countdown */}
            {isScheduled && !countdown.expired && (
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-200 text-xs font-semibold border border-amber-500/30">
                  <Lock className="h-3.5 w-3.5 text-amber-300" />
                  Opens {new Date(campaign!.starts_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </div>
                <div className="flex items-center gap-1.5">
                  {[
                    { v: countdown.days,    l: "d" },
                    { v: countdown.hours,   l: "h" },
                    { v: countdown.minutes, l: "m" },
                    { v: countdown.seconds, l: "s" },
                  ].map(({ v, l }) => (
                    <div key={l} className="flex flex-col items-center">
                      <span className="font-mono font-black text-white text-base sm:text-lg leading-none">{String(v).padStart(2, "0")}</span>
                      <span className="text-[9px] text-purple-300 font-bold">{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {isEnded && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-500/20 text-slate-300 text-xs font-semibold border border-slate-500/30">
                <Award className="h-3.5 w-3.5" /> Challenge Ended — Winners announced below
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="shrink-0 w-full sm:w-auto">
            {canSubmit ? (
              <Button
                size="lg"
                onClick={() => setSubmitModalOpen(true)}
                className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold rounded-2xl shadow-lg gap-2 text-sm h-12 px-6"
              >
                <Plus className="h-5 w-5" /> Submit Your Design
              </Button>
            ) : isScheduled ? (
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm text-purple-200 font-semibold">
                <Lock className="h-4 w-4 text-amber-300" /> Submissions open when challenge starts
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Focus Area Selector (visual cards) ──────────────────────────────── */}
      <div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5" /> Design Areas — Tap to explore
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {FOCUS_AREAS.map((area) => (
            <button
              key={area.id}
              type="button"
              onClick={() => { setSelectedFocusArea(area); if (canSubmit) setSubmitModalOpen(true); }}
              className="text-left p-4 rounded-2xl border border-border/50 bg-card hover:border-indigo-400/60 hover:shadow-md transition-all group"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${area.bg} transition-transform group-hover:scale-110`}>
                <area.icon className={`h-4.5 w-4.5 ${area.color}`} />
              </div>
              <p className="text-xs font-bold text-foreground leading-tight">{area.title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{area.desc}</p>
              {canSubmit && (
                <div className="flex items-center gap-1 mt-2 text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  Submit idea <ChevronRight className="h-3 w-3" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── My Submissions ───────────────────────────────────────────────────── */}
      {mySubmissions.length > 0 && (
        <Card className="rounded-3xl border border-indigo-200 dark:border-indigo-900/60 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 dark:bg-slate-900/50 pb-3 border-b border-border/40">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" /> My Design Proposals ({mySubmissions.length})
            </CardTitle>
            <CardDescription className="text-xs">Status and review feedback from the Library Admin team.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {mySubmissions.map((sub) => (
              <div key={sub.id} className="p-3.5 rounded-2xl bg-card border border-border/60 space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    {(() => {
                      const area = FOCUS_AREAS.find(a => a.id === sub.screen_name);
                      return area ? (
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${area.bg}`}>
                          <area.icon className={`h-3.5 w-3.5 ${area.color}`} />
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-bold border-indigo-200 text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 shrink-0">
                          {sub.screen_name}
                        </Badge>
                      );
                    })()}
                    <h4 className="text-xs font-bold text-foreground truncate">{sub.title}</h4>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={
                      sub.status === "winner"      ? "bg-amber-500 text-white" :
                      sub.status === "shortlisted" ? "bg-purple-600 text-white" :
                      sub.status === "implemented" ? "bg-emerald-600 text-white" :
                      sub.status === "rejected"    ? "bg-red-500 text-white" :
                      "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }>{sub.status.toUpperCase()}</Badge>
                    {sub.points_awarded > 0 && (
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">+{sub.points_awarded.toLocaleString()} XP</span>
                    )}
                  </div>
                </div>

                {sub.mockup_url && (
                  <a href={sub.mockup_url} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100 transition-colors">
                    <ExternalLink className="h-3 w-3" /> View Mockup / Figma
                  </a>
                )}

                <p className="text-xs text-muted-foreground line-clamp-2">
                  <strong>Reform idea:</strong> {sub.proposed_solution}
                </p>

                {sub.admin_feedback && (
                  <div className="p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs">
                    <p className="font-bold text-indigo-950 dark:text-indigo-200 mb-0.5">📝 Admin Feedback:</p>
                    <p className="text-indigo-900/80 dark:text-indigo-300/80">{sub.admin_feedback}</p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Community Showcase ───────────────────────────────────────────────── */}
      <Card className="rounded-3xl border border-border/70 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50 dark:bg-slate-900/50 pb-3 border-b border-border/40">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" /> Top Redesign Concepts &amp; Winners
          </CardTitle>
          <CardDescription className="text-xs">Student designs shortlisted or chosen to be implemented in DLMS.</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {showcaseSubmissions.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950 mx-auto flex items-center justify-center">
                <Palette className="h-8 w-8 text-indigo-400" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground">No shortlisted ideas yet</p>
              <p className="text-xs text-muted-foreground">Be the first to submit a redesign concept!</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {showcaseSubmissions.map((sub) => {
                const area = FOCUS_AREAS.find(a => a.id === sub.screen_name);
                return (
                  <div key={sub.id} className="p-4 rounded-2xl bg-card border border-border/60 hover:border-indigo-300/60 transition-colors shadow-xs space-y-2.5 group">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {area && (
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${area.bg}`}>
                            <area.icon className={`h-3.5 w-3.5 ${area.color}`} />
                          </div>
                        )}
                        <Badge variant="outline" className="text-[10px] font-bold border-indigo-200 text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40">
                          {sub.screen_name}
                        </Badge>
                      </div>
                      <Badge className={
                        sub.status === "winner"      ? "bg-amber-500 text-white" :
                        sub.status === "implemented" ? "bg-emerald-600 text-white" :
                        "bg-purple-600 text-white"
                      }>{sub.status === "winner" ? "🏆 WINNER" : sub.status.toUpperCase()}</Badge>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-foreground leading-snug">{sub.title}</h4>
                      {sub.points_awarded > 0 && (
                        <p className="text-[11px] font-black text-amber-600 dark:text-amber-400 mt-0.5">+{sub.points_awarded.toLocaleString()} XP earned</p>
                      )}
                    </div>

                    <p className="text-[11px] text-muted-foreground line-clamp-3">{sub.proposed_solution}</p>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1.5 border-t border-border/30">
                      <span>By {sub.student ? `${sub.student.first_name} ${sub.student.last_name}` : "Student"}</span>
                      {sub.mockup_url && (
                        <a href={sub.mockup_url} target="_blank" rel="noreferrer"
                          className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center gap-1">
                          View Concept <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Submit Redesign Modal ─────────────────────────────────────────────── */}
      <Dialog open={submitModalOpen} onOpenChange={setSubmitModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto p-0">
          {/* Modal Header */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-5 rounded-t-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-black flex items-center gap-2 text-white">
                <Palette className="h-5 w-5 text-purple-300" /> Submit Your Design Proposal
              </DialogTitle>
              <DialogDescription className="text-purple-200/80 text-xs mt-1">
                Make it visual — describe your idea, add colour palettes, style tags and a Figma/Canva mockup link. The more visual, the better your chances!
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-5 space-y-5">

            {/* Step 1 — Focus Area */}
            <div className="space-y-2.5">
              <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" /> Step 1 — Choose the Screen / Area
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {FOCUS_AREAS.map((area) => (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => setSelectedFocusArea(area)}
                    className={`text-left p-2.5 rounded-xl border transition-all ${
                      selectedFocusArea.id === area.id
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 ring-2 ring-indigo-400/40"
                        : "border-border/60 bg-card hover:border-indigo-300"
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1.5 ${area.bg}`}>
                      <area.icon className={`h-3.5 w-3.5 ${area.color}`} />
                    </div>
                    <p className="text-[11px] font-bold text-foreground leading-tight">{area.title}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2 — Design Approach */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Brush className="h-3.5 w-3.5" /> Step 2 — Your Design Approach
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { val: "wireframe",   label: "Wireframe",    icon: "📐", desc: "Sketch / hand-drawn" },
                  { val: "mockup",      label: "High-Fidelity", icon: "🎨", desc: "Figma / Canva design" },
                  { val: "description", label: "Description",  icon: "✍️", desc: "Text + visual tags" },
                ] as const).map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setDesignApproach(opt.val)}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      designApproach === opt.val
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-950/40 ring-2 ring-purple-400/30"
                        : "border-border/60 bg-card hover:border-purple-300"
                    }`}
                  >
                    <span className="text-lg">{opt.icon}</span>
                    <p className="text-[11px] font-bold text-foreground mt-0.5">{opt.label}</p>
                    <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3 — Title & Problem */}
            <div className="space-y-3">
              <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" /> Step 3 — The Core Idea
              </Label>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Proposal Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`e.g. "Glassmorphism card layout for ${selectedFocusArea.title}"`}
                  className="h-9 text-sm"
                  maxLength={120}
                />
                <p className="text-[10px] text-muted-foreground text-right">{title.length}/120</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">What's the problem? *</Label>
                  <Textarea
                    value={problemStatement}
                    onChange={(e) => setProblemStatement(e.target.value)}
                    placeholder="What looks outdated, is hard to use, or feels wrong on this screen?"
                    rows={3}
                    className="text-xs resize-none"
                    maxLength={500}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Your proposed solution *</Label>
                  <Textarea
                    value={proposedSolution}
                    onChange={(e) => setProposedSolution(e.target.value)}
                    placeholder="Describe buttons, layout, colors, animations, new components…"
                    rows={3}
                    className="text-xs resize-none"
                    maxLength={800}
                  />
                </div>
              </div>
            </div>

            {/* Step 4 — Visual Style Tags */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-purple-500" /> Step 4 — Visual Style Tags <span className="font-normal normal-case">(pick up to 5)</span>
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {STYLE_TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleTag(tag)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                      selectedTags.includes(tag)
                        ? "bg-purple-600 border-purple-600 text-white"
                        : "bg-card border-border/60 text-muted-foreground hover:border-purple-400 hover:text-foreground"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 5 — Color Palette */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5 text-indigo-500" /> Step 5 — Color Palette (optional)
              </Label>
              <div className="flex flex-wrap gap-2">
                {PALETTE_PRESETS.map(p => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setSelectedPalette(selectedPalette === p.name ? null : p.name)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all ${
                      selectedPalette === p.name
                        ? "border-indigo-500 ring-2 ring-indigo-400/30 bg-card"
                        : "border-border/60 bg-card hover:border-indigo-300"
                    }`}
                  >
                    <div className="flex gap-0.5">
                      {p.colors.slice(0, 3).map((c, i) => (
                        <div key={i} className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <span className="text-[11px] font-semibold text-foreground">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 6 — Mockup Link + Inspiration */}
            <div className="space-y-3">
              <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ImagePlus className="h-3.5 w-3.5 text-emerald-500" /> Step 6 — Mockup &amp; Inspiration Links
              </Label>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" /> Your Mockup / Figma / Sketch URL
                  <span className="text-[10px] text-amber-600 font-bold ml-1">★ Priority boost!</span>
                </Label>
                <Input
                  value={mockupUrl}
                  onChange={(e) => setMockupUrl(e.target.value)}
                  placeholder="https://figma.com/… or Canva, Excalidraw, Imgur…"
                  className="h-9 text-xs"
                />
                <p className="text-[10px] text-muted-foreground">Submissions with a mockup link get reviewed first and earn extra bonus XP.</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1"><LinkIcon className="h-3 w-3" /> Inspiration Links (optional)</Label>
                {inspirationLinks.map((link, i) => (
                  <Input
                    key={i}
                    value={link}
                    onChange={(e) => { const n = [...inspirationLinks]; n[i] = e.target.value; setInspirationLinks(n); }}
                    placeholder={`Inspiration ${i + 1}: Dribbble, Behance, Material Design…`}
                    className="h-8 text-xs"
                  />
                ))}
              </div>
            </div>

            {/* Summary Preview */}
            {(title || selectedTags.length > 0 || selectedPalette) && (
              <div className="rounded-2xl border border-indigo-200/60 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/20 p-3.5 space-y-1.5">
                <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">Submission Preview</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedFocusArea && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                      <selectedFocusArea.icon className="h-2.5 w-2.5" /> {selectedFocusArea.title}
                    </span>
                  )}
                  {selectedTags.map(t => (
                    <span key={t} className="px-2 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-[10px] font-bold text-purple-700 dark:text-purple-300">{t}</span>
                  ))}
                  {selectedPalette && (
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">🖌 {selectedPalette}</span>
                  )}
                  {designApproach && (
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">{designApproach}</span>
                  )}
                  {mockupUrl && (
                    <span className="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-[10px] font-bold text-amber-700 dark:text-amber-300">✓ Mockup link</span>
                  )}
                </div>
                {title && <p className="text-xs font-semibold text-foreground">"{title}"</p>}
              </div>
            )}
          </div>

          <DialogFooter className="px-5 pb-5 pt-2 border-t border-border/40 flex flex-col sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => setSubmitModalOpen(false)} className="text-xs">Cancel</Button>
            <Button
              disabled={submitting || !canSubmit}
              onClick={handleSubmitProposal}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-sm flex-1 sm:flex-none gap-2"
            >
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting…</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Submit Design Proposal</>
              )}
            </Button>
          </DialogFooter>

          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
