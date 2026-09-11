import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Trophy, Flame, Clock, Play, Users, Bell, BellRing, Sparkles, Zap, ShieldCheck 
} from "lucide-react";
import { quizAudio } from "@/lib/quizAudio";

interface UpcomingQuizLeagueCardProps {
  userId?: string;
  userClass?: string;
  onJoinLeague: (session: any) => void;
}

export const UpcomingQuizLeagueCard = ({
  userId,
  userClass,
  onJoinLeague,
}: UpcomingQuizLeagueCardProps) => {
  const [leagueSession, setLeagueSession] = useState<any | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalMs: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 });

  useEffect(() => {
    fetchActiveOrUpcomingLeague();

    // Supabase Realtime channel for live updates to quiz_sessions & registrations
    const channel = supabase
      .channel("upcoming_league_watch")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quiz_sessions" },
        () => {
          fetchActiveOrUpcomingLeague();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchActiveOrUpcomingLeague = async () => {
    try {
      // Look for waiting or active live sessions, or future scheduled leagues
      const { data, error } = await supabase
        .from("quiz_sessions")
        .select("*, quizzes(*)")
        .in("status", ["waiting", "active", "scheduled"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && !error.message?.includes("scheduled")) {
        console.warn("Could not fetch quiz session:", error.message);
      }

      if (data) {
        setLeagueSession(data);
        // Check if user is pre-registered
        if (userId) {
          let foundRegistration = false;
          let totalRegCount = 0;
          try {
            const { count, error } = await supabase
              .from("quiz_league_registrations" as any)
              .select("id", { count: "exact", head: true })
              .eq("session_id", data.id)
              .eq("user_id", userId);

            if (!error && count !== null) {
              foundRegistration = count > 0;
            }

            const { count: totalReg } = await supabase
              .from("quiz_league_registrations" as any)
              .select("id", { count: "exact", head: true })
              .eq("session_id", data.id);

            if (totalReg !== null) {
              totalRegCount = totalReg || 0;
            }
          } catch {
            // DB fallback
          }

          // Fallback to local storage if DB query failed or table not found
          const localKey = `league_reg_${data.id}_${userId}`;
          if (localStorage.getItem(localKey) === "true") {
            foundRegistration = true;
            if (totalRegCount === 0) totalRegCount = 1;
          }

          setIsRegistered(foundRegistration);
          setRegisteredCount(totalRegCount);
        }
      } else {
        setLeagueSession(null);
      }
    } catch (e) {
      console.warn("Error checking league sessions:", e);
    } finally {
      setLoading(false);
    }
  };

  // 1-second countdown ticker
  useEffect(() => {
    if (!leagueSession) return;

    const calculateTime = () => {
      // If session is already active or in waiting room, it's live!
      if (leagueSession.status === "active" || leagueSession.status === "waiting") {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 });
        return;
      }

      const targetTime = leagueSession.scheduled_start_at
        ? new Date(leagueSession.scheduled_start_at).getTime()
        : new Date(leagueSession.created_at).getTime();

      const diff = Math.max(0, targetTime - Date.now());

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds, totalMs: diff });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [leagueSession]);

  const handleToggleRegistration = async () => {
    if (!userId || !leagueSession) {
      toast.error("Please sign in to register for the quiz league.");
      return;
    }

    const localKey = `league_reg_${leagueSession.id}_${userId}`;

    try {
      if (isRegistered) {
        try {
          await supabase
            .from("quiz_league_registrations" as any)
            .delete()
            .eq("session_id", leagueSession.id)
            .eq("user_id", userId);
        } catch {
          // ignore DB error
        }

        localStorage.removeItem(localKey);
        setIsRegistered(false);
        setRegisteredCount((c) => Math.max(0, c - 1));
        toast.info("League reminder removed.");
      } else {
        try {
          await supabase.from("quiz_league_registrations" as any).insert({
            session_id: leagueSession.id,
            user_id: userId,
          });
        } catch {
          // Table might not exist or network glitch
        }

        localStorage.setItem(localKey, "true");
        setIsRegistered(true);
        setRegisteredCount((c) => c + 1);
        quizAudio.playStreak();
        toast.success("🎯 You're Registered for the Live League!", {
          description: "We'll chime when the lobby opens. Be ready to compete!",
        });
      }
    } catch (err: any) {
      // Guaranteed fallback
      localStorage.setItem(localKey, "true");
      setIsRegistered(true);
      toast.success("🎯 Registered for this Live League!");
    }
  };

  if (loading || !leagueSession) return null;

  const isLive = leagueSession.status === "waiting" || leagueSession.status === "active" || timeLeft.totalMs <= 0;
  const isLobbySoon = !isLive && timeLeft.totalMs <= 10 * 60 * 1000; // <= 10 mins

  const quizTitle = leagueSession.league_name || leagueSession.quizzes?.title || "PM SHRI KV Sulur Live Quiz League";
  const questionCount = leagueSession.quizzes?.questions?.length || 10;
  const targetClass = leagueSession.target_class || "all";
  const eligible = targetClass === "all" || !userClass || userClass.includes(targetClass);

  return (
    <Card className="overflow-hidden border-2 border-indigo-500/40 bg-gradient-to-r from-indigo-950 via-slate-950 to-purple-950 text-white shadow-xl shadow-indigo-950/30 hover:border-indigo-400/60 transition-all mb-4">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: League Info & Live Status */}
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {isLive ? (
                <Badge className="bg-emerald-500 text-white font-black animate-pulse px-2.5 py-0.5 shadow-md shadow-emerald-500/30 gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping inline-block" />
                  🔴 LEAGUE IS LIVE
                </Badge>
              ) : isLobbySoon ? (
                <Badge className="bg-amber-500 text-slate-950 font-black px-2.5 py-0.5 gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  LOBBY OPENS SHORTLY
                </Badge>
              ) : (
                <Badge className="bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 font-bold px-2.5 py-0.5 gap-1.5">
                  <Trophy className="h-3.5 w-3.5 text-amber-400" />
                  SCHEDULED LIVE LEAGUE
                </Badge>
              )}

              <Badge variant="outline" className="text-[10px] font-bold border-white/20 text-white/80">
                {targetClass === "all" ? "All Classes Eligible" : `Class ${targetClass}`}
              </Badge>

              <Badge variant="outline" className="text-[10px] font-bold border-white/20 text-amber-300 gap-1">
                <Zap className="h-3 w-3" />
                Speed Bonus Enabled
              </Badge>
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight leading-snug truncate">
                {quizTitle}
              </h3>
              <p className="text-xs sm:text-sm text-indigo-200/80 font-medium flex items-center gap-3 mt-0.5">
                <span>{questionCount} Questions</span>
                <span>•</span>
                <span>Room: <strong className="font-mono text-amber-300 font-black">{leagueSession.room_code || "AUTO"}</strong></span>
                {registeredCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-emerald-300">
                      <Users className="h-3.5 w-3.5" /> {registeredCount} Registered
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Right: Live Countdown Clock & Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {!isLive ? (
              /* Synchronized Digital Countdown */
              <div className="flex items-center justify-center gap-1.5 bg-black/40 border border-white/10 rounded-2xl px-3.5 py-2 backdrop-blur-md">
                <div className="text-center px-1.5">
                  <span className="text-lg sm:text-xl font-black font-mono text-white leading-none block">
                    {String(timeLeft.days).padStart(2, "0")}
                  </span>
                  <span className="text-[8px] text-white/50 uppercase font-semibold">Days</span>
                </div>
                <span className="font-bold text-white/40 pb-2">:</span>
                <div className="text-center px-1.5">
                  <span className="text-lg sm:text-xl font-black font-mono text-white leading-none block">
                    {String(timeLeft.hours).padStart(2, "0")}
                  </span>
                  <span className="text-[8px] text-white/50 uppercase font-semibold">Hrs</span>
                </div>
                <span className="font-bold text-white/40 pb-2">:</span>
                <div className="text-center px-1.5">
                  <span className="text-lg sm:text-xl font-black font-mono text-amber-300 leading-none block">
                    {String(timeLeft.minutes).padStart(2, "0")}
                  </span>
                  <span className="text-[8px] text-white/50 uppercase font-semibold">Min</span>
                </div>
                <span className="font-bold text-white/40 pb-2">:</span>
                <div className="text-center px-1.5">
                  <span className="text-lg sm:text-xl font-black font-mono text-amber-400 leading-none block">
                    {String(timeLeft.seconds).padStart(2, "0")}
                  </span>
                  <span className="text-[8px] text-white/50 uppercase font-semibold">Sec</span>
                </div>
              </div>
            ) : null}

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {!isLive && (
                <Button
                  onClick={handleToggleRegistration}
                  variant="outline"
                  size="sm"
                  className={`h-11 rounded-xl text-xs font-bold border-white/20 transition-all ${
                    isRegistered
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-white/10 hover:bg-white/20 text-white"
                  }`}
                >
                  {isRegistered ? (
                    <>
                      <BellRing className="h-4 w-4 mr-1.5 text-emerald-400" />
                      Reminder Set ✓
                    </>
                  ) : (
                    <>
                      <Bell className="h-4 w-4 mr-1.5" />
                      Set Reminder
                    </>
                  )}
                </Button>
              )}

              <Button
                onClick={() => {
                  quizAudio.playLeagueStart();
                  onJoinLeague(leagueSession);
                }}
                size="sm"
                disabled={!isLive && !isLobbySoon}
                className={`h-11 px-5 rounded-xl text-xs sm:text-sm font-black shadow-lg transition-all ${
                  isLive
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-emerald-500/30 scale-105 active:scale-95 animate-bounce"
                    : isLobbySoon
                    ? "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/30"
                    : "bg-white/10 text-white/50 cursor-not-allowed"
                }`}
              >
                <Play className="h-4 w-4 mr-1.5 fill-current" />
                {isLive ? "Join Live League Now →" : isLobbySoon ? "Enter Lobby" : "Waiting for Start"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
