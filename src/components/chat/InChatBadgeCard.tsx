import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Crown, Award, Medal, X, Loader2, Sparkles, Calendar, MapPin } from "lucide-react";
import * as Icons from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getActiveRotationalCycle, VerifiedRotationalCycle, VerifiedWinnerRecord } from "@/lib/rotationalBadgeService";

interface InChatBadgeCardProps {
  currentUser: any;
  onClose: () => void;
}

export const InChatBadgeCard = ({ currentUser, onClose }: InChatBadgeCardProps) => {
  const [loading, setLoading] = useState(true);
  const [activeCycle, setActiveCycle] = useState<VerifiedRotationalCycle | null>(null);
  const [myRotationalAward, setMyRotationalAward] = useState<VerifiedWinnerRecord | null>(null);
  const [earnedBadges, setEarnedBadges] = useState<any[]>([]);

  useEffect(() => {
    loadBadgeData();
  }, [currentUser]);

  const loadBadgeData = async () => {
    setLoading(true);
    try {
      const cycle = await getActiveRotationalCycle();
      setActiveCycle(cycle);

      if (cycle && currentUser?.id) {
        const found = cycle.winners.find((w) => w.studentId === currentUser.id);
        if (found) setMyRotationalAward(found);
      }

      if (currentUser?.id) {
        const { data: awards } = await supabase
          .from("badge_awards")
          .select("id, awarded_at, note, badges(id, name, description, icon_name, color, points)")
          .eq("user_id", currentUser.id)
          .order("awarded_at", { ascending: false });

        if (awards) setEarnedBadges(awards);
      }
    } catch (e) {
      console.error("Error loading badge info:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border/60 rounded-2xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-3 text-xs">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border-b border-border/50 px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/20">
            <Crown className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="font-bold text-[11px] text-foreground">Badge & Recognition Hub</p>
            <p className="text-[9px] text-muted-foreground">Rotational awards & earned badges</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 rounded-full text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="p-3 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
            <span className="text-[11px]">Loading your badges...</span>
          </div>
        ) : (
          <>
            {/* Rotational Award */}
            {myRotationalAward ? (
              <div className="rounded-xl border border-amber-400/40 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent overflow-hidden">
                <div className="flex items-center gap-2.5 p-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/20 shrink-0">
                    {myRotationalAward.badgeType === "best_library_user" ? (
                      <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-[11px] text-amber-700 dark:text-amber-400">
                        {myRotationalAward.badgeName}
                      </span>
                      <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                    </div>
                    <p className="text-[9px] text-amber-700/70 dark:text-amber-400/70 mt-0.5">
                      {myRotationalAward.scopeValue} · {activeCycle?.cycleLabel}
                    </p>
                  </div>
                </div>
                {activeCycle?.settings && (
                  <div className="border-t border-amber-400/20 px-2.5 py-1.5 flex gap-3 text-[9px] text-amber-700/80 dark:text-amber-400/70">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-2.5 w-2.5" />
                      Collection: {activeCycle.settings.collectionDate}
                    </span>
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{activeCycle.settings.collectionVenue}</span>
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-border/50 bg-muted/30 p-2.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                  <Crown className="h-3.5 w-3.5 text-amber-500" />
                  Rotational awards
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {activeCycle
                    ? `Active cycle: ${activeCycle.cycleLabel}. Top readers per class get physical badges!`
                    : "Monthly rotational badges are awarded to top readers. Keep reading to qualify!"}
                </p>
              </div>
            )}

            {/* Earned Badges */}
            <div>
              <p className="text-[10px] font-medium text-muted-foreground mb-1.5">
                Earned badges
                <span className="ml-1 bg-primary/10 text-primary px-1.5 py-0.5 rounded-full text-[9px] font-bold">
                  {earnedBadges.length}
                </span>
              </p>

              {earnedBadges.length === 0 ? (
                <div className="flex flex-col items-center py-4 text-center border border-dashed border-border/60 rounded-xl bg-muted/20">
                  <Medal className="h-6 w-6 text-muted-foreground/30 mb-1" />
                  <p className="text-[10px] font-medium text-muted-foreground">No badges yet</p>
                  <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                    Return books on time, do quizzes & attend events!
                  </p>
                </div>
              ) : (
                <div className="space-y-1 max-h-[130px] overflow-y-auto pr-0.5">
                  {earnedBadges.map((item, idx) => {
                    const b = item.badges;
                    const IconComp =
                      b?.icon_name && (Icons as any)[b.icon_name]
                        ? (Icons as any)[b.icon_name]
                        : Medal;
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-2 py-1.5 bg-background rounded-xl border border-border/50 hover:border-primary/30 transition-colors"
                        style={{ borderLeftWidth: 3, borderLeftColor: b?.color?.replace("text-", "") ?? "#6366f1" }}
                      >
                        <div
                          className="p-1 rounded-lg shrink-0"
                          style={{ backgroundColor: `${b?.color ?? "#6366f1"}20` }}
                        >
                          <IconComp
                            className="h-3.5 w-3.5"
                            style={{ color: b?.color?.replace("text-", "") ?? "#6366f1" }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[11px] text-foreground truncate">{b?.name || "Badge"}</p>
                          {b?.description && (
                            <p className="text-[9px] text-muted-foreground truncate">{b.description}</p>
                          )}
                        </div>
                        <span className="text-[9px] font-mono text-muted-foreground shrink-0">
                          {new Date(item.awarded_at).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
