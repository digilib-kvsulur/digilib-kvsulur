import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Trophy, Calendar, Sparkles, Zap, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LoginStreakCardProps {
  currentStreak: number;
  longestStreak: number;
  totalLoginDays: number;
  onPointsClaimed?: () => void;
}

/** Returns multiplier tier info based on current streak */
function getStreakMultiplier(streak: number): { multiplier: number; label: string; color: string } {
  if (streak >= 28) return { multiplier: 2.0,  label: "2×",   color: "text-rose-500 bg-rose-500/10 border-rose-500/30" };
  if (streak >= 14) return { multiplier: 1.8,  label: "1.8×", color: "text-purple-500 bg-purple-500/10 border-purple-500/30" };
  if (streak >= 7)  return { multiplier: 1.5,  label: "1.5×", color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/30" };
  if (streak >= 3)  return { multiplier: 1.2,  label: "1.2×", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" };
  return { multiplier: 1.0, label: "1×",   color: "text-muted-foreground bg-muted border-border" };
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

  const { multiplier, label: multiplierLabel, color: multiplierColor } = getStreakMultiplier(currentStreak);
  const effectivePoints = Math.round(pointsPerStreak * multiplier);

  const getNextTier = (streak: number) => {
    if (streak < 3)  return { at: 3,  label: "1.2×", daysLeft: 3 - streak };
    if (streak < 7)  return { at: 7,  label: "1.5×", daysLeft: 7 - streak };
    if (streak < 14) return { at: 14, label: "1.8×", daysLeft: 14 - streak };
    if (streak < 28) return { at: 28, label: "2×",   daysLeft: 28 - streak };
    return null;
  };
  const nextTier = getNextTier(currentStreak);

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

  const getStreakGradient = (streak: number) => {
    if (streak >= 28) return "from-rose-500 to-pink-500";
    if (streak >= 14) return "from-purple-500 to-indigo-500";
    if (streak >= 7)  return "from-indigo-500 to-sky-500";
    if (streak >= 3)  return "from-amber-500 to-orange-500";
    return "from-amber-400 to-amber-500";
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-amber-500/10 via-card to-card hover:border-amber-500/40 hover:shadow-md transition-all duration-200 shadow-2xs group flex flex-col justify-between">
      {/* Top accent glow line */}
      <div className={`h-1 w-full bg-gradient-to-r ${getStreakGradient(currentStreak)}`} />

      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between gap-3">
        {/* Top: Flame Icon + Streak Count + Multiplier */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform ${currentStreak >= 3 ? "animate-streak-fire" : ""}`}>
              <Flame className="h-5 w-5 fill-amber-500" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-base sm:text-lg font-black text-foreground tracking-tight">
                  {currentStreak}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">day streak</span>
                {multiplier > 1 && (
                  <Badge className={`text-[9px] font-black border px-1.5 py-0.2 rounded-md ${multiplierColor}`}>
                    <Zap className="h-2.5 w-2.5 mr-0.5" />{multiplierLabel} XP
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                <span className="flex items-center gap-0.5">
                  <Trophy className="h-3 w-3 text-amber-500" /> Best: <strong className="text-foreground">{longestStreak}d</strong>
                </span>
                <span>•</span>
                <span className="flex items-center gap-0.5">
                  <Calendar className="h-3 w-3 text-indigo-500" /> Total: <strong className="text-foreground">{totalLoginDays}d</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Next milestone tag */}
          {nextTier && (
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full shrink-0">
              {nextTier.daysLeft}d to {nextTier.label}
            </span>
          )}
        </div>

        {/* Bottom Claim Action Bar */}
        <div className="pt-0.5">
          {currentStreak > 0 ? (
            <Button
              onClick={handleClaim}
              disabled={claimedToday || claiming}
              size="sm"
              className={`w-full h-8.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                claimedToday
                  ? "bg-muted/80 text-muted-foreground hover:bg-muted/80 cursor-default border border-border/50"
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
                  <span>Claim Daily Bonus (+{effectivePoints} XP)</span>
                </>
              )}
            </Button>
          ) : (
            <div className="bg-muted/40 rounded-xl px-2.5 py-1.5 text-center text-[11px] text-muted-foreground font-medium">
              Read books or sign in daily to ignite your streak! 🔥
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginStreakCard;
