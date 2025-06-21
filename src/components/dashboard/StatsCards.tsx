
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Star, BookOpen, Trophy, User } from "lucide-react";

interface LevelInfo {
  currentLevel: number;
  pointsToNext: number;
  progressPercent: number;
}

interface StatsCardsProps {
  userPoints: number;
  nextLevelPoints: number;
  currentBooksCount: number;
  quizResultsCount: number;
  classRank: number | string;
  userClass: string;
  levelInfo: LevelInfo;
}

const StatsCards = ({ 
  userPoints, 
  nextLevelPoints, 
  currentBooksCount, 
  quizResultsCount, 
  classRank,
  userClass,
  levelInfo
}: StatsCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Level & Points</CardTitle>
          <Star className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600 mb-1">
            Level {levelInfo.currentLevel}
          </div>
          <div className="text-lg font-semibold text-gray-700 mb-2">
            {userPoints} points
          </div>
          <div className="mt-2">
            <Progress value={levelInfo.progressPercent} className="h-2" />
            <p className="text-xs text-gray-600 mt-1">
              {levelInfo.pointsToNext} points to level {levelInfo.currentLevel + 1}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Books</CardTitle>
          <BookOpen className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{currentBooksCount}</div>
          <p className="text-xs text-gray-600">Books issued</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Quizzes Taken</CardTitle>
          <Trophy className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{quizResultsCount}</div>
          <p className="text-xs text-gray-600">This semester</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Class Rank</CardTitle>
          <User className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">#{classRank}</div>
          <p className="text-xs text-gray-600">In {userClass} class</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsCards;
