import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getAvatarUrl } from "@/lib/utils";
import { Download, Share2, Award, BookOpen, Brain, Flame, Target, TrendingUp, Zap, Medal, Trophy, Star, CheckCircle2 } from "lucide-react";
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
  glowColor: string;
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

      const monthlyGoal = await fetchMonthlyReadingGoal();

      const { data: statsData } = await supabase.rpc("get_public_portfolio_data", {
        target_user_id: targetUserId,
      });

      if (statsData) {
        setStats({
          booksRead: statsData.booksRead || 0,
          quizzesPassed: statsData.quizzesPassed || 0,
          points: statsData.points || 0,
          badges: statsData.badges || 0,
          goalsCompleted: statsData.goalsCompleted || 0,
          monthlyRead: statsData.monthlyRead || 0,
          monthlyGoal: monthlyGoal,
          streak: statsData.streak || 0,
        });

        setClassRank(statsData.classRank || "—");
        setActivityLog(statsData.activityLog || []);

        const mappedMilestones = (statsData.milestones || []).map((m: any) => ({
          icon: m.type === "badge" ? Award : Target,
          color: m.type === "badge" ? "text-amber-500" : "text-emerald-500",
          glowColor: m.type === "badge" ? "shadow-amber-500/40" : "shadow-emerald-500/40",
          title: m.title,
          description: m.description,
        }));
        setMilestones(mappedMilestones);
      }
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
        backgroundColor: "#ffffff" // Force clean white background for light themed PDF
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
      <div className="flex items-center justify-center py-20 bg-slate-50 min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const shareLink = `${window.location.origin}/portfolio/${user?.username || user?.id}`;

  return (
    <div className={`mx-auto space-y-6 text-slate-800 ${embedded ? "max-w-5xl pb-24 lg:pb-8" : "max-w-5xl pb-12 px-4 sm:px-6 mt-8"}`}>
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
        .stat-glow-blue { box-shadow: 0 4px 20px rgba(99, 102, 241, 0.2); }
        .stat-glow-purple { box-shadow: 0 4px 20px rgba(139, 92, 246, 0.2); }
        .stat-glow-amber { box-shadow: 0 4px 20px rgba(245, 158, 11, 0.2); }
        .stat-glow-emerald { box-shadow: 0 4px 20px rgba(16, 185, 129, 0.2); }
        .timeline-glow-amber { box-shadow: 0 0 12px rgba(245, 158, 11, 0.4); }
        .timeline-glow-emerald { box-shadow: 0 0 12px rgba(16, 185, 129, 0.4); }
        @keyframes progress-glow {
          0%, 100% { box-shadow: 0 0 8px rgba(99, 102, 241, 0.4); }
          50% { box-shadow: 0 0 18px rgba(139, 92, 246, 0.7); }
        }
        .progress-glow-bar { animation: progress-glow 2.5s ease-in-out infinite; }
      `}</style>

      {/* Hero header — mobile-first colorful banner */}
      <div className="relative overflow-hidden rounded-3xl gaming-mesh-banner text-white shadow-xl border border-white/10">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-thread.png')] opacity-10" />
        <div className="relative p-6 sm:p-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-white/20 bg-white/10 overflow-hidden shrink-0 flex items-center justify-center shadow-lg relative">
                {user?.avatar_url ? (
                  <img src={getAvatarUrl(user.avatar_url)} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
                ) : (
                  <span className="text-3xl font-black text-white">{user?.first_name?.[0]}</span>
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

          {/* 4-col futuristic quick stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
            {[
              { label: "Total XP",     value: stats.points.toLocaleString(), icon: Zap,    gradient: "from-amber-400 to-orange-400" },
              { label: "Class Rank",   value: `#${classRank}`,              icon: Medal,  gradient: "from-cyan-400 to-blue-400"   },
              { label: "Login Streak", value: `${stats.streak} Days`,       icon: Flame,  gradient: "from-orange-400 to-red-400"  },
              { label: "Books Read",   value: `${stats.monthlyRead}/${stats.monthlyGoal}`, icon: Target, gradient: "from-pink-400 to-rose-400" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/10 border border-white/10 p-4 text-center hover:bg-white/15 transition-all group">
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center mx-auto mb-2 shadow-lg group-hover:scale-110 transition-transform`}>
                  <s.icon className="h-4 w-4 text-white" />
                </div>
                <p className="text-xl sm:text-2xl font-black text-white">{s.value}</p>
                <p className="text-[9px] text-indigo-200 uppercase tracking-widest font-bold mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Container to Export (Force light background for clean printing) */}
      <div id="portfolio-container" className="space-y-6 p-4 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-xl">

        {/* Futuristic Core Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Total Books Logged", value: stats.booksRead,     icon: BookOpen,
              gradient: "from-blue-500 to-indigo-600", bg: "bg-blue-50", border: "border-blue-100",
              iconBg: "bg-blue-100", iconColor: "text-blue-600", glow: "stat-glow-blue"
            },
            {
              label: "Quizzes Completed", value: stats.quizzesPassed, icon: Brain,
              gradient: "from-purple-500 to-violet-600", bg: "bg-purple-50", border: "border-purple-100",
              iconBg: "bg-purple-100", iconColor: "text-purple-600", glow: "stat-glow-purple"
            },
            {
              label: "Badges Awarded",    value: stats.badges,         icon: Award,
              gradient: "from-amber-500 to-orange-500", bg: "bg-amber-50", border: "border-amber-100",
              iconBg: "bg-amber-100", iconColor: "text-amber-600", glow: "stat-glow-amber"
            },
            {
              label: "Reading Targets",   value: stats.goalsCompleted, icon: TrendingUp,
              gradient: "from-emerald-500 to-teal-600", bg: "bg-emerald-50", border: "border-emerald-100",
              iconBg: "bg-emerald-100", iconColor: "text-emerald-600", glow: "stat-glow-emerald"
            },
          ].map((s) => (
            <div key={s.label} className={`relative overflow-hidden rounded-2xl border ${s.border} ${s.bg} ${s.glow} transition-shadow hover:shadow-lg p-5`}>
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${s.gradient} rounded-t-2xl`} />
              <div className={`w-11 h-11 rounded-xl ${s.iconBg} flex items-center justify-center mb-3`}>
                <s.icon className={`h-6 w-6 ${s.iconColor}`} />
              </div>
              <p className="text-3xl font-black text-slate-800">{s.value}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Animated Reading Goal Progress Widget */}
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Target className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">School Reading Target</p>
                <p className="text-xs text-slate-500">Monthly goal progress</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-indigo-600">{Math.round(monthlyProgress)}%</p>
              <p className="text-[10px] text-slate-500 font-medium">{stats.monthlyRead} of {stats.monthlyGoal} books</p>
            </div>
          </div>
          <div className="relative h-3.5 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full progress-glow-bar transition-all duration-1000"
              style={{ width: `${monthlyProgress}%` }}
            />
          </div>
          <p className="text-xs text-emerald-600 font-bold mt-2.5 flex items-center gap-1.5">
            {monthlyProgress >= 100
              ? <><CheckCircle2 className="h-3.5 w-3.5" /> Goal completed! 🎉</>
              : <><span>🚀 Keep going! {Math.max(0, stats.monthlyGoal - stats.monthlyRead)} more book(s) to reach your target.</span></>
            }
          </p>
        </div>

        {/* Heatmap & Milestones Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">

            {/* Heatmap Card */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 overflow-hidden">
              <div className="p-4 sm:p-6">
                <p className="text-sm font-bold text-slate-800 mb-3">Daily Reading Velocity Grid</p>
                <div className="rounded-2xl p-2 bg-white border border-slate-200">
                  <ReadingHeatmap activityLog={activityLog} year={new Date().getFullYear()} />
                </div>
              </div>
            </div>

            {/* Milestone Timeline */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 overflow-hidden">
              <div className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <p className="text-sm font-bold text-slate-800">Milestones &amp; Badge Vault</p>
                </div>
                <p className="text-xs text-slate-500 mb-4">Recently unlocked badges and reading challenge completions.</p>
                {milestones.length > 0 ? (
                  <div className="relative space-y-1">
                    {/* Vertical timeline line */}
                    <div className="absolute left-5 top-5 bottom-5 w-px bg-gradient-to-b from-amber-200 via-indigo-200 to-emerald-200 hidden sm:block" />
                    {milestones.map((m, i) => (
                      <div key={i} className="flex items-start gap-4 p-3 rounded-2xl hover:bg-white hover:border hover:border-slate-200 transition-all group relative">
                        {/* Glowing node */}
                        <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-md ${m.glowColor} ${
                          m.color.includes("amber") ? "bg-amber-50 timeline-glow-amber" : "bg-emerald-50 timeline-glow-emerald"
                        }`}>
                          <m.icon className={`h-5 w-5 ${m.color}`} />
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <p className="text-sm font-bold text-slate-800 leading-tight">{m.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>
                        </div>
                        <Star className={`h-3.5 w-3.5 shrink-0 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity ${m.color}`} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 rounded-2xl bg-white border border-dashed border-slate-300">
                    <Award className="h-11 w-11 mx-auto mb-3 text-slate-400" />
                    <p className="text-sm font-bold text-slate-500">Unlock Achievements</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">Start borrow logs or complete library knowledge quizzes to start displaying milestones!</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right sidebar — Library card + XP summary */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 overflow-hidden">
              <div className="p-4 pb-2">
                <p className="text-sm font-bold text-slate-800">Student Identification Card</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {barcode ? `Barcode ID: ${barcode}` : "Unique Digital Library Identity"}
                </p>
              </div>
              <div className="flex justify-center p-3 sm:p-4">
                <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                  <LibraryCard user={user} />
                </div>
              </div>
            </div>

            {/* XP Summary mini card */}
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-indigo-600" />
                <p className="text-sm font-bold text-slate-800">XP Summary</p>
              </div>
              <p className="text-4xl font-black text-indigo-700">{stats.points.toLocaleString()}</p>
              <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wider mt-1">Total Experience Points</p>
              <div className="mt-4 space-y-2">
                {[
                  { label: "Books Logged",   value: stats.booksRead,       color: "bg-blue-500"    },
                  { label: "Quizzes Done",   value: stats.quizzesPassed,   color: "bg-purple-500"  },
                  { label: "Goals Achieved", value: stats.goalsCompleted,  color: "bg-emerald-500" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${item.color} shrink-0`} />
                    <p className="text-xs text-slate-600 font-medium flex-1">{item.label}</p>
                    <p className="text-xs font-black text-slate-800">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}