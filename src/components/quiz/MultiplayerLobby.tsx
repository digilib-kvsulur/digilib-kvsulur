import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Play, Loader2, Trophy } from "lucide-react";

interface MultiplayerLobbyProps {
  quizId: string;
  quizTitle: string;
  isHost: boolean;
  onStart: (sessionId: string) => void;
  onCancel: () => void;
}

export const MultiplayerLobby = ({ quizId, quizTitle, isHost, onStart, onCancel }: MultiplayerLobbyProps) => {
  const [participants, setParticipants] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setupLobby();
  }, []);

  const setupLobby = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create or join session
      let currentSession;
      if (isHost) {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const { data, error } = await supabase
          .from("quiz_sessions")
          .insert({ quiz_id: quizId, host_id: user.id, status: "waiting", room_code: code })
          .select()
          .single();
        if (error) throw error;
        currentSession = data;
      } else {
        const { data, error } = await supabase
          .from("quiz_sessions")
          .select("*")
          .eq("quiz_id", quizId)
          .eq("status", "waiting")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (error) throw error;
        currentSession = data;
      }

      setSessionId(currentSession.id);

      // Subscribe to Presence
      const channel = supabase.channel(`quiz_lobby_${currentSession.id}`);
      
      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState();
          const p = Object.values(state).flatMap(users => users);
          setParticipants(p);
        })
        .on("broadcast", { event: "start_quiz" }, () => {
          onStart(currentSession.id);
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            const { data: profile } = await supabase.from("profiles").select("first_name, last_name, avatar_url").eq("id", user.id).single();
            await channel.track({
              user_id: user.id,
              name: profile ? `${profile.first_name} ${profile.last_name}` : "Student",
              avatar_url: profile?.avatar_url
            });
            setLoading(false);
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (e: any) {
      console.error(e);
      toast({ title: "Failed to join lobby", description: e.message, variant: "destructive" });
      onCancel();
    }
  };

  const handleStart = async () => {
    if (!sessionId) return;
    try {
      await supabase.from("quiz_sessions").update({ status: "active", current_question_index: 0 }).eq("id", sessionId);
      await supabase.channel(`quiz_lobby_${sessionId}`).send({
        type: "broadcast",
        event: "start_quiz",
        payload: {}
      });
      onStart(sessionId);
    } catch (e) {
      toast({ title: "Error starting quiz", variant: "destructive" });
    }
  };

  return (
    <Card className="max-w-2xl mx-auto shadow-xl border-primary/20">
      <CardHeader className="text-center pb-2">
        <Badge className="w-max mx-auto mb-2 bg-primary/10 text-primary hover:bg-primary/20">Live Quiz Lobby</Badge>
        <CardTitle className="text-2xl">{quizTitle}</CardTitle>
        <CardDescription>Waiting for players to join...</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-muted rounded-xl p-6 text-center space-y-3">
          <div className="flex justify-center -space-x-3">
            {participants.slice(0, 5).map((p, i) => (
              <div key={i} className="h-12 w-12 rounded-full border-4 border-background bg-primary/20 flex items-center justify-center text-primary font-bold shadow-sm">
                {p.name.charAt(0)}
              </div>
            ))}
            {participants.length > 5 && (
              <div className="h-12 w-12 rounded-full border-4 border-background bg-secondary text-secondary-foreground flex items-center justify-center font-bold shadow-sm z-10">
                +{participants.length - 5}
              </div>
            )}
          </div>
          <p className="font-medium text-lg flex items-center justify-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            {loading ? "Connecting..." : `${participants.length} Player${participants.length === 1 ? '' : 's'} Ready`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4">
          <Button variant="outline" onClick={onCancel} className="h-12">Leave Lobby</Button>
          {isHost ? (
            <Button onClick={handleStart} disabled={loading || participants.length === 0} className="h-12 bg-success hover:bg-success/90 text-success-foreground text-lg">
              <Play className="h-5 w-5 mr-2 fill-current" /> Start Quiz
            </Button>
          ) : (
            <Button disabled className="h-12">
              <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Waiting for host...
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
