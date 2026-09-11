import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Zap, Play, X, Trophy } from "lucide-react";

interface LiveQuizAlertProps {
  onJoinLeague?: (session: any) => void;
}

// Prize structure
const PRIZE_POINTS: Record<string, number> = {
  "1": 5000,
  "2": 2500,
  "3": 1000,
};
const PRIZE_4_TO_10 = 800;
const PRIZE_OTHERS = 500;

export const getPrizeForRank = (rank: number): number => {
  if (rank === 1) return PRIZE_POINTS["1"];
  if (rank === 2) return PRIZE_POINTS["2"];
  if (rank === 3) return PRIZE_POINTS["3"];
  if (rank >= 4 && rank <= 10) return PRIZE_4_TO_10;
  return PRIZE_OTHERS;
};

export const LiveQuizAlert = ({ onJoinLeague }: LiveQuizAlertProps) => {
  const [activeSession, setActiveSession] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    checkActiveSessions();
    const channel = supabase.channel("live_alert_watch")
      .on("postgres_changes", { event: "*", schema: "public", table: "quiz_sessions" }, () => {
        checkActiveSessions();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const checkActiveSessions = async () => {
    // Check for active/waiting sessions OR sessions starting within the next 15 minutes
    const now = new Date();
    const in15Mins = new Date(now.getTime() + 15 * 60 * 1000).toISOString();

    const { data } = await supabase
      .from("quiz_sessions")
      .select("*, quizzes(*)")
      .or(`status.eq.waiting,and(status.eq.scheduled,scheduled_start_at.lte.${in15Mins})`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setActiveSession(data);
      setDismissed(false);
      setVisible(true);
    } else {
      setActiveSession(null);
      setVisible(false);
    }
  };

  const handleJoin = () => {
    if (onJoinLeague && activeSession) {
      onJoinLeague(activeSession);
    }
  };

  if (!activeSession || !visible || dismissed) return null;

  const quizTitle = activeSession.quizzes?.title || activeSession.league_name || "Live Quiz";
  const isLive = activeSession.status === "waiting";
  const scheduledAt = activeSession.scheduled_start_at
    ? new Date(activeSession.scheduled_start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    /* Floating popup: fixed bottom on mobile, top-right on desktop */
    <div
      className={`fixed z-[90] bottom-20 left-3 right-3 sm:bottom-auto sm:top-4 sm:left-auto sm:right-4 sm:w-[340px] 
        bg-indigo-600 rounded-2xl shadow-2xl shadow-indigo-800/40 text-white
        animate-in slide-in-from-bottom-4 sm:slide-in-from-right-4 duration-300
        border border-indigo-400/30`}
    >
      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="p-3.5 pr-8">
        {/* Header row */}
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="bg-yellow-400/20 p-1.5 rounded-full shrink-0 animate-pulse">
            <Zap className="h-4 w-4 text-yellow-300 fill-yellow-300" />
          </div>
          <div className="min-w-0">
            <p className="font-black text-sm leading-tight">
              {isLive ? "🔴 Live Quiz Now!" : "⏰ Starting Soon"}
            </p>
            <p className="text-indigo-200 text-xs truncate">{quizTitle}</p>
          </div>
        </div>

        {/* Prize teaser */}
        <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-2.5 py-1.5 mb-2.5 text-xs">
          <Trophy className="h-3.5 w-3.5 text-amber-300 shrink-0" />
          <span className="text-amber-200 font-bold">1st: 5000 pts</span>
          <span className="text-white/40">•</span>
          <span className="text-white/80">2nd: 2500</span>
          <span className="text-white/40">•</span>
          <span className="text-white/80">3rd: 1000</span>
        </div>

        {/* CTA row */}
        <div className="flex items-center gap-2">
          {scheduledAt && !isLive && (
            <span className="text-[11px] text-indigo-200 font-semibold">Starts {scheduledAt}</span>
          )}
          <Button
            onClick={handleJoin}
            size="sm"
            className="bg-white text-indigo-700 hover:bg-indigo-50 font-black text-xs h-8 px-3 rounded-xl ml-auto shrink-0 gap-1.5"
          >
            <Play className="h-3 w-3 fill-current" />
            {isLive ? "Join Now" : "Enter Lobby"}
          </Button>
        </div>
      </div>
    </div>
  );
};
