import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { GameProps, shuffle } from "./gameTypes";
import { RotateCcw, Trophy, Lightbulb, Sparkles, Check, HelpCircle } from "lucide-react";

interface EmojiPuzzle {
  emojis: string;
  title: string;
  category: string;
  hint: string;
}

const FALLBACK_PUZZLES: EmojiPuzzle[] = [
  { emojis: "🧙‍♂️ ⚡ 👓 🚂", title: "HARRY POTTER", category: "Fantasy", hint: "The Boy Who Lived at Hogwarts" },
  { emojis: "🦁 👑 🌅 🐗", title: "THE LION KING", category: "Classic", hint: "Circle of life on the Pride Lands" },
  { emojis: "🌊 ⛵ 🐋 ⚓", title: "MOBY DICK", category: "Adventure", hint: "Captain Ahab and the white whale" },
  { emojis: "⏳ 🕰️ 🚀 👨‍🔬", title: "THE TIME MACHINE", category: "Sci-Fi", hint: "H.G. Wells journey to the future" },
  { emojis: "🍫 🎫 🏭 🎩", title: "CHARLIE AND THE CHOCOLATE FACTORY", category: "Children's", hint: "Willy Wonka's golden ticket" },
  { emojis: "🐛 🍎 🍐 🦋", title: "THE VERY HUNGRY CATERPILLAR", category: "Picture Book", hint: "A tiny insect eats its way through fruit" },
  { emojis: "💍 🌋 🧝‍♂️ 🧙‍♂️", title: "THE LORD OF THE RINGS", category: "Epic Fantasy", hint: "One ring to rule them all in Mordor" },
  { emojis: "👧 🐇 🕳️ 🃏", title: "ALICE IN WONDERLAND", category: "Fantasy", hint: "Down the rabbit hole to meet the Queen of Hearts" },
  { emojis: "🌹 🥀 🐺 🏰", title: "BEAUTY AND THE BEAST", category: "Fairy Tale", hint: "Tale as old as time in an enchanted castle" },
  { emojis: "🏝️ 🏴‍☠️ 🗺️ 🦜", title: "TREASURE ISLAND", category: "Adventure", hint: "Long John Silver and buried gold" },
  { emojis: "🐖 🚜 🐑 🐴", title: "ANIMAL FARM", category: "Allegory", hint: "George Orwell's barnyard revolution" },
  { emojis: "🏹 🌲 👑 💰", title: "ROBIN HOOD", category: "Folklore", hint: "Stealing from the rich to give to the poor" },
  { emojis: "🐅 👦 🐻 🐺", title: "THE JUNGLE BOOK", category: "Classic", hint: "Mowgli raised by wolves in the forest" },
  { emojis: "🧞‍♂️ 🪔 🐒 🕌", title: "ALADDIN", category: "Folklore", hint: "A magic lamp and three wishes" },
  { emojis: "❄️ 👑 👭 ⛄", title: "THE SNOW QUEEN", category: "Fairy Tale", hint: "Hans Christian Andersen tale that inspired Frozen" },
  { emojis: "🔍 🎻 🕵️‍♂️ 🇬🇧", title: "SHERLOCK HOLMES", category: "Mystery", hint: "Baker Street detective and Dr. Watson" },
  { emojis: "🦖 🏝️ 🧬 🚙", title: "JURASSIC PARK", category: "Sci-Fi", hint: "Cloned prehistoric creatures on an island" },
  { emojis: "🕸️ 🐷 🐭 🚜", title: "CHARLOTTES WEB", category: "Children's", hint: "Some pig and a loyal spider friend" },
  { emojis: "🚀 🌕 👨‍🚀 🌌", title: "FROM THE EARTH TO THE MOON", category: "Sci-Fi", hint: "Jules Verne's classic space voyage" },
  { emojis: "👑 ⚔️ 🏰 🐉", title: "A GAME OF THRONES", category: "Fantasy", hint: "Winter is coming to Westeros" },
  { emojis: "🏹 🕊️ 🌳 🍎", title: "WILLIAM TELL", category: "Legend", hint: "Shooting an apple off his son's head" },
  { emojis: "🌊 🧜‍♀️ 🐚 🔱", title: "THE LITTLE MERMAID", category: "Fairy Tale", hint: "An underwater princess yearning for the land" }
];

const TOTAL_ROUNDS = 5;

