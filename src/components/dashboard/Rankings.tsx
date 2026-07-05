import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Users } from "lucide-react";
import Leaderboard from "@/components/rewards/Leaderboard";
import SchoolLeaderboard from "@/components/rewards/SchoolLeaderboard";
import { supabase } from "@/integrations/supabase/client";

interface RankingsProps {
  user: any;
}

const Rankings = ({ user }: RankingsProps) => {
  const [classLeaderboardEntries, setClassLeaderboardEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) fetchClassLeaderboard();
  }, [user?.id]);

  const fetchClassLeaderboard = async () => {
    if (!user?.student_class) { setLoading(false); return; }
    try {
      const { data, error } = await supabase.rpc('get_leaderboard_data', { class_filter: user.student_class });
      if (error) { console.error('Error fetching class leaderboard:', error); return; }
      if (data) {
        setClassLeaderboardEntries(data.map((item: any, index: number) => ({
          id: item.id, studentId: item.id, studentName: item.first_name, studentClass: item.student_class,
          totalPoints: item.points, rank: index + 1, recentActivity: "Active this week"
        })));
      }
    } catch (error) { console.error('Error in fetchClassLeaderboard:', error); }
    finally { setLoading(false); }
  };

  if (loading) return (
    <Card><CardContent className="p-6"><div className="animate-pulse space-y-4"><div className="h-4 bg-muted rounded w-3/4" /><div className="h-4 bg-muted rounded w-1/2" /></div></CardContent></Card>
  );

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-warning" />
            Rankings & Leaderboards
          </CardTitle>
          <CardDescription>See how you rank among your classmates and school</CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="class" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="class" className="flex items-center gap-2 text-xs sm:text-sm">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Class</span> Rankings
          </TabsTrigger>
          <TabsTrigger value="school" className="flex items-center gap-2 text-xs sm:text-sm">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">School</span> Rankings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="class">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Class {user?.student_class} Leaderboard</CardTitle>
              <CardDescription className="text-xs">Ranking based on total points earned</CardDescription>
            </CardHeader>
            <CardContent>
              <Leaderboard entries={classLeaderboardEntries} currentUserId={user?.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="school">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">School-wide Leaderboard</CardTitle>
              <CardDescription className="text-xs">Ranking among all students</CardDescription>
            </CardHeader>
            <CardContent>
              <SchoolLeaderboard currentUserId={user?.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Rankings;
