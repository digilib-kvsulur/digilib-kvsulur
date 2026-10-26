import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { getUserLevel } from "@/lib/userLevelCache";
import { Award, TrendingUp, Sparkles, Star } from "lucide-react";
import * as Icons from "lucide-react";

interface LevelProgressProps {
  userPoints: number;
}

interface LevelInfo {
  level_number: number;
  name: string;
  min_points: number;
  max_points: number | null;
  icon_name: string;
  color: string;
  description: string;
  progress_to_next: number;
  points_to_next: number;
}

const LevelProgress = ({ userPoints }: LevelProgressProps) => {
  const [levelInfo, setLevelInfo] = useState<LevelInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserLevel = async () => {
      try {
        const data = await getUserLevel(userPoints);
        if (data) setLevelInfo(data);
      } catch (error) {
        console.error('Error fetching user level:', error);
      } finally { setLoading(false); }
    };
    fetchUserLevel();
  }, [userPoints]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs h-full animate-pulse flex flex-col justify-between space-y-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-muted/60" />
          <div className="h-4 bg-muted/50 rounded w-20" />
        </div>
        <div className="h-1.5 bg-muted/40 rounded-full w-full my-2" />
        <div className="h-3 bg-muted/40 rounded w-28" />
      </div>
    );
  }

  if (!levelInfo) return null;

  const IconComponent = Icons[levelInfo.icon_name as keyof typeof Icons] as React.ComponentType<any>;
  const levelColor = levelInfo.color || "#6366f1";

  return (
    <div className="rounded-2xl sm:rounded-3xl border border-indigo-500/20 bg-gradient-to-b from-indigo-500/[0.04] via-card to-card p-3.5 sm:p-5 shadow-sm hover:border-indigo-500/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full space-y-3">
      {/* Top Header: Level Icon + Rank Badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            {IconComponent ? (
              <IconComponent className="h-5 w-5" style={{ color: levelColor }} />
            ) : (
              <Award className="h-5 w-5 text-indigo-600" />
            )}
          </div>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider hidden sm:inline">
            Level Rank
          </span>
        </div>

        <Badge
          variant="outline"
          className="text-[11px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full border-indigo-500/30 text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 shrink-0 truncate max-w-[120px]"
        >
          {levelInfo.name}
        </Badge>
      </div>

      {/* Main Metric Row: Level number & total XP */}
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tight leading-none">
            Lv.{levelInfo.level_number}
          </span>
          <span className="text-xs sm:text-sm font-bold text-muted-foreground">
            Rank Tier
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] sm:text-xs text-muted-foreground mt-2 pt-1.5 border-t border-border/40">
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-indigo-500" />
            <strong className="text-foreground font-bold">{(userPoints || 0).toLocaleString()}</strong> XP
          </span>
          <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
            {Math.round(levelInfo.progress_to_next)}%
          </span>
        </div>
      </div>

      {/* Progress to next level bar (Height 44px to match claim button) */}
      <div className="pt-0.5">
        <div className="h-10.5 sm:h-11 rounded-xl bg-indigo-500/5 dark:bg-indigo-950/20 border border-indigo-500/20 px-3 flex flex-col justify-center space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <span>Next Lv.{levelInfo.level_number + 1}</span>
            </span>
            {levelInfo.points_to_next > 0 ? (
              <span className="text-foreground font-bold font-mono text-xs">
                +{levelInfo.points_to_next} XP
              </span>
            ) : (
              <span className="text-emerald-500 font-bold text-xs flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Max
              </span>
            )}
          </div>
          <Progress
            value={levelInfo.progress_to_next}
            className="h-1.5 bg-muted rounded-full"
          />
        </div>
      </div>
    </div>
  );
};

export default LevelProgress;
