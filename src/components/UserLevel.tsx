
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import * as Icons from "lucide-react";

interface UserLevelProps {
  userPoints: number;
  showDetails?: boolean;
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

const UserLevel = ({ userPoints, showDetails = true }: UserLevelProps) => {
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
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
        <div className="h-2 bg-gray-200 rounded w-full"></div>
      </div>
    );
  }

  if (!levelInfo) {
    return (
      <div className="text-sm text-gray-500">
        Level information not available
      </div>
    );
  }

  // Get the icon component dynamically
  const IconComponent = Icons[levelInfo.icon_name as keyof typeof Icons] as React.ComponentType<any>;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {IconComponent && (
          <IconComponent 
            className="h-5 w-5" 
            style={{ color: levelInfo.color }}
          />
        )}
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{levelInfo.name}</span>
          <Badge variant="secondary" className="text-xs">
            Level {levelInfo.level_number}
          </Badge>
        </div>
      </div>

      {showDetails && (
        <>
          <div className="text-xs text-gray-600">
            {levelInfo.description}
          </div>
          
          {levelInfo.points_to_next > 0 && (
            <>
              <Progress 
                value={levelInfo.progress_to_next} 
                className="h-2"
              />
              <div className="text-xs text-gray-500">
                {levelInfo.points_to_next} points to next level
              </div>
            </>
          )}
          
          {levelInfo.points_to_next === 0 && (
            <div className="text-xs text-purple-600 font-medium">
              🎉 Maximum level achieved!
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UserLevel;
