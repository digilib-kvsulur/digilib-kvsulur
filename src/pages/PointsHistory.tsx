import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Zap, BookOpen, Brain, Flame, Award, Gamepad2, Timer, Trophy, Star, Activity } from "lucide-react";

interface PointEvent {
  id: string;
  source: string;
  points: number;
  description: string;
  created_at: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}

const SOURCE_META: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  reading:    { icon: BookOpen, color: "text-emerald-700", bg: "bg-emerald-100", label: "Reading" },
  quiz:       { icon: Brain,    color: "text-purple-700",  bg: "bg-purple-100",  label: "Quiz" },
  streak:     { icon: Flame,    color: "text-orange-700",  bg: "bg-orange-100",  label: "Daily Streak" },
  badge:      { icon: Award,    color: "text-amber-700",   bg: "bg-amber-100",   label: "Badge" },
  game:       { icon: Gamepad2, color: "text-blue-700",    bg: "bg-blue-100",    label: "Game" },
  study:      { icon: Timer,    color: "text-teal-700",    bg: "bg-teal-100",    label: "Study Session" },
  challenge:  { icon: Trophy,   color: "text-rose-700",    bg: "bg-rose-100",    label: "Challenge" },
  manual:     { icon: Star,     color: "text-yellow-700",  bg: "bg-yellow-100",  label: "Admin Bonus" },
  other:      { icon: Zap,      color: "text-slate-700",   bg: "bg-slate-100",   label: "Points" },
};

const getTimeAgo = (d: string) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const PointsHistoryPage = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<PointEvent[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      const { data: profile } = await supabase.from("profiles").select("points").eq("id", user.id).single();
      setTotalPoints(profile?.points || 0);

      const allEvents: PointEvent[] = [];

      // Reading history
      const { data: rh } = await supabase
        .from("reading_history")
        .select("id, book_title, points_earned, completed_date")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .order("completed_date", { ascending: false })
        .limit(50);
      rh?.filter(r => (r.points_earned || 0) > 0).forEach(r => {
        const m = SOURCE_META.reading;
        allEvents.push({ id: `rh-${r.id}`, source: "reading", points: r.points_earned || 0, description: `Finished reading "${r.book_title}"`, created_at: r.completed_date, icon: m.icon, color: m.color, bg: m.bg });
      });

      // Quiz results
      const { data: qr } = await supabase
        .from("quiz_results")
        .select("id, points_earned, completed_at, quizzes(title)")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(50);
      qr?.filter(q => (q.points_earned || 0) > 0).forEach(q => {
        const m = SOURCE_META.quiz;
        allEvents.push({ id: `qr-${q.id}`, source: "quiz", points: q.points_earned || 0, description: `Quiz: ${(q as any).quizzes?.title || "Completed quiz"}`, created_at: q.completed_at, icon: m.icon, color: m.color, bg: m.bg });
      });

      // Game plays
      const { data: gp } = await supabase
        .from("game_plays")
        .select("id, game_key, points_earned, played_at")
        .eq("user_id", user.id)
        .gt("points_earned", 0)
        .order("played_at", { ascending: false })
        .limit(50);
      gp?.forEach(g => {
        const m = SOURCE_META.game;
        const name = g.game_key.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
        allEvents.push({ id: `gp-${g.id}`, source: "game", points: g.points_earned, description: `Won: ${name}`, created_at: g.played_at, icon: m.icon, color: m.color, bg: m.bg });
      });

      // Study sessions
      const { data: ss } = await supabase
        .from("study_sessions")
        .select("id, material_title, points_earned, ended_at")
        .eq("user_id", user.id)
        .gt("points_earned", 0)
        .not("ended_at", "is", null)
        .order("ended_at", { ascending: false })
        .limit(50);
      ss?.forEach(s => {
        const m = SOURCE_META.study;
        allEvents.push({ id: `ss-${s.id}`, source: "study", points: s.points_earned, description: `Study session: ${s.material_title || "General study"}`, created_at: s.ended_at, icon: m.icon, color: m.color, bg: m.bg });
      });

      // Challenge rewards
      const { data: cp } = await supabase
        .from("challenge_progress")
        .select("id, is_claimed, completed_at, challenges(title, reward_points)")
        .eq("user_id", user.id)
        .eq("is_claimed", true)
        .order("completed_at", { ascending: false })
        .limit(20);
      cp?.forEach(c => {
        const m = SOURCE_META.challenge;
        const pts = (c as any).challenges?.reward_points || 0;
        if (pts > 0) {
          allEvents.push({ id: `cp-${c.id}`, source: "challenge", points: pts, description: `Challenge: ${(c as any).challenges?.title || "Completed challenge"}`, created_at: c.completed_at, icon: m.icon, color: m.color, bg: m.bg });
        }
      });

      // Sort all by date desc
      allEvents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setEvents(allEvents);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === "all" ? events : events.filter(e => e.source === filter);
  const totalFiltered = filtered.reduce((acc, e) => acc + e.points, 0);

  const sources = Array.from(new Set(events.map(e => e.source)));

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" /> Points History
            </h1>
            <p className="text-sm text-muted-foreground">Every XP point you've ever earned</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card className="border-border/50 bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <p className="text-3xl font-extrabold text-primary">{totalPoints.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">Total XP Balance</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-3xl font-extrabold text-foreground">{events.length}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">Total Events</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 col-span-2 sm:col-span-1">
            <CardContent className="p-4">
              <p className="text-3xl font-extrabold text-foreground">
                {events.reduce((a, e) => a + e.points, 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">XP Earned (all time)</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-primary/40"}`}
          >
            All ({events.length})
          </button>
          {sources.map(src => {
            const m = SOURCE_META[src] || SOURCE_META.other;
            const cnt = events.filter(e => e.source === src).length;
            return (
              <button
                key={src}
                onClick={() => setFilter(src)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors flex items-center gap-1 ${filter === src ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-primary/40"}`}
              >
                <m.icon className="h-3 w-3" />
                {m.label} ({cnt})
              </button>
            );
          })}
        </div>

        {/* Event List */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                {filter === "all" ? "All Events" : SOURCE_META[filter]?.label || "Events"}
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {totalFiltered.toLocaleString()} XP
              </Badge>
            </div>
            {filter !== "all" && <CardDescription>Showing {filtered.length} events</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Zap className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">No events yet</p>
                <p className="text-xs mt-1">Start reading, playing games and taking quizzes to earn XP!</p>
              </div>
            ) : (
              filtered.map(ev => (
                <div key={ev.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors border border-transparent hover:border-border/50">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${ev.bg}`}>
                    <ev.icon className={`h-5 w-5 ${ev.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{ev.description}</p>
                    <p className="text-xs text-muted-foreground">{getTimeAgo(ev.created_at)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-sm font-bold text-emerald-600">+{ev.points}</span>
                    <p className="text-[10px] text-muted-foreground">XP</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PointsHistoryPage;
