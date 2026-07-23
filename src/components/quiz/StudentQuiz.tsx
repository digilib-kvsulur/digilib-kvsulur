import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Clock, Award, CheckCircle, AlertCircle, ChevronLeft,
  ChevronRight, Trophy, Zap, Star, RotateCcw, Home,
  BookOpen, Target, Timer, Check, X
} from "lucide-react";
import { Quiz, QuizResult, QuestionResult } from "@/types/quiz";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StudentQuizProps {
  quiz: Quiz;
  onComplete: (result: QuizResult) => void;
  onBack: () => void;
}

const COMPLETION_BONUS_DEFAULT = 10;
const OPTION_LABELS = ["A", "B", "C", "D", "E"];

export const StudentQuiz = ({ quiz, onComplete, onBack }: StudentQuizProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(quiz.questions.length).fill(-1));
  const [timeRemaining, setTimeRemaining] = useState(quiz.timeLimit * 60);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [alreadyTaken, setAlreadyTaken] = useState(false);
  const [alreadyTakenData, setAlreadyTakenData] = useState<{ score: number; completed_at: string } | null>(null);
  const [checkingAttempt, setCheckingAttempt] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitWarning, setShowSubmitWarning] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => { checkPreviousAttempt(); }, [quiz.id]);

  const checkPreviousAttempt = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('quiz_results')
        .select('id, completed_at, score, points_earned')
        .eq('quiz_id', quiz.id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) { setAlreadyTaken(true); setAlreadyTakenData(data); }
    } catch (e) { console.error(e); }
    finally { setCheckingAttempt(false); }
  };

  // Timer
  useEffect(() => {
    if (timeRemaining > 0 && !isCompleted && !alreadyTaken && !checkingAttempt) {
      const t = setTimeout(() => setTimeRemaining(p => p - 1), 1000);
      return () => clearTimeout(t);
    } else if (timeRemaining === 0 && !isCompleted && !alreadyTaken && !checkingAttempt) {
      void handleSubmitQuiz(true);
    }
  }, [timeRemaining, isCompleted, alreadyTaken, checkingAttempt]); // eslint-disable-line

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const answeredCount = answers.filter(a => a !== -1).length;
  const progress = (answeredCount / quiz.questions.length) * 100;
  const unansweredCount = quiz.questions.length - answeredCount;

  const handleAnswerSelect = (optionIndex: number) => {
    if (isCompleted) return;
    const next = [...answers];
    next[currentQuestionIndex] = optionIndex;
    setAnswers(next);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const timeColor = timeRemaining < 60 ? "text-red-500" : timeRemaining < 300 ? "text-orange-500" : "text-emerald-600";

  const calculateResult = useCallback((): QuizResult => {
    const totalQuestions = quiz.questions.length;
    const pointsReward = Number(quiz.pointsReward) || 50;
    const completionBonus = Number(quiz.completionBonus ?? COMPLETION_BONUS_DEFAULT);

    let correctAnswers = 0;
    const questionResults: QuestionResult[] = quiz.questions.map((q, i) => {
      const isCorrect = answers[i] === q.correctAnswer;
      if (isCorrect) correctAnswers++;
      return {
        questionIndex: i,
        question: q.question,
        options: q.options,
        selectedAnswer: answers[i],
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation,
      };
    });

    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    const pointsEarned = Math.round((score / 100) * pointsReward);
    const totalPointsAwarded = pointsEarned + completionBonus;
    const timeSpent = (quiz.timeLimit * 60) - timeRemaining;

    return {
      quizId: quiz.id,
      quizTitle: quiz.title,
      score,
      totalQuestions,
      correctAnswers,
      pointsEarned,
      completionBonus,
      totalPointsAwarded,
      completedAt: new Date().toISOString(),
      timeSpent,
      answers: [...answers],
      questionResults,
    };
  }, [answers, quiz, timeRemaining]);

  const handleSubmitQuiz = async (forceSubmit = false) => {
    if (alreadyTaken || submitting) return;

    if (!forceSubmit && unansweredCount > 0) {
      setShowSubmitWarning(true);
      return;
    }

    setShowSubmitWarning(false);
    setSubmitting(true);
    setIsCompleted(true);

    const result = calculateResult();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Race-condition guard
      const { data: existing } = await supabase
        .from('quiz_results')
        .select('id')
        .eq('quiz_id', quiz.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) { setAlreadyTaken(true); setSubmitting(false); return; }

      // Save result
      const { error: insertErr } = await supabase.from('quiz_results').insert({
        quiz_id: quiz.id,
        user_id: user.id,
        score: result.score,
        points_earned: result.totalPointsAwarded,
        answers: result.answers,
      });
      if (insertErr) throw insertErr;

      // Award points
      const { data: prof } = await supabase.from('profiles').select('points').eq('id', user.id).single();
      if (prof && result.totalPointsAwarded > 0) {
        await supabase.from('profiles').update({ points: (Number(prof.points) || 0) + result.totalPointsAwarded }).eq('id', user.id);
      }

      setQuizResult(result);
      setShowResult(true);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error saving result", description: e.message, variant: "destructive" });
      setIsCompleted(false);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Loading ───────────────────────────────────────────
  if (checkingAttempt) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full border-4 border-primary/30 border-t-primary animate-spin mx-auto" />
          <p className="text-muted-foreground font-medium">Checking availability…</p>
        </div>
      </div>
    );
  }

  // ─── Already Taken ─────────────────────────────────────
  if (alreadyTaken) {
    return (
      <div className="max-w-lg mx-auto py-12">
        <div className="rounded-3xl border border-border/50 bg-card shadow-xl overflow-hidden">
          <div className="gradient-primary p-1" />
          <div className="p-8 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
              <AlertCircle className="h-10 w-10 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Already Completed</h2>
            <p className="text-muted-foreground">You took <strong className="text-foreground">"{quiz.title}"</strong> on{" "}
              {alreadyTakenData ? new Date(alreadyTakenData.completed_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "a previous date"}.
            </p>
            {alreadyTakenData && (
              <div className="bg-muted/40 rounded-2xl p-4 inline-block">
                <span className="text-3xl font-black text-primary">{alreadyTakenData.score}%</span>
                <p className="text-xs text-muted-foreground mt-1">Your previous score</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Each quiz can only be attempted once.</p>
            <Button onClick={onBack} className="mt-2 w-full rounded-xl">
              <Home className="h-4 w-4 mr-2" /> Back to Quizzes
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Result Screen ─────────────────────────────────────
  if (showResult && quizResult) {
    const { score, correctAnswers, totalQuestions, pointsEarned, completionBonus, totalPointsAwarded, timeSpent, questionResults } = quizResult;
    const grade = score >= 90 ? { label: "Excellent!", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" }
      : score >= 70 ? { label: "Good Job!", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" }
      : score >= 50 ? { label: "Passed!", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" }
      : { label: "Keep Practicing", color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/30" };

    return (
      <div className="max-w-2xl mx-auto py-6 space-y-5 px-2">
        {/* Score Card */}
        <div className="rounded-3xl border border-border/50 bg-card shadow-xl overflow-hidden">
          <div className="gradient-primary p-1" />
          <div className="p-6 text-center space-y-5">
            <div className="flex items-center justify-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="10" />
                  <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor"
                    className={score >= 50 ? "text-primary" : "text-destructive"}
                    strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={`${(score / 100) * 326.7} 326.7`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-foreground">{score}%</span>
                  <span className="text-xs text-muted-foreground">Score</span>
                </div>
              </div>
            </div>
            <div>
              <p className={`text-2xl font-bold ${grade.color}`}>{grade.label}</p>
              <p className="text-sm text-muted-foreground mt-1">{correctAnswers} of {totalQuestions} correct · {Math.floor(timeSpent / 60)}m {timeSpent % 60}s</p>
            </div>

            {/* Points Breakdown */}
            <div className="grid grid-cols-3 gap-3">
              <div className={`rounded-2xl p-3 ${grade.bg}`}>
                <p className={`text-xl font-bold ${grade.color}`}>{pointsEarned}</p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Score Pts</p>
              </div>
              <div className="rounded-2xl p-3 bg-violet-50 dark:bg-violet-950/30">
                <p className="text-xl font-bold text-violet-600">+{completionBonus}</p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Bonus</p>
              </div>
              <div className="rounded-2xl p-3 bg-amber-50 dark:bg-amber-950/30">
                <p className="text-xl font-bold text-amber-600">{totalPointsAwarded}</p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Total Pts</p>
              </div>
            </div>

            <Button onClick={() => { onComplete(quizResult); onBack(); }} className="w-full rounded-xl gradient-primary border-0">
              <Home className="h-4 w-4 mr-2" /> Back to Quizzes
            </Button>
          </div>
        </div>

        {/* Question Review */}
        <div className="space-y-3">
          <h3 className="text-base font-bold text-foreground px-1">Question Review</h3>
          {questionResults.map((qr, i) => (
            <div key={i} className={`rounded-2xl border p-4 space-y-3 ${qr.isCorrect ? "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-red-200 bg-red-50/50 dark:bg-red-950/20"}`}>
              <div className="flex items-start gap-2">
                <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${qr.isCorrect ? "bg-emerald-500" : "bg-red-500"}`}>
                  {qr.isCorrect ? <Check className="h-3.5 w-3.5 text-white" /> : <X className="h-3.5 w-3.5 text-white" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-snug">Q{i + 1}. {qr.question}</p>
                </div>
              </div>
              <div className="grid gap-1.5 pl-8">
                {qr.options.map((opt, j) => {
                  const isCorrect = j === qr.correctAnswer;
                  const isSelected = j === qr.selectedAnswer;
                  const cls = isCorrect
                    ? "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-400 text-emerald-800 dark:text-emerald-200"
                    : isSelected
                    ? "bg-red-100 dark:bg-red-900/30 border-red-400 text-red-800 dark:text-red-200"
                    : "bg-background border-border/40 text-muted-foreground";
                  return (
                    <div key={j} className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${cls}`}>
                      <span className="font-bold text-xs">{OPTION_LABELS[j]}</span>
                      <span className="flex-1 truncate">{opt}</span>
                      {isCorrect && <Check className="h-3 w-3 shrink-0" />}
                      {!isCorrect && isSelected && <X className="h-3 w-3 shrink-0" />}
                    </div>
                  );
                })}
              </div>
              {qr.explanation && (
                <p className="text-xs text-muted-foreground pl-8 italic border-t border-border/30 pt-2">{qr.explanation}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Quiz Attempt ──────────────────────────────────────
  const perQuestionPts = Math.round((Number(quiz.pointsReward) || 50) / quiz.questions.length);

  return (
    <div className="max-w-4xl mx-auto px-2 pb-8">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 -mx-2 px-4 py-3 mb-5">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="shrink-0 h-8 px-2 rounded-lg">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-muted-foreground truncate">{quiz.title}</p>
            <Progress value={progress} className="h-1.5 mt-1" />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-muted-foreground font-medium">{answeredCount}/{quiz.questions.length}</span>
            <div className={`flex items-center gap-1 font-mono font-bold text-sm ${timeColor}`}>
              <Timer className="h-3.5 w-3.5" />
              {formatTime(timeRemaining)}
            </div>
            <Badge variant="outline" className="text-xs hidden sm:inline-flex">
              <Award className="h-3 w-3 mr-1 text-amber-500" /> {quiz.pointsReward} pts
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-5">
        {/* Main Question Area */}
        <div className="space-y-4">
          {/* Question Card */}
          <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
            {/* Question header */}
            <div className="bg-muted/40 border-b border-border/30 px-5 py-3 flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Question {currentQuestionIndex + 1} <span className="text-border">/ {quiz.questions.length}</span>
              </span>
              <div className="flex items-center gap-1 text-xs text-amber-600 font-semibold">
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                ~{perQuestionPts} pts
              </div>
            </div>

            {/* Question text */}
            <div className="px-5 py-5">
              <p className="text-base sm:text-lg font-semibold text-foreground leading-relaxed">
                {currentQuestion.question}
              </p>
            </div>

            {/* Options */}
            <div className="px-5 pb-5 space-y-2.5">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = answers[currentQuestionIndex] === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswerSelect(idx)}
                    className={`w-full text-left rounded-xl border-2 px-4 py-3.5 flex items-center gap-3.5 transition-all duration-150 group
                      ${isSelected
                        ? "border-primary bg-primary/8 shadow-sm shadow-primary/10"
                        : "border-border/50 bg-background hover:border-primary/40 hover:bg-primary/5"
                      }`}
                  >
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 transition-colors
                      ${isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40 text-muted-foreground group-hover:border-primary/50"}`}>
                      {OPTION_LABELS[idx]}
                    </div>
                    <span className={`flex-1 text-sm font-medium leading-snug ${isSelected ? "text-foreground" : "text-foreground/80"}`}>
                      {option}
                    </span>
                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setCurrentQuestionIndex(p => p - 1)}
              disabled={currentQuestionIndex === 0} className="rounded-xl gap-1.5">
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <div className="flex-1" />
            {currentQuestionIndex < quiz.questions.length - 1 ? (
              <Button onClick={() => setCurrentQuestionIndex(p => p + 1)}
                className="rounded-xl gap-1.5">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={() => handleSubmitQuiz(false)} disabled={submitting}
                className="rounded-xl gradient-primary border-0 gap-1.5 px-6">
                <Trophy className="h-4 w-4" /> {submitting ? "Submitting…" : "Submit Quiz"}
              </Button>
            )}
          </div>

          {/* Mobile Palette Toggle */}
          <div className="lg:hidden">
            <Button variant="outline" size="sm" onClick={() => setPaletteOpen(p => !p)} className="w-full rounded-xl text-xs">
              <Target className="h-3.5 w-3.5 mr-2" /> {paletteOpen ? "Hide" : "Show"} Question Palette ({answeredCount}/{quiz.questions.length})
            </Button>
            {paletteOpen && <QuestionPalette questions={quiz.questions} answers={answers} current={currentQuestionIndex} onSelect={setCurrentQuestionIndex} />}
          </div>
        </div>

        {/* Desktop Sidebar Palette */}
        <div className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
            <div className="bg-muted/40 border-b border-border/30 px-4 py-2.5">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Questions</p>
            </div>
            <div className="p-3">
              <QuestionPalette questions={quiz.questions} answers={answers} current={currentQuestionIndex} onSelect={setCurrentQuestionIndex} />
            </div>

            {/* Submit from sidebar */}
            <div className="px-3 pb-3">
              <Button onClick={() => handleSubmitQuiz(false)} disabled={submitting} size="sm"
                className="w-full rounded-xl gradient-primary border-0 text-xs">
                <Trophy className="h-3.5 w-3.5 mr-1.5" /> {submitting ? "Saving…" : "Submit"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Warning Modal */}
      {showSubmitWarning && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl border border-border/50 shadow-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
                <AlertCircle className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Unanswered Questions</h3>
                <p className="text-sm text-muted-foreground">{unansweredCount} question{unansweredCount > 1 ? "s" : ""} left unanswered.</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Unanswered questions will be marked wrong. Do you want to submit anyway?</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowSubmitWarning(false)} className="flex-1 rounded-xl">
                Go Back
              </Button>
              <Button onClick={() => handleSubmitQuiz(true)} disabled={submitting} className="flex-1 rounded-xl gradient-primary border-0">
                {submitting ? "Submitting…" : "Submit Anyway"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Question Palette Sub-component ───────────────────────
const QuestionPalette = ({
  questions, answers, current, onSelect
}: {
  questions: any[], answers: number[], current: number, onSelect: (i: number) => void
}) => (
  <div className="grid grid-cols-5 gap-1.5 mb-3">
    {questions.map((_, i) => {
      const answered = answers[i] !== -1;
      const isCurrent = i === current;
      return (
        <button key={i} onClick={() => onSelect(i)}
          title={`Q${i + 1}`}
          className={`w-9 h-9 rounded-lg text-xs font-bold border-2 transition-all
            ${isCurrent ? "border-primary bg-primary text-primary-foreground scale-110 shadow-md"
              : answered ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
              : "border-border/50 bg-background text-muted-foreground hover:border-primary/40"}`}>
          {i + 1}
        </button>
      );
    })}
  </div>
);
