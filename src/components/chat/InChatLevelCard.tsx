import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Zap, TrendingUp, Trophy, Star, X, Loader2, Sparkles } from "lucide-react";
import * as Icons from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface InChatLevelCardProps {
  currentUser: any;
  onClose: () => void;
}

export const InChatLevelCard = ({ currentUser, onClose }: InChatLevelCardProps) => {
  const [loading, setLoading] = useState(true);
  const [levelInfo, setLevelInfo] = useState<any | null>(null);
  const [classRank, setClassRank] = useState<number | null>(null);

  useEffect(() => {
    loadLevelData();
  }, [currentUser]);

  const loadLevelData = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const userPoints = currentUser.points || 0;
      const { data: levelRes } = await supabase.rpc("get_user_level", {
        user_points: userPoints
      });

      if (levelRes && levelRes.length > 0) {
        setLevelInfo(levelRes[0]);
      }

      if (currentUser.student_class) {
        const { data: rankRes } = await supabase.rpc("get_user_class_rank", {
          user_class: currentUser.student_class,
          user_points: userPoints
        });
        if (rankRes) {
          setClassRank(rankRes);
        }
      }
    } catch (err) {
      console.error("Error loading level info in bot:", err);
    } finally {
      setLoading(false);
    }
  };

  const IconComp = levelInfo?.icon_name && (Icons as any)[levelInfo.icon_name]
    ? (Icons as any)[levelInfo.icon_name]
    : Star;

  return (
    <div className="p-3 bg-card border border-primary/30 rounded-2xl shadow-lg space-y-2.5 animate-in fade-in slide-in-from-bottom-2 text-xs">
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-1.5 font-bold text-foreground">
          <Zap className="h-4 w-4 text-amber-500" />
          <span>Level & XP Progression</span>
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

      {!currentUser ? (
        <p className="text-muted-foreground">🔒 Sign in to see your personalized level, XP progress, and class ranking.</p>
      ) : loading ? (
        <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading level data...
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Main Level Hero */}
          <div className="p-3 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl border border-primary/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner"
                style={{ backgroundColor: `${levelInfo?.color || "#6366f1"}20` }}
              >
                <IconComp className="h-5 w-5" style={{ color: levelInfo?.color || "#6366f1" }} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-black text-foreground">
                    Lv.{levelInfo?.level_number || 1}
                  </span>
                  <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0 h-4">
                    {levelInfo?.name || "Novice"}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono">
                  Total XP: <strong className="text-primary">{currentUser.points || 0}</strong>
                </p>
              </div>
            </div>

            {classRank && (
              <div className="text-right shrink-0 bg-background/80 px-2 py-1 rounded-lg border">
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Rank in {currentUser.student_class}</div>
                <div className="text-sm font-black text-amber-500 flex items-center justify-end gap-0.5">
                  <Trophy className="h-3.5 w-3.5" /> #{classRank}
                </div>
              </div>
            )}
          </div>

          {/* Progress Bar to next level */}
          {levelInfo && (
            <div className="space-y-1 bg-muted/40 p-2.5 rounded-xl border border-border/50">
              <div className="flex justify-between text-[10px] font-semibold text-foreground">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-primary" /> Next Level Target
                </span>
                <span>{Math.round(levelInfo.progress_to_next || 0)}%</span>
              </div>
              <Progress value={levelInfo.progress_to_next || 0} className="h-2 rounded-full" />
              <div className="flex justify-between text-[9px] text-muted-foreground pt-0.5">
                <span>{currentUser.points || 0} XP</span>
                {levelInfo.points_to_next > 0 ? (
                  <span>{levelInfo.points_to_next} XP needed for Lv.{levelInfo.level_number + 1}</span>
                ) : (
                  <span className="text-emerald-600 font-bold">Max level reached! 🎉</span>
                )}
              </div>
            </div>
          )}

          {/* Quick Earn Guide */}
          <div className="p-2 bg-background rounded-lg border text-[10px] text-muted-foreground space-y-1">
            <span className="font-bold text-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" /> How to gain XP:
            </span>
            <div className="grid grid-cols-2 gap-1 text-[9px]">
              <span>• On-time returns: <strong>+10 XP</strong></span>
              <span>• Chapter Quizzes: <strong>+5 XP</strong></span>
              <span>• Daily Streak: <strong>+2–10 XP</strong></span>
              <span>• Book Reviews: <strong>+3 XP</strong></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
