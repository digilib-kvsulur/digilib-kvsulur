import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { getUserLevel } from "@/lib/userLevelCache";
import { Award, TrendingUp, Sparkles } from "lucide-react";
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
      <div className="rounded-2xl border border-indigo-500/20 bg-card p-3 sm:p-3.5 shadow-2xs h-full animate-pulse flex flex-col justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-muted/60" />
          <div className="h-4 bg-muted/50 rounded w-20" />
        </div>
        <div className="h-1.5 bg-muted/40 rounded-full w-full my-3" />
        <div className="h-3 bg-muted/40 rounded w-28" />
      </div>
    );
  }

  if (!levelInfo) return null;

  const IconComponent = Icons[levelInfo.icon_name as keyof typeof Icons] as React.ComponentType<any>;
  const levelColor = levelInfo.color || "#6366f1";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/15 via-card to-purple-500/10 p-3 sm:p-3.5 shadow-xs hover:border-indigo-500/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full">
      {/* Top row: Icon + Level + Rank Badge */}
      <div>
        <div className="flex items-center justify-between gap-1.5 mb-1.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs"
            style={{
              backgroundColor: `${levelColor}22`,
              border: `1px solid ${levelColor}40`,
            }}
          >
            {IconComponent ? (
              <IconComponent className="h-4 w-4" style={{ color: levelColor }} />
            ) : (
              <Award className="h-4 w-4" style={{ color: levelColor }} />
            )}
          </div>

          <Badge
            variant="outline"
            className="text-[10px] font-bold px-1.5 py-0.2 rounded-md truncate max-w-[110px]"
            style={{
              color: levelColor,
              borderColor: `${levelColor}40`,
              backgroundColor: `${levelColor}15`,
            }}
          >
            {levelInfo.name}
          </Badge>
        </div>

        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-foreground tracking-tight leading-none">
              Lv.{levelInfo.level_number}
            </span>
            <span className="text-xs font-bold text-muted-foreground">rank</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
            {(userPoints || 0).toLocaleString()} <span className="font-semibold uppercase text-[9px]">Total XP</span>
          </p>
        </div>
      </div>

      {/* Progress to next level bar */}
      <div className="pt-2 space-y-1">
        <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
          {levelInfo.points_to_next > 0 ? (
            <span className="truncate flex items-center gap-1">
              <TrendingUp className="h-2.5 w-2.5 text-indigo-500 shrink-0" />
              <span><strong>{levelInfo.points_to_next} XP</strong> to next</span>
            </span>
          ) : (
            <span className="text-emerald-500 font-bold flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5" /> Max Rank
            </span>
          )}
          <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
            {Math.round(levelInfo.progress_to_next)}%
          </span>
        </div>
        <Progress
          value={levelInfo.progress_to_next}
          className="h-1.5 bg-muted/80 rounded-full"
        />
      </div>
    </div>
  );
};

export default LevelProgress;
