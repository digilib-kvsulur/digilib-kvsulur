import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  Users, 
  Trophy, 
  BarChart3, 
  LogOut,
  Clock,
  FileText,
  UserCheck,
  Target,
  User,
  Database
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Import admin components
import BookIssueRequests from "@/components/admin/BookIssueRequests";
import QuizManager from "@/components/quiz/QuizManager";
import UserApproval from "@/components/admin/UserApproval";
import ChallengeManager from "@/components/admin/ChallengeManager";
import ClassAnalytics from "@/components/admin/ClassAnalytics";
import AdminProfile from "@/components/admin/AdminProfile";
import BookManager from "@/components/admin/BookManager";
import DataManagement from "@/components/admin/DataManagement";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBooks: 0,
    activeQuizzes: 0,
    booksIssued: 0
  });
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [recentQuizResults, setRecentQuizResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    loadDashboardData();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      navigate('/');
      return;
    }

    setUser(profile);
  };

  const loadDashboardData = async () => {
    try {
      // Load stats using database functions
      const [
        { data: totalUsers },
        { data: totalBooks },
        { data: activeQuizzes },
        { data: booksIssued }
      ] = await Promise.all([
        supabase.rpc('get_active_users_count'),
        supabase.rpc('get_total_books_count'),
        supabase.rpc('get_active_quizzes_count'),
        supabase.rpc('get_books_issued_count')
      ]);

      setStats({
        totalUsers: totalUsers || 0,
        totalBooks: totalBooks || 0,
        activeQuizzes: activeQuizzes || 0,
        booksIssued: booksIssued || 0
      });

      // Load recent book requests with proper joins - Updated to show quiz names even if inactive
      const { data: requests } = await supabase
        .from('book_requests')
        .select(`
          *,
          books (title, author),
          profiles!book_requests_user_id_fkey (first_name, last_name, admission_number)
        `)
        .order('requested_at', { ascending: false })
        .limit(5);

      setRecentRequests(requests || []);

      // Load recent quiz results with quiz names (active or inactive)
      const { data: quizResults } = await supabase
        .from('quiz_results')
        .select(`
          *,
          quizzes (title, subject, is_active),
          profiles!quiz_results_user_id_fkey (first_name, last_name, admission_number)
        `)
        .order('completed_at', { ascending: false })
        .limit(5);

      setRecentQuizResults(quizResults || []);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleProfileUpdate = () => {
    // Reload user data after profile update
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
                <p className="text-sm text-gray-600">Admin Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                Welcome, {user?.first_name} {user?.last_name}
              </span>
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Books</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalBooks}</p>
                </div>
                <BookOpen className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Quizzes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeQuizzes}</p>
                </div>
                <Trophy className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Books Issued</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.booksIssued}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Book Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Book Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{request.books?.title}</p>
                      <p className="text-sm text-gray-600">
                        by {request.profiles?.first_name} {request.profiles?.last_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {request.profiles?.admission_number}
                      </p>
                    </div>
                    <Badge 
                      variant={request.status === 'pending' ? 'default' : 
                               request.status === 'approved' ? 'default' : 'destructive'}
                      className={
                        request.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                        request.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }
                    >
                      {request.status}
                    </Badge>
                  </div>
                ))}
                {recentRequests.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No recent requests</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Quiz Results - Updated to show quiz names even if inactive */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Recent Quiz Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentQuizResults.map((result) => (
                  <div key={result.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{result.quizzes?.title || 'Unknown Quiz'}</p>
                        {!result.quizzes?.is_active && (
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {result.profiles?.first_name || 'Unknown'} {result.profiles?.last_name || 'User'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {result.profiles?.admission_number || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{result.score}%</p>
                      <p className="text-sm text-gray-600">{result.points_earned} pts</p>
                    </div>
                  </div>
                ))}
                {recentQuizResults.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No recent results</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Tabs - Updated to include Books and Data Management */}
        <Tabs defaultValue="requests" className="space-y-4">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Book Requests
            </TabsTrigger>
            <TabsTrigger value="books" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Books
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Quiz Management
            </TabsTrigger>
            <TabsTrigger value="challenges" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Challenges
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Class Analytics
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              User Approval
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Data Management
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests">
            <BookIssueRequests />
          </TabsContent>

          <TabsContent value="books">
            <BookManager />
          </TabsContent>

          <TabsContent value="quizzes">
            <QuizManager />
          </TabsContent>

          <TabsContent value="challenges">
            <ChallengeManager />
          </TabsContent>

          <TabsContent value="analytics">
            <ClassAnalytics />
          </TabsContent>

          <TabsContent value="users">
            <UserApproval />
          </TabsContent>

          <TabsContent value="data">
            <DataManagement />
          </TabsContent>

          <TabsContent value="profile">
            <AdminProfile user={user} onProfileUpdate={handleProfileUpdate} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
