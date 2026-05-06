import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BookOpen, LogOut, Users, Target, Home, BookCheck, BookUp, Award,
  Brain, Trophy, Layers, BarChart3, User, Menu, X, Settings, Bell, MessageSquare
} from "lucide-react";
import Community from "@/components/community/Community";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
import NotificationSender from "@/components/admin/NotificationSender";

type Tab = "overview" | "users" | "books" | "book-requests" | "book-issues" | "points" | "quizzes" | "challenges" | "levels" | "analytics" | "notifications" | "community" | "profile";

const navSections = [
  {
    title: "Main",
    items: [
      { id: "overview" as Tab, label: "Overview", icon: Home },
      { id: "analytics" as Tab, label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Users",
    items: [
      { id: "users" as Tab, label: "User Approval", icon: Users },
      { id: "points" as Tab, label: "Award Points", icon: Award },
    ],
  },
  {
    title: "Library",
    items: [
      { id: "books" as Tab, label: "Manage Books", icon: BookOpen },
      { id: "book-requests" as Tab, label: "Book Requests", icon: BookUp },
      { id: "book-issues" as Tab, label: "Book Issues", icon: BookCheck },
    ],
  },
  {
    title: "Engagement",
    items: [
      { id: "quizzes" as Tab, label: "Quizzes", icon: Brain },
      { id: "challenges" as Tab, label: "Challenges", icon: Target },
      { id: "levels" as Tab, label: "Levels", icon: Layers },
      { id: "notifications" as Tab, label: "Notifications", icon: Bell },
    ],
  },
  {
    title: "Settings",
    items: [
      { id: "profile" as Tab, label: "My Profile", icon: User },
    ],
  },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [stats, setStats] = useState({ totalUsers: 0, totalBooks: 0, booksIssued: 0, activeQuizzes: 0 });

  useEffect(() => { checkAuth(); fetchStats(); }, []);

  const checkAuth = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { navigate('/login'); return; }
      const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
      if (error || !profile || profile.role !== 'admin') {
        toast({ title: "Access Denied", description: "You don't have permission.", variant: "destructive" });
        navigate('/'); return;
      }
      setUser(profile);
    } catch (e) { navigate('/login'); }
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const [users, books, issued, quizzes] = await Promise.all([
        supabase.rpc('get_active_users_count'), supabase.rpc('get_total_books_count'),
        supabase.rpc('get_books_issued_count'), supabase.rpc('get_active_quizzes_count'),
      ]);
      setStats({ totalUsers: users.data || 0, totalBooks: books.data || 0, booksIssued: issued.data || 0, activeQuizzes: quizzes.data || 0 });
    } catch (e) { console.error(e); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/'); };
  const handleProfileUpdate = () => checkAuth();

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4" /><p className="text-muted-foreground">Loading dashboard...</p></div>
    </div>
  );

  const statCards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "Total Books", value: stats.totalBooks, icon: BookOpen, color: "text-success", bg: "bg-success/10" },
    { label: "Books Issued", value: stats.booksIssued, icon: BookCheck, color: "text-warning", bg: "bg-warning/10" },
    { label: "Active Quizzes", value: stats.activeQuizzes, icon: Brain, color: "text-accent", bg: "bg-accent/10" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 bg-card border-r border-border flex-col fixed h-full z-40">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-md">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-foreground truncate">KV Sulur Library</h1>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          {navSections.map(section => (
            <div key={section.title}>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">{section.title}</p>
              <div className="space-y-0.5">
                {section.items.map(item => (
                  <button key={item.id} onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === item.id ? 'gradient-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                    <item.icon className="h-4 w-4 shrink-0" /> {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{user?.first_name} {user?.last_name}</p>
              <p className="text-xs text-muted-foreground">Administrator</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="p-1.5 rounded-lg hover:bg-muted">
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <span className="font-bold text-sm text-foreground">Admin Panel</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="h-4 w-4" /></Button>
        </div>
        {mobileNavOpen && (
          <div className="bg-card border-b border-border px-4 pb-3 max-h-[70vh] overflow-y-auto space-y-3">
            {navSections.map(section => (
              <div key={section.title}>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{section.title}</p>
                {section.items.map(item => (
                  <button key={item.id} onClick={() => { setActiveTab(item.id); setMobileNavOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${activeTab === item.id ? 'gradient-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
                    <item.icon className="h-4 w-4" /> {item.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">

          {/* Overview */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Dashboard Overview</h2>
                <p className="text-muted-foreground text-sm">Welcome back, {user?.first_name}!</p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((s, i) => (
                  <Card key={i} className="border-border/50 hover-lift cursor-pointer" onClick={() => setActiveTab(i === 0 ? 'users' : i === 1 ? 'books' : i === 2 ? 'book-issues' : 'quizzes')}>
                    <CardContent className="p-4 sm:p-5">
                      <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
                        <s.icon className={`h-5 w-5 ${s.color}`} />
                      </div>
                      <p className="text-2xl font-bold text-foreground">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-border/50">
                  <CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      { label: "Approve New Users", tab: "users" as Tab, icon: Users },
                      { label: "Manage Book Requests", tab: "book-requests" as Tab, icon: BookUp },
                      { label: "Create New Quiz", tab: "quizzes" as Tab, icon: Brain },
                      { label: "View Analytics", tab: "analytics" as Tab, icon: BarChart3 },
                    ].map((action, i) => (
                      <button key={i} onClick={() => setActiveTab(action.tab)}
                        className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors group">
                        <div className="flex items-center gap-3">
                          <action.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          <span className="text-sm font-medium text-foreground">{action.label}</span>
                        </div>
                        <span className="text-muted-foreground group-hover:text-primary transition-colors">→</span>
                      </button>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardHeader><CardTitle className="text-lg">System Status</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: "Database", status: "Online" },
                      { label: "Authentication", status: "Active" },
                      { label: "File Storage", status: "Connected" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <span className="text-sm text-foreground">{item.label}</span>
                        <span className="text-xs font-medium text-success flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-success" /> {item.status}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "users" && <UserApproval />}
          {activeTab === "books" && <BookManager />}
          {activeTab === "book-requests" && <BookIssueRequests />}
          {activeTab === "book-issues" && <BookIssueRegister />}
          {activeTab === "points" && <PointsManager />}
          {activeTab === "quizzes" && <QuizManager />}
          {activeTab === "challenges" && <ChallengeManager />}
          {activeTab === "levels" && <LevelManager />}
          {activeTab === "analytics" && <ClassAnalytics />}
          {activeTab === "notifications" && <NotificationSender />}
          {activeTab === "profile" && <AdminProfile user={user} onProfileUpdate={handleProfileUpdate} />}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
