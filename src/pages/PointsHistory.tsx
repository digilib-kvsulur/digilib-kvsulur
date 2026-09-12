import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Zap, BookOpen, Brain, Flame, Award, Gamepad2, Timer, Trophy, Star, Activity,
  MessageCircle, Smartphone, CheckCircle2, ShieldCheck, Sparkles, User as UserIcon, ChevronsUpDown
} from "lucide-react";

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
  reading:       { icon: BookOpen,      color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-100 dark:bg-emerald-950/50", label: "Reading" },
  quiz:          { icon: Brain,         color: "text-purple-700 dark:text-purple-300",  bg: "bg-purple-100 dark:bg-purple-950/50",  label: "Quiz" },
  timely_return: { icon: CheckCircle2,  color: "text-blue-700 dark:text-blue-300",    bg: "bg-blue-100 dark:bg-blue-950/50",    label: "Timely Return" },
  streak:        { icon: Flame,         color: "text-orange-700 dark:text-orange-300",  bg: "bg-orange-100 dark:bg-orange-950/50",  label: "Daily Streak" },
  badge:         { icon: Award,         color: "text-amber-700 dark:text-amber-300",   bg: "bg-amber-100 dark:bg-amber-950/50",   label: "Badge" },
  game:          { icon: Gamepad2,      color: "text-indigo-700 dark:text-indigo-300",  bg: "bg-indigo-100 dark:bg-indigo-950/50",  label: "Game" },
  study:         { icon: Timer,         color: "text-teal-700 dark:text-teal-300",    bg: "bg-teal-100 dark:bg-teal-950/50",    label: "Study Session" },
  challenge:     { icon: Trophy,        color: "text-rose-700 dark:text-rose-300",    bg: "bg-rose-100 dark:bg-rose-950/50",    label: "Challenge" },
  community:     { icon: MessageCircle, color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-100 dark:bg-emerald-950/50", label: "WhatsApp Community" },
  pwa:           { icon: Smartphone,    color: "text-cyan-700 dark:text-cyan-300",    bg: "bg-cyan-100 dark:bg-cyan-950/50",    label: "App Install" },
  review:        { icon: Star,          color: "text-yellow-700 dark:text-yellow-300",  bg: "bg-yellow-100 dark:bg-yellow-950/50",  label: "Book Review" },
  event:         { icon: Sparkles,      color: "text-pink-700 dark:text-pink-300",    bg: "bg-pink-100 dark:bg-pink-950/50",    label: "Event Reward" },
  manual:        { icon: ShieldCheck,   color: "text-amber-700 dark:text-amber-300",   bg: "bg-amber-100 dark:bg-amber-950/50",   label: "Admin Bonus" },
  other:         { icon: Zap,           color: "text-slate-700 dark:text-slate-300",   bg: "bg-slate-100 dark:bg-slate-800",     label: "Points" },
};

const getTimeAgo = (d: string) => {
  if (!d) return "Recently";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const PointsHistoryPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryUserId = searchParams.get("userId");

  const [events, setEvents] = useState<PointEvent[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [targetProfile, setTargetProfile] = useState<any>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("student");
  const [isAdmin, setIsAdmin] = useState(false);
  const [studentList, setStudentList] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    initAuthAndLoad();
  }, [queryUserId]);

  const initAuthAndLoad = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      const { data: myProf } = await supabase
        .from("profiles")
        .select("id, role, first_name, last_name")
        .eq("id", user.id)
        .single();

      const adminUser = myProf?.role === "admin" || myProf?.role === "teacher";
      setIsAdmin(adminUser);
      setCurrentUserRole(myProf?.role || "student");

      if (adminUser) {
        // Load student list for admin picker
        const { data: students } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, student_class, admission_number, points")
          .eq("role", "student")
          .order("first_name");
        setStudentList(students || []);
      }

      const activeUid = (adminUser && queryUserId) ? queryUserId : user.id;
      setSelectedUserId(activeUid);
      await loadUserPointsHistory(activeUid);
    } catch (err) {
      console.error("Error initializing points history:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserPointsHistory = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, student_class, admission_number, points, role, whatsapp_reward_claimed, whatsapp_joined_at, pwa_installed_at, created_at")
        .eq("id", userId)
        .single();

      setTargetProfile(profile);
      setTotalPoints(profile?.points || 0);

      const allEvents: PointEvent[] = [];

      // 1. WhatsApp Community Reward (+250 XP)
      if ((profile as any)?.whatsapp_reward_claimed) {
        const m = SOURCE_META.community;
        allEvents.push({
          id: `wa-${userId}`,
          source: "community",
          points: 250,
          description: "Joined PM SHRI KV Sulur WhatsApp Community",
          created_at: (profile as any).whatsapp_joined_at || (profile as any).created_at || new Date().toISOString(),
          icon: m.icon,
          color: m.color,
          bg: m.bg,
        });
      }

      // 2. PWA App Installation Reward (+50 XP)
      if ((profile as any)?.pwa_installed_at) {
        const m = SOURCE_META.pwa;
        allEvents.push({
          id: `pwa-${userId}`,
          source: "pwa",
          points: 50,
          description: "Installed KV Sulur DLMS Web Application / PWA",
          created_at: (profile as any).pwa_installed_at,
          icon: m.icon,
          color: m.color,
          bg: m.bg,
        });
      }

      // Parallel fetch remaining point sources
      const [
        rhRes,
        qrRes,
        issuesRes,
        gpRes,
        ssRes,
        cpRes,
        badgesRes,
        reviewsRes,
        eventsRes,
        notifsRes,
        streakRes
      ] = await Promise.all([
        // 3. Reading history
        supabase
          .from("reading_history")
          .select("id, book_title, points_earned, completed_date")
          .eq("user_id", userId)
          .eq("status", "approved")
          .order("completed_date", { ascending: false })
          .limit(100),

        // 4. Quiz results
        supabase
          .from("quiz_results")
          .select("id, points_earned, completed_at, quizzes(title)")
          .eq("user_id", userId)
          .gt("points_earned", 0)
          .order("completed_at", { ascending: false })
          .limit(100),

        // 5. Timely Returned Books (100 pts each)
        supabase
          .from("book_issues")
          .select("id, return_date, due_date, books(title)")
          .eq("user_id", userId)
          .eq("status", "returned")
          .not("return_date", "is", null)
          .order("return_date", { ascending: false })
          .limit(100),

        // 6. Game plays
        supabase
          .from("game_plays")
          .select("id, game_key, points_earned, played_at")
          .eq("user_id", userId)
          .gt("points_earned", 0)
          .order("played_at", { ascending: false })
          .limit(100),

        // 7. Study sessions
        supabase
          .from("study_sessions")
          .select("id, material_title, points_earned, ended_at")
          .eq("user_id", userId)
          .gt("points_earned", 0)
          .not("ended_at", "is", null)
          .order("ended_at", { ascending: false })
          .limit(100),

        // 8. Reading challenge rewards
        supabase
          .from("challenge_progress")
          .select("id, is_claimed, completed_at, challenges(title, reward_points)")
          .eq("user_id", userId)
          .eq("is_claimed", true)
          .order("completed_at", { ascending: false })
          .limit(50),

        // 9. Badge Awards
        supabase
          .from("badge_awards")
          .select("id, awarded_at, note, badges(name, points, icon_name)")
          .eq("user_id", userId)
          .order("awarded_at", { ascending: false })
          .limit(50),

        // 10. Book Reviews
        supabase
          .from("book_reviews")
          .select("id, rating, created_at, books(title)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50),

        // 11. Event Submissions
        supabase
          .from("event_submissions")
          .select("id, submitted_at, status, library_events(title)")
          .eq("user_id", userId)
          .order("submitted_at", { ascending: false })
          .limit(50),

        // 12. Admin Bonus Notifications
        supabase
          .from("notifications")
          .select("id, title, message, created_at")
          .eq("target_user_id", userId)
          .eq("type", "points")
          .order("created_at", { ascending: false })
          .limit(50),

        // 13. Login streaks
        supabase
          .from("login_streaks")
          .select("current_streak, longest_streak, total_login_days, last_login_date")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      // Process Reading
      rhRes.data?.filter(r => (r.points_earned || 0) > 0).forEach(r => {
        const m = SOURCE_META.reading;
        allEvents.push({
          id: `rh-${r.id}`,
          source: "reading",
          points: r.points_earned || 0,
          description: `Finished reading "${r.book_title}"`,
          created_at: r.completed_date || new Date().toISOString(),
          icon: m.icon,
          color: m.color,
          bg: m.bg,
        });
      });

      // Process Quizzes
      qrRes.data?.forEach(q => {
        const m = SOURCE_META.quiz;
        allEvents.push({
          id: `qr-${q.id}`,
          source: "quiz",
          points: q.points_earned || 0,
          description: `Completed Quiz: ${(q as any).quizzes?.title || "Library Quiz"}`,
          created_at: q.completed_at,
          icon: m.icon,
          color: m.color,
          bg: m.bg,
        });
      });

      // Process Timely Returns
      issuesRes.data?.forEach(iss => {
        if (iss.return_date && iss.due_date && new Date(iss.return_date) <= new Date(iss.due_date)) {
          const m = SOURCE_META.timely_return;
          allEvents.push({
            id: `iss-${iss.id}`,
            source: "timely_return",
            points: 100,
            description: `Timely return of "${(iss as any).books?.title || "Library Book"}"`,
            created_at: iss.return_date,
            icon: m.icon,
            color: m.color,
            bg: m.bg,
          });
        }
      });

      // Process Game plays
      gpRes.data?.forEach(g => {
        const m = SOURCE_META.game;
        const name = g.game_key.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
        allEvents.push({
          id: `gp-${g.id}`,
          source: "game",
          points: g.points_earned,
          description: `Won Arcade Game: ${name}`,
          created_at: g.played_at,
          icon: m.icon,
          color: m.color,
          bg: m.bg,
        });
      });

      // Process Study sessions
      ssRes.data?.forEach(s => {
        const m = SOURCE_META.study;
        allEvents.push({
          id: `ss-${s.id}`,
          source: "study",
          points: s.points_earned,
          description: `Focused Study: ${s.material_title || "Study Materials"}`,
          created_at: s.ended_at || new Date().toISOString(),
          icon: m.icon,
          color: m.color,
          bg: m.bg,
        });
      });

      // Process Challenges
      cpRes.data?.forEach(c => {
        const m = SOURCE_META.challenge;
        const pts = (c as any).challenges?.reward_points || 0;
        if (pts > 0) {
          allEvents.push({
            id: `cp-${c.id}`,
            source: "challenge",
            points: pts,
            description: `Reading Challenge: ${(c as any).challenges?.title || "Completed Challenge"}`,
            created_at: c.completed_at || new Date().toISOString(),
            icon: m.icon,
            color: m.color,
            bg: m.bg,
          });
        }
      });

      // Process Badge Awards
      badgesRes.data?.forEach(b => {
        const m = SOURCE_META.badge;
        const pts = (b as any).badges?.points || 25;
        allEvents.push({
          id: `bdg-${b.id}`,
          source: "badge",
          points: pts,
          description: `Badge Earned: ${(b as any).badges?.name || "Library Achievement"}`,
          created_at: b.awarded_at,
          icon: m.icon,
          color: m.color,
          bg: m.bg,
        });
      });

      // Process Book Reviews (15 pts per review)
      reviewsRes.data?.forEach(rev => {
        const m = SOURCE_META.review;
        allEvents.push({
          id: `rev-${rev.id}`,
          source: "review",
          points: 15,
          description: `Book Review & Rating for "${(rev as any).books?.title || "Book"}"`,
          created_at: rev.created_at,
          icon: m.icon,
          color: m.color,
          bg: m.bg,
        });
      });

      // Process Event Submissions (50 pts for participation/approved)
      eventsRes.data?.forEach(ev => {
        const m = SOURCE_META.event;
        allEvents.push({
          id: `ev-${ev.id}`,
          source: "event",
          points: 50,
          description: `Event Submission: ${(ev as any).library_events?.title || "Library Event"}`,
          created_at: ev.submitted_at,
          icon: m.icon,
          color: m.color,
          bg: m.bg,
        });
      });

      // Process Admin Bonus Notifications
      notifsRes.data?.forEach(n => {
        const match = n.message.match(/(\d+)\s*points/i) || n.message.match(/(\d+)\s*xp/i);
        const pts = match ? parseInt(match[1]) : 50;
        // Avoid duplicate whatsapp notification
        if (!n.title.toLowerCase().includes("whatsapp")) {
          const m = SOURCE_META.manual;
          allEvents.push({
            id: `notif-${n.id}`,
            source: "manual",
            points: pts,
            description: `Admin Bonus: ${n.message.replace(/You have been awarded \d+ points\.\s*/i, "")}`,
            created_at: n.created_at,
            icon: m.icon,
            color: m.color,
            bg: m.bg,
          });
        }
      });

      // Process Streak bonus summary if active
      if (streakRes.data && streakRes.data.current_streak > 0) {
        const m = SOURCE_META.streak;
        allEvents.push({
          id: `streak-${userId}`,
          source: "streak",
          points: streakRes.data.current_streak * 10,
          description: `Daily Streak Bonus (${streakRes.data.current_streak} days active streak)`,
          created_at: streakRes.data.last_login_date || new Date().toISOString(),
          icon: m.icon,
          color: m.color,
          bg: m.bg,
        });
      }

      // Sort all events descending by date
      allEvents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setEvents(allEvents);
    } catch (err) {
      console.error("Error loading user points history:", err);
    }
  };

  const handleStudentSelect = (uid: string) => {
    setSelectedUserId(uid);
    setSearchParams({ userId: uid });
    loadUserPointsHistory(uid);
  };

  const filtered = filter === "all" ? events : events.filter(e => e.source === filter);
  const totalFiltered = filtered.reduce((acc, e) => acc + e.points, 0);
  const sources = Array.from(new Set(events.map(e => e.source)));

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
                <Zap className="h-6 w-6 text-primary" /> Points & XP History
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Complete breakdown of all library activities, quizzes, challenges, and rewards.
              </p>
            </div>
          </div>

          {/* Admin Student Picker */}
          {isAdmin && studentList.length > 0 && (
            <div className="flex items-center gap-2 bg-card p-2 rounded-2xl border border-border shadow-xs">
              <UserIcon className="h-4 w-4 text-muted-foreground ml-1" />
              <Select value={selectedUserId} onValueChange={handleStudentSelect}>
                <SelectTrigger className="w-[220px] sm:w-[260px] h-9 text-xs font-semibold">
                  <SelectValue placeholder="Select Student to Inspect" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {studentList.map(st => (
                    <SelectItem key={st.id} value={st.id} className="text-xs">
                      {st.first_name} {st.last_name} {st.student_class ? `(Class ${st.student_class})` : ""} · {st.points || 0} XP
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Inspected User Profile Card (if viewing as Admin or Self) */}
        {targetProfile && (
          <Card className="border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-background shadow-xs">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-foreground">
                    {targetProfile.first_name} {targetProfile.last_name}
                  </h2>
                  <Badge variant="outline" className="text-[10px] capitalize font-semibold">
                    {targetProfile.role || "student"}
                  </Badge>
                  {targetProfile.student_class && (
                    <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">
                      Class {targetProfile.student_class}
                    </Badge>
                  )}
                  {targetProfile.admission_number && (
                    <span className="font-mono text-xs text-muted-foreground">
                      Adm: {targetProfile.admission_number}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Member of PM SHRI KV Sulur Digital Library
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-2xl sm:text-3xl font-black text-primary">{totalPoints.toLocaleString()}</p>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total XP Balance</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card className="border-border/60 bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <p className="text-2xl sm:text-3xl font-extrabold text-primary">{totalPoints.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">Current XP Balance</p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-4">
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground">{events.length}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">Total History Events</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 col-span-2 sm:col-span-1">
            <CardContent className="p-4">
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
                {events.reduce((a, e) => a + e.points, 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">Total XP Calculated</p>
            </CardContent>
          </Card>
        </div>

        {/* Source Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
              filter === "all"
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-muted/60 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            All Sources ({events.length})
          </button>
          {sources.map(src => {
            const m = SOURCE_META[src] || SOURCE_META.other;
            const cnt = events.filter(e => e.source === src).length;
            return (
              <button
                key={src}
                onClick={() => setFilter(src)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                  filter === src
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-muted/60 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <m.icon className="h-3.5 w-3.5" />
                {m.label} ({cnt})
              </button>
            );
          })}
        </div>

        {/* Event Timeline / List */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                {filter === "all" ? "All Points Activity" : `${SOURCE_META[filter]?.label || "Points"} Log`}
              </CardTitle>
              <Badge variant="secondary" className="text-xs font-bold">
                +{totalFiltered.toLocaleString()} XP
              </Badge>
            </div>
            {filter !== "all" && <CardDescription>Showing {filtered.length} activities</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-2.5">
            {loading ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Zap className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-bold">No points activity found</p>
                <p className="text-xs mt-1">
                  {filter !== "all"
                    ? `No entries recorded for ${SOURCE_META[filter]?.label || filter}.`
                    : "Read books, complete quizzes, join the WhatsApp community, and play games to earn XP!"}
                </p>
              </div>
            ) : (
              filtered.map(ev => (
                <div
                  key={ev.id}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-muted/20 hover:bg-muted/50 transition-colors border border-border/50"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${ev.bg}`}>
                    <ev.icon className={`h-5 w-5 ${ev.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-foreground truncate">{ev.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-normal capitalize">
                        {SOURCE_META[ev.source]?.label || ev.source}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">{getTimeAgo(ev.created_at)}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                      +{ev.points}
                    </span>
                    <p className="text-[9px] font-bold text-muted-foreground">XP</p>
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

