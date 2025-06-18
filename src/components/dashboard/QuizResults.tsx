
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Trophy, Star } from "lucide-react";
import { QuizResult } from "@/types/quiz";

interface QuizResultsProps {
  results: QuizResult[];
}

const QuizResults = ({ results }: QuizResultsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Recent Quiz Results
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
            results.slice(-5).reverse().map((result, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{result.quizTitle}</h4>
                  <Badge variant={result.score >= 80 ? "default" : result.score >= 60 ? "secondary" : "destructive"}>
                    {result.score}%
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>{result.correctAnswers}/{result.totalQuestions} correct</span>
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    +{result.pointsEarned} points
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Completed: {new Date(result.completedAt).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuizResults;
