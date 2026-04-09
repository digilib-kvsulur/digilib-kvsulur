import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, BarChart3, User, LayoutDashboard, Star, Trophy, Target, Zap, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Statistics {
  totalBooks: number;
  activeUsers: number;
  booksIssued: number;
}

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<Statistics>({
    totalBooks: 5000,
    activeUsers: 1200,
    booksIssued: 2500,
  });
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    loadStatistics();
    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (!error && data) {
        setProfile(data);
        setTimeout(() => {
          switch (data.role) {
            case "admin": navigate("/admin-dashboard", { replace: true }); break;
            case "teacher": navigate("/teacher-dashboard", { replace: true }); break;
            case "student": navigate("/student-dashboard", { replace: true }); break;
          }
        }, 500);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const [totalBooksResult, activeUsersResult, booksIssuedResult] = await Promise.all([
        supabase.rpc('get_total_books_count'),
        supabase.rpc('get_active_users_count'),
        supabase.rpc('get_books_issued_count'),
      ]);
      setStatistics({
        totalBooks: totalBooksResult.data || 5000,
        activeUsers: activeUsersResult.data || 1200,
        booksIssued: booksIssuedResult.data || 2500,
      });
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const navigateToDashboard = () => {
    if (profile?.role === 'admin') navigate('/admin-dashboard');
    else if (profile?.role === 'teacher') navigate('/teacher-dashboard');
    else navigate('/student-dashboard');
  };

  const features = [
    { icon: BookOpen, title: "Digital Catalog", description: "Browse our extensive collection across various genres and subjects", color: "text-primary", bg: "bg-primary/10" },
    { icon: Trophy, title: "Gamified Learning", description: "Earn points, complete challenges, and climb the leaderboard", color: "text-warning", bg: "bg-warning/10" },
    { icon: BarChart3, title: "Progress Tracking", description: "Monitor reading progress and earn achievements for milestones", color: "text-accent", bg: "bg-accent/10" },
    { icon: Zap, title: "Daily Streaks", description: "Build login streaks, stay consistent, and unlock rewards", color: "text-success", bg: "bg-success/10" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-md">
                <BookOpen className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">PM SHRI KV AFS SULUR</h1>
                <p className="text-xs text-muted-foreground">Digital Library Management System</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : user && profile ? (
                <>
                  <span className="text-sm text-muted-foreground hidden sm:inline">Welcome, {profile.first_name}!</span>
                  <Button onClick={navigateToDashboard} size="sm" className="gradient-primary border-0">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                  <Button onClick={handleLogout} variant="outline" size="sm">Logout</Button>
                </>
              ) : (
                <>
                  <Button onClick={() => navigate('/login')} variant="ghost" size="sm">Login</Button>
                  <Button onClick={() => navigate('/login')} size="sm" className="gradient-primary border-0">
                    Get Started
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-5" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-accent/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6 animate-fade-in">
              <Star className="h-4 w-4" />
              Empowering Young Minds Through Reading
            </div>
            <h2 className="text-4xl lg:text-6xl font-extrabold text-foreground mb-6 leading-tight animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Welcome to Your
              <span className="bg-clip-text text-transparent gradient-primary"> Digital Library</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Discover, learn, and grow with our comprehensive library system. 
              Access books, track progress, earn points, and compete with classmates.
            </p>
            {!user && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <Button onClick={() => navigate('/login')} size="lg" className="gradient-primary border-0 text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-shadow">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button onClick={() => navigate('/catalog')} variant="outline" size="lg" className="text-lg px-8 py-6">
                  Browse Books
                </Button>
              </div>
            )}
            {user && profile && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <Button onClick={navigateToDashboard} size="lg" className="gradient-primary border-0 text-lg px-8 py-6">
                  <LayoutDashboard className="h-5 w-5 mr-2" />
                  Go to Dashboard
                </Button>
                <Button onClick={() => navigate('/catalog')} variant="outline" size="lg" className="text-lg px-8 py-6">
                  Browse Books
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-foreground mb-3">Why Students Love It</h3>
            <p className="text-muted-foreground max-w-xl mx-auto">Everything you need for an engaging reading experience</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="hover-lift border-border/50 group cursor-default animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <CardHeader className="pb-3">
                  <div className={`w-12 h-12 ${feature.bg} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="overflow-hidden border-0 shadow-xl">
            <div className="gradient-primary p-1">
              <CardContent className="bg-card rounded-[calc(var(--radius)-2px)] p-10">
                <h3 className="text-2xl font-bold text-center text-foreground mb-8">Library at a Glance</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    { value: statistics.totalBooks, label: "Books Available", color: "text-primary" },
                    { value: statistics.activeUsers, label: "Active Readers", color: "text-success" },
                    { value: statistics.booksIssued, label: "Books Issued", color: "text-accent" },
                  ].map((stat, i) => (
                    <div key={i} className="text-center">
                      <div className={`text-4xl font-extrabold ${stat.color} mb-1`}>
                        {stat.value.toLocaleString()}+
                      </div>
                      <div className="text-muted-foreground text-sm">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section className="py-20 bg-card">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h3 className="text-3xl font-bold text-foreground mb-4">Ready to Start Your Reading Journey?</h3>
            <p className="text-muted-foreground mb-8">Join your classmates and start earning points today!</p>
            <Button onClick={() => navigate('/login')} size="lg" className="gradient-primary border-0 text-lg px-10 py-6 shadow-lg">
              Create Your Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-foreground text-primary-foreground py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-primary-foreground/60 text-sm">
            © {new Date().getFullYear()} PM SHRI KV Sulur Digital Library. Empowering minds through reading.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
