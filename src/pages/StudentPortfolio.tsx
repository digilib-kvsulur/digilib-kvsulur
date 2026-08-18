import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getAvatarUrl } from "@/lib/utils";
import { Download, Share2, Award, BookOpen, Brain, Flame, Target, TrendingUp, Zap, Medal } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import LibraryCard from "@/components/student/LibraryCard";
import ReadingHeatmap from "@/components/student/ReadingHeatmap";
import { useToast } from "@/hooks/use-toast";
import { fetchMonthlyReadingGoal } from "@/lib/librarySettings";
import { defaultStudentBarcode } from "@/lib/barcode";

interface PortfolioProps {
  userId?: string;
  embedded?: boolean;
}

interface Milestone {
  icon: React.ElementType;
  color: string;
  title: string;
  description: string;
}

export default function StudentPortfolio({ userId, embedded = true }: PortfolioProps) {
  const { username } = useParams();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    booksRead: 0,
    quizzesPassed: 0,
    points: 0,
    badges: 0,
    goalsCompleted: 0,
    monthlyRead: 0,
    monthlyGoal: 3,
    streak: 0,
  });
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [activityLog, setActivityLog] = useState<{ date: string; value: number }[]>([]);
  const [classRank, setClassRank] = useState<number | string>("—");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [userId, username]);

  const fetchData = async () => {
    try {
      setLoading(true);
      let profile;
      let targetUserId = userId;

      if (username) {
        // Try fetching by username first
        const { data: pByU } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
        if (pByU) {
          profile = pByU;
          targetUserId = pByU.id;
        } else {
          // Fallback to fetch by ID in case username is actually user ID
          const { data: pById } = await supabase.from("profiles").select("*").eq("id", username).maybeSingle();
          if (pById) {
            profile = pById;
            targetUserId = pById.id;
          } else {
            toast({ title: "Portfolio not found", description: "No student profile matches that username.", variant: "destructive" });
            setLoading(false);
            return;
          }
        }
      } else {
        if (!targetUserId) {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            setLoading(false);
            return;
          }
          targetUserId = session.user.id;
        }
        const { data: p, error } = await supabase.from("profiles").select("*").eq("id", targetUserId).single();
        if (error || !p) {
          setLoading(false);
          return;
        }
        profile = p;
      }

      setUser(profile);

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthlyGoal = await fetchMonthlyReadingGoal();

      const [
        { count: books },
        { count: quizzes },
        { count: badges },
        { count: goalsCompleted },
        { count: monthlyRead },
        { data: history },
        { data: badgeAwards },
        { data: completedChallenges },
        { data: streakRow },
      ] = await Promise.all([
        supabase.from("reading_history").select("*", { count: "exact", head: true }).eq("user_id", targetUserId),
        supabase.from("quiz_results").select("*", { count: "exact", head: true }).eq("user_id", targetUserId),
        supabase.from("badge_awards").select("*", { count: "exact", head: true }).eq("user_id", targetUserId),
        supabase.from("challenge_progress").select("*", { count: "exact", head: true }).eq("user_id", targetUserId).eq("is_completed", true),
        supabase.from("reading_history").select("*", { count: "exact", head: true }).eq("user_id", targetUserId).gte("completed_date", monthStart),
        supabase.from("reading_history").select("completed_date").eq("user_id", targetUserId).not("completed_date", "is", null),
        supabase.from("badge_awards").select("awarded_at, badges(name, description, icon_name)").eq("user_id", targetUserId).order("awarded_at", { ascending: false }).limit(3),
        supabase.from("challenge_progress").select("completed_at, challenges(title, reward_points)").eq("user_id", targetUserId).eq("is_completed", true).order("completed_at", { ascending: false }).limit(2),
        supabase.from("login_streaks").select("current_streak").eq("user_id", targetUserId).maybeSingle(),
      ]);

      if (profile.student_class && profile.points != null) {
        const { data: rankData } = await supabase.rpc("get_user_class_rank", {
          user_class: profile.student_class,
          user_points: profile.points || 0,
        });
        if (rankData != null) setClassRank(rankData);
      }

      setStats({
        booksRead: books || 0,
        quizzesPassed: quizzes || 0,
        points: profile.points || 0,
        badges: badges || 0,
        goalsCompleted: goalsCompleted || 0,
        monthlyRead: monthlyRead || 0,
        monthlyGoal: monthlyGoal,
        streak: streakRow?.current_streak || 0,
      });

      const grouped: Record<string, number> = {};
      (history || []).forEach((h) => {
        if (h.completed_date) {
          const d = h.completed_date.split("T")[0];
          grouped[d] = (grouped[d] || 0) + 1;
        }
      });
      setActivityLog(Object.entries(grouped).map(([date, value]) => ({ date, value })));

      const ms: Milestone[] = [];
      (badgeAwards || []).forEach((b: any) => {
        ms.push({
          icon: Award,
          color: "text-amber-450",
          title: b.badges?.name || "Badge Earned",
          description: b.badges?.description || "Achievement unlocked in the library program.",
        });
      });
      (completedChallenges || []).forEach((c: any) => {
        ms.push({
          icon: Target,
          color: "text-emerald-450",
          title: c.challenges?.title || "Challenge Completed",
          description: `Earned ${c.challenges?.reward_points || 0} bonus points.`,
        });
      });
      if ((books || 0) >= 10) {
        ms.push({
          icon: BookOpen,
          color: "text-blue-400",
          title: "Avid Reader",
          description: `Logged ${books} books in your reading history.`,
        });
      }
      if ((quizzes || 0) >= 5) {
        ms.push({
          icon: Brain,
          color: "text-purple-400",
          title: "Quiz Champion",
          description: `Passed ${quizzes} library quizzes.`,
        });
      }
      setMilestones(ms.slice(0, 5));
    } catch (e) {
      console.error("Portfolio fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const exportPortfolio = async () => {
    const element = document.getElementById("portfolio-container");
    if (!element) return;

    toast({ title: "Generating PDF...", description: "Compiling your colorful reading portfolio." });

    try {
      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        backgroundColor: "#0f172a" // Force high contrast dark gaming background for PDF
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${user?.first_name || "Student"}_Reading_Portfolio.pdf`);
      toast({ title: "Downloaded", description: "Portfolio saved as PDF." });
    } catch (e) {
      console.error(e);
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  const monthlyProgress = stats.monthlyGoal > 0 ? Math.min(100, (stats.monthlyRead / stats.monthlyGoal) * 100) : 0;
  const barcode = user?.library_card_barcode || defaultStudentBarcode(user?.admission_number);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 bg-slate-950 min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
      </div>
    );
  }

  const shareLink = `${window.location.origin}/portfolio/${user?.username || user?.id}`;

  return (
    <div className={`mx-auto space-y-6 text-slate-100 ${embedded ? "max-w-5xl pb-24 lg:pb-8" : "max-w-5xl pb-12 px-4 sm:px-6 mt-8"}`}>
      <style>{`
        .gaming-mesh-banner {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.95) 0%, rgba(139, 92, 246, 0.95) 50%, rgba(236, 72, 153, 0.95) 100%);
          position: relative;
        }
        .gaming-mesh-banner::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.15) 0%, transparent 50%);
          pointer-events: none;
        }
        .neon-card-glow {
          box-shadow: 0 0 15px rgba(99, 102, 241, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          background: rgba(30, 41, 59, 0.5) !important;
          backdrop-filter: blur(12px);
        }
        .text-neon-cyan {
          text-shadow: 0 0 8px rgba(34, 211, 238, 0.4);
        }
      `}</style>

      {/* Hero header — mobile-first colorful banner */}
      <div className="relative overflow-hidden rounded-3xl gaming-mesh-banner text-white shadow-2xl border border-white/10">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-thread.png')] opacity-15" />
        <div className="relative p-6 sm:p-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-white/20 bg-slate-900/60 overflow-hidden shrink-0 flex items-center justify-center shadow-lg relative">
                {user?.avatar_url ? (
                  <img src={getAvatarUrl(user.avatar_url)} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
                ) : (
                  <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">{user?.first_name?.[0]}</span>
                )}
              </div>
              <div>
                <Badge className="bg-white/20 hover:bg-white/30 border-0 text-white text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 mb-2">DLMS Scholar Portfolio</Badge>
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-none drop-shadow-md">
                  {user?.first_name} {user?.last_name}
                </h1>
                <p className="text-indigo-100 text-xs sm:text-sm font-semibold mt-1.5 opacity-90">
                  Class {user?.student_class || "—"} · Adm {user?.admission_number || "—"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5 sm:ml-auto w-full sm:w-auto">
              <Button
                size="sm"
                variant="secondary"
                className="rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 flex-1 sm:flex-none h-10 font-bold transition-all"
                onClick={() => {
                  navigator.clipboard.writeText(shareLink);
                  toast({ title: "Link copied!", description: "Share your portfolio using your username link." });
                }}
              >
                <Share2 className="h-4 w-4 mr-1.5" /> Share Profile
              </Button>
              <Button 
                size="sm" 
                className="rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 border-0 text-white flex-1 sm:flex-none h-10 font-bold transition-all shadow-lg shadow-rose-500/25" 
                onClick={exportPortfolio}
              >
                <Download className="h-4 w-4 mr-1.5" /> Export PDF
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
            {[
              { label: "Total XP", value: stats.points.toLocaleString(), icon: Zap, color: "text-amber-400" },
              { label: "Class Rank", value: `#${classRank}`, icon: Medal, color: "text-cyan-400" },
              { label: "Login Streak", value: `${stats.streak} Days`, icon: Flame, color: "text-orange-400" },
              { label: "Books Read", value: `${stats.monthlyRead}/${stats.monthlyGoal}`, icon: Target, color: "text-pink-400" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-slate-950/40 backdrop-blur-md border border-white/5 p-4 text-center hover:scale-102 transition-transform">
                <s.icon className={`h-5 w-5 mx-auto mb-1.5 ${s.color}`} />
                <p className="text-xl sm:text-2xl font-black text-white">{s.value}</p>
                <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Container to Export (Force theme variables to render colorfully in PDF) */}
      <div id="portfolio-container" className="space-y-6 p-4 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        
        {/* Core Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Books Logged", value: stats.booksRead, icon: BookOpen, border: "border-blue-500/20", glow: "shadow-blue-500/5", color: "text-blue-400" },
            { label: "Quizzes Completed", value: stats.quizzesPassed, icon: Brain, border: "border-purple-500/20", glow: "shadow-purple-500/5", color: "text-purple-400" },
            { label: "Badges Awarded", value: stats.badges, icon: Award, border: "border-amber-500/20", glow: "shadow-amber-500/5", color: "text-amber-400" },
            { label: "Reading Targets", value: stats.goalsCompleted, icon: TrendingUp, border: "border-emerald-500/20", glow: "shadow-emerald-500/5", color: "text-emerald-400" },
          ].map((s) => (
            <Card key={s.label} className={`border ${s.border} bg-slate-950/50 backdrop-blur-md shadow-lg ${s.glow}`}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 border border-white/5`}>
                  <s.icon className={`h-6 w-6 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-black text-white">{s.value}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Reading Goal Progress Widget */}
        <Card className="border border-slate-800 bg-slate-950/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
              <Target className="h-5 w-5 text-emerald-400" /> School Reading Target Progress
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Currently read {stats.monthlyRead} out of school-wide {stats.monthlyGoal} books goal this month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Progress value={monthlyProgress} className="h-3.5 bg-slate-850 rounded-full overflow-hidden border border-white/5" />
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 pointer-events-none" />
            </div>
            <p className="text-xs text-emerald-400 font-bold mt-2.5 flex items-center gap-1.5">
              <span>🚀 {Math.round(monthlyProgress)}% Completed</span>
              <span className="text-slate-500 font-medium">· Keep exploring new categories!</span>
            </p>
          </CardContent>
        </Card>

        {/* Heatmap & Milestones Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            {/* Heatmap Card */}
            <Card className="border border-slate-800 bg-slate-950/30 overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                <p className="text-sm font-bold text-white mb-3">Daily Reading Velocity Grid</p>
                <div className="rounded-2xl p-2 bg-slate-950/50 border border-white/5">
                  <ReadingHeatmap activityLog={activityLog} year={new Date().getFullYear()} />
                </div>
              </CardContent>
            </Card>

            {/* Achievements Card */}
            <Card className="border border-slate-800 bg-slate-950/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-white">Milestones & Badge Vault</CardTitle>
                <CardDescription className="text-slate-400 text-xs">Track recently unlocked badges and reading challenge completion.</CardDescription>
              </CardHeader>
              <CardContent>
                {milestones.length > 0 ? (
                  <div className="space-y-3">
                    {milestones.map((m, i) => (
                      <div key={i} className="flex items-start gap-3.5 p-3 rounded-2xl bg-slate-950/50 border border-white/5 shadow-sm hover:border-slate-700 transition-colors">
                        <div className="p-2 rounded-xl bg-slate-900 shrink-0">
                          <m.icon className={`h-5 w-5 ${m.color}`} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white leading-tight">{m.title}</p>
                          <p className="text-xs text-slate-400 mt-1">{m.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 rounded-2xl bg-slate-950/20 border border-dashed border-slate-850">
                    <Award className="h-11 w-11 mx-auto mb-3 text-slate-600" />
                    <p className="text-sm font-bold text-slate-400">Unlock Achievements</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">Start borrow logs or complete library knowledge quizzes to start displaying milestones!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right sidebar Digital Library card */}
          <div className="space-y-6">
            <Card className="border border-slate-800 bg-slate-950/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-white">Student Identification Card</CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  {barcode ? `Barcode ID: ${barcode}` : "Unique Digital Library Identity"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center p-3 sm:p-4">
                <div className="bg-slate-950 p-2 rounded-2xl border border-white/5 shadow-inner">
                  <LibraryCard user={user} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
