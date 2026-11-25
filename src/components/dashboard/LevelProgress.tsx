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
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            {IconComponent ? (
              <IconComponent className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: levelColor }} />
            ) : (
              <Award className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
            )}
          </div>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider hidden xl:inline whitespace-nowrap">
            Level Rank
          </span>
        </div>

        <Badge
          variant="outline"
          className="text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full border-indigo-500/30 text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 min-w-0 truncate max-w-full"
          title={levelInfo.name}
        >
          {levelInfo.name}
        </Badge>
      </div>

      {/* Main Metric Row: Level number & total XP */}
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tight leading-none tabular-nums">
            Lv.{levelInfo.level_number}
          </span>
          <span className="text-xs sm:text-sm font-bold text-muted-foreground">
            Rank Tier
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs text-muted-foreground mt-2 pt-1.5 border-t border-border/40">
          <span className="flex items-center gap-1 min-w-0 truncate">
            <Star className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            <strong className="text-foreground font-bold tabular-nums">{(userPoints || 0).toLocaleString()}</strong> XP
          </span>
          <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold shrink-0 tabular-nums">
            {Math.round(levelInfo.progress_to_next)}%
          </span>
        </div>
      </div>

      {/* Progress to next level bar */}
      <div className="pt-0.5">
        <div className="min-h-[44px] py-2 rounded-xl bg-indigo-500/5 dark:bg-indigo-950/20 border border-indigo-500/20 px-2.5 sm:px-3 flex flex-col justify-center space-y-1.5 overflow-hidden">
          <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground gap-1.5 min-w-0">
            <span className="flex items-center gap-1 min-w-0 truncate">
              <TrendingUp className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <span className="truncate">Lv.{levelInfo.level_number + 1} Goal</span>
            </span>
            {levelInfo.points_to_next > 0 ? (
              <span className="text-foreground font-bold font-mono text-[10px] sm:text-[11px] whitespace-nowrap shrink-0 tabular-nums">
                +{levelInfo.points_to_next.toLocaleString()} XP
              </span>
            ) : (
              <span className="text-emerald-500 font-bold text-xs flex items-center gap-1 whitespace-nowrap shrink-0">
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
