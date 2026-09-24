import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { GameProps, shuffle } from "./gameTypes";
import { RotateCcw, Trophy, Quote, Clock, Lightbulb, CheckCircle2, XCircle } from "lucide-react";

interface QuoteItem {
  quote: string;
  author: string;
  source: string;
  hint: string;
}

const FALLBACK_QUOTES: QuoteItem[] = [
  {
    quote: "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.",
    author: "Jane Austen",
    source: "Pride and Prejudice",
    hint: "Classic 19th-century British romance novel.",
  },
  {
    quote: "All animals are equal, but some animals are more equal than others.",
    author: "George Orwell",
    source: "Animal Farm",
    hint: "Political satire set on Manor Farm.",
  },
  {
    quote: "You have to dream before your dreams can come true.",
    author: "A. P. J. Abdul Kalam",
    source: "Wings of Fire",
    hint: "India's Missile Man and beloved 11th President.",
  },
  {
    quote: "Not all those who wander are lost.",
    author: "J. R. R. Tolkien",
    source: "The Fellowship of the Ring",
    hint: "Poem about Aragorn in Middle-earth.",
  },
  {
    quote: "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness.",
    author: "Charles Dickens",
    source: "A Tale of Two Cities",
    hint: "Set in London and Paris during the French Revolution.",
  },
  {
    quote: "Where the mind is without fear and the head is held high, into that heaven of freedom, my Father, let my country awake.",
    author: "Rabindranath Tagore",
    source: "Gitanjali",
    hint: "Nobel Laureate Indian poet and philosopher.",
  },
  {
    quote: "There is no friend as loyal as a book.",
    author: "Ernest Hemingway",
    source: "Literary Essay",
    hint: "American author of 'The Old Man and the Sea'.",
  },
  {
    quote: "Whatever our souls are made of, his and mine are the same.",
    author: "Emily Brontë",
    source: "Wuthering Heights",
    hint: "Passionate moorland gothic classic featuring Heathcliff.",
  },
  {
    quote: "To be or not to be, that is the question.",
    author: "William Shakespeare",
    source: "Hamlet",
    hint: "Prince of Denmark soliloquy.",
  },
  {
    quote: "Until I feared I would lose it, I never loved to read. One does not love breathing.",
    author: "Harper Lee",
    source: "To Kill a Mockingbird",
    hint: "Pulitzer Prize novel narrated by Scout Finch.",
  },
  {
    quote: "Be the change that you wish to see in the world.",
    author: "Mahatma Gandhi",
    source: "Collected Works",
    hint: "Father of the Nation of India.",
  },
  {
    quote: "It is our choices, Harry, that show what we truly are, far more than our abilities.",
    author: "J. K. Rowling",
    source: "Harry Potter and the Chamber of Secrets",
    hint: "Wise words spoken by Professor Albus Dumbledore.",
  },
  {
    quote: "The only way to achieve the impossible is to believe it is possible.",
    author: "Lewis Carroll",
    source: "Through the Looking-Glass",
    hint: "Whimsical Victorian author of Wonderland tales.",
  },
  {
    quote: "In the middle of difficulty lies opportunity.",
    author: "Albert Einstein",
    source: "Scientific Reflections",
    hint: "Physicist renowned for the Theory of Relativity.",
  },
  {
    quote: "All happy families are alike; each unhappy family is unhappy in its own way.",
    author: "Leo Tolstoy",
    source: "Anna Karenina",
    hint: "Russian literary titan who also wrote War and Peace.",
  },
];

const TOTAL_ROUNDS = 5;
const ROUND_SECONDS = 15;

