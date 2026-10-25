import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { getUserLevel } from "@/lib/userLevelCache";
import { Star, TrendingUp, Sparkles, Award } from "lucide-react";
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

  if (loading) return (
    <Card className="border border-border/60 rounded-2xl bg-card/60 backdrop-blur-sm shadow-2xs">
      <CardContent className="p-4 sm:p-4.5">
        <div className="animate-pulse space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted/60" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 bg-muted/60 rounded w-24" />
              <div className="h-3 bg-muted/40 rounded w-16" />
            </div>
          </div>
          <div className="h-2 bg-muted/40 rounded-full w-full" />
        </div>
      </CardContent>
    </Card>
  );

  if (!levelInfo) return null;

  const IconComponent = Icons[levelInfo.icon_name as keyof typeof Icons] as React.ComponentType<any>;
  const levelColor = levelInfo.color || "#6366f1";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-indigo-500/10 via-card to-card hover:border-indigo-500/40 hover:shadow-md transition-all duration-200 shadow-2xs group flex flex-col justify-between">
      {/* Top accent glow line */}
      <div
        className="h-1 w-full"
        style={{
          background: `linear-gradient(90deg, ${levelColor}, ${levelColor}88)`,
        }}
      />

      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between gap-3">
        {/* Top: Icon + Level info */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform"
              style={{
                backgroundColor: `${levelColor}18`,
                border: `1px solid ${levelColor}35`,
              }}
            >
              {IconComponent ? (
                <IconComponent className="h-5 w-5" style={{ color: levelColor }} />
              ) : (
                <Award className="h-5 w-5" style={{ color: levelColor }} />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-base sm:text-lg font-black text-foreground tracking-tight">
                  Lv.{levelInfo.level_number}
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold px-1.5 py-0.2 rounded-md"
                  style={{
                    color: levelColor,
                    borderColor: `${levelColor}40`,
                    backgroundColor: `${levelColor}12`,
                  }}
                >
                  {levelInfo.name}
                </Badge>
              </div>
              <p className="text-xs font-bold text-muted-foreground truncate">
                {(userPoints || 0).toLocaleString()} <span className="text-[10px] uppercase font-semibold">Total XP</span>
              </p>
            </div>
          </div>

          <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full shrink-0">
            {Math.round(levelInfo.progress_to_next)}%
          </span>
        </div>

        {/* Level description & progress bar */}
        <div className="space-y-1.5">
          <div className="relative">
            <Progress
              value={levelInfo.progress_to_next}
              className="h-2 bg-muted/70 rounded-full overflow-hidden"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
            {levelInfo.points_to_next > 0 ? (
              <span className="flex items-center gap-1 text-foreground/80 truncate">
                <TrendingUp className="h-3 w-3 text-indigo-500 shrink-0" />
                <span>
                  <strong>{levelInfo.points_to_next} XP</strong> to Lv.{levelInfo.level_number + 1}
                </span>
              </span>
            ) : (
              <span className="text-emerald-500 font-bold flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Max rank reached!
              </span>
            )}
            <span className="text-[10px] text-muted-foreground truncate">
              Tier {levelInfo.level_number}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LevelProgress;
