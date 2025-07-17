import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BookOpen, LogOut, Trophy, Target, User, Users, Award, BookPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import UserLevel from "@/components/UserLevel";

// Import components
import Overview from "@/components/dashboard/Overview";
import StatsCards from "@/components/dashboard/StatsCards";
import CurrentBooks from "@/components/dashboard/CurrentBooks";
import QuizPage from "@/components/dashboard/QuizPage";
import ReadingChallenges from "@/components/rewards/ReadingChallenges";
import Achievements from "@/components/rewards/Achievements";
import Leaderboard from "@/components/rewards/Leaderboard";
import SchoolLeaderboard from "@/components/rewards/SchoolLeaderboard";
import StudentProfile from "@/components/dashboard/StudentProfile";
import BookRequestForm from "@/components/BookRequestForm";
import ReadingHistoryManager from "@/components/dashboard/ReadingHistoryManager";
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
  
  // New state for real data
  const [currentBooks, setCurrentBooks] = useState<any[]>([]);
  const [availableQuizzes, setAvailableQuizzes] = useState<any[]>([]);
  const [quizResults, setQuizResults] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [classLeaderboardEntries, setClassLeaderboardEntries] = useState<any[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user?.id]);

  const fetchDashboardData = async () => {
    try {
      await Promise.all([
        fetchCurrentBooks(),
        fetchAvailableQuizzes(),
        fetchQuizResults(),
        fetchChallenges(),
        fetchClassLeaderboard()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const fetchCurrentBooks = async () => {
    try {
      const { data: bookIssues, error } = await supabase
        .from('book_issues')
        .select(`
          *,
          books (title, author)
        `)
        .eq('user_id', user.id)
        .eq('status', 'issued');

      if (error) throw error;

      const formattedBooks = bookIssues?.map(issue => ({
        id: issue.id,
        title: issue.books?.title || 'Unknown Title',
        author: issue.books?.author || 'Unknown Author',
        issueDate: issue.issue_date,
        dueDate: issue.due_date,
        daysLeft: Math.ceil((new Date(issue.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      })) || [];

      setCurrentBooks(formattedBooks);
      setCurrentBooksCount(formattedBooks.length);
    } catch (error) {
      console.error('Error fetching current books:', error);
    }
  };

  const fetchAvailableQuizzes = async () => {
    try {
      const { data: quizzes, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);

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

  const fetchQuizResults = async () => {
    try {
      const { data: results, error } = await supabase
        .from('quiz_results')
        .select(`
          *,
          quizzes (title)
        `)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const formattedResults = results?.map(result => ({
        id: result.id,
        quizTitle: result.quizzes?.title || 'Unknown Quiz',
        score: result.score,
        pointsEarned: result.points_earned,
        completedAt: result.completed_at,
        correctAnswers: Math.round((result.score / 100) * (Array.isArray(result.answers) ? result.answers.length : 10)),
        totalQuestions: Array.isArray(result.answers) ? result.answers.length : 10
      })) || [];

      setQuizResults(formattedResults);
      
      // Count current month results
      const currentMonth = new Date();
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const monthlyResults = results?.filter(result => 
        new Date(result.completed_at) >= startOfMonth
      ) || [];
      setQuizResultsCount(monthlyResults.length);
    } catch (error) {
      console.error('Error fetching quiz results:', error);
    }
  };

  const fetchChallenges = async () => {
    try {
      console.log('Fetching challenges for user:', user.id);
      
      // First get all active challenges
      const { data: challengesData, error: challengesError } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true);

      if (challengesError) {
        console.error('Error fetching challenges:', challengesError);
        return;
      }

      console.log('Active challenges:', challengesData);

      // Then get user's progress for these challenges
      const challengeIds = challengesData?.map(c => c.id) || [];
      
      let progressData = [];
      if (challengeIds.length > 0) {
        const { data: progress, error: progressError } = await supabase
          .from('challenge_progress')
          .select('*')
          .eq('user_id', user.id)
          .in('challenge_id', challengeIds);

        if (progressError) {
          console.error('Error fetching challenge progress:', progressError);
        } else {
          progressData = progress || [];
        }
      }

      console.log('User challenge progress:', progressData);

      // Combine challenges with progress
      const formattedChallenges = challengesData?.map(challenge => {
        const userProgress = progressData.find(p => p.challenge_id === challenge.id);
        
        return {
          id: challenge.id,
          title: challenge.title,
          description: challenge.description,
          type: challenge.type,
          targetValue: challenge.target_value,
          rewardPoints: challenge.reward_points,
          deadline: challenge.deadline,
          progress: userProgress?.current_progress || 0,
          isCompleted: userProgress?.is_completed || false,
          completedAt: userProgress?.completed_at
        };
      }) || [];

      console.log('Formatted challenges:', formattedChallenges);
      setChallenges(formattedChallenges);
    } catch (error) {
      console.error('Error fetching challenges:', error);
    }
  };

  const fetchClassLeaderboard = async () => {
    try {
      if (!user?.student_class) {
        console.log('No student class found for user');
        return;
      }

      console.log('Fetching class leaderboard for class:', user.student_class);

      const { data: classmates, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, points, admission_number, student_class')
        .eq('student_class', user.student_class)
        .eq('is_approved', true)
        .eq('role', 'student')
        .not('points', 'is', null)
        .order('points', { ascending: false })
        .order('first_name', { ascending: true });

      if (error) {
        console.error('Error fetching class leaderboard:', error);
        return;
      }

      console.log('Class leaderboard raw data:', classmates);

      // Filter valid students and add proper ranking
      const validStudents = (classmates || []).filter(student => 
        student.points !== null && 
        student.points !== undefined &&
        student.first_name &&
        student.last_name
      );

      const formattedEntries = [];
      let currentRank = 1;
      
      validStudents.forEach((student, index) => {
        // If this student has different points than previous, update rank
        if (index > 0 && student.points !== validStudents[index - 1].points) {
          currentRank = index + 1;
        }
        
        formattedEntries.push({
          id: student.id,
          studentId: student.id,
          studentName: `${student.first_name} ${student.last_name}`,
          studentClass: student.student_class,
          totalPoints: student.points || 0,
          rank: currentRank,
          recentActivity: student.points > 0 ? 'Active this week' : 'Getting started',
          admissionNumber: student.admission_number
        });
      });

      console.log('Formatted class leaderboard entries:', formattedEntries);
      setClassLeaderboardEntries(formattedEntries);
    } catch (error) {
      console.error('Error fetching class leaderboard:', error);
    }
  };

  const checkAuth = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        navigate('/login');
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        navigate('/login');
        return;
      }

      if (!profile || profile.role !== 'student') {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      if (!profile.is_approved) {
        toast({
          title: "Account Pending",
          description: "Your account is pending approval from an administrator.",
          variant: "destructive",
        });
      }

      console.log('User profile loaded:', profile);
      setUser(profile);
      
      // Calculate class rank using proper database function
      if (profile.student_class && profile.points !== null) {
        try {
          console.log('Calculating class rank for class:', profile.student_class, 'points:', profile.points);
          
          const { data: rankData, error: rankError } = await supabase
            .rpc('get_user_class_rank', {
              user_class: profile.student_class,
              user_points: profile.points || 0
            });

          console.log('Class rank result from RPC:', rankData);
          if (!rankError && rankData !== null) {
            setClassRank(rankData);
          } else {
            console.error('Error getting class rank:', rankError);
            // Fallback: calculate manually
            const { data: classmatesCount, error: countError } = await supabase
              .from('profiles')
              .select('points')
              .eq('student_class', profile.student_class)
              .eq('is_approved', true)
              .eq('role', 'student')
              .gt('points', profile.points || 0);
            
            if (!countError) {
              setClassRank((classmatesCount?.length || 0) + 1);
            } else {
              setClassRank("N/A");
            }
          }
        } catch (error) {
          console.error('Error fetching class rank:', error);
          setClassRank("N/A");
        }
      }
    } catch (error) {
      console.error('Authentication error:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleProfileUpdate = () => {
    checkAuth();
    fetchDashboardData();
  };

  const handleSelectQuiz = (quiz: any) => {
    console.log('Selected quiz for taking:', quiz);
    setSelectedQuiz(quiz);
  };

  const handleQuizComplete = async (result: any) => {
    console.log('Quiz completed with result:', result);
    setSelectedQuiz(null);
    
    // Refresh all data after quiz completion
    await Promise.all([
      fetchQuizResults(),
      checkAuth(), // This will refresh user points and class rank
      fetchChallenges(), // Refresh challenges as quiz completion might update progress
      fetchClassLeaderboard() // Refresh leaderboard
    ]);
    
    toast({
      title: "Quiz Completed!",
      description: `You scored ${result.score}% and earned ${result.pointsEarned} points!`,
    });
  };

  const handleBackFromQuiz = () => {
    setSelectedQuiz(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user?.is_approved) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Account Pending Approval</CardTitle>
            <CardDescription>
              Your account is waiting for administrator approval. Please wait for an admin to approve your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleLogout} variant="outline" className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show quiz taking interface when a quiz is selected
  if (selectedQuiz) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Digital Library</h1>
                  <p className="text-sm text-gray-600">Quiz - {selectedQuiz.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <UserLevel userPoints={user?.points || 0} showDetails={false} />
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <StudentQuiz 
            quiz={selectedQuiz}
            onComplete={handleQuizComplete}
            onBack={handleBackFromQuiz}
          />
        </main>
      </div>
    );
  }

  const levelInfo = {
    currentLevel: Math.floor((user?.points || 0) / 100) + 1,
    pointsToNext: 100 - ((user?.points || 0) % 100),
    progressPercent: ((user?.points || 0) % 100)
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Digital Library</h1>
                <p className="text-sm text-gray-600">Student Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user?.first_name} {user?.last_name}
                </p>
                <UserLevel userPoints={user?.points || 0} showDetails={false} />
              </div>
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="mb-8">
          <StatsCards 
            userPoints={user?.points || 0}
            nextLevelPoints={100}
            currentBooksCount={currentBooksCount}
            quizResultsCount={quizResultsCount}
            classRank={classRank}
            userClass={user?.student_class || ""}
            levelInfo={levelInfo}
          />
        </div>

        {/* User Level Card */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Your Progress</CardTitle>
              <CardDescription>Track your reading level and achievements</CardDescription>
            </CardHeader>
            <CardContent>
              <UserLevel userPoints={user?.points || 0} showDetails={true} />
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 flex-wrap">
                <Button onClick={() => setShowBookRequest(true)}>
                  <BookPlus className="h-4 w-4 mr-2" />
                  Request New Book for Library
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="books">My Books</TabsTrigger>
            <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
            <TabsTrigger value="challenges">Challenges</TabsTrigger>
            <TabsTrigger value="class-rank">Class Rank</TabsTrigger>
            <TabsTrigger value="school-rank">School Rank</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Overview 
              user={user}
              currentBooksCount={currentBooksCount}
              quizResultsCount={quizResultsCount}
              classRank={classRank}
              levelInfo={levelInfo}
            />
          </TabsContent>

          <TabsContent value="books" className="space-y-6">
            <CurrentBooks books={currentBooks} />
            <ReadingHistoryManager />
          </TabsContent>

          <TabsContent value="quizzes">
            <QuizPage 
              quizzes={availableQuizzes} 
              results={quizResults} 
              onSelectQuiz={handleSelectQuiz} 
            />
          </TabsContent>

          <TabsContent value="challenges" className="space-y-6">
            <ReadingChallenges challenges={challenges} />
            <Achievements achievements={[]} userStats={{
              totalPoints: user?.points || 0,
              booksRead: 0,
              quizzesCompleted: quizResults.length,
              averageQuizScore: quizResults.length > 0 
                ? Math.round(quizResults.reduce((sum, result) => sum + result.score, 0) / quizResults.length)
                : 0
            }} />
          </TabsContent>

          <TabsContent value="class-rank">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Class Leaderboard - {user?.student_class}
                </CardTitle>
                <CardDescription>Your ranking within your class</CardDescription>
              </CardHeader>
              <CardContent>
                <Leaderboard entries={classLeaderboardEntries} currentUserId={user?.id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="school-rank">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  School Leaderboard
                </CardTitle>
                <CardDescription>Your ranking across the entire school</CardDescription>
              </CardHeader>
              <CardContent>
                <SchoolLeaderboard currentUserId={user?.id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <StudentProfile user={user} onProfileUpdate={handleProfileUpdate} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Book Request Dialog */}
      {showBookRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <BookRequestForm 
              onClose={() => setShowBookRequest(false)}
              onSuccess={() => setShowBookRequest(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
