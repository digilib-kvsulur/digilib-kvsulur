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
  UserPlus, Copy, Bug, Palette, AlertTriangle, ChevronRight, BookPlus,
  Compass, CheckCircle2, Medal, GraduationCap, Layers
} from "lucide-react";
import { AIBookCheckpointModal } from "@/components/student/AIBookCheckpointModal";

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
  const [showAICheckpoint, setShowAICheckpoint] = useState(false);

  // Time-aware greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  // Compute greeting name (if first name looks small or is initials, include 2nd or 3rd word)
  const greetingName = useMemo(() => {
    if (!user) return "Scholar";
    const firstName = (user.first_name || "").trim();
    const lastName = (user.last_name || "").trim();
    const fullName = `${firstName} ${lastName}`.trim() || user.name || "Scholar";

    const words = fullName.split(/\s+/).filter(Boolean);
    if (words.length === 0) return "Scholar";

    const formatWord = (w: string) => {
      if (w.length <= 2) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    };

    // If first name word is 1-2 chars (e.g. initials like "G", "G V", "A K"), show up to 3 words
    if (words[0].length <= 2 && words.length > 1) {
      const parts: string[] = [];
      for (let i = 0; i < Math.min(words.length, 3); i++) {
        parts.push(formatWord(words[i]));
        if (words[i].length > 2 && i >= 1) break; // Found the substantial name
      }
      return parts.join(" ");
    }

    // If first name word is very short (3 chars or less e.g. "Ali", "Dan", "Jay") and 2nd word exists
    if (words[0].length <= 3 && words.length > 1) {
      return `${formatWord(words[0])} ${formatWord(words[1])}`;
    }

    return formatWord(words[0]);
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

  // Quick Action App Tiles
  const quickActions = [
    { label: "CBSE Vault", icon: GraduationCap, tab: "cbse-vault", color: "text-indigo-400", bg: "bg-indigo-500/15", badge: "CBSE" },
    { label: "AI Checkpoint", icon: Sparkles, tab: "checkpoint", color: "text-purple-400", bg: "bg-purple-500/15", badge: "+50 XP" },
    { label: "Curriculum Reads", icon: Layers, tab: "curriculum", color: "text-teal-400", bg: "bg-teal-500/15", badge: "NEW" },
    { label: "NCERT Books", icon: BookOpen, tab: "ncert", color: "text-sky-400", bg: "bg-sky-500/15", badge: "E-BOOKS" },
    { label: "My Portfolio", icon: FileText, tab: "portfolio", color: "text-rose-500", bg: "bg-rose-500/10" },
    { label: "Games Corner", icon: Gamepad2, tab: "games", color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Study Tracker", icon: Timer, tab: "study", color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Quizzes", icon: Brain, tab: "quizzes", color: "text-purple-500", bg: "bg-purple-500/10", badge: "LIVE" },
    { label: "Certificates", icon: Award, tab: "certificates", color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Study Materials", icon: FileText, tab: "materials", color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { label: "Library Events", icon: CalendarDays, tab: "events", color: "text-pink-500", bg: "bg-pink-500/10" },
    { label: "Community", icon: Users, tab: "community", color: "text-orange-500", bg: "bg-orange-500/10" },
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

  /* -------------------------------------------------------------
     REUSABLE SECTIONS (USED FOR PRECISE ORDERING ON MOBILE & DESKTOP)
     ------------------------------------------------------------- */

  // 1. EVENT BANNER SECTION (Vacation Campaign + Monthly Memory Wrap)
  const EventBannerSection = () => (
    <div className="space-y-3">
      {/* Vacation Campaign Banner */}
      <VacationOverviewBanner onOpen={() => setActiveTab("vacation")} />

      {/* Monthly Memory Capsule Banner (if active) */}
      {(() => {
        if (!capsuleEnabled || !setShowMemoryCapsule) return null;
        const nowDate = new Date();
        const isWrapFirst7Days = nowDate.getDate() <= 7;
        const wrapPrevMonth = new Date(nowDate.getFullYear(), nowDate.getMonth() - 1, 1).toLocaleString("default", { month: "long" });
        const bannerMonth = isWrapFirst7Days ? wrapPrevMonth : nowDate.toLocaleString("default", { month: "long" });

        return (
          <Card
            className="overflow-hidden border border-purple-500/30 bg-gradient-to-r from-slate-950 via-purple-950/90 to-indigo-950 text-white shadow-xs hover:shadow-md transition-all cursor-pointer group rounded-2xl"
            onClick={() => setShowMemoryCapsule(true)}
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
              <Button size="sm" className="gradient-primary text-white border-0 font-bold rounded-xl shrink-0 h-8 text-xs px-3 shadow-xs">
                <span>Open →</span>
              </Button>
            </CardContent>
          </Card>
        );
      })()}

      {/* Active Bug Bounty / UI Reform Campaign */}
      {bountyVisible && activeBounty?.is_active && activeBounty.ends_at && new Date(activeBounty.ends_at).getTime() > Date.now() && (
        <Card
          className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-card shadow-xs hover:shadow-md transition-all cursor-pointer"
          onClick={() => setActiveTab("bounty")}
        >
          <CardContent className="p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                <Bug className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-foreground truncate">Bug Hunter Campaign</span>
                  <Badge variant="outline" className="text-[9px] font-bold border-amber-500/40 text-amber-600 bg-amber-500/10">
                    +100 XP
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">Spot bugs to earn rewarded library XP</p>
              </div>
            </div>
            <Button size="sm" className="h-7 px-3 text-xs rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white shrink-0">
              Report →
            </Button>
          </CardContent>
        </Card>
      )}

      {uiReformVisible && activeReformCampaign && activeReformCampaign.status !== "ended" && activeReformCampaign.ends_at && new Date(activeReformCampaign.ends_at).getTime() > Date.now() && (
        <Card
          className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-card shadow-xs hover:shadow-md transition-all cursor-pointer"
          onClick={() => setActiveTab("ui-reform")}
        >
          <CardContent className="p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                <Palette className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-foreground truncate">UI Reform Challenge</span>
                  <Badge variant="outline" className="text-[9px] font-bold border-purple-500/40 text-purple-600 bg-purple-500/10">
                    +{activeReformCampaign.reward_points || 1000} XP
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">Submit layout ideas & wireframes</p>
              </div>
            </div>
            <Button size="sm" className="h-7 px-3 text-xs rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white shrink-0">
              Submit →
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // 2. LEVEL PROGRESS
  const LevelSection = () => <LevelProgress userPoints={user?.points || 0} />;

  // 3. STREAK CARD
  const StreakSection = () => (
    streakData && !streakData.loading ? (
      <LoginStreakCard
        currentStreak={streakData.currentStreak}
        longestStreak={streakData.longestStreak}
        totalLoginDays={streakData.totalLoginDays}
        onPointsClaimed={checkAuth}
      />
    ) : null
  );

  // 4. INVITE CARD
  const InviteSection = () => (
    <Card className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-card to-purple-500/5 shadow-2xs">
      <CardContent className="p-3.5 sm:p-4 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-600 text-white flex items-center justify-center shrink-0">
              <UserPlus className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-bold text-foreground">Invite Classmates</span>
          </div>
          <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-[10px] font-bold px-2 py-0.5">
            <Sparkles className="h-2.5 w-2.5 mr-1" /> +250 XP
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug">
          Earn +250 XP for every friend who signs in with your invite link!
        </p>
        <div className="flex items-center gap-2 pt-0.5">
          <Button
            size="sm"
            onClick={handleCopyInvite}
            className="flex-1 h-8 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white gap-1 shadow-2xs"
          >
            {copiedLink ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleWhatsAppShare}
            className="h-8 rounded-xl text-xs font-semibold border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 px-2.5"
          >
            WhatsApp
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
  );

  // 5. STUDENT LAUNCHPAD (Interactive Mission Tiles)
  const LaunchpadSection = () => (
    <Card className="border border-border/70 rounded-3xl overflow-hidden bg-card/60 backdrop-blur-md shadow-sm">
      <CardHeader className="p-3.5 sm:p-4 pb-2.5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs sm:text-sm font-black flex items-center gap-2 text-foreground tracking-tight">
            <div className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center text-primary shadow-xs">
              <Compass className="h-3.5 w-3.5" />
            </div>
            <span>Student Launchpad</span>
          </CardTitle>
          <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-400" /> Fast-Track Library Zones
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-3.5 sm:p-4 pt-0">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-2.5">
          {quickActions.map((action: any) => (
            <button
              key={action.tab}
              onClick={() => {
                if (action.tab === "checkpoint") {
                  setShowAICheckpoint(true);
                } else {
                  setActiveTab(action.tab);
                }
              }}
              className="relative flex flex-col items-center justify-center text-center p-2.5 sm:p-3 rounded-2xl border border-border/60 bg-card hover:bg-muted/50 hover:border-primary/40 transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95 group shadow-2xs"
            >
              {action.badge && (
                <span className="absolute top-1.5 right-1.5 px-1.5 py-0.2 rounded-full text-[8px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                  {action.badge}
                </span>
              )}
              <div className={`w-9 h-9 rounded-xl ${action.bg} flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform shadow-2xs`}>
                <action.icon className={`h-4 w-4 ${action.color}`} />
              </div>
              <span className="text-xs font-bold text-foreground leading-tight line-clamp-1">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  // 6. THE STAT BOX (4 Futuristic Cyber-Academic Cards)
  const StatsSection = () => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
      {/* Books Reading */}
      <div
        onClick={() => setActiveTab("books")}
        className="relative overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-card to-card p-3.5 sm:p-4 hover:border-sky-500/50 hover:shadow-lg hover:shadow-sky-500/10 transition-all cursor-pointer group active:scale-[0.98]"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-500 dark:text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-xs">
            <BookOpen className="h-5 w-5" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-300 border border-sky-500/30">
            Reading
          </span>
        </div>
        <div className="space-y-0.5">
          <p className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">{currentBooksCount}</p>
          <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse inline-block shrink-0" /> in active progress
          </p>
        </div>
      </div>

      {/* Quizzes Taken */}
      <div
        onClick={() => setActiveTab("quizzes")}
        className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-card to-card p-3.5 sm:p-4 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all cursor-pointer group active:scale-[0.98]"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-500 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-xs">
            <Brain className="h-5 w-5" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30">
            Brain IQ
          </span>
        </div>
        <div className="space-y-0.5">
          <p className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">{quizResultsCount}</p>
          <p className="text-[11px] font-medium text-muted-foreground truncate">completed quizzes</p>
        </div>
      </div>

      {/* Monthly Goal Progress */}
      <div
        onClick={() => setActiveTab("portfolio")}
        className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-card to-card p-3.5 sm:p-4 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 transition-all cursor-pointer group active:scale-[0.98]"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-xs">
            <Target className="h-5 w-5" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 font-mono">
            {goalPercentage}%
          </span>
        </div>
        <div className="space-y-1">
          <p className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            {monthlyBooksRead}<span className="text-sm font-semibold text-muted-foreground">/{schoolReadingGoal}</span>
          </p>
          <Progress value={goalPercentage} className="h-1.5 bg-muted rounded-full" />
        </div>
      </div>

      {/* Badges Earned */}
      <div
        onClick={() => setActiveTab("badges")}
        className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-card to-card p-3.5 sm:p-4 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 transition-all cursor-pointer group active:scale-[0.98]"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-xs">
            <Award className="h-5 w-5" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30">
            ★ Vault
          </span>
        </div>
        <div className="space-y-0.5">
          <p className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">{badgesEarnedCount}</p>
          <p className="text-[11px] font-medium text-muted-foreground truncate">unlocked badges</p>
        </div>
      </div>
    </div>
  );
  );

  // 7. RECOMMENDATIONS
  const RecommendationsSection = () => (
    user?.id ? (
      <div className="pt-0.5">
        <Recommendations userId={user.id} studentClass={user.student_class} />
      </div>
    ) : null
  );

  // 8. HISTORY (Recent Activity)
  const HistorySection = () => (
    <Card className="border-border/60 rounded-2xl overflow-hidden shadow-2xs">
      <CardHeader className="p-3.5 sm:p-4 pb-2.5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs sm:text-sm font-extrabold flex items-center gap-2">
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
      <CardContent className="p-3.5 sm:p-4 pt-0">
        {recentActivities && recentActivities.length > 0 ? (
          <div className="space-y-2">
            {recentActivities.slice(0, 5).map((item, i) => {
              const style = getActivityStyle(item.type);
              return (
                <div
                  key={i}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all border border-border/30"
                >
                  <div className={`w-7 h-7 rounded-lg ${style.bg} ${style.color} flex items-center justify-center shrink-0`}>
                    <style.icon className="h-3.5 w-3.5" />
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
          <div className="text-center py-6 text-muted-foreground space-y-1">
            <Calendar className="h-8 w-8 mx-auto opacity-30" />
            <p className="text-xs font-semibold">No recent activity</p>
            <p className="text-[11px] text-muted-foreground">
              Read books or take quizzes to see your journey!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Pending Friend Requests (if any)
  const FriendRequestsSection = () => (
    pendingFriendRequests && pendingFriendRequests.length > 0 && handleRespondFriendRequest ? (
      <Card className="rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-gradient-to-r from-indigo-50/40 via-purple-50/20 to-card dark:from-indigo-950/20 dark:via-card dark:to-card shadow-2xs p-3.5">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Users className="h-3.5 w-3.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-foreground">
                Friend Requests ({pendingFriendRequests.length})
              </h4>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab("network")}
            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 h-6 px-1.5"
          >
            View All →
          </Button>
        </div>
        <div className="space-y-1.5">
          {pendingFriendRequests.slice(0, 2).map((req) => (
            <div
              key={req.id}
              className="p-2 rounded-xl bg-card border border-border/40 flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="h-7 w-7 border border-border shrink-0">
                  <AvatarImage src={req.avatar_url} />
                  <AvatarFallback className="text-[10px] font-bold bg-indigo-100 text-indigo-700">
                    {req.name?.slice(0, 2).toUpperCase() || "FR"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{req.name}</p>
                  {req.student_class && (
                    <p className="text-[9px] text-muted-foreground">Class {req.student_class}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  onClick={() => handleRespondFriendRequest(req.id, "accepted")}
                  className="h-6 px-2 text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
                >
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRespondFriendRequest(req.id, "rejected")}
                  className="h-6 px-1.5 text-[10px] rounded-lg font-medium text-muted-foreground"
                >
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    ) : null
  );

  return (
    <div className="space-y-4 sm:space-y-5 w-full max-w-full">
      {/* 1. URGENT NOTIFICATIONS BAR (Fines / Live Quizzes) */}
      {pendingFines > 0 && (
        <Card
          className="border-destructive/40 bg-destructive/10 hover:bg-destructive/15 transition-all cursor-pointer shadow-2xs rounded-2xl overflow-hidden"
          onClick={() => setActiveTab("issued")}
        >
          <CardContent className="p-3 sm:p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-destructive/20 text-destructive flex items-center justify-center shrink-0">
                <AlertTriangle className="h-4 w-4" />
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
            <Button size="sm" variant="destructive" className="shrink-0 h-7 text-xs rounded-xl font-bold px-2.5">
              <span>Pay Now</span>
              <ChevronRight className="h-3 w-3 ml-0.5" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 2. HEADER ANNOUNCEMENT ZONE: HERO GREETING + LIVE CHAMPIONSHIP */}
      <div className="space-y-2.5 sm:space-y-3">
        {/* Good Afternoon Hero Box */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/20 shadow-md px-4 py-3 sm:px-5 sm:py-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            {/* Avatar + Greeting */}
            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
              <div className="relative shrink-0 w-11 h-11 sm:w-13 sm:h-13">
                <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-xl ring-2 ring-indigo-400/30 overflow-hidden bg-slate-900 flex items-center justify-center shadow-sm aspect-square shrink-0">
                  {user?.avatar_url ? (
                    <img
                      src={getAvatarUrl(user.avatar_url)}
                      alt="Profile"
                      className="w-full h-full object-cover aspect-square"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                        const parent = e.currentTarget.parentElement;
                        if (parent && !parent.querySelector(".fallback-char")) {
                          const span = document.createElement("span");
                          span.className = "text-lg sm:text-xl font-black text-white fallback-char";
                          span.textContent = greetingName[0] || "S";
                          parent.appendChild(span);
                        }
                      }}
                    />
                  ) : (
                    <span className="text-lg sm:text-xl font-black text-indigo-200">
                      {greetingName[0] || "S"}
                    </span>
                  )}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-900"></span>
                </span>
              </div>

              <div className="min-w-0 space-y-0.5">
                <h2 className="text-base sm:text-xl font-black tracking-tight text-white flex items-center gap-1.5 flex-wrap">
                  <span>{greeting}, {greetingName}!</span>
                  <span>👋</span>
                </h2>
                {user?.student_class && (
                  <div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/10 text-white/90 border border-white/15 shadow-2xs">
                      Class {user.student_class}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Gamified XP & Rank Badges */}
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                onClick={() => navigate("/points-history")}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white backdrop-blur-md transition-all active:scale-95 shadow-2xs"
                title="View Points History"
              >
                <Zap className="h-3.5 w-3.5 fill-amber-300 text-amber-300 shrink-0" />
                <div className="text-left">
                  <p className="text-xs sm:text-sm font-black leading-tight text-amber-300">
                    {(user?.points || 0).toLocaleString()}
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-white/70">
                    Total XP
                  </p>
                </div>
              </button>

              <button
                onClick={() => setActiveTab("rankings")}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white backdrop-blur-md transition-all active:scale-95 shadow-2xs"
                title="View Class Rankings"
              >
                <Trophy className="h-3.5 w-3.5 text-indigo-300 shrink-0" />
                <div className="text-left">
                  <p className="text-xs sm:text-sm font-black leading-tight text-indigo-200">
                    #{classRank}
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-white/70">
                    Class Rank
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Championship live / upcoming banner (directly beneath Good afternoon box) */}
        {handleJoinQuizLeague && (
          <div className="space-y-2.5">
            <UpcomingQuizLeagueCard
              userId={user?.id}
              userClass={user?.student_class}
              onJoinLeague={handleJoinQuizLeague}
            />
            <LiveQuizAlert onJoinLeague={handleJoinQuizLeague} />
          </div>
        )}
      </div>

      {/* 3. MOBILE VIEW (< lg): EXACT SEQUENCE REQUESTED:
             1. Event banner
             2. Level
             3. Streak
             4. Invite
             5. Launchpad
             6. The stat box
             7. Recommendation
             8. History */}
      <div className="flex flex-col gap-4 lg:hidden">
        {/* 1. Event banner */}
        <EventBannerSection />

        {/* 2. Level */}
        <LevelSection />

        {/* 3. Streak */}
        <StreakSection />

        {/* 4. Invite */}
        <InviteSection />

        {/* 5. Launchpad */}
        <LaunchpadSection />

        {/* 6. The stat box */}
        <StatsSection />

        {/* Class competitions (if enrolled) */}
        {user?.student_class && <ClassCompetitions userClass={user.student_class} />}

        {/* 7. Recommendation */}
        <RecommendationsSection />

        {/* 8. History */}
        <HistorySection />

        {/* Pending friend requests */}
        <FriendRequestsSection />
      </div>

      {/* 4. DESKTOP VIEW (>= lg): CLEAN, UNCLUTTERED TWO-COLUMN BALANCED LAYOUT */}
      <div className="hidden lg:grid lg:grid-cols-12 lg:gap-6 items-start">
        {/* Left / Main Column (8 cols) */}
        <div className="lg:col-span-8 space-y-5 min-w-0">
          {/* Active Event Banner */}
          <EventBannerSection />

          {/* At-a-Glance Stat Box */}
          <StatsSection />

          {/* Student Launchpad */}
          <LaunchpadSection />

          {/* Class Competitions (if enrolled) */}
          {user?.student_class && <ClassCompetitions userClass={user.student_class} />}

          {/* Personalized Book Recommendations */}
          <RecommendationsSection />
        </div>

        {/* Right / Sidebar Column (4 cols) */}
        <div className="lg:col-span-4 space-y-5 min-w-0">
          {/* 1. Daily Login Streak */}
          <StreakSection />

          {/* 2. Level Progress */}
          <LevelSection />

          {/* 3. Invite Friends */}
          <InviteSection />

          {/* 4. Pending Friend Requests */}
          <FriendRequestsSection />

          {/* 5. Recent Activity Timeline */}
          <HistorySection />
        </div>
      </div>

      {/* AI Book Checkpoint Dialog */}
      <AIBookCheckpointModal
        isOpen={showAICheckpoint}
        onClose={() => setShowAICheckpoint(false)}
        bookTitle="Wings of Fire: An Autobiography"
        bookAuthor="Dr. A.P.J. Abdul Kalam"
        userId={user?.id}
        onPointsEarned={checkAuth}
      />
    </div>
  );
}
