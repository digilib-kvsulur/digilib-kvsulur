import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Crown, Medal, Award, Trophy, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SchoolLeaderboardEntry {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  student_class: string;
  points: number;
  rank: number;
}

interface SchoolLeaderboardProps {
  currentUserId?: string;
  onEntryClick?: (userId: string) => void;
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1: return <Crown className="h-5 w-5 text-yellow-500" />;
    case 2: return <Medal className="h-5 w-5 text-gray-400" />;
    case 3: return <Award className="h-5 w-5 text-amber-600" />;
    default: return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
  }
};

const getRankBg = (rank: number) => {
  switch (rank) {
    case 1: return "from-yellow-50 to-amber-50 border-yellow-200 dark:from-yellow-950/20 dark:to-amber-950/20";
    case 2: return "from-gray-50 to-slate-50 border-gray-200 dark:from-gray-950/20 dark:to-slate-950/20";
    case 3: return "from-amber-50 to-orange-50 border-amber-200 dark:from-amber-950/20 dark:to-orange-950/20";
    default: return "";
  }
};

const SchoolLeaderboard = ({ currentUserId, onEntryClick }: SchoolLeaderboardProps) => {
  const [entries, setEntries] = useState<SchoolLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [schoolStats, setSchoolStats] = useState({ totalStudents: 0, totalPoints: 0, averagePoints: 0 });
  const { toast } = useToast();

  useEffect(() => { loadLeaderboard(); }, [currentUserId]);

  const loadLeaderboard = async () => {
    try {
      const { data: students, error } = await supabase.rpc('get_leaderboard_data');
      if (error) throw error;

      const validStudents = (students || []).filter((s: any) => s.first_name);
      const ranked: SchoolLeaderboardEntry[] = [];
      let currentRank = 1;
      validStudents.forEach((student: any, index: number) => {
        if (index > 0 && student.points !== validStudents[index - 1].points) currentRank = index + 1;
        const fullName = `${student.first_name || ""} ${student.last_name || ""}`.trim() || student.first_name || "Student";
        ranked.push({ ...student, full_name: fullName, points: student.points || 0, rank: currentRank });
      });
      setEntries(ranked);

      const totalStudents = ranked.length;
      const totalPoints = ranked.reduce((sum, e) => sum + e.points, 0);
      
      const { data: statsData } = await supabase.rpc('get_school_leaderboard_stats');
      if (statsData && statsData.length > 0) {
        const stats = statsData[0];
        setSchoolStats({
          totalStudents: Number(stats.total_students) || 0,
          totalPoints: Number(stats.total_points) || 0,
          averagePoints: Math.round(Number(stats.average_points)) || 0
        });
      } else {
        setSchoolStats({ totalStudents, totalPoints, averagePoints: totalStudents > 0 ? Math.round(totalPoints / totalStudents) : 0 });
      }

      if (currentUserId) {
        const userEntry = ranked.find(e => e.id === currentUserId);
        setCurrentUserRank(userEntry?.rank || null);
      }
    } catch (error) {
      console.error('Error loading school leaderboard:', error);
      toast({ title: "Error", description: "Failed to load school leaderboard", variant: "destructive" });
    } finally { setLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  const topThree = entries.slice(0, 3);
  const others = entries.slice(3);

  return (
    <div className="space-y-4">
      {/* Your rank + stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {currentUserRank && (
          <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-primary/5 border border-primary/20 text-center">
            <Trophy className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold text-primary">#{currentUserRank}</p>
            <p className="text-[10px] text-muted-foreground">Your Rank</p>
          </div>
        )}
        {[
          { label: "Students", value: schoolStats.totalStudents, color: "text-primary" },
          { label: "Total Points", value: schoolStats.totalPoints, color: "text-success" },
          { label: "Average", value: schoolStats.averagePoints, color: "text-accent" },
        ].map((stat) => (
          <div key={stat.label} className="p-3 rounded-xl bg-muted/30 border border-border/30 text-center">
            <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Top 3 podium */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {topThree.map((entry) => (
            <div
              key={entry.id}
              onClick={() => onEntryClick?.(entry.id)}
              className={`relative p-4 rounded-xl border bg-gradient-to-b transition-all hover:shadow-md ${getRankBg(entry.rank)} ${
                entry.id === currentUserId ? 'ring-2 ring-primary' : ''
              } ${onEntryClick ? 'cursor-pointer' : ''}`}
            >
              <div className="text-center">
                <div className="flex justify-center mb-2">{getRankIcon(entry.rank)}</div>
                <Avatar className="h-12 w-12 mx-auto mb-2">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                    {entry.first_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <h4 className="font-semibold text-sm text-foreground truncate">{entry.full_name}</h4>
                <p className="text-xs text-muted-foreground">Class {entry.student_class}</p>
                <p className="text-xl font-bold text-primary mt-2">{entry.points}</p>
                <p className="text-[10px] text-muted-foreground">points</p>
                {entry.id === currentUserId && <Badge variant="secondary" className="mt-2 text-[10px]">You</Badge>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Others */}
      {others.length > 0 && (
        <div className="rounded-xl border border-border/50 overflow-hidden divide-y divide-border/30">
          {others.map((entry) => (
            <div
              key={entry.id}
              onClick={() => onEntryClick?.(entry.id)}
              className={`flex items-center gap-3 px-4 py-3 transition-all hover:bg-muted/30 ${
                entry.id === currentUserId ? 'bg-primary/5 border-l-2 border-l-primary' : ''
              } ${onEntryClick ? 'cursor-pointer' : ''}`}
            >
              <div className="w-7 flex items-center justify-center shrink-0">{getRankIcon(entry.rank)}</div>
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-muted text-muted-foreground text-xs">{entry.first_name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-foreground truncate">{entry.full_name}</span>
                  {entry.id === currentUserId && <Badge variant="secondary" className="text-[10px] px-1.5">You</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">Class {entry.student_class}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-sm font-bold text-primary">{entry.points}</span>
                <p className="text-[10px] text-muted-foreground">pts</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-base font-medium text-foreground mb-1">No students found</h3>
          <p className="text-sm text-muted-foreground">No approved students for the leaderboard yet.</p>
        </div>
      )}
    </div>
  );
};

export default SchoolLeaderboard;
