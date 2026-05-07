import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, BarChart3, Star, Trophy, Target, Zap, ArrowRight, LayoutDashboard, Calendar, Camera, Award, Clock, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import libraryImg from "@/assets/library-1.jpg";
import libraryEventImg from "@/assets/library-event.jpg";
import libraryBooksImg from "@/assets/library-books.jpg";

interface Statistics {
  totalBooks: number;
  activeUsers: number;
  booksIssued: number;
}

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<Statistics>({ totalBooks: 0, activeUsers: 0, booksIssued: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) loadUserProfile(session.user.id);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (session?.user) loadUserProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
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
    } catch (error) { console.error('Error loading profile:', error); }
    finally { setLoading(false); }
  };

  const loadStatistics = async () => {
    try {
      const [totalBooksResult, activeUsersResult, booksIssuedResult] = await Promise.all([
        supabase.rpc('get_total_books_count'), supabase.rpc('get_active_users_count'), supabase.rpc('get_books_issued_count'),
      ]);
      setStatistics({ totalBooks: totalBooksResult.data || 0, activeUsers: activeUsersResult.data || 0, booksIssued: booksIssuedResult.data || 0 });
    } catch (error) { console.error('Error loading statistics:', error); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); setProfile(null); };
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
    { icon: Target, title: "Reading Challenges", description: "Join monthly challenges and compete with classmates", color: "text-destructive", bg: "bg-destructive/10" },
    { icon: Award, title: "Quizzes & Rewards", description: "Test your knowledge, earn XP, and level up your profile", color: "text-primary", bg: "bg-primary/10" },
  ];

  const events = [
    { title: "National Reading Week", date: "June 19-25, 2026", description: "Special reading activities, author talks, and book exhibitions for all classes.", badge: "Upcoming" },
    { title: "Inter-Class Quiz Competition", date: "Every Friday", description: "Weekly quizzes with leaderboard prizes for top readers in each class.", badge: "Ongoing" },
    { title: "Book Donation Drive", date: "August 2026", description: "Donate books and earn bonus points. Help grow our library collection!", badge: "Annual" },
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
                <h1 className="text-lg font-bold text-foreground leading-tight">PM SHRI KV AFS SULUR</h1>
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
                    <LayoutDashboard className="h-4 w-4 mr-2" /> Dashboard
                  </Button>
                  <Button onClick={handleLogout} variant="outline" size="sm">Logout</Button>
                </>
              ) : (
                <>
                  <Button onClick={() => navigate('/login')} variant="ghost" size="sm">Login</Button>
                  <Button onClick={() => navigate('/login')} size="sm" className="gradient-primary border-0">Get Started</Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-5" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-accent/10 rounded-full blur-3xl animate-float pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
                <Star className="h-4 w-4" /> Empowering Young Minds Through Reading
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-5 leading-tight">
                Welcome to Your{" "}
                <span className="bg-clip-text gradient-primary block sm:inline text-slate-800">Digital Library</span>
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-lg">
                Discover, learn, and grow with our comprehensive library system.
                Access books, track progress, earn points, and compete with classmates.
              </p>
              {!user && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={() => navigate('/login')} size="lg" className="gradient-primary border-0 text-base px-8 py-5 shadow-lg hover:shadow-xl transition-shadow">
                    Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button onClick={() => navigate('/catalog')} variant="outline" size="lg" className="text-base px-8 py-5">
                    Browse Books
                  </Button>
                </div>
              )}
              {user && profile && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={navigateToDashboard} size="lg" className="gradient-primary border-0 text-base px-8 py-5">
                    <LayoutDashboard className="h-5 w-5 mr-2" /> Go to Dashboard
                  </Button>
                </div>
              )}
            </div>
            <div className="hidden lg:block">
              <div className="relative">
                <img src={libraryImg} alt="Our school library with students reading" width={800} height={512} className="rounded-2xl shadow-2xl" />
                <div className="absolute -bottom-4 -left-4 bg-card rounded-xl shadow-lg p-3 border border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center">
                      <BookOpen className="h-4 w-4 text-success" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">{statistics.totalBooks}+</p>
                      <p className="text-[10px] text-muted-foreground">Books Available</p>
                    </div>
                  </div>
                </div>
                <div className="absolute -top-4 -right-4 bg-card rounded-xl shadow-lg p-3 border border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">{statistics.activeUsers}+</p>
                      <p className="text-[10px] text-muted-foreground">Active Readers</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="gradient-primary py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-6 text-center">
            {[
              { value: statistics.totalBooks, label: "Books Available", icon: BookOpen },
              { value: statistics.activeUsers, label: "Active Readers", icon: Users },
              { value: statistics.booksIssued, label: "Books Issued", icon: BarChart3 },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center">
                <stat.icon className="h-5 w-5 text-primary-foreground/80 mb-1" />
                <div className="text-2xl sm:text-3xl font-extrabold text-primary-foreground">{stat.value.toLocaleString()}+</div>
                <div className="text-primary-foreground/70 text-xs sm:text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Why Students Love It</h3>
            <p className="text-muted-foreground max-w-xl mx-auto">Everything you need for an engaging reading experience</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="hover-lift border-border/50 group cursor-default">
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

      {/* Library Gallery */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              <Camera className="h-4 w-4" /> Our Library
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">A Glimpse Into Our Space</h3>
            <p className="text-muted-foreground max-w-xl mx-auto">A modern, well-equipped library designed for curious minds</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 relative group overflow-hidden rounded-2xl">
              <img src={libraryImg} alt="Library reading area" width={800} height={512} loading="lazy"
                className="w-full h-64 md:h-80 object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
              <div className="absolute bottom-4 left-4 text-primary-foreground">
                <p className="text-lg font-bold">Reading Area</p>
                <p className="text-sm opacity-80">Comfortable spaces for focused reading</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="relative group overflow-hidden rounded-2xl">
                <img src={libraryBooksImg} alt="Book collection" width={800} height={512} loading="lazy"
                  className="w-full h-[148px] md:h-[148px] object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
                <div className="absolute bottom-3 left-3 text-primary-foreground">
                  <p className="font-bold text-sm">Book Collection</p>
                </div>
              </div>
              <div className="relative group overflow-hidden rounded-2xl">
                <img src={libraryEventImg} alt="Library events" width={800} height={512} loading="lazy"
                  className="w-full h-[148px] md:h-[148px] object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
                <div className="absolute bottom-3 left-3 text-primary-foreground">
                  <p className="font-bold text-sm">Library Events</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Events & Activities */}
      <section className="py-16 sm:py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-warning/10 text-warning rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              <Calendar className="h-4 w-4" /> Events & Activities
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">What's Happening</h3>
            <p className="text-muted-foreground max-w-xl mx-auto">Stay updated with library events and reading activities</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {events.map((event, i) => (
              <Card key={i} className="hover-lift border-border/50 overflow-hidden">
                <div className={`h-1 ${i === 0 ? "bg-primary" : i === 1 ? "bg-warning" : "bg-success"}`} />
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{event.title}</CardTitle>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      event.badge === "Upcoming" ? "bg-primary/10 text-primary" :
                      event.badge === "Ongoing" ? "bg-success/10 text-success" :
                      "bg-warning/10 text-warning"
                    }`}>{event.badge}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {event.date}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">How It Works</h3>
            <p className="text-muted-foreground max-w-xl mx-auto">Get started in just a few simple steps</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Register", desc: "Create your account with your school details", icon: Users },
              { step: "2", title: "Browse Books", desc: "Explore our extensive digital catalog", icon: BookOpen },
              { step: "3", title: "Read & Learn", desc: "Borrow books and track your reading progress", icon: Heart },
              { step: "4", title: "Earn Rewards", desc: "Complete challenges, take quizzes, climb ranks", icon: Trophy },
            ].map((s, i) => (
              <div key={i} className="text-center group">
                <div className="w-14 h-14 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform">
                  <s.icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <div className="text-xs font-bold text-primary mb-1">Step {s.step}</div>
                <h4 className="font-bold text-foreground mb-1">{s.title}</h4>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section className="py-16 sm:py-20 bg-card">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">Ready to Start Your Reading Journey?</h3>
            <p className="text-muted-foreground mb-8">Join your classmates and start earning points today!</p>
            <Button onClick={() => navigate('/login')} size="lg" className="gradient-primary border-0 text-base sm:text-lg px-10 py-5 sm:py-6 shadow-lg">
              Create Your Account <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-foreground text-primary-foreground py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-primary-foreground/10 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-primary-foreground" />
                </div>
                <h4 className="font-bold text-primary-foreground">KV AFS Sulur Library</h4>
              </div>
              <p className="text-primary-foreground/60 text-sm">Empowering young minds through the joy of reading and digital innovation.</p>
            </div>
            <div>
              <h4 className="font-bold text-primary-foreground mb-3">Quick Links</h4>
              <div className="space-y-2">
                <button onClick={() => navigate('/catalog')} className="block text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors">Browse Catalog</button>
                <button onClick={() => navigate('/login')} className="block text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors">Student Login</button>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-primary-foreground mb-3">Contact</h4>
              <p className="text-sm text-primary-foreground/60">PM SHRI Kendriya Vidyalaya</p>
              <p className="text-sm text-primary-foreground/60">AFS Sulur, Coimbatore</p>
              <p className="text-sm text-primary-foreground/60">Tamil Nadu, India</p>
            </div>
          </div>
          <div className="border-t border-primary-foreground/10 pt-6 text-center">
            <p className="text-primary-foreground/50 text-sm">
              © {new Date().getFullYear()} PM SHRI KV Sulur Digital Library. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
