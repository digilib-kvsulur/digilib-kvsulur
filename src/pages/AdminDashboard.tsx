import { lazy, Suspense, useState, useEffect } from "react";
import { loadingManager } from "@/lib/loadingManager";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/utils";
import {
  BookOpen, LogOut, Users, Target, Home, BookCheck, BookUp, Award,
  Brain, Trophy, Layers, BarChart3, User, Menu, X, Settings, Bell, MessageSquare, FileText,
  Calendar, RefreshCw, Star, AlertTriangle, Barcode, HardDrive, Server,
  Gamepad2, AlertCircle, FileSpreadsheet, LifeBuoy, Library as LibraryIcon,
  ClipboardList, IndianRupee, ShieldAlert, HardDriveDownload, Image as ImageIcon, BookmarkCheck, Lightbulb, Database,
  Newspaper, Users as UsersIcon, Crown, Sparkles, Zap, Mail, Palette, Sun
} from "lucide-react";
import NotificationBell from "@/components/dashboard/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import { clearStoredAuthSession } from "@/lib/authCleanup";
import { useToast } from "@/hooks/use-toast";
import { usePushSubscription } from "@/hooks/usePushSubscription";

import { useSchoolSettings } from "@/hooks/useSchoolSettings";

const Community = lazy(() => import("@/components/community/Community"));
const StudyMaterialsManager = lazy(() => import("@/components/admin/StudyMaterialsManager"));
const UserApproval = lazy(() => import("@/components/admin/UserApproval"));
const BookManager = lazy(() => import("@/components/admin/BookManager"));
const BookIssueRegister = lazy(() => import("@/components/admin/BookIssueRegister"));
const BookIssueRequests = lazy(() => import("@/components/admin/BookIssueRequests"));
const PointsManager = lazy(() => import("@/components/admin/PointsManager"));
const QuizManager = lazy(() => import("@/components/quiz/QuizManager"));
const GamesManager = lazy(() => import("@/components/admin/GamesManager"));
const BadgeManager = lazy(() => import("@/components/admin/BadgeManager"));
const WishlistView = lazy(() => import("@/components/admin/WishlistView"));
const AdminProfile = lazy(() => import("@/components/admin/AdminProfile"));
const ClassAnalytics = lazy(() => import("@/components/admin/ClassAnalytics"));
const LevelManager = lazy(() => import("@/components/admin/LevelManager"));
const NotificationSender = lazy(() => import("@/components/admin/NotificationSender"));
const EventsManager = lazy(() => import("@/components/admin/EventsManager"));
const RenewalRequests = lazy(() => import("@/components/admin/RenewalRequests"));
const ReviewsModeration = lazy(() => import("@/components/admin/ReviewsModeration"));
const OverdueList = lazy(() => import("@/components/admin/OverdueList"));
const CirculationDashboard = lazy(() => import("@/components/admin/CirculationDashboard"));
const InventoryAuditManager = lazy(() => import("@/components/admin/InventoryAuditManager"));
const ExportReports = lazy(() => import("@/components/admin/ExportReports"));
const GalleryManager = lazy(() => import("@/components/admin/GalleryManager"));
const BookShelfData = lazy(() => import("@/components/admin/BookShelfData"));
const BookCoverData = lazy(() => import("@/components/admin/BookCoverData"));
const BookCondemnation = lazy(() => import("@/components/admin/BookCondemnation"));
const BarcodeGenerator = lazy(() => import("@/components/admin/BarcodeGenerator"));
const SupportTicketsManager = lazy(() => import("@/components/admin/SupportTicketsManager"));
const LibrarySettings = lazy(() => import("@/components/admin/LibrarySettings"));
const CertificateManager = lazy(() => import("@/components/admin/CertificateManager"));
const FineManager = lazy(() => import("@/components/admin/FineManager"));
const LostBooksManager = lazy(() => import("@/components/admin/LostBooksManager"));
const PeriodicalManager = lazy(() => import("@/components/admin/PeriodicalManager"));
const FeedbackManager = lazy(() => import("@/components/admin/FeedbackManager"));
const BookOfTheWeek = lazy(() => import("@/components/admin/BookOfTheWeek"));
const BookClubManager = lazy(() => import("@/components/admin/BookClubManager"));
const StudentBarcodeGenerator = lazy(() => import("@/components/admin/StudentBarcodeGenerator"));
const MetadataFetchDashboard = lazy(() => import("@/components/admin/MetadataFetchDashboard"));
const ExpressCirculation = lazy(() => import("@/components/admin/ExpressCirculation"));
const AcademicYearRollover = lazy(() => import("@/components/admin/AcademicYearRollover"));
const BugBountyManager = lazy(() => import("@/components/admin/BugBountyManager"));
const UIReformChallengeManager = lazy(() => import("@/components/admin/UIReformChallengeManager"));
const EmailCampaignManager = lazy(() => import("@/components/admin/EmailCampaignManager"));
const EventWinnersManager = lazy(() => import("@/components/admin/EventWinnersManager"));
const SchoolBrandingSettings = lazy(() => import("@/components/admin/SchoolBrandingSettings"));
const HomePageEditor = lazy(() => import("@/components/admin/HomePageEditor"));
const VacationAdminPage = lazy(() => import("@/features/vacation/VacationAdminPage"));
const FriendsChatAdmin = lazy(() => import("@/components/admin/FriendsChatAdmin"));
const InviteInstagramManager = lazy(() => import("@/components/admin/InviteInstagramManager"));
const ReservationManager = lazy(() => import("@/components/admin/ReservationManager"));
const QuizParticipants = lazy(() => import("@/components/admin/QuizParticipants"));
const SuggestionManager = lazy(() => import("@/components/admin/SuggestionManager"));
const DataManagement = lazy(() => import("@/components/admin/DataManagement"));

