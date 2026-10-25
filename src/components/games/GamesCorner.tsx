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
import { Progress } from "@/components/ui/progress";
import {
  Gamepad2, Layers, Grid3x3, Shuffle, Puzzle, Spade, Grid2x2, Trophy, Zap, Play, Sparkles, Users, Brain, Map as MapIcon, FlaskConical, Code2, Leaf, Flame, Star, LockKeyhole, Moon, Clock3, Flag,
} from "lucide-react";
import { GameDef, GameBook, GameContentItem, ArcadeQuestion } from "./gameTypes";
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
import NewArcadeGame from "./NewArcadeGames";
import ArcadeSocial from "./ArcadeSocial";
import ArcadeMiniGame from "./ArcadeMiniGames";
import LiveArcadeBoard from "./LiveArcadeBoard";

const GAME_CONTENT_CACHE_MS = 5 * 60 * 1000;
const SERVER_ARCADE_KEYS = new Set(["logic-grid", "map-quest", "science-sprint", "code-breakers", "eco-sort"]);
const LIVE_BOARD_KEYS = new Set(["tic-tac-toe", "snakes-ladders", "ludo-dash", "chess"]);
const gameContentCache = new Map<string, { items: GameContentItem[]; cachedAt: number }>();

const ICONS: Record<string, React.ElementType> = {
  Layers, Grid3x3, Shuffle, PuzzleIcon: Puzzle, Puzzle, Spade, Grid2x2, Gamepad2, Zap, Sparkles, Trophy, Users, Brain, Map: MapIcon, FlaskConical, Code2, Leaf, Flag,
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
  "logic-grid": "from-violet-500 to-indigo-600",
  "map-quest": "from-sky-500 to-cyan-600",
  "science-sprint": "from-emerald-500 to-teal-600",
  "code-breakers": "from-amber-500 to-orange-600",
  "eco-sort": "from-lime-500 to-green-600",
  "ping-pong": "from-fuchsia-500 to-violet-600",
  snake: "from-lime-500 to-emerald-600",
  "tic-tac-toe": "from-violet-500 to-sky-600",
  "snakes-ladders": "from-amber-500 to-rose-500",
  "ludo-dash": "from-rose-500 to-indigo-600",
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
  { id: "character-clash", key: "character-clash", name: "Character Pair-Up", description: "Connect legendary literary characters with their partners, sidekicks, and rivals.", icon_name: "Users", category: "memory", is_enabled: true, points_per_win: 10, max_points_per_day: 40, daily_play_limit: 5, sort_order: 24 },
  { id: "logic-grid", key: "logic-grid", name: "Logic Grid", description: "Crack clues and solve increasingly tricky logic puzzles.", icon_name: "Brain", category: "logic", is_enabled: true, points_per_win: 15, max_points_per_day: 45, daily_play_limit: 3, sort_order: 25 },
  { id: "map-quest", key: "map-quest", name: "Map Quest", description: "Explore geography, maps, landmarks and our planet.", icon_name: "Map", category: "geography", is_enabled: true, points_per_win: 12, max_points_per_day: 48, daily_play_limit: 4, sort_order: 26 },
  { id: "science-sprint", key: "science-sprint", name: "Science Sprint", description: "Race through quick science rounds and build your streak.", icon_name: "FlaskConical", category: "science", is_enabled: true, points_per_win: 12, max_points_per_day: 48, daily_play_limit: 4, sort_order: 27 },
  { id: "code-breakers", key: "code-breakers", name: "Code Breakers", description: "Solve patterns, logic and beginner coding challenges.", icon_name: "Code2", category: "coding", is_enabled: true, points_per_win: 15, max_points_per_day: 45, daily_play_limit: 3, sort_order: 28 },
  { id: "eco-sort", key: "eco-sort", name: "Eco Sort", description: "Make planet-friendly choices in a fast five-round challenge.", icon_name: "Leaf", category: "environment", is_enabled: true, points_per_win: 12, max_points_per_day: 48, daily_play_limit: 4, sort_order: 29 },
  { id: "ping-pong", key: "ping-pong", name: "Ping Pong", description: "Rally against the arcade bot and race to five points.", icon_name: "Gamepad2", category: "arcade", is_enabled: true, points_per_win: 15, max_points_per_day: 45, daily_play_limit: 3, sort_order: 30 },
  { id: "snake", key: "snake", name: "Snake", description: "Guide your growing snake, collect fruit and beat your best run.", icon_name: "Gamepad2", category: "arcade", is_enabled: true, points_per_win: 12, max_points_per_day: 48, daily_play_limit: 4, sort_order: 31 },
  { id: "tic-tac-toe", key: "tic-tac-toe", name: "Tic-Tac-Toe", description: "Practice against the computer or challenge a friend live.", icon_name: "Grid3x3", category: "strategy", is_enabled: true, points_per_win: 10, max_points_per_day: 40, daily_play_limit: 4, sort_order: 32 },
  { id: "snakes-ladders", key: "snakes-ladders", name: "Snakes & Ladders", description: "Race up the ladders and dodge the snakes. Play against a friend live.", icon_name: "Grid2x2", category: "strategy", is_enabled: true, points_per_win: 12, max_points_per_day: 48, daily_play_limit: 3, sort_order: 33 },
  { id: "ludo-dash", key: "ludo-dash", name: "Ludo Dash", description: "Race your token home in a quick live Ludo match.", icon_name: "Flag", category: "strategy", is_enabled: true, points_per_win: 15, max_points_per_day: 45, daily_play_limit: 3, sort_order: 34 }
];

