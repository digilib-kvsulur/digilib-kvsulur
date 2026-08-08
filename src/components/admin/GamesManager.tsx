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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GameContentManager from "./GameContentManager";
import GameAnalytics from "./GameAnalytics";

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

const DEVELOPED_GAMES = [
  { key: "book-match", name: "Book Match", description: "Flip cards and match book titles with their authors.", icon_name: "Layers", category: "memory", points_per_win: 10, max_points_per_day: 40, daily_play_limit: 5, sort_order: 1 },
  { key: "library-bingo", name: "Library Bingo", description: "Complete a row of library reading tasks to win.", icon_name: "Grid3x3", category: "bingo", points_per_win: 15, max_points_per_day: 30, daily_play_limit: 3, sort_order: 2 },
  { key: "word-scramble", name: "Word Scramble", description: "Unscramble book titles and literary words against the clock.", icon_name: "Shuffle", category: "word", points_per_win: 8, max_points_per_day: 40, daily_play_limit: 6, sort_order: 3 },
  { key: "sliding-puzzle", name: "Jigsaw Slider", description: "Slide the tiles to rebuild a book cover.", icon_name: "PuzzleIcon", category: "puzzle", points_per_win: 12, max_points_per_day: 36, daily_play_limit: 4, sort_order: 4 },
  { key: "book-cards", name: "Book Card Duel", description: "Guess which book is more popular in the library.", icon_name: "Spade", category: "cards", points_per_win: 10, max_points_per_day: 40, daily_play_limit: 5, sort_order: 5 },
  { key: "crossword", name: "Mini Crossword", description: "Solve a crossword built from library and book clues.", icon_name: "Grid2x2", category: "word", points_per_win: 20, max_points_per_day: 40, daily_play_limit: 2, sort_order: 6 },
  { key: "reading-wordle", name: "Reading Wordle", description: "Guess the 5-letter book-related word in 6 tries.", icon_name: "Sparkles", category: "word", points_per_win: 10, max_points_per_day: 40, daily_play_limit: 5, sort_order: 7 },
  { key: "book-hangman", name: "Book Hangman", description: "Guess the letters to solve the secret book title or literary word.", icon_name: "Gamepad2", category: "word", points_per_win: 8, max_points_per_day: 40, daily_play_limit: 5, sort_order: 8 },
  { key: "spell-bee", name: "Spell Bee", description: "Listen to or read a hint and spell the library term correctly.", icon_name: "Trophy", category: "word", points_per_win: 10, max_points_per_day: 30, daily_play_limit: 3, sort_order: 9 },
  { key: "word-chain", name: "Word Chain", description: "Build a chain of words where each starts with the last letter of the previous.", icon_name: "Shuffle", category: "word", points_per_win: 10, max_points_per_day: 40, daily_play_limit: 5, sort_order: 10 },
  { key: "word-search", name: "Word Search", description: "Find hidden library and literary words in the puzzle grid.", icon_name: "Grid3x3", category: "word", points_per_win: 12, max_points_per_day: 36, daily_play_limit: 4, sort_order: 11 },
  { key: "speed-typing", name: "Speed Typing", description: "Test your words-per-minute rate by typing literary quotes.", icon_name: "Zap", category: "speed", points_per_win: 10, max_points_per_day: 40, daily_play_limit: 5, sort_order: 12 },
  { key: "quick-draw", name: "Quick Draw", description: "Draw and sketch the given book themed prompt before time runs out.", icon_name: "Sparkles", category: "creative", points_per_win: 15, max_points_per_day: 30, daily_play_limit: 3, sort_order: 13 },
  { key: "spot-difference", name: "Spot the Difference", description: "Compare book cover images or patterns and find the odd one.", icon_name: "Layers", category: "puzzle", points_per_win: 8, max_points_per_day: 40, daily_play_limit: 5, sort_order: 14 },
  { key: "riddle-rounds", name: "Riddle Rounds", description: "Solve clever riddles about popular library books and authors.", icon_name: "Gamepad2", category: "puzzle", points_per_win: 12, max_points_per_day: 36, daily_play_limit: 4, sort_order: 15 },
  { key: "literary-places", name: "Literary Places", description: "Trivia challenge: Guess the book setting, country or location.", icon_name: "Layers", category: "trivia", points_per_win: 15, max_points_per_day: 30, daily_play_limit: 3, sort_order: 16 },
  { key: "reaction-test", name: "Reaction Test", description: "Click as fast as you can when the screen changes color.", icon_name: "Zap", category: "reflex", points_per_win: 8, max_points_per_day: 40, daily_play_limit: 5, sort_order: 17 }
];

export default function GamesManager() {
  const { toast } = useToast();
  const [games, setGames] = useState<GameRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, { plays: number; xp: number }>>({});
  const [syncing, setSyncing] = useState(false);

  const missingKeys = DEVELOPED_GAMES.filter(
    (dg) => !games.some((g) => g.key === dg.key)
  );

  const syncGames = async () => {
    setSyncing(true);
    const toInsert = missingKeys.map((dg) => ({
      key: dg.key,
      name: dg.name,
      description: dg.description,
      icon_name: dg.icon_name,
      category: dg.category,
      points_per_win: dg.points_per_win,
      max_points_per_day: dg.max_points_per_day,
      daily_play_limit: dg.daily_play_limit,
      sort_order: dg.sort_order,
    }));
    const { error } = await supabase.from("games").insert(toInsert);
    setSyncing(false);
    if (error) {
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Games synced successfully", description: `Added ${toInsert.length} new games to the database.` });
      load();
    }
  };

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

      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Game settings</TabsTrigger>
          <TabsTrigger value="content">Game content</TabsTrigger>
        </TabsList>
        <TabsContent value="analytics">
          <GameAnalytics />
        </TabsContent>
        <TabsContent value="content">
          <GameContentManager games={games.map((g) => ({ key: g.key, name: g.name }))} />
        </TabsContent>
        <TabsContent value="settings" className="space-y-4">
          {missingKeys.length > 0 && (
            <Card className="border-amber-500/50 bg-amber-500/5 dark:bg-amber-500/10">
              <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-amber-600 dark:text-amber-400">Database Sync Needed</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    There are {missingKeys.length} developed games in the codebase that are missing from the database.
                  </p>
                </div>
                <Button onClick={syncGames} disabled={syncing} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white shrink-0">
                  {syncing ? "Syncing..." : `Sync ${missingKeys.length} Games`}
                </Button>
              </CardContent>
            </Card>
          )}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
