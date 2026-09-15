import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Zap, Play, X, Trophy, Timer } from "lucide-react";

interface LiveQuizAlertProps {
  onJoinLeague?: (session: any) => void;
}

// Prize structure (exported for reuse)
const PRIZE_POINTS: Record<string, number> = { "1": 5000, "2": 2500, "3": 1000 };
const PRIZE_4_TO_10 = 800;
const PRIZE_OTHERS = 500;

export const getPrizeForRank = (rank: number): number => {
  if (rank === 1) return PRIZE_POINTS["1"];
  if (rank === 2) return PRIZE_POINTS["2"];
  if (rank === 3) return PRIZE_POINTS["3"];
  if (rank >= 4 && rank <= 10) return PRIZE_4_TO_10;
  return PRIZE_OTHERS;
};

const ONE_HOUR_MS = 60 * 60 * 1000;

const formatCountdown = (ms: number): string => {
  if (ms <= 0) return "Starting Now!";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export const LiveQuizAlert = ({ onJoinLeague }: LiveQuizAlertProps) => {
  const [activeSession, setActiveSession] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [countdown, setCountdown] = useState<number>(0);

  useEffect(() => {
    checkActiveSessions();
    const channel = supabase
      .channel("live_alert_watch")
      .on("postgres_changes", { event: "*", schema: "public", table: "quiz_sessions" }, () => {
        checkActiveSessions();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Live countdown ticker
  useEffect(() => {
    if (!activeSession?.scheduled_start_at) return;
    const tick = () => {
      const ms = new Date(activeSession.scheduled_start_at).getTime() - Date.now();
      setCountdown(Math.max(0, ms));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeSession]);

  const checkActiveSessions = async () => {
    const now = new Date();
    const in1Hour = new Date(now.getTime() + ONE_HOUR_MS).toISOString();

    const { data } = await supabase
      .from("quiz_sessions")
      .select("*, quizzes(*)")
      .or(`status.eq.active,and(status.eq.waiting,or(scheduled_start_at.is.null,scheduled_start_at.lte.${in1Hour})),and(status.eq.scheduled,scheduled_start_at.lte.${in1Hour})`)
      .neq("status", "finished")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      // Extra client-side guard: if scheduled_start_at is > 1 hour away, hide popup
      if (data.scheduled_start_at) {
        const msUntilStart = new Date(data.scheduled_start_at).getTime() - Date.now();
        if (msUntilStart > ONE_HOUR_MS) {
          setActiveSession(null);
          setVisible(false);
          return;
        }
      }
      setActiveSession(data);
      setDismissed(false);
      setVisible(true);
    } else {
      setActiveSession(null);
      setVisible(false);
    }
  };

  const handleJoin = () => {
    if (onJoinLeague && activeSession) onJoinLeague(activeSession);
  };

  if (!activeSession || !visible || dismissed) return null;

  const quizTitle = activeSession.quizzes?.title || activeSession.league_name || "Live Quiz";
  const isLive = activeSession.status === "waiting" || activeSession.status === "active";
  const hasSchedule = !!activeSession.scheduled_start_at;
  const scheduledDate = hasSchedule
    ? new Date(activeSession.scheduled_start_at).toLocaleDateString([], { day: "2-digit", month: "short" })
    : null;
  const scheduledTime = hasSchedule
    ? new Date(activeSession.scheduled_start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  // Urgency level for countdown styling
  const isUrgent = countdown > 0 && countdown < 5 * 60 * 1000; // < 5 mins

  return (
    <div
      className={`fixed z-[90] bottom-20 left-3 right-3 sm:bottom-auto sm:top-4 sm:left-auto sm:right-4 sm:w-[360px]
        bg-indigo-600 rounded-2xl shadow-2xl shadow-indigo-800/50 text-white
        animate-in slide-in-from-bottom-4 sm:slide-in-from-right-4 duration-300
        border border-indigo-400/30`}
    >
      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="p-3.5 pr-8 space-y-2.5">
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="bg-yellow-400/20 p-1.5 rounded-full shrink-0 animate-pulse">
            <Zap className="h-4 w-4 text-yellow-300 fill-yellow-300" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-black text-sm leading-tight">
              {isLive ? "🔴 Live Quiz Now!" : "⏰ Starting Soon"}
            </p>
            <p className="text-indigo-200 text-xs truncate">{quizTitle}</p>
          </div>
        </div>

        {/* Countdown timer — show when scheduled */}
        {hasSchedule && (
          <div
            className={`flex items-center justify-between rounded-xl px-3 py-2 ${
              isUrgent
                ? "bg-red-500/30 border border-red-400/50 animate-pulse"
                : "bg-black/30 border border-white/10"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5 text-amber-300 shrink-0" />
              <span className="text-[11px] text-white/70 font-semibold">
                {isLive ? "Now Live" : "Starts in"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {!isLive && (
                <span className={`font-mono font-black text-base tracking-wider ${isUrgent ? "text-red-300" : "text-amber-300"}`}>
                  {formatCountdown(countdown)}
                </span>
              )}
              {scheduledDate && scheduledTime && (
                <span className="text-[10px] text-white/50 font-mono">
                  {scheduledDate} · {scheduledTime}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Prize teaser */}
        <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-2.5 py-1.5 text-xs">
          <Trophy className="h-3.5 w-3.5 text-amber-300 shrink-0" />
          <span className="text-amber-200 font-bold">1st: 5,000 pts</span>
          <span className="text-white/40">•</span>
          <span className="text-white/80">2nd: 2,500</span>
          <span className="text-white/40">•</span>
          <span className="text-white/80">3rd: 1,000</span>
        </div>

        {/* CTA */}
        <div className="flex items-center justify-end">
          <Button
            onClick={handleJoin}
            size="sm"
            className="bg-white text-indigo-700 hover:bg-indigo-50 font-black text-xs h-8 px-4 rounded-xl gap-1.5"
          >
            <Play className="h-3 w-3 fill-current" />
            {isLive ? "Join Now" : "Enter Lobby"}
          </Button>
        </div>
      </div>
    </div>
  );
};
