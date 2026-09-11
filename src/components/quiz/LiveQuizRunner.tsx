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
} from "lucide-react";
import { quizAudio } from "@/lib/quizAudio";
import { triggerConfetti } from "@/lib/confetti";

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

  const channelRef = useRef<any>(null);
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

  // Fetch session config (e.g. time_per_question)
  useEffect(() => {
    const fetchSessionSettings = async () => {
      try {
        const { data } = await supabase
          .from("quiz_sessions")
          .select("time_per_question")
          .eq("id", sessionId)
          .maybeSingle();

        if (data?.time_per_question) {
          setTotalTime(data.time_per_question);
          setTimeLeft(data.time_per_question);
        }
      } catch (err) {
        console.warn("Could not fetch session config:", err);
      }
    };

    fetchSessionSettings();
  }, [sessionId]);

  // Realtime channel for question synchronization and live presence leaderboard
  useEffect(() => {
    const channel = supabase.channel(`quiz_session_${sessionId}`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "next_question" }, (payload) => {
        setCurrentIndex(payload.payload.index);
        setSelectedAnswer(null);
        setShowResult(false);
        setTimeLeft(totalTime);
      })
      .on("broadcast", { event: "end_quiz" }, (payload) => {
        finishQuiz();
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const pList = Object.values(state).flatMap((users: any) => users) as ParticipantScore[];
        // Sort descending by score
        pList.sort((a, b) => (b.score || 0) - (a.score || 0));
        setParticipants(pList);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && currentUser) {
          await channel.track({
            user_id: currentUser.id,
            name: currentUser.name,
            score: 0,
            avatar_url: currentUser.avatar_url,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, currentUser, totalTime]);

  // Reset per question
  useEffect(() => {
    setSelectedAnswer(null);
    setShowResult(false);
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
  };

  const handleAnswerSelect = async (index: number) => {
    if (showResult || selectedAnswer !== null || isHost) return;
    setSelectedAnswer(index);
    setShowResult(true);

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

      if (currentStreak >= 2) {
        quizAudio.playStreak();
      } else {
        quizAudio.playCorrect();
      }

      // Update Presence with live score
      if (channelRef.current && currentUser) {
        channelRef.current.track({
          user_id: currentUser.id,
          name: currentUser.name,
          score: newScore,
          avatar_url: currentUser.avatar_url,
        });
      }
    } else {
      setStreak(0);
      setLastEarnedPoints(0);
      quizAudio.playIncorrect();
    }
  };

  const handleNextQuestion = async () => {
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

  const finishQuiz = async () => {
    setIsFinished(true);
    triggerConfetti();
    quizAudio.playLeagueStart();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      if (!isHost) {
        const pointsReward = Math.min(score, 1000);
        // Record in quiz_results
        await supabase.from("quiz_results").insert({
          quiz_id: quiz.id,
          user_id: user.id,
          score: Math.round((score / ((quiz.questions.length || 1) * 750)) * 100),
          points_earned: pointsReward,
          answers: {},
        });

        // Award points to user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("points")
          .eq("id", user.id)
          .single();

        if (profile) {
          await supabase
            .from("profiles")
            .update({ points: (profile.points || 0) + pointsReward })
            .eq("id", user.id);
        }
      }
    } catch (e) {
      console.error("Error saving final league score:", e);
    }
  };

  // Find user's live rank
  const myRank = participants.findIndex((p) => p.user_id === currentUser?.id) + 1;

  // Podium screen when quiz concludes
  if (isFinished) {
    const top1 = participants[0];
    const top2 = participants[1];
    const top3 = participants[2];

    return (
      <Card className="max-w-3xl mx-auto shadow-2xl border-2 border-amber-500/40 overflow-hidden bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 text-white animate-in zoom-in-95 duration-500">
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 p-6 text-slate-950 text-center relative overflow-hidden">
          <Sparkles className="h-6 w-6 absolute top-3 left-4 animate-spin" />
          <Sparkles className="h-6 w-6 absolute bottom-3 right-4 animate-spin" />
          <Trophy className="h-12 w-12 mx-auto mb-2 fill-current" />
          <h2 className="text-3xl font-black uppercase tracking-tight">Quiz League Finale!</h2>
          <p className="font-bold text-sm opacity-90">{quiz.title}</p>
        </div>

        <CardContent className="p-6 sm:p-8 space-y-8">
          {/* Olympic Podium */}
          <div className="flex items-end justify-center gap-3 sm:gap-6 pt-6 pb-2">
            {/* 2nd Place */}
            <div className="flex flex-col items-center flex-1 max-w-[130px]">
              <div className="text-center mb-2">
                <Medal className="h-7 w-7 text-slate-300 mx-auto" />
                <p className="text-xs font-bold truncate mt-1">{top2?.name || "Runner Up"}</p>
                <p className="text-[11px] font-mono text-slate-400">{top2?.score || 0} pts</p>
              </div>
              <div className="w-full h-24 sm:h-28 bg-gradient-to-t from-slate-800 to-slate-600 rounded-t-2xl flex items-center justify-center border-t-2 border-slate-400 shadow-lg">
                <span className="text-2xl sm:text-3xl font-black text-slate-200">2nd</span>
              </div>
            </div>

            {/* 1st Place */}
            <div className="flex flex-col items-center flex-1 max-w-[150px]">
              <div className="text-center mb-2">
                <Trophy className="h-9 w-9 text-amber-300 mx-auto fill-amber-300 animate-bounce" />
                <p className="text-sm font-black truncate mt-1 text-amber-300">{top1?.name || "Champion"}</p>
                <p className="text-xs font-mono font-bold text-amber-400">{top1?.score || 0} pts</p>
              </div>
              <div className="w-full h-36 sm:h-40 bg-gradient-to-t from-amber-700 via-amber-500 to-yellow-400 rounded-t-2xl flex items-center justify-center border-t-4 border-yellow-200 shadow-2xl shadow-amber-500/40">
                <span className="text-3xl sm:text-4xl font-black text-slate-950">1st</span>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center flex-1 max-w-[130px]">
              <div className="text-center mb-2">
                <Medal className="h-7 w-7 text-amber-700 mx-auto" />
                <p className="text-xs font-bold truncate mt-1">{top3?.name || "Contender"}</p>
                <p className="text-[11px] font-mono text-amber-600">{top3?.score || 0} pts</p>
              </div>
              <div className="w-full h-16 sm:h-20 bg-gradient-to-t from-amber-950 to-amber-800 rounded-t-2xl flex items-center justify-center border-t-2 border-amber-600 shadow-lg">
                <span className="text-xl sm:text-2xl font-black text-amber-200">3rd</span>
              </div>
            </div>
          </div>

          {/* User's Result Banner */}
          {!isHost && (
            <div className="bg-white/10 border border-white/20 rounded-2xl p-4 text-center space-y-1">
              <p className="text-xs uppercase font-bold text-indigo-300 tracking-wider">Your Performance</p>
              <p className="text-2xl sm:text-3xl font-black text-amber-300">
                {score.toLocaleString()} Points
              </p>
              {myRank > 0 && (
                <p className="text-sm text-white/80">
                  You placed <strong className="text-white">#{myRank}</strong> out of {participants.length} contestants!
                </p>
              )}
            </div>
          )}

          {/* Action button */}
          <div className="text-center pt-2">
            <Button
              onClick={onFinish}
              className="h-12 px-8 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black text-base shadow-xl"
            >
              Return to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-3xl mx-auto shadow-2xl border-2 border-primary/20 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      {/* Top Question Progress Bar */}
      <div className="bg-muted h-2.5 w-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-700"
          style={{ width: `${((currentIndex + 1) / quiz.questions.length) * 100}%` }}
        />
      </div>

      {/* Live Stats Header */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-muted/20 border-b">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-bold">
            Question {currentIndex + 1} / {quiz.questions.length}
          </Badge>

          {/* Streak Indicator */}
          {streak >= 2 && (
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black animate-pulse gap-1">
              <Flame className="h-3.5 w-3.5 fill-current" />
              {streak}x Streak!
            </Badge>
          )}

          {/* Live Rank */}
          {myRank > 0 && !isHost && (
            <Badge variant="secondary" className="font-bold text-xs gap-1">
              Rank #{myRank}
            </Badge>
          )}
        </div>

        {/* Live Question Timer */}
        <div
          className={`flex items-center gap-2 font-black font-mono text-xl px-3 py-1 rounded-xl transition-all ${
            timeLeft <= 5
              ? "bg-rose-500/10 text-rose-600 border border-rose-500/30 animate-pulse scale-110"
              : "text-foreground"
          }`}
        >
          <Timer className="h-5 w-5" />
          {String(timeLeft).padStart(2, "0")}s
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* Score & Streak floating stats for student */}
        {!isHost && (
          <div className="flex items-center justify-between bg-primary/5 border border-primary/10 rounded-2xl px-4 py-2.5 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-primary">
              <Trophy className="h-4 w-4" /> Score: <strong className="text-base font-black">{score}</strong>
            </span>
            <span className="text-muted-foreground">
              Base: 500 • Speed: Up to +200 • Streak: +50/ea
            </span>
          </div>
        )}

        {/* Question Text */}
        <h3 className="text-xl sm:text-2xl font-bold leading-snug">{question.question}</h3>

        {/* Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
          {question.options.map((opt, i) => {
            const isSelected = selectedAnswer === i;
            const isCorrect = i === question.correctAnswer;

            let btnClass =
              "h-auto min-h-[64px] py-3.5 px-4 text-left justify-start items-center whitespace-normal border-2 text-sm sm:text-base rounded-2xl transition-all duration-200 ";

            if (showResult) {
              if (isCorrect) {
                btnClass += "bg-emerald-500/15 border-emerald-500 text-emerald-950 dark:text-emerald-100 font-bold shadow-md";
              } else if (isSelected && !isCorrect) {
                btnClass += "bg-rose-500/15 border-rose-500 text-rose-950 dark:text-rose-100 font-bold";
              } else {
                btnClass += "opacity-40 border-border bg-background";
              }
            } else {
              if (isSelected) {
                btnClass += "border-primary bg-primary/10 shadow-lg scale-[1.02]";
              } else {
                btnClass += "border-border hover:border-primary/60 hover:bg-muted/50 bg-card";
              }
            }

            return (
              <Button
                key={i}
                variant="outline"
                className={btnClass}
                onClick={() => handleAnswerSelect(i)}
                disabled={showResult || isHost}
              >
                <div className="flex items-center gap-3 w-full">
                  <div
                    className={`flex items-center justify-center h-8 w-8 rounded-full border-2 shrink-0 font-bold text-xs ${
                      showResult && isCorrect
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : showResult && isSelected && !isCorrect
                        ? "bg-rose-500 border-rose-500 text-white"
                        : isSelected
                        ? "border-primary text-primary bg-primary/20"
                        : "border-muted-foreground/30 text-muted-foreground"
                    }`}
                  >
                    {showResult && isCorrect ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : showResult && isSelected && !isCorrect ? (
                      <XCircle className="h-4 w-4" />
                    ) : (
                      String.fromCharCode(65 + i)
                    )}
                  </div>
                  <span className="flex-1 font-medium leading-tight">{opt}</span>
                </div>
              </Button>
            );
          })}
        </div>

        {/* Instant Answer Feedback Banner */}
        {showResult && !isHost && (
          <div
            className={`p-3.5 rounded-2xl flex items-center justify-between text-sm font-bold animate-in slide-in-from-bottom-2 ${
              selectedAnswer === question.correctAnswer
                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                : "bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30"
            }`}
          >
            <div className="flex items-center gap-2">
              {selectedAnswer === question.correctAnswer ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span>Brilliant! That was correct!</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-rose-500" />
                  <span>Oops! Streak reset. Correct answer was {String.fromCharCode(65 + question.correctAnswer)}.</span>
                </>
              )}
            </div>

            {selectedAnswer === question.correctAnswer && (
              <Badge className="bg-emerald-500 text-white font-mono font-black">
                +{lastEarnedPoints} pts
              </Badge>
            )}
          </div>
        )}

        {/* Host Controls */}
        {isHost && (
          <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/40 p-4 rounded-2xl">
            <div className="text-xs text-muted-foreground font-semibold">
              Host Controls: Advancing questions synchronizes all connected students.
            </div>
            <div className="flex items-center gap-2">
              {!showResult && (
                <Button variant="outline" size="sm" onClick={handleTimeUp}>
                  Reveal Answer
                </Button>
              )}
              <Button
                onClick={handleNextQuestion}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md"
              >
                {currentIndex < quiz.questions.length - 1 ? "Next Question" : "Conclude Quiz"}
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
