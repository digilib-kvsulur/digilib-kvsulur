import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Trophy, Calendar, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LoginStreakCardProps {
  currentStreak: number;
  longestStreak: number;
  totalLoginDays: number;
  onPointsClaimed?: () => void;
}

const LoginStreakCard = ({ currentStreak, longestStreak, totalLoginDays, onPointsClaimed }: LoginStreakCardProps) => {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [claimedToday, setClaimedToday] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [pointsPerStreak, setPointsPerStreak] = useState(10);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Check if claimed today
      const { data: profile } = await supabase
        .from("profiles")
        .select("streak_last_claimed")
        .eq("id", user.id)
        .single();

      if (profile) {
        const todayStr = new Date().toISOString().split("T")[0];
        setClaimedToday(profile.streak_last_claimed === todayStr);
      }

      // Load points config
      const { data: setting } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "points_per_daily_streak")
        .maybeSingle();
      if (setting) {
        setPointsPerStreak(Number(setting.value) || 10);
      }
    };
    init();
  }, []);

  const handleClaim = async () => {
    if (!userId || claimedToday || claiming || currentStreak === 0) return;
    setClaiming(true);
    try {
      const todayStr = new Date().toISOString().split("T")[0];

      // Update points and last claimed date
      const { data: profile, error: fetchError } = await supabase
        .from("profiles")
        .select("points")
        .eq("id", userId)
        .single();
      if (fetchError) throw fetchError;

      const newPoints = (Number(profile.points) || 0) + pointsPerStreak;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          points: newPoints,
          streak_last_claimed: todayStr
        })
        .eq("id", userId);

      if (updateError) throw updateError;

      setClaimedToday(true);
      toast({
        title: "Daily Streak Bonus Claimed!",
        description: `Successfully claimed +${pointsPerStreak} points for keeping your streak alive!`,
      });
      onPointsClaimed?.();
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Error claiming bonus",
        description: e.message || "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setClaiming(false);
    }
  };

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
    <div className="overflow-hidden rounded-2xl bg-card border border-border shadow-sm h-full flex flex-col justify-center">
      <div className="p-5">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className={`flex items-center justify-center w-14 h-14 rounded-full bg-warning/10 shrink-0 ${currentStreak >= 3 ? 'animate-streak-fire' : ''}`}>
              <Flame className="h-7 w-7 text-warning" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl font-black text-foreground">{currentStreak}</span>
                <span className="text-sm font-semibold text-muted-foreground">day streak</span>
                <span className="text-lg">{getStreakEmoji(currentStreak)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{getStreakMessage(currentStreak)}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full justify-center">
            <div className="flex gap-4 text-center">
              <div>
                <div className="flex items-center gap-1 justify-center">
                  <Trophy className="h-3.5 w-3.5 text-warning" />
                  <span className="text-sm font-bold text-foreground">{longestStreak}</span>
                </div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase">Best</p>
              </div>
              <div>
                <div className="flex items-center gap-1 justify-center">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  <span className="text-sm font-bold text-foreground">{totalLoginDays}</span>
                </div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase">Total</p>
              </div>
            </div>

            {currentStreak > 0 && (
              <Button
                onClick={handleClaim}
                disabled={claimedToday || claiming}
                size="sm"
                className={`rounded-xl px-4 py-2 font-bold transition-all ${
                  claimedToday 
                    ? "bg-muted text-muted-foreground cursor-not-allowed" 
                    : "gradient-primary border-0 text-white shadow-md hover:scale-[1.02] active:scale-[0.98]"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                {claimedToday ? "Bonus Claimed ✓" : `Claim Daily Bonus (+${pointsPerStreak})`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginStreakCard;
