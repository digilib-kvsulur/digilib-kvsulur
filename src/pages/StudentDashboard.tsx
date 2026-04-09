import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BookOpen, LogOut, Trophy, Target, User, Users, BookPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLoginStreak } from "@/hooks/useLoginStreak";

import Overview from "@/components/dashboard/Overview";
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

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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
        } catch (error) { console.error('Error getting current level:', error); }
      }
      setUser(profile);
      if (profile.student_class && profile.points !== null) {
        try {
          const { data: rankData, error: rankError } = await supabase.rpc('get_user_class_rank', { user_class: profile.student_class, user_points: profile.points || 0 });
          if (!rankError && rankData !== null) setClassRank(rankData);
        } catch (error) { console.error('Error calculating class rank:', error); }
      }
    } catch (error) { navigate('/login'); } finally { setLoading(false); }
  };

  const checkLevelUp = async (newPoints: number) => {
    if (!user?.id || previousLevel === null) return;
    try {
      const { data: newLevelData } = await supabase.rpc('get_user_level', { user_points: newPoints });
      if (newLevelData && newLevelData.length > 0) {
        const newLevel = newLevelData[0].level_number;
        if (newLevel > previousLevel) {
          setLevelUpBanner({ level_number: newLevel, name: newLevelData[0].name, icon_name: newLevelData[0].icon_name, color: newLevelData[0].color });
        }
        setPreviousLevel(newLevel);
      }
    } catch (error) { console.error('Error checking level up:', error); }
  };

  useEffect(() => {
    if (user?.points && previousLevel !== null) checkLevelUp(user.points);
  }, [user?.points, previousLevel]);

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); navigate('/login'); } catch (error) {
      toast({ title: "Error", description: "Failed to logout.", variant: "destructive" });
    }
  };

  const handleProfileUpdate = () => checkAuth();

  const handleQuizComplete = async (result: { score: number; pointsEarned: number }) => {
    await Promise.all([checkAuth(), fetchQuizResults(), fetchChallenges()]);
    toast({ title: "Quiz Completed!", description: `You scored ${result.score}% and earned ${result.pointsEarned} points!` });
    setSelectedQuiz(null);
  };

  const fetchCurrentBooks = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase.from('book_issues').select('*, books (title, author, isbn, category, description, cover_url)').eq('user_id', user.id).eq('status', 'issued');
      if (error) throw error;
      setCurrentBooks(data || []);
      setCurrentBooksCount(data?.length || 0);
    } catch (error) { console.error('Error fetching current books:', error); }
  };

  const fetchQuizResults = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase.from('quiz_results').select('*, quizzes (title, description, subject, difficulty)').eq('user_id', user.id).order('completed_at', { ascending: false });
      if (error) throw error;
      setQuizResults(data || []);
      setQuizResultsCount(data?.length || 0);
    } catch (error) { console.error('Error fetching quiz results:', error); }
  };

  const fetchAvailableQuizzes = async () => {
    try {
      const { data, error } = await supabase.from('quizzes').select('*').eq('is_active', true).order('created_at', { ascending: false });
      if (error) throw error;
      setAvailableQuizzes(data?.map(quiz => ({
        id: quiz.id, title: quiz.title, description: quiz.description || '',
        difficulty: quiz.difficulty, timeLimit: quiz.time_limit, pointsReward: quiz.points_reward,
        questions: Array.isArray(quiz.questions) ? quiz.questions : []
      })) || []);
    } catch (error) { console.error('Error fetching available quizzes:', error); }
  };

  const fetchChallenges = async () => {
    try {
      const { data: challengeData, error: challengeError } = await supabase.from('challenges').select('*').eq('is_active', true).order('created_at', { ascending: false });
      if (challengeError) throw challengeError;
      if (!challengeData || challengeData.length === 0) { setChallenges([]); return; }
      const challengeIds = challengeData.map(c => c.id);
      const { data: progressData } = await supabase.from('challenge_progress').select('*').eq('user_id', user?.id).in('challenge_id', challengeIds);
      setChallenges(challengeData.map(challenge => {
        const userProgress = progressData?.find(p => p.challenge_id === challenge.id);
        return {
          id: challenge.id, title: challenge.title, description: challenge.description,
          targetValue: challenge.target_value, currentProgress: userProgress?.current_progress || 0,
          type: challenge.type, reward: { points: challenge.reward_points },
          deadline: challenge.deadline, isCompleted: userProgress?.is_completed || false,
          completedAt: userProgress?.completed_at, isClaimed: userProgress?.is_claimed || false
        };
      }));
    } catch (error) { console.error('Error fetching challenges:', error); setChallenges([]); }
  };

  const handleJoinChallenge = (challengeId: string) => console.log("Joining challenge:", challengeId);

  const handleClaimReward = async (challengeId: string) => {
    try {
      const { error } = await supabase.from('challenge_progress').update({ is_claimed: true }).eq('challenge_id', challengeId).eq('user_id', user?.id);
      if (error) throw error;
      toast({ title: "Reward Claimed!", description: "Your challenge reward has been added." });
      await Promise.all([checkAuth(), fetchChallenges()]);
    } catch (error) {
      toast({ title: "Error", description: "Failed to claim reward.", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchCurrentBooks(); fetchQuizResults(); fetchAvailableQuizzes(); fetchChallenges();
    }
  }, [user?.id]);

  const levelInfo = {
    currentLevel: Math.floor((user?.points || 0) / 100) + 1,
    pointsToNext: 100 - (user?.points || 0) % 100,
    progressPercent: (user?.points || 0) % 100
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (selectedQuiz) {
    return <StudentQuiz quiz={selectedQuiz} onComplete={handleQuizComplete} onBack={() => setSelectedQuiz(null)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-lg font-bold text-foreground hidden sm:block">
                PM SHRI KV Sulur Library
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{user?.first_name} {user?.last_name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role} • Class {user?.student_class}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center gap-1.5">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {levelUpBanner && <LevelUpBanner newLevel={levelUpBanner} onClose={() => setLevelUpBanner(null)} />}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 h-11">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="books" className="text-xs sm:text-sm">My Books</TabsTrigger>
            <TabsTrigger value="quizzes" className="text-xs sm:text-sm">Quizzes</TabsTrigger>
            <TabsTrigger value="challenges" className="text-xs sm:text-sm">Challenges</TabsTrigger>
            <TabsTrigger value="rankings" className="text-xs sm:text-sm">Rankings</TabsTrigger>
            <TabsTrigger value="profile" className="text-xs sm:text-sm">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Overview
              user={user}
              currentBooksCount={currentBooksCount}
              quizResultsCount={quizResultsCount}
              classRank={classRank}
              levelInfo={levelInfo}
              userPoints={user?.points || 0}
              streakData={streakData.loading ? undefined : {
                currentStreak: streakData.currentStreak,
                longestStreak: streakData.longestStreak,
                totalLoginDays: streakData.totalLoginDays,
              }}
            />
          </TabsContent>

          <TabsContent value="books">
            <div className="space-y-6">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Currently Borrowed Books
                  </CardTitle>
                  <CardDescription>Books you have checked out from the library</CardDescription>
                </CardHeader>
                <CardContent>
                  <CurrentBooks books={currentBooks} />
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Request Section</CardTitle>
                  <CardDescription>Your request will be surely processed by us.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 flex-wrap">
                    <Button onClick={() => setShowBookRequest(true)} className="gradient-primary border-0">
                      <BookPlus className="h-4 w-4 mr-2" />
                      Request New Book for Library
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Reading History</CardTitle>
                  <CardDescription>Track and manage your reading progress</CardDescription>
                </CardHeader>
                <CardContent>
                  <ReadingHistoryManager />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="quizzes">
            <QuizPage quizzes={availableQuizzes} results={quizResults} onSelectQuiz={setSelectedQuiz} />
          </TabsContent>

          <TabsContent value="challenges">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-accent" />
                  Reading Challenges & Rewards
                </CardTitle>
                <CardDescription>Join challenges to earn extra points and rewards</CardDescription>
              </CardHeader>
              <CardContent>
                <ReadingChallenges challenges={challenges} onJoinChallenge={handleJoinChallenge} onClaimReward={handleClaimReward} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rankings">
            <Rankings user={user} />
          </TabsContent>

          <TabsContent value="profile">
            <StudentProfile user={user} onProfileUpdate={handleProfileUpdate} />
          </TabsContent>
        </Tabs>
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
