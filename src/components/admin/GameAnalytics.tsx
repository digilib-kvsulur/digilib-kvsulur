import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Gamepad2, Trophy, Zap, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Users } from "lucide-react";

export default function GameAnalytics() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [arcadeStats, setArcadeStats] = useState({ arcade_rounds: 0, completed_challenges: 0, participating_students: 0, verified_answers: 0, xp_awarded: 0 });

  useEffect(() => {
    const fetchAnalytics = async () => {
      const [{ data: plays }, { data: arcadeData }] = await Promise.all([
        supabase.rpc('get_game_analytics'),
        (supabase as any).rpc('get_arcade_analytics'),
      ]);
      const arcade = Array.isArray(arcadeData) ? arcadeData[0] : arcadeData;
      if (arcade) setArcadeStats({ arcade_rounds: Number(arcade.arcade_rounds) || 0, completed_challenges: Number(arcade.completed_challenges) || 0, participating_students: Number(arcade.participating_students) || 0, verified_answers: Number(arcade.verified_answers) || 0, xp_awarded: Number(arcade.xp_awarded) || 0 });

      if (!plays || plays.length === 0) {
        setLoading(false);
        return;
      }

      const totalPlays = plays.reduce((acc: number, p: any) => acc + (Number(p.plays) || 0), 0);
      const totalXP = plays.reduce((acc: number, p: any) => acc + (Number(p.xp_awarded) || 0), 0);
      const totalWins = plays.reduce((acc: number, p: any) => acc + (Number(p.wins) || 0), 0);
      const totalTime = plays.reduce((acc: number, p: any) => acc + (Number(p.total_time) || 0), 0);
      
      const chartData = plays.map((p: any) => ({
        name: p.game_key.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        plays: Number(p.plays) || 0,
        winRate: (Number(p.plays) > 0) ? Math.round((Number(p.wins) / Number(p.plays)) * 100) : 0
      })).sort((a: any, b: any) => b.plays - a.plays).slice(0, 10);

      setStats({ totalPlays, totalXP, totalWins, totalTime, chartData });
      setLoading(false);
    };
    fetchAnalytics();
  }, []);

  if (loading) return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
    </div>
  );

  return (
    <div className="space-y-6 mt-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Gamepad2 className="h-4 w-4 text-primary" /> Total Plays</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{stats?.totalPlays.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" /> XP Awarded</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{stats?.totalXP.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Trophy className="h-4 w-4 text-emerald-500" /> Global Win Rate</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{stats?.totalPlays ? Math.round((stats?.totalWins / stats?.totalPlays) * 100) : 0}%</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4 text-blue-500" /> Time Played</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{(stats?.totalTime / 3600).toFixed(1)} hrs</p></CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Games by Plays</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" fontSize={12} tickLine={false} axisLine={false} width={120} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="plays" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Win Rate by Game</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <XAxis type="number" domain={[0, 100]} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" fontSize={12} tickLine={false} axisLine={false} width={120} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value: number) => [`${value}%`, 'Win Rate']} />
                <Bar dataKey="winRate" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="mb-3 flex items-center gap-2 text-base font-semibold"><Target className="h-4 w-4 text-primary" /> New Arcade Rounds</h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric icon={Gamepad2} label="Rounds answered" value={arcadeStats.arcade_rounds.toLocaleString()} />
          <Metric icon={Trophy} label="Challenges cleared" value={arcadeStats.completed_challenges.toLocaleString()} />
          <Metric icon={Users} label="Students playing" value={arcadeStats.participating_students.toLocaleString()} />
          <Metric icon={Zap} label="Verified answers · XP" value={`${arcadeStats.verified_answers.toLocaleString()} · ${arcadeStats.xp_awarded.toLocaleString()}`} />
        </div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Gamepad2; label: string; value: string }) {
  return <Card><CardContent className="p-4"><p className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4 text-primary" />{label}</p><p className="mt-2 text-xl font-bold">{value}</p></CardContent></Card>;
}
