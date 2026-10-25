import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Flame, Trophy, Sparkles, Zap, Check, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LoginStreakCardProps {
  currentStreak: number;
  longestStreak: number;
  totalLoginDays: number;
  onPointsClaimed?: () => void;
}

function getStreakMultiplier(streak: number): { multiplier: number; label: string } {
  if (streak >= 28) return { multiplier: 2.0,  label: "2×" };
  if (streak >= 14) return { multiplier: 1.8,  label: "1.8×" };
  if (streak >= 7)  return { multiplier: 1.5,  label: "1.5×" };
  if (streak >= 3)  return { multiplier: 1.2,  label: "1.2×" };
  return { multiplier: 1.0, label: "1×" };
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

      const { data: profile } = await supabase
        .from("profiles")
        .select("streak_last_claimed")
        .eq("id", user.id)
        .single();

      if (profile) {
        const todayStr = new Date().toISOString().split("T")[0];
        setClaimedToday(profile.streak_last_claimed === todayStr);
      }

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

  const { multiplier, label: multiplierLabel } = getStreakMultiplier(currentStreak);
  const effectivePoints = Math.round(pointsPerStreak * multiplier);

  const handleClaim = async () => {
    if (!userId || claimedToday || claiming || currentStreak === 0) return;
    setClaiming(true);
    try {
      const { data: earned, error: claimError } = await supabase.rpc("claim_streak_points");
      if (claimError) throw claimError;

      setClaimedToday(true);
      toast({
        title: `🔥 Day ${currentStreak} Streak Bonus Claimed!`,
        description: `+${earned || effectivePoints} XP earned${multiplier > 1 ? ` (${multiplierLabel} multiplier)` : ""}`,
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

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs hover:border-amber-500/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full space-y-3.5">
      {/* Top Header: Flame Badge + Multiplier Pill */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
            <Flame className="h-5 w-5 fill-amber-500" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Daily Streak
            </h4>
          </div>
        </div>

        {multiplier > 1 ? (
          <span className="text-[11px] font-black tracking-tight px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
            <Zap className="h-3 w-3 fill-amber-500 text-amber-500" />
            <span>{multiplierLabel} Boost</span>
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-muted-foreground">
            Active
          </span>
        )}
      </div>

      {/* Main Metric Row: Streak number & stats */}
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-black text-foreground tracking-tight leading-none">
            {currentStreak}
          </span>
          <span className="text-sm font-bold text-muted-foreground">
            {currentStreak === 1 ? "day" : "days"} streak
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
          <span className="flex items-center gap-1">
            <Trophy className="h-3 w-3 text-amber-500" /> Best: <strong className="text-foreground">{longestStreak}d</strong>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-indigo-500" /> {totalLoginDays}d total
          </span>
        </p>
      </div>

      {/* Action / Claim Button */}
      <div className="pt-0.5">
        {currentStreak > 0 ? (
          <Button
            onClick={handleClaim}
            disabled={claimedToday || claiming}
            size="sm"
            className={`w-full h-8.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
              claimedToday
                ? "bg-muted text-muted-foreground hover:bg-muted cursor-default border border-border/60"
                : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/20 active:scale-[0.98]"
            }`}
          >
            {claimedToday ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                <span>Bonus Claimed Today</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 mr-1.5 animate-pulse" />
                <span>Claim Bonus (+{effectivePoints} XP)</span>
              </>
            )}
          </Button>
        ) : (
          <div className="h-8.5 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center text-xs text-muted-foreground font-medium">
            Login daily to ignite streak 🔥
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginStreakCard;