type Tab = "overview" | "users" | "academic-rollover" | "books" | "express-circulation" | "metadata-hub" | "book-requests" | "book-issues" | "overdue" | "renewals" | "reviews" | "book-of-the-week" | "points" | "quizzes" | "quiz-participants" | "badges" | "wishlist" | "levels" | "events" | "event-winners" | "analytics" | "notifications" | "email" | "community" | "chat" | "materials" | "profile" | "circulation" | "audit" | "reports" | "gallery" | "shelf-data" | "cover-data" | "condemnation" | "barcodes" | "student-barcodes" | "support" | "settings" | "data-management" | "certificates" | "fines" | "lost-books" | "periodicals" | "clubs" | "games" | "feedback" | "book-suggestions" | "reservations" | "bug-bounty" | "ui-reform" | "vacation" | "branding" | "home-editor" | "invite-instagram";

const SYSTEM_SIZE_CACHE_KEY = "dlms_admin_system_sizes_v1";
const SYSTEM_SIZE_CACHE_TTL_MS = 60 * 60 * 1000;
const OVERVIEW_STATS_CACHE_KEY = "dlms_admin_overview_stats_v1";
const OVERVIEW_STATS_CACHE_TTL_MS = 60 * 1000;

const navSections = [
  {
    title: "Main",
    items: [
      { id: "overview" as Tab, label: "Overview", icon: Home },
      { id: "analytics" as Tab, label: "Analytics", icon: BarChart3 },
      { id: "reports" as Tab, label: "Export Reports", icon: FileSpreadsheet },
      { id: "support" as Tab, label: "Support Tickets", icon: LifeBuoy },
      { id: "feedback" as Tab, label: "User Feedback", icon: MessageSquare },
    ],
  },
  {
    title: "Users",
    items: [
      { id: "users" as Tab, label: "User Approval", icon: Users },
      { id: "academic-rollover" as Tab, label: "Academic Year Rollover", icon: RefreshCw },
      { id: "points" as Tab, label: "Award Points", icon: Award },
      { id: "student-barcodes" as Tab, label: "Student Barcodes", icon: Barcode },
    ],
  },
  {
    title: "Library",
    items: [
      { id: "express-circulation" as Tab, label: "Express Circulation Kiosk", icon: Zap },
      { id: "books" as Tab, label: "Manage Books", icon: BookOpen },
      { id: "metadata-hub" as Tab, label: "Metadata & Cover Hub", icon: Sparkles },
      { id: "circulation" as Tab, label: "Circulation", icon: LibraryIcon },
      { id: "audit" as Tab, label: "Inventory Audit", icon: ClipboardList },
      { id: "book-requests" as Tab, label: "Book Requests", icon: BookUp },
      { id: "book-issues" as Tab, label: "Book Issues", icon: BookCheck },
      { id: "overdue" as Tab, label: "Overdue", icon: AlertTriangle },
      { id: "fines" as Tab, label: "Fines", icon: IndianRupee },
      { id: "lost-books" as Tab, label: "Lost Books", icon: AlertTriangle },
      { id: "condemnation" as Tab, label: "Condemnation", icon: ShieldAlert },
      { id: "shelf-data" as Tab, label: "Shelf Data", icon: HardDriveDownload },
      { id: "cover-data" as Tab, label: "Cover Pages", icon: ImageIcon },
      { id: "barcodes" as Tab, label: "Barcode Stickers", icon: Barcode },
      { id: "renewals" as Tab, label: "Renewals", icon: RefreshCw },
      { id: "reservations" as Tab, label: "Book Reservations", icon: BookmarkCheck },
      { id: "reviews" as Tab, label: "Moderation & Reports", icon: ShieldAlert },
      { id: "book-of-the-week" as Tab, label: "Book of the Week", icon: Star },
      { id: "materials" as Tab, label: "Study Materials", icon: FileText },
      { id: "wishlist" as Tab, label: "Wishlists", icon: Star },
    ],
  },
  {
    title: "Engagement",
    items: [
      { id: "quizzes" as Tab, label: "Quizzes", icon: Brain },
      { id: "quiz-participants" as Tab, label: "Quiz Participants", icon: ClipboardList },
      { id: "badges" as Tab, label: "Badges", icon: Award },
      { id: "games" as Tab, label: "Games Corner", icon: Gamepad2 },
      { id: "certificates" as Tab, label: "Certificates", icon: Award },
      { id: "periodicals" as Tab, label: "Periodicals", icon: Newspaper },
      { id: "clubs" as Tab, label: "Book Clubs", icon: UsersIcon },
      { id: "events" as Tab, label: "Events", icon: Calendar },
      { id: "event-winners" as Tab, label: "Manage Event Winners", icon: Trophy },
      { id: "gallery" as Tab, label: "Gallery", icon: ImageIcon },
      { id: "levels" as Tab, label: "Levels", icon: Layers },
      { id: "notifications" as Tab, label: "Notifications", icon: Bell },
      { id: "email" as Tab, label: "Email Centre", icon: Mail },
      { id: "community" as Tab, label: "Community", icon: MessageSquare },
      { id: "book-suggestions" as Tab, label: "Book Suggestions", icon: Lightbulb },
      { id: "chat" as Tab, label: "Friends Chat", icon: MessageSquare },
      { id: "bug-bounty" as Tab, label: "Bug Bounty", icon: ShieldAlert },
      { id: "ui-reform" as Tab, label: "UI Reform Challenge", icon: Palette },
      { id: "vacation" as Tab, label: "Vacation Campaign", icon: Sun },
      { id: "invite-instagram" as Tab, label: "Instagram & Invites", icon: UsersIcon },
    ],
  },
  {
    title: "Settings",
    items: [
      { id: "branding" as Tab, label: "School Branding", icon: Palette },
      { id: "home-editor" as Tab, label: "Home Page Editor", icon: Sparkles },
      { id: "settings" as Tab, label: "Library Settings", icon: Settings },
      { id: "data-management" as Tab, label: "Data Management", icon: Database },
      { id: "profile" as Tab, label: "My Profile", icon: User },
    ],
  },
];

