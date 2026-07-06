import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Users, BarChart3, Trophy, Target, Zap, ArrowRight, LayoutDashboard,
  Calendar, Award, Clock, GraduationCap, Sparkles, MapPin, Mail, ChevronRight, Star
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/landing-hero.jpg";
import event1Img from "@/assets/landing-event-1.jpg";
import event2Img from "@/assets/landing-event-2.jpg";
import booksImg from "@/assets/landing-books.jpg";
import libraryImg from "@/assets/library-1.jpg";
import libraryBooksImg from "@/assets/library-books.jpg";
import libraryEventImg from "@/assets/library-event.jpg";

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) loadUserProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });
    loadStatistics();
    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
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
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadStatistics = async () => {
    try {
      const [b, u, i] = await Promise.all([
        supabase.rpc("get_total_books_count"),
        supabase.rpc("get_active_users_count"),
        supabase.rpc("get_books_issued_count"),
      ]);
      setStatistics({ totalBooks: b.data || 0, activeUsers: u.data || 0, booksIssued: i.data || 0 });
    } catch (e) { console.error(e); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); setProfile(null); };
  const navigateToDashboard = () => {
    if (profile?.role === "admin") navigate("/admin-dashboard");
    else if (profile?.role === "teacher") navigate("/teacher-dashboard");
    else navigate("/student-dashboard");
  };

  const features = [
    { icon: BookOpen, title: "Digital Catalog", desc: "Browse a curated collection across genres and subjects." },
    { icon: Trophy, title: "Gamified Learning", desc: "Earn points, complete challenges, climb the leaderboard." },
    { icon: BarChart3, title: "Progress Tracking", desc: "Monitor reading and unlock achievements." },
    { icon: Zap, title: "Daily Streaks", desc: "Stay consistent and unlock streak rewards." },
    { icon: Target, title: "Reading Challenges", desc: "Take part in monthly reading goals." },
    { icon: Award, title: "Quizzes & XP", desc: "Test knowledge and level up your profile." },
  ];

  const events = [
    { title: "National Reading Week", date: "June 19–25, 2026", desc: "Author talks, exhibitions and reading marathons.", badge: "Upcoming", img: event1Img },
    { title: "Inter-Class Quiz", date: "Every Friday", desc: "Weekly contests with leaderboard prizes.", badge: "Ongoing", img: event2Img },
    { title: "Book Donation Drive", date: "August 2026", desc: "Donate books and earn bonus points.", badge: "Annual", img: libraryEventImg },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top utility strip */}
      <div className="hidden md:block bg-primary text-white text-xs">
        <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-5 opacity-90">
            <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> AFS Sulur, Coimbatore</span>
            <span className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> kvsulur.library@gov.in</span>
          </div>
          <span className="flex items-center gap-1.5 opacity-90"><Sparkles className="h-3 w-3" /> PM SHRI Recognised School</span>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-primary leading-tight">PM SHRI KV AFS SULUR</h1>
                <p className="text-[11px] text-accent font-medium">Digital Library</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#3b6fa0] border-t-transparent rounded-full animate-spin" />
              ) : user && profile ? (
                <>
                  <span className="text-sm text-foreground hidden sm:inline">Hi, {profile.first_name}</span>
                  <Button onClick={navigateToDashboard} size="sm" className="bg-primary hover:bg-primary/90 text-white">
                    <LayoutDashboard className="h-4 w-4 mr-1.5" /> Dashboard
                  </Button>
                  <Button onClick={handleLogout} variant="outline" size="sm">Logout</Button>
                </>
              ) : (
                <>
                  <Button onClick={() => navigate("/login")} variant="ghost" size="sm">Login</Button>
                  <Button onClick={() => navigate("/login")} size="sm" className="bg-primary hover:bg-primary/90 text-white">
                    Get Started
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* HERO — magazine split */}
      <section className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 lg:pt-14 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left – editorial copy */}
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-2 bg-secondary text-primary rounded-full px-3 py-1 text-xs font-semibold mb-5">
                <Star className="h-3 w-3 fill-primary" /> EST. KENDRIYA VIDYALAYA SANGATHAN
              </div>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-primary leading-[1.05] mb-5">
                A library that grows
                <span className="block text-accent">with every reader.</span>
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground mb-7 max-w-xl leading-relaxed">
                The official digital library of <span className="font-semibold text-primary">PM SHRI Kendriya Vidyalaya, AFS Sulur</span> — borrow books,
                track progress, take quizzes, and earn rewards in one place.
              </p>
              {!user ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={() => navigate("/login")} size="lg" className="bg-primary hover:bg-primary/90 text-white text-base px-7 h-12">
                    Open Your Account <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button onClick={() => navigate("/catalog")} variant="outline" size="lg" className="text-base px-7 h-12 border-primary text-primary hover:bg-primary hover:text-white">
                    Browse Catalog
                  </Button>
                </div>
              ) : (
                <Button onClick={navigateToDashboard} size="lg" className="bg-primary hover:bg-primary/90 text-white text-base px-7 h-12">
                  <LayoutDashboard className="h-4 w-4 mr-2" /> Go to Dashboard
                </Button>
              )}

              {/* Inline stats strip */}
              <div className="grid grid-cols-3 gap-4 mt-10 pt-8 border-t border-border">
                {[
                  { v: statistics.totalBooks, l: "Books" },
                  { v: statistics.activeUsers, l: "Readers" },
                  { v: statistics.booksIssued, l: "Issued" },
                ].map((s, i) => (
                  <div key={i}>
                    <p className="text-3xl font-extrabold text-primary">{s.v.toLocaleString()}+</p>
                    <p className="text-xs text-accent font-semibold uppercase tracking-wider mt-1">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right – featured visual */}
            <div className="lg:col-span-6 relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-primary/10">
                <img src={heroImg} alt="KV Sulur library reading hall" width={1280} height={896}
                  className="w-full h-[420px] lg:h-[520px] object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 text-white">
                  <p className="text-[11px] uppercase tracking-widest opacity-90">Featured Story</p>
                  <p className="text-lg font-bold mt-1">Inside our newly renovated reading hall</p>
                </div>
              </div>
              <div className="hidden md:flex absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl border border-border p-3 items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-accent font-semibold">RANK #1</p>
                  <p className="text-sm font-bold text-primary">Region Library</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DARK STATS BAND */}
      <section className="bg-primary text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: BookOpen, v: statistics.totalBooks, l: "Books in catalog" },
            { icon: Users, v: statistics.activeUsers, l: "Active readers" },
            { icon: BarChart3, v: statistics.booksIssued, l: "Books issued" },
            { icon: GraduationCap, v: 12, l: "Classes served" },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <s.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-extrabold">{s.v.toLocaleString()}+</p>
                <p className="text-xs opacity-70">{s.l}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* THIS MONTH — magazine cover story */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs font-bold text-accent uppercase tracking-widest">This Month</p>
              <h3 className="text-3xl sm:text-4xl font-bold text-primary mt-1">Featured Stories</h3>
            </div>
            <button onClick={() => user ? navigateToDashboard() : navigate("/login")}
              className="hidden sm:flex items-center gap-1 text-sm font-semibold text-primary hover:text-accent">
              View all <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Cover story */}
            <article className="lg:col-span-7 group cursor-pointer">
              <div className="relative rounded-2xl overflow-hidden h-[400px]">
                <img src={event1Img} alt="Reading week event" loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-7 text-white">
                  <span className="inline-block bg-white text-primary text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-3">Cover Story</span>
                  <h4 className="text-2xl sm:text-3xl font-bold mb-2 leading-tight">National Reading Week 2026</h4>
                  <p className="text-sm opacity-90 max-w-lg">A week of author talks, book exhibitions and reading marathons across all classes.</p>
                </div>
              </div>
            </article>

            {/* Side stories */}
            <div className="lg:col-span-5 space-y-6">
              {[
                { img: libraryBooksImg, tag: "Catalog", title: "1,200+ new titles added this term", desc: "Including the latest NCERT and reference books." },
                { img: libraryImg, tag: "Space", title: "New reading corner unveiled", desc: "A quiet zone for focused study and silent reading." },
              ].map((s, i) => (
                <article key={i} className="group flex gap-4 cursor-pointer">
                  <div className="w-32 h-32 rounded-xl overflow-hidden shrink-0">
                    <img src={s.img} alt={s.title} loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-accent uppercase tracking-widest">{s.tag}</span>
                    <h4 className="text-lg font-bold text-primary mt-1 leading-snug group-hover:text-accent transition-colors">{s.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* WHY STUDENTS LOVE IT */}
      <section className="py-20 bg-white border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-accent uppercase tracking-widest">Why students love it</p>
            <h3 className="text-3xl sm:text-4xl font-bold text-primary mt-1">Built for curious minds</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-secondary rounded-2xl overflow-hidden">
            {features.map((f, i) => (
              <div key={i} className="bg-white p-7 group hover:bg-background transition-colors">
                <div className="w-11 h-11 bg-primary rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <f.icon className="h-5 w-5 text-white" />
                </div>
                <h4 className="text-lg font-bold text-primary mb-1.5">{f.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GALLERY — magazine grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-accent uppercase tracking-widest">Our Library</p>
            <h3 className="text-3xl sm:text-4xl font-bold text-primary mt-1">A glimpse inside</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 grid-rows-2 gap-3 h-[480px]">
            <div className="col-span-2 row-span-2 relative rounded-2xl overflow-hidden group">
              <img src={heroImg} alt="Reading hall" loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent" />
              <div className="absolute bottom-4 left-5 text-white">
                <p className="text-xs uppercase tracking-widest opacity-80">Reading Hall</p>
                <p className="text-xl font-bold">Where focus meets curiosity</p>
              </div>
            </div>
            <div className="relative rounded-2xl overflow-hidden group">
              <img src={booksImg} alt="Book stack" loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-primary/30" />
              <p className="absolute bottom-3 left-3 text-white text-sm font-bold">Curated Picks</p>
            </div>
            <div className="relative rounded-2xl overflow-hidden group">
              <img src={libraryBooksImg} alt="Shelf" loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-primary/30" />
              <p className="absolute bottom-3 left-3 text-white text-sm font-bold">Collection</p>
            </div>
            <div className="relative rounded-2xl overflow-hidden group">
              <img src={event2Img} alt="Quiz event" loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-primary/30" />
              <p className="absolute bottom-3 left-3 text-white text-sm font-bold">Quiz Day</p>
            </div>
            <div className="relative rounded-2xl overflow-hidden group">
              <img src={libraryEventImg} alt="Library event" loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-primary/30" />
              <p className="absolute bottom-3 left-3 text-white text-sm font-bold">Events</p>
            </div>
          </div>
        </div>
      </section>

      {/* EVENTS */}
      <section className="py-20 bg-white border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-accent uppercase tracking-widest">Upcoming</p>
            <h3 className="text-3xl sm:text-4xl font-bold text-primary mt-1">Events & Activities</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {events.map((e, i) => (
              <article key={i} className="group rounded-2xl overflow-hidden border border-border bg-white hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className="relative h-44 overflow-hidden">
                  <img src={e.img} alt={e.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <span className="absolute top-3 left-3 bg-white text-primary text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">{e.badge}</span>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-1.5 text-xs text-accent font-semibold mb-2">
                    <Clock className="h-3 w-3" /> {e.date}
                  </div>
                  <h4 className="text-lg font-bold text-primary mb-1.5 group-hover:text-accent transition-colors">{e.title}</h4>
                  <p className="text-sm text-muted-foreground">{e.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section className="py-20 bg-primary relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          <div className="relative max-w-3xl mx-auto px-4 text-center">
            <h3 className="text-3xl sm:text-4xl font-bold text-white mb-3">Ready to start reading?</h3>
            <p className="text-white/70 mb-8">Join your classmates and earn your first 10 points today.</p>
            <Button onClick={() => navigate("/login")} size="lg" className="bg-white text-primary hover:bg-secondary text-base px-8 h-12 font-bold">
              Create Your Account <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="bg-primary text-white/80 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-white">KV AFS Sulur Library</h4>
              </div>
              <p className="text-sm opacity-70">Empowering young minds through the joy of reading and digital innovation.</p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-3 text-sm uppercase tracking-wider">Quick Links</h4>
              <div className="space-y-2 text-sm">
                <button onClick={() => navigate("/catalog")} className="block opacity-70 hover:opacity-100">Browse Catalog</button>
                <button onClick={() => navigate("/login")} className="block opacity-70 hover:opacity-100">Student Login</button>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-white mb-3 text-sm uppercase tracking-wider">Contact</h4>
              <p className="text-sm opacity-70">PM SHRI Kendriya Vidyalaya</p>
              <p className="text-sm opacity-70">AFS Sulur, Coimbatore</p>
              <p className="text-sm opacity-70">Tamil Nadu, India</p>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 text-center text-sm opacity-60">
            © {new Date().getFullYear()} PM SHRI KV AFS Sulur Digital Library. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
