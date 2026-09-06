import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, Trophy, BookOpen, Brain, Award, Zap, ChevronLeft, ChevronRight, 
  Share2, Download, Flame, Star, Compass, CheckCircle2, RotateCcw, X, Heart,
  BookMarked, Clock
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

  // Month handling
  const targetDate = selectedMonth ? new Date(`${selectedMonth}-01`) : new Date();
  const monthName = targetDate.toLocaleString("default", { month: "long" });
  const year = targetDate.getFullYear();

  useEffect(() => {
    if (isOpen && userId) {
      setCurrentSlide(0);
      fetchMonthData();
    }
  }, [isOpen, userId, selectedMonth]);

  const fetchMonthData = async () => {
    setLoading(true);
    try {
      const startOfMonth = new Date(year, targetDate.getMonth(), 1).toISOString();
      const endOfMonth = new Date(year, targetDate.getMonth() + 1, 0, 23, 59, 59).toISOString();
      const startDateStr = startOfMonth.split("T")[0];
      const endDateStr = endOfMonth.split("T")[0];

      // 1. Reading History
      const { data: rhData } = await supabase
        .from("reading_history")
        .select("book_title, points_earned, completed_date, books(category, subject)")
        .eq("user_id", userId)
        .gte("completed_date", startDateStr)
        .lte("completed_date", endDateStr);

      // 2. Book Issues
      const { data: biData } = await supabase
        .from("book_issues")
        .select("id, issue_date, return_date, books(title, category)")
        .eq("user_id", userId)
        .gte("issue_date", startDateStr)
        .lte("issue_date", endDateStr);

      // 3. Quiz Results
      const { data: qrData } = await supabase
        .from("quiz_results")
        .select("score, points_earned, completed_at")
        .eq("user_id", userId)
        .gte("completed_at", startOfMonth)
        .lte("completed_at", endOfMonth);

      // 4. Game Plays
      const { data: gpData } = await supabase
        .from("game_plays")
        .select("points_earned, played_at")
        .eq("user_id", userId)
        .gte("played_at", startOfMonth)
        .lte("played_at", endOfMonth);

      // 5. Badge Awards
      const { data: baData } = await supabase
        .from("badge_awards")
        .select("id, awarded_at")
        .eq("user_id", userId)
        .gte("awarded_at", startOfMonth)
        .lte("awarded_at", endOfMonth);

      // 6. Posts / Community
      const { data: postData } = await supabase
        .from("posts")
        .select("id")
        .eq("user_id", userId)
        .gte("created_at", startOfMonth)
        .lte("created_at", endOfMonth);

      // 7. Profile / Streak
      const { data: profile } = await supabase
        .from("profiles")
        .select("points, monthly_points")
        .eq("id", userId)
        .maybeSingle();

      const { data: streak } = await supabase
        .from("login_streaks")
        .select("current_streak, longest_streak")
        .eq("user_id", userId)
        .maybeSingle();

      // Aggregate calculations
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

      const totalXp = (
        (profile?.monthly_points && profile.monthly_points > 0 ? profile.monthly_points : 0) ||
        readingRows.reduce((acc, r) => acc + (r.points_earned || 20), 0) +
        (qrData || []).reduce((acc, q) => acc + (q.points_earned || 0), 0) +
        (gpData || []).reduce((acc, g) => acc + (g.points_earned || 0), 0) || 50
      );

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
        scale: 2,
        useCORS: true,
        backgroundColor: null,
      });
      const link = document.createElement("a");
      link.download = `KV-Sulur-Capsule-${monthName}-${year}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "Poster Downloaded! 📸", description: "Your monthly memory card has been saved." });
    } catch (e: any) {
      toast({ title: "Download failed", description: e?.message || "Could not save image", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${userName}'s ${monthName} Reading Capsule`,
          text: `Check out my ${monthName} Reading Wrap from PM SHRI KV Sulur Digital Library! I earned ${summary?.totalXpEarned} XP and read ${summary?.booksReadCount} books! 📚✨`,
          url: window.location.origin,
        });
      } catch (e) {}
    } else {
      navigator.clipboard.writeText(`Check out my ${monthName} Reading Wrap from PM SHRI KV Sulur Digital Library! I earned ${summary?.totalXpEarned} XP and unlocked the "${summary?.persona.title}" persona! 📚✨`);
      toast({ title: "Copied to clipboard! 📋", description: "Share your achievements with friends." });
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[95vw] h-[90vh] max-h-[720px] p-0 overflow-hidden border-0 bg-slate-950 text-white rounded-3xl shadow-2xl flex flex-col focus:outline-none">
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

            {/* Header Controls */}
            <div className="absolute top-6 left-4 right-4 z-30 flex items-center justify-between text-white/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-wider uppercase bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-md border border-white/20 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  {summary.monthName} {summary.year}
                </span>
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
                  <p className="text-xs text-white/60 animate-bounce">Tap right to start your wrap →</p>
                </div>
              </div>
            )}

            {/* Slide 1: Reading Stats & Velocity */}
            {currentSlide === 1 && (
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
                <p className="text-center text-xs text-white/50 z-10">Tap to continue →</p>
              </div>
            )}

            {/* Slide 2: XP, Points & Streaks */}
            {currentSlide === 2 && (
              <div className="flex-1 flex flex-col justify-between p-6 sm:p-8 pt-16 bg-gradient-to-br from-amber-900 via-orange-950 to-slate-950 animate-in fade-in slide-in-from-right duration-400 relative">
                <div className="my-auto space-y-6 z-10">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Power Level</span>
                    <h3 className="text-2xl sm:text-3xl font-black text-white">XP Gained this Month ⚡</h3>
                  </div>

                  <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 backdrop-blur-md shadow-xl text-center space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center text-amber-300">
                      <Zap className="h-6 w-6" />
                    </div>
                    <p className="text-5xl sm:text-6xl font-black text-amber-300 tracking-tight">
                      +{summary.totalXpEarned.toLocaleString()}
                    </p>
                    <p className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                      Experience Points Earned
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md text-center">
                      <Flame className="h-5 w-5 text-orange-400 mx-auto mb-1" />
                      <p className="text-2xl font-black text-white">{summary.streakDays} Days</p>
                      <p className="text-[10px] text-slate-300 font-semibold uppercase">Daily Streak</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md text-center">
                      <Award className="h-5 w-5 text-yellow-400 mx-auto mb-1" />
                      <p className="text-2xl font-black text-white">{summary.badgesEarned}</p>
                      <p className="text-[10px] text-slate-300 font-semibold uppercase">Badges Unlocked</p>
                    </div>
                  </div>
                </div>
                <p className="text-center text-xs text-white/50 z-10">Tap to continue →</p>
              </div>
            )}

            {/* Slide 3: Quizzes & Knowledge */}
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
              <div className="flex-1 flex flex-col justify-between p-5 sm:p-6 pt-14 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 animate-in fade-in duration-400 relative overflow-y-auto">
                <div className="space-y-4 z-10 my-auto">
                  {/* Shareable Summary Card */}
                  <div 
                    ref={summaryCardRef}
                    className="rounded-3xl p-5 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white shadow-2xl border border-white/20 space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-white/20 pb-3">
                      <div>
                        <p className="text-[10px] font-bold text-white/80 uppercase tracking-wider">PM SHRI KV Sulur</p>
                        <h4 className="text-lg font-black">{userName}</h4>
                        <p className="text-[10px] text-white/80">{studentClass}</p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-white/20 text-white font-bold text-[10px]">
                          {summary.monthName} {summary.year}
                        </Badge>
                      </div>
                    </div>

                    {/* Persona Pill */}
                    <div className="p-3 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center gap-3">
                      <span className="text-3xl">{summary.persona.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white/80 uppercase">Reader Persona</p>
                        <p className="text-sm font-black text-white">{summary.persona.title}</p>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 rounded-xl bg-black/20 backdrop-blur-sm">
                        <p className="text-xl font-black text-amber-300">+{summary.totalXpEarned}</p>
                        <p className="text-[9px] font-semibold text-white/80 uppercase">XP Gained</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-black/20 backdrop-blur-sm">
                        <p className="text-xl font-black text-emerald-300">{summary.booksReadCount}</p>
                        <p className="text-[9px] font-semibold text-white/80 uppercase">Books</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-black/20 backdrop-blur-sm">
                        <p className="text-xl font-black text-cyan-300">{summary.quizzesPassed}</p>
                        <p className="text-[9px] font-semibold text-white/80 uppercase">Quizzes</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-white/70 pt-1 border-t border-white/15">
                      <span>Top Genre: <strong className="text-white">{summary.topGenre}</strong></span>
                      <span>Streak: <strong className="text-white">{summary.streakDays}d</strong></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button 
                      onClick={handleDownloadCard} 
                      disabled={exporting}
                      className="flex-1 bg-white text-slate-900 hover:bg-slate-100 font-bold rounded-2xl h-11 text-xs shadow-lg flex items-center justify-center gap-1.5"
                    >
                      <Download className="h-4 w-4" />
                      {exporting ? "Saving…" : "Save Poster"}
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

                <div className="flex items-center justify-center gap-2 pt-3 z-10">
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
