import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import useQueueStatus from "@/hooks/use-queue-status";
import { recordGamePlayLocal } from "@/lib/offline";
import { fetchGamesScheduleSettings } from "@/lib/librarySettings";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Gamepad2, Layers, Grid3x3, Shuffle, Puzzle, Spade, Grid2x2, Trophy, Zap, Play, Sparkles,
} from "lucide-react";
import { GameDef, GameBook, GameContentItem } from "./gameTypes";
import BookMatch from "./BookMatch";
import LibraryBingo from "./LibraryBingo";
import WordScramble from "./WordScramble";
import SlidingPuzzle from "./SlidingPuzzle";
import BookCards from "./BookCards";
import MiniCrossword from "./MiniCrossword";
import ReadingWordle from "./ReadingWordle";
import BookHangman from "./BookHangman";
import SpellBee from "./SpellBee";
import WordChain from "./WordChain";
import WordSearch from "./WordSearch";
import SpeedTyping from "./SpeedTyping";
import QuickDraw from "./QuickDraw";
import SpotDifference from "./SpotDifference";
import RiddleRounds from "./RiddleRounds";
import LiteraryPlaces from "./LiteraryPlaces";
import ReactionTest from "./ReactionTest";

const ICONS: Record<string, React.ElementType> = {
  Layers, Grid3x3, Shuffle, PuzzleIcon: Puzzle, Puzzle, Spade, Grid2x2, Gamepad2, Zap, Sparkles, Trophy,
};

const ACCENTS: Record<string, string> = {
  "book-match": "from-violet-500 to-fuchsia-500",
  "library-bingo": "from-emerald-500 to-teal-500",
  "word-scramble": "from-amber-500 to-orange-500",
  "sliding-puzzle": "from-sky-500 to-blue-600",
  "book-cards": "from-rose-500 to-pink-600",
  crossword: "from-indigo-500 to-purple-600",
  "reading-wordle": "from-emerald-500 to-lime-500",
  "book-hangman": "from-slate-500 to-slate-700",
  "spell-bee": "from-yellow-500 to-amber-600",
  "word-chain": "from-cyan-500 to-sky-600",
  "word-search": "from-teal-500 to-emerald-600",
  "speed-typing": "from-orange-500 to-red-500",
  "quick-draw": "from-pink-500 to-rose-500",
  "spot-difference": "from-purple-500 to-violet-600",
  "riddle-rounds": "from-indigo-500 to-blue-600",
  "literary-places": "from-lime-500 to-green-600",
  "reaction-test": "from-red-500 to-orange-600",
};

