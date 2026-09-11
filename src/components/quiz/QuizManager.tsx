import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Trash2, Play, Pause, Trophy, FileText, Upload, Users, Calendar, Clock, Zap, Flame, Sparkles, Download } from "lucide-react";
import { Quiz } from "@/types/quiz";
import { QuizForm } from "./QuizForm";
import BulkImportQuiz from "./BulkImportQuiz";
import { MultiplayerLobby } from "./MultiplayerLobby";
import { LiveQuizRunner } from "./LiveQuizRunner";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";

interface QuizResult {
  id: string;
  score: number;
  points_earned: number;
  completed_at: string;
  answers: any;
  quiz_id: string;
  user_id: string;
  quizzes?: {
    title: string;
    subject: string;
  };
  profiles?: {
    first_name: string;
    last_name: string;
    admission_number: string;
    student_class: string;
  };
}

interface LeagueSession {
  id: string;
  quiz_id: string;
  room_code: string;
  league_name?: string;
  scheduled_start_at?: string;
  target_class?: string;
  time_per_question?: number;
  speed_bonus?: boolean;
  streak_bonus?: boolean;
  auto_start?: boolean;
  status: string;
  created_at: string;
  quizzes?: {
    title: string;
    subject: string;
    questions?: any[];
  };
  registrations_count?: number;
}

