// @ts-nocheck
import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen, Zap, Star, Shield, Sparkles, UserPlus,
  ArrowRight, Trophy, Brain, Gamepad2
} from "lucide-react";

const features = [
  { icon: BookOpen, title: "Book Tracking", desc: "Track every book you read and build your reading history" },
  { icon: Zap, title: "Earn XP & Level Up", desc: "Gain experience points, unlock badges and climb the leaderboard" },
  { icon: Brain, title: "Quizzes & Challenges", desc: "Test your knowledge with live quizzes and reading challenges" },
  { icon: Gamepad2, title: "Games Corner", desc: "Play library-themed games and earn extra points" },
  { icon: Trophy, title: "Rankings & Rewards", desc: "Compete with classmates and win monthly recognition" },
  { icon: Sparkles, title: "AI Study Guide", desc: "Get personalised study help powered by AI" },
];

const InvitePage = () => {
  const { code } = useParams<{ code?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [inviterName, setInviterName] = useState<string | null>(null);
  const [resolvedCode, setResolvedCode] = useState<string | null>(null);
  const [resolving, setResolving] = useState(!!code);

  useEffect(() => {
    if (!code) return;
    const resolve = async () => {
      setResolving(true);
      try {
        const { data } = await supabase.rpc("resolve_invite_code", { p_code: code });
        if (data && data.length > 0) {
          setInviterName(data[0].inviter_name?.trim() || null);
          setResolvedCode(data[0].invite_code || code);
        }
      } catch (err) {
        console.error("resolve_invite_code error:", err);
      } finally {
        setResolving(false);
      }
    };
    resolve();
  }, [code]);

  const handleSignIn = () => {
    const ref = resolvedCode || code;
    navigate(ref ? `/login?ref=${encodeURIComponent(ref)}` : "/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNiI+PHBhdGggZD0iTTM2IDE0VjZoLTJ2OGgtOFYyaC0ydjEyaDEwem0wIDBoLTJ2OGgtOHYtOGgtMnYxMGgxMlYxNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
        <div className="absolute top-0 -left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 py-16 sm:py-20 text-center">
          {/* Logos */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="flex shrink-0 items-center gap-1 rounded-xl border border-white/20 bg-white/10 px-2 py-1.5 shadow-sm backdrop-blur-sm">
              <div className="h-9 w-9 flex items-center justify-center">
                <img src="/logos/pm-shri.png" alt="PM SHRI" className="h-full w-full object-contain" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
              </div>
              <div className="h-9 w-9 flex items-center justify-center">
                <img src="/logos/kv.png" alt="KV" className="h-full w-full object-contain" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
              </div>
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-white/90 leading-tight">PM SHRI KV AFS SULUR</p>
              <p className="text-[10px] text-white/60">Digital Library Management System</p>
            </div>
          </div>

          {/* Invitation message */}
          {resolving ? (
            <div className="flex justify-center mb-4">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          ) : inviterName ? (
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full px-4 py-2 mb-6 text-sm font-medium">
              <UserPlus className="h-4 w-4 text-yellow-300" />
              <span>
                <span className="text-yellow-300 font-semibold">{inviterName}</span> invited you to DLMS!
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full px-4 py-2 mb-6 text-sm font-medium">
              <BookOpen className="h-4 w-4 text-yellow-300" />
              <span>Welcome to DLMS — Your School Library, Reimagined</span>
            </div>
          )}

          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 leading-tight tracking-tight">
            Your Reading<br />Adventure<br />
            <span className="text-yellow-300">Starts Here 📚</span>
          </h1>
          <p className="text-white/75 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
            Track books, earn XP, play games and compete with classmates — all in one place.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              onClick={handleSignIn}
              className="h-13 px-8 text-base font-bold rounded-2xl bg-white text-indigo-700 hover:bg-yellow-50 border-0 shadow-lg gap-2"
            >
              Sign In to DLMS
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-white/50 text-xs mt-4">
            Use your admission number + password <strong className="text-white/70">Welcome@123</strong> to sign in
          </p>
        </div>
      </div>

      {/* Features grid */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
        <h2 className="text-center text-xl font-bold text-foreground mb-2">Why join DLMS?</h2>
        <p className="text-center text-sm text-muted-foreground mb-8">
          Everything your school library offers — now digital, gamified and in your pocket.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="border-border/50 hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA bottom */}
        <div className="mt-10 text-center">
          <Button
            size="lg"
            onClick={handleSignIn}
            className="h-13 px-8 text-base font-bold rounded-2xl gradient-primary border-0 shadow-lg gap-2"
          >
            Sign In Now — It's Free!
            <ArrowRight className="h-5 w-5" />
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            Already signed in?{" "}
            <button onClick={() => navigate("/student-dashboard")} className="text-primary hover:underline font-medium">
              Go to Dashboard →
            </button>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-6 px-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          PM SHRI KV AFS Sulur · Digital Library Management System ·{" "}
          <a href="https://dlms.kvsulur.in" className="text-primary hover:underline">dlms.kvsulur.in</a>
        </p>
      </footer>
    </div>
  );
};

export default InvitePage;