export default function GamesCorner({ userId, onPointsEarned }: { userId: string; onPointsEarned?: () => void }) {
  const { toast } = useToast();
  const { count: queueCount } = useQueueStatus();
  const [games, setGames] = useState<GameDef[]>([]);
  const [books, setBooks] = useState<GameBook[]>([]);
  const [plays, setPlays] = useState<any[]>([]);
  const [content, setContent] = useState<GameContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<GameDef | null>(null);
  const [startedAt, setStartedAt] = useState<number>(0);
  const [scheduleMsg, setScheduleMsg] = useState("");

  const loadStatic = useCallback(async () => {
    try {
      const sch = await fetchGamesScheduleSettings();
      if (sch.enable) {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        const [startH, startM] = sch.start.split(":").map(Number);
        const startTime = (startH || 0) * 60 + (startM || 0);
        
        const [endH, endM] = sch.end.split(":").map(Number);
        const endTime = (endH || 0) * 60 + (endM || 0);
        
        if (currentTime < startTime || currentTime > endTime) {
          setScheduleMsg(`Games are sleeping. Come back between ${sch.start} and ${sch.end}!`);
          setLoading(false);
          return;
        }
      }

      const [{ data: g }, { data: b }, { data: c }] = await Promise.all([
        supabase.from("games").select("*").eq("is_enabled", true).order("sort_order"),
        supabase.from("books").select("id, title, author, cover_url, category").limit(120),
        supabase.from("game_content").select("*").eq("is_active", true).limit(2000),
      ]);
      setGames((g || []) as GameDef[]);
      setBooks((b || []) as GameBook[]);
      setContent((c || []) as unknown as GameContentItem[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPlays = useCallback(async () => {
    const { data: p } = await supabase
      .from("game_plays")
      .select("*")
      .eq("user_id", userId)
      .order("played_at", { ascending: false })
      .limit(100);
    setPlays(p || []);
  }, [userId]);

  useEffect(() => {
    loadStatic();
    loadPlays();
  }, [loadStatic, loadPlays]);

  const todayPlays = useMemo(() => {
    const today = new Date().toDateString();
    return plays.filter((p) => new Date(p.played_at).toDateString() === today);
  }, [plays]);

  const totalXp = plays.reduce((a, p) => a + (p.points_earned || 0), 0);
  const todayXp = todayPlays.reduce((a, p) => a + (p.points_earned || 0), 0);
  const playsFor = (key: string) => todayPlays.filter((p) => p.game_key === key).length;

  const openGame = (g: GameDef) => {
    if (g.daily_play_limit > 0 && playsFor(g.key) >= g.daily_play_limit) {
      toast({
        title: "Daily limit reached",
        description: `Come back tomorrow to play ${g.name} for XP again.`,
      });
    }
    setStartedAt(Date.now());
    setActive(g);
  };

  const handleComplete = async (win: boolean, score: number) => {
    if (!active) return;
    const duration = Math.floor((Date.now() - startedAt) / 1000);
    const payload = {
      p_game_key: active.key,
      p_score: Math.round(score),
      p_is_win: win,
      p_duration_seconds: duration,
    };
    const res = await recordGamePlayLocal(payload);
    if (res.success) {
      const row: any = Array.isArray(res.data) ? res.data[0] : res.data;
      const pts = Number(row?.points_awarded) || 0;
      toast({
        title: pts > 0 ? `+${pts} XP earned!` : win ? "Well played!" : "Score saved",
        description: pts > 0 ? row?.message : row?.message || "Keep playing to earn more XP.",
      });
      if (pts > 0) onPointsEarned?.();
    } else {
      toast({ title: "Score saved (offline)", description: "Your play was queued and will sync when online." });
    }
    loadPlays();
  };

  const renderGame = () => {
    if (!active) return null;
    const props = {
      books,
      content: content.filter((c) => c.game_key === active.key),
      onComplete: handleComplete,
      onExit: () => setActive(null),
    };
    switch (active.key) {
      case "book-match": return <BookMatch {...props} />;
      case "library-bingo": return <LibraryBingo {...props} />;
      case "word-scramble": return <WordScramble {...props} />;
      case "sliding-puzzle": return <SlidingPuzzle {...props} />;
      case "book-cards": return <BookCards {...props} />;
      case "crossword": return <MiniCrossword {...props} />;
      case "reading-wordle": return <ReadingWordle {...props} />;
      case "book-hangman": return <BookHangman {...props} />;
      case "spell-bee": return <SpellBee {...props} />;
      case "word-chain": return <WordChain {...props} />;
      case "word-search": return <WordSearch {...props} />;
      case "speed-typing": return <SpeedTyping {...props} />;
      case "quick-draw": return <QuickDraw {...props} />;
      case "spot-difference": return <SpotDifference {...props} />;
      case "riddle-rounds": return <RiddleRounds {...props} />;
      case "literary-places": return <LiteraryPlaces {...props} />;
      case "reaction-test": return <ReactionTest {...props} />;
      default: return <p className="text-sm text-muted-foreground">This game is coming soon.</p>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Gamepad2 className="h-6 w-6 text-primary" /> Games Corner {queueCount > 0 && (<span className="ml-2 text-sm text-muted-foreground">· Queued: {queueCount}</span>)}
        </h2>
        <p className="text-sm text-muted-foreground">
          Book-based puzzles, word games and challenges. Win rounds to earn XP for your rank.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "XP from games", value: totalXp, icon: Zap },
          { label: "XP today", value: todayXp, icon: Sparkles },
          { label: "Games played", value: plays.length, icon: Play },
          { label: "Wins", value: plays.filter((p) => p.is_win).length, icon: Trophy },
        ].map((s) => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <s.icon className="h-3.5 w-3.5" /> {s.label}
              </p>
              <p className="text-xl font-bold mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : games.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">
          {scheduleMsg || "No games are switched on right now. Please check back later."}
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((g) => {
            const Icon = ICONS[g.icon_name] || Gamepad2;
            const used = playsFor(g.key);
            const limitHit = g.daily_play_limit > 0 && used >= g.daily_play_limit;
            return (
              <Card key={g.id} className="overflow-hidden border-border/50 hover:shadow-lg transition-shadow group">
                <div className={`h-1.5 bg-gradient-to-r ${ACCENTS[g.key] || "from-primary to-accent"}`} />
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${ACCENTS[g.key] || "from-primary to-accent"} text-primary-foreground`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary" className="text-[10px] capitalize">{g.category}</Badge>
                  </div>
                  <div>
                    <h3 className="font-semibold">{g.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{g.description}</p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">+{g.points_per_win} XP / win</Badge>
                    {g.daily_play_limit > 0 && (
                      <span>{Math.max(g.daily_play_limit - used, 0)} plays left today</span>
                    )}
                  </div>
                  <Button className="w-full" size="sm" variant={limitHit ? "outline" : "default"} onClick={() => openGame(g)}>
                    <Play className="h-4 w-4 mr-1" /> {limitHit ? "Play for fun" : "Play now"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {plays.length > 0 && (
        <Card className="border-border/50">
          <CardContent className="p-5">
            <h3 className="font-semibold mb-3 text-sm">Recent plays</h3>
            <div className="space-y-2">
              {plays.slice(0, 6).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm border-b border-border/40 pb-2 last:border-0">
                  <span className="capitalize">{p.game_key.replace(/-/g, " ")}</span>
                  <span className="text-muted-foreground text-xs">
                    Score {p.score} · {p.points_earned > 0 ? `+${p.points_earned} XP` : "No XP"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5 text-primary" /> {active?.name}
            </DialogTitle>
          </DialogHeader>
          {renderGame()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
