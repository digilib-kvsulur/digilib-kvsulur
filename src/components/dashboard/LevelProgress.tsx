import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Star, TrendingUp } from "lucide-react";
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
        const { data, error } = await supabase.rpc('get_user_level', { user_points: userPoints });
        if (error) throw error;
        if (data && data.length > 0) setLevelInfo(data[0]);
      } catch (error) {
        console.error('Error fetching user level:', error);
      } finally { setLoading(false); }
    };
    fetchUserLevel();
  }, [userPoints]);

  if (loading) return (
    <Card className="border-border/50">
      <CardContent className="p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-24"></div>
          <div className="h-8 bg-muted rounded w-32"></div>
          <div className="h-2 bg-muted rounded w-full"></div>
        </div>
      </CardContent>
    </Card>
  );

  if (!levelInfo) return (
    <Card className="border-border/50">
      <CardContent className="p-5 text-sm text-muted-foreground">Level info unavailable</CardContent>
    </Card>
  );

  const IconComponent = Icons[levelInfo.icon_name as keyof typeof Icons] as React.ComponentType<any>;

  return (
    <Card className="border-border/50 overflow-hidden">
      <div className="h-1" style={{ background: `linear-gradient(90deg, ${levelInfo.color}, ${levelInfo.color}88)` }} />
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${levelInfo.color}15` }}>
            {IconComponent ? (
              <IconComponent className="h-7 w-7" style={{ color: levelInfo.color }} />
            ) : (
              <Star className="h-7 w-7" style={{ color: levelInfo.color }} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-2xl font-extrabold text-foreground">Lv.{levelInfo.level_number}</span>
              <Badge variant="secondary" className="text-[10px] font-semibold">{levelInfo.name}</Badge>
            </div>
            <p className="text-sm font-semibold text-foreground">{userPoints} XP</p>
          </div>
        </div>
        
        <div className="mt-4">
          <p className="text-xs text-muted-foreground mb-1.5">{levelInfo.description}</p>
          {levelInfo.points_to_next > 0 ? (
            <>
              <Progress value={levelInfo.progress_to_next} className="h-2 mb-1.5" />
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> {levelInfo.points_to_next} XP to Level {levelInfo.level_number + 1}
                </p>
                <p className="text-xs font-medium text-foreground">{Math.round(levelInfo.progress_to_next)}%</p>
              </div>
            </>
          ) : (
            <div className="text-xs font-medium text-success flex items-center gap-1">
              <Star className="h-3 w-3" /> Maximum level achieved! 🎉
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LevelProgress;
