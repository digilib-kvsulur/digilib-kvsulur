import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Trophy, Users, Shield, Award, Medal, Crown } from "lucide-react";
import SchoolLeaderboard from "@/components/rewards/SchoolLeaderboard";
import { supabase } from "@/integrations/supabase/client";
import { ProfileView } from "@/components/community/ProfileView";

interface RankingsProps {
  user: any;
}

type Period = "monthly" | "lifetime";

const Rankings = ({ user }: RankingsProps) => {
  const [period, setPeriod] = useState<Period>("lifetime");
  const [leagueEntries, setLeagueEntries] = useState<any[]>([]);
  const [leagueLoading, setLeagueLoading] = useState(true);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [profileFriendship, setProfileFriendship] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const diffTime = nextMonth.getTime() - now.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
      const diffSeconds = Math.floor((diffTime % (1000 * 60)) / 1000);
      if (diffDays < 3) setTimeLeft(`${diffDays}d ${diffHours}h ${diffMinutes}m ${diffSeconds}s`);
      else setTimeLeft(`${diffDays} day${diffDays === 1 ? "" : "s"}`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchClassReadingLeague();
  }, [period]);

  const fetchClassReadingLeague = async () => {
    setLeagueLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_class_league_v2", { p_period: period });
      if (error) throw error;
      const sorted = (data || []).map((r: any) => ({
        className: r.student_class,
        totalPoints: Number(r.total_points) || 0,
        studentCount: Number(r.student_count) || 0,
        avgPoints: Math.round(Number(r.avg_points) || 0),
      }));
      let rank = 1;
      setLeagueEntries(sorted.map((entry, idx) => {
        if (idx > 0 && entry.totalPoints !== sorted[idx - 1].totalPoints) rank = idx + 1;
        return { ...entry, rank };
      }));
    } catch (error) {
      console.error("Error fetching class reading league:", error);
      setLeagueEntries([]);
    } finally {
      setLeagueLoading(false);
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

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Trophy className="h-5 w-5 text-warning" />
                Rankings &amp; Leaderboards
              </CardTitle>
              <CardDescription>See how you rank among your classmates and school</CardDescription>
            </div>
            <div className="inline-flex rounded-lg border border-border/60 bg-muted/40 p-1">
              {(["monthly", "lifetime"] as Period[]).map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={period === p ? "default" : "ghost"}
                  className="h-7 px-3 text-xs capitalize"
                  onClick={() => setPeriod(p)}
                >
                  {p}
                </Button>
              ))}
            </div>
          </div>
          {period === "monthly" && (
            <Badge variant="outline" className={`mt-2 w-fit text-xs font-semibold border-primary/30 ${timeLeft.includes("s") ? "text-destructive animate-pulse" : "text-primary"}`}>
              Resets in {timeLeft}
            </Badge>
          )}
        </CardHeader>
      </Card>

      <Tabs defaultValue="class" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="class" className="flex items-center gap-2 text-xs sm:text-sm">
            <Users className="h-4 w-4" /><span>Class</span>
          </TabsTrigger>
          <TabsTrigger value="school" className="flex items-center gap-2 text-xs sm:text-sm">
            <Trophy className="h-4 w-4" /><span>School</span>
          </TabsTrigger>
          <TabsTrigger value="league" className="flex items-center gap-2 text-xs sm:text-sm">
            <Shield className="h-4 w-4" /><span>Leagues</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="class">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Class {user?.student_class} Leaderboard</CardTitle>
              <CardDescription className="text-xs">
                {period === "monthly" ? "Points earned this calendar month" : "All-time points"} within your class
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SchoolLeaderboard
                currentUserId={user?.id}
                onEntryClick={openProfile}
                period={period}
                classFilter={user?.student_class || null}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="school">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">School-wide Leaderboard</CardTitle>
              <CardDescription className="text-xs">
                {period === "monthly" ? "Points earned this calendar month" : "All-time points"} across all students
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SchoolLeaderboard currentUserId={user?.id} onEntryClick={openProfile} period={period} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="league">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Class Reading Leagues</CardTitle>
              <CardDescription className="text-xs">Which class reads the most? Aggregated {period} points per class.</CardDescription>
            </CardHeader>
            <CardContent>
              {leagueLoading ? (
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-muted rounded-lg" />)}
                </div>
              ) : leagueEntries.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">No class league data available.</p>
              ) : (
                <div className="rounded-xl border border-border/50 overflow-hidden divide-y divide-border/30">
                  {leagueEntries.map((entry) => (
                    <div
                      key={entry.className}
                      className={`flex items-center gap-3 px-4 py-3 transition-all hover:bg-muted/30 ${
                        entry.className === user?.student_class ? "bg-primary/5 border-l-2 border-l-primary" : ""
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
                        <p className="text-xs text-muted-foreground">
                          {entry.studentCount} reader{entry.studentCount === 1 ? "" : "s"} · avg {entry.avgPoints.toLocaleString()} pts
                        </p>
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
