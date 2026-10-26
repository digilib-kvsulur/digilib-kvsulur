import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  UserPlus, Copy, Bug, Palette, AlertTriangle, ChevronRight, Compass,
  CheckCircle2, Medal, Network, MessageSquare, Flame, ArrowUpRight,
  Sun, Moon, Check, MapPin, Share2
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

  // Time-aware greeting & contextual icon
  const { greeting, timeIcon: TimeIcon } = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return { greeting: "Good morning", timeIcon: Sun };
    if (hour < 17) return { greeting: "Good afternoon", timeIcon: Sun };
    return { greeting: "Good evening", timeIcon: Moon };
  }, []);

  // Student full display name: first_name + last_name
  const fullName = useMemo(() => {
    if (!user) return "Scholar";
    const firstName = (user.first_name || "").trim();
    const lastName = (user.last_name || "").trim();
    const name = `${firstName} ${lastName}`.trim();
    return name || user.name || "Scholar";
  }, [user?.first_name, user?.last_name, user?.name]);

  // Format relative time helper
  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return "Recently";
    const sec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (isNaN(sec) || sec < 60) return "Just now";
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
    return `${Math.floor(sec / 86400)}d ago`;
  };

  // Referral link
  const inviteCodeOrAdm = user?.invite_code || user?.admission_number || "";
  const inviteLink = inviteCodeOrAdm
    ? `https://dlms.kvsulur.in/invite/${inviteCodeOrAdm}`
    : "https://dlms.kvsulur.in/invite";

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    toast({
      title: "Invite Link Copied! 📋",
      description: "Share it with classmates to earn +250 XP.",
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
        return { icon: Sparkles, color: "text-amber-500", bg: "bg-amber-500/10" };
    }
  };

  // Curated Primary Launchpad Hubs
  const primaryHubs = [
    {
      id: "catalog",
      label: "Books Catalog",
      description: "Browse 5,000+ library titles",
      icon: Compass,
      badge: "BROWSE",
      color: "text-indigo-500",
      bg: "bg-indigo-500/10 hover:bg-indigo-500/15",
      border: "hover:border-indigo-500/30",
      action: () => navigate("/catalog"),
    },
    {
      id: "ncert",
      label: "NCERT Textbooks",
      description: "Class 1-12 official e-books",
      icon: BookOpen,
      badge: "E-BOOKS",
      color: "text-sky-500",
      bg: "bg-sky-500/10 hover:bg-sky-500/15",
      border: "hover:border-sky-500/30",
      action: () => setActiveTab("ncert"),
    },
    {
      id: "quizzes",
      label: "Daily Quizzes",
      description: "Compete in live quiz leagues",
      icon: Brain,
      badge: "LIVE XP",
      color: "text-purple-500",
      bg: "bg-purple-500/10 hover:bg-purple-500/15",
      border: "hover:border-purple-500/30",
      action: () => setActiveTab("quizzes"),
    },
    {
      id: "portfolio",
      label: "My Portfolio",
      description: "Reading logs & achievements",
      icon: FileText,
      badge: null,
      color: "text-rose-500",
      bg: "bg-rose-500/10 hover:bg-rose-500/15",
      border: "hover:border-rose-500/30",
      action: () => setActiveTab("portfolio"),
    },
    {
      id: "study",
      label: "Study Tracker",
      description: "Focus timer & session notes",
      icon: Timer,
      badge: null,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10 hover:bg-emerald-500/15",
      border: "hover:border-emerald-500/30",
      action: () => setActiveTab("study"),
    },
    {
      id: "games",
      label: "Games Corner",
      description: "Chess, wordle & library quests",
      icon: Gamepad2,
      badge: null,
      color: "text-amber-500",
      bg: "bg-amber-500/10 hover:bg-amber-500/15",
      border: "hover:border-amber-500/30",
      action: () => setActiveTab("games"),
    },
    {
      id: "events",
      label: "Library Events",
      description: "Workshops, fairs & meets",
      icon: CalendarDays,
      badge: null,
      color: "text-pink-500",
      bg: "bg-pink-500/10 hover:bg-pink-500/15",
      border: "hover:border-pink-500/30",
      action: () => setActiveTab("events"),
    },
    {
      id: "certificates",
      label: "Certificates Vault",
      description: "Official library merit honors",
      icon: Award,
      badge: null,
      color: "text-teal-500",
      bg: "bg-teal-500/10 hover:bg-teal-500/15",
      border: "hover:border-teal-500/30",
      action: () => setActiveTab("certificates"),
    },
  ];

  // Secondary Quick Navigation Chips
  const secondaryQuickChips = [
    { label: "Book Issued Hub", tab: "issued", icon: BookCheck },
    { label: "Community Forum", tab: "community", icon: Users },
    { label: "Classmates Network", tab: "network", icon: Network },
    { label: "Friends Chat", tab: "chat", icon: MessageSquare },
    { label: "Library Map", tab: "locator", icon: MapPin },
    { label: "Study Materials", tab: "materials", icon: FileText },
  ];

  // Check if any secondary campaigns are active
  const hasWrapActive = Boolean(capsuleEnabled && setShowMemoryCapsule);
  const hasBountyActive = Boolean(
    bountyVisible &&
    activeBounty?.is_active &&
    activeBounty?.ends_at &&
    new Date(activeBounty.ends_at).getTime() > Date.now()
  );
  const hasReformActive = Boolean(
    uiReformVisible &&
    activeReformCampaign &&
    activeReformCampaign.status !== "ended" &&
    activeReformCampaign?.ends_at &&
    new Date(activeReformCampaign.ends_at).getTime() > Date.now()
  );
  const hasSecondaryCampaigns = hasWrapActive || hasBountyActive || hasReformActive;

  // Monthly Capsule Data
  const nowDate = new Date();
  const isWrapFirst7Days = nowDate.getDate() <= 7;
  const wrapPrevMonth = new Date(nowDate.getFullYear(), nowDate.getMonth() - 1, 1).toLocaleString("default", { month: "long" });
  const bannerMonth = isWrapFirst7Days ? wrapPrevMonth : nowDate.toLocaleString("default", { month: "long" });

  // Reusable Invite Component
  const InviteCard = () => (
    <div className="rounded-2xl sm:rounded-3xl border border-violet-500/20 bg-gradient-to-b from-violet-500/[0.04] via-card to-card p-4 sm:p-5 shadow-sm hover:border-violet-500/40 hover:shadow-md transition-all duration-200 space-y-3.5">
      {/* Top Header: Icon + Title + XP Badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl sm:rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
            <UserPlus className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm sm:text-base font-bold text-foreground">
              Invite Classmates
            </h4>
            <p className="text-xs text-muted-foreground">
              Invite friends to earn +250 XP
            </p>
          </div>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" /> +250 XP
        </span>
      </div>

      {/* Action Buttons: 2 Equal-Width Prominent Buttons */}
      <div className="grid grid-cols-2 gap-2.5 pt-0.5">
        <Button
          onClick={handleCopyInvite}
          className="h-10.5 sm:h-11 rounded-xl text-xs sm:text-sm font-bold bg-violet-600 hover:bg-violet-700 text-white gap-2 shadow-xs active:scale-[0.98]"
        >
          {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
        </Button>

        <Button
          variant="outline"
          onClick={handleWhatsAppShare}
          className="h-10.5 sm:h-11 rounded-xl text-xs sm:text-sm font-bold border-2 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 gap-2 active:scale-[0.98]"
        >
          <Share2 className="h-4 w-4" />
          <span>WhatsApp</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 sm:space-y-6 w-full max-w-full pb-10">
      {/* 1. URGENT NOTIFICATIONS BAR (Fines) */}
      {pendingFines > 0 && (
        <div
          onClick={() => setActiveTab("issued")}
          className="relative overflow-hidden rounded-2xl border border-destructive/30 bg-destructive/10 hover:bg-destructive/15 p-3.5 sm:p-4 transition-all duration-200 cursor-pointer shadow-xs flex items-center justify-between gap-3 group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-destructive/20 text-destructive flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold text-destructive truncate">
                You have {pendingFines} overdue book fine{pendingFines > 1 ? "s" : ""}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                Tap to view your issued books & clear dues via UPI
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="destructive"
            className="shrink-0 h-8 px-3 text-xs rounded-xl font-bold shadow-xs group-hover:translate-x-0.5 transition-transform"
          >
            <span>Resolve Now</span>
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      )}

      {/* 2. COMMAND CENTER HERO BANNER (WELCOME MESSAGE BOX) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/95 to-slate-900 text-white border border-indigo-500/20 shadow-xl p-5 sm:p-6 lg:p-7">
        {/* Ambient atmospheric glows */}
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 sm:gap-6">
          {/* Left: Avatar + Identity + Status */}
          <div className="flex items-center gap-4 sm:gap-5 min-w-0">
            {/* Student Avatar with online status */}
            <div className="relative shrink-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ring-2 ring-indigo-400/30 overflow-hidden bg-slate-800 flex items-center justify-center shadow-md">
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
                        span.className = "text-xl sm:text-2xl font-black text-white fallback-char";
                        span.textContent = fullName[0] || "S";
                        parent.appendChild(span);
                      }
                    }}
                  />
                ) : (
                  <span className="text-xl sm:text-2xl font-black text-indigo-200">
                    {fullName[0] || "S"}
                  </span>
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-900" />
              </span>
            </div>

            {/* Greetings & Info */}
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold">
                <TimeIcon className="h-3.5 w-3.5" />
                <span>{greeting}</span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white truncate">
                {fullName}
              </h1>
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                {user?.student_class && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/10 text-white border border-white/15">
                    Class {user.student_class}
                  </span>
                )}
                {user?.admission_number && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-white/5 text-white/80 border border-white/10">
                    ADM #{user.admission_number}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Gamified HUD Stats (Total XP, Class Rank, Catalog Shortcut) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
            {/* XP & Rank Duo: Guaranteed Equal Height Side-by-Side */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 items-stretch sm:flex sm:items-center">
              {/* Total XP Button */}
              <button
                onClick={() => navigate("/points-history")}
                className="h-[58px] sm:h-[60px] flex items-center gap-2.5 sm:gap-3 px-3.5 sm:px-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-md transition-all active:scale-95 shadow-xs group"
                title="View Points Ledger"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-400/20 flex items-center justify-center text-amber-300 shrink-0 group-hover:scale-110 transition-transform">
                  <Zap className="h-4 w-4 fill-amber-300" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-base sm:text-lg font-black leading-tight text-white truncate">
                    {(user?.points || 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/70 whitespace-nowrap">
                    Total XP
                  </p>
                </div>
              </button>

              {/* Class Rank Button */}
              <button
                onClick={() => setActiveTab("rankings")}
                className="h-[58px] sm:h-[60px] flex items-center gap-2.5 sm:gap-3 px-3.5 sm:px-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-md transition-all active:scale-95 shadow-xs group"
                title="View Class Leaderboard"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-400/20 flex items-center justify-center text-indigo-300 shrink-0 group-hover:scale-110 transition-transform">
                  <Trophy className="h-4 w-4" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-base sm:text-lg font-black leading-tight text-indigo-200 truncate">
                    #{classRank}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/70 whitespace-nowrap">
                    Class Rank
                  </p>
                </div>
              </button>
            </div>

            {/* Quick Browse Catalog Button */}
            <Button
              onClick={() => navigate("/catalog")}
              className="w-full sm:w-auto h-[50px] sm:h-[60px] px-4 rounded-2xl font-bold bg-white text-slate-900 hover:bg-white/90 shadow-md gap-2"
            >
              <Compass className="h-4.5 w-4.5 text-indigo-600" />
              <span>Explore Books</span>
              <ArrowUpRight className="h-4 w-4 text-slate-500" />
            </Button>
          </div>
        </div>
      </div>

      {/* 3. MOBILE HERO COMPANION (STREAK + LEVEL + INVITE IMMEDIATELY NEXT TO WELCOME BOX ON MOBILE) */}
      <div className="block lg:hidden space-y-3">
        {/* Streak & Level Duo - Side-by-Side 2 Columns */}
        <div className="grid grid-cols-2 gap-3 items-stretch">
          {streakData && !streakData.loading ? (
            <LoginStreakCard
              currentStreak={streakData.currentStreak}
              longestStreak={streakData.longestStreak}
              totalLoginDays={streakData.totalLoginDays}
              onPointsClaimed={checkAuth}
            />
          ) : null}

          <LevelProgress userPoints={user?.points || 0} />
        </div>

        {/* Invite Classmates Box */}
        <InviteCard />
      </div>

      {/* 4. LIVE QUIZ LEAGUE NOTICES (if available) */}
      {handleJoinQuizLeague && (
        <div className="space-y-3">
          <UpcomingQuizLeagueCard
            userId={user?.id}
            userClass={user?.student_class}
            onJoinLeague={handleJoinQuizLeague}
          />
          <LiveQuizAlert onJoinLeague={handleJoinQuizLeague} />
        </div>
      )}

      {/* 5. ACTIVE CAMPAIGN SPOTLIGHT (Vacation Banner) */}
      <VacationOverviewBanner onOpen={() => setActiveTab("vacation")} />

      {/* 6. SECONDARY QUESTS & SPECIAL EVENTS (Wrap, Bug Bounty, UI Reform) */}
      {hasSecondaryCampaigns && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Monthly Wrap Card */}
          {hasWrapActive && (
            <Card
              className="overflow-hidden border border-purple-500/30 bg-gradient-to-br from-slate-900 via-purple-950/70 to-indigo-950 text-white shadow-xs hover:shadow-md transition-all cursor-pointer group rounded-2xl"
              onClick={() => setShowMemoryCapsule?.(true)}
            >
              <CardContent className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 via-pink-500 to-indigo-500 p-0.5 shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                    <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-amber-300 animate-pulse" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge className="bg-gradient-to-r from-pink-500 to-purple-600 text-white border-0 text-[9px] font-black px-1.5 py-0.5">
                        {isWrapFirst7Days ? `${bannerMonth.toUpperCase()} WRAP` : "CAPSULE"}
                      </Badge>
                      <span className="text-[10px] font-bold text-emerald-400">READY</span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-white truncate mt-0.5">
                      {isWrapFirst7Days ? `${bannerMonth} Reading Wrap 🚀` : "Memory Capsule ✨"}
                    </p>
                  </div>
                </div>
                <Button size="sm" className="gradient-primary text-white border-0 font-bold rounded-xl shrink-0 h-8 text-xs px-3 shadow-xs">
                  <span>Open →</span>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Bug Bounty Quest Card */}
          {hasBountyActive && (
            <Card
              className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-card shadow-xs hover:shadow-md transition-all cursor-pointer group"
              onClick={() => setActiveTab("bounty")}
            >
              <CardContent className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    <Bug className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-foreground truncate">Bug Hunter Quest</span>
                      <Badge variant="outline" className="text-[9px] font-bold border-amber-500/40 text-amber-600 bg-amber-500/10 px-1.5 py-0.2">
                        +100 XP
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">Report bugs to earn library XP</p>
                  </div>
                </div>
                <Button size="sm" className="h-8 px-3 text-xs rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white shrink-0">
                  <span>Report →</span>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* UI Reform Challenge Card */}
          {hasReformActive && (
            <Card
              className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-card to-card shadow-xs hover:shadow-md transition-all cursor-pointer group"
              onClick={() => setActiveTab("ui-reform")}
            >
              <CardContent className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    <Palette className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-foreground truncate">UI Reform Challenge</span>
                      <Badge variant="outline" className="text-[9px] font-bold border-purple-500/40 text-purple-600 bg-purple-500/10 px-1.5 py-0.2">
                        +{activeReformCampaign.reward_points || 1000} XP
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">Submit layout ideas & wireframes</p>
                  </div>
                </div>
                <Button size="sm" className="h-8 px-3 text-xs rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white shrink-0">
                  <span>Submit →</span>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 7. KEY METRIC STRIP (4 Refined Executive KPI Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4.5">
        {/* Metric 1: Books Reading */}
        <div
          onClick={() => setActiveTab("books")}
          className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-sky-500/20 bg-gradient-to-b from-sky-500/[0.05] via-card to-card hover:border-sky-500/40 hover:shadow-md p-4 sm:p-5 transition-all duration-200 cursor-pointer group active:scale-[0.98] shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl sm:rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="text-[10px] sm:text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 sm:px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <span>My Books</span>
              <ChevronRight className="h-3 w-3" />
            </span>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">{currentBooksCount}</p>
            <p className="text-xs text-muted-foreground font-medium mt-1 truncate">
              {currentBooksCount === 1 ? "Active book reading" : "Active books reading"}
            </p>
          </div>
        </div>

        {/* Metric 2: Monthly Reading Goal */}
        <div
          onClick={() => setActiveTab("portfolio")}
          className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/[0.05] via-card to-card hover:border-emerald-500/40 hover:shadow-md p-4 sm:p-5 transition-all duration-200 cursor-pointer group active:scale-[0.98] shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl sm:rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Target className="h-5 w-5" />
            </div>
            <span className="text-[10px] sm:text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 sm:px-2.5 py-0.5 rounded-full">
              {goalPercentage}% Done
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">{monthlyBooksRead}</span>
              <span className="text-xs font-semibold text-muted-foreground">/{schoolReadingGoal} goal</span>
            </div>
            <div className="mt-2.5">
              <Progress value={goalPercentage} className="h-1.5 bg-muted rounded-full" />
            </div>
          </div>
        </div>

        {/* Metric 3: Quizzes Completed */}
        <div
          onClick={() => setActiveTab("quizzes")}
          className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-purple-500/20 bg-gradient-to-b from-purple-500/[0.05] via-card to-card hover:border-purple-500/40 hover:shadow-md p-4 sm:p-5 transition-all duration-200 cursor-pointer group active:scale-[0.98] shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl sm:rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Brain className="h-5 w-5" />
            </div>
            <span className="text-[10px] sm:text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 sm:px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <span>Quizzes</span>
              <ChevronRight className="h-3 w-3" />
            </span>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">{quizResultsCount}</p>
            <p className="text-xs text-muted-foreground font-medium mt-1 truncate">
              Completed quizzes
            </p>
          </div>
        </div>

        {/* Metric 4: Badges Unlocked */}
        <div
          onClick={() => setActiveTab("badges")}
          className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-amber-500/20 bg-gradient-to-b from-amber-500/[0.05] via-card to-card hover:border-amber-500/40 hover:shadow-md p-4 sm:p-5 transition-all duration-200 cursor-pointer group active:scale-[0.98] shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl sm:rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Award className="h-5 w-5" />
            </div>
            <span className="text-[10px] sm:text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 sm:px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <span>Badge Vault</span>
              <ChevronRight className="h-3 w-3" />
            </span>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">{badgesEarnedCount}</p>
            <p className="text-xs text-muted-foreground font-medium mt-1 truncate">
              Unlocked honors
            </p>
          </div>
        </div>
      </div>

      {/* 8. BALANCED 2-COLUMN DESKTOP LAYOUT (AND POLISHED LOWER MOBILE FLOW) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* MAIN COLUMN (8 cols on desktop) */}
        <div className="lg:col-span-8 space-y-6 min-w-0">
          {/* PRIMARY STUDENT LAUNCHPAD */}
          <Card className="border border-border/80 rounded-3xl overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="p-4 sm:p-6 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm sm:text-base font-extrabold flex items-center gap-2 text-foreground">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Compass className="h-4 w-4" />
                  </div>
                  <span>Student Launchpad</span>
                </CardTitle>
                <span className="text-xs text-muted-foreground font-medium">
                  Direct Library Hubs
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
              {/* 8 Primary Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
                {primaryHubs.map((hub) => {
                  const Icon = hub.icon;
                  return (
                    <button
                      key={hub.id}
                      onClick={hub.action}
                      className={`relative flex flex-col text-left p-3.5 sm:p-4 rounded-2xl border border-border/70 bg-card hover:bg-muted/40 ${hub.border} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95 group shadow-sm`}
                    >
                      {hub.badge && (
                        <span className="absolute top-2.5 right-2.5 px-1.5 py-0.2 rounded-md text-[8px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                          {hub.badge}
                        </span>
                      )}
                      <div className={`w-9 h-9 rounded-xl ${hub.bg} ${hub.color} flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        {hub.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                        {hub.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Secondary Quick Action Chips Strip */}
              <div className="pt-2 border-t border-border/40">
                <p className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  <span>Quick Access Shortcuts</span>
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {secondaryQuickChips.map((chip) => {
                    const ChipIcon = chip.icon;
                    return (
                      <button
                        key={chip.tab}
                        onClick={() => setActiveTab(chip.tab)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 bg-background/60 hover:bg-muted text-xs font-semibold text-foreground hover:border-primary/30 transition-all active:scale-95 shadow-2xs"
                      >
                        <ChipIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{chip.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Class Competitions (if enrolled) */}
          {user?.student_class && <ClassCompetitions userClass={user.student_class} />}

          {/* Personalized Book Recommendations */}
          {user?.id && (
            <div className="pt-1">
              <Recommendations userId={user.id} studentClass={user.student_class} />
            </div>
          )}
        </div>

        {/* SIDEBAR COLUMN (4 cols on desktop; on desktop it sits right next to the hero & main content) */}
        <div className="space-y-5 lg:space-y-6 min-w-0 lg:col-span-4">
          {/* Daily Login Streak (Desktop) */}
          <div className="hidden lg:block">
            {streakData && !streakData.loading ? (
              <LoginStreakCard
                currentStreak={streakData.currentStreak}
                longestStreak={streakData.longestStreak}
                totalLoginDays={streakData.totalLoginDays}
                onPointsClaimed={checkAuth}
              />
            ) : null}
          </div>

          {/* Level Progress (Desktop) */}
          <div className="hidden lg:block">
            <LevelProgress userPoints={user?.points || 0} />
          </div>

          {/* Invite Classmates Box (Desktop) */}
          <div className="hidden lg:block">
            <InviteCard />
          </div>

          {/* Pending Friend Requests (if any - Visible on both mobile and desktop) */}
          {pendingFriendRequests && pendingFriendRequests.length > 0 && handleRespondFriendRequest && (
            <Card className="rounded-3xl border border-indigo-200 dark:border-indigo-900/50 bg-gradient-to-r from-indigo-50/40 via-purple-50/20 to-card dark:from-indigo-950/20 dark:via-card dark:to-card shadow-sm hover:shadow-md transition-shadow p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-foreground">
                      Friend Requests ({pendingFriendRequests.length})
                    </h4>
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
                {pendingFriendRequests.slice(0, 2).map((req) => (
                  <div
                    key={req.id}
                    className="p-3 rounded-2xl bg-card border border-border/60 shadow-xs flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
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
                        className="h-7 px-2.5 text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRespondFriendRequest(req.id, "rejected")}
                        className="h-7 px-2 text-[10px] rounded-lg font-medium text-muted-foreground"
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recent Activity Timeline */}
          <Card className="border border-border/80 rounded-3xl overflow-hidden shadow-sm hover:shadow-md bg-card transition-shadow">
            <CardHeader className="p-4 sm:p-5 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-extrabold flex items-center gap-2 text-foreground">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span>Recent Activity</span>
                </CardTitle>
                <button
                  onClick={() => navigate("/points-history")}
                  className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                >
                  <Zap className="h-3 w-3" /> Ledger
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-0">
              {recentActivities && recentActivities.length > 0 ? (
                <div className="space-y-2">
                  {recentActivities.slice(0, 5).map((item, i) => {
                    const style = getActivityStyle(item.type);
                    const Icon = style.icon;
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all border border-border/30"
                      >
                        <div className={`w-8 h-8 rounded-lg ${style.bg} ${style.color} flex items-center justify-center shrink-0`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
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
                <div className="text-center py-7 text-muted-foreground space-y-1.5">
                  <Calendar className="h-8 w-8 mx-auto opacity-30 text-muted-foreground" />
                  <p className="text-xs font-semibold text-foreground">No recent activity</p>
                  <p className="text-[11px] text-muted-foreground">
                    Borrow books or complete daily quizzes to see your journey!
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