export default function QuoteGuesser({ books, content, onComplete, onExit }: GameProps) {
  const [seed, setSeed] = useState(0);

  const items = useMemo(() => {
    const fromContent: QuoteItem[] = content
      .filter((c) => c.kind === "quote" && c.extra?.author)
      .map((c) => ({
        quote: c.value,
        author: String(c.extra.author),
        source: String(c.extra.source || "Literature"),
        hint: c.hint || "Who wrote or spoke this quote?",
      }));
    const pool = fromContent.length >= TOTAL_ROUNDS ? fromContent : [...fromContent, ...FALLBACK_QUOTES];
    return shuffle(pool).slice(0, TOTAL_ROUNDS);
  }, [content, seed]);

  const allAuthors = useMemo(() => {
    const fromBooks = books.map((b) => b.author).filter(Boolean);
    const fromFallback = FALLBACK_QUOTES.map((q) => q.author);
    return Array.from(new Set([...fromFallback, ...fromBooks]));
  }, [books]);

  const [roundIdx, setRoundIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [showHint, setShowHint] = useState(false);
  const [over, setOver] = useState(false);

  const current = items[roundIdx];

  // Pick options: correct author + 3 distractors
  const options = useMemo(() => {
    if (!current) return [];
    const others = shuffle(allAuthors.filter((a) => a !== current.author)).slice(0, 3);
    return shuffle([current.author, ...others]);
  }, [current, allAuthors, roundIdx, seed]);

  // Timer loop
  useEffect(() => {
    if (over || selected !== null) return;
    if (timeLeft <= 0) {
      // Time expired for this round
      handleChoose("__TIME_UP__");
      return;
    }
    const timer = window.setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [timeLeft, over, selected]);

  const handleChoose = (choice: string) => {
    if (selected !== null) return;
    setSelected(choice);

    const isRight = choice === current.author;
    let roundPoints = 0;
    if (isRight) {
      // Base 10 XP + speed bonus up to 5 XP
      const speedBonus = Math.floor((timeLeft / ROUND_SECONDS) * 5);
      roundPoints = 10 + speedBonus;
      setCorrectCount((c) => c + 1);
    }
    const nextTotal = totalScore + roundPoints;
    setTotalScore(nextTotal);

    window.setTimeout(() => {
      if (roundIdx + 1 >= items.length) {
        setOver(true);
        const win = (correctCount + (isRight ? 1 : 0)) >= Math.ceil(TOTAL_ROUNDS * 0.6);
        onComplete(win, nextTotal);
      } else {
        setRoundIdx((r) => r + 1);
        setSelected(null);
        setTimeLeft(ROUND_SECONDS);
        setShowHint(false);
      }
    }, 1500);
  };

  const restart = () => {
    setSeed((s) => s + 1);
    setRoundIdx(0);
    setSelected(null);
    setCorrectCount(0);
    setTotalScore(0);
    setTimeLeft(ROUND_SECONDS);
    setShowHint(false);
    setOver(false);
  };

  const timerPercent = (timeLeft / ROUND_SECONDS) * 100;

  return (
    <div className="space-y-4">
      {/* Top Header stats */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Round {Math.min(roundIdx + 1, TOTAL_ROUNDS)}/{TOTAL_ROUNDS}</Badge>
          <Badge variant="outline" className="text-primary font-bold">{totalScore} XP</Badge>
          <Badge variant={timeLeft <= 5 ? "destructive" : "secondary"} className="flex items-center gap-1 text-xs">
            <Clock className="h-3 w-3" /> {timeLeft}s
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={restart}><RotateCcw className="h-4 w-4 mr-1" />Restart</Button>
          <Button size="sm" variant="ghost" onClick={onExit}>Close</Button>
        </div>
      </div>

      <Progress value={timerPercent} className="h-1.5" />

      {!over && current ? (
        <Card className="p-6 space-y-5">
          {/* Quote display */}
          <div className="relative p-6 rounded-2xl bg-muted/40 border border-border/60 text-center">
            <Quote className="h-8 w-8 text-primary/30 mx-auto mb-2" />
            <p className="text-base sm:text-lg font-serif italic text-foreground leading-relaxed">
              "{current.quote}"
            </p>
            {selected !== null && (
              <p className="mt-3 text-xs text-primary font-medium">
                — from <em>{current.source}</em>
              </p>
            )}
          </div>

          {/* Hint Section */}
          {showHint ? (
            <div className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 p-2.5 rounded-lg flex items-center gap-2">
              <Lightbulb className="h-4 w-4 shrink-0" />
              <span><strong>Clue:</strong> {current.hint}</span>
            </div>
          ) : (
            <div className="text-center">
              <Button size="sm" variant="ghost" onClick={() => setShowHint(true)} className="text-xs text-muted-foreground hover:text-foreground">
                <Lightbulb className="h-3.5 w-3.5 mr-1 text-amber-500" /> Need a hint?
              </Button>
            </div>
          )}

          {/* Options */}
          <div className="grid gap-2.5 sm:grid-cols-2">
            {options.map((author) => {
              let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
              let extraClass = "";

              if (selected !== null) {
                if (author === current.author) {
                  variant = "default";
                  extraClass = "bg-emerald-600 hover:bg-emerald-600 text-white border-emerald-600";
                } else if (author === selected) {
                  variant = "destructive";
                } else {
                  extraClass = "opacity-40";
                }
              }

              return (
                <Button
                  key={author}
                  variant={variant}
                  className={`h-auto py-3 px-4 justify-between font-medium text-sm transition-all ${extraClass}`}
                  onClick={() => handleChoose(author)}
                  disabled={selected !== null}
                >
                  <span>{author}</span>
                  {selected !== null && author === current.author && (
                    <CheckCircle2 className="h-4 w-4 ml-2 text-white shrink-0" />
                  )}
                  {selected !== null && author === selected && author !== current.author && (
                    <XCircle className="h-4 w-4 ml-2 text-white shrink-0" />
                  )}
                </Button>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card className="p-6 text-center space-y-4 border-primary/40 bg-primary/5">
          <Trophy className="h-10 w-10 text-primary mx-auto animate-bounce" />
          <div>
            <h3 className="text-xl font-bold">Literary Scholar!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              You correctly identified <span className="font-bold text-foreground">{correctCount}</span> of {TOTAL_ROUNDS} quotes, earning <span className="font-bold text-primary">{totalScore} XP</span>!
            </p>
          </div>
          <Button size="sm" variant="default" onClick={restart}>Play again</Button>
        </Card>
      )}
    </div>
  );
}
