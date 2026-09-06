import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, Trophy, BookOpen, Brain, Award, Zap, ChevronLeft, ChevronRight, 
  Share2, Download, Flame, Star, Compass, CheckCircle2, RotateCcw, X, Heart,
  BookMarked, Clock, TrendingUp, TrendingDown, ArrowUpRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";

interface MemoryCapsuleProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  studentClass?: string;
  selectedMonth?: string; // e.g. "2026-09"
}

interface MonthSummary {
  monthName: string;
  year: number;
  booksReadCount: number;
  booksReadTitles: string[];
  topGenre: string;
  totalXpEarned: number;
  prevMonthXp: number;
  improvementPercent: number;
  quizzesPassed: number;
  highestQuizScore: number;
  gamesPlayed: number;
  badgesEarned: number;
  streakDays: number;
  communityPostsCount: number;
  readingMinutesEst: number;
  persona: {
    title: string;
    emoji: string;
    description: string;
    tagline: string;
    color: string;
  };
}

export const MemoryCapsule: React.FC<MemoryCapsuleProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  studentClass = "Student",
  selectedMonth,
}) => {
  const { toast } = useToast();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [exporting, setExporting] = useState(false);
  const summaryCardRef = useRef<HTMLDivElement>(null);

  // Date calculation: If first 7 days of the month, default to previous month
  const now = new Date();
  const isFirst7Days = now.getDate() <= 7;
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);

  const prevYearMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;
  const currYearMonth = `${currentMonthDate.getFullYear()}-${String(currentMonthDate.getMonth() + 1).padStart(2, "0")}`;

  const defaultYearMonth = isFirst7Days ? prevYearMonth : currYearMonth;
  const [activeYearMonth, setActiveYearMonth] = useState<string>(selectedMonth || defaultYearMonth);

  useEffect(() => {
    if (selectedMonth) {
      setActiveYearMonth(selectedMonth);
    } else {
      setActiveYearMonth(isFirst7Days ? prevYearMonth : currYearMonth);
    }
  }, [selectedMonth]);

  const [targetYear, targetMonth] = activeYearMonth.split("-").map(Number);
  const targetDate = new Date(targetYear, targetMonth - 1, 1);
  const monthName = targetDate.toLocaleString("default", { month: "long" });
  const year = targetDate.getFullYear();

  const prevMonthLabel = prevMonthDate.toLocaleString("default", { month: "short" });
  const currMonthLabel = currentMonthDate.toLocaleString("default", { month: "short" });

  useEffect(() => {
    if (isOpen && userId) {
      setCurrentSlide(0);
      fetchMonthData();
    }
  }, [isOpen, userId, activeYearMonth]);

  const fetchMonthData = async () => {
    setLoading(true);
    try {
      // 1. Current target month boundary
      const startOfMonth = new Date(year, targetDate.getMonth(), 1).toISOString();
      const endOfMonth = new Date(year, targetDate.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
      const startDateStr = startOfMonth.split("T")[0];
      const endDateStr = endOfMonth.split("T")[0];

      // 2. Prior month boundary (for month-over-month % improvement)
      const priorDate = new Date(year, targetDate.getMonth() - 1, 1);
      const priorStartOfMonth = new Date(priorDate.getFullYear(), priorDate.getMonth(), 1).toISOString();
      const priorEndOfMonth = new Date(priorDate.getFullYear(), priorDate.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
      const priorStartDateStr = priorStartOfMonth.split("T")[0];
      const priorEndDateStr = priorEndOfMonth.split("T")[0];

      // Execute target month queries & prior month queries in parallel
      const [
        { data: rhData },
        { data: biData },
        { data: qrData },
        { data: gpData },
        { data: ssData },
        { data: cpData },
        { data: baData },
        { data: postData },
        { data: profile },
        { data: streak },
        { data: prevRh },
        { data: prevQr },
        { data: prevGp },
        { data: prevSs },
        { data: prevCp },
      ] = await Promise.all([
        // 1. Reading History (target month)
        supabase
          .from("reading_history")
          .select("book_title, points_earned, completed_date, books(category, subject)")
          .eq("user_id", userId)
          .gte("completed_date", startDateStr)
          .lte("completed_date", endDateStr),

        // 2. Book Issues (target month)
        supabase
          .from("book_issues")
          .select("id, issue_date, return_date, books(title, category)")
          .eq("user_id", userId)
          .gte("issue_date", startDateStr)
          .lte("issue_date", endDateStr),

        // 3. Quiz Results (target month)
        supabase
          .from("quiz_results")
          .select("score, points_earned, completed_at")
          .eq("user_id", userId)
          .gte("completed_at", startOfMonth)
          .lte("completed_at", endOfMonth),

        // 4. Game Plays (target month)
        supabase
          .from("game_plays")
          .select("points_earned, played_at")
          .eq("user_id", userId)
          .gte("played_at", startOfMonth)
          .lte("played_at", endOfMonth),

        // 5. Study Sessions (target month)
        supabase
          .from("study_sessions")
          .select("points_earned, ended_at")
          .eq("user_id", userId)
          .gte("ended_at", startOfMonth)
          .lte("ended_at", endOfMonth),

        // 6. Challenge Progress (target month)
        supabase
          .from("challenge_progress")
          .select("completed_at, challenges(reward_points)")
          .eq("user_id", userId)
          .eq("is_claimed", true)
          .gte("completed_at", startOfMonth)
          .lte("completed_at", endOfMonth),

        // 7. Badge Awards (target month)
        supabase
          .from("badge_awards")
          .select("id, awarded_at")
          .eq("user_id", userId)
          .gte("awarded_at", startOfMonth)
          .lte("awarded_at", endOfMonth),

        // 8. Posts / Community (target month)
        supabase
          .from("posts")
          .select("id")
          .eq("user_id", userId)
          .gte("created_at", startOfMonth)
          .lte("created_at", endOfMonth),

        // 9. Profile
        supabase
          .from("profiles")
          .select("points, monthly_points")
          .eq("id", userId)
          .maybeSingle(),

        // 10. Login Streak
        supabase
          .from("login_streaks")
          .select("current_streak, longest_streak")
          .eq("user_id", userId)
          .maybeSingle(),

        // 11-15. Prior Month Queries for Comparison
        supabase
          .from("reading_history")
          .select("points_earned")
          .eq("user_id", userId)
          .gte("completed_date", priorStartDateStr)
          .lte("completed_date", priorEndDateStr),
        supabase
          .from("quiz_results")
          .select("points_earned")
          .eq("user_id", userId)
          .gte("completed_at", priorStartOfMonth)
          .lte("completed_at", priorEndOfMonth),
        supabase
          .from("game_plays")
          .select("points_earned")
          .eq("user_id", userId)
          .gte("played_at", priorStartOfMonth)
          .lte("played_at", priorEndOfMonth),
        supabase
          .from("study_sessions")
          .select("points_earned")
          .eq("user_id", userId)
          .gte("ended_at", priorStartOfMonth)
          .lte("ended_at", priorEndOfMonth),
        supabase
          .from("challenge_progress")
          .select("challenges(reward_points)")
          .eq("user_id", userId)
          .eq("is_claimed", true)
          .gte("completed_at", priorStartOfMonth)
          .lte("completed_at", priorEndOfMonth),
      ]);

      // Aggregate calculations for target month
      const readingRows = rhData || [];
      const booksReadCount = readingRows.length || biData?.length || 0;
      const booksReadTitles = Array.from(new Set([
        ...readingRows.map(r => r.book_title).filter(Boolean),
        ...(biData || []).map((b: any) => b.books?.title).filter(Boolean)
      ])).slice(0, 5);

      // Top category
      const genreCounts: Record<string, number> = {};
      readingRows.forEach((r: any) => {
        const cat = r.books?.category || r.books?.subject || "Fiction";
        genreCounts[cat] = (genreCounts[cat] || 0) + 1;
      });
      (biData || []).forEach((b: any) => {
        const cat = b.books?.category || "Literature";
        genreCounts[cat] = (genreCounts[cat] || 0) + 1;
      });
      const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "General Reading";

      const quizCount = qrData?.length || 0;
      const maxQuizScore = qrData?.length ? Math.max(...qrData.map(q => q.score || 0)) : 0;
      const quizzesPassed = qrData?.filter(q => (q.score || 0) >= 60).length || 0;

      // Comprehensive calculation of Target Month Points
      const targetMonthXpCalculated = (
        readingRows.reduce((acc, r) => acc + (r.points_earned || 25), 0) +
        (qrData || []).reduce((acc, q) => acc + (q.points_earned || 0), 0) +
        (gpData || []).reduce((acc, g) => acc + (g.points_earned || 0), 0) +
        (ssData || []).reduce((acc, s) => acc + (s.points_earned || 0), 0) +
        (cpData || []).reduce((acc, c: any) => acc + (c.challenges?.reward_points || 0), 0)
      );

      const isCurrentMonth = activeYearMonth === currYearMonth;
      const totalXp = targetMonthXpCalculated > 0 
        ? targetMonthXpCalculated 
        : (isCurrentMonth && profile?.monthly_points && profile.monthly_points > 0 ? profile.monthly_points : 50);

      // Prior Month Points Calculation
      const prevMonthXp = (
        (prevRh || []).reduce((acc, r) => acc + (r.points_earned || 25), 0) +
        (prevQr || []).reduce((acc, q) => acc + (q.points_earned || 0), 0) +
        (prevGp || []).reduce((acc, g) => acc + (g.points_earned || 0), 0) +
        (prevSs || []).reduce((acc, s) => acc + (s.points_earned || 0), 0) +
        (prevCp || []).reduce((acc, c: any) => acc + (c.challenges?.reward_points || 0), 0)
      );

      // Calculate % Improvement
      const improvementPercent = prevMonthXp > 0
        ? Math.round(((totalXp - prevMonthXp) / prevMonthXp) * 100)
        : (totalXp > 0 ? 100 : 0);

      // Determine persona
      let persona = {
        title: "Dedicated Reader",
        emoji: "📖",
        description: "Consistent, curious, and steadily expanding your horizons.",
        tagline: "Every page is a new adventure.",
        color: "from-blue-600 via-indigo-600 to-violet-700"
      };

      if (quizCount >= 3 && maxQuizScore >= 80) {
        persona = {
          title: "Quiz Luminary",
          emoji: "🧠",
          description: "A master of comprehension with razor-sharp analytical prowess.",
          tagline: "Knowledge is your greatest weapon.",
          color: "from-purple-600 via-pink-600 to-rose-700"
        };
      } else if (booksReadCount >= 3) {
        persona = {
          title: "Literary Titan",
          emoji: "📚",
          description: "Unstoppable reading velocity! Books bend to your relentless reading pace.",
          tagline: "Voracious reader, boundless imagination.",
          color: "from-amber-500 via-orange-600 to-red-700"
        };
      } else if ((gpData?.length || 0) >= 4) {
        persona = {
          title: "Strategy Wizard",
          emoji: "⚡",
          description: "Sharp mind, fast instincts, and always leveling up your gamified library skills.",
          tagline: "Turning reading into victory.",
          color: "from-emerald-500 via-teal-600 to-cyan-700"
        };
      } else if ((baData?.length || 0) >= 2) {
        persona = {
          title: "Milestone Hunter",
          emoji: "🏆",
          description: "Collecting achievements and badges like infinity stones.",
          tagline: "Chasing excellence, one badge at a time.",
          color: "from-yellow-500 via-amber-600 to-orange-700"
        };
      }

      setSummary({
        monthName,
        year,
        booksReadCount,
        booksReadTitles,
        topGenre,
        totalXpEarned: totalXp,
        prevMonthXp,
        improvementPercent,
        quizzesPassed,
        highestQuizScore: maxQuizScore,
        gamesPlayed: gpData?.length || 0,
        badgesEarned: baData?.length || 0,
        streakDays: streak?.current_streak || 1,
        communityPostsCount: postData?.length || 0,
        readingMinutesEst: Math.max(booksReadCount * 90, 45),
        persona
      });
    } catch (e) {
      console.error("Failed to compile monthly capsule:", e);
    } finally {
      setLoading(false);
    }
  };

  const TOTAL_SLIDES = 6;

  // Auto-advance timer
  useEffect(() => {
    if (!isOpen || isPaused || loading) return;
    const timer = setTimeout(() => {
      if (currentSlide < TOTAL_SLIDES - 1) {
        setCurrentSlide(prev => prev + 1);
      }
    }, 6500);
    return () => clearTimeout(timer);
  }, [isOpen, currentSlide, isPaused, loading]);

  const handleNext = () => {
    if (currentSlide < TOTAL_SLIDES - 1) setCurrentSlide(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentSlide > 0) setCurrentSlide(prev => prev - 1);
  };

  const handleDownloadCard = async () => {
    if (!summaryCardRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(summaryCardRef.current, {
        scale: 3, // Ultra crisp 300 DPI export
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#060913",
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `KV-Sulur-Capsule-${monthName}-${year}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "Poster Downloaded! 📸", description: "Your high-resolution memory card has been saved." });
    } catch (e: any) {
      toast({ title: "Download failed", description: e?.message || "Could not save image", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    const improvementText = summary?.improvementPercent && summary.improvementPercent > 0 
      ? ` (+${summary.improvementPercent}% growth!)` 
      : "";

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${userName}'s ${monthName} Reading Capsule`,
          text: `Check out my ${monthName} Reading Wrap from PM SHRI KV Sulur Digital Library! I earned ${summary?.totalXpEarned} XP${improvementText} and read ${summary?.booksReadCount} books! 📚✨`,
          url: window.location.origin,
        });
      } catch (e) {}
    } else {
      navigator.clipboard.writeText(`Check out my ${monthName} Reading Wrap from PM SHRI KV Sulur Digital Library! I earned ${summary?.totalXpEarned} XP${improvementText} and unlocked the "${summary?.persona.title}" persona! 📚✨`);
      toast({ title: "Copied to clipboard! 📋", description: "Share your achievements with friends." });
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[95vw] h-[90vh] max-h-[720px] p-0 overflow-hidden border-0 bg-slate-950 text-white rounded-3xl shadow-2xl flex flex-col focus:outline-none [&>button:first-child]:hidden">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4 p-8 text-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <Sparkles className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <p className="text-lg font-bold text-white">Generating your {monthName} Capsule…</p>
            <p className="text-xs text-slate-400">Summoning your reading memories, quizzes & XP milestones</p>
          </div>
        ) : summary ? (
          <div 
            className="flex-1 flex flex-col relative overflow-hidden select-none"
            onMouseDown={() => setIsPaused(true)}
            onMouseUp={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          >
            {/* Top Stories Progress Bars */}
            <div className="absolute top-3 left-3 right-3 z-30 flex items-center gap-1.5">
              {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
                <div 
                  key={i} 
                  className="flex-1 h-1 rounded-full bg-white/20 overflow-hidden cursor-pointer backdrop-blur-sm"
                  onClick={() => setCurrentSlide(i)}
                >
                  <div 
                    className={`h-full bg-white transition-all duration-300 ${
                      i < currentSlide 
                        ? "w-full" 
                        : i === currentSlide 
                          ? "w-full animate-[progress_6.5s_linear]" 
                          : "w-0"
                    }`} 
                  />
                </div>
              ))}
            </div>

            {/* Header Controls: Month Toggle & Close */}
            <div className="absolute top-6 left-4 right-4 z-30 flex items-center justify-between text-white/80">
              {/* Month Selector Pills */}
              <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-full border border-white/15 backdrop-blur-md">
                <button 
                  onClick={() => { setActiveYearMonth(prevYearMonth); setCurrentSlide(0); }}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black transition-all flex items-center gap-1 ${
                    activeYearMonth === prevYearMonth 
                      ? "bg-white text-slate-950 shadow-sm" 
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                  {prevMonthLabel} {isFirst7Days ? "(Wrap)" : ""}
                </button>
                <button 
                  onClick={() => { setActiveYearMonth(currYearMonth); setCurrentSlide(0); }}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black transition-all ${
                    activeYearMonth === currYearMonth 
                      ? "bg-white text-slate-950 shadow-sm" 
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  {currMonthLabel}
                </button>
              </div>

              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white/80 hover:text-white transition-colors backdrop-blur-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tap areas for navigation */}
            <div className="absolute inset-y-0 left-0 w-1/3 z-20" onClick={handlePrev} />
            <div className="absolute inset-y-0 right-0 w-1/3 z-20" onClick={handleNext} />

            {/* Slide 0: Cover / Intro */}
            {currentSlide === 0 && (
              <div className="flex-1 flex flex-col justify-between p-6 sm:p-8 pt-16 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-950 animate-in fade-in zoom-in-95 duration-500 relative">
                <div className="absolute top-1/4 -right-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-10 -left-16 w-64 h-64 bg-fuchsia-500/20 rounded-full blur-3xl pointer-events-none" />
                
                <div className="space-y-3 z-10 my-auto text-center">
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-400 via-pink-500 to-indigo-500 p-1 shadow-xl rotate-3 hover:rotate-0 transition-transform">
                    <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
                      <Sparkles className="h-9 w-9 text-amber-300 animate-pulse" />
                    </div>
                  </div>
                  <Badge className="bg-white/10 text-white/90 border-white/20 text-xs font-bold px-3 py-1">
                    PM SHRI KV Sulur Library
                  </Badge>
                  <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-pink-200 to-indigo-200 leading-tight">
                    {summary.monthName} Capsule
                  </h2>
                  <p className="text-sm text-slate-300 max-w-xs mx-auto leading-relaxed">
                    Ready to uncover your reading adventures, XP gains, and reading persona this month?
                  </p>
                  <p className="text-xs text-white/50 pt-2 font-medium">Prepared for <span className="text-white font-bold">{userName}</span></p>
                </div>

                <div className="z-10 text-center space-y-2">
                  <p className="text-xs text-white/60 animate-bounce">Tap right to see your highest numbers →</p>
                </div>
              </div>
            )}

            {/* Slide 1: HIGHEST NUMBERS & POWER STATS (First in the wrap!) */}
            {currentSlide === 1 && (
              <div className="flex-1 flex flex-col justify-between p-6 sm:p-8 pt-16 bg-gradient-to-br from-violet-950 via-fuchsia-950 to-slate-950 animate-in fade-in slide-in-from-right duration-400 relative">
                <div className="absolute top-10 right-0 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-10 left-0 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

                <div className="my-auto space-y-4 sm:space-y-5 z-10">
                  <div className="space-y-1">
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-amber-400" />
                      Grand Voltage Numbers
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black text-white">Your Peak Stats 🚀</h3>
                  </div>

                  {/* High Impact XP Showcase Card */}
                  <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-500/25 via-pink-500/20 to-purple-500/20 border border-amber-400/40 backdrop-blur-md shadow-2xl text-center space-y-1 relative overflow-hidden">
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-amber-400/20 rounded-full blur-xl pointer-events-none" />
                    
                    <div className="flex items-center justify-center gap-1.5 flex-wrap mb-1">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-400/30">
                        <Star className="h-3 w-3 fill-amber-300 text-amber-300" /> Total XP Earned
                      </span>

                      {summary.improvementPercent > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider animate-pulse">
                          <TrendingUp className="h-3 w-3 text-emerald-400" /> +{summary.improvementPercent}% Growth
                        </span>
                      )}
                    </div>

                    <p className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-300 to-yellow-100 tracking-tight leading-none py-1">
                      +{summary.totalXpEarned.toLocaleString()}
                    </p>
                    <p className="text-[11px] font-bold text-amber-200/90 uppercase tracking-widest">
                      Experience Points in {summary.monthName}
                    </p>
                  </div>

                  {/* 2x2 Grid for Top High Numbers */}
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md text-center">
                      <Clock className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
                      <p className="text-2xl sm:text-3xl font-black text-white leading-tight">~{summary.readingMinutesEst}</p>
                      <p className="text-[10px] text-emerald-200 font-bold uppercase tracking-wide">Reading Minutes</p>
                    </div>

                    <div className="p-3.5 sm:p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md text-center">
                      <BookOpen className="h-5 w-5 text-cyan-400 mx-auto mb-1" />
                      <p className="text-2xl sm:text-3xl font-black text-white leading-tight">{summary.booksReadCount}</p>
                      <p className="text-[10px] text-cyan-200 font-bold uppercase tracking-wide">Books Read</p>
                    </div>

                    <div className="p-3.5 sm:p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md text-center">
                      <Trophy className="h-5 w-5 text-pink-400 mx-auto mb-1" />
                      <p className="text-2xl sm:text-3xl font-black text-white leading-tight">{summary.highestQuizScore}%</p>
                      <p className="text-[10px] text-pink-200 font-bold uppercase tracking-wide">Top Quiz Score</p>
                    </div>

                    <div className="p-3.5 sm:p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md text-center">
                      <Flame className="h-5 w-5 text-orange-400 mx-auto mb-1" />
                      <p className="text-2xl sm:text-3xl font-black text-white leading-tight">{summary.streakDays}d</p>
                      <p className="text-[10px] text-orange-200 font-bold uppercase tracking-wide">Active Streak</p>
                    </div>
                  </div>
                </div>
                <p className="text-center text-xs text-white/50 z-10">Tap for reading footprint →</p>
              </div>
            )}

            {/* Slide 2: Reading Footprint & Books Deep Dive */}
            {currentSlide === 2 && (
              <div className="flex-1 flex flex-col justify-between p-6 sm:p-8 pt-16 bg-gradient-to-br from-emerald-900 via-teal-950 to-slate-950 animate-in fade-in slide-in-from-right duration-400 relative">
                <div className="my-auto space-y-6 z-10">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Chapter & Verse</span>
                    <h3 className="text-2xl sm:text-3xl font-black text-white">Your Reading Footprint 📚</h3>
                  </div>

                  <div className="p-6 rounded-3xl bg-white/10 border border-white/15 backdrop-blur-md shadow-xl text-center space-y-2">
                    <p className="text-5xl sm:text-6xl font-black text-emerald-300 tracking-tight">
                      {summary.booksReadCount}
                    </p>
                    <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">
                      Books Completed & Issued
                    </p>
                    <div className="pt-2 flex items-center justify-center gap-2 text-xs text-emerald-200/80">
                      <Clock className="h-3.5 w-3.5" />
                      <span>~{summary.readingMinutesEst} minutes of focused reading</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Top Reading Category</p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 font-bold text-sm">
                      <BookMarked className="h-4 w-4 text-emerald-400" />
                      {summary.topGenre}
                    </div>
                  </div>

                  {summary.booksReadTitles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Highlights</p>
                      <div className="space-y-1">
                        {summary.booksReadTitles.map((t, idx) => (
                          <p key={idx} className="text-xs text-slate-200 truncate flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            {t}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-center text-xs text-white/50 z-10">Tap for quizzes & trials →</p>
              </div>
            )}

            {/* Slide 3: Quizzes & Mini-Games Deep Dive */}
            {currentSlide === 3 && (
              <div className="flex-1 flex flex-col justify-between p-6 sm:p-8 pt-16 bg-gradient-to-br from-purple-900 via-violet-950 to-slate-950 animate-in fade-in slide-in-from-right duration-400 relative">
                <div className="my-auto space-y-6 z-10">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-widest text-purple-400">Mastery & Trials</span>
                    <h3 className="text-2xl sm:text-3xl font-black text-white">Quizzes & Mini-Games 🧠</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-5 rounded-3xl bg-purple-500/20 border border-purple-500/30 backdrop-blur-md text-center space-y-1">
                      <Brain className="h-6 w-6 text-purple-300 mx-auto" />
                      <p className="text-4xl font-black text-white">{summary.quizzesPassed}</p>
                      <p className="text-[11px] text-purple-200 font-semibold uppercase">Quizzes Passed</p>
                    </div>

                    <div className="p-5 rounded-3xl bg-pink-500/20 border border-pink-500/30 backdrop-blur-md text-center space-y-1">
                      <Trophy className="h-6 w-6 text-pink-300 mx-auto" />
                      <p className="text-4xl font-black text-white">{summary.highestQuizScore}%</p>
                      <p className="text-[11px] text-pink-200 font-semibold uppercase">Top Score</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>Games Played</span>
                      <span className="font-bold text-white">{summary.gamesPlayed} session(s)</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>Community Contributions</span>
                      <span className="font-bold text-white">{summary.communityPostsCount} post(s)</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>Badges Unlocked</span>
                      <span className="font-bold text-white">{summary.badgesEarned} new badge(s)</span>
                    </div>
                  </div>
                </div>
                <p className="text-center text-xs text-white/50 z-10">Unveiling your persona next →</p>
              </div>
            )}

            {/* Slide 4: Reader Persona */}
            {currentSlide === 4 && (
              <div className={`flex-1 flex flex-col justify-between p-6 sm:p-8 pt-16 bg-gradient-to-br ${summary.persona.color} animate-in fade-in zoom-in-95 duration-500 relative`}>
                <div className="my-auto space-y-6 z-10 text-center">
                  <div className="space-y-1">
                    <Badge className="bg-white/20 text-white font-extrabold uppercase text-[10px] tracking-widest px-3 py-1">
                      Your Monthly Persona
                    </Badge>
                  </div>

                  <div className="w-24 h-24 mx-auto rounded-3xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-5xl shadow-2xl animate-pulse">
                    {summary.persona.emoji}
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                      {summary.persona.title}
                    </h3>
                    <p className="text-base font-semibold text-white/90 italic">
                      "{summary.persona.tagline}"
                    </p>
                    <p className="text-xs text-white/80 max-w-xs mx-auto leading-relaxed pt-2">
                      {summary.persona.description}
                    </p>
                  </div>
                </div>
                <p className="text-center text-xs text-white/60 z-10">Tap for your shareable card →</p>
              </div>
            )}

            {/* Slide 5: Recap Card & Export */}
            {currentSlide === 5 && (
              <div className="flex-1 flex flex-col justify-between p-4 sm:p-6 pt-14 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 animate-in fade-in duration-400 relative overflow-y-auto">
                <div className="space-y-4 z-10 my-auto w-full max-w-[360px] mx-auto">
                  {/* Shareable Portrait Poster Card */}
                  <div 
                    ref={summaryCardRef}
                    className="w-full rounded-3xl p-5 bg-gradient-to-b from-[#180d38] via-[#0f172a] to-[#05070e] text-white shadow-2xl border-2 border-purple-500/40 space-y-4 relative overflow-hidden"
                    style={{ minHeight: "440px" }}
                  >
                    {/* Background glow effects */}
                    <div className="absolute top-0 right-0 w-36 h-36 bg-pink-500/20 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-36 h-36 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

                    {/* School & User Info Header */}
                    <div className="flex items-center justify-between border-b border-white/15 pb-3 relative z-10">
                      <div>
                        <p className="text-[9px] font-black text-amber-300 uppercase tracking-widest flex items-center gap-1">
                          <Star className="h-2.5 w-2.5 fill-amber-300" /> PM SHRI KV SULUR
                        </p>
                        <h4 className="text-base font-black text-white leading-tight mt-0.5">{userName}</h4>
                        <p className="text-[10px] text-white/70 font-semibold">{studentClass}</p>
                      </div>
                      <div className="text-right">
                        <span className="px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-white font-black text-[10px] uppercase tracking-wide">
                          {summary.monthName} {summary.year}
                        </span>
                      </div>
                    </div>

                    {/* Persona Pill */}
                    <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-3 relative z-10">
                      <span className="text-3xl shrink-0">{summary.persona.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-bold text-white/70 uppercase tracking-wider">Reader Persona</p>
                        <p className="text-sm font-black text-white truncate">{summary.persona.title}</p>
                        <p className="text-[10px] text-purple-200/90 italic truncate">"{summary.persona.tagline}"</p>
                      </div>
                    </div>

                    {/* Stats Grid (2x2) */}
                    <div className="grid grid-cols-2 gap-2 relative z-10">
                      <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-center">
                        <p className="text-2xl font-black text-amber-300 leading-none">+{summary.totalXpEarned.toLocaleString()}</p>
                        <p className="text-[9px] font-bold text-white/80 uppercase mt-1">XP Gained</p>
                        {summary.improvementPercent > 0 && (
                          <span className="inline-flex items-center text-[8px] font-black text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded-md mt-1">
                            +{summary.improvementPercent}% Growth 📈
                          </span>
                        )}
                      </div>

                      <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-center">
                        <p className="text-2xl font-black text-emerald-300 leading-none">{summary.booksReadCount}</p>
                        <p className="text-[9px] font-bold text-white/80 uppercase mt-1">Books Read</p>
                        <span className="text-[8px] text-emerald-200/80 block mt-1">~{summary.readingMinutesEst} mins</span>
                      </div>

                      <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-center">
                        <p className="text-2xl font-black text-pink-300 leading-none">{summary.quizzesPassed}</p>
                        <p className="text-[9px] font-bold text-white/80 uppercase mt-1">Quizzes Passed</p>
                        <span className="text-[8px] text-pink-200/80 block mt-1">{summary.highestQuizScore}% Top Score</span>
                      </div>

                      <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-center">
                        <p className="text-2xl font-black text-orange-300 leading-none">{summary.streakDays}d</p>
                        <p className="text-[9px] font-bold text-white/80 uppercase mt-1">Active Streak</p>
                        <span className="text-[8px] text-orange-200/80 block mt-1">{summary.badgesEarned} Badges</span>
                      </div>
                    </div>

                    {/* Footer Metadata */}
                    <div className="flex items-center justify-between text-[9px] text-white/80 pt-2 border-t border-white/15 relative z-10">
                      <span>Top Genre: <strong className="text-white">{summary.topGenre}</strong></span>
                      <span className="text-amber-300 font-bold">⭐ Verified DLMS Badge</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button 
                      onClick={handleDownloadCard} 
                      disabled={exporting}
                      className="flex-1 bg-white text-slate-900 hover:bg-slate-100 font-bold rounded-2xl h-11 text-xs shadow-lg flex items-center justify-center gap-1.5"
                    >
                      <Download className="h-4 w-4" />
                      {exporting ? "Generating HD Poster…" : "Save Poster"}
                    </Button>
                    <Button 
                      onClick={handleShare}
                      className="flex-1 gradient-primary text-white border-0 font-bold rounded-2xl h-11 text-xs shadow-lg flex items-center justify-center gap-1.5"
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 pt-2 z-10">
                  <button 
                    onClick={() => setCurrentSlide(0)} 
                    className="text-xs text-white/60 hover:text-white flex items-center gap-1 font-medium transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" /> Replay Capsule
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default MemoryCapsule;
