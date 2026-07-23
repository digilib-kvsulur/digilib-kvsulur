
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, Award, TrendingUp, Star, Play, Sparkles } from "lucide-react";
import { Quiz, QuizResult } from "@/types/quiz";
import { useToast } from "@/hooks/use-toast";

interface QuizPageProps {
  quizzes: Quiz[];
  results: QuizResult[];
  onSelectQuiz: (quiz: Quiz) => void;
}

const QuizPage = ({ quizzes, results, onSelectQuiz }: QuizPageProps) => {
  const { toast } = useToast();

  const handleStartQuiz = (quiz: Quiz) => {
    try {
      console.log('Starting quiz:', quiz);
      
      // Show toast notification
      toast({
        title: "Starting Quiz",
        description: `Starting "${quiz.title}" - Good luck!`,
      });
      
      // Pass the quiz to the parent component for navigation
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

  return (
    <Tabs defaultValue="available" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="available">Available Quizzes</TabsTrigger>
        <TabsTrigger value="results">My Results</TabsTrigger>
      </TabsList>

      <TabsContent value="available">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Available Quizzes
            </CardTitle>
            <CardDescription>Test your knowledge and earn points</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {quizzes.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No quizzes available</p>
                  <p className="text-sm text-gray-400">Check back later for new quizzes</p>
                </div>
              ) : (
                quizzes.map((quiz) => (
                  <div key={quiz.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium">{quiz.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{quiz.description}</p>
                      </div>
                      <Badge variant="outline" className={
                        quiz.difficulty === 'easy' ? 'border-green-500 text-green-700' :
                        quiz.difficulty === 'medium' ? 'border-yellow-500 text-yellow-700' :
                        'border-red-500 text-red-700'
                      }>
                        {quiz.difficulty}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-indigo-500" />
                        {quiz.timeLimit} min
                      </span>
                      <span className="flex items-center gap-1">
                        <Award className="h-4 w-4 text-amber-500" />
                        {quiz.pointsReward} score pts
                      </span>
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-4 w-4 text-violet-500" />
                        +{quiz.completionBonus ?? 10} bonus
                      </span>
                      <span>{quiz.questions.length} questions</span>
                    </div>
                    
                    <Button 
                      onClick={() => handleStartQuiz(quiz)}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Quiz
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="results">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              My Quiz Results
            </CardTitle>
            <CardDescription>Your quiz performance history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No quizzes taken yet</p>
                  <p className="text-sm text-gray-400">Start your first quiz to see results here</p>
                </div>
              ) : (
                results.slice(-10).reverse().map((result, index) => {
                  const quizTitle = result.quizTitle || (result as any).quizzes?.title || "Quiz";
                  const score = result.score || 0;
                  const completedAt = result.completedAt || (result as any).completed_at;
                  const pointsEarned = result.pointsEarned || (result as any).points_earned || 0;
                  const totalQuestions = result.totalQuestions || (result as any).quizzes?.questions?.length || 0;
                  const correctAnswers = result.correctAnswers !== undefined ? result.correctAnswers : Math.round((score / 100) * totalQuestions);

                  return (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-foreground">{quizTitle}</h4>
                        <Badge variant={score >= 80 ? "default" : score >= 60 ? "secondary" : "destructive"}>
                          {score}%
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{correctAnswers}/{totalQuestions} correct</span>
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          +{pointsEarned} points
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Completed: {completedAt ? new Date(completedAt).toLocaleDateString("en-IN") : "Unknown"}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default QuizPage;
