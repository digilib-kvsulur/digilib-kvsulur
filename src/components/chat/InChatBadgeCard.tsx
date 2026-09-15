import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Crown, Award, Medal, Trophy, X, Loader2, Sparkles, CheckCircle2, Calendar, MapPin } from "lucide-react";
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
      // 1. Fetch active rotational cycle
      const cycle = await getActiveRotationalCycle();
      setActiveCycle(cycle);

      if (cycle && currentUser?.id) {
        const found = cycle.winners.find((w) => w.studentId === currentUser.id);
        if (found) {
          setMyRotationalAward(found);
        }
      }

      // 2. Fetch earned badges from badge_awards
      if (currentUser?.id) {
        const { data: awards } = await supabase
          .from("badge_awards")
          .select("id, awarded_at, note, badges(id, name, description, icon_name, color, points)")
          .eq("user_id", currentUser.id)
          .order("awarded_at", { ascending: false });

        if (awards) {
          setEarnedBadges(awards);
        }
      }
    } catch (e) {
      console.error("Error loading badge info in bot:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 bg-card border border-primary/30 rounded-2xl shadow-lg space-y-2.5 animate-in fade-in slide-in-from-bottom-2 text-xs">
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-1.5 font-bold text-foreground">
          <Crown className="h-4 w-4 text-amber-500" />
          <span>Badge & Recognition Hub</span>
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

      {loading ? (
        <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading badge records...
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Active Rotational Status */}
          {myRotationalAward ? (
            <div className="p-2.5 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent rounded-xl border border-amber-500/30 space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600">
                  {myRotationalAward.badgeType === "best_library_user" ? (
                    <Crown className="h-4 w-4" />
                  ) : (
                    <Award className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <span>{myRotationalAward.badgeName}</span>
                    <Sparkles className="h-3 w-3" />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Awarded for {myRotationalAward.scopeValue} ({activeCycle?.cycleLabel})
                  </p>
                </div>
              </div>

              {activeCycle?.settings && (
                <div className="mt-1 pt-1.5 border-t border-amber-500/20 text-[10px] text-foreground/80 space-y-0.5">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-amber-500" />
                    <span>Collection Date: <strong>{activeCycle.settings.collectionDate}</strong></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-amber-500" />
                    <span className="truncate">{activeCycle.settings.collectionVenue}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-2.5 bg-muted/40 rounded-xl border border-border/60 text-[11px] space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5 text-primary" />
                <span>Monthly Rotational Badges</span>
              </div>
              <p className="text-muted-foreground text-[10px]">
                {activeCycle
                  ? `Active cycle: ${activeCycle.cycleLabel}. Top readers receive physical badges and collection slips!`
                  : "Rotational awards are calculated every month based on XP and borrowed books."}
              </p>
            </div>
          )}

          {/* Earned Badges List */}
          <div>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5 flex items-center justify-between">
              <span>Earned Badges ({earnedBadges.length})</span>
            </div>

            {earnedBadges.length === 0 ? (
              <div className="p-2.5 text-center bg-muted/20 rounded-xl border border-dashed text-muted-foreground text-[11px]">
                <Medal className="h-5 w-5 mx-auto mb-1 opacity-40" />
                <span>No achievement badges unlocked yet. Keep reading and taking quizzes to unlock badges!</span>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                {earnedBadges.map((item, idx) => {
                  const b = item.badges;
                  const IconComp = b?.icon_name && (Icons as any)[b.icon_name] ? (Icons as any)[b.icon_name] : Medal;
                  return (
                    <div
                      key={idx}
                      className="p-2 bg-background rounded-lg border flex items-center gap-2"
                    >
                      <div className="p-1 rounded-md bg-primary/10 text-primary shrink-0">
                        <IconComp className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[11px] truncate text-foreground">{b?.name || "Library Badge"}</p>
                        <p className="text-[9px] text-muted-foreground truncate">{b?.description}</p>
                      </div>
                      <span className="text-[9px] font-mono text-muted-foreground shrink-0">
                        {new Date(item.awarded_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
