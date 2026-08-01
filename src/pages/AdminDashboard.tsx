import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/utils";
import {
  BookOpen, LogOut, Users, Target, Home, BookCheck, BookUp, Award,
  Brain, Trophy, Layers, BarChart3, User, Menu, X, Settings, Bell, MessageSquare, FileText,
  Calendar, RefreshCw, Star, AlertTriangle
} from "lucide-react";
import Community from "@/components/community/Community";
import StudyMaterialsManager from "@/components/admin/StudyMaterialsManager";
import NotificationBell from "@/components/dashboard/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import UserApproval from "@/components/admin/UserApproval";
import BookManager from "@/components/admin/BookManager";
import BookIssueRegister from "@/components/admin/BookIssueRegister";
import BookIssueRequests from "@/components/admin/BookIssueRequests";
import PointsManager from "@/components/admin/PointsManager";
import QuizManager from "@/components/quiz/QuizManager";
import BadgeManager from "@/components/admin/BadgeManager";
import WishlistView from "@/components/admin/WishlistView";
import AdminProfile from "@/components/admin/AdminProfile";
import ClassAnalytics from "@/components/admin/ClassAnalytics";
import LevelManager from "@/components/admin/LevelManager";
import NotificationSender from "@/components/admin/NotificationSender";
import EventsManager from "@/components/admin/EventsManager";
import RenewalRequests from "@/components/admin/RenewalRequests";
import ReviewsModeration from "@/components/admin/ReviewsModeration";
import OverdueList from "@/components/admin/OverdueList";
import CirculationDashboard from "@/components/admin/CirculationDashboard";
import InventoryAuditManager from "@/components/admin/InventoryAuditManager";
import ExportReports from "@/components/admin/ExportReports";
import GalleryManager from "@/components/admin/GalleryManager";
import BookShelfData from "@/components/admin/BookShelfData";
import BookCondemnation from "@/components/admin/BookCondemnation";
import { FileSpreadsheet, ClipboardList, RefreshCcw as LibraryIcon, Image as ImageIcon, HardDriveDownload, ShieldAlert } from "lucide-react";

type Tab = "overview" | "users" | "books" | "book-requests" | "book-issues" | "overdue" | "renewals" | "reviews" | "points" | "quizzes" | "badges" | "wishlist" | "levels" | "events" | "analytics" | "notifications" | "community" | "materials" | "profile" | "circulation" | "audit" | "reports" | "gallery" | "shelf-data" | "condemnation";

const navSections = [
  {
    title: "Main",
    items: [
      { id: "overview" as Tab, label: "Overview", icon: Home },
      { id: "analytics" as Tab, label: "Analytics", icon: BarChart3 },
      { id: "reports" as Tab, label: "Export Reports", icon: FileSpreadsheet },
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
      { id: "circulation" as Tab, label: "Circulation", icon: LibraryIcon },
      { id: "audit" as Tab, label: "Inventory Audit", icon: ClipboardList },
      { id: "book-requests" as Tab, label: "Book Requests", icon: BookUp },
      { id: "book-issues" as Tab, label: "Book Issues", icon: BookCheck },
      { id: "overdue" as Tab, label: "Overdue", icon: AlertTriangle },
      { id: "condemnation" as Tab, label: "Condemnation", icon: ShieldAlert },
      { id: "shelf-data" as Tab, label: "Shelf Data", icon: HardDriveDownload },
      { id: "renewals" as Tab, label: "Renewals", icon: RefreshCw },
      { id: "reviews" as Tab, label: "Reviews", icon: Star },
      { id: "materials" as Tab, label: "Study Materials", icon: FileText },
      { id: "wishlist" as Tab, label: "Wishlists", icon: Star },
    ],
  },
  {
    title: "Engagement",
    items: [
      { id: "quizzes" as Tab, label: "Quizzes", icon: Brain },
      { id: "badges" as Tab, label: "Badges", icon: Award },
      { id: "events" as Tab, label: "Events", icon: Calendar },
      { id: "gallery" as Tab, label: "Gallery", icon: ImageIcon },
      { id: "levels" as Tab, label: "Levels", icon: Layers },
      { id: "notifications" as Tab, label: "Notifications", icon: Bell },
      { id: "community" as Tab, label: "Community", icon: MessageSquare },
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
            <div className="flex items-center -space-x-2 shrink-0">
              <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm z-10" title="PM SHRI Logo">
                <img src="/logos/pm-shri.png" alt="PM SHRI" className="w-full h-full object-contain p-1" />
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm z-20" title="KV Logo">
                <img src="/logos/kv.png" alt="KV" className="w-full h-full object-contain p-1" />
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-foreground truncate">PM SHRI KV SULUR</h1>
              <p className="text-xs text-muted-foreground">DLMS - Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
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

        <div className="shrink-0 p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-9 w-9 border border-border">
              {user?.avatar_url && <AvatarImage src={getAvatarUrl(user.avatar_url)} className="object-cover" />}
              <AvatarFallback className="gradient-primary text-primary-foreground font-bold text-sm">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
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
          <div className="flex items-center gap-1">
            <NotificationBell />
            <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="h-4 w-4" /></Button>
          </div>
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
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Dashboard Overview</h2>
                  <p className="text-muted-foreground text-sm">Welcome back, {user?.first_name}!</p>
                </div>
                <div className="hidden lg:block"><NotificationBell /></div>
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
          {activeTab === "circulation" && <CirculationDashboard />}
          {activeTab === "audit" && <InventoryAuditManager />}
          {activeTab === "reports" && <ExportReports />}
          {activeTab === "book-requests" && <BookIssueRequests />}
          {activeTab === "book-issues" && <BookIssueRegister />}
          {activeTab === "overdue" && <OverdueList />}
          {activeTab === "condemnation" && <BookCondemnation />}
          {activeTab === "shelf-data" && <BookShelfData />}
          {activeTab === "renewals" && <RenewalRequests />}
          {activeTab === "reviews" && <ReviewsModeration />}
          {activeTab === "events" && <EventsManager />}
          {activeTab === "gallery" && <GalleryManager />}
          {activeTab === "points" && <PointsManager />}
          {activeTab === "quizzes" && <QuizManager />}
          {activeTab === "badges" && <BadgeManager />}
          {activeTab === "wishlist" && <WishlistView />}
          {activeTab === "levels" && <LevelManager />}
          {activeTab === "analytics" && <ClassAnalytics />}
          {activeTab === "notifications" && <NotificationSender />}
          {activeTab === "community" && user?.id && <Community currentUserId={user.id} isAdmin={true} />}
          {activeTab === "materials" && <StudyMaterialsManager />}
          {activeTab === "profile" && <AdminProfile user={user} onProfileUpdate={handleProfileUpdate} />}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
