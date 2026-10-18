import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { getAvatarUrl } from "@/lib/utils";
import LevelProgress from "./LevelProgress";
import LoginStreakCard from "./LoginStreakCard";
import Recommendations from "./Recommendations";
import ClassCompetitions from "@/components/student/ClassCompetitions";
import { UpcomingQuizLeagueCard } from "@/components/quiz/UpcomingQuizLeagueCard";
import { LiveQuizAlert } from "@/components/quiz/LiveQuizAlert";
import { VacationOverviewBanner } from "@/features/vacation";
import {
  BookOpen, Brain, Target, Award, Zap, Trophy, TrendingUp, Sparkles,
  Calendar, CalendarDays, Gamepad2, Timer, FileText, BookCheck, Users,
  UserPlus, Copy, Bug, Palette, AlertTriangle, ChevronRight, BookPlus,
  Compass, Flame, ArrowUpRight, CheckCircle2, Medal
} from "lucide-react";

export interface OverviewProps {
  user: any;
  classRank: number | string;
  pendingFines?: number;
  streakData?: {
    loading?: boolean;
    currentStreak: number;
    longestStreak: number;
    totalLoginDays: number;
  };
  checkAuth?: () => void;
  currentBooksCount?: number;
  quizResultsCount?: number;
  monthlyBooksRead?: number;
  schoolReadingGoal?: number;
  badgesEarnedCount?: number;
  recentActivities?: any[];
  pendingFriendRequests?: any[];
  handleRespondFriendRequest?: (id: string, action: "accepted" | "rejected") => Promise<void>;
  bountyVisible?: boolean;
  activeBounty?: any;
  uiReformVisible?: boolean;
  activeReformCampaign?: any;
  capsuleEnabled?: boolean;
  setShowMemoryCapsule?: (show: boolean) => void;
  handleJoinQuizLeague?: (session: any) => Promise<void>;
  setActiveTab: (tab: any) => void;
}

