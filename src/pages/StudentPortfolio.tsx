import { useState, useEffect } from "react";
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
  }, [userId]);

  const fetchData = async () => {
    try {
      let profileId = userId;
      if (!profileId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        profileId = session.user.id;
      }

      const [{ data: profile, error: profileError }, monthlyGoal] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", profileId).single(),
        fetchMonthlyReadingGoal(),
      ]);

      if (profileError || !profile) return;
      setUser(profile);

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

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
        supabase.from("reading_history").select("*", { count: "exact", head: true }).eq("user_id", profile.id),
        supabase.from("quiz_results").select("*", { count: "exact", head: true }).eq("user_id", profile.id),
        supabase.from("badge_awards").select("*", { count: "exact", head: true }).eq("user_id", profile.id),
        supabase.from("challenge_progress").select("*", { count: "exact", head: true }).eq("user_id", profile.id).eq("is_completed", true),
        supabase.from("reading_history").select("*", { count: "exact", head: true }).eq("user_id", profile.id).gte("completed_date", monthStart),
        supabase.from("reading_history").select("completed_date").eq("user_id", profile.id).not("completed_date", "is", null),
        supabase.from("badge_awards").select("awarded_at, badges(name, description, icon_name)").eq("user_id", profile.id).order("awarded_at", { ascending: false }).limit(3),
        supabase.from("challenge_progress").select("completed_at, challenges(title, reward_points)").eq("user_id", profile.id).eq("is_completed", true).order("completed_at", { ascending: false }).limit(2),
        supabase.from("login_streaks").select("current_streak").eq("user_id", profile.id).maybeSingle(),
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
          color: "text-amber-500",
          title: b.badges?.name || "Badge Earned",
          description: b.badges?.description || "Achievement unlocked in the library program.",
        });
      });
      (completedChallenges || []).forEach((c: any) => {
        ms.push({
          icon: Target,
          color: "text-emerald-500",
          title: c.challenges?.title || "Challenge Completed",
          description: `Earned ${c.challenges?.reward_points || 0} bonus points.`,
        });
      });
      if ((books || 0) >= 10) {
        ms.push({
          icon: BookOpen,
          color: "text-blue-500",
          title: "Avid Reader",
          description: `Logged ${books} books in your reading history.`,
        });
      }
      if ((quizzes || 0) >= 5) {
        ms.push({
          icon: Brain,
          color: "text-purple-500",
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

    toast({ title: "Generating PDF...", description: "Compiling your reading portfolio." });

    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${user?.first_name || "Student"}_Reading_Portfolio.pdf`);
      toast({ title: "Downloaded", description: "Portfolio saved as PDF." });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  const monthlyProgress = stats.monthlyGoal > 0 ? Math.min(100, (stats.monthlyRead / stats.monthlyGoal) * 100) : 0;
  const barcode = user?.library_card_barcode || defaultStudentBarcode(user?.admission_number);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className={`mx-auto space-y-5 ${embedded ? "max-w-5xl pb-24 lg:pb-8" : "max-w-5xl pb-12 px-4 sm:px-0"}`}>
      {/* Hero header — mobile-first */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
        <div className="relative p-5 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-4 border-white/30 bg-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                {user?.avatar_url ? (
                  <img src={getAvatarUrl(user.avatar_url)} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
                ) : (
                  <span className="text-2xl font-black">{user?.first_name?.[0]}</span>
                )}
              </div>
              <div>
                <Badge className="bg-white/20 border-0 text-white text-[10px] mb-1">Reading Portfolio</Badge>
                <h1 className="text-xl sm:text-3xl font-black leading-tight">
                  {user?.first_name} {user?.last_name}
                </h1>
                <p className="text-indigo-100 text-xs sm:text-sm font-medium mt-0.5">
                  Class {user?.student_class || "—"} · Adm {user?.admission_number || "—"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              <Button
                size="sm"
                variant="secondary"
                className="rounded-xl bg-white/15 text-white border-white/20 hover:bg-white/25 flex-1 sm:flex-none"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast({ title: "Link copied!" });
                }}
              >
                <Share2 className="h-4 w-4 mr-1" /> Share
              </Button>
              <Button size="sm" className="rounded-xl bg-white text-indigo-700 hover:bg-white/90 flex-1 sm:flex-none" onClick={exportPortfolio}>
                <Download className="h-4 w-4 mr-1" /> PDF
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-5">
            {[
              { label: "Total XP", value: stats.points.toLocaleString(), icon: Zap },
              { label: "Class Rank", value: `#${classRank}`, icon: Medal },
              { label: "Day Streak", value: stats.streak, icon: Flame },
              { label: "This Month", value: `${stats.monthlyRead}/${stats.monthlyGoal}`, icon: Target },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 p-3 text-center">
                <s.icon className="h-4 w-4 mx-auto mb-1 text-indigo-200" />
                <p className="text-lg sm:text-xl font-black">{s.value}</p>
                <p className="text-[10px] text-indigo-200 uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div id="portfolio-container" className="space-y-5">
        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Books Read", value: stats.booksRead, icon: BookOpen, bg: "bg-blue-50", color: "text-blue-600" },
            { label: "Quizzes Passed", value: stats.quizzesPassed, icon: Brain, bg: "bg-purple-50", color: "text-purple-600" },
            { label: "Badges", value: stats.badges, icon: Award, bg: "bg-amber-50", color: "text-amber-600" },
            { label: "Challenges Done", value: stats.goalsCompleted, icon: TrendingUp, bg: "bg-emerald-50", color: "text-emerald-600" },
          ].map((s) => (
            <Card key={s.label} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-black">{s.value}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Monthly goal progress */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-600" /> Monthly Reading Goal
            </CardTitle>
            <CardDescription>
              {stats.monthlyRead} of {stats.monthlyGoal} books this month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={monthlyProgress} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">{Math.round(monthlyProgress)}% complete — keep reading!</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <ReadingHeatmap activityLog={activityLog} year={new Date().getFullYear()} />

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Achievements & Milestones</CardTitle>
                <CardDescription>Your latest badges and completed challenges</CardDescription>
              </CardHeader>
              <CardContent>
                {milestones.length > 0 ? (
                  <div className="space-y-3">
                    {milestones.map((m, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                        <m.icon className={`h-5 w-5 shrink-0 mt-0.5 ${m.color}`} />
                        <div>
                          <p className="text-sm font-bold">{m.title}</p>
                          <p className="text-xs text-muted-foreground">{m.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Award className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Start reading and take quizzes to unlock milestones!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="border-border/50 sticky top-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Digital Library Card</CardTitle>
                <CardDescription>
                  {barcode ? `Barcode: ${barcode}` : "Show this at the issue desk"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center p-3 sm:p-4">
                <LibraryCard user={user} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
