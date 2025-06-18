
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";
import { QuizResult } from "@/types/quiz";

interface PointsBreakdownProps {
  quizResults: QuizResult[];
}

const PointsBreakdown = ({ quizResults }: PointsBreakdownProps) => {
  const quizPoints = quizResults.reduce((total, result) => total + result.pointsEarned, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-600" />
          Points Breakdown
        </CardTitle>
        <CardDescription>How you've earned your library points</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">120</div>
            <p className="text-sm text-gray-600">Books Completed</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">45</div>
            <p className="text-sm text-gray-600">Timely Returns</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">15</div>
            <p className="text-sm text-gray-600">Book Reviews</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{quizPoints}</div>
            <p className="text-sm text-gray-600">Quiz Points</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PointsBreakdown;
