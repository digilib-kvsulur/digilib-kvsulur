import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Play, Loader2, Copy, Check, Calendar, Clock, Sparkles, Volume2, ShieldCheck, LogOut, Share2 } from "lucide-react";
import { quizAudio } from "@/lib/quizAudio";

interface MultiplayerLobbyProps {
  quizId: string;
  quizTitle: string;
  isHost: boolean;
  existingSessionId?: string;
  onStart: (sessionId: string) => void;
  onCancel: () => void;
}

export const MultiplayerLobby = ({
  quizId,
  quizTitle,
  isHost,
  existingSessionId,
  onStart,
  onCancel,
}: MultiplayerLobbyProps) => {
  const [participants, setParticipants] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(existingSessionId || null);
  const [roomCode, setRoomCode] = useState<string>("");
  const [scheduledStart, setScheduledStart] = useState<string | null>(null);
  const [autoStart, setAutoStart] = useState<boolean>(false);
  const [timeUntilStart, setTimeUntilStart] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    setupLobby();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  const setupLobby = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      let currentSession: any;

      if (existingSessionId) {
        // Fetch existing scheduled or active session
        const { data, error } = await supabase
          .from("quiz_sessions")
          .select("*")
          .eq("id", existingSessionId)
          .single();

        if (error) throw error;
        currentSession = data;

        // If host opens scheduled session, transition status to 'waiting'
        if (isHost && currentSession.status === "scheduled") {
          await supabase
            .from("quiz_sessions")
            .update({ status: "waiting" })
            .eq("id", existingSessionId);
        }
      } else if (isHost) {
        // Generate random 6-character room code
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const { data, error } = await supabase
          .from("quiz_sessions")
          .insert({
            quiz_id: quizId,
            host_id: user.id,
            status: "waiting",
            room_code: code,
          })
          .select()
          .single();

        if (error) throw error;
        currentSession = data;
      } else {
        // Student joining by quizId
        const { data, error } = await supabase
          .from("quiz_sessions")
          .select("*")
          .eq("quiz_id", quizId)
          .in("status", ["waiting", "scheduled"])
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error) throw error;
        currentSession = data;
      }

      setSessionId(currentSession.id);
      setRoomCode(currentSession.room_code || "ROOM");
      if (currentSession.scheduled_start_at) {
        setScheduledStart(currentSession.scheduled_start_at);
      }
      if (currentSession.auto_start) {
        setAutoStart(true);
      }

      // Supabase Realtime Presence Channel
      const channel = supabase.channel(`quiz_lobby_${currentSession.id}`);
      channelRef.current = channel;

      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState();
          const p = Object.values(state).flatMap((users) => users);
          setParticipants(p);
        })
        .on("presence", { event: "join" }, ({ newPresences }) => {
          quizAudio.playTick();
        })
        .on("broadcast", { event: "start_quiz" }, () => {
          quizAudio.playLeagueStart();
          onStart(currentSession.id);
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            const { data: profile } = await supabase
              .from("profiles")
              .select("first_name, last_name, avatar_url, student_class")
              .eq("id", user.id)
              .maybeSingle();

            const displayName = profile
              ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Student"
              : "Student";

            await channel.track({
              user_id: user.id,
              name: displayName,
              student_class: profile?.student_class || "",
              avatar_url: profile?.avatar_url,
              is_host: isHost,
            });

            setLoading(false);
          }
        });
    } catch (e: any) {
      console.error("Failed to join lobby:", e);
      toast.error("Failed to join lobby: " + (e.message || "Unknown error"));
      onCancel();
    }
  };

  // Live countdown to scheduled start time
  useEffect(() => {
    if (!scheduledStart) return;

    const interval = setInterval(() => {
      const diff = new Date(scheduledStart).getTime() - Date.now();
      if (diff <= 0) {
        setTimeUntilStart("Starting now!");
        clearInterval(interval);
        // If host and auto-start enabled, launch automatically!
        if (isHost && autoStart && sessionId) {
          handleStart();
        }
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeUntilStart(`${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [scheduledStart, autoStart, isHost, sessionId]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    toast.success(`Room Code ${roomCode} copied to clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareCode = async () => {
    const shareUrl = `${window.location.origin}/student-dashboard?tab=quizzes&room=${roomCode}`;
    const shareText = `🏆 Join the PM SHRI KV Sulur Live Quiz League!\nQuiz: ${quizTitle}\nRoom Code: ${roomCode}\nLink: ${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join Quiz League - ${quizTitle}`,
          text: shareText,
          url: shareUrl,
        });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
        return;
      } catch (e: any) {
        if (e.name !== "AbortError") {
          navigator.clipboard.writeText(shareText);
          toast.success("Share link & code copied to clipboard!");
        }
      }
    } else {
      navigator.clipboard.writeText(shareText);
      setShared(true);
      toast.success("Share link & code copied to clipboard!");
      setTimeout(() => setShared(false), 2000);
    }
  };

  const handleStart = async () => {
    if (!sessionId) return;
    try {
      await supabase
        .from("quiz_sessions")
        .update({ status: "active", current_question_index: 0 })
        .eq("id", sessionId);

      if (channelRef.current) {
        await channelRef.current.send({
          type: "broadcast",
          event: "start_quiz",
          payload: { sessionId },
        });
      }
      quizAudio.playLeagueStart();
      onStart(sessionId);
    } catch (e: any) {
      toast.error("Error starting quiz: " + e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] w-screen h-dvh bg-background/98 backdrop-blur-xl flex flex-col items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Top Header with Leave Button */}
      <div className="w-full max-w-2xl flex items-center justify-between pb-3 px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-500 animate-spin" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Live Quiz Arena
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="h-8 rounded-xl text-xs font-bold hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 gap-1"
        >
          <LogOut className="h-3.5 w-3.5" />
          Leave Arena
        </Button>
      </div>

      <Card className="max-w-2xl w-full shadow-2xl border-2 border-indigo-500/30 overflow-hidden bg-gradient-to-b from-background via-background to-muted/20 my-auto">
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-4 text-white text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-amber-300 animate-spin" />
            <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
              PM SHRI KV Sulur Live Quiz Arena
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">{quizTitle}</h2>
        </div>

      <CardHeader className="text-center pb-2">
        {/* Room Code Card */}
        <div className="inline-flex items-center gap-2 sm:gap-3 bg-muted/80 border border-primary/20 rounded-2xl px-3 sm:px-5 py-2.5 sm:py-3 mx-auto shadow-inner">
          <div className="text-left pr-1">
            <span className="text-[10px] text-muted-foreground uppercase font-black block tracking-wider">
              Room Code
            </span>
            <span className="font-mono text-xl sm:text-3xl font-black text-primary tracking-widest">
              {roomCode || "••••••"}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyCode}
            className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl border-dashed hover:border-primary"
            title="Copy room code"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShareCode}
            className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl border-dashed hover:border-indigo-500 text-indigo-600"
            title="Share league invite link"
          >
            {shared ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4" />}
          </Button>
        </div>

        {/* Scheduled Start Info */}
        {scheduledStart && (
          <div className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-indigo-500" />
            <span>Scheduled: {new Date(scheduledStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            {timeUntilStart && (
              <Badge variant="outline" className="font-mono text-indigo-600 border-indigo-300">
                {timeUntilStart}
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Participants Roster */}
        <div className="bg-muted/40 rounded-2xl p-5 border border-border/50 text-center space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-2">
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary" />
              {loading ? "Connecting to Arena..." : `${participants.length} Contestant${participants.length === 1 ? "" : "s"} In Lobby`}
            </span>
            <Badge variant="secondary" className="font-normal text-[11px]">
              Live Realtime Presence
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
            {participants.map((p, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-background border border-border/60 shadow-sm text-left animate-in zoom-in-95 duration-200"
              >
                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    (p.name || "U").charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate text-foreground flex items-center gap-1">
                    {p.name}
                    {p.is_host && <ShieldCheck className="h-3 w-3 text-amber-500 inline shrink-0" />}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {p.student_class ? `Class ${p.student_class}` : "Ready"}
                  </p>
                </div>
              </div>
            ))}

            {participants.length === 0 && !loading && (
              <div className="col-span-full py-6 text-center text-muted-foreground text-xs">
                Waiting for the first contestant to enter...
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2.5 pt-2">
          <Button variant="outline" onClick={onCancel} className="h-11 sm:h-12 rounded-xl text-xs sm:text-sm font-bold order-2 sm:order-1">
            Leave Lobby
          </Button>

          {isHost ? (
            <Button
              onClick={handleStart}
              disabled={loading || participants.length === 0}
              className="h-11 sm:h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm sm:text-base shadow-lg shadow-emerald-600/20 order-1 sm:order-2"
            >
              <Play className="h-4 sm:h-5 w-4 sm:w-5 mr-2 fill-current" />
              Launch Live Quiz
            </Button>
          ) : (
            <Button disabled className="h-11 sm:h-12 rounded-xl text-xs sm:text-sm font-bold order-1 sm:order-2">
              <Loader2 className="h-4 w-4 mr-2 animate-spin text-primary" />
              Waiting for Host to Start...
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
    </div>
  );
};
