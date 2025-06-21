import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { Quiz, QuizResult } from "@/types/quiz";
import { Achievement, LeaderboardEntry, ReadingChallenge, UserStats } from "@/types/rewards";
import { StudentQuiz } from "@/components/quiz/StudentQuiz";
import Achievements from "@/components/rewards/Achievements";
import Leaderboard from "@/components/rewards/Leaderboard";
import ReadingChallenges from "@/components/rewards/ReadingChallenges";
import StudentHeader from "@/components/dashboard/StudentHeader";
import StatsCards from "@/components/dashboard/StatsCards";
import CurrentBooks from "@/components/dashboard/CurrentBooks";
import ReadingHistory from "@/components/dashboard/ReadingHistory";
import AvailableQuizzes from "@/components/dashboard/AvailableQuizzes";
import QuizResults from "@/components/dashboard/QuizResults";
import PointsBreakdown from "@/components/dashboard/PointsBreakdown";
import ReadingHistoryManager from "@/components/dashboard/ReadingHistoryManager";
import StudentProfile from "@/components/dashboard/StudentProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const StudentDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
  const [currentBooks, setCurrentBooks] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<ReadingChallenge[]>([]);
  const [classRank, setClassRank] = useState<number>(1);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAuth = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        console.error('No authenticated user found:', error);
        navigate("/login");
        return;
      }

      setUser(user);
      console.log('Authenticated user:', user.id);
      
      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role, student_class, roll_number, points, is_approved')
        .eq('id', user.id)
        .maybeSingle();

      console.log('Profile query result:', { profileData, profileError });

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        toast({
          title: "Error",
          description: "Failed to load user profile. Please try logging in again.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      if (!profileData) {
        console.error('No profile found for user');
        toast({
          title: "Profile Not Found",
          description: "User profile not found. Please contact support.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      // Check if user is approved
      if (!profileData.is_approved) {
        console.log('User not approved:', profileData.is_approved);
        toast({
          title: "Account Not Approved",
          description: "Your account is pending admin approval. Please contact the administrator.",
          variant: "destructive",
        });
        await supabase.auth.signOut();
        navigate("/login");
        return;
      }

      // Check if user has student role
      if (profileData.role !== 'student') {
        console.log('User is not a student:', profileData.role);
        toast({
          title: "Access Denied",
          description: "You don't have student access to this dashboard.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      console.log('User approved and is student, setting profile:', profileData);
      setProfile(profileData);

      // Load other data
      await Promise.all([
        loadQuizzes(),
        loadQuizResults(user.id),
        loadCurrentBooks(user.id),
        loadChallenges(user.id),
        loadClassRank(profileData.student_class, profileData.points || 0),
        loadLeaderboard(profileData.student_class)
      ]);
      
      setLoading(false);
    } catch (error) {
      console.error('Auth check error:', error);
      toast({
        title: "Error",
        description: "An error occurred while loading the dashboard",
        variant: "destructive",
      });
      navigate("/login");
    }
  };

  const loadQuizzes = async () => {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading quizzes:', error);
      return;
    }

    // Transform data to match Quiz interface
    const transformedQuizzes: Quiz[] = data.map(quiz => ({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description || '',
      subject: quiz.subject,
      difficulty: quiz.difficulty as 'easy' | 'medium' | 'hard',
      questions: quiz.questions as any[],
      timeLimit: quiz.time_limit,
      pointsReward: quiz.points_reward,
      isActive: quiz.is_active || false,
      createdAt: quiz.created_at || new Date().toISOString(),
      createdBy: quiz.created_by
    }));

    setAvailableQuizzes(transformedQuizzes);
  };

  const loadQuizResults = async (userId: string) => {
    const { data, error } = await supabase
      .from('quiz_results')
      .select(`
        *,
        quizzes(title)
      `)
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (error) {
      console.error('Error loading quiz results:', error);
      return;
    }

    // Transform data to match QuizResult interface
    const transformedResults: QuizResult[] = data.map(result => ({
      quizId: result.quiz_id,
      quizTitle: result.quizzes?.title || 'Unknown Quiz',
      score: result.score,
      totalQuestions: Array.isArray(result.answers) ? result.answers.length : 0,
      correctAnswers: Math.floor((result.score / 100) * (Array.isArray(result.answers) ? result.answers.length : 0)),
      pointsEarned: result.points_earned,
      completedAt: result.completed_at || new Date().toISOString(),
      timeSpent: 0, // Default to 0 since we don't have this data yet
      answers: result.answers as number[]
    }));

    setQuizResults(transformedResults);
  };

  const loadCurrentBooks = async (userId: string) => {
    const { data, error } = await supabase
      .from('book_issues')
      .select(`
        *,
        books(title, author)
      `)
      .eq('user_id', userId)
      .eq('status', 'issued')
      .order('issue_date', { ascending: false });

    if (error) {
      console.error('Error loading current books:', error);
      return;
    }

    // Transform data
    const transformedBooks = data.map(issue => ({
      id: issue.id,
      title: issue.books?.title || 'Unknown Title',
      author: issue.books?.author || 'Unknown Author',
      issueDate: issue.issue_date,
      dueDate: issue.due_date,
      daysLeft: Math.ceil((new Date(issue.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    }));

    setCurrentBooks(transformedBooks);
  };

  const loadChallenges = async (userId: string) => {
    try {
      // Get active challenges with user progress
      const { data: challengesData, error: challengesError } = await supabase
        .from('challenges')
        .select(`
          *,
          challenge_progress(current_progress, is_completed, completed_at)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (challengesError) {
        console.error('Error loading challenges:', challengesError);
        return;
      }

      // Transform challenges data
      const transformedChallenges: ReadingChallenge[] = challengesData.map(challenge => {
        const userProgress = challenge.challenge_progress?.[0];
        
        return {
          id: challenge.id,
          title: challenge.title,
          description: challenge.description,
          targetValue: challenge.target_value,
          currentProgress: userProgress?.current_progress || 0,
          type: challenge.type as 'books_read' | 'quiz_completed' | 'points_earned',
          reward: {
            points: challenge.reward_points
          },
          deadline: challenge.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default to 30 days from now
          isCompleted: userProgress?.is_completed || false,
          completedAt: userProgress?.completed_at || undefined
        };
      });

      setChallenges(transformedChallenges);
    } catch (error) {
      console.error('Error loading challenges:', error);
    }
  };

  const loadClassRank = async (studentClass: string, userPoints: number) => {
    try {
      if (!studentClass) return;
      
      const { data: rank, error } = await supabase
        .rpc('get_user_class_rank', {
          user_class: studentClass,
          user_points: userPoints
        });

      if (error) {
        console.error('Error loading class rank:', error);
        return;
      }

      setClassRank(rank || 1);
    } catch (error) {
      console.error('Error loading class rank:', error);
    }
  };

  const loadLeaderboard = async (studentClass: string) => {
    try {
      if (!studentClass) return;

      const { data: classmates, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, student_class, points')
        .eq('student_class', studentClass)
        .eq('is_approved', true)
        .eq('role', 'student')
        .order('points', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading leaderboard:', error);
        return;
      }

      const transformedEntries: LeaderboardEntry[] = (classmates || []).map((student, index) => ({
        id: student.id,
        studentId: student.id,
        studentName: `${student.first_name} ${student.last_name}`,
        studentClass: student.student_class,
        totalPoints: student.points || 0,
        rank: index + 1,
        recentActivity: "Active in library system"
      }));

      setLeaderboardEntries(transformedEntries);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleQuizComplete = async (result: QuizResult) => {
    try {
      // Save to database
      const { error } = await supabase
        .from('quiz_results')
        .insert({
          user_id: user.id,
          quiz_id: result.quizId,
          score: result.score,
          points_earned: result.pointsEarned,
          answers: result.answers
        });

      if (error) {
        console.error('Error saving quiz result:', error);
        toast({
          title: "Error",
          description: "Failed to save quiz result",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setQuizResults(prev => [...prev, result]);
      
      // Update user points
      if (profile) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ points: (profile.points || 0) + result.pointsEarned })
          .eq('id', user.id);

        if (!updateError) {
          setProfile(prev => ({ ...prev, points: (prev.points || 0) + result.pointsEarned }));
        }
      }

      // Update challenge progress for quiz completion
      await supabase.rpc('update_challenge_progress', {
        p_user_id: user.id,
        p_challenge_type: 'quiz_completed',
        p_increment: 1
      });

      // Reload challenges to show updated progress
      await loadChallenges(user.id);

      setSelectedQuiz(null);
      
      toast({
        title: "Quiz Completed!",
        description: `You earned ${result.pointsEarned} points!`,
      });
    } catch (error) {
      console.error('Error completing quiz:', error);
      toast({
        title: "Error",
        description: "Failed to complete quiz",
        variant: "destructive",
      });
    }
  };

  const handlePointsUpdate = async () => {
    // Reload user profile to get updated points
    if (user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profileData) {
        setProfile(profileData);
      }
      
      // Reload challenges to show updated progress
      await loadChallenges(user.id);
    }
  };

  // Mock data for features not yet connected to database
  const readingHistory = [
    { title: "To Kill a Mockingbird", completedDate: "2024-06-01", rating: 5, points: 25 },
    { title: "The Science of Everything", completedDate: "2024-05-20", rating: 4, points: 20 },
    { title: "Mathematics for Class X", completedDate: "2024-05-10", rating: 3, points: 15 }
  ];

  // Calculate user stats
  const userStats: UserStats = {
    totalPoints: profile?.points || 0,
    booksRead: 8, // This would come from completed book issues
    quizzesCompleted: quizResults.length,
    averageQuizScore: quizResults.length > 0 ? 
      quizResults.reduce((total, result) => total + result.score, 0) / quizResults.length : 0,
    consecutiveDays: 5,
    achievements: [],
    currentChallenges: challenges
  };

  const userPoints = userStats.totalPoints;
  const nextLevelPoints = 200;

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (selectedQuiz) {
    return (
      <div className="min-h-screen bg-gray-50">
        <StudentHeader user={profile} onLogout={() => setSelectedQuiz(null)} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <StudentQuiz 
            quiz={selectedQuiz} 
            onComplete={handleQuizComplete}
            onBack={() => setSelectedQuiz(null)}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <StudentHeader user={profile} onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StatsCards 
          userPoints={userPoints}
          nextLevelPoints={nextLevelPoints}
          currentBooksCount={currentBooks.length}
          quizResultsCount={quizResults.length}
          classRank={classRank}
          userClass={profile.student_class || 'Unknown'}
        />

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="reading">Reading</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <CurrentBooks books={currentBooks} />
              <ReadingHistory books={readingHistory} />
            </div>
          </TabsContent>

          <TabsContent value="quizzes" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <AvailableQuizzes quizzes={availableQuizzes} onSelectQuiz={setSelectedQuiz} />
              <QuizResults results={quizResults} />
            </div>
            <PointsBreakdown quizResults={quizResults} />
          </TabsContent>

          <TabsContent value="achievements">
            <ReadingChallenges 
              challenges={challenges}
              onJoinChallenge={(challengeId) => console.log('Joining challenge:', challengeId)}
            />
          </TabsContent>

          <TabsContent value="leaderboard">
            <Leaderboard entries={leaderboardEntries} currentUserId={user?.id} />
          </TabsContent>

          <TabsContent value="reading">
            <ReadingHistoryManager onPointsUpdate={handlePointsUpdate} />
          </TabsContent>

          <TabsContent value="profile">
            <StudentProfile user={profile} onProfileUpdate={checkAuth} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default StudentDashboard;
