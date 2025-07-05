
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BookOpen, LogOut, Trophy, Target, User, Users, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Import components
import StatsCards from "@/components/dashboard/StatsCards";
import CurrentBooks from "@/components/dashboard/CurrentBooks";
import AvailableQuizzes from "@/components/dashboard/AvailableQuizzes";
import QuizResults from "@/components/dashboard/QuizResults";
import ReadingChallenges from "@/components/rewards/ReadingChallenges";
import Achievements from "@/components/rewards/Achievements";
import Leaderboard from "@/components/rewards/Leaderboard";
import SchoolLeaderboard from "@/components/rewards/SchoolLeaderboard";
import StudentProfile from "@/components/dashboard/StudentProfile";
import BookRequestForm from "@/components/BookRequestForm";
import ReadingHistoryManager from "@/components/dashboard/ReadingHistoryManager";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showBookRequest, setShowBookRequest] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

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

      setUser(profile);
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
                <p className="text-xs text-gray-600">
                  {user?.points || 0} points • Class {user?.student_class}
                </p>
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
          <StatsCards userId={user?.id} />
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
                  <BookOpen className="h-4 w-4 mr-2" />
                  Request a Book
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="books" className="space-y-4">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="books">My Books</TabsTrigger>
            <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
            <TabsTrigger value="results">Quiz Results</TabsTrigger>
            <TabsTrigger value="challenges">Challenges</TabsTrigger>
            <TabsTrigger value="leaderboard">Class Rank</TabsTrigger>
            <TabsTrigger value="school-leaderboard">School Rank</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="books" className="space-y-6">
            <CurrentBooks userId={user?.id} />
            <ReadingHistoryManager userId={user?.id} />
          </TabsContent>

          <TabsContent value="quizzes">
            <AvailableQuizzes userId={user?.id} />
          </TabsContent>

          <TabsContent value="results">
            <QuizResults userId={user?.id} />
          </TabsContent>

          <TabsContent value="challenges" className="space-y-6">
            <ReadingChallenges userId={user?.id} />
            <Achievements userId={user?.id} />
          </TabsContent>

          <TabsContent value="leaderboard">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Class Leaderboard - {user?.student_class}
                </CardTitle>
                <CardDescription>Your ranking within your class</CardDescription>
              </CardHeader>
              <CardContent>
                <Leaderboard entries={[]} currentUserId={user?.id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="school-leaderboard">
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
