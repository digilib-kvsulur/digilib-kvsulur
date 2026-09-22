import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Palette, Sparkles, Trophy, Plus, Clock, ExternalLink, Layers,
  Lightbulb, Award, ImagePlus, LinkIcon, Brush, Smartphone, Monitor,
  LayoutDashboard, BookOpen, Gamepad2, Users, ChevronRight, Lock, Star,
  Upload, X, Check, Eye, Maximize2, Zap, SmartphoneNfc, SlidersHorizontal
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
  { id: "Mobile Navigation & Menus", icon: Smartphone, color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/60", title: "Mobile Navigation & Dock", desc: "Thumb-friendly bottom bar, quick actions & floating drawers" },
  { id: "Student Dashboard", icon: LayoutDashboard, color: "text-indigo-500 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/60", title: "Student Dashboard & Streak", desc: "Widgets, streak rings, active loan countdown & quick stats" },
  { id: "Books Catalog & Search", icon: BookOpen, color: "text-emerald-500 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/60", title: "Books Catalog & Filters", desc: "Genre chips, cover grid vs list toggle & instant book search" },
  { id: "Book Reader & Details", icon: BookOpen, color: "text-teal-500 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-950/60", title: "Book Details & Reader", desc: "Immersive book info, dark reader, audio notes & reading tracker" },
  { id: "Quizzes & Gamification", icon: Gamepad2, color: "text-purple-500 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/60", title: "Quizzes & Live Leagues", desc: "Live match animations, animated badges, podiums & leaderboards" },
  { id: "Community & Book Clubs", icon: Users, color: "text-pink-500 dark:text-pink-400", bg: "bg-pink-50 dark:bg-pink-950/60", title: "Community & Reading Circles", desc: "Book review cards, classmate discussion threads & recommendations" },
  { id: "Library Map & Locator", icon: SlidersHorizontal, color: "text-sky-500 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-950/60", title: "Library Map & Shelf Navigator", desc: "Visual physical rack layout, zone markers & book directions" },
  { id: "Themes & Accessibility", icon: Brush, color: "text-rose-500 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/60", title: "Themes & Accessibility", desc: "High contrast, dyslexia font, dark mode glass & micro-animations" },
];

// ── Realistic Layout Archetypes ───────────────────────────────────────────────
const LAYOUT_ARCHETYPES = [
  { id: "Card Grid", name: "2-Column Card Grid", desc: "Large visual covers, clean badges & quick action pills", icon: "🍱" },
  { id: "Shelf Stream", name: "Horizontal Carousel", desc: "Netflix-style shelf rows per genre with smooth swiping", icon: "🎬" },
  { id: "Minimal Focus", name: "Minimalist Focus", desc: "Spacious reader view, distraction-free search & typography", icon: "🧘" },
  { id: "Bottom Sheet", name: "Mobile Bottom Sheet", desc: "Thumb-friendly popups for book details, loans & reviews", icon: "📱" },
];

// ── Real-world Problem Chips (1-Click Prompts) ────────────────────────────────
const PROBLEM_PROMPTS = [
  "Cramped layout on small mobile screens",
  "Hard to find books without category/genre chips",
  "Due date alerts are not noticeable enough",
  "Takes too many taps to view issued books",
  "Dark mode contrast needs better readability",
  "Book cards lack cover & author preview",
];

// ── Realistic Component Wishlist Chips (1-Click Additions) ───────────────────
const COMPONENT_PROMPTS = [
  "+ Floating Quick Return Action",
  "+ Genre Filter Pills at top of Catalog",
  "+ Color-Coded Due Date Countdown Pill",
  "+ Circular Reading Streak Progress Ring",
  "+ Dark Glassmorphism Cards with Neon Accents",
  "+ Quick Audio Summary Player Bar",
];

// ── Visual style tags ─────────────────────────────────────────────────────────
const STYLE_TAGS = [
  "Minimalist", "Dark Glassmorphism", "Card-based", "Neumorphism",
  "Floating Dock", "Large Covers", "High Contrast", "Micro-animations",
  "Thumb-friendly", "Clean Academic",
];

