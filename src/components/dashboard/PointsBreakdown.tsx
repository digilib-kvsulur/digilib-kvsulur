
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";
import { QuizResult } from "@/types/quiz";
import { ReadingChallenge } from "@/types/rewards";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PointsBreakdownProps {
  quizResults: QuizResult[];
  challenges: ReadingChallenge[];
}

interface PointsData {
  booksCompleted: number;
  timelyReturns: number;
  readingHistory: number;
  quizPoints: number;
  challengePoints: number;
}

const PointsBreakdown = ({ quizResults, challenges }: PointsBreakdownProps) => {
  const [pointsData, setPointsData] = useState<PointsData>({
    booksCompleted: 0,
    timelyReturns: 0,
    readingHistory: 0,
    quizPoints: 0,
    challengePoints: 0
  });

  useEffect(() => {
    loadPointsData();
  }, [quizResults, challenges]);

  const loadPointsData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Calculate quiz points from quiz results
      const quizPoints = quizResults.reduce((total, result) => total + result.pointsEarned, 0);

      // Calculate challenge points from completed challenges
      const challengePoints = challenges
        .filter(challenge => challenge.isCompleted)
        .reduce((total, challenge) => total + challenge.reward.points, 0);

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

      // Get reading history points
      const { data: readingHistory, error: readingError } = await supabase
        .from('reading_history')
        .select('points_earned')
        .eq('user_id', user.id);

      const readingHistoryPoints = readingHistory?.reduce((total, entry) => total + (entry.points_earned || 0), 0) || 0;

      setPointsData({
        booksCompleted: completedBooks?.length || 0,
        timelyReturns: timelyReturnsCount,
        readingHistory: readingHistoryPoints,
        quizPoints,
        challengePoints
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
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
              {pointsData.readingHistory}
            </div>
            <p className="text-sm text-gray-600">Reading History</p>
            <p className="text-xs text-gray-500">(Manual entries)</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{pointsData.quizPoints}</div>
            <p className="text-sm text-gray-600">Quiz Points</p>
            <p className="text-xs text-gray-500">({quizResults.length} quizzes completed)</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{pointsData.challengePoints}</div>
            <p className="text-sm text-gray-600">Achievements</p>
            <p className="text-xs text-gray-500">(Challenge rewards)</p>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {pointsData.booksCompleted * 25 + pointsData.timelyReturns * 10 + pointsData.readingHistory + pointsData.quizPoints + pointsData.challengePoints}
            </div>
            <p className="text-sm text-gray-600">Total Points Earned</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PointsBreakdown;
