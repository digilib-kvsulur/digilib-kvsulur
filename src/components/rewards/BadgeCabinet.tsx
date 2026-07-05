import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Award, BookOpen, Target, Zap, Crown, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface BadgeCabinetProps {
  userId: string;
}

const BADGES = [
  { id: 'first_book', title: 'First Page', description: 'Read your first book', icon: 'book', points: 10, type: 'books_read', target: 1 },
  { id: 'bookworm', title: 'Bookworm', description: 'Read 5 books', icon: 'book', points: 30, type: 'books_read', target: 5 },
  { id: 'literary_star', title: 'Lover of Literature', description: 'Read 15 books', icon: 'crown', points: 100, type: 'books_read', target: 15 },
  { id: 'quiz_starter', title: 'Quiz Starter', description: 'Complete your first quiz', icon: 'zap', points: 10, type: 'quizzes_completed', target: 1 },
  { id: 'quiz_whiz', title: 'Quiz Whiz', description: 'Complete 5 quizzes', icon: 'zap', points: 50, type: 'quizzes_completed', target: 5 },
  { id: 'quiz_master', title: 'Quiz Master', description: 'Complete 10 quizzes', icon: 'award', points: 100, type: 'quizzes_completed', target: 10 },
  { id: 'points_century', title: 'Century Club', description: 'Earn 100 total points', icon: 'trophy', points: 20, type: 'total_points', target: 100 },
  { id: 'points_baron', title: 'Point Baron', description: 'Earn 500 total points', icon: 'trophy', points: 50, type: 'total_points', target: 500 },
  { id: 'points_king', title: 'Point King', description: 'Earn 1000 total points', icon: 'crown', points: 100, type: 'total_points', target: 1000 },
  { id: 'streak_3', title: 'Triple Threat', description: 'Maintain a 3-day active streak', icon: 'target', points: 15, type: 'consecutive_days', target: 3 },
  { id: 'streak_7', title: 'Consistent Reader', description: 'Maintain a 7-day active streak', icon: 'target', points: 40, type: 'consecutive_days', target: 7 },
];

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

export default function BadgeCabinet({ userId }: BadgeCabinetProps) {
  const [stats, setStats] = useState({
    totalPoints: 0,
    booksRead: 0,
    quizzesCompleted: 0,
    consecutiveDays: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { data: profile } = await supabase.from("profiles").select("points").eq("id", userId).single();
        const { count: booksCount } = await supabase.from("reading_history").select("id", { count: "exact", head: true }).eq("user_id", userId);
        const { count: quizzesCount } = await supabase.from("quiz_results").select("id", { count: "exact", head: true }).eq("user_id", userId);
        const { data: streak } = await supabase.from("login_streaks").select("current_streak").eq("user_id", userId).maybeSingle();

        setStats({
          totalPoints: profile?.points || 0,
          booksRead: booksCount || 0,
          quizzesCompleted: quizzesCount || 0,
          consecutiveDays: streak?.current_streak || 0,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">Loading your badge cabinet...</p>
        </CardContent>
      </Card>
    );
  }

  const getStatValue = (type: string) => {
    switch (type) {
      case "total_points": return stats.totalPoints;
      case "books_read": return stats.booksRead;
      case "quizzes_completed": return stats.quizzesCompleted;
      case "consecutive_days": return stats.consecutiveDays;
      default: return 0;
    }
  };

  const unlockedCount = BADGES.filter(b => getStatValue(b.type) >= b.target).length;

  return (
    <div className="space-y-6">
      {/* Cabinet Header */}
      <Card className="border-border/50 overflow-hidden bg-gradient-to-r from-primary/5 to-accent/5">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <CardTitle className="text-xl flex items-center justify-center sm:justify-start gap-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
                Badge Cabinet
              </CardTitle>
              <CardDescription>
                Unlock badges by reading, taking quizzes, and earning points.
              </CardDescription>
            </div>
            <div className="bg-background px-4 py-2.5 rounded-xl border border-border/50 text-center shadow-sm">
              <span className="text-2xl font-bold text-primary">{unlockedCount}</span>
              <span className="text-muted-foreground text-xs"> / {BADGES.length} Unlocked</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {BADGES.map(badge => {
          const Icon = getIconComponent(badge.icon);
          const currentVal = getStatValue(badge.type);
          const isUnlocked = currentVal >= badge.target;
          const progress = Math.min((currentVal / badge.target) * 100, 100);

          return (
            <Card key={badge.id} className={`transition-all duration-300 relative overflow-hidden group hover:shadow-md ${
              isUnlocked 
                ? 'border-yellow-200/50 bg-gradient-to-br from-yellow-50/30 to-amber-50/10 dark:from-yellow-950/5 dark:to-transparent' 
                : 'border-border/40 bg-card opacity-85'
            }`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-2xl shrink-0 transition-transform duration-300 group-hover:scale-105 ${
                    isUnlocked 
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-500 shadow-sm' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {isUnlocked ? <Icon className="h-6 w-6" /> : <Lock className="h-6 w-6 opacity-60" />}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={`font-semibold text-sm truncate ${isUnlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {badge.title}
                      </h4>
                      {isUnlocked && (
                        <Badge className="bg-yellow-500 hover:bg-yellow-600 text-[10px] text-white font-semibold">
                          +{badge.points} XP
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {badge.description}
                    </p>
                  </div>
                </div>

                {/* Progress Bar (if locked or partially completed) */}
                <div className="mt-4 pt-2 space-y-1.5 border-t border-border/30">
                  <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                    <span>{isUnlocked ? "Completed" : "Progress"}</span>
                    <span>{currentVal} / {badge.target}</span>
                  </div>
                  <Progress 
                    value={progress} 
                    className={`h-1.5 ${isUnlocked ? 'bg-yellow-100 dark:bg-yellow-950' : ''}`}
                    indicatorClassName={isUnlocked ? 'bg-yellow-500' : 'bg-primary'}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