// ── School color palette presets ──────────────────────────────────────────────
const PALETTE_PRESETS = [
  { name: "KV Navy & Gold",   colors: ["#1e3a8a", "#f59e0b", "#3b82f6"] },
  { name: "Cyber Midnight",  colors: ["#0f172a", "#8b5cf6", "#ec4899"] },
  { name: "Emerald Scholar", colors: ["#064e3b", "#10b981", "#34d399"] },
  { name: "Sunset Reading",  colors: ["#7c2d12", "#f97316", "#fbbf24"] },
  { name: "Clean Slate Pro", colors: ["#18181b", "#71717a", "#e4e4e7"] },
];

// ── Expected Impact Options ───────────────────────────────────────────────────
const IMPACT_OPTIONS = [
  { id: "speed", label: "⏱️ Saves Taps & Time", desc: "Faster book discovery and loans" },
  { id: "mobile", label: "📱 Better for Phones", desc: "Ergonomic for one-hand use" },
  { id: "aesthetic", label: "🎨 Modern & Polished", desc: "Looks like a modern world-class app" },
  { id: "accessibility", label: "👁️ Easy Readability", desc: "Clear fonts and strong contrast" },
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
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
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

  // ── Submission Form State ──────────────────────────────────────────────────
  const [selectedFocusArea, setSelectedFocusArea] = useState(FOCUS_AREAS[0]);
  const [selectedLayout, setSelectedLayout] = useState(LAYOUT_ARCHETYPES[0]);
  const [title, setTitle] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [proposedSolution, setProposedSolution] = useState("");
  const [selectedImpact, setSelectedImpact] = useState(IMPACT_OPTIONS[0]);
  const [selectedTags, setSelectedTags] = useState<string[]>(["Clean Academic", "Card-based"]);
  const [selectedPalette, setSelectedPalette] = useState<string | null>("KV Navy & Gold");

  // Mockup Attachment (File Upload or Link)
  const [attachmentMode, setAttachmentMode] = useState<"upload" | "link">("upload");
  const [mockupUrl, setMockupUrl] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox Modal State
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

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

  // ── Computed Status ────────────────────────────────────────────────────────
  const isLive = campaign && (
    campaign.status === "active" ||
    (campaign.is_active && new Date(campaign.starts_at) <= new Date())
  );
  const isScheduled = campaign && campaign.status === "scheduled" && new Date(campaign.starts_at) > new Date();
  const isEnded = campaign && (campaign.status === "ended" || (campaign.ends_at && new Date(campaign.ends_at) <= new Date()));
  const canSubmit = isLive && !isScheduled && !isEnded;

  const handleToggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : prev.length < 5 ? [...prev, tag] : prev);
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid File", description: "Please choose an image file (PNG, JPG, WEBP).", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File Too Large", description: "Please upload an image under 10MB.", variant: "destructive" });
      return;
    }
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitProposal = async () => {
    if (!userId) { toast({ title: "Please Log In", variant: "destructive" }); return; }
    if (!canSubmit) {
      toast({ title: "Submissions not open yet", description: "The challenge hasn't started. Check back when it goes live.", variant: "destructive" });
      return;
    }
    if (!title.trim() || !problemStatement.trim() || !proposedSolution.trim()) {
      toast({ title: "Missing Information", description: "Please provide a title, problem statement, and proposed solution.", variant: "destructive" });
      return;
    }
    if (!campaign) return;

    setSubmitting(true);
    let finalMockupUrl = mockupUrl.trim() || null;

    // Process image upload if present
    if (uploadedFile) {
      try {
        setUploadingImage(true);
        const fileExt = uploadedFile.name.split(".").pop() || "png";
        const filePath = `ui-reform/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from("feedback_attachments")
          .upload(filePath, uploadedFile);

        if (!uploadErr) {
          const { data } = supabase.storage.from("feedback_attachments").getPublicUrl(filePath);
          finalMockupUrl = data.publicUrl;
        } else if (uploadPreview) {
          // Fallback to data URL
          finalMockupUrl = uploadPreview;
        }
      } catch (e) {
        console.warn("Storage upload fallback:", e);
        if (uploadPreview) finalMockupUrl = uploadPreview;
      } finally {
        setUploadingImage(false);
      }
    }

    const enrichedSolution = [
      proposedSolution.trim(),
      `\n\n📐 Layout: ${selectedLayout.name}`,
      `🎯 Target Impact: ${selectedImpact.label}`,
      selectedTags.length > 0 ? `\n🎨 Visual Style: ${selectedTags.join(", ")}` : "",
      selectedPalette ? `\n🖌️ Palette: ${selectedPalette}` : "",
    ].join("");

    try {
      const { error } = await supabase.from("ui_reform_submissions" as never).insert([{
        campaign_id: campaign.id,
        student_id: userId,
        screen_name: selectedFocusArea.title,
        title: title.trim(),
        problem_statement: problemStatement.trim(),
        proposed_solution: enrichedSolution,
        mockup_url: finalMockupUrl,
        status: "pending",
      }] as never);
      if (error) throw error;

      toast({
        title: "🎉 Redesign Idea Submitted!",
        description: `Your design proposal has been submitted! You can earn up to +${campaign.reward_points} XP once reviewed.`,
      });

      // Reset form
      setTitle("");
      setProblemStatement("");
      setProposedSolution("");
      setMockupUrl("");
      setUploadedFile(null);
      setUploadPreview(null);
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
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* ── Responsive Hero Banner for Mobile & Desktop ───────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-950 text-white shadow-xl p-4 sm:p-6 md:p-8 border border-purple-900/40">
        {/* Glow accents */}
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-600/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6">
          <div className="space-y-2.5 sm:space-y-3 max-w-2xl min-w-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-purple-200 text-[11px] font-bold uppercase tracking-wider backdrop-blur-md">
              <Palette className="h-3.5 w-3.5 text-purple-300" />
              <span>UI Reform &amp; Redesign Challenge</span>
            </div>

            <h2 className="text-xl sm:text-2xl md:text-4xl font-black tracking-tight leading-tight sm:leading-none">
              {campaign?.title || "DLMS Redesign Challenge"}
            </h2>

            <p className="text-xs sm:text-sm text-purple-100/80 leading-relaxed">
              Help make KV Sulur DLMS modern, sleek, and intuitive. Propose visual layouts, color themes, or mobile wireframes to earn massive reward XP!
            </p>

            {/* Mobile-responsive 2x2 Prize Grid */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 sm:gap-2 pt-1 w-full sm:w-auto">
              {[
                { emoji: "🥇", label: "1st Prize", pts: "10,000 XP", cls: "bg-amber-500/20 border-amber-400/40 text-amber-200" },
                { emoji: "🥈", label: "2nd Prize", pts: "7,500 XP", cls: "bg-slate-400/20 border-slate-300/40 text-slate-200" },
                { emoji: "🥉", label: "3rd Prize", pts: "5,000 XP", cls: "bg-orange-500/20 border-orange-400/40 text-orange-200" },
                { emoji: "✅", label: "Good Idea", pts: "1,000 XP", cls: "bg-emerald-500/20 border-emerald-400/40 text-emerald-200" },
              ].map(p => (
                <div key={p.label} className={`flex items-center justify-center sm:justify-start gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] sm:text-[11px] font-bold ${p.cls}`}>
                  <span>{p.emoji}</span>
                  <span>{p.label}:</span>
                  <span className="font-black">{p.pts}</span>
                </div>
              ))}
            </div>

            {/* Scheduled Countdown Timer (Mobile-friendly) */}
            {isScheduled && !countdown.expired && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-black/40 border border-white/15 backdrop-blur-md w-full sm:w-auto mt-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <Lock className="h-3.5 w-3.5" />
                  <span>Opens {new Date(campaign!.starts_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                </div>
                <div className="flex items-center gap-1.5 self-center sm:self-auto">
                  {[
                    { v: countdown.days, l: "d" },
                    { v: countdown.hours, l: "h" },
                    { v: countdown.minutes, l: "m" },
                    { v: countdown.seconds, l: "s" },
                  ].map(({ v, l }) => (
                    <div key={l} className="w-10 sm:w-11 py-1 rounded-xl bg-white/10 text-center">
                      <span className="font-mono font-black text-white text-sm sm:text-base leading-none block">{String(v).padStart(2, "0")}</span>
                      <span className="text-[8px] sm:text-[9px] text-purple-300 font-bold block">{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isEnded && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-500/20 text-slate-300 text-xs font-semibold border border-slate-500/30">
                <Award className="h-3.5 w-3.5" /> Challenge Ended — Winners shortlisted below
              </div>
            )}
          </div>

          {/* Banner Action CTA */}
          <div className="shrink-0 w-full sm:w-auto">
            {canSubmit ? (
              <Button
                size="lg"
                onClick={() => setSubmitModalOpen(true)}
                className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold rounded-2xl shadow-lg gap-2 text-xs sm:text-sm h-11 sm:h-12 px-6"
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Submit Redesign Idea</span>
              </Button>
            ) : isScheduled ? (
              <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs sm:text-sm text-purple-200 font-semibold w-full sm:w-auto text-center">
                <Lock className="h-4 w-4 text-amber-300 shrink-0" />
                <span>Submissions open when challenge starts</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Focus Areas Selector ────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" /> What screen needs a redesign?
          </p>
          <span className="text-[11px] text-muted-foreground">Pick a screen to pitch ideas</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {FOCUS_AREAS.map((area) => (
            <button
              key={area.id}
              type="button"
              onClick={() => { setSelectedFocusArea(area); if (canSubmit) setSubmitModalOpen(true); }}
              className="text-left p-3.5 sm:p-4 rounded-2xl border border-border/60 bg-card hover:border-purple-400/60 hover:shadow-md transition-all group"
            >
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center mb-2 ${area.bg} transition-transform group-hover:scale-110`}>
                <area.icon className={`h-4 w-4 sm:h-4.5 sm:w-4.5 ${area.color}`} />
              </div>
              <p className="text-xs font-bold text-foreground leading-tight">{area.title}</p>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{area.desc}</p>
              {canSubmit && (
                <div className="flex items-center gap-1 mt-2 text-[10px] text-purple-600 dark:text-purple-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Pitch Idea</span> <ChevronRight className="h-3 w-3" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── My Submissions Tracker ──────────────────────────────────────── */}
      {mySubmissions.length > 0 && (
        <Card className="rounded-3xl border border-purple-200 dark:border-purple-900/60 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 dark:bg-slate-900/50 pb-3 border-b border-border/40">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <span>My Redesign Submissions ({mySubmissions.length})</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Review feedback and awarded XP from the library team.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {mySubmissions.map((sub) => (
              <div key={sub.id} className="p-3.5 rounded-2xl bg-card border border-border/60 space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="text-[10px] font-bold border-purple-200 text-purple-700 bg-purple-50 dark:bg-purple-950/40 shrink-0">
                      {sub.screen_name}
                    </Badge>
                    <h4 className="text-xs font-bold text-foreground truncate">{sub.title}</h4>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={
                      sub.status === "winner" ? "bg-amber-500 text-white" :
                      sub.status === "shortlisted" ? "bg-purple-600 text-white" :
                      sub.status === "implemented" ? "bg-emerald-600 text-white" :
                      sub.status === "rejected" ? "bg-red-500 text-white" :
                      "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }>
                      {sub.status.toUpperCase()}
                    </Badge>
                    {sub.points_awarded > 0 && (
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        +{sub.points_awarded.toLocaleString()} XP
                      </span>
                    )}
                  </div>
                </div>

                {sub.mockup_url && (
                  <div className="flex items-center gap-2">
                    {sub.mockup_url.startsWith("http") && (sub.mockup_url.includes(".png") || sub.mockup_url.includes(".jpg") || sub.mockup_url.includes(".webp") || sub.mockup_url.includes("data:image") || sub.mockup_url.includes("feedback_attachments")) ? (
                      <button
                        type="button"
                        onClick={() => setLightboxImage(sub.mockup_url || null)}
                        className="group relative w-16 h-12 rounded-xl overflow-hidden border border-border shrink-0 hover:ring-2 hover:ring-purple-400 transition-all"
                      >
                        <img src={sub.mockup_url} alt="Mockup" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Maximize2 className="h-3.5 w-3.5 text-white" />
                        </div>
                      </button>
                    ) : null}
                    <a
                      href={sub.mockup_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-semibold hover:bg-purple-100 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" /> View Design Concept
                    </a>
                  </div>
                )}

                <p className="text-xs text-muted-foreground line-clamp-2">
                  <strong>Proposal:</strong> {sub.proposed_solution}
                </p>

                {sub.admin_feedback && (
                  <div className="p-2.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 text-xs">
                    <p className="font-bold text-purple-950 dark:text-purple-200 mb-0.5">📝 Review Feedback:</p>
                    <p className="text-purple-900/80 dark:text-purple-300/80">{sub.admin_feedback}</p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Community Showcase ──────────────────────────────────────────── */}
      <Card className="rounded-3xl border border-border/70 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50 dark:bg-slate-900/50 pb-3 border-b border-border/40">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span>Top Redesign Concepts &amp; Winners</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Shortlisted designs chosen to be implemented in DLMS.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {showcaseSubmissions.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950 mx-auto flex items-center justify-center">
                <Palette className="h-7 w-7 text-purple-400" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground">No shortlisted designs yet</p>
              <p className="text-xs text-muted-foreground">Be the first to submit a redesign concept for this challenge!</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {showcaseSubmissions.map((sub) => (
                <div key={sub.id} className="p-4 rounded-2xl bg-card border border-border/60 hover:border-purple-300/60 transition-colors shadow-xs space-y-2.5 group">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-[10px] font-bold border-purple-200 text-purple-700 bg-purple-50 dark:bg-purple-950/40">
                      {sub.screen_name}
                    </Badge>
                    <Badge className={
                      sub.status === "winner" ? "bg-amber-500 text-white font-black" :
                      sub.status === "implemented" ? "bg-emerald-600 text-white" :
                      "bg-purple-600 text-white"
                    }>
                      {sub.status === "winner" ? "🏆 WINNER" : sub.status.toUpperCase()}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-foreground leading-snug">{sub.title}</h4>
                    {sub.points_awarded > 0 && (
                      <p className="text-[11px] font-black text-amber-600 dark:text-amber-400 mt-0.5">
                        +{sub.points_awarded.toLocaleString()} XP awarded
                      </p>
                    )}
                  </div>

                  {sub.mockup_url && (
                    <div className="flex items-center gap-2 pt-1">
                      {sub.mockup_url.startsWith("http") && (sub.mockup_url.includes(".png") || sub.mockup_url.includes(".jpg") || sub.mockup_url.includes(".webp") || sub.mockup_url.includes("data:image") || sub.mockup_url.includes("feedback_attachments")) ? (
                        <button
                          type="button"
                          onClick={() => setLightboxImage(sub.mockup_url || null)}
                          className="group relative w-16 h-12 rounded-xl overflow-hidden border border-border shrink-0 hover:ring-2 hover:ring-purple-400 transition-all"
                        >
                          <img src={sub.mockup_url} alt="Mockup preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Maximize2 className="h-3.5 w-3.5 text-white" />
                          </div>
                        </button>
                      ) : null}
                      <a
                        href={sub.mockup_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-purple-600 dark:text-purple-400 font-semibold text-xs hover:underline inline-flex items-center gap-1"
                      >
                        <span>View Concept</span> <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  <p className="text-[11px] text-muted-foreground line-clamp-3">{sub.proposed_solution}</p>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1.5 border-t border-border/30">
                    <span>By {sub.student ? `${sub.student.first_name} ${sub.student.last_name}` : "Student"}</span>
                    <span>{new Date(sub.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Realistic Redesign Submission Modal ──────────────────────────── */}
      <Dialog open={submitModalOpen} onOpenChange={setSubmitModalOpen}>
        <DialogContent className="max-w-2xl max-h-[92dvh] overflow-y-auto p-0 rounded-3xl">
          {/* Header */}
          <div className="sticky top-0 z-20 bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-950 text-white p-4 sm:p-5 rounded-t-3xl border-b border-purple-900/50">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg font-black flex items-center gap-2 text-white">
                <Palette className="h-5 w-5 text-purple-300" />
                <span>Submit UI Reform &amp; Redesign Idea</span>
              </DialogTitle>
              <DialogDescription className="text-purple-200/80 text-xs mt-0.5">
                Propose realistic screen improvements, attach sketches or mockups, and earn up to 10,000 XP!
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-4 sm:p-6 space-y-5">

            {/* Step 1: Target Screen Area */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-purple-500" /> Step 1: Screen Being Improved
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {FOCUS_AREAS.map((area) => (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => setSelectedFocusArea(area)}
                    className={`text-left p-2.5 rounded-xl border transition-all ${
                      selectedFocusArea.id === area.id
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-950/60 ring-2 ring-purple-400/40"
                        : "border-border/60 bg-card hover:border-purple-300"
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

            {/* Step 2: Realistic Layout Archetype */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <LayoutDashboard className="h-3.5 w-3.5 text-indigo-500" /> Step 2: Proposed Layout Architecture
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {LAYOUT_ARCHETYPES.map((arch) => (
                  <button
                    key={arch.id}
                    type="button"
                    onClick={() => setSelectedLayout(arch)}
                    className={`text-left p-2.5 rounded-xl border transition-all ${
                      selectedLayout.id === arch.id
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 ring-2 ring-indigo-400/40"
                        : "border-border/60 bg-card hover:border-indigo-300"
                    }`}
                  >
                    <span className="text-base">{arch.icon}</span>
                    <p className="text-[11px] font-bold text-foreground mt-1 leading-tight">{arch.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-tight">{arch.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Title & Problem with 1-Click Chips */}
            <div className="space-y-3">
              <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" /> Step 3: The Core Idea &amp; Pain Point
              </Label>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Redesign Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`e.g. "Modern Floating Action Dock for ${selectedFocusArea.title}"`}
                  className="h-9 text-xs sm:text-sm"
                  maxLength={120}
                />
              </div>

              {/* Problem Statement with Quick-Fill Chips */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">What is the problem with current UI? *</Label>
                  <span className="text-[10px] text-muted-foreground">Tap to quick-fill:</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {PROBLEM_PROMPTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setProblemStatement((prev) => (prev ? `${prev}. ${p}` : p))}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted hover:bg-purple-100 dark:hover:bg-purple-950/50 hover:text-purple-700 transition-colors border border-border/60"
                    >
                      + {p}
                    </button>
                  ))}
                </div>
                <Textarea
                  value={problemStatement}
                  onChange={(e) => setProblemStatement(e.target.value)}
                  placeholder="Explain what is clunky, slow, or confusing on this screen..."
                  rows={2}
                  className="text-xs resize-none"
                  maxLength={500}
                />
              </div>

              {/* Solution with Quick-Fill Chips */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Your Proposed UI Solution &amp; Key Components *</Label>
                  <span className="text-[10px] text-muted-foreground">Tap to add components:</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {COMPONENT_PROMPTS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setProposedSolution((prev) => (prev ? `${prev}, ${c}` : c))}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted hover:bg-emerald-100 dark:hover:bg-emerald-950/50 hover:text-emerald-700 transition-colors border border-border/60"
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <Textarea
                  value={proposedSolution}
                  onChange={(e) => setProposedSolution(e.target.value)}
                  placeholder="Describe the arrangement of buttons, typography, colors, animations & UX flow..."
                  rows={3}
                  className="text-xs resize-none"
                  maxLength={800}
                />
              </div>
            </div>

            {/* Step 4: Real Visual Attachment (Image Upload or Figma/Canva Link) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ImagePlus className="h-3.5 w-3.5 text-emerald-500" /> Step 4: Visual Wireframe / Mockup Attachment
                </Label>
                <div className="flex rounded-lg bg-muted p-0.5 text-[10px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setAttachmentMode("upload")}
                    className={`px-2 py-0.5 rounded-md transition-all ${attachmentMode === "upload" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"}`}
                  >
                    Upload Image
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttachmentMode("link")}
                    className={`px-2 py-0.5 rounded-md transition-all ${attachmentMode === "link" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"}`}
                  >
                    Web Link
                  </button>
                </div>
              </div>

              {attachmentMode === "upload" ? (
                <div className="space-y-2">
                  {uploadPreview ? (
                    <div className="relative rounded-2xl overflow-hidden border border-border bg-card p-3 flex items-center gap-3">
                      <img src={uploadPreview} alt="Mockup Preview" className="w-20 h-16 object-cover rounded-xl border border-border" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate text-foreground">{uploadedFile?.name || "Uploaded wireframe"}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {uploadedFile ? `${(uploadedFile.size / 1024).toFixed(1)} KB` : "Ready to submit"}
                        </p>
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-1">
                          <Check className="h-3 w-3" /> Visual concept attached
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => { setUploadedFile(null); setUploadPreview(null); }}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-border/80 hover:border-purple-400/80 rounded-2xl p-5 text-center cursor-pointer bg-muted/20 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition-all space-y-1.5"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 mx-auto flex items-center justify-center">
                        <Upload className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-bold text-foreground">
                        Upload sketch, notebook drawing, or Canva/Figma export
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        PNG, JPG, WEBP up to 10MB · Submissions with visual sketches receive top priority and extra XP!
                      </p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Input
                    value={mockupUrl}
                    onChange={(e) => setMockupUrl(e.target.value)}
                    placeholder="https://figma.com/design/... or Canva / Imgur link"
                    className="h-9 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Direct link to your interactive Figma, Canva design, or hosted image mockup.
                  </p>
                </div>
              )}
            </div>

            {/* Step 5: Style Tags & KV Color Palettes */}
            <div className="grid sm:grid-cols-2 gap-3.5">
              {/* Style Tags */}
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-purple-500" /> Visual Style Tags
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {STYLE_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all ${
                        selectedTags.includes(tag)
                          ? "bg-purple-600 border-purple-600 text-white"
                          : "bg-card border-border/60 text-muted-foreground hover:border-purple-300"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Palette */}
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5 text-indigo-500" /> Color Theme
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {PALETTE_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setSelectedPalette(selectedPalette === p.name ? null : p.name)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-xl border transition-all ${
                        selectedPalette === p.name
                          ? "border-purple-500 ring-2 ring-purple-400/30 bg-card"
                          : "border-border/60 bg-card hover:border-purple-300"
                      }`}
                    >
                      <div className="flex gap-0.5">
                        {p.colors.map((c, i) => (
                          <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <span className="text-[10px] font-bold text-foreground">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 6: Expected User Impact */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-500" /> Step 5: Primary Expected Benefit
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {IMPACT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedImpact(opt)}
                    className={`text-left p-2.5 rounded-xl border transition-all ${
                      selectedImpact.id === opt.id
                        ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40 ring-2 ring-amber-400/30"
                        : "border-border/60 bg-card hover:border-amber-300"
                    }`}
                  >
                    <p className="text-[11px] font-bold text-foreground leading-tight">{opt.label}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-1">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Live Submission Preview Card */}
            {(title || uploadPreview || selectedTags.length > 0) && (
              <div className="rounded-2xl border border-purple-200/60 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-950/20 p-3.5 space-y-1.5">
                <p className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide">Live Pitch Preview</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                    <selectedFocusArea.icon className="h-2.5 w-2.5" /> {selectedFocusArea.title}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                    {selectedLayout.icon} {selectedLayout.name}
                  </span>
                  {selectedTags.slice(0, 3).map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-muted-foreground">{t}</span>
                  ))}
                  {uploadPreview && (
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                      <Check className="h-2.5 w-2.5" /> Wireframe Image Attached
                    </span>
                  )}
                </div>
                {title && <p className="text-xs font-bold text-foreground">"{title}"</p>}
              </div>
            )}
          </div>

          {/* Footer CTA */}
          <DialogFooter className="px-5 pb-5 pt-2 border-t border-border/40 flex flex-col sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => setSubmitModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              disabled={submitting || !canSubmit || uploadingImage}
              onClick={handleSubmitProposal}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm flex-1 sm:flex-none gap-2 h-10 px-5"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting Design…</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Submit Redesign Idea (+1,000 XP)</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Mockup Image Lightbox Modal ──────────────────────────────────── */}
      <Dialog open={!!lightboxImage} onOpenChange={(open) => !open && setLightboxImage(null)}>
        <DialogContent className="max-w-3xl p-2 bg-black/90 border-slate-800">
          <div className="relative">
            {lightboxImage && (
              <img
                src={lightboxImage}
                alt="Enlarged Mockup"
                className="w-full max-h-[80vh] object-contain rounded-xl"
              />
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setLightboxImage(null)}
              className="absolute top-2 right-2 text-white bg-black/60 hover:bg-black rounded-full h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