export default function GamesCorner({ userId, onPointsEarned }: { userId: string; onPointsEarned?: () => void }) {
  const { toast } = useToast();
  const { count: queueCount } = useQueueStatus();
  const [games, setGames] = useState<GameDef[]>([]);
  const [progressStats, setProgressStats] = useState({ total_xp: 0, today_xp: 0, total_plays: 0, wins: 0, current_streak: 0, level: 1, xp_to_next: 250 });
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [books, setBooks] = useState<GameBook[]>([]);
  const [plays, setPlays] = useState<any[]>([]);
  const [content, setContent] = useState<GameContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingGameContent, setLoadingGameContent] = useState(false);
  const [active, setActive] = useState<GameDef | null>(null);
  const [startedAt, setStartedAt] = useState<number>(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [duelRoomId, setDuelRoomId] = useState<string | null>(null);
  const [arcadeQuestions, setArcadeQuestions] = useState<ArcadeQuestion[]>([]);

  const [scheduleMsg, setScheduleMsg] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

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

      const [{ data: g, error: gamesError }, { data: b }] = await Promise.all([
        supabase.from("games").select("*").order("sort_order"),
        supabase.from("books").select("id, title, author, cover_url, category").limit(60),
      ]);
      if (gamesError) throw gamesError;
      const fetched = (g || []) as GameDef[];
      setGames(fetched.length ? fetched.filter((game) => game.is_enabled) : FALLBACK_GAMES);
      setBooks((b || []) as GameBook[]);
    } catch (e) {
      console.error(e);
      setGames(FALLBACK_GAMES);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPlays = useCallback(async () => {
    const [{ data: p }, { data: progress }] = await Promise.all([
      supabase.from("game_plays").select("id, game_key, played_at, points_earned, is_win, score").eq("user_id", userId).order("played_at", { ascending: false }).limit(100),
      (supabase as any).rpc("get_game_progress"),
    ]);
    setPlays(p || []);
    const row: any = Array.isArray(progress) ? progress[0] : progress;
    if (row) {
      setProgressStats({ total_xp: Number(row.total_xp) || 0, today_xp: Number(row.today_xp) || 0, total_plays: Number(row.total_plays) || 0, wins: Number(row.wins) || 0, current_streak: Number(row.current_streak) || 0, level: Number(row.level) || 1, xp_to_next: Number(row.xp_to_next) || 0 });
      setProgressLoaded(true);
    }
  }, [userId]);

  useEffect(() => {
    loadStatic();
    loadPlays();
  }, [loadStatic, loadPlays]);

  const todayPlays = useMemo(() => {
    const today = new Date().toDateString();
    return plays.filter((p) => new Date(p.played_at).toDateString() === today);
  }, [plays]);

  const totalXp = progressLoaded ? progressStats.total_xp : plays.reduce((a, p) => a + (p.points_earned || 0), 0);
  const todayXp = progressLoaded ? progressStats.today_xp : todayPlays.reduce((a, p) => a + (p.points_earned || 0), 0);
  const playsFor = (key: string) => todayPlays.filter((p) => p.game_key === key).length;
  const unlockedCount = totalXp >= 400 ? games.length : totalXp >= 150 ? Math.min(20, games.length) : Math.min(10, games.length);
  const nextUnlockXp = totalXp >= 400 ? null : totalXp >= 150 ? 400 : 150;
  const xpUntilUnlock = nextUnlockXp === null ? 0 : Math.max(0, nextUnlockXp - totalXp);
  const trailStage = totalXp >= 400 ? 3 : totalXp >= 150 ? 2 : 1;
  const unlockedGames = games.slice(0, unlockedCount);
  const categories = useMemo(() => ["all", ...Array.from(new Set(games.map((g) => g.category)))], [games]);
  const visibleGames = useMemo(() => selectedCategory === "all" ? games : games.filter((game) => game.category === selectedCategory), [games, selectedCategory]);
  const featuredGame = unlockedGames.length ? unlockedGames[(new Date().getUTCDate() + new Date().getUTCMonth()) % unlockedGames.length] : null;

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
    setLoadingGameContent(true);
    if (SERVER_ARCADE_KEYS.has(g.key)) {
      const { data, error } = await (supabase as any).rpc("start_arcade_challenge", { p_game_key: g.key });
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row) {
        toast({ title: "Challenge unavailable", description: error?.message || "Please try again shortly.", variant: "destructive" });
        setActive(null);
        setLoadingGameContent(false);
        return;
      }
      setSessionId(row.session_id);
      setArcadeQuestions(row.questions || []);
      setStartedAt(Date.now());
      setLoadingGameContent(false);
      return;
    }
    const cachedContent = gameContentCache.get(g.key);
    if (cachedContent && Date.now() - cachedContent.cachedAt < GAME_CONTENT_CACHE_MS) {
      setContent(cachedContent.items);
      setLoadingGameContent(false);
    } else {
      const { data, error } = await supabase
        .from("game_content")
        .select("id, game_key, kind, value, hint, extra, is_active")
        .eq("game_key", g.key)
        .eq("is_active", true)
        .limit(200);
      const gameItems = error ? [] : (data || []) as GameContentItem[];
      gameContentCache.set(g.key, { items: gameItems, cachedAt: Date.now() });
      setContent(gameItems);
      setLoadingGameContent(false);
    }
    await startNewSession(g.key);
  };

  const handleComplete = async (win: boolean, score: number, answers?: any) => {
    if (!active) return;
    if (SERVER_ARCADE_KEYS.has(active.key)) {
      const { data, error } = await (supabase as any).rpc("complete_arcade_challenge", { p_session_id: sessionId, p_answers: answers || [] });
      const row: any = Array.isArray(data) ? data[0] : data;
      if (error || !row) {
        toast({ title: "Could not save challenge", description: error?.message || "Please retry the challenge.", variant: "destructive" });
        return { correct_answers: 0, saved: false };
      }
      const points = Number(row.points_awarded) || 0;
      toast({ title: points > 0 ? `+${points} XP earned!` : row.is_win ? "Challenge cleared!" : "Result saved", description: row.message || `You got ${row.correct_answers} answers correct.` });
      if (points > 0) onPointsEarned?.();
      if (duelRoomId && row.play_id) {
        const { error: duelError } = await (supabase as any).rpc("submit_game_duel_play", { p_room_id: duelRoomId, p_play_id: row.play_id });
        if (duelError) toast({ title: "Duel result could not be recorded", description: duelError.message, variant: "destructive" });
      }
      setDuelRoomId(null);
      setSessionId(null);
      loadPlays();
      return row;
    }
    const duration = Math.floor((Date.now() - startedAt) / 1000);
    const clientNonce = `${duelRoomId ? `arcade:${duelRoomId}:` : `${active.key}-`}${startedAt}-${Math.random().toString(36).slice(2, 10)}`;
    const payload = {
      p_game_key: active.key,
      p_score: Math.round(score),
      p_is_win: win,
      p_duration_seconds: duration,
      p_session_id: sessionId,
      p_client_nonce: clientNonce,
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
      if (duelRoomId) {
        const { data: play } = await supabase.from("game_plays").select("id").eq("user_id", userId).eq("client_nonce", clientNonce).maybeSingle();
        if (play?.id) {
          const { error } = await (supabase as any).rpc("submit_game_duel_play", { p_room_id: duelRoomId, p_play_id: play.id });
          if (error) toast({ title: "Duel result could not be recorded", description: error.message, variant: "destructive" });
        }
        setDuelRoomId(null);
      }
    } else {
      toast({ title: "Score saved (offline)", description: "Your play was queued and will sync when online." });
    }
    loadPlays();
    // Pre-initialize fresh session for subsequent rounds / Play Again
    void startNewSession(active.key);
  };


  const startDuel = (gameKey: string, roomId: string) => {
    const game = games.find((candidate) => candidate.key === gameKey);
    if (!game) return;
    setDuelRoomId(roomId);
    if (LIVE_BOARD_KEYS.has(gameKey)) {
      setActive(game);
      setLoadingGameContent(false);
      setSessionId(null);
      setArcadeQuestions([]);
      return;
    }
    void openGame(game);
  };

  const renderGame = () => {
    if (!active) return null;
    if (loadingGameContent) return <Skeleton className="h-64 w-full rounded-xl" />;
    const props = {
      books,
      content: content.filter((c) => c.game_key === active.key),
      arcadeQuestions,
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
      case "ping-pong":
      case "snake": return <ArcadeMiniGame {...props} gameKey={active.key} />;
      case "tic-tac-toe":
      case "snakes-ladders":
      case "ludo-dash":
      case "chess": return duelRoomId ? <LiveArcadeBoard gameKey={active.key} roomId={duelRoomId} userId={userId} onExit={() => setActive(null)} /> : <Card className="mx-auto max-w-md"><CardContent className="space-y-3 p-6 text-center"><div className="text-4xl" aria-hidden="true">♟</div><h3 className="text-lg font-bold">Play live chess</h3><p className="text-sm text-muted-foreground">Choose Chess in the Head-to-head panel, then invite an online friend or join their room.</p><Button onClick={props.onExit}>Back to Games Corner</Button></CardContent></Card>;
      case "logic-grid":
      case "map-quest":
      case "science-sprint":
      case "code-breakers":
      case "eco-sort": return <NewArcadeGame {...props} gameKey={active.key} />;
      default: return <p className="text-sm text-muted-foreground">This game is coming soon.</p>;
    }
  };

  if (!loading && scheduleMsg) {
    return (
      <div className="relative isolate flex min-h-[60vh] items-center justify-center overflow-hidden rounded-3xl border border-indigo-200/70 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 px-5 py-12 text-center text-white shadow-xl sm:min-h-[66vh] sm:px-10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <span className="absolute left-[12%] top-[18%] h-1 w-1 rounded-full bg-white/80 shadow-[0_0_12px_3px_rgba(255,255,255,0.4)]" />
          <span className="absolute right-[18%] top-[28%] h-1.5 w-1.5 rounded-full bg-sky-200 shadow-[0_0_14px_4px_rgba(186,230,253,0.35)]" />
          <span className="absolute bottom-[24%] left-[24%] h-1 w-1 rounded-full bg-violet-200 shadow-[0_0_12px_3px_rgba(221,214,254,0.35)]" />
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
          <div className="absolute -bottom-24 -left-12 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-xl space-y-6">
          <div className="relative mx-auto grid h-24 w-24 place-items-center rounded-[2rem] border border-white/15 bg-white/[0.07] shadow-[0_0_60px_rgba(129,140,248,0.2)]">
            <Moon className="h-11 w-11 fill-indigo-200/20 text-indigo-100" strokeWidth={1.5} />
            <span className="absolute -right-2 top-1 grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-slate-900 text-amber-200"><Sparkles className="h-4 w-4" /></span>
          </div>
          <div className="space-y-2">
            <Badge className="border-indigo-200/20 bg-indigo-300/10 text-indigo-100 hover:bg-indigo-300/10"><Moon className="mr-1.5 h-3 w-3" /> ARCADE REST TIME</Badge>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">The games are sleeping</h2>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-indigo-100/75">The arcade is taking a little break. Your game trail and next challenges will be ready when it opens again.</p>
          </div>
          <div className="mx-auto flex w-fit max-w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-left backdrop-blur-sm">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-300/10 text-indigo-100"><Clock3 className="h-5 w-5" /></span>
            <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-200/65">Come play again</p><p className="text-sm font-semibold text-white">{scheduleMsg.replace("Games are sleeping. ", "")}</p></div>
          </div>
          <p className="text-xs text-indigo-100/50">Until then, take a breather and come back ready for a new high score.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-5 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-8 -top-12 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="space-y-3"><Badge className="border-white/20 bg-white/15 text-white hover:bg-white/20"><Sparkles className="mr-1 h-3 w-3" /> YOUR ARCADE</Badge><h2 className="text-3xl font-black tracking-tight sm:text-4xl">Play. Explore. Unlock.</h2><p className="max-w-lg text-sm text-white/80">Fresh challenges, clever games and new personal bests are waiting for you.</p><div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-white/15 px-3 py-1.5">{unlockedCount} of {games.length} games open</span><span className="rounded-full bg-white/15 px-3 py-1.5">Daily XP limit: 1,000</span>{queueCount > 0 && <span className="rounded-full bg-white/15 px-3 py-1.5">{queueCount} plays syncing</span>}</div></div>
          {featuredGame && <div className="w-full rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm sm:max-w-xs"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-white/75">Daily spotlight</span><Flame className="h-4 w-4 text-amber-200" /></div><h3 className="text-lg font-bold">{featuredGame.name}</h3><p className="mt-1 line-clamp-2 text-xs text-white/75">{featuredGame.description}</p><Button size="sm" className="mt-4 w-full bg-white text-violet-700 hover:bg-white/90" onClick={() => openGame(featuredGame)}><Play className="mr-1 h-4 w-4" /> Play today's spotlight</Button></div>}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total game XP", value: totalXp, icon: Zap },
          { label: `XP today · ${Math.max(1000 - todayXp, 0)} left`, value: todayXp, icon: Sparkles },
          { label: "Trail stage", value: `${trailStage} of 3`, icon: Star },
          { label: "Current streak", value: `${progressStats.current_streak} days`, icon: Flame },
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

      <Card className="overflow-hidden rounded-2xl border-primary/15 bg-gradient-to-r from-primary/5 to-amber-500/5">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5">
          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-primary text-primary-foreground"><span className="text-[9px] font-bold uppercase">Trail</span><span className="text-lg font-black">{trailStage}</span></div>
          <div className="min-w-0 flex-1"><div className="mb-1 flex items-center justify-between gap-2 text-xs"><span className="font-semibold">Your game trail</span><span className="text-muted-foreground">{unlockedCount} games open · {games.length - unlockedCount} ahead</span></div><Progress value={nextUnlockXp === null ? 100 : Math.min(100, (totalXp / nextUnlockXp) * 100)} aria-label="Progress toward the next game unlock" /><p className="mt-1 text-[11px] text-muted-foreground">{nextUnlockXp === null ? "Every game is unlocked. Choose any challenge!" : `${xpUntilUnlock} XP until ${unlockedCount + 1} more games open.`} Earn XP in any open game to explore further.</p></div>
          <div className="flex flex-wrap gap-1.5">{progressStats.total_plays >= 1 && <Badge variant="secondary"><Trophy className="mr-1 h-3 w-3" />First clear</Badge>}{progressStats.wins >= 5 && <Badge variant="secondary"><Star className="mr-1 h-3 w-3" />Five wins</Badge>}{progressStats.current_streak >= 3 && <Badge variant="secondary"><Flame className="mr-1 h-3 w-3" />3-day streak</Badge>}{totalXp >= 1000 && <Badge className="bg-gradient-to-r from-amber-500 to-fuchsia-500 text-white"><Sparkles className="mr-1 h-3 w-3" />Arcade glow</Badge>}</div>
        </CardContent>
      </Card>

      <ArcadeSocial userId={userId} games={games} onStartDuel={startDuel} />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : games.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">
          {scheduleMsg || "No games are switched on right now. Please check back later."}
        </Card>
      ) : (
        <div className="space-y-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter games by category">
          {categories.map((category) => <Button key={category} size="sm" variant={selectedCategory === category ? "default" : "outline"} className="rounded-full capitalize" onClick={() => setSelectedCategory(category)}>{category === "all" ? "All games" : category.replace(/-/g, " ")}</Button>)}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleGames.map((g) => {
            const Icon = ICONS[g.icon_name] || Gamepad2;
            const used = playsFor(g.key);
            const gameIndex = games.findIndex((game) => game.id === g.id);
            const unlocked = gameIndex < unlockedCount;
            const limitHit = g.daily_play_limit > 0 && used >= g.daily_play_limit;
            return (
              <Card key={g.id} className={`group overflow-hidden rounded-2xl border-border/60 transition-all ${unlocked ? "hover:-translate-y-0.5 hover:shadow-lg" : "opacity-75"}`}>
                <div className={`h-1.5 bg-gradient-to-r ${ACCENTS[g.key] || "from-primary to-accent"}`} />
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${ACCENTS[g.key] || "from-primary to-accent"} text-primary-foreground`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant={unlocked ? "secondary" : "outline"} className="text-[10px] capitalize">{unlocked ? <><Star className="mr-1 h-3 w-3" />{g.category}</> : <><LockKeyhole className="mr-1 h-3 w-3" />{gameIndex < 20 ? "Trail 2" : "Trail 3"}</>}</Badge>
                  </div>
                  <div>
                    <h3 className="font-semibold">{g.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{g.description}</p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">Up to {g.points_per_win} XP</Badge>
                    {g.daily_play_limit > 0 && (
                      <span>{Math.max(g.daily_play_limit - used, 0)} plays left today</span>
                    )}
                  </div>
                  <Button className="w-full" size="sm" variant={limitHit || !unlocked ? "outline" : "default"} onClick={() => openGame(g)} disabled={limitHit || !unlocked}>
                    {!unlocked ? <><LockKeyhole className="mr-1 h-4 w-4" />Unlock with {gameIndex < 20 ? 150 : 400} XP</> : limitHit ? "Come back tomorrow!" : <><Play className="mr-1 h-4 w-4" />Play now</>}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div></div>
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