const QuizManager = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [leagueSessions, setLeagueSessions] = useState<LeagueSession[]>([]);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(true);
  const [leaguesLoading, setLeaguesLoading] = useState(true);
  const [hostingQuiz, setHostingQuiz] = useState<Quiz | null>(null);
  const [liveSessionId, setLiveSessionId] = useState<string | null>(null);
  const [hostingLeagueSessionId, setHostingLeagueSessionId] = useState<string | null>(null);
  const { toast } = useToast();

  // Schedule League Dialog State
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<string>("");
  const [leagueName, setLeagueName] = useState("");
  const [scheduledDateTime, setScheduledDateTime] = useState("");
  const [targetClass, setTargetClass] = useState("all");
  const [timePerQuestion, setTimePerQuestion] = useState(30);
  const [speedBonus, setSpeedBonus] = useState(true);
  const [streakBonus, setStreakBonus] = useState(true);
  const [autoStart, setAutoStart] = useState(true);
  const [isScheduling, setIsScheduling] = useState(false);

  useEffect(() => {
    loadQuizzes();
    loadQuizResults();
    loadLeagueSessions();
  }, []);

  const loadQuizzes = async () => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading quizzes:', error);
        toast({
          title: "Error",
          description: "Failed to load quizzes",
          variant: "destructive",
        });
        return;
      }

      // Transform data to match Quiz interface
      const transformedQuizzes: Quiz[] = (data || []).map(quiz => ({
        id: quiz.id,
        title: quiz.title,
        description: quiz.description || '',
        subject: quiz.subject,
        difficulty: quiz.difficulty as 'easy' | 'medium' | 'hard',
        questions: quiz.questions as any[],
        timeLimit: quiz.time_limit,
        pointsReward: quiz.points_reward,
        isActive: quiz.is_active || false,
        createdAt: quiz.created_at || new Date().toISOString(),
        createdBy: quiz.created_by
      }));

      setQuizzes(transformedQuizzes);
    } catch (error) {
      console.error('Error loading quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadQuizResults = async () => {
    try {
      const { data, error } = await supabase
        .from('quiz_results')
        .select(`
          *,
          quizzes (title, subject)
        `)
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('Error loading quiz results:', error);
        toast({
          title: "Error",
          description: "Failed to load quiz results",
          variant: "destructive",
        });
        return;
      }

      // Manually fetch profile data for each result
      const resultsWithProfiles = await Promise.all(
        (data || []).map(async (result) => {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('first_name, last_name, admission_number, student_class')
            .eq('id', result.user_id)
            .maybeSingle();

          if (profileError) {
            console.error('Error fetching profile:', profileError);
          }

          return {
            ...result,
            profiles: profileData ? {
              first_name: profileData.first_name || '',
              last_name: profileData.last_name || '',
              admission_number: profileData.admission_number || '',
              student_class: profileData.student_class || ''
            } : undefined
          };
        })
      );

      setQuizResults(resultsWithProfiles);
    } catch (error) {
      console.error('Error loading quiz results:', error);
    } finally {
      setResultsLoading(false);
    }
  };

  const loadLeagueSessions = async () => {
    try {
      setLeaguesLoading(true);
      const { data, error } = await supabase
        .from("quiz_sessions")
        .select("*, quizzes(title, subject, questions)")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Could not load league sessions:", error);
        return;
      }

      // Fetch registration counts for each session
      const leaguesWithCounts = await Promise.all(
        (data || []).map(async (session: any) => {
          try {
            const { count } = await supabase
              .from("quiz_league_registrations" as any)
              .select("id", { count: "exact", head: true })
              .eq("session_id", session.id);
            return { ...session, registrations_count: count || 0 };
          } catch {
            return { ...session, registrations_count: 0 };
          }
        })
      );

      setLeagueSessions(leaguesWithCounts);
    } catch (err) {
      console.warn("Error fetching leagues:", err);
    } finally {
      setLeaguesLoading(false);
    }
  };

  const handleOpenScheduleModal = (quiz?: Quiz) => {
    if (quiz) {
      setSelectedQuizId(quiz.id);
      setLeagueName(`${quiz.title} - Live Championship`);
    } else if (quizzes.length > 0) {
      setSelectedQuizId(quizzes[0].id);
      setLeagueName(`${quizzes[0].title} - Live Championship`);
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const tzOffset = tomorrow.getTimezoneOffset() * 60000;
    const localISOTime = new Date(tomorrow.getTime() - tzOffset).toISOString().slice(0, 16);
    setScheduledDateTime(localISOTime);

    setShowScheduleDialog(true);
  };

  const handleCreateLeagueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuizId) {
      sonnerToast.error("Please choose a quiz for the league.");
      return;
    }

    try {
      setIsScheduling(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const isoScheduled = new Date(scheduledDateTime).toISOString();

      // Use status: "waiting" which is permitted by all check constraints ('waiting', 'in_progress', 'completed')
      // and differentiates scheduled leagues via scheduled_start_at and is_league.
      const payload: any = {
        quiz_id: selectedQuizId,
        host_id: user.id,
        status: "waiting",
        room_code: roomCode,
        league_name: leagueName || "Live Quiz League",
        scheduled_start_at: isoScheduled,
        target_class: targetClass,
        time_per_question: timePerQuestion,
        speed_bonus: speedBonus,
        streak_bonus: streakBonus,
        auto_start: autoStart,
        is_league: true,
      };

      let { error } = await supabase.from("quiz_sessions").insert(payload);

      // If newer columns aren't yet migrated in remote Supabase, fallback gracefully to core columns
      if (error && (error.message?.includes("column") || error.message?.includes("does not exist"))) {
        const fallbackPayload = {
          quiz_id: selectedQuizId,
          host_id: user.id,
          status: "waiting",
          room_code: roomCode,
        };
        const res = await supabase.from("quiz_sessions").insert(fallbackPayload);
        error = res.error;
      }

      if (error) throw error;

      sonnerToast.success("🎉 Live Quiz League Scheduled Successfully!", {
        description: `Room Code: ${roomCode} | Starts at ${new Date(isoScheduled).toLocaleString()}`,
      });

      setShowScheduleDialog(false);
      loadLeagueSessions();
    } catch (err: any) {
      console.error(err);
      sonnerToast.error(err.message || "Failed to schedule live league");
    } finally {
      setIsScheduling(false);
    }
  };

  const handleDeleteLeague = async (sessionId: string) => {
    try {
      const { error } = await supabase.from("quiz_sessions").delete().eq("id", sessionId);
      if (error) throw error;
      sonnerToast.success("League session cancelled and deleted.");
      loadLeagueSessions();
    } catch (err: any) {
      sonnerToast.error("Failed to delete league: " + err.message);
    }
  };

  const handleHostScheduledLeague = (session: LeagueSession) => {
    const quizMatch = quizzes.find((q) => q.id === session.quiz_id);
    if (!quizMatch && session.quizzes) {
      const pseudoQuiz: Quiz = {
        id: session.quiz_id,
        title: session.quizzes.title,
        description: "",
        subject: session.quizzes.subject,
        difficulty: "medium",
        questions: session.quizzes.questions || [],
        timeLimit: Math.ceil(((session.quizzes.questions?.length || 10) * (session.time_per_question || 30)) / 60),
        pointsReward: 500,
        isActive: true,
        createdAt: session.created_at,
        createdBy: "",
      };
      setHostingQuiz(pseudoQuiz);
    } else if (quizMatch) {
      setHostingQuiz(quizMatch);
    }
    setHostingLeagueSessionId(session.id);
  };

  const exportLeagueResultsCSV = async (session: LeagueSession) => {
    try {
      sonnerToast.info("Preparing League Results CSV...");
      const { data, error } = await supabase
        .from("quiz_results")
        .select(`
          id,
          score,
          points_earned,
          completed_at,
          answers,
          user_id
        `)
        .eq("quiz_id", session.quiz_id)
        .order("points_earned", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        sonnerToast.warning("No contestant results found for this quiz/league yet.");
        return;
      }

      // Fetch student details
      const userIds = Array.from(new Set(data.map((d) => d.user_id)));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, admission_number, student_class")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      const headers = [
        "Rank",
        "Student Name",
        "Admission Number",
        "Class",
        "League Name",
        "Room Code",
        "Score (%)",
        "Points Earned",
        "Tab Switch Strikes",
        "Submission Timestamp",
      ];

      const rows = data.map((r, idx) => {
        const prof = profileMap.get(r.user_id);
        const name = `"${((prof?.first_name || "") + " " + (prof?.last_name || "")).trim() || "Student"}"`;
        const adm = `"${prof?.admission_number || "N/A"}"`;
        const cls = `"${prof?.student_class || "N/A"}"`;
        const leagueTitle = `"${session.league_name || session.quizzes?.title || "Quiz League"}"`;
        const room = `"${session.room_code}"`;
        const scoreVal = r.score;
        const pts = r.points_earned;
        const strikes = r.answers?.strikes ?? 0;
        const date = `"${new Date(r.completed_at).toLocaleString()}"`;

        return [idx + 1, name, adm, cls, leagueTitle, room, scoreVal, pts, strikes, date].join(",");
      });

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      const safeTitle = (session.league_name || "league_results").replace(/[^a-zA-Z0-9_-]/g, "_");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${safeTitle}_results.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      sonnerToast.success("✅ League results CSV downloaded successfully!");
    } catch (err: any) {
      sonnerToast.error("Failed to export CSV: " + (err.message || "Unknown error"));
    }
  };

  const exportAllQuizResultsCSV = () => {
    if (!quizResults || quizResults.length === 0) {
      sonnerToast.warning("No quiz results available to export.");
      return;
    }

    try {
      const headers = [
        "Student Name",
        "Admission Number",
        "Class",
        "Quiz Title",
        "Subject",
        "Score (%)",
        "Points Earned",
        "Tab Switch Strikes",
        "Completed Date",
      ];

      const rows = quizResults.map((r) => {
        const name = `"${((r.profiles?.first_name || "") + " " + (r.profiles?.last_name || "")).trim() || "Student"}"`;
        const adm = `"${r.profiles?.admission_number || "N/A"}"`;
        const cls = `"${r.profiles?.student_class || "N/A"}"`;
        const title = `"${r.quizzes?.title || "Quiz"}"`;
        const subj = `"${r.quizzes?.subject || "General"}"`;
        const scoreVal = r.score;
        const pts = r.points_earned;
        const strikes = r.answers?.strikes ?? 0;
        const date = `"${new Date(r.completed_at).toLocaleString()}"`;

        return [name, adm, cls, title, subj, scoreVal, pts, strikes, date].join(",");
      });

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `all_quiz_results_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      sonnerToast.success("✅ All Quiz Results CSV downloaded!");
    } catch (err: any) {
      sonnerToast.error("Failed to export results: " + err.message);
    }
  };

  const handleCreateQuiz = () => {
    setEditingQuiz(null);
    setShowQuizForm(true);
  };

  const handleEditQuiz = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setShowQuizForm(true);
  };

  const handleDeleteQuiz = async (quizId: string) => {
    try {
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Quiz deleted successfully",
      });

      loadQuizzes();
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toast({
        title: "Error",
        description: "Failed to delete quiz",
        variant: "destructive",
      });
    }
  };

  const handleToggleQuizStatus = async (quizId: string) => {
    try {
      const quiz = quizzes.find(q => q.id === quizId);
      if (!quiz) return;

      const { error } = await supabase
        .from('quizzes')
        .update({ is_active: !quiz.isActive })
        .eq('id', quizId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Quiz ${!quiz.isActive ? 'activated' : 'deactivated'}`,
      });

      loadQuizzes();
    } catch (error) {
      console.error('Error toggling quiz status:', error);
      toast({
        title: "Error",
        description: "Failed to update quiz status",
        variant: "destructive",
      });
    }
  };

  const handleQuizSaved = async (quiz: Quiz) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const quizData = {
        title: quiz.title,
        description: quiz.description,
        subject: quiz.subject,
        difficulty: quiz.difficulty,
        time_limit: quiz.timeLimit,
        points_reward: quiz.pointsReward,
        questions: quiz.questions as any, // Cast to Json type
        is_active: quiz.isActive,
        created_by: user.id
      };

      if (editingQuiz) {
        const { error } = await supabase
          .from('quizzes')
          .update(quizData)
          .eq('id', editingQuiz.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Quiz updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('quizzes')
          .insert(quizData);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Quiz created successfully",
        });
      }

      setShowQuizForm(false);
      setEditingQuiz(null);
      loadQuizzes();
    } catch (error) {
      console.error('Error saving quiz:', error);
      toast({
        title: "Error",
        description: "Failed to save quiz",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (hostingQuiz) {
    if (liveSessionId) {
      return (
        <div className="space-y-6">
          <Button
            variant="ghost"
            onClick={() => {
              setHostingQuiz(null);
              setLiveSessionId(null);
              setHostingLeagueSessionId(null);
              loadLeagueSessions();
            }}
            className="mb-4"
          >
            ← Exit Host Arena
          </Button>
          <LiveQuizRunner
            quiz={hostingQuiz}
            sessionId={liveSessionId}
            isHost={true}
            onFinish={() => {
              setHostingQuiz(null);
              setLiveSessionId(null);
              setHostingLeagueSessionId(null);
              loadLeagueSessions();
              sonnerToast.success("Quiz Session Concluded");
            }}
          />
        </div>
      );
    }
    return (
      <MultiplayerLobby
        quizId={hostingQuiz.id}
        quizTitle={hostingQuiz.title}
        isHost={true}
        existingSessionId={hostingLeagueSessionId || undefined}
        onStart={(id) => setLiveSessionId(id)}
        onCancel={() => {
          setHostingQuiz(null);
          setHostingLeagueSessionId(null);
          loadLeagueSessions();
        }}
      />
    );
  }

  if (showQuizForm) {
    return (
      <QuizForm
        quiz={editingQuiz}
        onSave={handleQuizSaved}
        onCancel={() => {
          setShowQuizForm(false);
          setEditingQuiz(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            Quiz & Live League Management
          </h2>
          <p className="text-sm text-muted-foreground">
            Schedule synchronized Kahoot/Quizizz-style live leagues or manage classic quizzes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => handleOpenScheduleModal()}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold shadow-md shadow-indigo-600/20"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Live League
          </Button>

          <Button onClick={handleCreateQuiz} className="bg-blue-600 hover:bg-blue-700 font-bold">
            <Plus className="h-4 w-4 mr-2" />
            Create Quiz
          </Button>
        </div>
      </div>

      <Tabs defaultValue="leagues" className="space-y-4">
        <TabsList className="bg-muted/60 p-1">
          <TabsTrigger value="leagues" className="flex items-center gap-2 font-bold">
            <Flame className="h-4 w-4 text-amber-500" />
            Live Quiz Leagues
            {leagueSessions.filter((s) => s.status === "scheduled" || s.status === "waiting").length > 0 && (
              <Badge className="ml-1 px-1.5 py-0 text-[10px] bg-amber-500 text-slate-950 font-black">
                {leagueSessions.filter((s) => s.status === "scheduled" || s.status === "waiting").length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="quizzes" className="flex items-center gap-2 font-bold">
            <FileText className="h-4 w-4" />
            Quizzes ({quizzes.length})
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2 font-bold">
            <Trophy className="h-4 w-4 text-primary" />
            Student Results
          </TabsTrigger>
          <TabsTrigger value="bulk-import" className="flex items-center gap-2 font-bold">
            <Upload className="h-4 w-4" />
            Bulk Import
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leagues" className="space-y-4">
          <Card className="border-indigo-500/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-indigo-500" />
                    Scheduled & Live Quiz Leagues
                  </CardTitle>
                  <CardDescription>
                    Real-time multiplayer leagues scheduled for a specific time with speed multipliers and live podium.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleOpenScheduleModal()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  <Plus className="h-4 w-4 mr-1" /> New League
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {leaguesLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : leagueSessions.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-2xl bg-muted/20">
                  <Flame className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-foreground">No Live Quiz Leagues Scheduled</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                    Schedule a real-time multiplayer competition for tomorrow or this weekend. Students will receive reminders!
                  </p>
                  <Button onClick={() => handleOpenScheduleModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Calendar className="h-4 w-4 mr-2" /> Schedule Your First League
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {leagueSessions.map((session) => {
                    const isUpcoming = session.status === "scheduled" || session.status === "waiting";

                    return (
                      <div
                        key={session.id}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          session.status === "waiting"
                            ? "border-emerald-500/50 bg-emerald-500/5"
                            : isUpcoming
                            ? "border-indigo-500/30 bg-card hover:border-indigo-500/60 shadow-sm"
                            : "border-border/40 bg-muted/20 opacity-80"
                        }`}
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {session.status === "waiting" && session.scheduled_start_at && new Date(session.scheduled_start_at).getTime() > Date.now() ? (
                              <Badge className="bg-indigo-600 text-white font-bold px-2 py-0.5 gap-1">
                                <Clock className="h-3 w-3 text-amber-300" />
                                ⏳ Scheduled
                              </Badge>
                            ) : session.status === "waiting" ? (
                              <Badge className="bg-emerald-500 text-white font-black animate-pulse px-2 py-0.5">
                                🔴 LOBBY OPEN NOW
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                ✓ Completed
                              </Badge>
                            )}

                            <span className="font-mono font-bold text-xs bg-muted px-2 py-0.5 rounded-md border">
                              ROOM: <strong className="text-primary">{session.room_code}</strong>
                            </span>

                            <Badge variant="secondary" className="text-[11px]">
                              {session.target_class === "all" ? "All Classes" : `Class ${session.target_class}`}
                            </Badge>

                            {session.speed_bonus && (
                              <Badge variant="outline" className="text-[11px] text-amber-600 border-amber-400 gap-1">
                                <Zap className="h-3 w-3" /> Speed Bonus
                              </Badge>
                            )}

                            {session.streak_bonus && (
                              <Badge variant="outline" className="text-[11px] text-orange-600 border-orange-400 gap-1">
                                <Flame className="h-3 w-3" /> Streak Multiplier
                              </Badge>
                            )}
                          </div>

                          <h3 className="text-base font-bold text-foreground truncate">
                            {session.league_name || session.quizzes?.title || "Live Quiz League"}
                          </h3>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-medium">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                              {session.scheduled_start_at
                                ? new Date(session.scheduled_start_at).toLocaleString([], {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  })
                                : "Immediate"}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {session.time_per_question || 30}s / question
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-emerald-600 font-bold">
                              <Users className="h-3.5 w-3.5" />
                              {session.registrations_count || 0} Registered Students
                            </span>
                          </div>
                        </div>

                        {/* Action Controls */}
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => exportLeagueResultsCSV(session)}
                            className="font-bold text-xs hover:bg-muted"
                            title="Export session contestant results as CSV"
                          >
                            <Download className="h-3.5 w-3.5 mr-1 text-primary" />
                            Export CSV
                          </Button>

                          {isUpcoming && (
                            <Button
                              onClick={() => handleHostScheduledLeague(session)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md shadow-emerald-600/20"
                            >
                              <Play className="h-4 w-4 mr-1.5 fill-current" />
                              {session.status === "waiting" ? "Resume Arena" : "Open Host Lobby"}
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteLeague(session.id)}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quizzes">
          <div className="grid gap-6">
            {quizzes.map((quiz) => (
              <Card key={quiz.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {quiz.title}
                        <Badge variant={quiz.isActive ? "default" : "secondary"}>
                          {quiz.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline" className={
                          quiz.difficulty === 'easy' ? 'border-green-500 text-green-700' :
                          quiz.difficulty === 'medium' ? 'border-yellow-500 text-yellow-700' :
                          'border-red-500 text-red-700'
                        }>
                          {quiz.difficulty}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{quiz.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold"
                        onClick={() => handleOpenScheduleModal(quiz)}
                      >
                        <Calendar className="h-4 w-4 mr-1.5" /> Schedule League
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-primary/40 hover:bg-primary/10"
                        onClick={() => {
                          setHostingLeagueSessionId(null);
                          setHostingQuiz(quiz);
                        }}
                      >
                        <Users className="h-4 w-4 mr-1.5" /> Instant Host
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleQuizStatus(quiz.id)}
                      >
                        {quiz.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditQuiz(quiz)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteQuiz(quiz.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Subject:</span> {quiz.subject}
                    </div>
                    <div>
                      <span className="font-medium">Time Limit:</span> {quiz.timeLimit} min
                    </div>
                    <div>
                      <span className="font-medium">Points:</span> {quiz.pointsReward}
                    </div>
                    <div>
                      <span className="font-medium">Questions:</span> {quiz.questions.length}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {quizzes.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No quizzes created yet</h3>
                  <p className="text-gray-600 mb-4">Create your first quiz to get started with interactive learning.</p>
                  <Button onClick={handleCreateQuiz} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Quiz
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="results">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Quiz Results
                </CardTitle>
                <CardDescription>View all quiz attempts and scores</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={exportAllQuizResultsCSV}
                className="font-bold text-xs gap-1.5"
                disabled={quizResults.length === 0}
              >
                <Download className="h-4 w-4 text-primary" />
                Export All (CSV)
              </Button>
            </CardHeader>
            <CardContent>
              {resultsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Quiz</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Points Earned</TableHead>
                      <TableHead>Completed Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quizResults.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {result.profiles?.first_name || 'Unknown'} {result.profiles?.last_name || 'User'}
                            </p>
                            <p className="text-sm text-gray-600">
                              {result.profiles?.admission_number || 'N/A'} - {result.profiles?.student_class || 'N/A'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{result.quizzes?.title || 'Unknown Quiz'}</TableCell>
                        <TableCell>{result.quizzes?.subject || 'Unknown Subject'}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={result.score >= 80 ? 'default' : result.score >= 60 ? 'secondary' : 'destructive'}
                            className={
                              result.score >= 80 ? 'bg-green-100 text-green-800' :
                              result.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }
                          >
                            {result.score}%
                          </Badge>
                        </TableCell>
                        <TableCell>{result.points_earned}</TableCell>
                        <TableCell>{new Date(result.completed_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                    {quizResults.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                          No quiz results found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk-import">
          <Card>
            <CardContent className="pt-6">
              <BulkImportQuiz onDone={loadQuizzes} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Schedule Live League Modal Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Schedule Live Quiz League</DialogTitle>
                <DialogDescription>
                  Configure a live, synchronized multiplayer match at a scheduled date and time.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateLeagueSubmit} className="space-y-4 py-2">
            {/* Choose Quiz */}
            <div className="space-y-1.5">
              <Label htmlFor="quiz-select" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Base Quiz
              </Label>
              <select
                id="quiz-select"
                value={selectedQuizId}
                onChange={(e) => {
                  setSelectedQuizId(e.target.value);
                  const q = quizzes.find((item) => item.id === e.target.value);
                  if (q) setLeagueName(`${q.title} - Live Championship`);
                }}
                className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                required
              >
                {quizzes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title} ({q.subject} • {q.questions?.length || 0} Qs){!q.isActive ? " [Hidden / Inactive]" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* League Title */}
            <div className="space-y-1.5">
              <Label htmlFor="league-title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                League Championship Name
              </Label>
              <Input
                id="league-title"
                value={leagueName}
                onChange={(e) => setLeagueName(e.target.value)}
                placeholder="e.g. KV Sulur National Science Championship"
                className="h-11 rounded-xl font-semibold"
                required
              />
            </div>

            {/* Scheduled Date & Time */}
            <div className="space-y-1.5">
              <Label htmlFor="league-date" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Scheduled Match Date & Time
              </Label>
              <Input
                id="league-date"
                type="datetime-local"
                value={scheduledDateTime}
                onChange={(e) => setScheduledDateTime(e.target.value)}
                className="h-11 rounded-xl font-mono text-sm"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Students will see a live digital countdown and can pre-register for chimes.
              </p>
            </div>

            {/* Target Class & Question Duration Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="target-class" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Target Class
                </Label>
                <select
                  id="target-class"
                  value={targetClass}
                  onChange={(e) => setTargetClass(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                >
                  <option value="all">All Classes (School-wide)</option>
                  <option value="6">Class 6</option>
                  <option value="7">Class 7</option>
                  <option value="8">Class 8</option>
                  <option value="9">Class 9</option>
                  <option value="10">Class 10</option>
                  <option value="11">Class 11</option>
                  <option value="12">Class 12</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="duration" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Time Per Question
                </Label>
                <select
                  id="duration"
                  value={timePerQuestion}
                  onChange={(e) => setTimePerQuestion(Number(e.target.value))}
                  className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                >
                  <option value={15}>15 Seconds (Blitz)</option>
                  <option value={20}>20 Seconds (Fast)</option>
                  <option value={30}>30 Seconds (Standard Quizizz)</option>
                  <option value={45}>45 Seconds (Relaxed)</option>
                  <option value={60}>60 Seconds (Complex/Math)</option>
                </select>
              </div>
            </div>

            {/* Quizizz Feature Toggles */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border">
                <div className="space-y-0.5">
                  <Label htmlFor="speed-bonus" className="text-sm font-bold flex items-center gap-1.5 cursor-pointer">
                    <Zap className="h-4 w-4 text-amber-500" />
                    Speed Multiplier Bonus
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Award up to +200 bonus points for faster answers.
                  </p>
                </div>
                <Switch id="speed-bonus" checked={speedBonus} onCheckedChange={setSpeedBonus} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border">
                <div className="space-y-0.5">
                  <Label htmlFor="streak-bonus" className="text-sm font-bold flex items-center gap-1.5 cursor-pointer">
                    <Flame className="h-4 w-4 text-orange-500" />
                    Consecutive Streak Multiplier
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Award +50 points per consecutive correct answer.
                  </p>
                </div>
                <Switch id="streak-bonus" checked={streakBonus} onCheckedChange={setStreakBonus} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-start" className="text-sm font-bold flex items-center gap-1.5 cursor-pointer">
                    <Clock className="h-4 w-4 text-indigo-500" />
                    Auto-Start on Schedule
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Automatically launch the arena when the countdown reaches zero.
                  </p>
                </div>
                <Switch id="auto-start" checked={autoStart} onCheckedChange={setAutoStart} />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setShowScheduleDialog(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isScheduling}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold"
              >
                {isScheduling ? "Scheduling..." : "Schedule Live League"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default QuizManager;
