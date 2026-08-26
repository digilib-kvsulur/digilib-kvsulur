import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/utils";
import {
  BookOpen, LogOut, Trophy, Target, User, BookPlus, Home, Brain,
  Flame, Medal, Search, ChevronRight, Star, Calendar, TrendingUp, Menu, X,
  StickyNote, Users, GraduationCap, FileText, Bookmark, CalendarDays, Award,
  LifeBuoy, AlertTriangle, Newspaper, BookCheck, Timer, Gamepad2, Zap, MessageSquare, Compass
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLoginStreak } from "@/hooks/useLoginStreak";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { Progress } from "@/components/ui/progress";

import LevelProgress from "@/components/dashboard/LevelProgress";
import QuizPage from "@/components/dashboard/QuizPage";
import LoginStreakCard from "@/components/dashboard/LoginStreakCard";
import ReadingChallenges from "@/components/rewards/ReadingChallenges";
import StudentProfile from "@/components/dashboard/StudentProfile";
import BookRequestForm from "@/components/BookRequestForm";
import ReadingVelocity from "@/components/student/ReadingVelocity";
import ClassCompetitions from "@/components/student/ClassCompetitions";
import CurrentlyReading from "@/components/student/CurrentlyReading";
import StudyPlan from "@/components/student/StudyPlan";
import StudyGuide from "@/components/student/StudyGuide";
import { LibraryBot } from "@/components/chat/LibraryBot";
import ReadingHistoryManager from "@/components/dashboard/ReadingHistoryManager";
import LevelUpBanner from "@/components/rewards/LevelUpBanner";
import Rankings from "@/components/dashboard/Rankings";
import { StudentQuiz } from "@/components/quiz/StudentQuiz";
import { LiveQuizAlert } from "@/components/quiz/LiveQuizAlert";

import QuickBookmarks from "@/components/dashboard/QuickBookmarks";
import NotificationBell from "@/components/dashboard/NotificationBell";
import StudentNotes from "@/components/dashboard/StudentNotes";
import NCERTBooks from "@/components/dashboard/NCERTBooks";
import StudyMaterials from "@/components/dashboard/StudyMaterials";
import StudyTracker from "@/components/dashboard/StudyTracker";
import GamesCorner from "@/components/games/GamesCorner";
import Community from "@/components/community/Community";
import EventsList from "@/components/dashboard/EventsList";
import Recommendations from "@/components/dashboard/Recommendations";
import BadgeCabinet from "@/components/rewards/BadgeCabinet";
import NetworkTab from "@/components/dashboard/NetworkTab";
import ProfileCompletionDialog from "@/components/dashboard/ProfileCompletionDialog";
import ReturnedBookReviewPrompt from "@/components/dashboard/ReturnedBookReviewPrompt";
import SupportCenter from "@/components/support/SupportCenter";
import MonthlyGoalsWidget from "@/components/dashboard/MonthlyGoalsWidget";
import StudentCertificates from "@/components/dashboard/StudentCertificates";
import Periodicals from "@/components/dashboard/Periodicals";
import IssuedBooksHub from "@/components/dashboard/IssuedBooksHub";
import { PWAControls } from "@/components/PWAControls";
import { fetchMonthlyReadingGoal } from "@/lib/librarySettings";

import StudentPortfolio from "./StudentPortfolio";
import Feedback from "./Feedback";
import LibraryMapExplorer from "@/components/student/LibraryMapExplorer";
import MobileBottomNav, { mobileNavSections } from "@/components/dashboard/MobileBottomNav";

type Tab = "overview" | "books" | "issued" | "events" | "ncert" | "materials" | "study" | "games" | "notes" | "community" | "quizzes" | "challenges" | "badges" | "certificates" | "rankings" | "network" | "support" | "profile" | "periodicals" | "portfolio" | "feedback" | "locator";

