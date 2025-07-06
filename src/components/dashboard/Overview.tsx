import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Star, BookOpen, Trophy, Target, TrendingUp, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import QuizOverview from "./QuizOverview";

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
}

interface RecentActivity {
  type: 'book' | 'quiz' | 'points' | 'reading';
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
  levelInfo 
}: OverviewProps) => {
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [monthlyBooksRead, setMonthlyBooksRead] = useState(0);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [availableQuizzes, setAvailableQuizzes] = useState<any[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchRecentActivities();
      fetchMonthlyBooksRead();
      fetchStreak();
      fetchAvailableQuizzes();
    }
  }, [user?.id]);

  const fetchAvailableQuizzes = async () => {
    try {
      const { data: quizzes, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;

      const formattedQuizzes = quizzes?.map(quiz => ({
        id: quiz.id,
        title: quiz.title,
        description: quiz.description || '',
        difficulty: quiz.difficulty,
        timeLimit: quiz.time_limit,
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
      
      // Fetch recent book issues
      const { data: bookIssues } = await supabase
        .from('book_issues')
        .select(`
          *,
          books (title)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (bookIssues) {
        bookIssues.forEach(issue => {
          activities.push({
            type: 'book',
            title: `Started reading '${issue.books?.title || 'Unknown Book'}'`,
            time: getTimeAgo(issue.created_at)
          });
        });
      }

      // Fetch recent quiz results
      const { data: quizResults } = await supabase
        .from('quiz_results')
        .select(`
          *,
          quizzes (title)
        `)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(3);

      if (quizResults) {
        quizResults.forEach(result => {
          activities.push({
            type: 'quiz',
            title: `Completed ${result.quizzes?.title || 'Quiz'}`,
            time: getTimeAgo(result.completed_at),
            score: result.score
          });
        });
      }

      // Fetch recent reading history
      const { data: readingHistory } = await supabase
        .from('reading_history')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_date', { ascending: false })
        .limit(2);

      if (readingHistory) {
        readingHistory.forEach(entry => {
          activities.push({
            type: 'reading',
            title: `Finished reading '${entry.book_title}'`,
            time: getTimeAgo(entry.completed_date),
            points: entry.points_earned
          });
        });
      }

      // Sort all activities by time and take the most recent 5
      activities.sort((a, b) => {
        const timeA = getTimeValue(a.time);
        const timeB = getTimeValue(b.time);
        return timeA - timeB;
      });

      setRecentActivities(activities.slice(0, 5));
    } catch (error) {
      console.error('Error fetching recent activities:', error);
    }
  };

  const fetchMonthlyBooksRead = async () => {
    try {
      const currentMonth = new Date();
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      
      const { data, error } = await supabase
        .from('reading_history')
        .select('*')
        .eq('user_id', user.id)
        .gte('completed_date', startOfMonth.toISOString().split('T')[0]);

      if (!error && data) {
        setMonthlyBooksRead(data.length);
      }
    } catch (error) {
      console.error('Error fetching monthly books read:', error);
    }
  };

  const fetchStreak = async () => {
    try {
      // Get all activity dates from reading history and quiz results
      const { data: readingData } = await supabase
        .from('reading_history')
        .select('completed_date')
        .eq('user_id', user.id)
        .order('completed_date', { ascending: false });

      const { data: quizData } = await supabase
        .from('quiz_results')
        .select('completed_at')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      // Combine all activity dates and convert to date strings (YYYY-MM-DD format)
      const allDates = [
        ...(readingData || []).map(item => item.completed_date),
        ...(quizData || []).map(item => new Date(item.completed_at).toISOString().split('T')[0])
      ];

      // Remove duplicates and sort in descending order
      const uniqueDates = Array.from(new Set(allDates)).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

      console.log('Activity dates for streak calculation:', uniqueDates);

      if (uniqueDates.length === 0) {
        setStreak(0);
        return;
      }

      // Calculate streak
      let currentStreak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < uniqueDates.length; i++) {
        const activityDate = new Date(uniqueDates[i]);
        activityDate.setHours(0, 0, 0, 0);
        
        const daysDiff = Math.floor((today.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));
        
        console.log(`Checking date ${uniqueDates[i]}, days diff: ${daysDiff}, current streak: ${currentStreak}`);
        
        if (daysDiff === currentStreak) {
          // This date is consecutive
          currentStreak++;
        } else if (daysDiff === currentStreak + 1 && currentStreak === 0) {
          // Yesterday's activity counts as start of streak
          currentStreak = 1;
        } else {
          // Gap in streak, stop counting
          break;
        }
      }

      console.log('Final calculated streak:', currentStreak);
      setStreak(currentStreak);
    } catch (error) {
      console.error('Error calculating streak:', error);
      setStreak(0);
    } finally {
      setLoading(false);
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

  const handleViewAllQuizzes = () => {
    // This will be handled by the parent component
    console.log('Navigate to quizzes tab');
  };

  const handleSelectQuiz = (quiz: any) => {
    console.log('Selected quiz from overview:', quiz);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            Welcome back, {user?.first_name}! 👋
          </CardTitle>
          <CardDescription>
            Here's your learning progress overview
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Level Progress */}
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mx-auto mb-3">
                <Star className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-lg">Level {levelInfo.currentLevel}</h3>
              <p className="text-sm text-gray-600 mb-2">{user?.points || 0} points</p>
              <Progress value={levelInfo.progressPercent} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">
                {levelInfo.pointsToNext} points to next level
              </p>
            </div>

            {/* Class Ranking */}
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mx-auto mb-3">
                <Trophy className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-lg">Class Rank</h3>
              <p className="text-2xl font-bold text-purple-600">#{classRank}</p>
              <p className="text-xs text-gray-500">in {user?.student_class}</p>
            </div>

            {/* Reading Goal */}
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-3">
                <Target className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg">Monthly Goal</h3>
              <p className="text-2xl font-bold text-green-600">{monthlyBooksRead}/5</p>
              <p className="text-xs text-gray-500">books read</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Books Reading</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentBooksCount}</div>
            <p className="text-xs text-gray-600">Currently issued</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quizzes Taken</CardTitle>
            <Trophy className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quizResultsCount}</div>
            <p className="text-xs text-gray-600">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Streak</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{streak}</div>
            <p className="text-xs text-gray-600">days active</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Your latest learning activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.type === 'book' ? 'bg-blue-500' :
                    activity.type === 'quiz' ? 'bg-green-500' : 
                    activity.type === 'reading' ? 'bg-purple-500' : 'bg-yellow-500'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                    {activity.score && (
                      <p className="text-xs text-green-600 font-medium">Score: {activity.score}%</p>
                    )}
                    {activity.points && (
                      <p className="text-xs text-yellow-600 font-medium">+{activity.points} points</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No recent activity yet</p>
                <p className="text-xs">Start reading books or taking quizzes to see your activity here!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Quiz Access */}
      <QuizOverview 
        quizzes={availableQuizzes} 
        onSelectQuiz={handleSelectQuiz} 
        onViewAll={handleViewAllQuizzes}
      />
    </div>
  );
};

export default Overview;
