import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { GameProps, normalise, shuffle } from "./gameTypes";
import { RotateCcw, Trophy, SkipForward, Lightbulb } from "lucide-react";

const FALLBACK = [
  // original riddles
  { value: "I have pages but no leaves of a tree, a spine but no back. What am I?", answer: "Book", hint: "Found in thousands here" },
  { value: "I have keys that open no door, but give you access to thousands of books. What am I?", answer: "Keyboard", hint: "Used for typing" },
  { value: "I travel around the world while staying in one corner. What am I?", answer: "Stamp", hint: "Attached to letters" },
  { value: "I am full of holes but I can still hold water. What am I?", answer: "Sponge", hint: "Used for cleaning" },
  { value: "The more you take away from me, the larger I become. What am I?", answer: "Hole", hint: "Found in the ground" },
  { value: "I have words, chapters, and index, but I never speak. What am I?", answer: "Dictionary", hint: "Reference volume" },
  { value: "I have cities without houses, mountains without trees, and oceans without water. What am I?", answer: "Map", hint: "Cartography" },
  { value: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?", answer: "Echo", hint: "Sound reflection" },
  { value: "What gets wetter the more it dries?", answer: "Towel", hint: "Found in the bathroom" },
  { value: "I am tall when I am young, and short when I am old. What am I?", answer: "Candle", hint: "Provides light" },
  // new library / book riddles
  { value: "I hold hundreds of stories without saying a single word, and you must return me or face a fine. What am I?", answer: "Library Book", hint: "You borrow me" },
  { value: "I have a spine, but I cannot feel pain. I have chapters, but no house. What am I?", answer: "Novel", hint: "A work of fiction" },
  { value: "I sit in rows and hold knowledge quietly. Students visit me every day. What am I?", answer: "Library Shelf", hint: "Made of wood" },
  { value: "I am the first page that tells you the title, the author and the year. What am I?", answer: "Title Page", hint: "Front of the book" },
  { value: "I am read from left to right, I rhyme sometimes, I tell stories in lines. What am I?", answer: "Poem", hint: "Lines and verses" },
  { value: "I list every topic in a book from A to Z at the very back. What am I?", answer: "Index", hint: "Alphabetical list" },
  { value: "I come before chapter one and set the scene. Authors write me to welcome readers. What am I?", answer: "Prologue", hint: "Introduction of a book" },
  // new science / nature riddles
  { value: "I am the force that pulls you to the ground and keeps planets in orbit. What am I?", answer: "Gravity", hint: "Newton discovered me" },
  { value: "I am made of hydrogen and oxygen. Every living thing needs me. What am I?", answer: "Water", hint: "H₂O" },
  { value: "I orbit the Earth, reflect sunlight at night, and cause the tides. What am I?", answer: "Moon", hint: "Earth's natural satellite" },
  { value: "Plants make their food using me, water, and sunlight. What process am I?", answer: "Photosynthesis", hint: "Green leaves do this" },
  { value: "I am the smallest unit of life. Every living organism is made of me. What am I?", answer: "Cell", hint: "Seen under a microscope" },
  { value: "I am a gas that makes up about 78% of the air you breathe. What am I?", answer: "Nitrogen", hint: "Not oxygen!" },
  { value: "I carry electrical signals from the brain to muscles. What am I?", answer: "Nerve", hint: "Part of nervous system" },
  // new classic / fun riddles
  { value: "What has hands but cannot clap?", answer: "Clock", hint: "It tells the time" },
  { value: "What can you catch but not throw?", answer: "Cold", hint: "You sneeze when you have it" },
  { value: "I have a head and a tail but no body. What am I?", answer: "Coin", hint: "Currency" },
  { value: "What has an eye but cannot see?", answer: "Needle", hint: "Used for sewing" },
  { value: "The more you share me, the more I grow. The less you share me, the less I show. What am I?", answer: "Knowledge", hint: "Gained from books" },
  { value: "I run all day and never walk. I have a mouth but never talk. I have a head but never weep. I have a bed but never sleep. What am I?", answer: "River", hint: "Flows to the ocean" },
  { value: "What comes once in a minute, twice in a moment, but never in a thousand years?", answer: "Letter M", hint: "Look at the letter itself" },
  { value: "I have branches but no fruit, leaves, or trunk. What am I?", answer: "Bank", hint: "You deposit money here" },
  { value: "What word becomes shorter when you add two letters to it?", answer: "Short", hint: "Think about the word itself" },
  { value: "What invention lets you look right through a wall?", answer: "Window", hint: "Found in buildings" },
];

export default function RiddleRounds({ content, onComplete, onExit }: GameProps) {
  const [seed, setSeed] = useState(0);
  const rounds = useMemo(() => {
    const list = content
      .filter((c) => c.kind === "riddle")
      .map((c) => ({ value: c.value, answer: String(c.extra?.answer || ""), hint: c.hint || "" }))
      .filter((r) => r.answer);
    return shuffle(list.length >= 5 ? list : FALLBACK).slice(0, 5);
  }, [content, seed]);

  const [i, setI] = useState(0);
  const [guess, setGuess] = useState("");
  const [correct, setCorrect] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  const r = rounds[i];

  const next = (got: boolean) => {
    const nc = got ? correct + 1 : correct;
    setCorrect(nc);
    setGuess("");
    setShowHint(false);
    setFeedback(got ? "Correct!" : `Answer: ${r.answer}`);
    window.setTimeout(() => setFeedback(null), 1500);
    if (i + 1 >= rounds.length) {
      setOver(true);
      onComplete(nc >= Math.ceil(rounds.length * 0.6), nc);
    } else setI((x) => x + 1);
  };

  const check = () => {
    if (!guess.trim()) return;
    next(normalise(guess).includes(normalise(r.answer)) || normalise(r.answer).includes(normalise(guess)));
  };

  const restart = () => {
    setI(0); setGuess(""); setCorrect(0); setOver(false); setShowHint(false); setSeed((s) => s + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2">
          <Badge variant="secondary">Riddle {Math.min(i + 1, rounds.length)}/{rounds.length}</Badge>
          <Badge variant="secondary">Correct {correct}</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={restart}><RotateCcw className="h-4 w-4 mr-1" />Restart</Button>
          <Button size="sm" variant="ghost" onClick={onExit}>Close</Button>
        </div>
      </div>

      {!over ? (
        <Card className="p-6 space-y-4 text-center">
          <p className="text-lg font-medium">{r.value}</p>
          {showHint && r.hint && <p className="text-xs text-muted-foreground">Hint: {r.hint}</p>}
          <div className="flex gap-2 max-w-sm mx-auto">
            <Input value={guess} autoFocus placeholder="Your answer"
              onChange={(e) => setGuess(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && check()} />
            <Button onClick={check}>Check</Button>
            {r.hint && (
              <Button variant="outline" size="icon" onClick={() => setShowHint(true)} title="Hint">
                <Lightbulb className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={() => next(false)} title="Skip">
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
          {feedback && <p className="text-sm font-medium text-primary">{feedback}</p>}
        </Card>
      ) : (
        <Card className="p-5 text-center space-y-2 border-primary/40 bg-primary/5">
          <Trophy className="h-7 w-7 text-primary mx-auto" />
          <p className="font-semibold">You solved {correct} of {rounds.length} riddles</p>
          <Button size="sm" variant="outline" onClick={restart}>Play again</Button>
        </Card>
      )}
    </div>
  );
}
