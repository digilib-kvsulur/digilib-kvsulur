import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Zap, TrendingUp, Trophy, Star, X, Loader2, Sparkles } from "lucide-react";
import * as Icons from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface InChatLevelCardProps {
  currentUser: any;
  onClose: () => void;
}

const XP_TIPS = [
  { action: "Return books on time", xp: "+10 XP" },
  { action: "Chapter quizzes", xp: "+5 XP" },
  { action: "Daily login streak", xp: "+2–10 XP" },
  { action: "Write book reviews", xp: "+3 XP" },
];

export const InChatLevelCard = ({ currentUser, onClose }: InChatLevelCardProps) => {
  const [loading, setLoading] = useState(true);
  const [levelInfo, setLevelInfo] = useState<any | null>(null);
  const [classRank, setClassRank] = useState<number | null>(null);

  useEffect(() => {
    loadLevelData();
  }, [currentUser]);

  const loadLevelData = async () => {
    if (!currentUser) { setLoading(false); return; }
    setLoading(true);
    try {
      const userPoints = currentUser.points || 0;
      const { data: levelRes } = await supabase.rpc("get_user_level", { user_points: userPoints });
      if (levelRes && levelRes.length > 0) setLevelInfo(levelRes[0]);

      if (currentUser.student_class) {
        const { data: rankRes } = await supabase.rpc("get_user_class_rank", {
          user_class: currentUser.student_class,
          user_points: userPoints,
        });
        if (rankRes) setClassRank(rankRes);
      }
    } catch (err) {
      console.error("Error loading level info:", err);
    } finally {
      setLoading(false);
    }
  };

  const IconComp =
    levelInfo?.icon_name && (Icons as any)[levelInfo.icon_name]
      ? (Icons as any)[levelInfo.icon_name]
      : Star;

  const levelColor = levelInfo?.color ?? "#6366f1";

  return (
    <div className="bg-card border border-border/60 rounded-2xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-3 text-xs">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500/15 via-primary/10 to-transparent border-b border-border/50 px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/15">
            <Zap className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <p className="font-bold text-[11px] text-foreground">Level & XP Progression</p>
            <p className="text-[9px] text-muted-foreground">Your reading journey so far</p>
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

      <div className="p-3 space-y-2.5">
        {!currentUser ? (
          <p className="text-muted-foreground py-2">
            🔒 Sign in to see your level, XP, and class ranking.
          </p>
        ) : loading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-[11px]">Loading level data...</span>
          </div>
        ) : (
          <>
            {/* Level Hero Card */}
            <div
              className="rounded-xl p-3 flex items-center justify-between gap-3 border"
              style={{
                background: `linear-gradient(135deg, ${levelColor}18 0%, ${levelColor}08 100%)`,
                borderColor: `${levelColor}30`,
              }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs border border-white/20"
                  style={{ backgroundColor: `${levelColor}25` }}
                >
                  <IconComp className="h-5 w-5" style={{ color: levelColor }} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl font-black text-foreground" style={{ color: levelColor }}>
                      Lv.{levelInfo?.level_number ?? 1}
                    </span>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border"
                      style={{
                        color: levelColor,
                        backgroundColor: `${levelColor}15`,
                        borderColor: `${levelColor}40`,
                      }}
                    >
                      {levelInfo?.name ?? "Novice"}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    <span className="font-bold text-foreground">{currentUser.points ?? 0}</span> total XP
                  </p>
                </div>
              </div>

              {classRank && (
                <div className="text-right shrink-0 bg-background/60 backdrop-blur-sm rounded-xl px-2.5 py-1.5 border border-border/60">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide font-semibold">
                    {currentUser.student_class}
                  </p>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <Trophy className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-base font-black text-amber-500">#{classRank}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {levelInfo && (
              <div className="rounded-xl border border-border/50 bg-muted/30 p-2.5 space-y-1.5">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-medium text-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-primary" />
                    Progress to next level
                  </span>
                  <span className="font-bold text-primary">{Math.round(levelInfo.progress_to_next ?? 0)}%</span>
                </div>
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.round(levelInfo.progress_to_next ?? 0)}%`,
                      background: `linear-gradient(90deg, ${levelColor}, ${levelColor}99)`,
                      boxShadow: `0 0 8px ${levelColor}60`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>{currentUser.points ?? 0} XP</span>
                  {(levelInfo.points_to_next ?? 0) > 0 ? (
                    <span>{levelInfo.points_to_next} more XP → Lv.{(levelInfo.level_number ?? 1) + 1}</span>
                  ) : (
                    <span className="text-emerald-500 font-bold">Max level reached! 🎉</span>
                  )}
                </div>
              </div>
            )}

            {/* Quick earn guide */}
            <div className="rounded-xl border border-border/50 bg-muted/20 px-2.5 py-2 space-y-1">
              <p className="text-[10px] font-semibold text-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" /> How to earn XP
              </p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                {XP_TIPS.map((tip) => (
                  <div key={tip.action} className="flex items-center justify-between text-[9px]">
                    <span className="text-muted-foreground truncate">{tip.action}</span>
                    <span className="font-bold text-primary ml-1 shrink-0">{tip.xp}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
