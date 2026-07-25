import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, Award, PlayCircle, BarChart, HelpCircle } from "lucide-react";
import { Quiz } from "@/types/quiz";

interface AvailableQuizzesProps {
  quizzes: Quiz[];
  onSelectQuiz: (quiz: Quiz) => void;
}

const AvailableQuizzes = ({ quizzes, onSelectQuiz }: AvailableQuizzesProps) => {
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
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl font-black text-foreground">Available Quizzes</CardTitle>
            <CardDescription className="text-xs">Put your comprehension to the test and earn XP points</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {quizzes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <HelpCircle className="h-10 w-10 text-muted-foreground/45 mx-auto mb-2" />
            <p className="text-sm font-semibold">No quizzes available right now</p>
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
                    {quiz.description || "Compete to test your reading retention of this book."}
                  </p>

                  <div className="flex items-center gap-3.5 flex-wrap pt-1 text-[11px] text-muted-foreground font-semibold">
                    <span className="flex items-center gap-1 bg-slate-100 rounded-lg px-2.5 py-1">
                      <Clock className="h-3.5 w-3.5 text-indigo-500" />
                      {quiz.timeLimit}m
                    </span>
                    <span className="flex items-center gap-1 bg-amber-50 rounded-lg px-2.5 py-1 text-amber-700">
                      <Award className="h-3.5 w-3.5 text-amber-500" />
                      +{quiz.pointsReward} XP
                    </span>
                    <span className="flex items-center gap-1 bg-slate-100 rounded-lg px-2.5 py-1">
                      <BarChart className="h-3.5 w-3.5 text-sky-500" />
                      {quiz.questions.length} Qs
                    </span>
                  </div>
                </div>

                <div className="pt-5 mt-auto">
                  <Button 
                    onClick={() => onSelectQuiz(quiz)}
                    className="w-full gradient-primary border-0 text-white font-bold rounded-xl h-9.5 text-xs shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all"
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