export default function Overview({
  user,
  classRank = "N/A",
  pendingFines = 0,
  streakData,
  checkAuth,
  currentBooksCount = 0,
  quizResultsCount = 0,
  monthlyBooksRead = 0,
  schoolReadingGoal = 3,
  badgesEarnedCount = 0,
  recentActivities = [],
  pendingFriendRequests = [],
  handleRespondFriendRequest,
  bountyVisible = false,
  activeBounty = null,
  uiReformVisible = false,
  activeReformCampaign = null,
  capsuleEnabled = false,
  setShowMemoryCapsule,
  handleJoinQuizLeague,
  setActiveTab,
}: OverviewProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [copiedLink, setCopiedLink] = useState(false);

  // Time-aware greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  // Format relative time helper
  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return "Recently";
    const sec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (isNaN(sec) || sec < 60) return "Just now";
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
    return `${Math.floor(sec / 86400)}d ago`;
  };

  // Invite code URL
  const inviteCodeOrAdm = user?.invite_code || user?.admission_number || "";
  const inviteLink = inviteCodeOrAdm
    ? `https://dlms.kvsulur.in/invite/${inviteCodeOrAdm}`
    : "https://dlms.kvsulur.in/invite";

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    toast({
      title: "Invite Link Copied! 📋",
      description: "Share it with your classmates to earn +250 XP.",
    });
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const msg = encodeURIComponent(
      `📚 Hey! Join DLMS (Digital Library PM SHRI KV AFS Sulur) with my link:\n${inviteLink}\n\nSign in with your student credentials to earn XP & badges! 🎉`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank", "noopener,noreferrer");
  };

  // Goal percentage
  const goalPercentage = Math.min(
    100,
    Math.round((monthlyBooksRead / (schoolReadingGoal || 1)) * 100)
  );

  // Quick Action App Tiles
  const quickActions = [
    { label: "My Portfolio", icon: FileText, tab: "portfolio", color: "text-rose-500", bg: "bg-rose-500/10", border: "hover:border-rose-500/40" },
    { label: "Games Corner", icon: Gamepad2, tab: "games", color: "text-blue-500", bg: "bg-blue-500/10", border: "hover:border-blue-500/40" },
    { label: "Study Tracker", icon: Timer, tab: "study", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "hover:border-emerald-500/40" },
    { label: "Quizzes", icon: Brain, tab: "quizzes", color: "text-purple-500", bg: "bg-purple-500/10", border: "hover:border-purple-500/40" },
    { label: "Certificates", icon: Award, tab: "certificates", color: "text-amber-500", bg: "bg-amber-500/10", border: "hover:border-amber-500/40" },
    { label: "Study Materials", icon: FileText, tab: "materials", color: "text-indigo-500", bg: "bg-indigo-500/10", border: "hover:border-indigo-500/40" },
    { label: "Library Events", icon: CalendarDays, tab: "events", color: "text-pink-500", bg: "bg-pink-500/10", border: "hover:border-pink-500/40" },
    { label: "Community", icon: Users, tab: "community", color: "text-orange-500", bg: "bg-orange-500/10", border: "hover:border-orange-500/40" },
    { label: "Network & Friends", icon: Users, tab: "network", color: "text-sky-500", bg: "bg-sky-500/10", border: "hover:border-sky-500/40" },
    { label: "Book Issued", icon: BookCheck, tab: "issued", color: "text-violet-500", bg: "bg-violet-500/10", border: "hover:border-violet-500/40" },
  ];

  // Activity styling helper
  const getActivityStyle = (type: string) => {
    switch (type) {
      case "book":
        return { icon: BookOpen, color: "text-blue-500", bg: "bg-blue-500/10" };
      case "quiz":
        return { icon: Brain, color: "text-purple-500", bg: "bg-purple-500/10" };
      case "reading":
        return { icon: Medal, color: "text-emerald-500", bg: "bg-emerald-500/10" };
      case "study":
        return { icon: Timer, color: "text-teal-500", bg: "bg-teal-500/10" };
      case "game":
        return { icon: Gamepad2, color: "text-indigo-500", bg: "bg-indigo-500/10" };
      default:
        return { icon: BookPlus, color: "text-amber-500", bg: "bg-amber-500/10" };
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6 w-full max-w-full">
      {/* 1. URGENT NOTIFICATIONS BAR */}
      {pendingFines > 0 && (
        <Card
          className="border-destructive/40 bg-destructive/10 hover:bg-destructive/15 transition-all cursor-pointer shadow-sm rounded-2xl overflow-hidden"
          onClick={() => setActiveTab("issued")}
        >
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-destructive/20 text-destructive flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-destructive truncate">
                  You have {pendingFines} overdue fine{pendingFines > 1 ? "s" : ""}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  Tap to open Book Issued hub & settle via UPI
                </p>
              </div>
            </div>
            <Button size="sm" variant="destructive" className="shrink-0 h-8 sm:h-9 text-xs rounded-xl font-bold px-3">
              <span>Pay Now</span>
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Live Quiz League Alerts (if active session exists) */}
      {handleJoinQuizLeague && (
        <>
          <UpcomingQuizLeagueCard
            userId={user?.id}
            userClass={user?.student_class}
            onJoinLeague={handleJoinQuizLeague}
          />
          <LiveQuizAlert onJoinLeague={handleJoinQuizLeague} />
        </>
      )}

      {/* 2. MODERN STUDENT IDENTITY HERO */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 text-white border border-indigo-500/30 shadow-2xl p-4 sm:p-6 lg:p-7">
        {/* Ambient radial glows */}
        <div className="absolute -top-16 -right-16 w-60 h-60 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-60 h-60 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-6">
          {/* Left: Avatar & Greeting */}
          <div className="flex items-center gap-3.5 sm:gap-5 min-w-0">
            <div className="relative shrink-0">
              <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl ring-2 ring-indigo-400/30 overflow-hidden bg-slate-800 flex items-center justify-center shadow-lg">
                {user?.avatar_url ? (
                  <img
                    src={getAvatarUrl(user.avatar_url)}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                      const parent = e.currentTarget.parentElement;
                      if (parent && !parent.querySelector(".fallback-char")) {
                        const span = document.createElement("span");
                        span.className = "text-2xl font-black text-white fallback-char";
                        span.textContent = user?.first_name?.[0] || "S";
                        parent.appendChild(span);
                      }
                    }}
                  />
                ) : (
                  <span className="text-2xl sm:text-3xl font-black text-indigo-200">
                    {user?.first_name?.[0] || "S"}
                  </span>
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-900"></span>
              </span>
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white truncate">
                  {greeting}, {user?.first_name || "Scholar"}! 👋
                </h2>
              </div>
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                {user?.student_class && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                    Class {user.student_class}
                  </span>
                )}
                <span className="text-xs text-indigo-200/80 hidden xs:inline">
                  Welcome to PM SHRI KV Sulur Library
                </span>
              </div>
            </div>
          </div>

          {/* Right: Gamified Stats Chips */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 shrink-0 md:min-w-[240px]">
            {/* Total XP Card */}
            <button
              onClick={() => navigate("/points-history")}
              className="group flex flex-col justify-center items-center text-center p-2.5 sm:p-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-md transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
              title="View Points History"
            >
              <div className="flex items-center gap-1 text-amber-300 font-extrabold text-base sm:text-lg">
                <Zap className="h-4 w-4 fill-amber-300 group-hover:scale-110 transition-transform" />
                <span>{(user?.points || 0).toLocaleString()}</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/70 mt-0.5 flex items-center gap-0.5">
                Total XP <ArrowUpRight className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100" />
              </span>
            </button>

            {/* Class Rank Card */}
            <button
              onClick={() => setActiveTab("rankings")}
              className="group flex flex-col justify-center items-center text-center p-2.5 sm:p-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-md transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
              title="View Leaderboards"
            >
              <div className="flex items-center gap-1 text-indigo-300 font-extrabold text-base sm:text-lg">
                <Trophy className="h-4 w-4 text-indigo-300 group-hover:scale-110 transition-transform" />
                <span>#{classRank}</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/70 mt-0.5 flex items-center gap-0.5">
                Class Rank <ArrowUpRight className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100" />
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. TWO-COLUMN RESPONSIVE LAYOUT (Desktop: 8 cols + 4 cols / Mobile: stacked) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* MAIN FEED (Col Span 8 on Desktop) */}
        <div className="lg:col-span-8 space-y-5 sm:space-y-6 min-w-0">
          {/* A. CAMPUS SPOTLIGHT & ACTIVE CAMPAIGNS DECK */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Campus Spotlight & Events
              </h3>
            </div>

            {/* Vacation Campaign Banner */}
            <VacationOverviewBanner onOpen={() => setActiveTab("vacation")} />

            {/* Monthly Memory Capsule Banner */}
            {(() => {
              if (!capsuleEnabled || !setShowMemoryCapsule) return null;
              const nowDate = new Date();
              const isWrapFirst7Days = nowDate.getDate() <= 7;
              const wrapPrevMonth = new Date(nowDate.getFullYear(), nowDate.getMonth() - 1, 1).toLocaleString("default", { month: "long" });
              const bannerMonth = isWrapFirst7Days ? wrapPrevMonth : nowDate.toLocaleString("default", { month: "long" });

              return (
                <Card
                  className="overflow-hidden border border-purple-500/30 bg-gradient-to-r from-slate-950 via-purple-950/90 to-indigo-950 text-white shadow-md hover:shadow-xl transition-all cursor-pointer group rounded-2xl"
                  onClick={() => setShowMemoryCapsule(true)}
                >
                  <CardContent className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-amber-400 via-pink-500 to-indigo-500 p-0.5 shadow-md shrink-0 group-hover:scale-105 transition-transform">
                        <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                          <Sparkles className="h-5 w-5 text-amber-300 animate-pulse" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge className="bg-gradient-to-r from-pink-500 to-purple-600 text-white border-0 text-[9px] font-black px-1.5 py-0.2 shrink-0">
                            {isWrapFirst7Days ? `${bannerMonth.toUpperCase()} WRAP` : "MONTHLY"}
                          </Badge>
                          {isWrapFirst7Days && (
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider shrink-0">
                              ✓ READY
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm font-extrabold text-white truncate mt-0.5">
                          {isWrapFirst7Days ? `Your ${bannerMonth} Reading Wrap is Here! 🚀` : "Your Reading Memory Capsule ✨"}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" className="gradient-primary text-white border-0 font-bold rounded-xl shrink-0 h-8 sm:h-9 text-xs px-3 shadow-sm">
                      <span>Open →</span>
                    </Button>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Campaign Cards Grid: Invite & Seasonal Challenges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Invite Friends Live Card */}
              <Card className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-purple-500/5 to-indigo-500/10 shadow-xs hover:shadow-md transition-all">
                <CardContent className="p-3.5 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <UserPlus className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-black text-foreground">Invite & Earn</span>
                    </div>
                    <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-[10px] font-bold">
                      <Sparkles className="h-3 w-3 mr-1" /> +250 XP
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">
                    Share your invite link with classmates to earn bonus XP upon their first login!
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={handleCopyInvite}
                      className="flex-1 h-8 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-xs gap-1"
                    >
                      {copiedLink ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedLink ? "Copied" : "Copy Link"}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleWhatsAppShare}
                      className="h-8 rounded-xl text-xs font-bold border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 px-2.5"
                      title="Share via WhatsApp"
                    >
                      <span>WhatsApp</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setActiveTab("invite")}
                      className="h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-foreground shrink-0"
                      title="Open Invite Center"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Bug Bounty or UI Reform (or general library tip) */}
              {bountyVisible && activeBounty?.is_active && activeBounty.ends_at && new Date(activeBounty.ends_at).getTime() > Date.now() ? (
                <Card
                  className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-primary/10 shadow-xs hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setActiveTab("bounty")}
                >
                  <CardContent className="p-3.5 sm:p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Bug className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-black text-foreground truncate">Bug Hunter Season</span>
                      </div>
                      <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-[10px] font-bold">
                        +100 XP
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      Spot and report UI/system glitches to earn rewarded points!
                    </p>
                    <Button size="sm" className="w-full h-8 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs gap-1">
                      <span>Report Bug</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ) : uiReformVisible && activeReformCampaign && activeReformCampaign.status !== "ended" && activeReformCampaign.ends_at && new Date(activeReformCampaign.ends_at).getTime() > Date.now() ? (
                <Card
                  className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 shadow-xs hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setActiveTab("ui-reform")}
                >
                  <CardContent className="p-3.5 sm:p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Palette className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-black text-foreground truncate">UI Reform Challenge</span>
                      </div>
                      <Badge variant="outline" className="border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-500/10 text-[10px] font-bold">
                        +{activeReformCampaign.reward_points || 1000} XP
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      Submit layout & feature redesign wireframes for DLMS.
                    </p>
                    <Button size="sm" className="w-full h-8 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs gap-1">
                      <span>Submit Design</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                /* Evergreen Challenge Prompt */
                <Card
                  className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 via-blue-500/5 to-cyan-500/10 shadow-xs hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setActiveTab("quizzes")}
                >
                  <CardContent className="p-3.5 sm:p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Brain className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-black text-foreground truncate">Daily Quiz Arena</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] font-bold">
                        Knowledge XP
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      Test your reading comprehension, compete with peers, and level up faster!
                    </p>
                    <Button size="sm" variant="secondary" className="w-full h-8 rounded-xl text-xs font-bold shadow-xs gap-1">
                      <span>Take a Quiz</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* B. AT-A-GLANCE METRIC CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {/* Books Reading */}
            <Card
              className="border-border/60 hover:border-blue-500/40 hover:shadow-md transition-all rounded-2xl cursor-pointer group active:scale-[0.98]"
              onClick={() => setActiveTab("books")}
            >
              <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Reading</span>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-black text-foreground">{currentBooksCount}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">Books in progress</p>
                </div>
              </CardContent>
            </Card>

            {/* Quizzes Taken */}
            <Card
              className="border-border/60 hover:border-purple-500/40 hover:shadow-md transition-all rounded-2xl cursor-pointer group active:scale-[0.98]"
              onClick={() => setActiveTab("quizzes")}
            >
              <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Brain className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Quizzes</span>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-black text-foreground">{quizResultsCount}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">Tests taken</p>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Goal Progress */}
            <Card className="border-border/60 hover:border-emerald-500/40 hover:shadow-md transition-all rounded-2xl">
              <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <Target className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase">
                    {goalPercentage}%
                  </span>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-black text-foreground">
                    {monthlyBooksRead}/{schoolReadingGoal}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">Monthly books goal</p>
                  <Progress value={goalPercentage} className="h-1.5 mt-2" />
                </div>
              </CardContent>
            </Card>

            {/* Badges Earned */}
            <Card
              className="border-border/60 hover:border-amber-500/40 hover:shadow-md transition-all rounded-2xl cursor-pointer group active:scale-[0.98]"
              onClick={() => setActiveTab("badges")}
            >
              <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Award className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Cabinet</span>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-black text-foreground">{badgesEarnedCount}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">Badges unlocked</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* C. STUDENT LAUNCHPAD (QUICK ACTIONS APP GRID) */}
          <Card className="border-border/60 rounded-3xl overflow-hidden shadow-xs">
            <CardHeader className="p-4 sm:p-5 pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg font-black flex items-center gap-2">
                    <Compass className="h-5 w-5 text-primary" /> Student Launchpad
                  </CardTitle>
                  <CardDescription className="text-xs">Quick access to library features and learning zones</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-3">
                {quickActions.map((action) => (
                  <button
                    key={action.tab}
                    onClick={() => setActiveTab(action.tab)}
                    className={`flex flex-col items-center justify-center text-center p-3 sm:p-3.5 rounded-2xl border border-border/50 bg-card/60 hover:bg-muted/40 ${action.border} transition-all hover:scale-105 active:scale-95 group shadow-xs`}
                  >
                    <div className={`w-10 h-10 rounded-xl ${action.bg} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                      <action.icon className={`h-5 w-5 ${action.color}`} />
                    </div>
                    <span className="text-xs font-bold text-foreground leading-tight line-clamp-1">
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Class Competitions (if user has student_class) */}
          {user?.student_class && <ClassCompetitions userClass={user.student_class} />}

          {/* Personalized Book Recommendations Carousel */}
          {user?.id && (
            <div className="pt-1">
              <Recommendations userId={user.id} studentClass={user.student_class} />
            </div>
          )}
        </div>

        {/* SIDEBAR PANEL (Col Span 4 on Desktop / Stacked naturally on Mobile) */}
        <div className="lg:col-span-4 space-y-5 sm:space-y-6 min-w-0">
          {/* 1. Daily Login Streak Card */}
          {streakData && !streakData.loading && (
            <LoginStreakCard
              currentStreak={streakData.currentStreak}
              longestStreak={streakData.longestStreak}
              totalLoginDays={streakData.totalLoginDays}
              onPointsClaimed={checkAuth}
            />
          )}

          {/* 2. Level Progress Card */}
          <LevelProgress userPoints={user?.points || 0} />

          {/* 3. Pending Friend Requests Card */}
          {pendingFriendRequests && pendingFriendRequests.length > 0 && handleRespondFriendRequest && (
            <Card className="rounded-3xl border border-indigo-200 dark:border-indigo-900/50 bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-slate-50/50 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-slate-900/40 shadow-xs p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-foreground">
                      Friend Requests ({pendingFriendRequests.length})
                    </h4>
                    <p className="text-[10px] text-muted-foreground">Classmates connecting with you</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("network")}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 h-7 px-2"
                >
                  View All →
                </Button>
              </div>
              <div className="space-y-2">
                {pendingFriendRequests.slice(0, 3).map((req) => (
                  <div
                    key={req.id}
                    className="p-2.5 rounded-2xl bg-card border border-border/50 flex items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-8 w-8 border border-border shrink-0">
                        <AvatarImage src={req.avatar_url} />
                        <AvatarFallback className="text-[10px] font-bold bg-indigo-100 text-indigo-700">
                          {req.name?.slice(0, 2).toUpperCase() || "FR"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{req.name}</p>
                        {req.student_class && (
                          <p className="text-[10px] text-muted-foreground">Class {req.student_class}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleRespondFriendRequest(req.id, "accepted")}
                        className="h-7 px-2.5 text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs"
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRespondFriendRequest(req.id, "rejected")}
                        className="h-7 px-2 text-[10px] rounded-xl font-medium text-muted-foreground hover:text-foreground"
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 4. Recent Activity Timeline */}
          <Card className="border-border/60 rounded-3xl overflow-hidden shadow-xs">
            <CardHeader className="p-4 sm:p-5 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm sm:text-base font-black flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Recent Activity
                </CardTitle>
                <button
                  onClick={() => navigate("/points-history")}
                  className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                >
                  <Zap className="h-3 w-3" /> History
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-0">
              {recentActivities && recentActivities.length > 0 ? (
                <div className="space-y-2.5">
                  {recentActivities.slice(0, 6).map((item, i) => {
                    const style = getActivityStyle(item.type);
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl bg-muted/30 hover:bg-muted/60 transition-all border border-border/40"
                      >
                        <div className={`w-8 h-8 rounded-xl ${style.bg} ${style.color} flex items-center justify-center shrink-0`}>
                          <style.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                          <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            {item.score !== undefined && item.score !== null && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                Score: {item.score}%
                              </span>
                            )}
                            {item.points && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                                +{item.points} XP
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                          {formatTimeAgo(item.time)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground space-y-2">
                  <Calendar className="h-10 w-10 mx-auto opacity-30" />
                  <p className="text-xs font-semibold">No recent activity yet</p>
                  <p className="text-[11px] text-muted-foreground">
                    Start reading books or taking quizzes to see your journey!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
