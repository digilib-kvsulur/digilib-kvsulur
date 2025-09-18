import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BookOpen, LogOut, Trophy, Target, User, Users, BookPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Import components
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
  const {
    toast
  } = useToast();
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
  const [previousLevel, setPreviousLevel] = useState<number | null>(null);
  const [levelUpBanner, setLevelUpBanner] = useState<any>(null);
  useEffect(() => {
    checkAuth();
  }, []);
  const checkAuth = async () => {
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }

      // Get user profile
      const {
        data: profile,
        error
      } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (error || !profile) {
        console.error('Profile error:', error);
        navigate('/login');
        return;
      }
      if (!profile.is_approved) {
        toast({
          title: "Account Pending",
          description: "Your account is pending admin approval.",
          variant: "destructive"
        });
        navigate('/login');
        return;
      }

      // Set current level for level up tracking
      if (profile.points !== null) {
        try {
          const {
            data: levelData
          } = await supabase.rpc('get_user_level', {
            user_points: profile.points
          });
          if (levelData && levelData.length > 0) {
            setPreviousLevel(levelData[0].level_number);
          }
        } catch (error) {
          console.error('Error getting current level:', error);
        }
      }
      setUser(profile);

      // Calculate class rank using proper database function
      if (profile.student_class && profile.points !== null) {
        try {
          const {
            data: rankData,
            error: rankError
          } = await supabase.rpc('get_user_class_rank', {
            user_class: profile.student_class,
            user_points: profile.points || 0
          });
          if (!rankError && rankData !== null) {
            setClassRank(rankData);
          } else {
            console.error('Error getting class rank:', rankError);
            setClassRank("N/A");
          }
        } catch (error) {
          console.error('Error calculating class rank:', error);
          setClassRank("N/A");
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle level up detection
  const checkLevelUp = async (newPoints: number) => {
    if (!user?.id || previousLevel === null) return;
    try {
      const {
        data: newLevelData
      } = await supabase.rpc('get_user_level', {
        user_points: newPoints
      });
      if (newLevelData && newLevelData.length > 0) {
        const newLevel = newLevelData[0].level_number;
        if (newLevel > previousLevel) {
          setLevelUpBanner({
            level_number: newLevel,
            name: newLevelData[0].name,
            icon_name: newLevelData[0].icon_name,
            color: newLevelData[0].color
          });
        }
        setPreviousLevel(newLevel);
      }
    } catch (error) {
      console.error('Error checking level up:', error);
    }
  };

  // Track level changes when user points change
  useEffect(() => {
    if (user?.points && previousLevel !== null) {
      checkLevelUp(user.points);
    }
  }, [user?.points, previousLevel]);
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive"
      });
    }
  };
  const handleProfileUpdate = () => {
    checkAuth(); // Refresh user data after profile update
  };
  const handleQuizComplete = async (result: {
    score: number;
    pointsEarned: number;
  }) => {
    // Award points and refresh user data
    await Promise.all([checkAuth(),
    // This will refresh user points and check for level up
    fetchQuizResults(), fetchChallenges()]);
    toast({
      title: "Quiz Completed!",
      description: `You scored ${result.score}% and earned ${result.pointsEarned} points!`
    });
    setSelectedQuiz(null);
  };
  const fetchCurrentBooks = async () => {
    if (!user?.id) return;
    try {
      const {
        data,
        error
      } = await supabase.from('book_issues').select(`
          *,
          books (
            title,
            author,
            isbn,
            category,
            description,
            cover_url
          )
        `).eq('user_id', user.id).eq('status', 'issued');
      if (error) throw error;
      setCurrentBooks(data || []);
      setCurrentBooksCount(data?.length || 0);
    } catch (error) {
      console.error('Error fetching current books:', error);
    }
  };
  const fetchQuizResults = async () => {
    if (!user?.id) return;
    try {
      const {
        data,
        error
      } = await supabase.from('quiz_results').select(`
          *,
          quizzes (
            title,
            description,
            subject,
            difficulty
          )
        `).eq('user_id', user.id).order('completed_at', {
        ascending: false
      });
      if (error) throw error;
      setQuizResults(data || []);
      setQuizResultsCount(data?.length || 0);
    } catch (error) {
      console.error('Error fetching quiz results:', error);
    }
  };
  const fetchAvailableQuizzes = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('quizzes').select('*').eq('is_active', true).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      const formattedQuizzes = data?.map(quiz => ({
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
  const fetchChallenges = async () => {
    try {
      const {
        data: challengeData,
        error: challengeError
      } = await supabase.from('challenges').select('*').eq('is_active', true).order('created_at', {
        ascending: false
      });
      if (challengeError) throw challengeError;
      if (!challengeData || challengeData.length === 0) {
        setChallenges([]);
        return;
      }

      // Get user's progress for these challenges
      const challengeIds = challengeData.map(c => c.id);
      const {
        data: progressData,
        error: progressError
      } = await supabase.from('challenge_progress').select('*').eq('user_id', user?.id).in('challenge_id', challengeIds);
      if (progressError) {
        console.error('Error fetching progress:', progressError);
      }

      // Combine challenge data with progress
      const formattedChallenges = challengeData.map(challenge => {
        const userProgress = progressData?.find(p => p.challenge_id === challenge.id);
        return {
          id: challenge.id,
          title: challenge.title,
          description: challenge.description,
          targetValue: challenge.target_value,
          currentProgress: userProgress?.current_progress || 0,
          type: challenge.type,
          reward: {
            points: challenge.reward_points,
            badge: undefined
          },
          deadline: challenge.deadline,
          isCompleted: userProgress?.is_completed || false,
          completedAt: userProgress?.completed_at,
          isClaimed: userProgress?.is_claimed || false
        };
      });
      setChallenges(formattedChallenges);
    } catch (error) {
      console.error('Error fetching challenges:', error);
      setChallenges([]);
    }
  };
  const handleJoinChallenge = (challengeId: string) => {
    console.log("Joining challenge:", challengeId);
    // The challenge joining is automatic when user performs actions
  };
  const handleClaimReward = async (challengeId: string) => {
    try {
      const {
        error
      } = await supabase.from('challenge_progress').update({
        is_claimed: true
      }).eq('challenge_id', challengeId).eq('user_id', user?.id);
      if (error) throw error;
      toast({
        title: "Reward Claimed!",
        description: "Your challenge reward has been added to your account."
      });

      // Refresh data
      await Promise.all([checkAuth(),
      // This will update user points
      fetchChallenges()]);
    } catch (error) {
      console.error('Error claiming reward:', error);
      toast({
        title: "Error",
        description: "Failed to claim reward. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Fetch all data when user is loaded
  useEffect(() => {
    if (user?.id) {
      fetchCurrentBooks();
      fetchQuizResults();
      fetchAvailableQuizzes();
      fetchChallenges();
    }
  }, [user?.id]);

  // Level information for display
  const levelInfo = {
    currentLevel: Math.floor((user?.points || 0) / 100) + 1,
    pointsToNext: 100 - (user?.points || 0) % 100,
    progressPercent: (user?.points || 0) % 100
  };
  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>;
  }
  if (!user) {
    return null;
  }

  // Show selected quiz if one is selected
  if (selectedQuiz) {
    return <StudentQuiz quiz={selectedQuiz} onComplete={handleQuizComplete} onBack={() => setSelectedQuiz(null)} />;
  }
  return <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-8 w-8 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">
                  PM SHRI KV Sulur Digital Library
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {user?.role} • Class {user?.student_class}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-zinc-50">
        {/* Level Up Banner */}
        {levelUpBanner && <LevelUpBanner newLevel={levelUpBanner} onClose={() => setLevelUpBanner(null)} />}

        {/* Main Tabs - Navigation at top */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6 mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="books">My Books</TabsTrigger>
            <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
            <TabsTrigger value="challenges">Challenges</TabsTrigger>
            <TabsTrigger value="rankings">Rankings</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Overview 
              user={user} 
              currentBooksCount={currentBooksCount} 
              quizResultsCount={quizResultsCount} 
              classRank={classRank} 
              levelInfo={levelInfo}
              userPoints={user?.points || 0}
            />
          </TabsContent>

          <TabsContent value="books">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Currently Borrowed Books
                  </CardTitle>
                  <CardDescription>Books you have checked out from the library</CardDescription>
                </CardHeader>
                <CardContent>
                  <CurrentBooks books={currentBooks} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Request Section</CardTitle>
                  <CardDescription>Your request will be surely processed by us.</CardDescription>
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

              <Card>
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Reading Challenges & Rewards
                </CardTitle>
                <CardDescription>Join challenges to earn extra points and rewards</CardDescription>
              </CardHeader>
              <CardContent>
                <ReadingChallenges 
                  challenges={challenges} 
                  onJoinChallenge={handleJoinChallenge} 
                  onClaimReward={handleClaimReward} 
                />
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

      {/* Book Request Dialog */}
      {showBookRequest && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <BookRequestForm onClose={() => setShowBookRequest(false)} onSuccess={() => setShowBookRequest(false)} />
          </div>
        </div>}
    </div>;
};
export default StudentDashboard;