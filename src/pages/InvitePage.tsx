// @ts-nocheck
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen, Zap, Sparkles, UserPlus, ArrowRight,
  Trophy, Brain, Gamepad2, ShieldCheck, CheckCircle2,
  Lock, BookMarked, Users, Award, ChevronRight
} from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "10,000+ Books Catalog",
    desc: "Search, check availability, and track all books in our school library.",
    gradient: "from-blue-500/20 to-indigo-500/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900",
  },
  {
    icon: Zap,
    title: "Earn XP & Level Up",
    desc: "Earn experience points for reading, review writing, and timely returns.",
    gradient: "from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900",
  },
  {
    icon: Brain,
    title: "Live Quiz Leagues",
    desc: "Compete with classmates in multiplayer library quizzes and win ranks.",
    gradient: "from-purple-500/20 to-violet-500/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900",
  },
  {
    icon: Gamepad2,
    title: "Library Games Corner",
    desc: "Play Wordle, Book Match, Word Scramble & Crosswords for extra points.",
    gradient: "from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900",
  },
  {
    icon: Trophy,
    title: "School Leaderboard",
    desc: "Climb your class rankings and earn prestigious rotational library badges.",
    gradient: "from-rose-500/20 to-pink-500/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900",
  },
  {
    icon: Sparkles,
    title: "AI Study Buddy",
    desc: "Get personalized NCERT study materials and reading summaries.",
    gradient: "from-indigo-500/20 to-sky-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900",
  },
];

