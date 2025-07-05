
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Star, BookOpen, Trophy, Target, TrendingUp, Calendar } from "lucide-react";
import QuizOverview from "./QuizOverview";

interface OverviewProps {
  user: any;
  currentBooksCount: number;
  quizResultsCount: number;
  classRank: number | string;
  levelInfo: {
    currentLevel: number;
    pointsToNext: number;
    progressPercent: number;
  };
}

const Overview = ({ 
  user, 
  currentBooksCount, 
  quizResultsCount, 
  classRank,
  levelInfo 
}: OverviewProps) => {
  const recentActivities = [
    { type: "book", title: "Started reading 'The Great Adventure'", time: "2 hours ago" },
    { type: "quiz", title: "Completed Math Quiz - Level 1", time: "1 day ago", score: 85 },
    { type: "points", title: "Earned 25 points from reading activity", time: "2 days ago" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            Welcome back, {user?.first_name}! 👋
          </CardTitle>
          <CardDescription>
            Here's your learning progress overview
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Level Progress */}
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mx-auto mb-3">
                <Star className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-lg">Level {levelInfo.currentLevel}</h3>
              <p className="text-sm text-gray-600 mb-2">{user?.points || 0} points</p>
              <Progress value={levelInfo.progressPercent} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">
                {levelInfo.pointsToNext} points to next level
              </p>
            </div>

            {/* Class Ranking */}
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mx-auto mb-3">
                <Trophy className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-lg">Class Rank</h3>
              <p className="text-2xl font-bold text-purple-600">#{classRank}</p>
              <p className="text-xs text-gray-500">in {user?.student_class}</p>
            </div>

            {/* Reading Goal */}
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-3">
                <Target className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg">Monthly Goal</h3>
              <p className="text-2xl font-bold text-green-600">3/5</p>
              <p className="text-xs text-gray-500">books read</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Books Reading</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentBooksCount}</div>
            <p className="text-xs text-gray-600">Currently issued</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quizzes Taken</CardTitle>
            <Trophy className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quizResultsCount}</div>
            <p className="text-xs text-gray-600">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Streak</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-gray-600">days active</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Your latest learning activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  activity.type === 'book' ? 'bg-blue-500' :
                  activity.type === 'quiz' ? 'bg-green-500' : 'bg-yellow-500'
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.title}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                  {activity.score && (
                    <p className="text-xs text-green-600 font-medium">Score: {activity.score}%</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Quiz Access */}
      <QuizOverview 
        quizzes={[]} 
        onSelectQuiz={() => {}} 
        onViewAll={() => {}}
      />
    </div>
  );
};

export default Overview;
