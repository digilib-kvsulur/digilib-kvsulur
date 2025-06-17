
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Award, BookOpen, Target, Zap, Crown } from "lucide-react";
import { Achievement } from "@/types/rewards";

interface AchievementsProps {
  achievements: Achievement[];
  userStats: {
    totalPoints: number;
    booksRead: number;
    quizzesCompleted: number;
    averageQuizScore: number;
  };
}

const getIconComponent = (iconName: string) => {
  const icons = {
    trophy: Trophy,
    award: Award,
    book: BookOpen,
    target: Target,
    zap: Zap,
    crown: Crown
  };
  return icons[iconName as keyof typeof icons] || Trophy;
};

const Achievements = ({ achievements, userStats }: AchievementsProps) => {
  const calculateProgress = (achievement: Achievement) => {
    const { condition } = achievement;
    let currentValue = 0;

    switch (condition.type) {
      case 'total_points':
        currentValue = userStats.totalPoints;
        break;
      case 'books_read':
        currentValue = userStats.booksRead;
        break;
      case 'quizzes_completed':
        currentValue = userStats.quizzesCompleted;
        break;
      case 'quiz_score':
        currentValue = userStats.averageQuizScore;
        break;
      default:
        currentValue = 0;
    }

    return Math.min((currentValue / condition.value) * 100, 100);
  };

  const unlockedAchievements = achievements.filter(a => a.isUnlocked);
  const lockedAchievements = achievements.filter(a => !a.isUnlocked);

  return (
    <div className="space-y-6">
      {/* Unlocked Achievements */}
      {unlockedAchievements.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            Unlocked Achievements ({unlockedAchievements.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {unlockedAchievements.map((achievement) => {
              const IconComponent = getIconComponent(achievement.icon);
              return (
                <Card key={achievement.id} className="border-yellow-200 bg-yellow-50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <IconComponent className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{achievement.title}</CardTitle>
                        <Badge variant="default" className="bg-yellow-600">
                          +{achievement.points} points
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-2">
                      {achievement.description}
                    </CardDescription>
                    {achievement.unlockedAt && (
                      <p className="text-xs text-gray-500">
                        Unlocked: {new Date(achievement.unlockedAt).toLocaleDateString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Locked Achievements */}
      {lockedAchievements.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-gray-600" />
            Available Achievements ({lockedAchievements.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lockedAchievements.map((achievement) => {
              const IconComponent = getIconComponent(achievement.icon);
              const progress = calculateProgress(achievement);
              
              return (
                <Card key={achievement.id} className="border-gray-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <IconComponent className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg text-gray-700">{achievement.title}</CardTitle>
                        <Badge variant="outline">
                          +{achievement.points} points
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-3">
                      {achievement.description}
                    </CardDescription>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {achievements.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No achievements available</h3>
            <p className="text-gray-600">Start reading and taking quizzes to unlock achievements!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Achievements;
