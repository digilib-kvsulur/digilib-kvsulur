import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Star, BookOpen, Trophy, Target, TrendingUp, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import QuizOverview from "./QuizOverview";
import LevelProgress from "./LevelProgress";
import LoginStreakCard from "./LoginStreakCard";

interface OverviewProps {
  user: any;
  currentBooksCount: number;
  quizResultsCount: number;
  classRank: number | string;
  levelInfo: {
    currentLevel: number;
    pointsToNext: number;
    progressPercent: number;
  };
  userPoints: number;
  streakData?: {
    currentStreak: number;
    longestStreak: number;
    totalLoginDays: number;
  };
}

interface RecentActivity {
  type: 'book' | 'quiz' | 'points' | 'reading' | 'levelup' | 'challenge';
  title: string;
  time: string;
  score?: number;
  points?: number;
}

const Overview = ({ 
  user, 
  currentBooksCount, 
  quizResultsCount, 
  classRank,
  levelInfo,
  userPoints,
  streakData
}: OverviewProps) => {
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [monthlyBooksRead, setMonthlyBooksRead] = useState(0);
  const [loading, setLoading] = useState(true);
  const [availableQuizzes, setAvailableQuizzes] = useState<any[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchRecentActivities();
      fetchMonthlyBooksRead();
      fetchAvailableQuizzes();
      setLoading(false);
    }
  }, [user?.id]);

  const fetchAvailableQuizzes = async () => {
    try {
      const { data: quizzes, error } = await supabase
        .from('quizzes')
        .select('id, title, description, difficulty, time_limit, points_reward, questions')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      const formattedQuizzes = quizzes?.map(quiz => ({
        id: quiz.id, title: quiz.title, description: quiz.description || '',
        difficulty: quiz.difficulty, timeLimit: quiz.time_limit,
        pointsReward: quiz.points_reward,
        questions: Array.isArray(quiz.questions) ? quiz.questions : []
      })) || [];
      setAvailableQuizzes(formattedQuizzes);
    } catch (error) {
      console.error('Error fetching available quizzes:', error);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const activities: RecentActivity[] = [];
      
      const [
        { data: bookIssues },
        { data: quizResults },
        { data: readingHistory },
        { data: challengeProgress }
      ] = await Promise.all([
        supabase.from('book_issues').select('created_at, books (title)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
        supabase.from('quiz_results').select('completed_at, score, quizzes (title)').eq('user_id', user.id).order('completed_at', { ascending: false }).limit(3),
        supabase.from('reading_history').select('book_title, completed_date, points_earned').eq('user_id', user.id).order('completed_date', { ascending: false }).limit(2),
        supabase.from('challenge_progress').select('completed_at, challenges (title, reward_points)').eq('user_id', user.id).eq('is_completed', true).order('completed_at', { ascending: false }).limit(2)
      ]);

      if (bookIssues) {
        bookIssues.forEach(issue => {
          activities.push({ type: 'book', title: `Started reading '${(issue.books as any)?.title || 'Unknown Book'}'`, time: getTimeAgo(issue.created_at) });
        });
      }
      if (quizResults) {
        quizResults.forEach(result => {
          activities.push({ type: 'quiz', title: `Completed ${(result.quizzes as any)?.title || 'Quiz'}`, time: getTimeAgo(result.completed_at), score: result.score });
        });
      }
      if (readingHistory) {
        readingHistory.forEach(entry => {
          activities.push({ type: 'reading', title: `Finished reading '${entry.book_title}'`, time: getTimeAgo(entry.completed_date), points: entry.points_earned });
        });
      }
      if (challengeProgress) {
        challengeProgress.forEach(progress => {
          activities.push({ type: 'challenge', title: `Completed challenge: ${(progress.challenges as any)?.title || 'Challenge'}`, time: getTimeAgo(progress.completed_at), points: (progress.challenges as any)?.reward_points || 0 });
        });
      }
      
      activities.sort((a, b) => getTimeValue(a.time) - getTimeValue(b.time));
      setRecentActivities(activities.slice(0, 5));
    } catch (error) {
      console.error('Error fetching recent activities:', error);
    }
  };

  const fetchMonthlyBooksRead = async () => {
    try {
      const currentMonth = new Date();
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      // HEAD-only count: no row data transferred at all
      const { count, error } = await supabase.from('reading_history')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id).gte('completed_date', startOfMonth.toISOString().split('T')[0]);
      if (!error) setMonthlyBooksRead(count || 0);
    } catch (error) {
      console.error('Error fetching monthly books read:', error);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  };

  const getTimeValue = (timeString: string): number => {
    if (timeString.includes('Just now')) return 0;
    if (timeString.includes('minutes ago')) return parseInt(timeString) * 60;
    if (timeString.includes('hours ago')) return parseInt(timeString) * 3600;
    if (timeString.includes('days ago')) return parseInt(timeString) * 86400;
    if (timeString.includes('months ago')) return parseInt(timeString) * 2592000;
    return 0;
  };

  const handleSelectQuiz = (quiz: any) => console.log('Selected quiz:', quiz);
  const handleViewAllQuizzes = () => console.log('Navigate to quizzes tab');

  const getActivityIcon = (type: string) => {
    const iconMap: Record<string, { bg: string; dot: string }> = {
      book: { bg: 'bg-primary/10', dot: 'bg-primary' },
      quiz: { bg: 'bg-success/10', dot: 'bg-success' },
      reading: { bg: 'bg-accent/10', dot: 'bg-accent' },
      levelup: { bg: 'bg-warning/10', dot: 'bg-warning' },
      challenge: { bg: 'bg-info/10', dot: 'bg-info' },
    };
    return iconMap[type] || { bg: 'bg-muted', dot: 'bg-muted-foreground' };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card><CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome + Level */}
      <Card className="overflow-hidden border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl">Welcome back, {user?.first_name}! 👋</CardTitle>
          <CardDescription>Here's your learning progress overview</CardDescription>
        </CardHeader>
        <CardContent>
          <LevelProgress userPoints={userPoints} />
        </CardContent>
      </Card>

      {/* Login Streak */}
      {streakData && (
        <LoginStreakCard 
          currentStreak={streakData.currentStreak} 
          longestStreak={streakData.longestStreak} 
          totalLoginDays={streakData.totalLoginDays} 
        />
      )}

      {/* Progress Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover-lift border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center">
                <Star className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Level {levelInfo.currentLevel}</p>
                <p className="text-xl font-bold">{user?.points || 0} pts</p>
                <Progress value={levelInfo.progressPercent} className="h-1.5 mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                <Trophy className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Class Rank</p>
                <p className="text-xl font-bold">#{classRank}</p>
                <p className="text-xs text-muted-foreground">in {user?.student_class}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
                <Target className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Goal</p>
                <p className="text-xl font-bold">{monthlyBooksRead}/5</p>
                <p className="text-xs text-muted-foreground">books read</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Books Reading</CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentBooksCount}</div>
            <p className="text-xs text-muted-foreground">Currently issued</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quizzes Taken</CardTitle>
            <Trophy className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quizResultsCount}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activity Streak</CardTitle>
            <TrendingUp className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{streakData?.currentStreak || 0}</div>
            <p className="text-xs text-muted-foreground">days active</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Your latest learning activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity, index) => {
                const style = getActivityIcon(activity.type);
                return (
                  <div key={index} className={`flex items-start gap-3 p-3 ${style.bg} rounded-lg animate-fade-in`} style={{ animationDelay: `${index * 0.1}s` }}>
                    <div className={`w-2 h-2 rounded-full mt-2 ${style.dot}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                      {activity.score && <p className="text-xs text-success font-medium">Score: {activity.score}%</p>}
                      {activity.points ? <p className="text-xs text-warning font-medium">+{activity.points} points</p> : null}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No recent activity yet</p>
                <p className="text-xs">Start reading books or taking quizzes!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <QuizOverview quizzes={availableQuizzes} onSelectQuiz={handleSelectQuiz} onViewAll={handleViewAllQuizzes} />
    </div>
  );
};

export default Overview;
