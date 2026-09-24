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
  Gamepad2, Layers, Grid3x3, Shuffle, Puzzle, Spade, Grid2x2, Trophy, Zap, Play, Sparkles, Users,
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
import EmojiBookRiddle from "./EmojiBookRiddle";
import QuoteGuesser from "./QuoteGuesser";
import GenreDetective from "./GenreDetective";
import SpineStacker from "./SpineStacker";
import Book2048 from "./Book2048";
import StorySequence from "./StorySequence";
import CharacterPairUp from "./CharacterPairUp";

const ICONS: Record<string, React.ElementType> = {
  Layers, Grid3x3, Shuffle, PuzzleIcon: Puzzle, Puzzle, Spade, Grid2x2, Gamepad2, Zap, Sparkles, Trophy, Users,
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
  "emoji-book-riddle": "from-amber-500 to-pink-500",
  "quote-guesser": "from-indigo-500 to-sky-500",
  "genre-detective": "from-teal-500 to-cyan-600",
  "spine-stacker": "from-orange-500 to-amber-600",
  "book-2048": "from-emerald-500 to-teal-600",
  "story-sequence": "from-purple-500 to-indigo-600",
  "character-clash": "from-rose-500 to-red-600",
};

const FALLBACK_GAMES: GameDef[] = [
  { id: "book-match", key: "book-match", name: "Book Match", description: "Flip cards and match book titles with their authors.", icon_name: "Layers", category: "memory", is_enabled: true, points_per_win: 10, max_points_per_day: 40, daily_play_limit: 5, sort_order: 1 },
  { id: "library-bingo", key: "library-bingo", name: "Library Bingo", description: "Complete a row of library reading tasks to win.", icon_name: "Grid3x3", category: "bingo", is_enabled: true, points_per_win: 15, max_points_per_day: 30, daily_play_limit: 3, sort_order: 2 },
  { id: "word-scramble", key: "word-scramble", name: "Word Scramble", description: "Unscramble book titles and literary words against the clock.", icon_name: "Shuffle", category: "word", is_enabled: true, points_per_win: 8, max_points_per_day: 40, daily_play_limit: 6, sort_order: 3 },
  { id: "sliding-puzzle", key: "sliding-puzzle", name: "Jigsaw Slider", description: "Slide the tiles to rebuild a book cover.", icon_name: "PuzzleIcon", category: "puzzle", is_enabled: true, points_per_win: 12, max_points_per_day: 36, daily_play_limit: 4, sort_order: 4 },
  { id: "book-cards", key: "book-cards", name: "Book Card Duel", description: "Guess which book is more popular in the library.", icon_name: "Spade", category: "cards", is_enabled: true, points_per_win: 10, max_points_per_day: 40, daily_play_limit: 5, sort_order: 5 },
  { id: "crossword", key: "crossword", name: "Mini Crossword", description: "Solve a crossword built from library and book clues.", icon_name: "Grid2x2", category: "word", is_enabled: true, points_per_win: 20, max_points_per_day: 40, daily_play_limit: 2, sort_order: 6 },
  { id: "reading-wordle", key: "reading-wordle", name: "Reading Wordle", description: "Guess the 5-letter book-related word in 6 tries.", icon_name: "Sparkles", category: "word", is_enabled: true, points_per_win: 10, max_points_per_day: 40, daily_play_limit: 5, sort_order: 7 },
  { id: "book-hangman", key: "book-hangman", name: "Book Hangman", description: "Guess the letters to solve the secret book title or literary word.", icon_name: "Gamepad2", category: "word", is_enabled: true, points_per_win: 8, max_points_per_day: 40, daily_play_limit: 5, sort_order: 8 },
  { id: "spell-bee", key: "spell-bee", name: "Spell Bee", description: "Listen to or read a hint and spell the library term correctly.", icon_name: "Trophy", category: "word", is_enabled: true, points_per_win: 10, max_points_per_day: 30, daily_play_limit: 3, sort_order: 9 },
  { id: "word-chain", key: "word-chain", name: "Word Chain", description: "Build a chain of words where each starts with the last letter of the previous.", icon_name: "Shuffle", category: "word", is_enabled: true, points_per_win: 10, max_points_per_day: 40, daily_play_limit: 5, sort_order: 10 },
  { id: "word-search", key: "word-search", name: "Word Search", description: "Find hidden library and literary words in the puzzle grid.", icon_name: "Grid3x3", category: "word", is_enabled: true, points_per_win: 12, max_points_per_day: 36, daily_play_limit: 4, sort_order: 11 },
  { id: "speed-typing", key: "speed-typing", name: "Speed Typing", description: "Test your words-per-minute rate by typing literary quotes.", icon_name: "Zap", category: "speed", is_enabled: true, points_per_win: 10, max_points_per_day: 40, daily_play_limit: 5, sort_order: 12 },
  { id: "quick-draw", key: "quick-draw", name: "Quick Draw", description: "Draw and sketch the given book themed prompt before time runs out.", icon_name: "Sparkles", category: "creative", is_enabled: true, points_per_win: 15, max_points_per_day: 30, daily_play_limit: 3, sort_order: 13 },
  { id: "spot-difference", key: "spot-difference", name: "Spot the Difference", description: "Compare book cover images or patterns and find the odd one.", icon_name: "Layers", category: "puzzle", is_enabled: true, points_per_win: 8, max_points_per_day: 40, daily_play_limit: 5, sort_order: 14 },
  { id: "riddle-rounds", key: "riddle-rounds", name: "Riddle Rounds", description: "Solve clever riddles about popular library books and authors.", icon_name: "Gamepad2", category: "puzzle", is_enabled: true, points_per_win: 12, max_points_per_day: 36, daily_play_limit: 4, sort_order: 15 },
  { id: "literary-places", key: "literary-places", name: "Literary Places", description: "Trivia challenge: Guess the book setting, country or location.", icon_name: "Layers", category: "trivia", is_enabled: true, points_per_win: 15, max_points_per_day: 30, daily_play_limit: 3, sort_order: 16 },
  { id: "reaction-test", key: "reaction-test", name: "Reaction Test", description: "Click as fast as you can when the screen changes color.", icon_name: "Zap", category: "reflex", is_enabled: true, points_per_win: 8, max_points_per_day: 40, daily_play_limit: 5, sort_order: 17 },
  { id: "emoji-book-riddle", key: "emoji-book-riddle", name: "Emoji Book Riddle", description: "Decode famous book titles and literary classics from playful emoji sequences.", icon_name: "Sparkles", category: "puzzle", is_enabled: true, points_per_win: 12, max_points_per_day: 36, daily_play_limit: 4, sort_order: 18 },
  { id: "quote-guesser", key: "quote-guesser", name: "Quote Detective", description: "Identify which famous book or legendary author spoke memorable quotes.", icon_name: "Trophy", category: "trivia", is_enabled: true, points_per_win: 15, max_points_per_day: 45, daily_play_limit: 4, sort_order: 19 },
  { id: "genre-detective", key: "genre-detective", name: "Genre Sorting Rush", description: "Rapidly categorize incoming library books into the right shelves and genres.", icon_name: "Layers", category: "speed", is_enabled: true, points_per_win: 12, max_points_per_day: 36, daily_play_limit: 5, sort_order: 20 },
  { id: "spine-stacker", key: "spine-stacker", name: "Book Shelf Stacker", description: "Precision timing arcade game to stack books into a towering library pile.", icon_name: "Gamepad2", category: "reflex", is_enabled: true, points_per_win: 15, max_points_per_day: 45, daily_play_limit: 5, sort_order: 21 },
  { id: "book-2048", key: "book-2048", name: "Reader's 2048", description: "Merge matching literary steps: Letter → Word → Page → Chapter → Masterpiece!", icon_name: "Grid2x2", category: "puzzle", is_enabled: true, points_per_win: 20, max_points_per_day: 40, daily_play_limit: 3, sort_order: 22 },
  { id: "story-sequence", key: "story-sequence", name: "Story Chrono", description: "Rearrange scrambled plot milestones of beloved tales into the correct chronological order.", icon_name: "Shuffle", category: "puzzle", is_enabled: true, points_per_win: 15, max_points_per_day: 30, daily_play_limit: 3, sort_order: 23 },
  { id: "character-clash", key: "character-clash", name: "Character Pair-Up", description: "Connect legendary literary characters with their partners, sidekicks, and rivals.", icon_name: "Users", category: "memory", is_enabled: true, points_per_win: 10, max_points_per_day: 40, daily_play_limit: 5, sort_order: 24 }
];

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
  const [sessionId, setSessionId] = useState<string | null>(null);

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
      const fetched = (g || []) as GameDef[];
      const existingKeys = new Set(fetched.map((x) => x.key));
      const combined = [...fetched];
      for (const dg of FALLBACK_GAMES) {
        if (!existingKeys.has(dg.key)) {
          combined.push(dg);
        }
      }
      combined.sort((a, b) => a.sort_order - b.sort_order);
      setGames(combined);
      setBooks((b || []) as GameBook[]);
      setContent((c || []) as unknown as GameContentItem[]);
    } catch (e) {
      console.error(e);
      setGames(FALLBACK_GAMES);
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

  const startNewSession = async (gameKey: string) => {
    setStartedAt(Date.now());
    setSessionId(null);
    try {
      const { data, error } = await supabase.rpc("start_game_session", { p_game_key: gameKey });
      if (!error) {
        const row: any = Array.isArray(data) ? data[0] : data;
        if (row?.session_id) setSessionId(row.session_id);
      }
    } catch {
      /* offline */
    }
  };

  const openGame = async (g: GameDef) => {
    if (g.daily_play_limit > 0 && playsFor(g.key) >= g.daily_play_limit) {
      toast({
        title: "Daily limit reached",
        description: `You've played ${g.name} ${g.daily_play_limit} time${g.daily_play_limit !== 1 ? "s" : ""} today. Come back tomorrow to earn more XP!`,
      });
      return; // ← block game from opening
    }
    setActive(g);
    await startNewSession(g.key);
  };

  const handleComplete = async (win: boolean, score: number, answers?: any) => {
    if (!active) return;
    const duration = Math.floor((Date.now() - startedAt) / 1000);
    const payload = {
      p_game_key: active.key,
      p_score: Math.round(score),
      p_is_win: win,
      p_duration_seconds: duration,
      p_session_id: sessionId,
      p_client_nonce: `${active.key}-${startedAt}-${Math.random().toString(36).slice(2, 10)}`,
      p_answers: answers ?? null,
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
    // Pre-initialize fresh session for subsequent rounds / Play Again
    void startNewSession(active.key);
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
      case "emoji-book-riddle": return <EmojiBookRiddle {...props} />;
      case "quote-guesser": return <QuoteGuesser {...props} />;
      case "genre-detective": return <GenreDetective {...props} />;
      case "spine-stacker": return <SpineStacker {...props} />;
      case "book-2048": return <Book2048 {...props} />;
      case "story-sequence": return <StorySequence {...props} />;
      case "character-clash": return <CharacterPairUp {...props} />;
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
                  <Button className="w-full" size="sm" variant={limitHit ? "outline" : "default"} onClick={() => openGame(g)} disabled={limitHit}>
                    <Play className="h-4 w-4 mr-1" /> {limitHit ? "Come back tomorrow!" : "Play now"}
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
