import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, LogOut, Trophy, Target, User, BookPlus, Home, Brain,
  Flame, Medal, Search, ChevronRight, Star, Calendar, TrendingUp, Menu, X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLoginStreak } from "@/hooks/useLoginStreak";
import { Progress } from "@/components/ui/progress";

import LevelProgress from "@/components/dashboard/LevelProgress";
import CurrentBooks from "@/components/dashboard/CurrentBooks";
import QuizPage from "@/components/dashboard/QuizPage";
import ReadingChallenges from "@/components/rewards/ReadingChallenges";
import StudentProfile from "@/components/dashboard/StudentProfile";
import BookRequestForm from "@/components/BookRequestForm";
import ReadingHistoryManager from "@/components/dashboard/ReadingHistoryManager";
import LevelUpBanner from "@/components/rewards/LevelUpBanner";
import Rankings from "@/components/dashboard/Rankings";
import { StudentQuiz } from "@/components/quiz/StudentQuiz";
import DailyTip from "@/components/dashboard/DailyTip";
import QuickBookmarks from "@/components/dashboard/QuickBookmarks";
import NotificationBell from "@/components/dashboard/NotificationBell";

type Tab = "overview" | "books" | "quizzes" | "challenges" | "rankings" | "profile";

const navItems: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "books", label: "My Books", icon: BookOpen },
  { id: "quizzes", label: "Quizzes", icon: Brain },
  { id: "challenges", label: "Challenges", icon: Target },
  { id: "rankings", label: "Rankings", icon: Medal },
  { id: "profile", label: "Profile", icon: User },
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

  const streakData = useLoginStreak(user?.id);

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }
      const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (error || !profile) { navigate('/login'); return; }
      if (!profile.is_approved) {
        toast({ title: "Account Pending", description: "Your account is pending admin approval.", variant: "destructive" });
        navigate('/login'); return;
      }
      if (profile.points !== null) {
        try {
          const { data: levelData } = await supabase.rpc('get_user_level', { user_points: profile.points });
          if (levelData && levelData.length > 0) setPreviousLevel(levelData[0].level_number);
        } catch (e) { console.error(e); }
      }
      setUser(profile);
      if (profile.student_class && profile.points !== null) {
        try {
          const { data: rankData, error: rankError } = await supabase.rpc('get_user_class_rank', { user_class: profile.student_class, user_points: profile.points || 0 });
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
  const handleProfileUpdate = () => checkAuth();

  const handleQuizComplete = async (result: { score: number; pointsEarned: number }) => {
    await Promise.all([checkAuth(), fetchQuizResults(), fetchChallenges()]);
    toast({ title: "Quiz Completed!", description: `You scored ${result.score}% and earned ${result.pointsEarned} points!` });
    setSelectedQuiz(null);
  };

  const fetchCurrentBooks = async () => {
    if (!user?.id) return;
    const { data } = await supabase.from('book_issues').select('*, books (title, author, isbn, category, description, cover_url)').eq('user_id', user.id).eq('status', 'issued');
    setCurrentBooks(data || []); setCurrentBooksCount(data?.length || 0);
  };

  const fetchQuizResults = async () => {
    if (!user?.id) return;
    const { data } = await supabase.from('quiz_results').select('*, quizzes (title, description, subject, difficulty)').eq('user_id', user.id).order('completed_at', { ascending: false });
    setQuizResults(data || []); setQuizResultsCount(data?.length || 0);
  };

  const fetchAvailableQuizzes = async () => {
    const { data } = await supabase.from('quizzes').select('*').eq('is_active', true).order('created_at', { ascending: false });
    setAvailableQuizzes(data?.map(q => ({ id: q.id, title: q.title, description: q.description || '', difficulty: q.difficulty, timeLimit: q.time_limit, pointsReward: q.points_reward, questions: Array.isArray(q.questions) ? q.questions : [] })) || []);
  };

  const fetchChallenges = async () => {
    const { data: challengeData } = await supabase.from('challenges').select('*').eq('is_active', true).order('created_at', { ascending: false });
    if (!challengeData?.length) { setChallenges([]); return; }
    const { data: progressData } = await supabase.from('challenge_progress').select('*').eq('user_id', user?.id).in('challenge_id', challengeData.map(c => c.id));
    setChallenges(challengeData.map(c => {
      const p = progressData?.find(pr => pr.challenge_id === c.id);
      return { id: c.id, title: c.title, description: c.description, targetValue: c.target_value, currentProgress: p?.current_progress || 0, type: c.type, reward: { points: c.reward_points }, deadline: c.deadline, isCompleted: p?.is_completed || false, completedAt: p?.completed_at, isClaimed: p?.is_claimed || false };
    }));
  };

  const fetchRecentActivities = async () => {
    if (!user?.id) return;
    const activities: any[] = [];
    const { data: bookIssues } = await supabase.from('book_issues').select('*, books (title)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3);
    bookIssues?.forEach(i => activities.push({ type: 'book', title: `Started '${i.books?.title || 'Unknown'}'`, time: i.created_at }));
    const { data: qr } = await supabase.from('quiz_results').select('*, quizzes (title)').eq('user_id', user.id).order('completed_at', { ascending: false }).limit(3);
    qr?.forEach(r => activities.push({ type: 'quiz', title: `Completed ${r.quizzes?.title || 'Quiz'}`, time: r.completed_at, score: r.score }));
    const { data: rh } = await supabase.from('reading_history').select('*').eq('user_id', user.id).order('completed_date', { ascending: false }).limit(2);
    rh?.forEach(e => activities.push({ type: 'reading', title: `Finished '${e.book_title}'`, time: e.completed_date, points: e.points_earned }));
    activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    setRecentActivities(activities.slice(0, 5));
  };

  const fetchMonthlyBooksRead = async () => {
    if (!user?.id) return;
    const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const { data } = await supabase.from('reading_history').select('*').eq('user_id', user.id).gte('completed_date', start);
    setMonthlyBooksRead(data?.length || 0);
  };

  const handleJoinChallenge = (id: string) => console.log("Joining:", id);
  const handleClaimReward = async (id: string) => {
    await supabase.from('challenge_progress').update({ is_claimed: true }).eq('challenge_id', id).eq('user_id', user?.id);
    toast({ title: "Reward Claimed!" }); await Promise.all([checkAuth(), fetchChallenges()]);
  };

  useEffect(() => {
    if (user?.id) { fetchCurrentBooks(); fetchQuizResults(); fetchAvailableQuizzes(); fetchChallenges(); fetchRecentActivities(); fetchMonthlyBooksRead(); }
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
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 bg-card border-r border-border flex-col fixed h-full z-40">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-md">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-foreground truncate">KV Sulur Library</h1>
              <p className="text-xs text-muted-foreground">Student Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === item.id ? 'gradient-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{user?.first_name} {user?.last_name}</p>
              <p className="text-xs text-muted-foreground">Class {user?.student_class}</p>
            </div>
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
            <NotificationBell />
            <Button variant="ghost" size="sm" onClick={() => navigate('/catalog')}><Search className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
        {mobileNavOpen && (
          <div className="bg-card border-b border-border px-4 pb-3 space-y-1">
            {navItems.map(item => (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setMobileNavOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${activeTab === item.id ? 'gradient-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
                <item.icon className="h-4 w-4" /> {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
          {levelUpBanner && <LevelUpBanner newLevel={levelUpBanner} onClose={() => setLevelUpBanner(null)} />}

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Welcome Banner */}
              <Card className="overflow-hidden border-0 shadow-lg">
                <div className="gradient-primary p-6 sm:p-8">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-primary-foreground">Welcome back, {user?.first_name}! 👋</h2>
                      <p className="text-primary-foreground/80 text-sm mt-1">Keep up your reading streak and earn more points!</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-center bg-primary-foreground/20 rounded-xl px-4 py-2 backdrop-blur-sm">
                        <p className="text-2xl font-bold text-primary-foreground">{user?.points || 0}</p>
                        <p className="text-xs text-primary-foreground/80">Total Points</p>
                      </div>
                      <div className="text-center bg-primary-foreground/20 rounded-xl px-4 py-2 backdrop-blur-sm">
                        <p className="text-2xl font-bold text-primary-foreground">#{classRank}</p>
                        <p className="text-xs text-primary-foreground/80">Class Rank</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Level + Streak Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <LevelProgress userPoints={user?.points || 0} />
                {!streakData.loading && (
                  <Card className="border-border/50">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-full bg-warning/10 flex items-center justify-center ${streakData.currentStreak >= 3 ? 'animate-pulse' : ''}`}>
                          <Flame className="h-7 w-7 text-warning" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-3xl font-bold text-foreground">{streakData.currentStreak}</span>
                            <span className="text-sm text-muted-foreground">day streak</span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Trophy className="h-3 w-3 text-warning" /> Best: {streakData.longestStreak}</span>
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3 text-primary" /> Total: {streakData.totalLoginDays}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Books Reading", value: currentBooksCount, icon: BookOpen, color: "text-primary", bg: "bg-primary/10" },
                  { label: "Quizzes Taken", value: quizResultsCount, icon: Brain, color: "text-accent", bg: "bg-accent/10" },
                  { label: "Monthly Goal", value: `${monthlyBooksRead}/5`, icon: Target, color: "text-success", bg: "bg-success/10" },
                  { label: "Challenges", value: challenges.filter(c => c.isCompleted).length, icon: Star, color: "text-warning", bg: "bg-warning/10" },
                ].map((s, i) => (
                  <Card key={i} className="border-border/50 hover-lift">
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

              {/* Daily Tip + Quick Bookmarks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DailyTip />
                <QuickBookmarks currentBooks={currentBooks} monthlyBooksRead={monthlyBooksRead} totalPoints={user?.points || 0} />
              </div>

              {/* Recent Activity */}
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentActivities.length > 0 ? (
                    <div className="space-y-2">
                      {recentActivities.map((a, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-all border border-transparent hover:border-border/50">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${a.type === 'book' ? 'bg-primary/10' : a.type === 'quiz' ? 'bg-success/10' : 'bg-accent/10'}`}>
                            {a.type === 'book' ? <BookOpen className="h-4 w-4 text-primary" /> : a.type === 'quiz' ? <Brain className="h-4 w-4 text-success" /> : <Star className="h-4 w-4 text-accent" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                            <div className="flex items-center gap-2">
                              {a.score && <span className="text-xs text-success font-medium">Score: {a.score}%</span>}
                              {a.points ? <span className="text-xs text-warning font-medium">+{a.points} pts</span> : null}
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
            </div>
          )}

          {/* Books Tab */}
          {activeTab === "books" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">My Books</h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigate('/catalog')}>
                    <Search className="h-4 w-4 mr-2" /> Browse Catalog
                  </Button>
                  <Button size="sm" className="gradient-primary border-0" onClick={() => setShowBookRequest(true)}>
                    <BookPlus className="h-4 w-4 mr-2" /> Request Book
                  </Button>
                </div>
              </div>
              <Card className="border-border/50">
                <CardHeader><CardTitle className="text-lg">Currently Borrowed</CardTitle><CardDescription>Books checked out from the library</CardDescription></CardHeader>
                <CardContent><CurrentBooks books={currentBooks} /></CardContent>
              </Card>
              <Card className="border-border/50">
                <CardHeader><CardTitle className="text-lg">Reading History</CardTitle><CardDescription>Track and manage your reading progress</CardDescription></CardHeader>
                <CardContent><ReadingHistoryManager /></CardContent>
              </Card>
            </div>
          )}

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

          {/* Rankings Tab */}
          {activeTab === "rankings" && <Rankings user={user} />}

          {/* Profile Tab */}
          {activeTab === "profile" && <StudentProfile user={user} onProfileUpdate={handleProfileUpdate} />}
        </div>
      </main>

      {/* Book Request Modal */}
      {showBookRequest && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4">
          <div className="animate-scale-in">
            <BookRequestForm onClose={() => setShowBookRequest(false)} onSuccess={() => setShowBookRequest(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