const baseNavItems: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "portfolio", label: "My Portfolio", icon: FileText },
  { id: "books", label: "Books", icon: BookOpen },
  { id: "issued", label: "Book Issued", icon: BookCheck },
  { id: "events", label: "Events", icon: CalendarDays },
  { id: "materials", label: "Study Materials", icon: FileText },
  { id: "study", label: "Study Tracker", icon: Timer },
  { id: "games", label: "Games Corner", icon: Gamepad2 },
  { id: "notes", label: "My Notes", icon: StickyNote },
  { id: "community", label: "Community", icon: Users },
  { id: "quizzes", label: "Quizzes", icon: Brain },
  { id: "badges", label: "Badge Cabinet", icon: Award },
  { id: "rankings", label: "Rankings", icon: Medal },
  { id: "network", label: "Network", icon: Users },
  { id: "support", label: "Help & Support", icon: LifeBuoy },
  { id: "profile", label: "Profile", icon: User },
  { id: "feedback", label: "Feedback", icon: MessageSquare },
];

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [showBookRequest, setShowBookRequest] = useState(false);
  const [classRank, setClassRank] = useState<number | string>("N/A");
  const [currentBooksCount, setCurrentBooksCount] = useState(0);
  const [quizResultsCount, setQuizResultsCount] = useState(0);
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
  const [currentBooks, setCurrentBooks] = useState<any[]>([]);
  const [availableQuizzes, setAvailableQuizzes] = useState<any[]>([]);
  const [quizResults, setQuizResults] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [previousLevel, setPreviousLevel] = useState<number | null>(null);
  const [levelUpBanner, setLevelUpBanner] = useState<any>(null);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [monthlyBooksRead, setMonthlyBooksRead] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Once the student completes profile setup, this permanently hides the dialog
  // regardless of stale auth metadata (avoids the re-open loop).
  const [profileSetupComplete, setProfileSetupComplete] = useState(false);

  const [badgesEarnedCount, setBadgesEarnedCount] = useState(0);
  const [schoolReadingGoal, setSchoolReadingGoal] = useState(3);
  const [pendingFines, setPendingFines] = useState(0);
  const [periodicalsVisible, setPeriodicalsVisible] = useState(false);
  const [issueHistory, setIssueHistory] = useState<any[]>([]);
  const [hasCertificates, setHasCertificates] = useState(false);

  const streakData = useLoginStreak(user?.id);
  usePushSubscription(user?.id);

  const navItems = useMemo(() => {
    const items = [...baseNavItems];
    const badgesIdx = items.findIndex((i) => i.id === "badges");
    if (hasCertificates && badgesIdx >= 0) {
      items.splice(badgesIdx + 1, 0, { id: "certificates" as Tab, label: "Certificates", icon: Award });
    }
    if (periodicalsVisible) {
      const eventsIdx = items.findIndex((i) => i.id === "events");
      items.splice(eventsIdx >= 0 ? eventsIdx + 1 : items.length, 0, {
        id: "periodicals" as Tab,
        label: "Periodicals",
        icon: Newspaper,
      });
    }
    return items;
  }, [periodicalsVisible, hasCertificates]);

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    try {
      // Prefer refreshSession to get up-to-date user_metadata; fall back to getSession if it fails
      let session: any = null;
      try {
        const { data: refreshed } = await supabase.auth.refreshSession();
        session = refreshed.session;
      } catch (_) {}
      if (!session) {
        const { data: { session: cached } } = await supabase.auth.getSession();
        session = cached;
      }
      if (!session) { navigate('/login'); return; }
      const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (error || !profile) { navigate('/login'); return; }
      if (!profile.is_approved) {
        toast({ title: "Account Pending", description: "Your account is pending admin approval.", variant: "destructive" });
        navigate('/login'); return;
      }

      // Read needs_profile_update from auth metadata (works even without DB migration)
      const metaNeedsUpdate = session.user.user_metadata?.needs_profile_update === true;
      // Fallback: also check the profile column if the migration has been run
      const profileNeedsUpdate = (profile as any).needs_profile_update === true;
      const mergedUser = {
        ...profile,
        needs_profile_update: metaNeedsUpdate || profileNeedsUpdate,
        // Pre-fill from auth metadata if profile fields are empty
        first_name: profile.first_name || session.user.user_metadata?.first_name || "",
        last_name: profile.last_name || session.user.user_metadata?.last_name || "",
        student_class: profile.student_class || session.user.user_metadata?.student_class || "",
      };

      if (profile.points !== null) {
        try {
          const { data: levelData } = await supabase.rpc('get_user_level', { user_points: profile.points });
          if (levelData && levelData.length > 0) setPreviousLevel(levelData[0].level_number);
        } catch (e) { console.error(e); }
      }
      setUser(mergedUser);
      if (mergedUser.student_class && profile.points !== null) {
        try {
          const { data: rankData, error: rankError } = await supabase.rpc('get_user_class_rank', { user_class: mergedUser.student_class, user_points: profile.points || 0 });
          if (!rankError && rankData !== null) setClassRank(rankData);
        } catch (e) { console.error(e); }
      }
    } catch (e) { navigate('/login'); }
    finally { setLoading(false); }
  };

  const checkLevelUp = async (newPoints: number) => {
    if (!user?.id || previousLevel === null) return;
    try {
      const { data: newLevelData } = await supabase.rpc('get_user_level', { user_points: newPoints });
      if (newLevelData && newLevelData.length > 0) {
        const newLevel = newLevelData[0].level_number;
        if (newLevel > previousLevel) setLevelUpBanner({ level_number: newLevel, name: newLevelData[0].name, icon_name: newLevelData[0].icon_name, color: newLevelData[0].color });
        setPreviousLevel(newLevel);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (user?.points && previousLevel !== null) checkLevelUp(user.points); }, [user?.points, previousLevel]);

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/login'); };
  const handleProfileUpdate = () => {
    // Permanently dismiss the dialog on the client side first.
    // This prevents checkAuth() from re-opening it even if auth metadata is stale.
    setProfileSetupComplete(true);
    setUser((prev: any) => prev ? { ...prev, needs_profile_update: false } : prev);
    // Refresh data in background (non-blocking)
    checkAuth();
  };

  const handleQuizComplete = async (result: { score: number; pointsEarned: number; totalPointsAwarded?: number; completionBonus?: number }) => {
    await Promise.all([checkAuth(), fetchQuizResults(), fetchChallenges(), fetchBadgesCount()]);
    const total = result.totalPointsAwarded ?? result.pointsEarned;
    toast({ title: "Quiz Completed! 🎉", description: `Score: ${result.score}% · Earned ${total} points!` });
    setSelectedQuiz(null);
  };

  const fetchCurrentBooks = async () => {
    if (!user?.id) return;
    const { data } = await supabase.from('book_issues').select('*, books (title, author, isbn, category, description, cover_url)').eq('user_id', user.id).eq('status', 'issued');
    setCurrentBooks(data || []); setCurrentBooksCount(data?.length || 0);
  };

  const fetchQuizResults = async () => {
    if (!user?.id) return;
    const { data } = await supabase.from('quiz_results').select('*, quizzes (title, description, subject, difficulty, questions)').eq('user_id', user.id).order('completed_at', { ascending: false }).limit(50);
    setQuizResults(data || []); setQuizResultsCount(data?.length || 0);
  };

  const fetchAvailableQuizzes = async () => {
    const { data } = await supabase.from('quizzes')
      .select('id, title, description, difficulty, time_limit, points_reward, questions, is_active, created_at, created_by')
      .eq('is_active', true).order('created_at', { ascending: false });
    setAvailableQuizzes(data?.map(q => ({ 
      id: q.id, 
      title: q.title, 
      description: q.description || '', 
      difficulty: q.difficulty, 
      timeLimit: q.time_limit, 
      pointsReward: q.points_reward, 
      completionBonus: (q as any).completion_bonus ?? 10, 
      questions: Array.isArray(q.questions) ? q.questions : [], 
      isActive: q.is_active, 
      createdAt: q.created_at, 
      createdBy: q.created_by 
    })) || []);
  };

  const fetchChallenges = async () => {
    const { data: challengeData } = await supabase.from('challenges')
      .select('id, title, description, target_value, type, reward_points, deadline, is_active')
      .eq('is_active', true).order('created_at', { ascending: false });
    if (!challengeData?.length) { setChallenges([]); return; }
    const { data: progressData } = await supabase.from('challenge_progress')
      .select('challenge_id, current_progress, is_completed, completed_at, is_claimed')
      .eq('user_id', user?.id).in('challenge_id', challengeData.map(c => c.id));
    setChallenges(challengeData.map(c => {
      const p = progressData?.find(pr => pr.challenge_id === c.id);
      return { id: c.id, title: c.title, description: c.description, targetValue: c.target_value, currentProgress: p?.current_progress || 0, type: c.type, reward: { points: c.reward_points }, deadline: c.deadline, isCompleted: p?.is_completed || false, completedAt: p?.completed_at, isClaimed: p?.is_claimed || false };
    }));
  };

  const fetchRecentActivities = async () => {
    if (!user?.id) return;
    const activities: any[] = [];
    
    // Fetch all activity types in parallel to eliminate sequential waterfall
    const [
      { data: bookIssues },
      { data: qr },
      { data: rh },
      { data: reqs },
      { data: ss },
      { data: gp }
    ] = await Promise.all([
      supabase.from('book_issues').select('created_at, books (title)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('quiz_results').select('completed_at, score, points_earned, quizzes (title)').eq('user_id', user.id).order('completed_at', { ascending: false }).limit(5),
      supabase.from('reading_history').select('book_title, completed_date, points_earned').eq('user_id', user.id).order('completed_date', { ascending: false }).limit(5),
      supabase.from('book_requests').select('status, created_at, books (title)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
      supabase.from('study_sessions').select('material_title, ended_at, points_earned').eq('user_id', user.id).not('ended_at', 'is', null).order('ended_at', { ascending: false }).limit(5),
      supabase.from('game_plays').select('game_key, played_at, points_earned, is_win').eq('user_id', user.id).order('played_at', { ascending: false }).limit(5)
    ]);

    bookIssues?.forEach(i => activities.push({ type: 'book', title: `Started reading '${(i.books as any)?.title || 'Unknown'}'`, time: i.created_at }));
    qr?.forEach(r => activities.push({ type: 'quiz', title: `Completed quiz: ${(r.quizzes as any)?.title || 'Quiz'}`, time: r.completed_at, score: r.score, points: r.points_earned }));
    rh?.forEach(e => activities.push({ type: 'reading', title: `Finished reading '${e.book_title}'`, time: e.completed_date, points: e.points_earned }));
    reqs?.forEach(r => activities.push({ type: 'request', title: `Requested book '${(r.books as any)?.title || 'Unknown'}'`, time: r.created_at, status: r.status }));
    ss?.forEach(s => activities.push({ type: 'study', title: `Study session: ${s.material_title || 'General study'}`, time: s.ended_at, points: s.points_earned }));
    gp?.forEach(g => { const name = g.game_key.replace(/-/g,' ').replace(/\b\w/g,(c:string)=>c.toUpperCase()); activities.push({ type: 'game', title: `Played: ${name}`, time: g.played_at, points: g.points_earned }); });

    // Date-only strings (e.g. "2026-08-08" from reading_history.completed_date) parse to
    // midnight UTC which in IST (+5:30) = 5:30 AM, pushing them above same-day activities.
    // Treat date-only strings as noon local time so they sort naturally in the timeline.
    const toMs = (t: string) => {
      if (!t) return 0;
      // ISO timestamp already has a 'T' — use as-is
      if (t.includes('T') || t.includes(' ')) return new Date(t).getTime();
      // Date-only string: append noon local time to avoid UTC midnight artifact
      return new Date(`${t}T12:00:00`).getTime();
    };
    activities.sort((a, b) => toMs(b.time) - toMs(a.time));
    setRecentActivities(activities.slice(0, 15));
  };

  const fetchMonthlyBooksRead = async () => {
    if (!user?.id) return;
    const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    // Use count-only query — sends zero row data, just a header count
    const [{ count }, goal] = await Promise.all([
      supabase.from('reading_history')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('status', 'approved').gte('completed_date', start),
      fetchMonthlyReadingGoal(),
    ]);
    setMonthlyBooksRead(count || 0);
    setSchoolReadingGoal(goal);
  };

  const fetchBadgesCount = async () => {
    if (!user?.id) return;
    try {
      // Ensure auto-badges are awarded in real-time
      await supabase.rpc('check_and_award_badges', { p_user_id: user.id });

      const [{ data: allBadges }, { data: awards }, { count: books }, { count: quizzes }, { data: streak }, { data: actStats }] = await Promise.all([
        supabase.from("badges").select("*").eq("is_active", true),
        supabase.from("badge_awards").select("badge_id").eq("user_id", user.id),
        supabase.from("reading_history").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "approved"),
        supabase.from("quiz_results").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("login_streaks").select("current_streak").eq("user_id", user.id).maybeSingle(),
        supabase.rpc("get_user_activity_stats", { _user_id: user.id }),
      ]);
      
      const manualAwards = new Set((awards || []).map((a: any) => a.badge_id));
      const act: any = ((actStats as any) || [])[0] || {};
      const stats = {
        points: user.points || 0,
        booksRead: books || 0,
        quizzes: quizzes || 0,
        streak: streak?.current_streak || 0,
        postsCount: act.posts_count || 0,
        commentsCount: act.comments_count || 0,
        friendsCount: act.friends_count || 0,
        booksIssued: act.books_issued || 0,
        reviewsCount: act.reviews_count || 0,
      };
      
      const getStatValue = (type?: string) => {
        if (type === "points") return stats.points;
        if (type === "books_read") return stats.booksRead;
        if (type === "quizzes_completed") return stats.quizzes;
        if (type === "login_streak") return stats.streak;
        if (type === "posts_count") return stats.postsCount;
        if (type === "comments_count") return stats.commentsCount;
        if (type === "friends_count") return stats.friendsCount;
        if (type === "books_issued") return stats.booksIssued;
        if (type === "reviews_count") return stats.reviewsCount;
        return 0;
      };
      
      const unlockedCount = (allBadges || []).filter((b: any) => {
        if (manualAwards.has(b.id)) return true;
        if (b.criteria_type === "manual" || !b.criteria_type) return false;
        const target = b.criteria_value ?? 0;
        if (target <= 0) return false;
        return getStatValue(b.criteria_type) >= target;
      }).length;
      
      setBadgesEarnedCount(unlockedCount);
    } catch (e) {
      console.error("Error fetching badges count:", e);
    }
  };

  const handleJoinChallenge = (id: string) => console.log("Joining:", id);
  const handleClaimReward = async (id: string) => {
    await supabase.from('challenge_progress').update({ is_claimed: true }).eq('challenge_id', id).eq('user_id', user?.id);
    toast({ title: "Reward Claimed!" }); await Promise.all([checkAuth(), fetchChallenges()]);
  };

  useEffect(() => {
    if (user?.id) {
      fetchCurrentBooks(); fetchQuizResults(); fetchAvailableQuizzes(); fetchChallenges();
      fetchRecentActivities(); fetchMonthlyBooksRead(); fetchBadgesCount();
      supabase.from("library_fines").select("id, status")
        .eq("user_id", user.id)
        .then(({ data }) => {
          const rows = data || [];
          setPendingFines(rows.filter((r) => r.status === "pending").length);
        });
      supabase.from("system_settings").select("value").eq("key", "periodicals_visible_to_students").maybeSingle()
        .then(({ data }) => {
          const v = data?.value;
          setPeriodicalsVisible(v === true || v === "true" || (typeof v === "string" && String(v).replace(/"/g, "") === "true"));
        });
      supabase
        .from("book_issues")
        .select("id, status, issue_date, due_date, return_date, accession_number, books(title, author)")
        .eq("user_id", user.id)
        .order("issue_date", { ascending: false })
        .then(({ data }) => setIssueHistory(data || []));
      supabase
        .from("issued_certificates")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .then(({ count }) => setHasCertificates((count || 0) > 0));
    }
  }, [user?.id]);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4" /><p className="text-muted-foreground">Loading your dashboard...</p></div>
    </div>
  );
  if (!user) return null;
  if (selectedQuiz) return <StudentQuiz quiz={selectedQuiz} onComplete={handleQuizComplete} onBack={() => setSelectedQuiz(null)} />;

  const getTimeAgo = (d: string) => {
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return 'Just now'; if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`; return `${Math.floor(s/86400)}d ago`;
  };

  return (
    <div className="h-dvh overflow-hidden bg-background flex">
      <ReturnedBookReviewPrompt userId={user?.id} />
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 bg-card border-r border-border flex-col fixed h-full z-40">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center -space-x-2 shrink-0">
              <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm z-10" title="PM SHRI Logo">
                <img src="/logos/pm-shri.png" alt="PM SHRI" className="w-full h-full object-contain p-1" />
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm z-20" title="KV Logo">
                <img src="/logos/kv.png" alt="KV" className="w-full h-full object-contain p-1" />
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-foreground truncate">PM SHRI KV SULUR</h1>
              <p className="text-xs text-muted-foreground">DLMS Student Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 min-h-0 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === item.id ? 'gradient-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="shrink-0 p-4 border-t border-border space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border border-border">
              {user?.avatar_url && <AvatarImage src={getAvatarUrl(user.avatar_url)} className="object-cover" />}
              <AvatarFallback className="gradient-primary text-primary-foreground font-bold text-sm">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{user?.first_name} {user?.last_name}</p>
              <p className="text-xs text-muted-foreground">Class {user?.student_class}</p>
            </div>
            <NotificationBell />
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="p-1.5 rounded-lg hover:bg-muted">
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <span className="font-bold text-sm text-foreground">KV Sulur Library</span>
          </div>
          <div className="flex items-center gap-1">
            <PWAControls userId={user?.id} />
            <NotificationBell />
            <Button variant="ghost" size="sm" onClick={() => navigate('/catalog')}><Search className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
        {mobileNavOpen && (
          <div className="bg-card border-b border-border px-4 pb-3 max-h-[65vh] overflow-y-auto space-y-3">
            {mobileNavSections.map((section) => {
              const sectionItems = section.items.filter((item) =>
                navItems.some((n) => n.id === item.id) || item.id === "locator" || item.id === "challenges"
              );
              if (sectionItems.length === 0) return null;
              return (
                <div key={section.title}>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">{section.title}</p>
                  <div className="space-y-0.5">
                    {sectionItems.map((item) => {
                      const navItem = navItems.find((n) => n.id === item.id) || item;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => { setActiveTab(item.id as Tab); setMobileNavOpen(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${activeTab === item.id ? "gradient-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                        >
                          <navItem.icon className="h-4 w-4 shrink-0" /> {navItem.label || item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="h-dvh min-h-0 flex-1 overflow-y-auto pt-10 pb-24 lg:pb-0 lg:ml-64 lg:pt-4">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
          {levelUpBanner && <LevelUpBanner newLevel={levelUpBanner} onClose={() => setLevelUpBanner(null)} />}

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {pendingFines > 0 && (
                <Card className="border-destructive/40 bg-destructive/5 cursor-pointer" onClick={() => setActiveTab("issued")}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <div>
                      <p className="text-sm font-semibold text-destructive">You have {pendingFines} pending fine(s)</p>
                      <p className="text-xs text-muted-foreground">Open Book Issued → Fines to pay via UPI</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {/* Welcome Banner */}
              <Card className="overflow-hidden border-0 shadow-xl">
                <div className="gradient-primary relative overflow-hidden">
                  {/* Decorative circles */}
                  <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
                  <div className="absolute -bottom-10 -left-10 w-52 h-52 rounded-full bg-white/5" />
                  <div className="absolute top-4 right-32 w-20 h-20 rounded-full bg-white/5" />
                  <div className="relative p-4 sm:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-5">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/20 overflow-hidden">
                          {user?.avatar_url ? (
                            <img src={getAvatarUrl(user.avatar_url)} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl sm:text-2xl font-black text-white">{user?.first_name?.[0]}</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-lg sm:text-2xl font-bold text-primary-foreground leading-tight">Welcome back, {user?.first_name}! 👋</h2>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 sm:mt-1 flex-wrap">
                            <span className="text-[10px] sm:text-xs font-semibold text-primary-foreground/70 bg-white/15 px-2 py-0.5 rounded-full">Class {user?.student_class}</span>
                            <p className="text-primary-foreground/70 text-[10px] sm:text-xs">Keep up your reading streak!</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                        <button onClick={() => navigate('/points-history')} className="flex-1 sm:flex-none text-center bg-white/15 hover:bg-white/25 border border-white/20 rounded-xl px-2 py-2 sm:px-4 sm:py-3 backdrop-blur-sm transition-all hover:scale-105 active:scale-95">
                          <p className="text-lg sm:text-xl font-black text-white">{(user?.points || 0).toLocaleString()}</p>
                          <p className="text-[9px] sm:text-[10px] text-white/70 font-semibold uppercase tracking-wide flex items-center gap-0.5 justify-center mt-0.5">
                            <Zap className="h-2.5 w-2.5" />Total XP
                          </p>
                        </button>
                        <button onClick={() => setActiveTab('rankings')} className="flex-1 sm:flex-none text-center bg-white/15 hover:bg-white/25 border border-white/20 rounded-xl px-2 py-2 sm:px-4 sm:py-3 backdrop-blur-sm transition-all hover:scale-105 active:scale-95">
                          <p className="text-lg sm:text-xl font-black text-white">#{classRank}</p>
                          <p className="text-[9px] sm:text-[10px] text-white/70 font-semibold uppercase tracking-wide mt-0.5">Class Rank</p>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Catalog Search */}
              <Card className="border-border/50 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-primary to-accent" />
                <CardContent className="p-4">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const q = (e.currentTarget.elements.namedItem("q") as HTMLInputElement)?.value.trim();
                      navigate(q ? `/catalog?q=${encodeURIComponent(q)}` : "/catalog");
                    }}
                    className="flex items-center gap-2"
                  >
                    <div className="relative flex-1">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        name="q"
                        placeholder="Search books by title, author or ISBN…"
                        className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                      />
                    </div>
                    <Button type="submit" size="sm" className="gradient-primary border-0 shrink-0">Search</Button>
                    <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={() => navigate("/catalog")}>Browse All</Button>
                  </form>
                </CardContent>
              </Card>

              {/* Currently Reading Status */}
              <CurrentlyReading user={user} onUpdate={checkAuth} />

              <LiveQuizAlert />
              
              {/* Level + Streak Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <LevelProgress userPoints={user?.points || 0} />
                {!streakData.loading && (
                  <LoginStreakCard
                    currentStreak={streakData.currentStreak}
                    longestStreak={streakData.longestStreak}
                    totalLoginDays={streakData.totalLoginDays}
                    onPointsClaimed={checkAuth}
                  />
                )}
              </div>

              {user?.id && <ReadingVelocity userId={user.id} />}

              {user?.student_class && <ClassCompetitions userClass={user.student_class} />}

              {/* Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Books Reading", value: currentBooksCount, icon: BookOpen, color: "text-blue-700", bg: "bg-blue-100", gradient: "from-blue-500 to-indigo-500", tab: "books" },
                  { label: "Quizzes Taken", value: quizResultsCount, icon: Brain, color: "text-purple-700", bg: "bg-purple-100", gradient: "from-purple-500 to-violet-500", tab: "quizzes" },
                  { label: "Monthly Goal", value: `${monthlyBooksRead}/${schoolReadingGoal}`, icon: Target, color: "text-emerald-700", bg: "bg-emerald-100", gradient: "from-emerald-500 to-teal-500", tab: null },
                  { label: "Badges Earned", value: badgesEarnedCount, icon: Award, color: "text-amber-700", bg: "bg-amber-100", gradient: "from-amber-500 to-orange-500", tab: "badges" },
                ].map((s, i) => (
                  <Card key={i} className={`border-border/50 hover-lift overflow-hidden ${s.tab ? "cursor-pointer" : ""}`} onClick={() => s.tab && setActiveTab(s.tab as Tab)}>
                    <div className={`h-1 bg-gradient-to-r ${s.gradient}`} />
                    <CardContent className="p-4">
                      <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center mb-2`}>
                        <s.icon className={`h-5 w-5 ${s.color}`} />
                      </div>
                      <p className="text-2xl font-bold text-foreground">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>


              {/* Quick Actions */}
              <Card className="border-border/50 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                    {[
                      { label: "My Portfolio",    icon: FileText,    tab: "portfolio", color: "text-rose-600",   bg: "bg-rose-50" },
                      { label: "Games Corner",   icon: Gamepad2,    tab: "games",     color: "text-blue-600",   bg: "bg-blue-50" },
                      { label: "Study Corner",   icon: Timer,       tab: "study",     color: "text-teal-600",   bg: "bg-teal-50" },
                      { label: "Quizzes",         icon: Brain,       tab: "quizzes",   color: "text-purple-600", bg: "bg-purple-50" },
                      { label: "Certificates",   icon: Award,       tab: "certificates", color: "text-amber-600", bg: "bg-amber-50" },
                      { label: "Study Materials",icon: FileText,    tab: "materials", color: "text-indigo-600", bg: "bg-indigo-50" },
                      { label: "Library Events", icon: CalendarDays,tab: "events",    color: "text-rose-600",   bg: "bg-rose-50" },
                      { label: "Community",       icon: Users,       tab: "community", color: "text-orange-600", bg: "bg-orange-50" },
                      { label: "Book Issued",     icon: BookCheck,   tab: "issued",   color: "text-violet-600", bg: "bg-violet-50" },
                    ].map(a => (
                      <button
                        key={a.tab}
                        onClick={() => setActiveTab(a.tab as Tab)}
                        className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                      >
                        <div className={`w-7 h-7 rounded-lg ${a.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                          <a.icon className={`h-3.5 w-3.5 ${a.color}`} />
                        </div>
                        <span className="text-sm font-medium text-foreground">{a.label}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Recent Activity</CardTitle>
                    <button onClick={() => navigate('/points-history')} className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                      <Zap className="h-3 w-3" /> Points History
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  {recentActivities.length > 0 ? (
                    <div className="space-y-2">
                      {recentActivities.map((a, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-all border border-transparent hover:border-border/50">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            a.type === 'book'    ? 'bg-blue-100 text-blue-700' :
                            a.type === 'quiz'    ? 'bg-purple-100 text-purple-700' :
                            a.type === 'reading' ? 'bg-emerald-100 text-emerald-700' :
                            a.type === 'study'   ? 'bg-teal-100 text-teal-700' :
                            a.type === 'game'    ? 'bg-indigo-100 text-indigo-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {a.type === 'book'    ? <BookOpen className="h-4 w-4" /> :
                             a.type === 'quiz'    ? <Brain className="h-4 w-4" /> :
                             a.type === 'reading' ? <Medal className="h-4 w-4" /> :
                             a.type === 'study'   ? <Timer className="h-4 w-4" /> :
                             a.type === 'game'    ? <Gamepad2 className="h-4 w-4" /> :
                             <BookPlus className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                            <div className="flex items-center gap-2">
                              {a.score && <span className="text-xs text-success font-medium">Score: {a.score}%</span>}
                              {a.points ? <span className="text-xs text-warning font-medium">+{a.points} pts</span> : null}
                              {a.status && <span className="text-xs text-muted-foreground capitalize">Status: {a.status}</span>}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">{getTimeAgo(a.time)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">No recent activity yet</p>
                      <p className="text-xs mt-1">Start reading to see your progress here!</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {user?.id && <Recommendations userId={user.id} studentClass={user.student_class} />}
            </div>
          )}

          {activeTab === "events" && user?.id && <EventsList userId={user.id} />}

          {/* Books Tab — reading history + issue history */}
          {activeTab === "books" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Books</h2>
                  <p className="text-sm text-muted-foreground">Your reading log and borrow history</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-none border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold h-9" onClick={() => navigate('/catalog')}>
                    <Search className="h-4 w-4 mr-2" /> Browse Catalog
                  </Button>
                  <Button size="sm" variant="secondary" className="flex-1 sm:flex-none h-9" onClick={() => setActiveTab("issued")}>
                    <BookCheck className="h-4 w-4 mr-2" /> Book Issued hub
                  </Button>
                </div>
              </div>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Reading History</CardTitle>
                  <CardDescription>Books you logged as read (for points & goals)</CardDescription>
                </CardHeader>
                <CardContent><ReadingHistoryManager /></CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Issued book history</CardTitle>
                  <CardDescription>Every book the library has issued to you</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {issueHistory.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">No issued books yet.</p>
                  )}
                  {issueHistory.map((i) => {
                    const overdue = i.status === "issued" && i.due_date && new Date(i.due_date) < new Date();
                    return (
                      <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border text-sm">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{i.books?.title || "Book"}</p>
                          <p className="text-xs text-muted-foreground">
                            {i.books?.author || "—"}
                            {i.issue_date ? ` · Issued ${new Date(i.issue_date).toLocaleDateString()}` : ""}
                            {i.return_date ? ` · Returned ${new Date(i.return_date).toLocaleDateString()}` : i.due_date ? ` · Due ${new Date(i.due_date).toLocaleDateString()}` : ""}
                          </p>
                        </div>
                        <Badge variant={overdue ? "destructive" : i.status === "returned" ? "secondary" : "default"}>
                          {overdue ? "Overdue" : i.status}
                        </Badge>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "issued" && user?.id && (
            <IssuedBooksHub userId={user.id} currentBooks={currentBooks} />
          )}

          {/* Notes */}
          {activeTab === "notes" && user?.id && <StudentNotes userId={user.id} />}

          {/* Study Materials */}
          {activeTab === "materials" && <StudyMaterials studentClass={user?.student_class} />}

          {/* Games Corner */}
          {activeTab === "games" && user?.id && <GamesCorner userId={user.id} onPointsEarned={checkAuth} />}

          {/* Study Tracker */}
          {activeTab === "study" && user?.id && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="lg:col-span-2">
                 <StudyTracker userId={user.id} studentClass={user?.student_class} />
               </div>
               <div>
                 <StudyPlan userId={user.id} studentClass={user?.student_class} />
               </div>
            </div>
          )}

          {/* Community (includes Book Clubs tab) */}
          {activeTab === "community" && user?.id && <Community currentUserId={user.id} isAdmin={false} />}

          {/* Quizzes Tab */}
          {activeTab === "quizzes" && <QuizPage quizzes={availableQuizzes} results={quizResults} onSelectQuiz={setSelectedQuiz} />}

          {/* Challenges Tab */}
          {activeTab === "challenges" && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-accent" /> Reading Challenges & Rewards</CardTitle>
                <CardDescription>Join challenges to earn extra points and rewards</CardDescription>
              </CardHeader>
              <CardContent>
                <ReadingChallenges challenges={challenges} onJoinChallenge={handleJoinChallenge} onClaimReward={handleClaimReward} />
              </CardContent>
            </Card>
          )}

          {/* Badges Tab */}
          {activeTab === "badges" && user?.id && <BadgeCabinet userId={user.id} />}

          {/* Certificates Tab */}
          {activeTab === "certificates" && user?.id && hasCertificates && (
            <StudentCertificates
              userId={user.id}
              userName={`${user.first_name || ""} ${user.last_name || ""}`.trim()}
            />
          )}

          {activeTab === "periodicals" && periodicalsVisible && <Periodicals />}

          {/* Rankings Tab */}
          {activeTab === "rankings" && <Rankings user={user} />}

          {/* Network Tab */}
          {activeTab === "network" && user?.id && <NetworkTab user={user} />}

          {activeTab === "support" && user?.id && <SupportCenter user={user} />}

          {activeTab === "locator" && <LibraryMapExplorer />}

          {/* Portfolio Tab */}
          {activeTab === "portfolio" && user?.id && <StudentPortfolio userId={user.id} embedded />}

          {/* Feedback Tab */}
          {activeTab === "feedback" && <Feedback isEmbedded={true} />}

          {/* Profile Tab */}
          {activeTab === "profile" && <StudentProfile user={user} onProfileUpdate={handleProfileUpdate} />}
        </div>
      </main>

      {!profileSetupComplete && user?.needs_profile_update && (
        <ProfileCompletionDialog
          open={true}
          user={user}
          onComplete={handleProfileUpdate}
        />
      )}

      {/* Book Request Dialog */}
      <BookRequestForm open={showBookRequest} onOpenChange={setShowBookRequest} onSuccess={() => setShowBookRequest(false)} />
      <LibraryBot />

      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as Tab)}
        onOpenMenu={() => setMobileNavOpen(true)}
        onCatalog={() => navigate("/catalog")}
      />
    </div>
  );
};

export default StudentDashboard;
