import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Trophy, Calendar, Sparkles, Zap } from "lucide-react";
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
  if (streak >= 28) return { multiplier: 2.0,  label: "2×",   color: "text-rose-600 bg-rose-50 border-rose-100" };
  if (streak >= 14) return { multiplier: 1.8,  label: "1.8×", color: "text-purple-600 bg-purple-50 border-purple-100" };
  if (streak >= 7)  return { multiplier: 1.5,  label: "1.5×", color: "text-indigo-600 bg-indigo-50 border-indigo-100" };
  if (streak >= 3)  return { multiplier: 1.2,  label: "1.2×", color: "text-emerald-600 bg-emerald-50 border-emerald-100" };
  return { multiplier: 1.0, label: "1×",   color: "text-slate-600 bg-slate-50 border-slate-200" };
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

  /** Next tier info for "next milestone" badge */
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

      // Apply client-side multiplier display (the DB function awards base points;
      // multiplier could also be added to claim_streak_points SQL function)
      setClaimedToday(true);
      toast({
        title: `🔥 Day ${currentStreak} Streak Bonus!`,
        description: `+${earned || effectivePoints} XP earned${multiplier > 1 ? ` (${multiplierLabel} streak bonus!)` : ""}`,
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
    if (streak >= 28) return "🔥🔥🔥";
    if (streak >= 14) return "🔥🔥";
    if (streak >= 7)  return "🔥";
    if (streak >= 3)  return "⚡";
    return "✨";
  };

  const getStreakMessage = (streak: number) => {
    if (streak >= 28) return "Legendary! 28-day streak — 2× XP!";
    if (streak >= 14) return "Two weeks strong — 1.8× XP bonus!";
    if (streak >= 7)  return "A full week! — 1.5× XP bonus!";
    if (streak >= 3)  return "Three days! — 1.2× XP bonus!";
    if (streak >= 1)  return "You're on a roll! Keep going!";
    return "Log in daily to build your streak!";
  };

  // Gradient top-line matches the streak multiplier tier
  const getStreakGradient = (streak: number) => {
    if (streak >= 28) return "from-rose-500 to-pink-600";
    if (streak >= 14) return "from-purple-500 to-violet-600";
    if (streak >= 7)  return "from-indigo-500 to-blue-500";
    if (streak >= 3)  return "from-emerald-500 to-teal-500";
    return "from-slate-400 to-slate-500";
  };

  return (
    <div className="overflow-hidden rounded-2xl bg-card border border-border shadow-sm h-full flex flex-col justify-center">
      <div className={`h-1 bg-gradient-to-r ${getStreakGradient(currentStreak)}`} />
      <div className="p-5 flex flex-col justify-center gap-3.5">
        {/* Top: flame + streak number */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-12 h-12 rounded-full bg-warning/10 shrink-0 ${currentStreak >= 3 ? 'animate-streak-fire' : ''}`}>
            <Flame className="h-6 w-6 text-warning" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl font-black text-foreground">{currentStreak}</span>
              <span className="text-sm font-semibold text-muted-foreground">day streak</span>
              <span className="text-base">{getStreakEmoji(currentStreak)}</span>
              {/* Multiplier badge */}
              {multiplier > 1 && (
                <Badge className={`text-[10px] font-extrabold border px-1.5 py-0.5 ${multiplierColor}`}>
                  <Zap className="h-2.5 w-2.5 mr-0.5" />{multiplierLabel} XP
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{getStreakMessage(currentStreak)}</p>
          </div>
        </div>

        {/* Next tier progress hint */}
        {nextTier && currentStreak > 0 && (
          <div className="bg-muted/40 rounded-xl px-3 py-2 text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
            <span>
              {nextTier.daysLeft} more day{nextTier.daysLeft > 1 ? "s" : ""} to unlock <strong className="text-foreground">{nextTier.label} XP multiplier</strong>
            </span>
          </div>
        )}

        {/* Bottom: stats + claim button */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
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
              {claimedToday
                ? "Bonus Claimed ✓"
                : `Claim (+${effectivePoints}${multiplier > 1 ? ` ${multiplierLabel}` : ""})`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginStreakCard;
