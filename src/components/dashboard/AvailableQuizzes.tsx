import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Trophy, Clock, Award, PlayCircle, BarChart, HelpCircle, Search } from "lucide-react";
import { Quiz } from "@/types/quiz";

interface AvailableQuizzesProps {
  quizzes: Quiz[];
  onSelectQuiz: (quiz: Quiz) => void;
}

const DIFFICULTIES = ["all", "easy", "medium", "hard"] as const;

const AvailableQuizzes = ({ quizzes, onSelectQuiz }: AvailableQuizzesProps) => {
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>("all");
  const [subject, setSubject] = useState("all");

  const subjects = useMemo(
    () => Array.from(new Set(quizzes.map((q) => q.subject).filter(Boolean))) as string[],
    [quizzes]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return quizzes.filter((quiz) => {
      if (difficulty !== "all" && quiz.difficulty !== difficulty) return false;
      if (subject !== "all" && quiz.subject !== subject) return false;
      if (!q) return true;
      return (
        quiz.title?.toLowerCase().includes(q) ||
        quiz.description?.toLowerCase().includes(q) ||
        quiz.subject?.toLowerCase().includes(q)
      );
    });
  }, [quizzes, query, difficulty, subject]);

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

  return (
    <Card className="border-border/50 shadow-sm overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
      <CardHeader className="pb-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0">
            <Trophy className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-lg sm:text-xl font-black text-foreground">Available Quizzes</CardTitle>
            <CardDescription className="text-xs">Put your comprehension to the test and earn XP points</CardDescription>
          </div>
        </div>

        {quizzes.length > 0 && (
          <div className="mt-4 space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search quizzes by title or subject..."
                className="pl-9 h-9 text-sm rounded-xl"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold capitalize border transition-colors ${
                    difficulty === d
                      ? "bg-primary text-primary-foreground border-transparent"
                      : "bg-muted/50 text-muted-foreground border-border/60 hover:bg-muted"
                  }`}
                >
                  {d === "all" ? "All levels" : d}
                </button>
              ))}
              {subjects.length > 0 && <span className="w-px bg-border shrink-0 mx-0.5" />}
              {subjects.length > 0 && (
                <button
                  onClick={() => setSubject("all")}
                  className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold border transition-colors ${
                    subject === "all"
                      ? "bg-primary text-primary-foreground border-transparent"
                      : "bg-muted/50 text-muted-foreground border-border/60 hover:bg-muted"
                  }`}
                >
                  All subjects
                </button>
              )}
              {subjects.map((s) => (
                <button
                  key={s}
                  onClick={() => setSubject(s)}
                  className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold border transition-colors ${
                    subject === s
                      ? "bg-primary text-primary-foreground border-transparent"
                      : "bg-muted/50 text-muted-foreground border-border/60 hover:bg-muted"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-2xl border border-dashed border-border">
            <HelpCircle className="h-10 w-10 text-muted-foreground/45 mx-auto mb-2" />
            <p className="text-sm font-semibold">
              {quizzes.length === 0 ? "No quizzes available right now" : "No quizzes match your filters"}
            </p>
            <p className="text-xs">
              {quizzes.length === 0 ? "Check back later for new reading challenges!" : "Try clearing the search or filters."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {filtered.map((quiz) => (
              <div
                key={quiz.id}
                className="group flex flex-col justify-between border border-border/50 rounded-2xl p-4 sm:p-5 bg-card hover:shadow-md hover:border-primary/25 transition-all duration-300 sm:hover:-translate-y-0.5"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-extrabold text-foreground group-hover:text-primary transition-colors text-sm sm:text-base line-clamp-2 leading-snug">
                      {quiz.title}
                    </h4>
                    <Badge variant="outline" className={`capitalize text-[10px] font-bold px-2 py-0.5 border shrink-0 ${getDifficultyStyles(quiz.difficulty)}`}>
                      {quiz.difficulty}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {quiz.description || "Compete to test your reading retention of this book."}
                  </p>

                  <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px] text-muted-foreground font-semibold">
                    <span className="flex items-center gap-1 bg-muted rounded-lg px-2.5 py-1">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      {quiz.timeLimit}m
                    </span>
                    <span className="flex items-center gap-1 bg-amber-500/10 rounded-lg px-2.5 py-1 text-amber-700 dark:text-amber-400">
                      <Award className="h-3.5 w-3.5" />
                      +{quiz.pointsReward} XP
                    </span>
                    <span className="flex items-center gap-1 bg-muted rounded-lg px-2.5 py-1">
                      <BarChart className="h-3.5 w-3.5 text-sky-500" />
                      {quiz.questions.length} Qs
                    </span>
                    {quiz.subject && (
                      <span className="flex items-center gap-1 bg-muted rounded-lg px-2.5 py-1 truncate max-w-[45%]">
                        {quiz.subject}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-4 sm:pt-5 mt-auto">
                  <Button
                    onClick={() => onSelectQuiz(quiz)}
                    className="w-full gradient-primary border-0 text-white font-bold rounded-xl h-10 text-xs shadow-sm hover:shadow-md active:scale-[0.99] transition-all"
                  >
                    <PlayCircle className="h-4 w-4 mr-1.5" /> Start Quiz
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AvailableQuizzes;
