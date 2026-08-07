import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Gamepad2, Save, Users } from "lucide-react";

interface GameRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  is_enabled: boolean;
  points_per_win: number;
  max_points_per_day: number;
  daily_play_limit: number;
  sort_order: number;
}

export default function GamesManager() {
  const { toast } = useToast();
  const [games, setGames] = useState<GameRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, { plays: number; xp: number }>>({});

  const load = useCallback(async () => {
    const [{ data }, { data: plays }] = await Promise.all([
      supabase.from("games").select("*").order("sort_order"),
      supabase.from("game_plays").select("game_key, points_earned").limit(5000),
    ]);
    setGames((data || []) as GameRow[]);
    const agg: Record<string, { plays: number; xp: number }> = {};
    (plays || []).forEach((p: any) => {
      agg[p.game_key] = agg[p.game_key] || { plays: 0, xp: 0 };
      agg[p.game_key].plays += 1;
      agg[p.game_key].xp += p.points_earned || 0;
    });
    setStats(agg);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = (id: string, patch: Partial<GameRow>) =>
    setGames((g) => g.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const toggle = async (g: GameRow, value: boolean) => {
    update(g.id, { is_enabled: value });
    const { error } = await supabase.from("games").update({ is_enabled: value }).eq("id", g.id);
    if (error) {
      update(g.id, { is_enabled: !value });
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: value ? `${g.name} enabled` : `${g.name} disabled` });
    }
  };

  const save = async (g: GameRow) => {
    setSavingId(g.id);
    const { error } = await supabase
      .from("games")
      .update({
        name: g.name,
        description: g.description,
        points_per_win: Math.max(0, Number(g.points_per_win) || 0),
        max_points_per_day: Math.max(0, Number(g.max_points_per_day) || 0),
        daily_play_limit: Math.max(0, Number(g.daily_play_limit) || 0),
        sort_order: Number(g.sort_order) || 0,
      })
      .eq("id", g.id);
    setSavingId(null);
    toast({
      title: error ? "Save failed" : "Game settings saved",
      description: error?.message,
      variant: error ? "destructive" : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Gamepad2 className="h-6 w-6 text-primary" /> Games Corner Control
        </h2>
        <p className="text-sm text-muted-foreground">
          Turn games on or off, set XP rewards, daily XP caps and how many times a student can play each day.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {games.map((g) => (
            <Card key={g.id} className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{g.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{g.description}</p>
                  </div>
                  <Switch checked={g.is_enabled} onCheckedChange={(v) => toggle(g, v)} />
                </div>
                <div className="flex gap-2 pt-1">
                  <Badge variant="secondary" className="text-[10px] capitalize">{g.category}</Badge>
                  <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                    <Users className="h-3 w-3" /> {stats[g.key]?.plays || 0} plays · {stats[g.key]?.xp || 0} XP given
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">XP per win</Label>
                    <Input
                      type="number"
                      min={0}
                      value={g.points_per_win}
                      onChange={(e) => update(g.id, { points_per_win: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Max XP/day</Label>
                    <Input
                      type="number"
                      min={0}
                      value={g.max_points_per_day}
                      onChange={(e) => update(g.id, { max_points_per_day: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Plays/day</Label>
                    <Input
                      type="number"
                      min={0}
                      value={g.daily_play_limit}
                      onChange={(e) => update(g.id, { daily_play_limit: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Display name</Label>
                  <Input value={g.name} onChange={(e) => update(g.id, { name: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={g.description || ""}
                    onChange={(e) => update(g.id, { description: e.target.value })}
                  />
                </div>
                <Button size="sm" onClick={() => save(g)} disabled={savingId === g.id} className="w-full">
                  <Save className="h-4 w-4 mr-1" /> {savingId === g.id ? "Saving…" : "Save changes"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Set “Plays/day” or “Max XP/day” to 0 to remove that limit entirely.
      </p>
    </div>
  );
}
