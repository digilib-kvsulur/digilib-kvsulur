import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, Users, BarChart3, Trophy, Target, Zap, ArrowRight, LayoutDashboard,
  Calendar, Award, Clock, GraduationCap, Sparkles, MapPin, Mail, ChevronRight, Star, BookMarked, Compass, Library, Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/landing-hero.jpg";
import event1Img from "@/assets/landing-event-1.jpg";
import event2Img from "@/assets/landing-event-2.jpg";
import libraryEventImg from "@/assets/library-event.jpg";

interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  cover_url?: string;
}

interface Statistics {
  totalBooks: number;
  activeUsers: number;
  booksIssued: number;
}

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [trendingBooks, setTrendingBooks] = useState<Book[]>([]);
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
    loadTrendingBooks();
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

  const loadTrendingBooks = async () => {
    try {
      const { data, error } = await supabase
        .from("books")
        .select("id, title, author, category, cover_url")
        .limit(6);
      if (!error && data) {
        setTrendingBooks(data);
      }
    } catch (e) {
      console.error("Failed to load trending books:", e);
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); setProfile(null); };
  
  const navigateToDashboard = () => {
    if (profile?.role === "admin") navigate("/admin-dashboard");
    else if (profile?.role === "teacher") navigate("/teacher-dashboard");
    else navigate("/student-dashboard");
  };

  const features = [
    { icon: BookOpen, title: "Digital Catalog", desc: "Browse a curated collection of reference materials, textbooks, and fiction.", color: "bg-blue-50 text-blue-600 border-blue-100" },
    { icon: Trophy, title: "Gamified Learning", desc: "Earn experience points (XP), complete daily missions, and climb the school leaderboard.", color: "bg-amber-50 text-amber-600 border-amber-100" },
    { icon: BarChart3, title: "Progress Analytics", desc: "Track your reading history, analyze speed progress, and unlock custom badges.", color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
    { icon: Zap, title: "Daily Streaks", desc: "Build consistent habits. Log in daily, read books, and keep your reading streak alive.", color: "bg-rose-50 text-rose-600 border-rose-100" },
    { icon: Target, title: "Monthly Goals", desc: "Set personal reading challenges and participate in classroom book marathons.", color: "bg-purple-50 text-purple-600 border-purple-100" },
    { icon: Award, title: "Quizzes & Badges", desc: "Test your comprehension with integrated book quizzes and showcase awards on your cabinet.", color: "bg-cyan-50 text-cyan-600 border-cyan-100" },
  ];

  const events = [
    { title: "National Reading Week", date: "June 19–25, 2026", desc: "Author talks, storytelling workshops, and inter-class reading marathons.", badge: "Upcoming", img: event1Img },
    { title: "Inter-Class Library Quiz", date: "Every Friday", desc: "Showcase your reading retention in our weekly live quiz with leaderboard prizes.", badge: "Weekly", img: event2Img },
    { title: "Annual Book Donation Drive", date: "August 2026", desc: "Donate books to the secondary wing and receive double XP bonus points.", badge: "Annual", img: libraryEventImg },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-500/20 selection:text-indigo-900 overflow-x-hidden">
      {/* Light Background Grids and Blobs */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f080_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f080_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0" />
      <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] rounded-full bg-indigo-200/30 blur-[130px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-5%] w-[40%] h-[40%] rounded-full bg-blue-200/30 blur-[140px] pointer-events-none" />

      {/* Top Banner strip */}
      <div className="relative border-b border-indigo-100 bg-indigo-50/80 text-xs backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-5 text-slate-600">
            <span className="flex items-center gap-1.5 font-medium"><MapPin className="h-3.5 w-3.5 text-indigo-600" /> PM SHRI KV AFS Sulur, Coimbatore</span>
            <span className="h-3 w-px bg-slate-300 hidden md:block" />
            <span className="flex items-center gap-1.5 hidden md:flex font-medium"><Mail className="h-3.5 w-3.5 text-indigo-600" /> kvsulur.library@gov.in</span>
          </div>
          <span className="flex items-center gap-1.5 text-indigo-900 font-bold"><Sparkles className="h-3.5 w-3.5 text-amber-500" /> PM SHRI National Excellence School</span>
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md transition-all shadow-xs">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-slate-900 leading-none">PM SHRI KV AFS SULUR</h1>
              <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider mt-1">Digital Library Hub</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-700">
            <button onClick={() => navigate("/catalog")} className="hover:text-indigo-600 transition-colors">Catalog</button>
            <button onClick={() => navigate("/login")} className="hover:text-indigo-600 transition-colors">Quizzes</button>
            <a href="#about" className="hover:text-indigo-600 transition-colors">Features</a>
            <a href="#events" className="hover:text-indigo-600 transition-colors">Events</a>
          </nav>
          <div className="flex items-center space-x-3">
            {loading ? (
              <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
            ) : user && profile ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-600 font-medium hidden sm:inline">Hi, <strong className="text-slate-900 font-bold">{profile.first_name}</strong></span>
                <Button onClick={navigateToDashboard} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 border-0">
                  <LayoutDashboard className="h-4 w-4 mr-2" /> Dashboard
                </Button>
                <Button onClick={handleLogout} variant="outline" size="sm" className="rounded-xl border-slate-200 hover:bg-slate-100 text-slate-700 text-xs">Logout</Button>
              </div>
            ) : (
              <>
                <Button onClick={() => navigate("/login")} variant="ghost" size="sm" className="text-slate-700 hover:text-indigo-600 rounded-xl font-semibold">Login</Button>
                <Button onClick={() => navigate("/login")} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-md shadow-indigo-600/20 border-0 px-5">
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 lg:pt-16 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 border border-indigo-200/80 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider mx-auto lg:mx-0 shadow-xs">
                <Star className="h-3.5 w-3.5 fill-indigo-600 text-indigo-600" /> Kendriya Vidyalaya Sangathan
              </div>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.08] max-w-xl">
                A Library That Grows With <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Every Reader.</span>
              </h2>
              <p className="text-base sm:text-lg text-slate-600 max-w-lg leading-relaxed mx-auto lg:mx-0 font-normal">
                Welcome to the digital portal of <span className="font-semibold text-slate-900">PM SHRI Kendriya Vidyalaya, AFS Sulur</span>. Borrow your favorite books, participate in live quizzes, follow friends, and level up your reading XP!
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-2">
                {!user ? (
                  <>
                    <Button onClick={() => navigate("/login")} size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white text-base px-8 h-13 rounded-xl font-bold shadow-lg shadow-indigo-600/25 border-0">
                      Open Account <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button onClick={() => navigate("/catalog")} variant="outline" size="lg" className="text-base px-8 h-13 border-slate-300 bg-white hover:bg-slate-50 text-slate-800 rounded-xl font-bold shadow-xs">
                      Browse Books
                    </Button>
                  </>
                ) : (
                  <Button onClick={navigateToDashboard} size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white text-base px-8 h-13 rounded-xl font-bold shadow-lg shadow-indigo-600/25 border-0">
                    <LayoutDashboard className="h-5 w-5 mr-2" /> Go to Dashboard
                  </Button>
                )}
              </div>

              {/* Stats Band */}
              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-200/80 max-w-md mx-auto lg:mx-0">
                {[
                  { v: statistics.totalBooks, l: "Books" },
                  { v: statistics.activeUsers, l: "Active Readers" },
                  { v: statistics.booksIssued, l: "Books Issued" },
                ].map((s, i) => (
                  <div key={i} className="text-center lg:text-left">
                    <p className="text-3xl font-black text-slate-900">{s.v.toLocaleString()}+</p>
                    <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest mt-1.5">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column (Visual) */}
            <div className="lg:col-span-6 relative flex justify-center">
              <div className="relative w-full max-w-[500px] aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border border-slate-200 bg-white group">
                <img src={heroImg} alt="Library hall" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-indigo-300">Library Campus View</p>
                  <p className="text-lg font-black mt-1 leading-snug">Our newly upgraded quiet study halls & book collection zones</p>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-xl hidden md:flex">
                <div className="w-11 h-11 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-md shadow-amber-500/20">
                  <Trophy className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">RANK #1 SCHOOL</p>
                  <p className="text-sm font-black text-slate-900">Best Region Library</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Light Stats Row */}
      <section className="border-y border-slate-200/80 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { icon: BookMarked, v: statistics.totalBooks, l: "Books In Catalog" },
            { icon: Users, v: statistics.activeUsers, l: "Verified Readers" },
            { icon: Compass, v: statistics.booksIssued, l: "Books Checked Out" },
            { icon: Library, v: 12, l: "Classes Served" },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                <s.icon className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 leading-none">{s.v.toLocaleString()}+</p>
                <p className="text-xs text-slate-500 mt-1.5 font-medium">{s.l}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trending Books Showcase */}
      {trendingBooks.length > 0 && (
        <section className="py-20 relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Trending Now</p>
                <h3 className="text-3xl font-black text-slate-900 mt-1">Explore Popular Books</h3>
              </div>
              <Button onClick={() => navigate("/catalog")} variant="link" className="text-indigo-600 hover:text-indigo-800 font-bold p-0 flex items-center gap-1">
                View catalog <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
              {trendingBooks.map((b) => (
                <div key={b.id} onClick={() => navigate(`/book/${b.id}`)} className="group cursor-pointer space-y-3">
                  <div className="aspect-[2/3] w-full rounded-2xl bg-white border border-slate-200 overflow-hidden relative shadow-md group-hover:shadow-xl group-hover:border-indigo-400 transition-all">
                    {b.cover_url ? (
                      <img src={b.cover_url} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-indigo-50 to-blue-50">
                        <BookOpen className="h-8 w-8 text-indigo-400 mb-2" />
                        <span className="text-xs font-semibold text-slate-700 line-clamp-3 leading-snug">{b.title}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg border-0 shadow-md">
                        View Details
                      </Button>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 leading-snug truncate group-hover:text-indigo-600 transition-colors">{b.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">by {b.author}</p>
                    <Badge variant="secondary" className="mt-1.5 text-[9px] bg-indigo-50 text-indigo-700 border-indigo-100 font-bold">{b.category}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features Grid */}
      <section id="about" className="py-20 bg-white border-y border-slate-200/80 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-14">
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Built For KV Students</p>
            <h3 className="text-3xl sm:text-4xl font-black text-slate-900 mt-1">A Modern Gamified Library</h3>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed">We have reimagined the library experience by connecting reading with gamification, comprehension milestones, and social connection.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="p-6.5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all hover:-translate-y-1">
                <div className={`w-11 h-11 rounded-xl border ${f.color} flex items-center justify-center mb-5.5`}>
                  <f.icon className="h-5 w-5" />
                </div>
                <h4 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h4>
                <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Events Activity */}
      <section id="events" className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-14">
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Calendar</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">Upcoming Events & Activities</h3>
            <p className="text-sm text-slate-600 mt-2">Get involved in reading forums, competitive quizzes, and book exhibitions.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {events.map((e, i) => (
              <article key={i} className="group rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all">
                <div className="relative h-48 overflow-hidden bg-slate-100">
                  <img src={e.img} alt={e.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <span className="absolute top-4 left-4 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md">{e.badge}</span>
                </div>
                <div className="p-5.5 space-y-3.5">
                  <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-bold">
                    <Clock className="h-3.5 w-3.5" /> {e.date}
                  </div>
                  <h4 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">{e.title}</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{e.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Box */}
      {!user && (
        <section className="py-16 relative overflow-hidden bg-gradient-to-tr from-indigo-900 via-indigo-800 to-blue-900 text-white">
          <div className="relative max-w-3xl mx-auto px-6 text-center space-y-6">
            <h3 className="text-3.5xl font-black tracking-tight text-white">Ready to Start Your Reading Adventure?</h3>
            <p className="text-indigo-100 text-sm max-w-md mx-auto leading-relaxed">Join 500+ student bookworms at KV AFS Sulur. Log reading activities, earn custom badges, and climb classes league!</p>
            <Button onClick={() => navigate("/login")} size="lg" className="bg-white hover:bg-slate-100 text-indigo-950 text-base px-8 h-13 rounded-xl font-bold shadow-xl border-0">
              Create Account Now <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-12 text-sm text-slate-400">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 border-b border-slate-800 pb-10">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-indigo-400" />
                </div>
                <h3 className="text-base font-extrabold text-white">PM SHRI KV AFS SULUR</h3>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">Empowering student development, comprehension capabilities, and literature-focused gamified progress for Kendriya Vidyalaya learners.</p>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Helpful Navigation</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button onClick={() => navigate("/catalog")} className="hover:text-indigo-400 transition-colors text-left">Book Catalog</button>
                <button onClick={() => navigate("/login")} className="hover:text-indigo-400 transition-colors text-left">Student Dashboard</button>
                <a href="#about" className="hover:text-indigo-400 transition-colors">Key Features</a>
                <a href="#events" className="hover:text-indigo-400 transition-colors">Weekly Events</a>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Official Contact</h4>
              <p className="text-xs leading-relaxed text-slate-400">
                Kendriya Vidyalaya AFS Sulur<br />
                Air Force Station Sulur, Coimbatore - 641401<br />
                Phone: +91 422 2682215
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-between pt-6 text-xs text-slate-500">
            <p>&copy; 2026 PM SHRI Kendriya Vidyalaya AFS Sulur. All rights reserved.</p>
            <div className="flex space-x-4 mt-3 sm:mt-0">
              <a href="#" className="hover:text-slate-400 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-slate-400 transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
