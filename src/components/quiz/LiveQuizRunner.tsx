import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Quiz, Question } from "@/types/quiz";
import { toast } from "sonner";
import {
  Timer,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Trophy,
  Flame,
  Zap,
  Medal,
  Sparkles,
  Users,
  Award,
  Maximize2,
  AlertTriangle,
  ShieldAlert,
  ChevronUp,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { quizAudio } from "@/lib/quizAudio";
import { triggerConfetti, triggerWinnerConfetti } from "@/lib/confetti";
import { getPrizeForRank } from "@/components/quiz/LiveQuizAlert";

interface LiveQuizRunnerProps {
  quiz: Quiz;
  sessionId: string;
  isHost: boolean;
  onFinish: () => void;
}

interface ParticipantScore {
  user_id: string;
  name: string;
  score: number;
  avatar_url?: string;
  strikes?: number;
}

export const LiveQuizRunner = ({ quiz, sessionId, isHost, onFinish }: LiveQuizRunnerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [totalTime, setTotalTime] = useState(30);
  const [timeLeft, setTimeLeft] = useState(30);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastEarnedPoints, setLastEarnedPoints] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [participants, setParticipants] = useState<ParticipantScore[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Proctoring & Fullscreen State
  const [strikes, setStrikes] = useState(0);
  const [isDisqualified, setIsDisqualified] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [proctorWarning, setProctorWarning] = useState<string | null>(null);
  const [showLeaderboardDrawer, setShowLeaderboardDrawer] = useState(false);

  // Kahoot-style Inter-Question Leaderboard, Answer Splash & Prize Grant State
  const [showAnswerSplash, setShowAnswerSplash] = useState(false);
  const [showInterBoard, setShowInterBoard] = useState(false);
  const [interBoardTimer, setInterBoardTimer] = useState(5);
  const [isGrantingPoints, setIsGrantingPoints] = useState(false);
  const [pointsGranted, setPointsGranted] = useState(false);

  const channelRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const question = quiz.questions[currentIndex] as Question;

  useEffect(() => {
    initUser();
  }, []);

  const initUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      setCurrentUser({
        id: user.id,
        name: profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Student" : "Student",
        avatar_url: profile?.avatar_url,
      });
    }
  };

  // Auto-request Fullscreen for contestants upon mounting
  useEffect(() => {
    if (isHost) return;

    const requestFS = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
        }
      } catch (e) {
        // User gesture or permission restriction on some browsers
        setIsFullscreen(false);
      }
    };

    requestFS();

    const handleFSChange = () => {
      const isFS = !!document.fullscreenElement;
      setIsFullscreen(isFS);
      if (!isFS && !isFinished && !isHost) {
        handleViolation("Exited fullscreen mode during official league match!");
      }
    };

    document.addEventListener("fullscreenchange", handleFSChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFSChange);
    };
  }, [isHost, isFinished]);

  // Anti-Cheat & Proctoring Listeners (Contestants only)
  useEffect(() => {
    if (isHost || isFinished) return;

    // Detect tab switch or window minimize
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation("Tab switch or backgrounding detected!");
      }
    };

    // Detect clicking outside window / Alt-Tab
    const handleBlur = () => {
      handleViolation("Window focus lost! Focus on quiz league window.");
    };

    // Block right-click / context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toast.warning("Right-click context menu is locked during the League.");
    };

    // Block clipboard copying/cutting/pasting
    const handleCopyCut = (e: ClipboardEvent) => {
      e.preventDefault();
      toast.warning("Copying or pasting question content is disabled.");
    };

    // Block DevTools shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) ||
        (e.ctrlKey && ["U", "C", "S", "P"].includes(e.key.toUpperCase()))
      ) {
        e.preventDefault();
        toast.error("Inspector and dev shortcuts are disabled.");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopyCut);
    document.addEventListener("cut", handleCopyCut);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopyCut);
      document.removeEventListener("cut", handleCopyCut);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isHost, isFinished, strikes]);

  const handleViolation = (reason: string) => {
    if (isFinished || isHost) return;

    setStrikes((prev) => {
      const nextStrike = prev + 1;
      quizAudio.playIncorrect();

      if (nextStrike >= 3) {
        setIsDisqualified(true);
        setProctorWarning("Disqualified: 3 Anti-Cheat Strikes exceeded (Tab Switching/Focus Loss). Auto-submitting score.");
        toast.error("🚨 Contestant Disqualified!", {
          description: "3 proctor strikes reached. Your current score is auto-submitted.",
        });
        finishQuiz(true, nextStrike);
      } else {
        setProctorWarning(`⚠️ Strike ${nextStrike}/3 Warning: ${reason}`);
        toast.error(`⚠️ Proctor Warning: Strike ${nextStrike} of 3!`, {
          description: nextStrike === 2 ? "Final Warning: Next violation will disqualify you!" : reason,
        });
      }
      return nextStrike;
    });
  };

  const reEnterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
      setProctorWarning(null);
    } catch {
      toast.info("Could not enter full screen. Click anywhere in the quiz window.");
    }
  };

  // Fetch session config (e.g. time_per_question & current_question_index for late joiners)
  useEffect(() => {
    const fetchSessionSettings = async () => {
      try {
        const { data } = await supabase
          .from("quiz_sessions")
          .select("time_per_question, current_question_index, status")
          .eq("id", sessionId)
          .maybeSingle();

        if (data) {
          if (data.time_per_question) {
            setTotalTime(data.time_per_question);
            setTimeLeft(data.time_per_question);
          }
          // Late join synchronization: Jump immediately to live question
          if (typeof data.current_question_index === "number" && data.current_question_index > 0) {
            setCurrentIndex(data.current_question_index);
            toast.info(`⚡ Joined live match at Question ${data.current_question_index + 1}!`);
          }
          if (data.status === "finished") {
            finishQuiz();
          }
        }
      } catch (err) {
        console.warn("Could not fetch session config:", err);
      }
    };

    fetchSessionSettings();
  }, [sessionId]);

  // Inter-question leaderboard countdown timer (auto-advance)
  useEffect(() => {
    if (!showInterBoard || isFinished) return;

    const interval = setInterval(() => {
      setInterBoardTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // If host, auto-advance to the next question
          if (isHost) {
            handleNextQuestion();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showInterBoard, isFinished, isHost, currentIndex]);

  // Realtime channel for synchronized questions + instant broadcast score sync + presence
  useEffect(() => {
    const channel = supabase.channel(`quiz_session_${sessionId}`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "show_leaderboard" }, () => {
        setShowInterBoard(true);
        setInterBoardTimer(5);
      })
      .on("broadcast", { event: "next_question" }, (payload) => {
        setCurrentIndex(payload.payload.index);
        setSelectedAnswer(null);
        setShowResult(false);
        setShowInterBoard(false);
        setTimeLeft(totalTime);
      })
      .on("broadcast", { event: "end_quiz" }, () => {
        setShowInterBoard(false);
        finishQuiz();
      })
      .on("broadcast", { event: "player_score_update" }, (payload) => {
        const updatedPlayer = payload.payload as any;
        if (!updatedPlayer || !updatedPlayer.user_id || updatedPlayer.is_host) return;
        if (updatedPlayer.name?.toLowerCase().includes("admin") || updatedPlayer.name?.toLowerCase().includes("pm shri kv")) return;

        setParticipants((prev) => {
          const exists = prev.some((p) => p.user_id === updatedPlayer.user_id);
          let nextList = exists
            ? prev.map((p) => (p.user_id === updatedPlayer.user_id ? { ...p, ...updatedPlayer } : p))
            : [...prev, updatedPlayer];
          return nextList
            .filter((p: any) => !p.is_host && !p.name?.toLowerCase().includes("admin") && !p.name?.toLowerCase().includes("pm shri kv"))
            .sort((a, b) => (b.score || 0) - (a.score || 0));
        });
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const raw = Object.values(state).flatMap((users: any) => users) as any[];
        // Deduplicate by user_id — keep entry with highest score per user, strictly exclude admin/host
        const seen = new Map<string, ParticipantScore>();
        for (const p of raw) {
          if (!p.user_id || p.is_host) continue;
          if (p.name?.toLowerCase().includes("admin") || p.name?.toLowerCase().includes("pm shri kv")) continue;
          const existing = seen.get(p.user_id);
          if (!existing || (p.score || 0) > (existing.score || 0)) {
            seen.set(p.user_id, p);
          }
        }
        const deduped = Array.from(seen.values()).sort((a, b) => (b.score || 0) - (a.score || 0));
        setParticipants(deduped);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && currentUser && !isHost) {
          await channel.track({
            user_id: currentUser.id,
            name: currentUser.name,
            score: 0,
            avatar_url: currentUser.avatar_url,
            is_host: false,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, currentUser, totalTime, isHost]);

  // Reset per question
  useEffect(() => {
    setSelectedAnswer(null);
    setShowResult(false);
    setShowAnswerSplash(false);
    setTimeLeft(totalTime);
  }, [currentIndex, totalTime]);

  // Countdown timer
  useEffect(() => {
    if (showResult || isFinished) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 6 && prev > 1) {
          quizAudio.playTick();
        }
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentIndex, showResult, isFinished]);

  const handleTimeUp = () => {
    setShowResult(true);
    if (selectedAnswer === null) {
      setStreak(0);
      quizAudio.playIncorrect();
    }
    // Transition to Inter-Question Leaderboard after 2 seconds (Kahoot style)
    setTimeout(() => {
      setShowAnswerSplash(false);
      setShowInterBoard(true);
      setInterBoardTimer(5);
      if (channelRef.current && isHost) {
        channelRef.current.send({
          type: "broadcast",
          event: "show_leaderboard",
          payload: {},
        });
      }
    }, 2000);
  };

  const handleAnswerSelect = async (index: number) => {
    if (showResult || selectedAnswer !== null || isHost || isDisqualified) return;
    setSelectedAnswer(index);
    setShowResult(true);
    setShowAnswerSplash(true);

    const isCorrect = index === question.correctAnswer;

    if (isCorrect) {
      const basePoints = 500;
      // Speed multiplier: earlier answer earns up to +200 bonus
      const speedBonus = Math.round((timeLeft / totalTime) * 200);
      // Streak bonus: +50 per consecutive correct
      const currentStreak = streak + 1;
      const streakBonus = currentStreak * 50;

      const earned = basePoints + speedBonus + streakBonus;
      const newScore = score + earned;

      setScore(newScore);
      setStreak(currentStreak);
      setLastEarnedPoints(earned);

      // 🎉 Per-question confetti — escalates with streak
      if (currentStreak >= 5) {
        triggerWinnerConfetti(1); // Golden mega burst for 5+ streak
      } else if (currentStreak >= 3) {
        triggerWinnerConfetti(3); // Bronze burst for 3–4 streak
      } else {
        triggerConfetti(); // Standard burst for single correct
      }

      if (currentStreak >= 2) {
        quizAudio.playStreak();
      } else {
        quizAudio.playCorrect();
      }

      // 1. Instant Realtime Broadcast to eliminate delay
      if (channelRef.current && currentUser && !isHost) {
        const payloadData: ParticipantScore = {
          user_id: currentUser.id,
          name: currentUser.name,
          score: newScore,
          avatar_url: currentUser.avatar_url,
          strikes,
        };

        channelRef.current.send({
          type: "broadcast",
          event: "player_score_update",
          payload: payloadData,
        });

        // 2. Track presence
        channelRef.current.track(payloadData);
      }
    } else {
      setStreak(0);
      setLastEarnedPoints(0);
      quizAudio.playIncorrect();
    }

    // Automatically transition from answer splash to inter-question leaderboard after 1.8s
    setTimeout(() => {
      setShowAnswerSplash(false);
      setShowInterBoard(true);
      setInterBoardTimer(5);
      if (channelRef.current && isHost) {
        channelRef.current.send({
          type: "broadcast",
          event: "show_leaderboard",
          payload: {},
        });
      }
    }, 1800);
  };

  const handleNextQuestion = async () => {
    setShowAnswerSplash(false);
    setShowInterBoard(false);
    setShowResult(false);
    setSelectedAnswer(null);

    if (currentIndex < quiz.questions.length - 1) {
      const nextIdx = currentIndex + 1;
      await supabase
        .from("quiz_sessions")
        .update({ current_question_index: nextIdx })
        .eq("id", sessionId);

      if (channelRef.current) {
        await channelRef.current.send({
          type: "broadcast",
          event: "next_question",
          payload: { index: nextIdx },
        });
      }
      setCurrentIndex(nextIdx);
      setTimeLeft(totalTime);
    } else {
      await supabase
        .from("quiz_sessions")
        .update({ status: "finished" })
        .eq("id", sessionId);

      if (channelRef.current) {
        await channelRef.current.send({
          type: "broadcast",
          event: "end_quiz",
          payload: {},
        });
      }
      finishQuiz();
    }
  };

  const handleGrantPrizePoints = async () => {
    if (pointsGranted || isGrantingPoints) return;
    setIsGrantingPoints(true);
    try {
      let awardedCount = 0;
      for (let i = 0; i < participants.length; i++) {
        const p = participants[i];
        if (!p.user_id) continue;
        const rank = i + 1;
        const prize = getPrizeForRank(rank);
        if (prize > 0) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("points")
            .eq("id", p.user_id)
            .maybeSingle();

          if (profile) {
            await supabase
              .from("profiles")
              .update({ points: (profile.points || 0) + prize })
              .eq("id", p.user_id);
            awardedCount++;
          }
        }
      }

      setPointsGranted(true);
      triggerWinnerConfetti(1);
      toast.success(`🎉 Successfully awarded prize points to ${awardedCount} contestants!`, {
        description: "1st: 5000 pts, 2nd: 2500 pts, 3rd: 1000 pts, 4-10th: 800 pts, others: 500 pts.",
      });
    } catch (err: any) {
      toast.error("Failed to grant points: " + (err.message || "Unknown error"));
    } finally {
      setIsGrantingPoints(false);
    }
  };

  const finishQuiz = async (disqualified = false, finalStrikes = strikes) => {
    setIsFinished(true);
    if (!disqualified) {
      // Rank-based confetti: compute rank from current participants state
      const currentUserId = (await supabase.auth.getUser()).data.user?.id;
      const rank = currentUserId
        ? participants.findIndex((p) => p.user_id === currentUserId) + 1
        : 0;
      if (rank === 1) triggerWinnerConfetti(1);
      else if (rank === 2) triggerWinnerConfetti(2);
      else if (rank === 3) triggerWinnerConfetti(3);
      else triggerConfetti();
      quizAudio.playLeagueStart();
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      if (!isHost) {
        // Calculate rank-based prize: 1st=5000, 2nd=2500, 3rd=1000, 4th-10th=800, others=500
        const finalRank = participants.findIndex((p) => p.user_id === user.id) + 1;
        const prizePoints = disqualified ? 0 : (finalRank > 0 ? getPrizeForRank(finalRank) : getPrizeForRank(999));

        // Record in quiz_results with session metadata and strikes (points granted upon admin approval)
        await supabase.from("quiz_results").insert({
          quiz_id: quiz.id,
          user_id: user.id,
          score: Math.round((score / ((quiz.questions.length || 1) * 750)) * 100),
          points_earned: prizePoints,
          answers: {
            session_id: sessionId,
            league: true,
            strikes: finalStrikes,
            disqualified,
            final_rank: finalRank > 0 ? finalRank : null,
            quiz_score: score,
          },
        });
      }
    } catch (e) {
      console.error("Error saving final league score:", e);
    }
  };

  // Find user's live rank
  const myRank = participants.findIndex((p) => p.user_id === currentUser?.id) + 1;

  // Disqualified screen
  if (isDisqualified) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-2 border-rose-500 bg-card shadow-2xl p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-rose-500/10 border-2 border-rose-500 rounded-full flex items-center justify-center mx-auto text-rose-500 animate-bounce">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black text-rose-600">Disqualified from League</h2>
          <p className="text-sm text-muted-foreground">
            3 anti-cheat violations were detected (tab switching or loss of window focus). In accordance with official league rules, your attempt was halted and submitted.
          </p>
          <div className="p-3 bg-muted rounded-xl text-xs font-mono">
            Recorded Score: <strong>{score} pts</strong> • Strikes: <strong>3/3</strong>
          </div>
          <Button onClick={onFinish} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold h-11">
            Exit to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  // Podium screen when quiz concludes
  if (isFinished) {
    const top1 = participants[0];
    const top2 = participants[1];
    const top3 = participants[2];

    return (
      <div className="fixed inset-0 z-[100] w-screen h-dvh bg-background/98 backdrop-blur-xl overflow-y-auto flex items-center justify-center p-2 sm:p-6">
        <Card className="max-w-3xl w-full shadow-2xl border-2 border-amber-500/40 overflow-hidden bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 text-white animate-in zoom-in-95 duration-500 my-auto">
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 p-4 sm:p-6 text-slate-950 text-center relative overflow-hidden">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 absolute top-2 sm:top-3 left-3 sm:left-4 animate-spin" />
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 absolute bottom-2 sm:bottom-3 right-3 sm:right-4 animate-spin" />
            <Trophy className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-1.5 sm:mb-2 fill-current" />
            <h2 className="text-xl sm:text-3xl font-black uppercase tracking-tight">Quiz League Finale!</h2>
            <p className="font-bold text-xs sm:text-sm opacity-90 truncate max-w-md mx-auto">{quiz.title}</p>
          </div>

          <CardContent className="p-3 sm:p-8 space-y-5 sm:space-y-8">
            {/* Olympic Podium */}
            <div className="flex items-end justify-center gap-1.5 sm:gap-6 pt-3 sm:pt-6 pb-2 max-w-full px-1">
              {/* 2nd Place */}
              <div className="flex flex-col items-center flex-1 max-w-[95px] sm:max-w-[130px] min-w-0">
                <div className="text-center mb-1.5 sm:mb-2 w-full px-0.5">
                  <Medal className="h-5 w-5 sm:h-7 sm:w-7 text-slate-300 mx-auto" />
                  <p className="text-[10px] sm:text-xs font-bold truncate mt-1 w-full">{top2?.name || "Runner Up"}</p>
                  <p className="text-[9px] sm:text-[11px] font-mono text-slate-400">{top2?.score || 0} pts</p>
                </div>
                <div className="w-full h-20 sm:h-28 bg-gradient-to-t from-slate-800 to-slate-600 rounded-t-xl sm:rounded-t-2xl flex items-center justify-center border-t-2 border-slate-400 shadow-lg">
                  <span className="text-xl sm:text-3xl font-black text-slate-200">2nd</span>
                </div>
              </div>

              {/* 1st Place */}
              <div className="flex flex-col items-center flex-1 max-w-[115px] sm:max-w-[150px] min-w-0">
                <div className="text-center mb-1.5 sm:mb-2 w-full px-0.5">
                  <Trophy className="h-7 w-7 sm:h-9 sm:w-9 text-amber-300 mx-auto fill-amber-300 animate-bounce" />
                  <p className="text-xs sm:text-sm font-black truncate mt-1 text-amber-300 w-full">{top1?.name || "Champion"}</p>
                  <p className="text-[10px] sm:text-xs font-mono font-bold text-amber-400">{top1?.score || 0} pts</p>
                </div>
                <div className="w-full h-28 sm:h-40 bg-gradient-to-t from-amber-700 via-amber-500 to-yellow-400 rounded-t-xl sm:rounded-t-2xl flex items-center justify-center border-t-4 border-yellow-200 shadow-2xl shadow-amber-500/40">
                  <span className="text-2xl sm:text-4xl font-black text-slate-950">1st</span>
                </div>
              </div>

              {/* 3rd Place */}
              <div className="flex flex-col items-center flex-1 max-w-[95px] sm:max-w-[130px] min-w-0">
                <div className="text-center mb-1.5 sm:mb-2 w-full px-0.5">
                  <Medal className="h-5 w-5 sm:h-7 sm:w-7 text-amber-700 mx-auto" />
                  <p className="text-[10px] sm:text-xs font-bold truncate mt-1 w-full">{top3?.name || "Contender"}</p>
                  <p className="text-[9px] sm:text-[11px] font-mono text-amber-600">{top3?.score || 0} pts</p>
                </div>
                <div className="w-full h-14 sm:h-20 bg-gradient-to-t from-amber-950 to-amber-800 rounded-t-xl sm:rounded-t-2xl flex items-center justify-center border-t-2 border-amber-600 shadow-lg">
                  <span className="text-lg sm:text-2xl font-black text-amber-200">3rd</span>
                </div>
              </div>
            </div>

            {/* User's Result Banner */}
            {!isHost && (
              <div className="bg-white/10 border border-white/20 rounded-2xl p-4 text-center space-y-1.5">
                <p className="text-xs uppercase font-bold text-indigo-300 tracking-wider">Your Performance</p>
                <p className="text-2xl sm:text-3xl font-black text-amber-300">
                  {score.toLocaleString()} pts earned
                </p>
                {myRank > 0 && (
                  <p className="text-sm text-white/80">
                    You placed <strong className="text-white">#{myRank}</strong> out of {participants.length} contestants!
                  </p>
                )}
                {/* Prize earned display */}
                {!isDisqualified && myRank > 0 && (
                  <div className="inline-flex items-center gap-2 bg-amber-400/20 border border-amber-400/40 rounded-full px-4 py-1.5 mt-1">
                    <Trophy className="h-4 w-4 text-amber-300" />
                    <span className="text-base font-black text-amber-200">
                      +{getPrizeForRank(myRank).toLocaleString()} Prize Points!
                    </span>
                  </div>
                )}
                {isDisqualified && (
                  <p className="text-xs text-red-400 font-bold mt-1">⛔ Disqualified — No prize points awarded.</p>
                )}
                {strikes > 0 && (
                  <p className="text-xs text-amber-300 font-semibold mt-1">
                    Recorded Anti-Cheat Strikes: {strikes}
                  </p>
                )}
              </div>
            )}

            {/* Prize Pool Reference */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/60 mb-2 text-center">🏆 Prize Pool</h4>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {[
                  { label: "🥇 1st Place", pts: "5,000 pts" },
                  { label: "🥈 2nd Place", pts: "2,500 pts" },
                  { label: "🥉 3rd Place", pts: "1,000 pts" },
                  { label: "🏅 4th – 10th", pts: "800 pts" },
                  { label: "🎖️ All others", pts: "500 pts" },
                  { label: "⛔ Disqualified", pts: "0 pts" },
                ].map(({ label, pts }) => (
                  <div key={label} className="flex justify-between items-center bg-white/5 rounded-xl px-2.5 py-1.5">
                    <span className="text-white/80">{label}</span>
                    <span className="font-bold text-amber-300 font-mono">{pts}</span>
                  </div>
                ))}
              </div>
            </div>


            {/* Full Contestant Leaderboard Table */}
            {participants.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white/70">Final Leaderboard Standings</h4>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {participants.map((p, i) => (
                    <div
                      key={p.user_id || i}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold ${
                        p.user_id === currentUser?.id
                          ? "bg-indigo-500/30 border-indigo-400 text-white"
                          : i === 0
                          ? "bg-amber-500/20 border-amber-400/50 text-white"
                          : i === 1
                          ? "bg-slate-400/20 border-slate-400/40 text-white"
                          : i === 2
                          ? "bg-orange-700/20 border-orange-600/40 text-white"
                          : "bg-white/5 border-white/10 text-white/80"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 text-center font-bold font-mono text-amber-400">
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                        </span>
                        <span className="truncate max-w-[140px]">{p.name}</span>
                        {p.user_id === currentUser?.id && (
                          <Badge variant="secondary" className="text-[9px] py-0 px-1 bg-indigo-500/40 text-white border-0">
                            You
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-white/60">{p.score} pts</span>
                        <span className="font-mono font-black text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded-lg">
                          +{getPrizeForRank(i + 1).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              {isHost && (
                <Button
                  onClick={handleGrantPrizePoints}
                  disabled={isGrantingPoints || pointsGranted}
                  className={`h-12 px-6 rounded-xl font-black text-sm shadow-xl transition-all ${
                    pointsGranted
                      ? "bg-emerald-600 text-white cursor-default"
                      : "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 hover:scale-105 active:scale-95 animate-pulse"
                  }`}
                >
                  <Trophy className="h-5 w-5 mr-2" />
                  {pointsGranted
                    ? "✓ Prize Points Awarded!"
                    : isGrantingPoints
                    ? "Awarding Points..."
                    : "🏆 Grant Prize Points to All Winners"}
                </Button>
              )}

              <Button
                onClick={() => {
                  if (document.fullscreenElement) {
                    document.exitFullscreen().catch(() => {});
                  }
                  onFinish();
                }}
                className="h-12 px-8 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black text-base shadow-xl"
              >
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Kahoot/Quizizz Inter-Question Leaderboard Screen
  if (showInterBoard && !isFinished) {
    return (
      <div className="fixed inset-0 z-[110] w-screen h-dvh bg-slate-950/98 backdrop-blur-2xl flex flex-col items-center justify-start sm:justify-center p-3 sm:p-6 overflow-y-auto select-none">
        <div className="max-w-2xl w-full bg-slate-900 border-2 border-indigo-500/40 rounded-3xl p-4 sm:p-7 shadow-2xl shadow-indigo-950/60 space-y-4 sm:space-y-5 text-white my-auto animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400 animate-bounce" />
              <span className="text-xs font-black uppercase tracking-widest text-indigo-300">
                League Leaderboard
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              After Question {currentIndex + 1} of {quiz.questions.length}
            </h3>
          </div>

          {/* Countdown Progress Bar */}
          <div className="bg-white/10 rounded-2xl p-3 sm:p-4 border border-white/15 text-center space-y-2">
            <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-indigo-200">
              <span className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-amber-300 animate-spin" />
                <span>Next Question In</span>
              </span>
              <span className="font-mono text-lg font-black text-amber-300">{interBoardTimer}s</span>
            </div>
            <div className="w-full bg-white/20 h-2.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${Math.max(0, (interBoardTimer / 5) * 100)}%` }}
              />
            </div>
          </div>

          {/* Standings Table (All Players) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-white/60 font-bold px-2">
              <span>Contestant ({participants.length})</span>
              <span>Total Score</span>
            </div>
            <div className="max-h-72 sm:max-h-80 overflow-y-auto space-y-2 pr-1">
              {participants.map((p, i) => (
                <div
                  key={p.user_id || i}
                  className={`flex items-center justify-between p-3 rounded-2xl border text-xs sm:text-sm font-bold transition-all ${
                    p.user_id === currentUser?.id
                      ? "bg-indigo-600/40 border-indigo-400 text-white shadow-md shadow-indigo-600/30 scale-[1.01]"
                      : i === 0
                      ? "bg-amber-500/20 border-amber-400/50 text-amber-100"
                      : i === 1
                      ? "bg-slate-400/20 border-slate-300/40 text-slate-100"
                      : i === 2
                      ? "bg-orange-700/20 border-orange-500/40 text-orange-100"
                      : "bg-white/5 border-white/10 text-white/80"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 text-center font-mono font-black text-amber-400 shrink-0">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-black text-white shrink-0 overflow-hidden shadow-sm">
                      {p.avatar_url ? (
                        <img
                          src={p.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        (p.name || "S").charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="truncate max-w-[150px] sm:max-w-[260px]">{p.name}</span>
                    {p.user_id === currentUser?.id && (
                      <Badge className="bg-indigo-500 text-white text-[9px] py-0 px-1.5 h-4 border-0">
                        YOU
                      </Badge>
                    )}
                  </div>
                  <span className="font-mono font-black text-amber-300 shrink-0">
                    {p.score?.toLocaleString() || 0} pts
                  </span>
                </div>
              ))}
              {participants.length === 0 && (
                <p className="text-center text-xs text-white/50 py-4">Waiting for scores to sync...</p>
              )}
            </div>
          </div>

          {/* Host Skip Button */}
          {isHost && (
            <div className="pt-2 text-center">
              <Button
                onClick={handleNextQuestion}
                className="w-full h-11 sm:h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-sm shadow-lg gap-2"
              >
                <span>Skip Timer & {currentIndex < quiz.questions.length - 1 ? "Next Question" : "Conclude Match"}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-[100] w-screen h-dvh bg-gradient-to-b from-slate-950 via-[#0B0F19] to-[#080B11] text-white overflow-y-auto flex flex-col items-center justify-start sm:justify-center p-2 sm:p-5 select-none ${
        !isHost ? "touch-manipulation" : ""
      }`}
    >
      {/* Immediate Answer Splash Overlay (Kahoot/Quizizz Feedback before leaderboard) */}
      {showAnswerSplash && !isHost && (
        <div className="fixed inset-0 z-[105] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in zoom-in-95 duration-200">
          <div
            className={`max-w-md w-full rounded-3xl p-6 text-center space-y-4 border-2 shadow-2xl animate-in zoom-in-90 duration-300 ${
              selectedAnswer === question.correctAnswer
                ? "bg-gradient-to-b from-emerald-950/90 via-slate-900 to-slate-950 border-emerald-500/60 text-emerald-100 shadow-emerald-900/50"
                : selectedAnswer === null
                ? "bg-gradient-to-b from-amber-950/90 via-slate-900 to-slate-950 border-amber-500/60 text-amber-100 shadow-amber-900/50"
                : "bg-gradient-to-b from-rose-950/90 via-slate-900 to-slate-950 border-rose-500/60 text-rose-100 shadow-rose-900/50"
            }`}
          >
            {/* Feedback Icon & Title */}
            {selectedAnswer === question.correctAnswer ? (
              <>
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/30 animate-bounce">
                  <CheckCircle2 className="h-9 w-9" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-3xl font-black text-emerald-300 uppercase tracking-wide">
                    Correct!
                  </h2>
                  <p className="text-xs font-semibold text-emerald-200/80">Great speed and accuracy!</p>
                </div>
                {/* Score Breakdown */}
                <div className="bg-emerald-500/15 border border-emerald-400/30 rounded-2xl p-3.5 space-y-2">
                  <div className="text-3xl font-black text-amber-300 font-mono">
                    +{lastEarnedPoints} PTS
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                    <Badge className="bg-emerald-600/60 text-white font-bold border-0">Base: +500</Badge>
                    {Math.round((timeLeft / totalTime) * 200) > 0 && (
                      <Badge className="bg-cyan-600/60 text-white font-bold border-0">
                        ⚡ Speed: +{Math.round((timeLeft / totalTime) * 200)}
                      </Badge>
                    )}
                    {streak > 1 && (
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black border-0 gap-1">
                        <Flame className="h-3 w-3 fill-current" />
                        {streak}x Streak (+{streak * 50})
                      </Badge>
                    )}
                  </div>
                </div>
              </>
            ) : selectedAnswer === null ? (
              <>
                <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mx-auto text-amber-400 shadow-lg shadow-amber-500/30">
                  <Timer className="h-9 w-9" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-amber-300 uppercase tracking-wide">
                    Time's Up!
                  </h2>
                  <p className="text-xs font-semibold text-amber-200/80">
                    No answer submitted in time.
                  </p>
                </div>
                <div className="bg-white/10 rounded-2xl p-3 text-xs">
                  <span className="text-white/70">Correct answer: </span>
                  <strong className="text-amber-300 font-bold">
                    {String.fromCharCode(65 + question.correctAnswer)} - {question.options[question.correctAnswer]}
                  </strong>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center mx-auto text-rose-400 shadow-lg shadow-rose-500/30">
                  <XCircle className="h-9 w-9" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-3xl font-black text-rose-300 uppercase tracking-wide">
                    Incorrect!
                  </h2>
                  <p className="text-xs font-semibold text-rose-200/80">Streak reset to 0</p>
                </div>
                <div className="bg-white/10 border border-white/10 rounded-2xl p-3 text-xs text-center space-y-1">
                  <p className="text-white/60 text-[11px] uppercase tracking-wider font-bold">Correct Answer</p>
                  <p className="text-emerald-400 font-black text-sm">
                    {String.fromCharCode(65 + question.correctAnswer)}: {question.options[question.correctAnswer]}
                  </p>
                </div>
              </>
            )}

            {/* Live Rank indicator */}
            {myRank > 0 && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-white/80 font-bold">
                <Trophy className="h-4 w-4 text-amber-400" />
                <span>Live Standing: <strong className="text-amber-300">Rank #{myRank}</strong></span>
              </div>
            )}

            <p className="text-[11px] text-white/50 animate-pulse font-mono">
              Loading leaderboard...
            </p>
          </div>
        </div>
      )}

      <Card className="max-w-3xl w-full shadow-2xl border-2 border-indigo-500/30 overflow-hidden animate-in fade-in zoom-in-95 duration-300 my-auto bg-slate-900/95 backdrop-blur-xl text-white flex flex-col rounded-3xl">
        {/* Anti-cheat & Fullscreen Lockdown Top Banner */}
        {!isHost && (
          <div className="bg-slate-950 text-white px-3 sm:px-4 py-2 flex items-center justify-between text-xs font-semibold border-b border-white/10 shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <ShieldAlert className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">Proctoring:</span>
              <Badge
                variant="outline"
                className={`font-mono text-[9px] sm:text-[10px] px-1.5 py-0 ${
                  strikes === 0
                    ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10"
                    : strikes === 1
                    ? "border-amber-500/50 text-amber-400 bg-amber-500/10"
                    : "border-rose-500 text-rose-400 bg-rose-500/10 animate-pulse"
                }`}
              >
                {strikes === 0 ? "0/3 Clean" : `${strikes}/3 Strikes`}
              </Badge>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowLeaderboardDrawer(!showLeaderboardDrawer)}
                className="h-6 sm:h-7 text-[11px] sm:text-xs text-white hover:bg-white/10 gap-1 px-1.5 sm:px-2"
              >
                <Trophy className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-400" />
                <span className="hidden xs:inline">Standings</span>
                <span>({participants.length})</span>
                {showLeaderboardDrawer ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>

              {!isFullscreen && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={reEnterFullscreen}
                  className="h-6 sm:h-7 text-[10px] sm:text-[11px] bg-amber-500/20 text-amber-300 border-amber-400/40 hover:bg-amber-500/30 gap-1 px-1.5 sm:px-2"
                >
                  <Maximize2 className="h-3 w-3" />
                  <span className="hidden xs:inline">Full Screen</span>
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (document.fullscreenElement) {
                    document.exitFullscreen().catch(() => {});
                  }
                  onFinish();
                }}
                className="h-6 sm:h-7 text-[11px] sm:text-xs text-white/80 hover:bg-rose-500/20 hover:text-rose-300 gap-1 px-1.5 sm:px-2"
                title="Leave quiz match"
              >
                <LogOut className="h-3 w-3" />
                <span>Leave</span>
              </Button>
            </div>
          </div>
        )}

        {/* Real-time Warning Banner if strikes occurred */}
        {proctorWarning && (
          <div className="bg-rose-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between animate-pulse">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {proctorWarning}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={reEnterFullscreen}
              className="h-6 text-[10px] text-white hover:bg-white/20 underline"
            >
              Resume Focus
            </Button>
          </div>
        )}

        {/* Slide-down Live Standings Drawer */}
        {showLeaderboardDrawer && (
          <div className="bg-slate-950/90 border-b border-white/10 p-3 max-h-48 overflow-y-auto space-y-1.5 transition-all">
            <div className="flex items-center justify-between text-[11px] font-bold text-white/60 uppercase pb-1">
              <span>Live Player Standings</span>
              <span>Sub-second Sync</span>
            </div>
            {participants.length === 0 ? (
              <p className="text-xs text-white/40 text-center py-2">Syncing contestant scores...</p>
            ) : (
              participants.map((p, idx) => (
                <div
                  key={p.user_id || idx}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium ${
                    p.user_id === currentUser?.id ? "bg-indigo-600/30 border border-indigo-400 text-white font-bold" : "bg-white/5 border border-white/10 text-white/80"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-400 w-4">#{idx + 1}</span>
                    <span className="truncate max-w-[150px]">{p.name}</span>
                    {p.user_id === currentUser?.id && <Badge className="text-[9px] py-0 px-1 h-4 bg-indigo-500 text-white border-0">You</Badge>}
                  </span>
                  <span className="font-mono font-bold text-amber-300">{p.score} pts</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Top Question Progress Bar */}
        <div className="bg-white/10 h-2 w-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-700"
            style={{ width: `${((currentIndex + 1) / quiz.questions.length) * 100}%` }}
          />
        </div>

        {/* Live Game Stats Header */}
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2.5 sm:py-3.5 px-3 sm:px-6 bg-white/5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap">
            <Badge className="bg-indigo-600/50 hover:bg-indigo-600/50 text-indigo-200 border-indigo-400/40 font-black text-xs sm:text-sm py-1 px-2.5 rounded-xl">
              Q{currentIndex + 1}/{quiz.questions.length}
            </Badge>

            {/* Streak Indicator */}
            {streak >= 2 && (
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black animate-pulse gap-1 text-xs py-1 px-2.5 rounded-xl shadow-md shadow-orange-500/30">
                <Flame className="h-3.5 w-3.5 fill-current" />
                {streak}x Streak!
              </Badge>
            )}

            {/* Live Rank */}
            {myRank > 0 && !isHost && (
              <Badge className="bg-white/10 hover:bg-white/10 text-white border-white/20 font-bold text-xs py-1 px-2.5 rounded-xl">
                Rank #{myRank}
              </Badge>
            )}

            {/* Live Points */}
            {!isHost && (
              <Badge className="bg-amber-400/20 hover:bg-amber-400/20 text-amber-300 border-amber-400/40 font-black font-mono text-xs py-1 px-2.5 rounded-xl">
                ⚡ {score.toLocaleString()} pts
              </Badge>
            )}
          </div>

          {/* Live Question Timer */}
          <div
            className={`flex items-center gap-1.5 sm:gap-2 font-black font-mono text-base sm:text-xl px-3 py-1 rounded-2xl transition-all shrink-0 ${
              timeLeft <= 5
                ? "bg-rose-500/20 text-rose-400 border-2 border-rose-500/50 animate-pulse scale-105"
                : "bg-white/10 text-white border border-white/15"
            }`}
          >
            <Timer className={`h-4 w-4 sm:h-5 sm:w-5 ${timeLeft <= 5 ? "text-rose-400 animate-spin" : "text-amber-400"}`} />
            <span>{String(timeLeft).padStart(2, "0")}s</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 sm:space-y-5 p-3.5 sm:p-6 overflow-y-auto flex-1">
          {/* Question Text Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 text-center sm:text-left">
            <h3 className="text-base sm:text-2xl font-black leading-snug sm:leading-normal text-white">
              {question.question}
            </h3>
          </div>

          {/* Kahoot/Quizizz Vibrant 4-Color Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4 pt-1">
            {question.options.map((opt, i) => {
              const isSelected = selectedAnswer === i;
              const isCorrect = i === question.correctAnswer;

              // 4 Kahoot-inspired color themes
              const themes = [
                {
                  symbol: "▲",
                  colorName: "rose",
                  gradient: "from-rose-600 to-red-600",
                  hoverGradient: "hover:from-rose-500 hover:to-red-500",
                  border: "border-rose-400/40",
                  shapeBg: "bg-rose-950/70 text-rose-200 border-rose-400/50",
                  textColor: "text-white",
                  shadow: "shadow-rose-950/40",
                },
                {
                  symbol: "◆",
                  colorName: "blue",
                  gradient: "from-blue-600 to-indigo-600",
                  hoverGradient: "hover:from-blue-500 hover:to-indigo-500",
                  border: "border-blue-400/40",
                  shapeBg: "bg-blue-950/70 text-blue-200 border-blue-400/50",
                  textColor: "text-white",
                  shadow: "shadow-blue-950/40",
                },
                {
                  symbol: "●",
                  colorName: "yellow",
                  gradient: "from-amber-400 to-yellow-500",
                  hoverGradient: "hover:from-amber-300 hover:to-yellow-400",
                  border: "border-yellow-300/60",
                  shapeBg: "bg-yellow-950/80 text-yellow-200 border-yellow-400/50",
                  textColor: "text-slate-950 font-black",
                  shadow: "shadow-amber-950/40",
                },
                {
                  symbol: "■",
                  colorName: "green",
                  gradient: "from-emerald-600 to-teal-600",
                  hoverGradient: "hover:from-emerald-500 hover:to-teal-500",
                  border: "border-emerald-400/40",
                  shapeBg: "bg-emerald-950/70 text-emerald-200 border-emerald-400/50",
                  textColor: "text-white",
                  shadow: "shadow-emerald-950/40",
                },
              ];

              const t = themes[i % themes.length];

              let cardClasses = `relative w-full h-auto min-h-[58px] sm:min-h-[76px] py-2.5 sm:py-3.5 px-3.5 sm:px-4 rounded-2xl border-2 transition-all duration-150 touch-manipulation active:scale-[0.98] select-none flex items-center text-left ${t.shadow} shadow-lg `;

              if (showResult) {
                if (isCorrect) {
                  cardClasses += "bg-gradient-to-r from-emerald-600 to-teal-600 border-emerald-300 text-white shadow-emerald-900/60 ring-4 ring-emerald-400/40 scale-[1.02] font-black";
                } else if (isSelected && !isCorrect) {
                  cardClasses += "bg-gradient-to-r from-rose-700 to-red-700 border-rose-300 text-white shadow-rose-900/60 ring-2 ring-rose-400/40 font-bold";
                } else {
                  cardClasses += "opacity-35 grayscale bg-slate-800 border-slate-700 text-slate-300";
                }
              } else {
                if (isSelected) {
                  cardClasses += `bg-gradient-to-r ${t.gradient} ${t.border} ${t.textColor} ring-4 ring-white/50 scale-[1.02] shadow-2xl`;
                } else if (selectedAnswer !== null) {
                  cardClasses += "opacity-40 bg-slate-800 border-slate-700 text-slate-300";
                } else {
                  cardClasses += `bg-gradient-to-r ${t.gradient} ${t.hoverGradient} ${t.border} ${t.textColor}`;
                }
              }

              return (
                <button
                  key={i}
                  type="button"
                  className={cardClasses}
                  onClick={() => handleAnswerSelect(i)}
                  disabled={showResult || isHost || selectedAnswer !== null}
                >
                  <div className="flex items-center gap-3 w-full">
                    {/* Shape Symbol Badge */}
                    <div
                      className={`flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 rounded-xl border-2 shrink-0 font-black text-sm sm:text-base ${
                        showResult && isCorrect
                          ? "bg-white text-emerald-700 border-white"
                          : showResult && isSelected && !isCorrect
                          ? "bg-white text-rose-700 border-white"
                          : t.shapeBg
                      }`}
                    >
                      {showResult && isCorrect ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : showResult && isSelected && !isCorrect ? (
                        <XCircle className="h-5 w-5" />
                      ) : (
                        <span>{t.symbol}</span>
                      )}
                    </div>

                    {/* Option Text */}
                    <span className="flex-1 font-bold text-xs sm:text-base leading-snug line-clamp-3">
                      {opt}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Instant Answer Feedback Banner */}
          {showResult && !isHost && (
            <div
              className={`p-3.5 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-black animate-in slide-in-from-bottom-2 ${
                selectedAnswer === question.correctAnswer
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
              }`}
            >
              <div className="flex items-center gap-2">
                {selectedAnswer === question.correctAnswer ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <span>Brilliant! That was correct!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-rose-400" />
                    <span>Correct answer was {String.fromCharCode(65 + question.correctAnswer)}: {question.options[question.correctAnswer]}</span>
                  </>
                )}
              </div>

              {selectedAnswer === question.correctAnswer && (
                <Badge className="bg-emerald-500 text-slate-950 font-mono font-black text-xs">
                  +{lastEarnedPoints} pts
                </Badge>
              )}
            </div>
          )}

          {/* Host Controls */}
          {isHost && (
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/5 p-4 rounded-2xl">
              <div className="text-xs text-white/60 font-semibold">
                Host Controls: Advancing questions synchronizes all connected students.
              </div>
              <div className="flex items-center gap-2">
                {!showResult && (
                  <Button variant="outline" size="sm" onClick={handleTimeUp} className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                    Reveal Answer
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowInterBoard(true);
                    setInterBoardTimer(5);
                    if (channelRef.current) {
                      channelRef.current.send({
                        type: "broadcast",
                        event: "show_leaderboard",
                        payload: {},
                      });
                    }
                  }}
                  className="bg-indigo-600/30 border-indigo-400 text-indigo-300 hover:bg-indigo-600/50 font-bold"
                >
                  <Trophy className="h-3.5 w-3.5 mr-1 text-amber-400" />
                  Show Leaderboard
                </Button>
                <Button
                  onClick={handleNextQuestion}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black shadow-md"
                >
                  {currentIndex < quiz.questions.length - 1 ? "Next Question" : "Conclude Match"}
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
