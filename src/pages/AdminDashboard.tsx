
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Users, BarChart3, Settings, Trophy, UserCheck, Target, User, FileText, Calendar, Clock, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import QuizManager from "@/components/quiz/QuizManager";
import UserApproval from "@/components/admin/UserApproval";
import ChallengeManager from "@/components/admin/ChallengeManager";
import AdminProfile from "@/components/admin/AdminProfile";
import ClassAnalytics from "@/components/admin/ClassAnalytics";
import FunctionalSettings from "@/components/admin/FunctionalSettings";
import BookIssueRegister from "@/components/admin/BookIssueRegister";
import BookIssueRequests from "@/components/admin/BookIssueRequests";
import QuizParticipants from "@/components/admin/QuizParticipants";
import ChallengeParticipants from "@/components/admin/ChallengeParticipants";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Statistics {
  totalBooks: number;
  activeUsers: number;
  booksIssued: number;
  activeQuizzes: number;
}

interface RecentActivity {
  id: string;
  type: 'book_request' | 'quiz_completion' | 'book_issue' | 'user_signup';
  message: string;
  timestamp: string;
  user?: string;
}

const AdminDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    totalBooks: 0,
    activeUsers: 0,
    booksIssued: 0,
    activeQuizzes: 0
  });
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
      
      // Get user profile with admission_number
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role, is_approved, username, admission_number')
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

      // Check if user is admin
      if (profileData.role !== 'admin') {
        console.log('User is not admin:', profileData.role);
        toast({
          title: "Access Denied",
          description: "You don't have admin access to this dashboard.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      console.log('User approved and is admin, setting profile:', profileData);
      setProfile(profileData);
      
      // Load statistics and activities
      await Promise.all([loadStatistics(), loadRecentActivities()]);
      
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

  const loadStatistics = async () => {
    try {
      // Load all statistics using the database functions
      const [totalBooksResult, activeUsersResult, booksIssuedResult, activeQuizzesResult] = await Promise.all([
        supabase.rpc('get_total_books_count'),
        supabase.rpc('get_active_users_count'),
        supabase.rpc('get_books_issued_count'),
        supabase.rpc('get_active_quizzes_count')
      ]);

      console.log('Statistics results:', {
        totalBooksResult,
        activeUsersResult,
        booksIssuedResult,
        activeQuizzesResult
      });

      setStatistics({
        totalBooks: totalBooksResult.data || 0,
        activeUsers: activeUsersResult.data || 0,
        booksIssued: booksIssuedResult.data || 0,
        activeQuizzes: activeQuizzesResult.data || 0
      });
    } catch (error) {
      console.error('Error loading statistics:', error);
      toast({
        title: "Warning",
        description: "Could not load some statistics",
        variant: "destructive",
      });
    }
  };

  const loadRecentActivities = async () => {
    try {
      const activities: RecentActivity[] = [];

      // Get recent book requests
      const { data: bookRequests } = await supabase
        .from('book_requests')
        .select(`
          id,
          requested_at,
          status,
          books:book_id (title),
          profiles:user_id (first_name, last_name)
        `)
        .order('requested_at', { ascending: false })
        .limit(3);

      bookRequests?.forEach(request => {
        activities.push({
          id: `book_request_${request.id}`,
          type: 'book_request',
          message: `${request.profiles?.first_name} ${request.profiles?.last_name} requested "${request.books?.title}"`,
          timestamp: request.requested_at,
          user: `${request.profiles?.first_name} ${request.profiles?.last_name}`
        });
      });

      // Get recent quiz completions
      const { data: quizResults } = await supabase
        .from('quiz_results')
        .select(`
          id,
          completed_at,
          score,
          quizzes:quiz_id (title),
          profiles:user_id (first_name, last_name)
        `)
        .order('completed_at', { ascending: false })
        .limit(3);

      quizResults?.forEach(result => {
        activities.push({
          id: `quiz_${result.id}`,
          type: 'quiz_completion',
          message: `${result.profiles?.first_name} ${result.profiles?.last_name} completed "${result.quizzes?.title}" with ${result.score}% score`,
          timestamp: result.completed_at,
          user: `${result.profiles?.first_name} ${result.profiles?.last_name}`
        });
      });

      // Get recent user signups
      const { data: newUsers } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, created_at, is_approved')
        .order('created_at', { ascending: false })
        .limit(3);

      newUsers?.forEach(user => {
        activities.push({
          id: `user_${user.id}`,
          type: 'user_signup',
          message: `${user.first_name} ${user.last_name} ${user.is_approved ? 'joined' : 'signed up (pending approval)'}`,
          timestamp: user.created_at,
          user: `${user.first_name} ${user.last_name}`
        });
      });

      // Sort all activities by timestamp and take the most recent 5
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivities(activities.slice(0, 5));

    } catch (error) {
      console.error('Error loading recent activities:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'book_request':
        return <BookOpen className="h-4 w-4 text-blue-500" />;
      case 'quiz_completion':
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 'book_issue':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'user_signup':
        return <User className="h-4 w-4 text-purple-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-600">Library Management System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {profile?.first_name} {profile?.last_name}
              </span>
              <Button onClick={handleLogout} variant="outline">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Books</CardTitle>
              <BookOpen className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalBooks.toLocaleString()}</div>
              <p className="text-xs text-gray-600">In library collection</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.activeUsers.toLocaleString()}</div>
              <p className="text-xs text-gray-600">Approved users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Books Issued</CardTitle>
              <BarChart3 className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.booksIssued.toLocaleString()}</div>
              <p className="text-xs text-gray-600">Currently issued</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Quizzes</CardTitle>
              <Trophy className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.activeQuizzes.toLocaleString()}</div>
              <p className="text-xs text-gray-600">Available for students</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <div className="w-full overflow-x-auto">
            <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground w-max min-w-full">
              <TabsTrigger value="overview" className="whitespace-nowrap">Overview</TabsTrigger>
              <TabsTrigger value="users" className="whitespace-nowrap">User Approval</TabsTrigger>
              <TabsTrigger value="books" className="whitespace-nowrap">Books & Issues</TabsTrigger>
              <TabsTrigger value="quizzes" className="whitespace-nowrap">Quizzes & Results</TabsTrigger>
              <TabsTrigger value="challenges" className="whitespace-nowrap">Challenges & Progress</TabsTrigger>
              <TabsTrigger value="analytics" className="whitespace-nowrap">Analytics</TabsTrigger>
              <TabsTrigger value="profile" className="whitespace-nowrap">Profile</TabsTrigger>
              <TabsTrigger value="settings" className="whitespace-nowrap">Settings</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest library activities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivities.length > 0 ? (
                      recentActivities.map((activity) => (
                        <div key={activity.id} className="flex items-center gap-3">
                          {getActivityIcon(activity.type)}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{activity.message}</p>
                            <p className="text-xs text-gray-500">{formatTimeAgo(activity.timestamp)}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-gray-500 text-sm">No recent activities</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Status</CardTitle>
                  <CardDescription>Current system health and statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Database</p>
                        <p className="text-sm text-gray-600">All systems operational</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-600">✓ Active</p>
                        <p className="text-xs text-gray-500">Real-time sync</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Authentication</p>
                        <p className="text-sm text-gray-600">RLS policies active</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-600">✓ Secure</p>
                        <p className="text-xs text-gray-500">All users protected</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Library System</p>
                        <p className="text-sm text-gray-600">{statistics.totalBooks} books, {statistics.booksIssued} issued</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-600">✓ Ready</p>
                        <p className="text-xs text-gray-500">Fully operational</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UserApproval />
          </TabsContent>

          <TabsContent value="books" className="space-y-6">
            <Tabs defaultValue="manage" className="space-y-4">
              <TabsList>
                <TabsTrigger value="manage">Manage Books</TabsTrigger>
                <TabsTrigger value="issues">Book Issues</TabsTrigger>
                <TabsTrigger value="requests">Issue Requests</TabsTrigger>
              </TabsList>
              
              <TabsContent value="manage">
                <Card>
                  <CardHeader>
                    <CardTitle>Book Management</CardTitle>
                    <CardDescription>Manage your library collection</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">Book management features will be implemented in the next phase.</p>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="issues">
                <BookIssueRegister />
              </TabsContent>
              
              <TabsContent value="requests">
                <BookIssueRequests />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="quizzes" className="space-y-6">
            <Tabs defaultValue="manage" className="space-y-4">
              <TabsList>
                <TabsTrigger value="manage">Manage Quizzes</TabsTrigger>
                <TabsTrigger value="participants">Quiz Results</TabsTrigger>
              </TabsList>
              
              <TabsContent value="manage">
                <QuizManager />
              </TabsContent>
              
              <TabsContent value="participants">
                <QuizParticipants />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="challenges" className="space-y-6">
            <Tabs defaultValue="manage" className="space-y-4">
              <TabsList>
                <TabsTrigger value="manage">Manage Challenges</TabsTrigger>
                <TabsTrigger value="participants">Challenge Progress</TabsTrigger>
              </TabsList>
              
              <TabsContent value="manage">
                <ChallengeManager />
              </TabsContent>
              
              <TabsContent value="participants">
                <ChallengeParticipants />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <ClassAnalytics />
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <AdminProfile user={profile} onProfileUpdate={checkAuth} />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <FunctionalSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
