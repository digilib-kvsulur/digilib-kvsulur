
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";
import { QuizResult } from "@/types/quiz";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PointsBreakdownProps {
  quizResults: QuizResult[];
}

interface PointsData {
  booksCompleted: number;
  timelyReturns: number;
  bookReviews: number;
  quizPoints: number;
}

const PointsBreakdown = ({ quizResults }: PointsBreakdownProps) => {
  const [pointsData, setPointsData] = useState<PointsData>({
    booksCompleted: 0,
    timelyReturns: 0,
    bookReviews: 0,
    quizPoints: 0
  });

  useEffect(() => {
    loadPointsData();
  }, [quizResults]);

  const loadPointsData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Calculate quiz points from quiz results
      const quizPoints = quizResults.reduce((total, result) => total + result.pointsEarned, 0);

      // Get completed books count (returned books)
      const { data: completedBooks, error: booksError } = await supabase
        .from('book_issues')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'returned');

      // Get timely returns (returned before due date)
      const { data: timelyReturns, error: timelyError } = await supabase
        .from('book_issues')
        .select('id, return_date, due_date')
        .eq('user_id', user.id)
        .eq('status', 'returned')
        .not('return_date', 'is', null);

      const timelyReturnsCount = timelyReturns?.filter(book => 
        book.return_date && book.due_date && 
        new Date(book.return_date) <= new Date(book.due_date)
      ).length || 0;

      setPointsData({
        booksCompleted: completedBooks?.length || 0,
        timelyReturns: timelyReturnsCount,
        bookReviews: 0, // This would be implemented when book review feature is added
        quizPoints
      });
    } catch (error) {
      console.error('Error loading points data:', error);
    }
  };

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
            <div className="text-2xl font-bold text-green-600">
              {pointsData.booksCompleted * 25}
            </div>
            <p className="text-sm text-gray-600">Books Completed</p>
            <p className="text-xs text-gray-500">({pointsData.booksCompleted} books × 25 pts)</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {pointsData.timelyReturns * 10}
            </div>
            <p className="text-sm text-gray-600">Timely Returns</p>
            <p className="text-xs text-gray-500">({pointsData.timelyReturns} returns × 10 pts)</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {pointsData.bookReviews * 15}
            </div>
            <p className="text-sm text-gray-600">Book Reviews</p>
            <p className="text-xs text-gray-500">({pointsData.bookReviews} reviews × 15 pts)</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{pointsData.quizPoints}</div>
            <p className="text-sm text-gray-600">Quiz Points</p>
            <p className="text-xs text-gray-500">({quizResults.length} quizzes completed)</p>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {pointsData.booksCompleted * 25 + pointsData.timelyReturns * 10 + pointsData.bookReviews * 15 + pointsData.quizPoints}
            </div>
            <p className="text-sm text-gray-600">Total Points Earned</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PointsBreakdown;
