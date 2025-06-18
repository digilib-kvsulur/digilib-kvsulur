
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, Award } from "lucide-react";
import { Quiz } from "@/types/quiz";

interface AvailableQuizzesProps {
  quizzes: Quiz[];
  onSelectQuiz: (quiz: Quiz) => void;
}

const AvailableQuizzes = ({ quizzes, onSelectQuiz }: AvailableQuizzesProps) => {
  return (
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
          {quizzes.map((quiz) => (
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
              
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {quiz.timeLimit} min
                </span>
                <span className="flex items-center gap-1">
                  <Award className="h-4 w-4" />
                  {quiz.pointsReward} points
                </span>
                <span>{quiz.questions.length} questions</span>
              </div>

              <Button 
                onClick={() => onSelectQuiz(quiz)}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Start Quiz
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AvailableQuizzes;
