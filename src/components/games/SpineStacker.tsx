import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { GameProps } from "./gameTypes";
import { RotateCcw, Trophy, Sparkles, Layers } from "lucide-react";

interface PlacedBook {
  x: number;
  width: number;
  color: string;
  title: string;
  isPerfect: boolean;
}

const BOOK_COLORS = [
  "from-emerald-600 to-teal-700",
  "from-indigo-600 to-violet-700",
  "from-amber-600 to-orange-700",
  "from-rose-600 to-pink-700",
  "from-blue-600 to-cyan-700",
  "from-purple-600 to-fuchsia-700",
  "from-yellow-600 to-amber-700",
  "from-teal-600 to-emerald-700",
];

const SAMPLE_TITLES = [
  "Great Expectations", "War and Peace", "Pride & Prejudice", "The Odyssey",
  "Wings of Fire", "Malgudi Days", "Gitanjali", "Discovery of India",
  "Dune", "To Kill a Mockingbird", "1984", "Fahrenheit 451", "The Hobbit"
];

const TARGET_STACK = 10;
const CONTAINER_WIDTH = 340;
const BOOK_HEIGHT = 22;

export default function SpineStacker({ onComplete, onExit }: GameProps) {
  const [stack, setStack] = useState<PlacedBook[]>([
    {
      x: 70,
      width: 200,
      color: BOOK_COLORS[0],
      title: "Library Foundation",
      isPerfect: false,
    },
  ]);

  const [currentX, setCurrentX] = useState(10);
  const [movingRight, setMovingRight] = useState(true);
  const [isGameOver, setIsGameOver] = useState(false);
  const [perfectCombo, setPerfectCombo] = useState(0);
  const [perfectMessage, setPerfectMessage] = useState<string | null>(null);

  const requestRef = useRef<number | null>(null);
  const currentWidth = stack[stack.length - 1]?.width || 200;

  // Animation loop for top swinging book
  useEffect(() => {
    if (isGameOver) return;

    let posX = currentX;
    let right = movingRight;
    const speed = 2.6 + Math.min(stack.length * 0.25, 4.5);

    const step = () => {
      if (right) {
        posX += speed;
        if (posX + currentWidth >= CONTAINER_WIDTH) {
          posX = CONTAINER_WIDTH - currentWidth;
          right = false;
        }
      } else {
        posX -= speed;
        if (posX <= 0) {
          posX = 0;
          right = true;
        }
      }

      setCurrentX(posX);
      setMovingRight(right);
      requestRef.current = requestAnimationFrame(step);
    };

    requestRef.current = requestAnimationFrame(step);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isGameOver, movingRight, currentWidth, stack.length]);

  const dropBook = () => {
    if (isGameOver) return;

    const topBase = stack[stack.length - 1];
    const dropLeft = currentX;
    const dropRight = currentX + currentWidth;
    const baseLeft = topBase.x;
    const baseRight = topBase.x + topBase.width;

    // Check complete miss
    if (dropRight <= baseLeft || dropLeft >= baseRight) {
      // Missed completely!
      finishGame(false);
      return;
    }

    // Overlap calculations
    const newLeft = Math.max(dropLeft, baseLeft);
    const newRight = Math.min(dropRight, baseRight);
    let newWidth = newRight - newLeft;

    // Check if drop was near-perfect (within 5px)
    const diff = Math.abs(dropLeft - baseLeft);
    const isPerfect = diff <= 5;

    if (isPerfect) {
      newWidth = topBase.width; // Restore/preserve full width
      setPerfectCombo((c) => c + 1);
      setPerfectMessage("PERFECT ALIGNMENT! +50 XP");
      window.setTimeout(() => setPerfectMessage(null), 1000);
    } else {
      setPerfectCombo(0);
    }

    const nextBook: PlacedBook = {
      x: isPerfect ? topBase.x : newLeft,
      width: newWidth,
      color: BOOK_COLORS[stack.length % BOOK_COLORS.length],
      title: SAMPLE_TITLES[stack.length % SAMPLE_TITLES.length],
      isPerfect,
    };

    const nextStack = [...stack, nextBook];
    setStack(nextStack);

    // If minimum width became tiny or stack reached target
    if (newWidth < 18) {
      finishGame(nextStack.length >= TARGET_STACK, nextStack.length);
    } else if (nextStack.length - 1 >= TARGET_STACK) {
      finishGame(true, nextStack.length);
    }
  };

  const finishGame = (win: boolean, finalHeight = stack.length) => {
    setIsGameOver(true);
    if (requestRef.current) cancelAnimationFrame(requestRef.current);

    const booksPlaced = finalHeight - 1;
    const xp = booksPlaced * 10 + (win ? 30 : 0) + perfectCombo * 15;
    onComplete(win, xp);
  };

  const restart = () => {
    setStack([
      {
        x: 70,
        width: 200,
        color: BOOK_COLORS[0],
        title: "Library Foundation",
        isPerfect: false,
      },
    ]);
    setCurrentX(10);
    setMovingRight(true);
    setIsGameOver(false);
    setPerfectCombo(0);
    setPerfectMessage(null);
  };

  // Keyboard space support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        dropBook();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const booksCount = stack.length - 1;

  return (
    <div className="space-y-4 select-none">
      {/* Top Header stats */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Height: {booksCount}/{TARGET_STACK}</Badge>
          <Badge variant="outline" className="text-primary font-bold">
            {booksCount * 10 + (booksCount >= TARGET_STACK ? 30 : 0)} XP
          </Badge>
          {perfectCombo > 0 && (
            <Badge variant="default" className="bg-amber-500 text-white flex items-center gap-1 text-xs">
              <Sparkles className="h-3 w-3" /> Combo x{perfectCombo}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={restart}><RotateCcw className="h-4 w-4 mr-1" />Restart</Button>
          <Button size="sm" variant="ghost" onClick={onExit}>Close</Button>
        </div>
      </div>

      {!isGameOver ? (
        <Card className="p-4 flex flex-col items-center justify-between min-h-[380px] bg-gradient-to-b from-background to-muted/30">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-2">
            <Layers className="h-3.5 w-3.5 text-primary" /> Tap anywhere or press Space to drop each book!
          </div>

          {perfectMessage && (
            <div className="absolute top-24 z-20 text-xs font-bold text-amber-500 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full animate-bounce">
              {perfectMessage}
            </div>
          )}

          {/* Stacker Stage */}
          <div
            className="relative w-full max-w-[340px] h-[280px] border-b-4 border-amber-800 dark:border-amber-700 bg-muted/20 rounded-t-xl overflow-hidden cursor-pointer"
            onClick={dropBook}
          >
            {/* Moving active book */}
            <div
              className={`absolute top-2 h-[22px] rounded-sm bg-gradient-to-r ${
                BOOK_COLORS[stack.length % BOOK_COLORS.length]
              } shadow-md border-t border-white/30 flex items-center justify-center text-[10px] text-white font-medium truncate px-1 transition-none`}
              style={{
                left: `${currentX}px`,
                width: `${currentWidth}px`,
              }}
            >
              📖 {SAMPLE_TITLES[stack.length % SAMPLE_TITLES.length]}
            </div>

            {/* Stacked books */}
            <div className="absolute bottom-0 left-0 right-0 flex flex-col items-start">
              {stack.slice(Math.max(0, stack.length - 9)).map((b, i) => (
                <div
                  key={i}
                  className={`h-[22px] rounded-xs bg-gradient-to-r ${b.color} border-t border-white/25 flex items-center justify-between px-2 text-[10px] text-white font-semibold shadow-xs`}
                  style={{
                    marginLeft: `${b.x}px`,
                    width: `${b.width}px`,
                  }}
                >
                  <span className="truncate">{b.title}</span>
                  <div className="h-2 w-1 bg-amber-300/80 rounded-xs" />
                </div>
              ))}
            </div>
          </div>

          <Button
            size="lg"
            className="w-full max-w-[340px] mt-3 font-bold text-base"
            onClick={dropBook}
          >
            Drop Book!
          </Button>
        </Card>
      ) : (
        <Card className="p-6 text-center space-y-4 border-primary/40 bg-primary/5">
          <Trophy className="h-10 w-10 text-primary mx-auto animate-bounce" />
          <div>
            <h3 className="text-xl font-bold">
              {booksCount >= TARGET_STACK ? "Master Book Stacker!" : "Tower Tumbled!"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              You stacked <span className="font-bold text-foreground">{booksCount}</span> books high and earned{" "}
              <span className="font-bold text-primary">
                {booksCount * 10 + (booksCount >= TARGET_STACK ? 30 : 0)} XP
              </span>!
            </p>
          </div>
          <Button size="sm" variant="default" onClick={restart}>Play again</Button>
        </Card>
      )}
    </div>
  );
}
