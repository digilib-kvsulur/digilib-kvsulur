import { Card, CardContent } from "@/components/ui/card";
import { Flame, Trophy, Calendar } from "lucide-react";

interface LoginStreakCardProps {
  currentStreak: number;
  longestStreak: number;
  totalLoginDays: number;
}

const LoginStreakCard = ({ currentStreak, longestStreak, totalLoginDays }: LoginStreakCardProps) => {
  const getStreakEmoji = (streak: number) => {
    if (streak >= 30) return "🔥🔥🔥";
    if (streak >= 14) return "🔥🔥";
    if (streak >= 7) return "🔥";
    if (streak >= 3) return "⚡";
    return "✨";
  };

  const getStreakMessage = (streak: number) => {
    if (streak >= 30) return "Legendary streak! You're unstoppable!";
    if (streak >= 14) return "Amazing! Two weeks strong!";
    if (streak >= 7) return "Fantastic week-long streak!";
    if (streak >= 3) return "Great consistency! Keep it up!";
    if (streak >= 1) return "You're on a roll!";
    return "Log in daily to build your streak!";
  };

  return (
    <Card className="overflow-hidden border-0 shadow-md">
      <div className="gradient-primary p-1">
        <CardContent className="bg-card rounded-[calc(var(--radius)-2px)] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full bg-warning/10 ${currentStreak >= 3 ? 'animate-streak-fire' : ''}`}>
                <Flame className="h-6 w-6 text-warning" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{currentStreak}</span>
                  <span className="text-sm text-muted-foreground">day streak</span>
                  <span className="text-lg">{getStreakEmoji(currentStreak)}</span>
                </div>
                <p className="text-xs text-muted-foreground">{getStreakMessage(currentStreak)}</p>
              </div>
            </div>
            <div className="flex gap-4 text-center">
              <div>
                <div className="flex items-center gap-1 justify-center">
                  <Trophy className="h-3 w-3 text-warning" />
                  <span className="text-sm font-semibold">{longestStreak}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Best</p>
              </div>
              <div>
                <div className="flex items-center gap-1 justify-center">
                  <Calendar className="h-3 w-3 text-primary" />
                  <span className="text-sm font-semibold">{totalLoginDays}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Total</p>
              </div>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
};

export default LoginStreakCard;
