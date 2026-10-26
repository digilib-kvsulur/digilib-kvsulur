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
    <div className="rounded-2xl sm:rounded-3xl border border-amber-500/20 bg-gradient-to-b from-amber-500/[0.04] via-card to-card p-3.5 sm:p-5 shadow-sm hover:border-amber-500/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full space-y-3">
      {/* Top Header: Flame Badge + Multiplier Pill */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
            <Flame className="h-5 w-5 fill-amber-500" />
          </div>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider hidden sm:inline">
            Daily Streak
          </span>
        </div>

        {multiplier > 1 ? (
          <span className="text-[11px] sm:text-xs font-black tracking-tight px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1 shrink-0">
            <Zap className="h-3 w-3 fill-amber-500 text-amber-500" />
            <span>{multiplierLabel} Boost</span>
          </span>
        ) : (
          <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground px-2 py-0.5 rounded-full bg-muted/60 shrink-0">
            Active
          </span>
        )}
      </div>

      {/* Main Metric Row: Streak number & stats */}
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tight leading-none">
            {currentStreak}
          </span>
          <span className="text-xs sm:text-sm font-bold text-muted-foreground">
            {currentStreak === 1 ? "day streak" : "days streak"}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] sm:text-xs text-muted-foreground mt-2 pt-1.5 border-t border-border/40">
          <span>Best: <strong className="text-foreground font-bold">{longestStreak}d</strong></span>
          <span>Total: <strong className="text-foreground font-bold">{totalLoginDays}d</strong></span>
        </div>
      </div>

      {/* Action / Claim Button */}
      <div className="pt-0.5">
        {currentStreak > 0 ? (
          <Button
            onClick={handleClaim}
            disabled={claimedToday || claiming}
            className={`w-full h-10.5 sm:h-11 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs ${
              claimedToday
                ? "bg-muted text-muted-foreground hover:bg-muted cursor-default border border-border/60"
                : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-500/20 active:scale-[0.98]"
            }`}
          >
            {claimedToday ? (
              <>
                <Check className="h-4 w-4 mr-1 text-emerald-500 shrink-0" />
                <span>Claimed Today</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1.5 animate-pulse text-amber-200 shrink-0" />
                <span>Claim +{effectivePoints} XP</span>
              </>
            )}
          </Button>
        ) : (
          <div className="h-10.5 sm:h-11 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center text-[11px] sm:text-xs text-muted-foreground font-medium">
            Login daily to ignite streak 🔥
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginStreakCard;