import { useBackHandler } from "@/hooks/useBackHandler";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [tabHistory, setTabHistory] = useState<Tab[]>(["overview"]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [stats, setStats] = useState({ totalUsers: 0, totalBooks: 0, totalBooksIssued: 0, activeQuizzes: 0, dbSize: 0, storageSize: 0 });
  const [systemSizesLoaded, setSystemSizesLoaded] = useState(false);
  const [systemSizesLoading, setSystemSizesLoading] = useState(false);
  const [systemSizesUpdatedAt, setSystemSizesUpdatedAt] = useState<number | null>(null);

  usePushSubscription(user?.id);
  const { settings } = useSchoolSettings();

  // Track tab history
  useEffect(() => {
    setTabHistory((prev) => {
      if (prev[prev.length - 1] === activeTab) return prev;
      return [...prev, activeTab];
    });
  }, [activeTab]);

  // Handle URL query parameter (?tab=...)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab") as Tab | null;
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  // Back handler for mobile navigation drawer
  useBackHandler({
    enabled: mobileNavOpen,
    priority: 85,
    stateName: "admin_mobile_drawer",
    onBack: () => {
      setMobileNavOpen(false);
      return true;
    },
  });

  // Back handler for tab navigation history
  useBackHandler({
    enabled: activeTab !== "overview" && !mobileNavOpen,
    priority: 50,
    stateName: `admin_tab_${activeTab}`,
    pushHistoryState: false, // Tab changes are not overlays; no sentinel needed
    onBack: () => {
      setTabHistory((prev) => {
        if (prev.length > 1) {
          const next = [...prev];
          next.pop();
          const target = next[next.length - 1] || "overview";
          setActiveTab(target);
          return next;
        } else {
          setActiveTab("overview");
          return ["overview"];
        }
      });
      return true;
    },
  });

  // Auto-close mobile navigation on tab or route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [activeTab, location.pathname, location.search]);

  useEffect(() => {
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        clearStoredAuthSession();
        navigate('/login', { replace: true });
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user || activeTab !== "overview" || systemSizesLoaded) return;
    void fetchStats();
    // Database and storage size scans are useful, but they should not compete
    // with the dashboard's first paint or its basic counts.
    const timer = window.setTimeout(() => void fetchSystemSizes(), 3500);
    return () => window.clearTimeout(timer);
  }, [user?.id, activeTab, systemSizesLoaded]);

  const checkAuth = async () => {
    try {
      let session: any = null;
      try {
        const { data } = await supabase.auth.getSession();
        session = data?.session;
      } catch (e) {
        console.warn("AdminDashboard getSession error:", e);
      }

      if (!session) {
        try {
          const { data: refreshData } = await supabase.auth.refreshSession();
          session = refreshData?.session || null;
        } catch (refreshErr) {
          console.warn("Admin refresh error:", refreshErr);
        }
      }

      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

      let cachedProfile: any = null;
      try {
        const stored = localStorage.getItem("dlms_user_profile");
        if (stored) cachedProfile = JSON.parse(stored);
      } catch {}

      if (!session && !isOffline) {
        clearStoredAuthSession();
        navigate('/login', { replace: true });
        return;
      }

      if (!session && isOffline && !cachedProfile) {
        navigate('/login', { replace: true });
        return;
      }

      const userId = session?.user?.id || cachedProfile?.id;
      let profile = cachedProfile;

      if (userId) {
        try {
          let profileTimeout: number | undefined;
          const profileRequest = supabase.from('profiles').select('*').eq('id', userId).single();
          const profileResult = await Promise.race([
            profileRequest,
            new Promise((resolve) => {
              profileTimeout = window.setTimeout(() => resolve({ data: null, error: new Error("Profile request timed out") }), 5000);
            }),
          ]);
          if (profileTimeout) window.clearTimeout(profileTimeout);
          const { data, error } = profileResult as any;
          if (!error && data) {
            profile = data;
            try { localStorage.setItem("dlms_user_profile", JSON.stringify(data)); } catch {}
          }
        } catch (e) {
          console.warn("Could not refresh admin profile, using cache:", e);
        }
      }

      if (!profile || profile.role !== 'admin') {
        toast({ title: "Access Denied", description: "You don't have permission.", variant: "destructive" });
        if (profile?.role === 'teacher') navigate('/teacher-dashboard', { replace: true });
        else if (profile?.role === 'student') navigate('/student-dashboard', { replace: true });
        else navigate('/login', { replace: true });
        return;
      }
      setUser(profile);
    } catch (e) {
      console.warn("Admin checkAuth error:", e);
    } finally {
      setLoading(false);
      loadingManager.hide();
    }
  };

  const fetchStats = async () => {
    try {
      try {
        const cached = JSON.parse(localStorage.getItem(OVERVIEW_STATS_CACHE_KEY) || "null");
        if (cached && Number.isFinite(cached.savedAt) && cached.values && Date.now() - cached.savedAt < OVERVIEW_STATS_CACHE_TTL_MS) {
          setStats((current) => ({ ...current, ...cached.values }));
          return;
        }
      } catch { /* Invalid or unavailable cache; fetch current counts. */ }

      const [users, books, totalIssuesReq, quizzes] = await Promise.all([
        supabase.rpc('get_active_users_count'),
        supabase.rpc('get_total_books_count'),
        supabase.from('book_issues').select('*', { count: 'exact', head: true }),
        supabase.rpc('get_active_quizzes_count'),
      ]);

      const values = {
        totalUsers: users.data || 0,
        totalBooks: books.data || 0,
        totalBooksIssued: totalIssuesReq.count ?? 0,
        activeQuizzes: quizzes.data || 0,
      };
      setStats((current) => ({ ...current, ...values }));
      try { localStorage.setItem(OVERVIEW_STATS_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), values })); } catch { /* Cache is optional. */ }
    } catch (e) { console.error(e); }
  };

  const fetchSystemSizes = async (forceRefresh = false) => {
    if (systemSizesLoading) return;
    setSystemSizesLoading(true);
    try {
      if (!forceRefresh) {
        try {
          const cached = JSON.parse(localStorage.getItem(SYSTEM_SIZE_CACHE_KEY) || "null");
          if (
            cached && Number.isFinite(cached.savedAt) && Date.now() - cached.savedAt < SYSTEM_SIZE_CACHE_TTL_MS &&
            Number.isFinite(cached.dbSize) && Number.isFinite(cached.storageSize)
          ) {
            setStats((current) => ({ ...current, dbSize: cached.dbSize, storageSize: cached.storageSize }));
            setSystemSizesUpdatedAt(cached.savedAt);
            return;
          }
        } catch { /* Invalid or unavailable cache; fetch fresh metrics. */ }
      }

      const [db, storage] = await Promise.all([
        supabase.rpc('get_database_size'),
        supabase.rpc('get_storage_size'),
      ]);
      if (db.error) throw db.error;
      if (storage.error) throw storage.error;
      const dbSize = Number(db.data) || 0;
      const storageSize = Number(storage.data) || 0;
      const savedAt = Date.now();
      setStats((current) => ({
        ...current,
        dbSize,
        storageSize,
      }));
      setSystemSizesUpdatedAt(savedAt);
      try { localStorage.setItem(SYSTEM_SIZE_CACHE_KEY, JSON.stringify({ dbSize, storageSize, savedAt })); } catch { /* Cache is optional. */ }
    } catch (error) {
      console.warn("Could not load system size metrics:", error);
    } finally {
      setSystemSizesLoaded(true);
      setSystemSizesLoading(false);
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/'); };
  const handleProfileUpdate = () => checkAuth();

  if (loading) {
    loadingManager.update("Loading admin dashboard...");
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background px-6 text-center text-sm text-muted-foreground">
        Verifying administrator access…
      </div>
    );
  }

  const statCards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "Total Books", value: stats.totalBooks, icon: BookOpen, color: "text-success", bg: "bg-success/10" },
    { label: "Total Books Issued", value: stats.totalBooksIssued, icon: BookCheck, color: "text-warning", bg: "bg-warning/10" },
    { label: "Active Quizzes", value: stats.activeQuizzes, icon: Brain, color: "text-accent", bg: "bg-accent/10" },
  ];

  return (
    <div className="admin-dashboard min-h-dvh w-full min-w-0 overflow-x-clip bg-background flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 bg-card border-r border-border flex-col fixed h-full z-40">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center -space-x-2 shrink-0">
              <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm z-10" title="PM SHRI Logo">
                <img src="/logos/pm-shri.png" alt="PM SHRI" className="w-full h-full object-contain p-1" />
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm z-20" title="School Logo">
                <img
                  src={settings.school_logo_url || "/logos/kv.png"}
                  alt="School Logo"
                  className="w-full h-full object-contain p-1"
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    if (img.src !== window.location.origin + "/logos/kv.png" && !img.src.endsWith("/logos/kv.png")) {
                      img.src = "/logos/kv.png";
                    }
                  }}
                />
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-foreground truncate">{settings.school_name || "PM SHRI KV SULUR"}</h1>
              <p className="text-xs text-muted-foreground">{settings.school_tagline || "DLMS - Admin"}</p>
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
                    onMouseEnter={() => {
                      if (item.id === "ui-reform") {
                        import("@/components/admin/UIReformChallengeManager");
                      }
                    }}
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
          <>
            <div
              className="fixed inset-0 top-14 bg-black/50 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
              onClick={() => setMobileNavOpen(false)}
            />
            <div className="relative z-50 bg-card border-b border-border px-4 pb-3 max-h-[calc(100dvh-3.5rem)] overflow-y-auto space-y-3 shadow-2xl animate-in slide-in-from-top-2 duration-200">
              {navSections.map(section => (
                <div key={section.title}>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{section.title}</p>
                  {section.items.map(item => (
                    <button key={item.id} onClick={() => { setActiveTab(item.id); setMobileNavOpen(false); }}
                      className={`w-full min-w-0 flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors ${activeTab === item.id ? 'gradient-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:bg-muted'}`}>
                      <item.icon className="h-4 w-4 shrink-0" /> <span className="min-w-0">{item.label}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Main Content */}
      <main className="min-w-0 w-full flex-1 lg:ml-64 pt-16 lg:pt-0">
        <Suspense fallback={<div className="max-w-6xl mx-auto p-8 text-center text-sm text-muted-foreground">Loading this admin section…</div>}>
        <div key={activeTab} data-admin-content className="admin-dashboard-content w-full min-w-0 max-w-6xl mx-auto p-3 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-2 duration-300">

          {/* Overview */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Dashboard Overview</h2>
                  <p className="text-muted-foreground text-sm">Welcome back, {user?.first_name}!</p>
                </div>
                <div className="hidden lg:block">
                  <NotificationBell />
                </div>
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-border/50 md:col-span-2">
                  <CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      { label: "Approve New Users", tab: "users" as Tab, icon: Users },
                      { label: "Rotational Monthly Badges (Reader of the Month & Best User)", tab: "badges" as Tab, icon: Crown },
                      { label: "Top 3 Per Class Badges (Physical List)", tab: "badges" as Tab, icon: Award },
                      { label: "Manage Book Requests", tab: "book-requests" as Tab, icon: BookUp },
                      { label: "Create New Quiz", tab: "quizzes" as Tab, icon: Brain },
                      { label: "View Analytics", tab: "analytics" as Tab, icon: BarChart3 },
                    ].map((action, i) => (
                      <button key={i} onClick={() => setActiveTab(action.tab)}
                        className="w-full flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent hover:text-accent-foreground transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 text-primary rounded-md group-hover:bg-primary group-hover:text-primary-foreground transition-colors"><action.icon className="h-4 w-4" /></div>
                          <span className="font-medium text-sm">{action.label}</span>
                        </div>
                      </button>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                    <div><CardTitle className="text-lg">System Health</CardTitle><p className="mt-1 text-xs text-muted-foreground">{systemSizesUpdatedAt ? `Usage snapshot · ${new Date(systemSizesUpdatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}` : systemSizesLoading ? "Checking usage…" : "Usage snapshot unavailable"}</p></div>
                    <Button size="sm" variant="outline" disabled={systemSizesLoading} onClick={() => void fetchSystemSizes(true)} aria-label="Refresh system usage">
                      <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${systemSizesLoading ? "animate-spin" : ""}`} /> Refresh
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-5">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium flex items-center gap-2"><Server className="h-4 w-4 text-blue-500"/> Database</span>
                          <span className="text-sm text-muted-foreground">{(stats.dbSize / (1024 * 1024)).toFixed(1)} MB</span>
                        </div>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 transition-all rounded-full" style={{ width: `${Math.min((stats.dbSize / (500 * 1024 * 1024)) * 100, 100)}%` }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 text-right">of 500 MB (DB Free Tier)</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium flex items-center gap-2"><HardDrive className="h-4 w-4 text-emerald-500"/> Storage</span>
                          <span className="text-sm text-muted-foreground">{(stats.storageSize / (1024 * 1024)).toFixed(1)} MB</span>
                        </div>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                          {/* Supabase free tier: 1 GB Storage */}
                          <div
                            className={`h-full transition-all rounded-full ${
                              (stats.storageSize / (1024 * 1024 * 1024)) > 0.9 ? 'bg-red-500' :
                              (stats.storageSize / (1024 * 1024 * 1024)) > 0.7 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min((stats.storageSize / (1024 * 1024 * 1024)) * 100, 100)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 text-right">of 1 GB (Storage Free Tier)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-border/50">
                  <CardHeader><CardTitle className="text-lg">Recent Alerts</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      { label: "New book request pending", icon: BookOpen },
                      { label: "Low stock alert: Fiction", icon: AlertCircle },
                    ].map((action, i) => (
                      <button key={i} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors group">
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
          {activeTab === "academic-rollover" && <AcademicYearRollover />}
          {activeTab === "express-circulation" && <ExpressCirculation />}
          {activeTab === "books" && <BookManager />}
          {activeTab === "metadata-hub" && <MetadataFetchDashboard />}
          {activeTab === "circulation" && <CirculationDashboard />}
          {activeTab === "audit" && <InventoryAuditManager />}
          {activeTab === "reports" && <ExportReports />}
          {activeTab === "book-requests" && <BookIssueRequests />}
          {activeTab === "book-issues" && <BookIssueRegister />}
          {activeTab === "overdue" && <OverdueList />}
          {activeTab === "fines" && <FineManager />}
          {activeTab === "lost-books" && <LostBooksManager />}
          {activeTab === "condemnation" && <BookCondemnation />}
          {activeTab === "periodicals" && <PeriodicalManager />}
          {activeTab === "clubs" && <BookClubManager />}
          {activeTab === "reservations" && <ReservationManager />}
          {activeTab === "certificates" && <CertificateManager />}
          {activeTab === "settings" && <LibrarySettings />}
          {activeTab === "data-management" && <DataManagement />}
          {activeTab === "branding" && <SchoolBrandingSettings />}
          {activeTab === "home-editor" && <HomePageEditor />}
          {activeTab === "shelf-data" && <BookShelfData />}
          {activeTab === "cover-data" && <BookCoverData />}
          {activeTab === "renewals" && <RenewalRequests />}
          {activeTab === "reviews" && <ReviewsModeration />}
          {activeTab === "book-of-the-week" && <BookOfTheWeek />}
          {activeTab === "events" && <EventsManager />}
          {activeTab === "event-winners" && <EventWinnersManager />}
          {activeTab === "gallery" && <GalleryManager />}
          {activeTab === "points" && <PointsManager />}
          {activeTab === "quizzes" && <QuizManager />}
          {activeTab === "quiz-participants" && <QuizParticipants />}
          {activeTab === "badges" && <BadgeManager />}
          {activeTab === "games" && <GamesManager />}
          {activeTab === "wishlist" && <WishlistView />}
          {activeTab === "levels" && <LevelManager />}
          {activeTab === "analytics" && <ClassAnalytics />}
          {activeTab === "notifications" && <NotificationSender />}
          {activeTab === "email" && <EmailCampaignManager />}
          {activeTab === "community" && user?.id && <Community currentUserId={user.id} isAdmin={true} />}
          {activeTab === "chat" && <FriendsChatAdmin />}
          {activeTab === "materials" && <StudyMaterialsManager />}
          {activeTab === "barcodes" && <BarcodeGenerator />}
          {activeTab === "student-barcodes" && <StudentBarcodeGenerator />}
          {activeTab === "support" && <SupportTicketsManager />}
          {activeTab === "feedback" && <FeedbackManager />}
          {activeTab === "book-suggestions" && <SuggestionManager />}
          {activeTab === "bug-bounty" && <BugBountyManager />}
          {activeTab === "ui-reform" && <UIReformChallengeManager />}
          {activeTab === "vacation" && <VacationAdminPage />}
          {activeTab === "invite-instagram" && <InviteInstagramManager />}
          {activeTab === "profile" && <AdminProfile user={user} onProfileUpdate={handleProfileUpdate} />}
        </div>
        </Suspense>
      </main>
    </div>
  );
};

export default AdminDashboard;
