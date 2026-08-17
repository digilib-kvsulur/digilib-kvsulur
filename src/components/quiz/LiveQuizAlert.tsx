import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Zap, Play } from "lucide-react";
import { MultiplayerLobby } from "./MultiplayerLobby";
import { LiveQuizRunner } from "./LiveQuizRunner";

export const LiveQuizAlert = () => {
  const [activeSession, setActiveSession] = useState<any>(null);
  const [showLobby, setShowLobby] = useState(false);
  const [showRunner, setShowRunner] = useState(false);
  const [quizDetails, setQuizDetails] = useState<any>(null);

  useEffect(() => {
    checkActiveSessions();
    const channel = supabase.channel('public:quiz_sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_sessions' }, () => {
        checkActiveSessions();
      })
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, []);

  const checkActiveSessions = async () => {
    const { data } = await supabase
      .from('quiz_sessions')
      .select('*, quizzes(*)')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (data) {
      setActiveSession(data);
      setQuizDetails(data.quizzes);
    } else {
      setActiveSession(null);
    }
  };

  if (showRunner && quizDetails) {
    return (
      <LiveQuizRunner
        quiz={quizDetails}
        sessionId={activeSession.id}
        isHost={false}
        onFinish={() => { setShowRunner(false); setShowLobby(false); setActiveSession(null); checkActiveSessions(); }}
      />
    );
  }

  if (showLobby && quizDetails) {
    return (
      <MultiplayerLobby
        quizId={quizDetails.id}
        quizTitle={quizDetails.title}
        isHost={false}
        onStart={() => { setShowLobby(false); setShowRunner(true); }}
        onCancel={() => setShowLobby(false)}
      />
    );
  }

  if (!activeSession) return null;

  return (
    <div className="bg-indigo-600 rounded-xl p-4 flex items-center justify-between text-white shadow-lg animate-in slide-in-from-top-4 mb-4">
      <div className="flex items-center gap-3">
        <div className="bg-white/20 p-2 rounded-full animate-pulse">
          <Zap className="h-6 w-6 text-yellow-300 fill-yellow-300" />
        </div>
        <div>
          <h3 className="font-bold text-lg">Live Quiz Starting!</h3>
          <p className="text-indigo-100 text-sm">A live multiplayer quiz "{activeSession.quizzes?.title}" is gathering players.</p>
        </div>
      </div>
      <Button 
        onClick={() => setShowLobby(true)}
        className="bg-white text-indigo-700 hover:bg-indigo-50 font-bold"
      >
        <Play className="h-4 w-4 mr-2" /> Join Now
      </Button>
    </div>
  );
};
