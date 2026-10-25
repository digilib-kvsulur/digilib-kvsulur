import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Trophy, Sparkles, Zap, Check } from "lucide-react";
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
        description: `+${earned || effectivePoints} XP earned${multiplier > 1 ? ` (${multiplierLabel} streak multiplier bonus)` : ""}`,
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
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-card to-orange-500/10 p-3 sm:p-3.5 shadow-xs hover:border-amber-500/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full">
      {/* Top row: Flame Icon + Streak Count + Multiplier */}
      <div>
        <div className="flex items-center justify-between gap-1.5 mb-1.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/35 text-amber-500 flex items-center justify-center shrink-0 shadow-2xs">
            <Flame className="h-4 w-4 fill-amber-500" />
          </div>
          {multiplier > 1 ? (
            <span className="text-[10px] font-black tracking-tight px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
              ⚡ {multiplierLabel} XP
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-muted-foreground shrink-0">
              Daily
            </span>
          )}
        </div>

        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-foreground tracking-tight leading-none">
              {currentStreak}
            </span>
            <span className="text-xs font-bold text-muted-foreground">day streak</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate flex items-center gap-1">
            <Trophy className="h-2.5 w-2.5 text-amber-500" /> Best: <strong className="text-foreground">{longestStreak}d</strong> • {totalLoginDays}d total
          </p>
        </div>
      </div>

      {/* Action Claim Button */}
      <div className="pt-2.5">
        {currentStreak > 0 ? (
          <Button
            onClick={handleClaim}
            disabled={claimedToday || claiming}
            size="sm"
            className={`w-full h-7.5 rounded-xl text-[11px] font-bold transition-all shadow-2xs ${
              claimedToday
                ? "bg-muted/80 text-muted-foreground hover:bg-muted/80 cursor-default border border-border/50"
                : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/20 active:scale-[0.98]"
            }`}
          >
            {claimedToday ? (
              <>
                <Check className="h-3 w-3 mr-1 text-emerald-500" />
                <span>Claimed Today</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3 mr-1 animate-pulse" />
                <span>Claim (+{effectivePoints} XP)</span>
              </>
            )}
          </Button>
        ) : (
          <div className="h-7.5 rounded-xl bg-muted/40 border border-border/40 flex items-center justify-center text-[10px] text-muted-foreground font-medium">
            Login daily to ignite 🔥
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginStreakCard;
