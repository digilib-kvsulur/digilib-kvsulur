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
    { icon: BookOpen, title: "Digital Catalog", desc: "Browse a curated collection of reference materials, textbooks, and fiction.", color: "from-blue-500 to-indigo-500", shadow: "shadow-blue-500/10" },
    { icon: Trophy, title: "Gamified Learning", desc: "Earn experience points (XP), complete daily missions, and climb the school leaderboard.", color: "from-amber-500 to-orange-500", shadow: "shadow-amber-500/10" },
    { icon: BarChart3, title: "Progress Analytics", desc: "Track your reading history, analyze speed progress, and unlock custom badges.", color: "from-emerald-500 to-teal-500", shadow: "shadow-emerald-500/10" },
    { icon: Zap, title: "Daily Streaks", desc: "Build consistent habits. Log in daily, read books, and keep your reading streak alive.", color: "from-rose-500 to-pink-500", shadow: "shadow-rose-500/10" },
    { icon: Target, title: "Monthly Goals", desc: "Set personal reading challenges and participate in classroom book marathons.", color: "from-violet-500 to-purple-500", shadow: "shadow-violet-500/10" },
    { icon: Award, title: "Quizzes & Badges", desc: "Test your comprehension with integrated book quizzes and showcase awards on your cabinet.", color: "from-cyan-500 to-sky-500", shadow: "shadow-cyan-500/10" },
  ];

  const events = [
    { title: "National Reading Week", date: "June 19–25, 2026", desc: "Author talks, storytelling workshops, and inter-class reading marathons.", badge: "Upcoming", img: event1Img },
    { title: "Inter-Class Library Quiz", date: "Every Friday", desc: "Showcase your reading retention in our weekly live quiz with leaderboard prizes.", badge: "Weekly", img: event2Img },
    { title: "Annual Book Donation Drive", date: "August 2026", desc: "Donate books to the secondary wing and receive double XP bonus points.", badge: "Annual", img: libraryEventImg },
  ];

  return (
    <div className="min-h-screen bg-[#070913] text-gray-100 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Dynamic Grid Backgrounds */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293710_1px,transparent_1px),linear-gradient(to_bottom,#1f293710_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0" />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-violet-600/5 blur-[150px] pointer-events-none" />

      {/* Top Banner strip */}
      <div className="relative border-b border-white/5 bg-[#0a0d1e]/80 text-xs backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-5 text-gray-400">
            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-indigo-400" /> PM SHRI KV AFS Sulur, Coimbatore</span>
            <span className="h-3 w-px bg-white/10 hidden md:block" />
            <span className="flex items-center gap-1.5 hidden md:flex"><Mail className="h-3.5 w-3.5 text-indigo-400" /> kvsulur.library@gov.in</span>
          </div>
          <span className="flex items-center gap-1.5 text-amber-400/90 font-bold"><Sparkles className="h-3.5 w-3.5 text-amber-400 animate-spin-slow" /> PM SHRI National Excellence School</span>
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#070913]/85 backdrop-blur-md transition-all">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-white leading-none">PM SHRI KV AFS SULUR</h1>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mt-1">Digital Library Hub</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold text-gray-300">
            <button onClick={() => navigate("/catalog")} className="hover:text-indigo-400 transition-colors">Catalog</button>
            <button onClick={() => navigate("/login")} className="hover:text-indigo-400 transition-colors">Quizzes</button>
            <a href="#about" className="hover:text-indigo-400 transition-colors">Features</a>
            <a href="#events" className="hover:text-indigo-400 transition-colors">Events</a>
          </nav>
          <div className="flex items-center space-x-3">
            {loading ? (
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
            ) : user && profile ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-300 font-medium hidden sm:inline">Hi, <strong className="text-white font-bold">{profile.first_name}</strong></span>
                <Button onClick={navigateToDashboard} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/25 border-0">
                  <LayoutDashboard className="h-4 w-4 mr-2" /> Dashboard
                </Button>
                <Button onClick={handleLogout} variant="outline" size="sm" className="rounded-xl border-white/10 hover:bg-white/5 text-xs">Logout</Button>
              </div>
            ) : (
              <>
                <Button onClick={() => navigate("/login")} variant="ghost" size="sm" className="text-gray-300 hover:text-white rounded-xl">Login</Button>
                <Button onClick={() => navigate("/login")} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-lg shadow-indigo-600/25 border-0 px-5">
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 lg:pt-20 pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full px-4.5 py-1.5 text-xs font-bold uppercase tracking-wider mx-auto lg:mx-0">
                <Star className="h-3.5 w-3.5 fill-indigo-400" /> Est. Kendriya Vidyalaya Sangathan
              </div>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.08] max-w-xl">
                A Library That Grows With <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 bg-clip-text text-transparent">Every Reader.</span>
              </h2>
              <p className="text-base sm:text-lg text-gray-400 max-w-lg leading-relaxed mx-auto lg:mx-0">
                Welcome to the digital portal of <span className="font-semibold text-white">PM SHRI Kendriya Vidyalaya, AFS Sulur</span>. Borrow your favorite books, participate in live quizzes, follow friends, and level up your reading XP!
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-2">
                {!user ? (
                  <>
                    <Button onClick={() => navigate("/login")} size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white text-base px-8 h-13 rounded-xl font-bold shadow-xl shadow-indigo-600/20 border-0">
                      Open Account <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button onClick={() => navigate("/catalog")} variant="outline" size="lg" className="text-base px-8 h-13 border-white/10 hover:bg-white/5 text-gray-200 rounded-xl font-bold">
                      Browse Books
                    </Button>
                  </>
                ) : (
                  <Button onClick={navigateToDashboard} size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white text-base px-8 h-13 rounded-xl font-bold shadow-xl shadow-indigo-600/20 border-0">
                    <LayoutDashboard className="h-5 w-5 mr-2" /> Go to Dashboard
                  </Button>
                )}
              </div>

              {/* Stats Band */}
              <div className="grid grid-cols-3 gap-6 pt-10 border-t border-white/5 max-w-md mx-auto lg:mx-0">
                {[
                  { v: statistics.totalBooks, l: "Books" },
                  { v: statistics.activeUsers, l: "Active Readers" },
                  { v: statistics.booksIssued, l: "Books Issued" },
                ].map((s, i) => (
                  <div key={i} className="text-center lg:text-left">
                    <p className="text-3xl font-black text-white">{s.v.toLocaleString()}+</p>
                    <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1.5">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column (Visual) */}
            <div className="lg:col-span-6 relative flex justify-center">
              <div className="relative w-full max-w-[500px] aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border border-white/10 group">
                <img src={heroImg} alt="Library hall" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">Library Campus View</p>
                  <p className="text-lg font-black mt-1 leading-snug">Our newly upgraded quiet study halls & book collection zones</p>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 bg-[#0c0f24]/90 backdrop-blur border border-white/10 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xl hidden md:flex animate-float">
                <div className="w-11 h-11 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Trophy className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">RANK #1 SCHOOL</p>
                  <p className="text-sm font-black text-white">Best Region Library</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dark Stats Row */}
      <section className="border-y border-white/5 bg-[#0a0d1f]">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { icon: BookMarked, v: statistics.totalBooks, l: "Books In Catalog" },
            { icon: Users, v: statistics.activeUsers, l: "Verified Readers" },
            { icon: Compass, v: statistics.booksIssued, l: "Books Checked Out" },
            { icon: Library, v: 12, l: "Classes Served" },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-4.5">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <s.icon className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-2xl font-black text-white leading-none">{s.v.toLocaleString()}+</p>
                <p className="text-xs text-gray-400 mt-2 font-medium">{s.l}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trending Books / Catalog Showcase */}
      {trendingBooks.length > 0 && (
        <section className="py-24 relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Trending Now</p>
                <h3 className="text-3xl font-black text-white mt-1">Explore Popular Books</h3>
              </div>
              <Button onClick={() => navigate("/catalog")} variant="link" className="text-indigo-400 hover:text-indigo-300 font-bold p-0 flex items-center gap-1">
                View catalog <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
              {trendingBooks.map((b) => (
                <div key={b.id} onClick={() => navigate(`/book/${b.id}`)} className="group cursor-pointer space-y-3">
                  <div className="aspect-[2/3] w-full rounded-2xl bg-white/5 border border-white/10 overflow-hidden relative shadow-lg group-hover:border-indigo-500/40 transition-colors">
                    {b.cover_url ? (
                      <img src={b.cover_url} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-indigo-500/10 to-violet-600/10">
                        <BookOpen className="h-8 w-8 text-indigo-400/40 mb-2" />
                        <span className="text-xs font-semibold text-gray-400 line-clamp-3 leading-snug">{b.title}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg border-0 shadow-lg shadow-indigo-600/20">
                        View Details
                      </Button>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white leading-snug truncate group-hover:text-indigo-400 transition-colors">{b.title}</h4>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">by {b.author}</p>
                    <Badge variant="secondary" className="mt-1.5 text-[9px] bg-white/5 hover:bg-white/10 text-indigo-300 border-0 font-bold">{b.category}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Why Students Love It */}
      <section id="about" className="py-24 bg-[#0a0d1f]/50 border-y border-white/5 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-16">
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Built For KV Students</p>
            <h3 className="text-3xl sm:text-4xl font-black text-white mt-1">A Modern Gamified Library</h3>
            <p className="text-sm text-gray-400 mt-3 leading-relaxed">We have reimagined the library experience by connecting reading with gamification, comprehension milestones, and social connection.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className={`p-6.5 rounded-2xl bg-[#090b16] border border-white/5 hover:border-indigo-500/20 shadow-lg ${f.shadow} transition-all hover:-translate-y-1`}>
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${f.color} flex items-center justify-center mb-5.5`}>
                  <f.icon className="h-5 w-5 text-white" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">{f.title}</h4>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Events Activity */}
      <section id="events" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-16">
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-black">Calendar</p>
            <h3 className="text-3xl font-black text-white mt-1">Upcoming Events & Activities</h3>
            <p className="text-sm text-gray-400 mt-2">Get involved in reading forums, competitive quizzes, and book exhibitions.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {events.map((e, i) => (
              <article key={i} className="group rounded-2xl border border-white/5 bg-[#090b16] overflow-hidden hover:border-white/10 hover:shadow-xl transition-all">
                <div className="relative h-48 overflow-hidden bg-white/5">
                  <img src={e.img} alt={e.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <span className="absolute top-4 left-4 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">{e.badge}</span>
                </div>
                <div className="p-5.5 space-y-3.5">
                  <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-bold">
                    <Clock className="h-3.5 w-3.5" /> {e.date}
                  </div>
                  <h4 className="text-lg font-black text-white group-hover:text-indigo-400 transition-colors leading-snug">{e.title}</h4>
                  <p className="text-sm text-gray-400 leading-relaxed">{e.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Box */}
      {!user && (
        <section className="py-20 relative overflow-hidden bg-gradient-to-tr from-indigo-950/40 via-purple-950/20 to-indigo-900/30 border-t border-white/5">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
          <div className="relative max-w-3xl mx-auto px-6 text-center space-y-6">
            <h3 className="text-3.5xl font-black tracking-tight text-white">Ready to Start Your Reading Adventure?</h3>
            <p className="text-gray-300 text-sm max-w-md mx-auto leading-relaxed">Join 500+ student bookworms at KV AFS Sulur. Log reading activities, earn custom badges, and climb classes league!</p>
            <Button onClick={() => navigate("/login")} size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white text-base px-8 h-13 rounded-xl font-bold shadow-xl shadow-indigo-600/25 border-0">
              Create Account Now <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-[#05060b] border-t border-white/5 py-12 text-sm text-gray-400">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 border-b border-white/5 pb-10">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-indigo-400" />
                </div>
                <h3 className="text-base font-extrabold text-white">PM SHRI KV AFS SULUR</h3>
              </div>
              <p className="text-xs leading-relaxed">Empowering student development, comprehension capabilities, and literature-focused gamified progress for Kendriya Vidyalaya learners.</p>
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
              <p className="text-xs leading-relaxed">
                Kendriya Vidyalaya AFS Sulur<br />
                Air Force Station Sulur, Coimbatore - 641401<br />
                Phone: +91 422 2682215
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-between pt-6 text-xs text-gray-500">
            <p>&copy; 2026 PM SHRI Kendriya Vidyalaya AFS Sulur. All rights reserved.</p>
            <div className="flex space-x-4 mt-3 sm:mt-0">
              <a href="#" className="hover:text-gray-400 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-gray-400 transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