const InvitePage = () => {
  const { code } = useParams<{ code?: string }>();
  const navigate = useNavigate();

  const [inviterName, setInviterName] = useState<string | null>(null);
  const [resolvedCode, setResolvedCode] = useState<string | null>(null);
  const [resolving, setResolving] = useState(!!code);

  useEffect(() => {
    if (!code) return;
    try {
      localStorage.setItem("dlms_invite_ref", code);
    } catch (_) {}

    const resolve = async () => {
      setResolving(true);
      try {
        const { data, error } = await supabase.rpc("resolve_invite_code", { p_code: code });
        if (!error && data && data.length > 0) {
          setInviterName(data[0].inviter_name?.trim() || null);
          const finalCode = data[0].invite_code || code;
          setResolvedCode(finalCode);
          try {
            localStorage.setItem("dlms_invite_ref", finalCode);
          } catch (_) {}
        }
      } catch (err) {
        console.warn("resolve_invite_code non-critical error:", err);
      } finally {
        setResolving(false);
      }
    };
    resolve();
  }, [code]);

  const handleSignIn = () => {
    const ref = resolvedCode || code;
    if (ref) {
      try {
        localStorage.setItem("dlms_invite_ref", ref);
      } catch (_) {}
    }
    navigate(ref ? `/login?ref=${encodeURIComponent(ref)}` : "/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-violet-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center -space-x-1.5 shrink-0">
              <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden p-0.5 shadow-2xs">
                <img src="/logos/pm-shri.png" alt="PM SHRI" className="w-full h-full object-contain" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden p-0.5 shadow-2xs">
                <img src="/logos/kv.png" alt="KV" className="w-full h-full object-contain" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-extrabold text-foreground truncate">PM SHRI KV AFS SULUR</p>
              <p className="text-[10px] text-muted-foreground truncate">Digital Library Management System</p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleSignIn}
            className="h-8 sm:h-9 px-3 sm:px-4 text-xs font-bold rounded-xl gradient-primary text-white shadow-xs shrink-0 gap-1.5"
          >
            <span>Sign In</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8 sm:space-y-12">
        {/* Hero Section */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white shadow-xl p-6 sm:p-10 md:p-12">
          {/* Background Patterns */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNiI+PHBhdGggZD0iTTM2IDE0VjZoLTJ2OGgtOFYyaC0ydjEyaDEwem0wIDBoLTJ2OGgtOHYtOGgtMnYxMGgxMlYxNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40" />
          <div className="absolute -top-20 -left-20 w-60 sm:w-80 h-60 sm:h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-72 sm:w-96 h-72 sm:h-96 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto text-center space-y-4 sm:space-y-6">
            {/* Inviter Badge */}
            {resolving ? (
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-semibold text-white/90">
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Checking invite...</span>
              </div>
            ) : inviterName ? (
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md border border-white/30 px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold text-white shadow-md animate-fade-in">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <UserPlus className="h-4 w-4 text-amber-300" />
                <span>
                  <strong className="text-amber-300">{inviterName}</strong> invited you to DLMS!
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md border border-white/20 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold text-white">
                <Sparkles className="h-4 w-4 text-amber-300" />
                <span>Official Student Reading Portal · KV AFS Sulur</span>
              </div>
            )}

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.15]">
              Your Reading Adventure <br />
              <span className="text-amber-300">Starts at DLMS 📚</span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-white/85 max-w-lg mx-auto leading-relaxed">
              Track borrowed books, play reading games, earn XP, and climb the class leaderboard — all in one school app.
            </p>

            {/* Quick Action */}
            <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                onClick={handleSignIn}
                className="w-full sm:w-auto h-12 sm:h-13 px-7 text-sm sm:text-base font-extrabold rounded-2xl bg-white text-indigo-700 hover:bg-amber-50 shadow-xl border-0 gap-2 transition-transform hover:scale-105 active:scale-95"
              >
                <span>Sign In with Admission Number</span>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>

            <p className="text-white/70 text-xs pt-1">
              🎉 <strong>+250 XP bonus</strong> credited when you sign in for the first time!
            </p>
          </div>
        </div>

        {/* First-Time Sign-In Instructions Card */}
        <Card className="rounded-3xl border border-border/60 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden">
          <CardContent className="p-5 sm:p-7 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-foreground">
                  Your Student Account is Already Ready!
                </h3>
                <p className="text-xs text-muted-foreground">
                  No registration needed — all student accounts are pre-created by the library.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/40 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                  <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[11px]">1</span>
                  <span>Username</span>
                </div>
                <p className="text-sm font-black text-foreground">5-Digit Admission No.</p>
                <p className="text-xs text-muted-foreground">e.g. 12345 (found on your school ID card)</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/40 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                  <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[11px]">2</span>
                  <span>Default Password</span>
                </div>
                <p className="text-sm font-black font-mono text-foreground">Welcome@123</p>
                <p className="text-xs text-muted-foreground">Case sensitive (with capital W)</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/40 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-[11px]">3</span>
                  <span>First Login Bonus</span>
                </div>
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">+250 XP Credited</p>
                <p className="text-xs text-muted-foreground">Instant XP reward on first login!</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Why Join DLMS Features Section */}
        <div className="space-y-4">
          <div className="text-center space-y-1 max-w-md mx-auto">
            <h2 className="text-xl sm:text-2xl font-black text-foreground">
              What's Waiting for You in DLMS
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Everything in PM SHRI KV AFS Sulur Library, accessible from your phone or PC.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {features.map(({ icon: Icon, title, desc, gradient }) => (
              <Card
                key={title}
                className="rounded-2xl border border-border/50 hover:border-border hover:shadow-md transition-all group overflow-hidden bg-card/60"
              >
                <CardContent className="p-4 sm:p-5 flex items-start gap-3.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border bg-gradient-to-br ${gradient} group-hover:scale-105 transition-transform`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <h4 className="text-sm font-bold text-foreground tracking-tight">{title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Bottom CTA Card */}
        <div className="rounded-3xl border border-primary/20 bg-gradient-to-r from-violet-600/10 via-purple-600/5 to-indigo-600/10 p-6 sm:p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground mx-auto flex items-center justify-center shadow-md">
            <BookMarked className="h-6 w-6" />
          </div>
          <h3 className="text-lg sm:text-xl font-black text-foreground">
            Ready to Start Reading?
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            Log in now with your admission number and password <strong>Welcome@123</strong> to claim your welcome bonus.
          </p>
          <div className="pt-2">
            <Button
              size="lg"
              onClick={handleSignIn}
              className="h-11 sm:h-12 px-8 font-bold rounded-xl gradient-primary text-white shadow-md gap-2"
            >
              <span>Sign In to DLMS</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6 px-4 text-center text-xs text-muted-foreground">
        <p>© PM SHRI Kendriya Vidyalaya AFS Sulur · Digital Library System</p>
        <p className="mt-1 text-[11px] text-muted-foreground/80">
          Main Domain: <a href="https://dlms.kvsulur.in" className="text-primary hover:underline font-medium">dlms.kvsulur.in</a>
        </p>
      </footer>
    </div>
  );
};

export default InvitePage;
