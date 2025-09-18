import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";
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
    fetchUserLevel();
  }, [userPoints]);

  const fetchUserLevel = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_user_level', { user_points: userPoints });

      if (error) throw error;

      if (data && data.length > 0) {
        setLevelInfo(data[0]);
      }
    } catch (error) {
      console.error('Error fetching user level:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Level & Progress</CardTitle>
          <Star className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-6 bg-gray-200 rounded w-24"></div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-2 bg-gray-200 rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!levelInfo) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Level & Progress</CardTitle>
          <Star className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">
            Level information not available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get the icon component dynamically
  const IconComponent = Icons[levelInfo.icon_name as keyof typeof Icons] as React.ComponentType<any>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Level & Progress</CardTitle>
        {IconComponent ? (
          <IconComponent 
            className="h-4 w-4" 
            style={{ color: levelInfo.color }}
          />
        ) : (
          <Star className="h-4 w-4 text-yellow-600" />
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold" style={{ color: levelInfo.color }}>
              Level {levelInfo.level_number}
            </div>
            <Badge variant="secondary" className="text-xs">
              {levelInfo.name}
            </Badge>
          </div>
          
          <div className="text-lg font-semibold text-gray-700">
            {userPoints} points
          </div>

          <div className="text-xs text-gray-600">
            {levelInfo.description}
          </div>
          
          {levelInfo.points_to_next > 0 ? (
            <>
              <Progress value={levelInfo.progress_to_next} className="h-2" />
              <p className="text-xs text-gray-600">
                {levelInfo.points_to_next} points to level {levelInfo.level_number + 1}
              </p>
            </>
          ) : (
            <div className="text-xs text-purple-600 font-medium">
              🎉 Maximum level achieved!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LevelProgress;