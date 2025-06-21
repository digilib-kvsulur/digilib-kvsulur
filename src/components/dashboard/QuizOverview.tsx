
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, Award } from "lucide-react";
import { Quiz } from "@/types/quiz";

interface QuizOverviewProps {
  quizzes: Quiz[];
  onSelectQuiz: (quiz: Quiz) => void;
  onViewAll: () => void;
}

const QuizOverview = ({ quizzes, onSelectQuiz, onViewAll }: QuizOverviewProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Latest Quizzes
            </CardTitle>
            <CardDescription>Test your knowledge and earn points</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onViewAll}>
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {quizzes.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No quizzes available</p>
          ) : (
            quizzes.map((quiz) => (
              <div key={quiz.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{quiz.title}</h4>
                    <p className="text-xs text-gray-600 mt-1">{quiz.description}</p>
                  </div>
                  <Badge variant="outline" className={
                    quiz.difficulty === 'easy' ? 'border-green-500 text-green-700' :
                    quiz.difficulty === 'medium' ? 'border-yellow-500 text-yellow-700' :
                    'border-red-500 text-red-700'
                  }>
                    {quiz.difficulty}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {quiz.timeLimit} min
                  </span>
                  <span className="flex items-center gap-1">
                    <Award className="h-3 w-3" />
                    {quiz.pointsReward} pts
                  </span>
                </div>

                <Button 
                  onClick={() => onSelectQuiz(quiz)}
                  size="sm"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Start Quiz
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuizOverview;
