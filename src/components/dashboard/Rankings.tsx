import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Trophy, Users, Shield, Award, Medal, Crown } from "lucide-react";
import Leaderboard from "@/components/rewards/Leaderboard";
import SchoolLeaderboard from "@/components/rewards/SchoolLeaderboard";
import { supabase } from "@/integrations/supabase/client";
import { ProfileView } from "@/components/community/ProfileView";

interface RankingsProps {
  user: any;
}

const Rankings = ({ user }: RankingsProps) => {
  const [classLeaderboardEntries, setClassLeaderboardEntries] = useState<any[]>([]);
  const [monthlyLeaderboardEntries, setMonthlyLeaderboardEntries] = useState<any[]>([]);
  const [leagueEntries, setLeagueEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [profileFriendship, setProfileFriendship] = useState<any>(null);
  const [daysUntilReset, setDaysUntilReset] = useState(0);

  useEffect(() => {
    if (user?.id) {
      const calculateDays = () => {
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const diffTime = Math.abs(nextMonth.getTime() - now.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setDaysUntilReset(diffDays);
      };
      calculateDays();

      Promise.all([
        fetchClassLeaderboard(),
        fetchMonthlyLeaderboard(),
        fetchClassReadingLeague()
      ]).finally(() => setLoading(false));
    }
  }, [user?.id]);

  const fetchMonthlyLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, student_class, monthly_points, avatar_url")
        .eq("role", "student")
        .gt("monthly_points", 0)
        .order("monthly_points", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      if (data) {
        setMonthlyLeaderboardEntries(data.map((item: any, index: number) => ({
          id: item.id,
          studentId: item.id,
          studentName: `${item.first_name || ""} ${item.last_name || ""}`.trim() || item.first_name || "Student",
          studentClass: item.student_class,
          totalPoints: item.monthly_points || 0,
          rank: index + 1,
          recentActivity: "Points earned this month",
          avatar: item.avatar_url
        })));
      }
    } catch (e) {
      console.error("Error fetching monthly leaderboard:", e);
    }
  };

  const fetchClassLeaderboard = async () => {
    if (!user?.student_class) return;
    try {
      const { data, error } = await supabase.rpc('get_leaderboard_data', { class_filter: user.student_class });
      if (error) { console.error('Error fetching class leaderboard:', error); return; }
      if (data) {
        setClassLeaderboardEntries(data.map((item: any, index: number) => ({
          id: item.id, studentId: item.id,
          studentName: `${item.first_name || ""} ${item.last_name || ""}`.trim() || item.first_name || "Student",
          studentClass: item.student_class,
          totalPoints: item.points || 0, rank: index + 1, recentActivity: "Active this week",
          avatar: item.avatar_url
        })));
      }
    } catch (error) { console.error('Error in fetchClassLeaderboard:', error); }
  };

  const fetchClassReadingLeague = async () => {
    try {
      const { data, error } = await supabase.rpc('get_class_league');
      if (error) throw error;
      const sorted = (data || []).map((r: any) => ({
        className: r.student_class,
        totalPoints: Number(r.total_points) || 0,
        studentCount: Number(r.student_count) || 0,
      }));
      let rank = 1;
      const ranked = sorted.map((entry, idx) => {
        if (idx > 0 && entry.totalPoints !== sorted[idx - 1].totalPoints) rank = idx + 1;
        return { ...entry, rank };
      });
      setLeagueEntries(ranked);
    } catch (error) {
      console.error('Error fetching class reading league:', error);
    }
  };


  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-4 w-4 text-yellow-500" />;
      case 2: return <Medal className="h-4 w-4 text-gray-400" />;
      case 3: return <Award className="h-4 w-4 text-amber-600" />;
      default: return <span className="text-xs font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const openProfile = async (userId: string) => {
    if (!userId) return;
    const { data } = await supabase.from("friendships").select("*")
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`).maybeSingle();
    setProfileFriendship(data || null);
    setProfileUserId(userId);
  };
  const sendRequest = async (targetId: string) => {
    const { data, error } = await supabase.from("friendships").insert({ requester_id: user.id, addressee_id: targetId }).select().single();
    if (!error) setProfileFriendship(data);
  };
  const respondRequest = async (_targetId: string, status: string) => {
    if (!profileFriendship) return;
    const { data } = await supabase.from("friendships").update({ status }).eq("id", profileFriendship.id).select().single();
    setProfileFriendship(data || null);
  };
  const removeRequest = async () => {
    if (!profileFriendship) return;
    await supabase.from("friendships").delete().eq("id", profileFriendship.id);
    setProfileFriendship(null);
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="class" className="flex items-center gap-2 text-xs sm:text-sm">
            <Users className="h-4 w-4" />
            <span>Class</span>
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex items-center gap-2 text-xs sm:text-sm">
            <Trophy className="h-4 w-4" />
            <span>Monthly</span>
          </TabsTrigger>
          <TabsTrigger value="school" className="flex items-center gap-2 text-xs sm:text-sm">
            <Trophy className="h-4 w-4" />
            <span>School</span>
          </TabsTrigger>
          <TabsTrigger value="league" className="flex items-center gap-2 text-xs sm:text-sm">
            <Shield className="h-4 w-4" />
            <span>Leagues</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="class">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Class {user?.student_class} Leaderboard</CardTitle>
              <CardDescription className="text-xs">Ranking based on total points earned</CardDescription>
            </CardHeader>
            <CardContent>
              <Leaderboard entries={classLeaderboardEntries} currentUserId={user?.id} onEntryClick={openProfile} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base">Monthly Leaderboard</CardTitle>
                  <CardDescription className="text-xs">Points earned during this calendar month</CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-semibold text-primary border-primary/30">
                  Resets in {daysUntilReset} day{daysUntilReset === 1 ? "" : "s"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {monthlyLeaderboardEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No monthly points recorded yet. Be the first to earn points!
                </div>
              ) : (
                <Leaderboard entries={monthlyLeaderboardEntries} currentUserId={user?.id} onEntryClick={openProfile} />
              )}
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
              <SchoolLeaderboard currentUserId={user?.id} onEntryClick={openProfile} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="league">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Class Reading Leagues</CardTitle>
              <CardDescription className="text-xs">Which class reads the most? Aggregated points across all class students.</CardDescription>
            </CardHeader>
            <CardContent>
              {leagueEntries.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">No class league data available.</p>
              ) : (
                <div className="rounded-xl border border-border/50 overflow-hidden divide-y divide-border/30">
                  {leagueEntries.map((entry) => (
                    <div
                      key={entry.className}
                      className={`flex items-center gap-3 px-4 py-3 transition-all hover:bg-muted/30 ${
                        entry.className === user?.student_class ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                      }`}
                    >
                      <div className="w-7 flex items-center justify-center shrink-0">{getRankIcon(entry.rank)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-foreground">Class {entry.className}</span>
                          {entry.className === user?.student_class && (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">My Class</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{entry.studentCount} reader{entry.studentCount === 1 ? '' : 's'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-extrabold text-primary">{entry.totalPoints.toLocaleString()}</span>
                        <p className="text-[9px] text-muted-foreground">total pts</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <Dialog open={!!profileUserId} onOpenChange={open => !open && setProfileUserId(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          {profileUserId && <ProfileView userId={profileUserId} currentUserId={user.id} friendship={profileFriendship} onSend={sendRequest} onRespond={respondRequest} onRemove={removeRequest} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Rankings;
