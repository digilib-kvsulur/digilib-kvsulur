import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalLoginDays: number;
  loading: boolean;
}

export const useLoginStreak = (userId: string | undefined) => {
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    totalLoginDays: 0,
    loading: true,
  });

  useEffect(() => {
    if (!userId) return;

    const recordStreak = async () => {
      try {
        const { data, error } = await supabase.rpc('record_login_streak', {
          p_user_id: userId,
        });

        if (error) {
          console.error('Error recording login streak:', error);
          setStreakData(prev => ({ ...prev, loading: false }));
          return;
        }

        if (data && data.length > 0) {
          setStreakData({
            currentStreak: data[0].current_streak,
            longestStreak: data[0].longest_streak,
            totalLoginDays: data[0].total_login_days,
            loading: false,
          });
        }
      } catch (error) {
        console.error('Error recording login streak:', error);
        setStreakData(prev => ({ ...prev, loading: false }));
      }
    };

    recordStreak();
  }, [userId]);

  return streakData;
};
