import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Trophy, Clock, Award, TrendingUp, Star, Play, Sparkles, HelpCircle, Calendar, CheckCircle2, Check, X, Eye } from "lucide-react";
import { Quiz, QuizResult } from "@/types/quiz";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface QuizPageProps {
  quizzes: Quiz[];
  results: QuizResult[];
  onSelectQuiz: (quiz: Quiz) => void;
}

const QuizPage = ({ quizzes, results, onSelectQuiz }: QuizPageProps) => {
  const { toast } = useToast();
  const [selectedReview, setSelectedReview] = useState<any | null>(null);

  const handleStartQuiz = (quiz: Quiz) => {
    try {
      console.log('Starting quiz:', quiz);
      toast({
        title: "Starting Quiz",
        description: `Starting "${quiz.title}" - Good luck!`,
      });
      onSelectQuiz(quiz);
    } catch (error) {
      console.error('Error starting quiz:', error);
      toast({
        title: "Error",
        description: "Unable to start quiz. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getDifficultyStyles = (diff?: string) => {
    switch (diff) {
      case "easy":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      case "medium":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
      case "hard":
        return "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20";
      default:
        return "bg-slate-500/10 text-slate-700 border-slate-500/20";
    }
  };

  const OPTION_LABELS = ["A", "B", "C", "D", "E"];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" /> Library Quizzes
        </h2>
        <p className="text-sm text-muted-foreground">Challenge yourself, review past performances, and earn points.</p>
      </div>

      <Tabs defaultValue="available" className="w-full space-y-4">
        <TabsList className="bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="available">Available Quizzes</TabsTrigger>
          <TabsTrigger value="results">My Results</TabsTrigger>
        </TabsList>

        {/* Available Quizzes Content */}
        <TabsContent value="available" className="mt-0 space-y-4">
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                  <Play className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black text-foreground">Active Quizzes</CardTitle>
                  <CardDescription className="text-xs">Select any quiz to test your comprehension</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {quizzes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <HelpCircle className="h-10 w-10 text-muted-foreground/45 mx-auto mb-2" />
                  <p className="text-sm font-semibold">No quizzes available</p>
                  <p className="text-xs">Check back later for new reading challenges!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quizzes.map((quiz) => (
                    <div 
                      key={quiz.id} 
                      className="group flex flex-col justify-between border border-border/50 rounded-2xl p-5 bg-card hover:bg-slate-50/30 hover:shadow-md hover:border-indigo-500/25 transition-all duration-300 hover:-translate-y-0.5"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="font-extrabold text-foreground group-hover:text-indigo-600 transition-colors text-base line-clamp-1 leading-snug">
                            {quiz.title}
                          </h4>
                          <Badge variant="outline" className={`capitalize text-[10px] font-bold px-2 py-0.5 border ${getDifficultyStyles(quiz.difficulty)}`}>
                            {quiz.difficulty}
                          </Badge>
                        </div>
                        
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed h-8">
                          {quiz.description || "Test your reading retention of this book."}
                        </p>

                        <div className="flex items-center gap-3 flex-wrap pt-1 text-[11px] text-muted-foreground font-semibold">
                          <span className="flex items-center gap-1 bg-slate-100 rounded-lg px-2.5 py-1">
                            <Clock className="h-3.5 w-3.5 text-indigo-500" />
                            {quiz.timeLimit}m
                          </span>
                          <span className="flex items-center gap-1 bg-amber-50 rounded-lg px-2.5 py-1 text-amber-700">
                            <Award className="h-3.5 w-3.5 text-amber-500" />
                            {quiz.pointsReward} XP
                          </span>
                          <span className="flex items-center gap-1 bg-violet-50 rounded-lg px-2.5 py-1 text-violet-700">
                            <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                            +{quiz.completionBonus ?? 10} Bonus
                          </span>
                          <span className="flex items-center gap-1 bg-slate-100 rounded-lg px-2.5 py-1">
                            <HelpCircle className="h-3.5 w-3.5 text-sky-500" />
                            {quiz.questions.length} Qs
                          </span>
                        </div>
                      </div>

                      <div className="pt-5 mt-auto">
                        <Button 
                          onClick={() => handleStartQuiz(quiz)}
                          className="w-full gradient-primary border-0 text-white font-bold rounded-xl h-9.5 text-xs shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all"
                        >
                          <Play className="h-3.5 w-3.5 mr-1.5" /> Start Quiz
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quiz Results Content */}
        <TabsContent value="results" className="mt-0 space-y-4">
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black text-foreground">Quiz Results History</CardTitle>
                  <CardDescription className="text-xs">Your personal performance logs</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {results.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <Trophy className="h-10 w-10 text-muted-foreground/45 mx-auto mb-2" />
                  <p className="text-sm font-semibold">No quizzes taken yet</p>
                  <p className="text-xs">Test your learning by taking your first quiz!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {results.slice(-15).reverse().map((result, index) => {
                    const quizTitle = result.quizTitle || (result as any).quizzes?.title || "Quiz";
                    const score = result.score || 0;
                    const completedAt = result.completedAt || (result as any).completed_at;
                    const pointsEarned = result.pointsEarned || (result as any).points_earned || 0;
                    const qList = (result as any).quizzes?.questions || [];
                    const totalQuestions = result.totalQuestions || qList.length || 0;
                    const correctAnswers = result.correctAnswers !== undefined ? result.correctAnswers : Math.round((score / 100) * totalQuestions);

                    return (
                      <div 
                        key={index} 
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border/60 hover:bg-slate-50/50 transition-colors"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${score >= 75 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-sm text-foreground truncate">{quizTitle}</h4>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{completedAt ? new Date(completedAt).toLocaleDateString("en-IN") : "Unknown"}</span>
                              <span>•</span>
                              <span>{correctAnswers}/{totalQuestions} correct answers</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3.5 self-end sm:self-center">
                          {qList.length > 0 && result.answers && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-xs h-8 text-indigo-600 hover:text-indigo-700"
                              onClick={() => setSelectedReview(result)}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" /> Analysis
                            </Button>
                          )}
                          <div className="text-right">
                            <span className="text-xs text-muted-foreground block">Score</span>
                            <span className={`font-black text-sm ${score >= 75 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                              {score}%
                            </span>
                          </div>
                          <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 font-bold border border-amber-500/20 py-1 text-xs">
                            <Star className="h-3.5 w-3.5 mr-1 fill-amber-500 text-amber-500 shrink-0" />
                            +{pointsEarned} XP
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quiz Analysis Review Modal */}
      {selectedReview && (
        <Dialog open={!!selectedReview} onOpenChange={(o) => !o && setSelectedReview(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-black flex items-center gap-2">
                <Trophy className="h-5 w-5 text-indigo-600" />
                Quiz Analysis: {selectedReview.quizTitle || selectedReview.quizzes?.title}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Review your answers, correct answers, and explanations.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-3 gap-3 text-center border-b pb-4">
                <div className="bg-slate-50 p-2 rounded-xl">
                  <p className="text-lg font-black text-slate-800">{selectedReview.score}%</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Your Score</p>
                </div>
                <div className="bg-emerald-50 p-2 rounded-xl">
                  <p className="text-lg font-black text-emerald-700">
                    {selectedReview.correctAnswers !== undefined 
                      ? selectedReview.correctAnswers 
                      : Math.round((selectedReview.score / 100) * (selectedReview.quizzes?.questions?.length || 0))}
                    /{selectedReview.quizzes?.questions?.length || 0}
                  </p>
                  <p className="text-[10px] text-emerald-600 uppercase font-bold">Correct</p>
                </div>
                <div className="bg-amber-50 p-2 rounded-xl">
                  <p className="text-lg font-black text-amber-700">+{selectedReview.pointsEarned || selectedReview.points_earned} XP</p>
                  <p className="text-[10px] text-amber-600 uppercase font-bold">Earned</p>
                </div>
              </div>

              <div className="space-y-3">
                {((selectedReview.quizzes?.questions as any[]) || []).map((q, i) => {
                  const userAnswer = selectedReview.answers?.[i];
                  const isCorrect = userAnswer === q.correctAnswer;
                  
                  return (
                    <div 
                      key={i} 
                      className={`rounded-2xl border p-4 space-y-3 ${isCorrect ? "border-emerald-200 bg-emerald-50/30" : "border-red-200 bg-red-50/30"}`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${isCorrect ? "bg-emerald-500" : "bg-red-500"}`}>
                          {isCorrect ? <Check className="h-3.5 w-3.5 text-white" /> : <X className="h-3.5 w-3.5 text-white" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground leading-snug">Q{i + 1}. {q.question}</p>
                        </div>
                      </div>
                      <div className="grid gap-1.5 pl-8">
                        {(q.options as string[]).map((opt, j) => {
                          const optionIsCorrect = j === q.correctAnswer;
                          const optionIsSelected = j === userAnswer;
                          const cls = optionIsCorrect
                            ? "bg-emerald-100 border-emerald-400 text-emerald-800"
                            : optionIsSelected
                            ? "bg-red-100 border-red-400 text-red-800"
                            : "bg-background border-border/40 text-muted-foreground";

                          return (
                            <div key={j} className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${cls}`}>
                              <span className="font-bold text-xs">{OPTION_LABELS[j]}</span>
                              <span className="flex-1 truncate">{opt}</span>
                              {optionIsCorrect && <Check className="h-3 w-3 shrink-0" />}
                              {!optionIsCorrect && optionIsSelected && <X className="h-3 w-3 shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                      {q.explanation && (
                        <p className="text-xs text-muted-foreground pl-8 italic border-t border-border/30 pt-2">{q.explanation}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default QuizPage;
