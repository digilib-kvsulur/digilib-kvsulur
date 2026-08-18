import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAvatarUrl } from "@/lib/utils";
import { Download, Share2, Award, BookOpen, Brain, Flame, Target } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import LibraryCard from "@/components/student/LibraryCard";
import ReadingHeatmap from "@/components/student/ReadingHeatmap";
import { useToast } from "@/hooks/use-toast";

export default function StudentPortfolio() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    booksRead: 0,
    quizzesPassed: 0,
    points: 0,
    badges: 0
  });
  const [activityLog, setActivityLog] = useState<{ date: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      console.log("Fetching portfolio data...");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log("No session found");
        return;
      }
      
      console.log("User session:", session.user.id);
      const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      
      if (profileError) {
        console.error("Profile fetch error:", profileError);
      }
      
      setUser(profile);

      if (profile) {
        console.log("Fetching stats for user...");
        // Fetch stats
        const [{ count: books }, { count: quizzes }, { count: badges }] = await Promise.all([
          supabase.from('reading_history').select('*', { count: 'exact', head: true }).eq('user_id', profile.id),
          supabase.from('quiz_results').select('*', { count: 'exact', head: true }).eq('user_id', profile.id),
          supabase.from('user_badges').select('*', { count: 'exact', head: true }).eq('user_id', profile.id)
        ]);

        console.log("Stats fetched:", { books, quizzes, badges });

        setStats({
          booksRead: books || 0,
          quizzesPassed: quizzes || 0,
          points: profile.points || 0,
          badges: badges || 0
        });

        // Mocking some heatmap data for demonstration based on history or generated
        // In a real scenario, this would group reading_history by date
        const { data: history, error: historyError } = await supabase
          .from('reading_history')
          .select('completed_date')
          .eq('user_id', profile.id)
          .not('completed_date', 'is', null);
          
        if (historyError) {
          console.error("History fetch error:", historyError);
        }
          
        const grouped: Record<string, number> = {};
        (history || []).forEach(h => {
           if (h.completed_date) {
             const d = h.completed_date.split('T')[0];
             grouped[d] = (grouped[d] || 0) + 1;
           }
        });
        
        // Ensure at least some data exists for visual demonstration if empty
        if (Object.keys(grouped).length === 0) {
           const today = new Date();
           grouped[today.toISOString().split('T')[0]] = 1;
        }

        const log = Object.entries(grouped).map(([date, value]) => ({ date, value }));
        setActivityLog(log);
        console.log("Portfolio data load complete.");
      }
    } catch (e) {
      console.error("Error in portfolio fetch:", e);
    } finally {
      setLoading(false);
    }
  };

  const exportPortfolio = async () => {
    const element = document.getElementById("portfolio-container");
    if (!element) return;
    
    toast({ title: "Generating PDF...", description: "Please wait while we compile your portfolio." });
    
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${user?.first_name}_Library_Portfolio.pdf`);
      
      toast({ title: "Success", description: "Portfolio downloaded successfully!" });
    } catch (e) {
      console.error(e);
      toast({ title: "Export Failed", description: "Could not generate PDF.", variant: "destructive" });
    }
  };

  if (loading) return <div className="p-8 text-center">Loading portfolio...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">My Reading Portfolio</h2>
          <p className="text-muted-foreground font-medium">A comprehensive record of your reading journey and achievements.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" className="flex-1 sm:flex-none rounded-xl font-bold" onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            toast({ title: "Link copied to clipboard!" });
          }}>
            <Share2 className="h-4 w-4 mr-2" /> Share
          </Button>
          <Button onClick={exportPortfolio} className="flex-1 sm:flex-none rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700">
            <Download className="h-4 w-4 mr-2" /> Export PDF
          </Button>
        </div>
      </div>

      <div id="portfolio-container" className="space-y-6 bg-slate-50 p-2 sm:p-6 rounded-3xl">
        
        {/* Header Profile Section */}
        <Card className="border-0 shadow-lg overflow-hidden bg-white">
          <div className="h-32 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 relative">
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>
          </div>
          <CardContent className="px-6 pb-6 relative pt-0">
             <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12 sm:-mt-16 mb-4">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 border-white shadow-xl bg-slate-100 overflow-hidden relative z-10 flex items-center justify-center shrink-0">
                  {user?.avatar_url ? (
                    <img src={getAvatarUrl(user.avatar_url)} alt="Profile" className="w-full h-full object-cover" crossOrigin="anonymous" />
                  ) : (
                    <span className="text-4xl font-black text-slate-400">{user?.first_name?.[0]}</span>
                  )}
                </div>
                <div className="text-center sm:text-left flex-1 pb-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                    {user?.first_name} {user?.last_name}
                  </h1>
                  <p className="text-indigo-600 font-bold uppercase tracking-widest text-xs sm:text-sm mt-1">
                    Class {user?.student_class} • Admission: {user?.admission_number || 'N/A'}
                  </p>
                </div>
                <div className="flex items-center gap-2 pb-2">
                   <div className="text-center px-4 py-2 bg-slate-50 rounded-xl border">
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total XP</p>
                      <p className="text-xl font-black text-indigo-600">{stats.points.toLocaleString()}</p>
                   </div>
                </div>
             </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Books Read", value: stats.booksRead, icon: BookOpen, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Quizzes Passed", value: stats.quizzesPassed, icon: Brain, color: "text-purple-600", bg: "bg-purple-50" },
            { label: "Badges Earned", value: stats.badges, icon: Award, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Reading Goals", value: "3", icon: Target, color: "text-emerald-600", bg: "bg-emerald-50" }, // Mocked goal count
          ].map((s, i) => (
            <Card key={i} className="border-0 shadow-sm bg-white">
              <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center text-center">
                <div className={`w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center mb-3`}>
                  <s.icon className={`h-6 w-6 ${s.color}`} />
                </div>
                <p className="text-3xl font-black text-slate-900">{s.value}</p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Heatmap & ID Card Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ReadingHeatmap activityLog={activityLog} year={new Date().getFullYear()} />
            
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-lg">Reading Highlights & Milestones</CardTitle>
                <CardDescription>Major achievements logged this year</CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="space-y-4">
                    {/* Mock milestones for visual portfolio completeness */}
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                       <Award className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                       <div>
                         <p className="text-sm font-bold text-slate-900">Top 10% Reader in Class {user?.student_class}</p>
                         <p className="text-xs text-slate-500">Achieved earlier this month for consistent borrowing.</p>
                       </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                       <Brain className="h-5 w-5 text-purple-500 shrink-0 mt-0.5" />
                       <div>
                         <p className="text-sm font-bold text-slate-900">Science Fiction Enthusiast</p>
                         <p className="text-xs text-slate-500">Completed 5+ quizzes in the Sci-Fi genre with over 80% score.</p>
                       </div>
                    </div>
                 </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-6">
             <Card className="border-0 shadow-sm bg-white">
               <CardHeader className="pb-2">
                 <CardTitle className="text-lg">Digital ID Card</CardTitle>
                 <CardDescription>Your official library credential</CardDescription>
               </CardHeader>
               <CardContent className="flex justify-center p-4">
                  <LibraryCard user={user} />
               </CardContent>
             </Card>
          </div>
        </div>

      </div>
    </div>
  );
}
