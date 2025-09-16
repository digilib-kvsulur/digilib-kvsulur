import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BookOpen, LogOut, Users, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Import components
import UserApproval from "@/components/admin/UserApproval";
import BookManager from "@/components/admin/BookManager";
import BookIssueRegister from "@/components/admin/BookIssueRegister";
import BookIssueRequests from "@/components/admin/BookIssueRequests";
import PointsManager from "@/components/admin/PointsManager";
import QuizManager from "@/components/quiz/QuizManager";
import ChallengeManager from "@/components/admin/ChallengeManager";
import AdminProfile from "@/components/admin/AdminProfile";
import ClassAnalytics from "@/components/admin/ClassAnalytics";
import LevelManager from "@/components/admin/LevelManager";
const AdminDashboard = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBooks: 0,
    booksIssued: 0,
    activeQuizzes: 0
  });
  useEffect(() => {
    checkAuth();
    fetchStats();
  }, []);
  const checkAuth = async () => {
    try {
      const {
        data: {
          user: authUser
        }
      } = await supabase.auth.getUser();
      if (!authUser) {
        navigate('/login');
        return;
      }
      const {
        data: profile,
        error
      } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
      if (error) {
        console.error('Error fetching profile:', error);
        navigate('/login');
        return;
      }
      if (!profile || profile.role !== 'admin') {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page.",
          variant: "destructive"
        });
        navigate('/');
        return;
      }
      setUser(profile);
    } catch (error) {
      console.error('Authentication error:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };
  const fetchStats = async () => {
    try {
      const [users, books, issued, quizzes] = await Promise.all([supabase.rpc('get_active_users_count'), supabase.rpc('get_total_books_count'), supabase.rpc('get_books_issued_count'), supabase.rpc('get_active_quizzes_count')]);
      setStats({
        totalUsers: users.data || 0,
        totalBooks: books.data || 0,
        booksIssued: issued.data || 0,
        activeQuizzes: quizzes.data || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
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
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">PM SHRI KV AFS SULUR - LIBRARY</h1>
                <p className="text-sm text-gray-600">Admin Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-gray-600">Administrator</p>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Books</p>
                  <p className="text-2xl font-bold">{stats.totalBooks}</p>
                </div>
                <BookOpen className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Books Issued</p>
                  <p className="text-2xl font-bold">{stats.booksIssued}</p>
                </div>
                <BookOpen className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Quizzes</p>
                  <p className="text-2xl font-bold">{stats.activeQuizzes}</p>
                </div>
                <Target className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Navigation Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <div className="overflow-x-auto">
            <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground min-w-full">
              <TabsTrigger value="overview" className="whitespace-nowrap">Overview</TabsTrigger>
              <TabsTrigger value="users" className="whitespace-nowrap">Users</TabsTrigger>
              <TabsTrigger value="books" className="whitespace-nowrap">Books</TabsTrigger>
              <TabsTrigger value="book-requests" className="whitespace-nowrap">Book Requests</TabsTrigger>
              <TabsTrigger value="book-issues" className="whitespace-nowrap">Book Issues</TabsTrigger>
              <TabsTrigger value="points" className="whitespace-nowrap">Award Points</TabsTrigger>
              <TabsTrigger value="quizzes" className="whitespace-nowrap">Quizzes</TabsTrigger>
              <TabsTrigger value="challenges" className="whitespace-nowrap">Challenges</TabsTrigger>
              <TabsTrigger value="levels" className="whitespace-nowrap">Levels</TabsTrigger>
              <TabsTrigger value="analytics" className="whitespace-nowrap">Analytics</TabsTrigger>
              <TabsTrigger value="profile" className="whitespace-nowrap">Profile</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest system activities</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Activity feed will appear here</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>System Status</CardTitle>
                  <CardDescription>Current system health</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Database</span>
                      <span className="text-green-600">✓ Online</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Authentication</span>
                      <span className="text-green-600">✓ Active</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <UserApproval />
          </TabsContent>

          <TabsContent value="books">
            <BookManager />
          </TabsContent>

          <TabsContent value="book-requests">
            <BookIssueRequests />
          </TabsContent>

          <TabsContent value="book-issues">
            <BookIssueRegister />
          </TabsContent>

          <TabsContent value="points">
            <PointsManager />
          </TabsContent>

          <TabsContent value="quizzes">
            <QuizManager />
          </TabsContent>

          <TabsContent value="challenges">
            <ChallengeManager />
          </TabsContent>

          <TabsContent value="levels">
            <LevelManager />
          </TabsContent>

          <TabsContent value="analytics">
            <ClassAnalytics />
          </TabsContent>

          <TabsContent value="profile">
            <AdminProfile user={user} onProfileUpdate={handleProfileUpdate} />
          </TabsContent>
        </Tabs>
      </main>
    </div>;
};
export default AdminDashboard;