export default function EmojiBookRiddle({ content, onComplete, onExit }: GameProps) {
  const [seed, setSeed] = useState(0);

  const puzzles = useMemo(() => {
    const fromContent: EmojiPuzzle[] = content
      .filter((c) => c.kind === "emoji-book" && c.extra?.title)
      .map((c) => ({
        emojis: c.value,
        title: String(c.extra.title).toUpperCase(),
        category: String(c.extra.category || "Literature"),
        hint: c.hint || "Guess the book title",
      }));
    const pool = fromContent.length >= TOTAL_ROUNDS ? fromContent : [...fromContent, ...FALLBACK_PUZZLES];
    return shuffle(pool).slice(0, TOTAL_ROUNDS);
  }, [content, seed]);

  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [inputAnswer, setInputAnswer] = useState<string[]>([]);
  const [revealedLetters, setRevealedLetters] = useState<Set<number>>(new Set());
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const current = puzzles[roundIndex];
  const targetTitle = current?.title || "";

  // Extract letter tiles (only A-Z characters for tiles)
  const lettersOnly = useMemo(() => {
    return targetTitle.split("").filter((ch) => /[A-Z]/.test(ch));
  }, [targetTitle]);

  // Scrambled choices for player: correct letters + 4 extra decoy letters
  const letterPool = useMemo(() => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const decoys = shuffle(alphabet.split("").filter((c) => !lettersOnly.includes(c))).slice(0, 4);
    return shuffle([...lettersOnly, ...decoys]).map((char, id) => ({ id, char, used: false }));
  }, [lettersOnly]);

  const [availableTiles, setAvailableTiles] = useState(letterPool);

  // Sync available tiles when round changes
  const initRound = (rIdx: number) => {
    const p = puzzles[rIdx];
    if (!p) return;
    const lOnly = p.title.split("").filter((ch) => /[A-Z]/.test(ch));
    const decoys = shuffle("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").filter((c) => !lOnly.includes(c))).slice(0, 4);
    setAvailableTiles(shuffle([...lOnly, ...decoys]).map((char, id) => ({ id, char, used: false })));
    setInputAnswer([]);
    setRevealedLetters(new Set());
    setShowHint(false);
    setIsAnswered(false);
    setIsCorrect(false);
  };

  const handleTileClick = (tileId: number, char: string) => {
    if (isAnswered) return;
    setAvailableTiles((prev) => prev.map((t) => (t.id === tileId ? { ...t, used: true } : t)));
    setInputAnswer((prev) => [...prev, char]);
  };

  const handleRemoveLast = () => {
    if (isAnswered || inputAnswer.length === 0) return;
    const lastChar = inputAnswer[inputAnswer.length - 1];
    setInputAnswer((prev) => prev.slice(0, -1));
    // Unmark first used tile matching lastChar
    setAvailableTiles((prev) => {
      let unmarked = false;
      return prev.map((t) => {
        if (!unmarked && t.used && t.char === lastChar) {
          unmarked = true;
          return { ...t, used: false };
        }
        return t;
      });
    });
  };

  const checkAnswer = () => {
    if (isAnswered) return;
    const entered = inputAnswer.join("");
    const targetClean = targetTitle.replace(/[^A-Z]/g, "");
    const correct = entered === targetClean;
    setIsAnswered(true);
    setIsCorrect(correct);

    const roundPoints = correct ? (showHint ? 8 : 12) : 0;
    const nextScore = score + roundPoints;
    setScore(nextScore);

    window.setTimeout(() => {
      if (roundIndex + 1 >= puzzles.length) {
        setGameOver(true);
        const win = nextScore >= 30;
        onComplete(win, nextScore);
      } else {
        const nextRound = roundIndex + 1;
        setRoundIndex(nextRound);
        initRound(nextRound);
      }
    }, 1500);
  };

  const handleHint = () => {
    setShowHint(true);
  };

  const restart = () => {
    setSeed((s) => s + 1);
    setRoundIndex(0);
    setScore(0);
    setGameOver(false);
    initRound(0);
  };

  // Build the display of blanks
  let letterCursor = 0;
  const wordSlots = useMemo(() => {
    if (!current) return [];
    return current.title.split(" ").map((word) => {
      return word.split("").map((ch) => {
        if (/[A-Z]/.test(ch)) {
          const idx = letterCursor++;
          return { isLetter: true, char: ch, currentVal: inputAnswer[idx] || "" };
        }
        return { isLetter: false, char: ch, currentVal: ch };
      });
    });
  }, [current, inputAnswer, letterCursor]);

  return (
    <div className="space-y-4">
      {/* Top Header stats */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Puzzle {Math.min(roundIndex + 1, TOTAL_ROUNDS)}/{TOTAL_ROUNDS}</Badge>
          <Badge variant="outline" className="text-primary font-bold">Score: {score} XP</Badge>
          {current?.category && <Badge variant="secondary" className="capitalize text-xs">{current.category}</Badge>}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={restart}><RotateCcw className="h-4 w-4 mr-1" />Restart</Button>
          <Button size="sm" variant="ghost" onClick={onExit}>Close</Button>
        </div>
      </div>

      {!gameOver && current ? (
        <Card className="p-6 space-y-5 text-center">
          {/* Emojis Display */}
          <div className="py-4 px-6 bg-muted/40 rounded-2xl inline-block mx-auto border border-border/60 shadow-sm">
            <span className="text-4xl sm:text-5xl tracking-widest select-none">{current.emojis}</span>
          </div>

          <p className="text-xs text-muted-foreground">Decode the book title from the emojis above!</p>

          {/* Letter Slots */}
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-3 max-w-lg mx-auto">
            {wordSlots.map((word, wIdx) => (
              <div key={wIdx} className="flex gap-1.5 items-center">
                {word.map((slot, sIdx) => {
                  if (!slot.isLetter) {
                    return <span key={sIdx} className="font-bold text-lg text-muted-foreground px-0.5">{slot.char}</span>;
                  }
                  return (
                    <div
                      key={sIdx}
                      className={`h-9 w-9 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center font-bold text-base sm:text-lg border transition-all ${
                        isAnswered
                          ? isCorrect
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                            : "bg-destructive/20 border-destructive text-destructive"
                          : slot.currentVal
                          ? "bg-primary/10 border-primary text-primary shadow-sm"
                          : "bg-background border-dashed border-border"
                      }`}
                    >
                      {slot.currentVal}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Result Alert */}
          {isAnswered && (
            <div className={`p-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 ${
              isCorrect ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-destructive/15 text-destructive"
            }`}>
              {isCorrect ? <Check className="h-4 w-4" /> : null}
              {isCorrect ? "Spot on! That's correct!" : `The book was: ${current.title}`}
            </div>
          )}

          {/* Hint Card */}
          {showHint ? (
            <div className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 p-2.5 rounded-lg max-w-md mx-auto flex items-center gap-2">
              <Lightbulb className="h-4 w-4 shrink-0" />
              <span><strong>Clue:</strong> {current.hint}</span>
            </div>
          ) : (
            <div>
              <Button size="sm" variant="ghost" onClick={handleHint} className="text-xs text-muted-foreground hover:text-foreground">
                <HelpCircle className="h-3.5 w-3.5 mr-1 text-amber-500" /> Need a clue? (-4 XP)
              </Button>
            </div>
          )}

          {/* Scrambled Letter Tiles */}
          <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto pt-2">
            {availableTiles.map((t) => (
              <Button
                key={t.id}
                size="sm"
                variant={t.used ? "outline" : "secondary"}
                disabled={t.used || isAnswered}
                onClick={() => handleTileClick(t.id, t.char)}
                className={`h-9 w-9 sm:h-10 sm:w-10 p-0 font-bold text-sm ${t.used ? "opacity-25" : "hover:border-primary shadow-xs"}`}
              >
                {t.char}
              </Button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRemoveLast}
              disabled={isAnswered || inputAnswer.length === 0}
            >
              Backspace
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={checkAnswer}
              disabled={isAnswered || inputAnswer.length === 0}
            >
              Check Answer
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-6 text-center space-y-4 border-primary/40 bg-primary/5">
          <Trophy className="h-10 w-10 text-primary mx-auto animate-bounce" />
          <div>
            <h3 className="text-xl font-bold">Emoji Master!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              You scored <span className="font-bold text-foreground">{score} XP</span> across {TOTAL_ROUNDS} riddles!
            </p>
          </div>
          <Button size="sm" variant="default" onClick={restart}>Play again</Button>
        </Card>
      )}
    </div>
  );
}
