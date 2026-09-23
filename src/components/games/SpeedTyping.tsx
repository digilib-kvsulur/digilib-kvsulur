import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { GameProps, shuffle } from "./gameTypes";
import { RotateCcw, Trophy } from "lucide-react";

const FALLBACK = [
  "A room without books is like a body without a soul.",
  "There is no friend as loyal as a good book waiting on the shelf.",
  "Reading is to the mind what exercise is to the body.",
  "The more that you read, the more things you will know.",
  "Today a reader, tomorrow a leader in the world of learning.",
  "Libraries store the energy that fuels the imagination of generations.",
  "Books are a uniquely portable magic that opens infinite doors.",
  "Science is a way of thinking much more than it is a body of knowledge.",
  "Knowledge is power and enthusiasm is the switch that turns it on.",
  "An investment in knowledge always pays the highest interest.",
  "The library is the temple of learning, open to everyone without exception.",
  "Education is the most powerful weapon which you can use to change the world.",
  "Live as if you were to die tomorrow. Learn as if you were to live forever.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts.",
  "Genius is one percent inspiration and ninety-nine percent perspiration.",
  "In the middle of every difficulty lies a hidden opportunity for growth.",
  "Imagination is more important than knowledge, for knowledge is limited.",
  "It is during our darkest moments that we must focus to see the light.",
  "The only true wisdom is in knowing you know nothing.",
  "Tell me and I forget. Teach me and I remember. Involve me and I learn.",
  "Do not go where the path may lead, go instead where there is no path and leave a trail.",
  "To read a book for the first time is to make a new acquaintance.",
  "Words have the power to create and the power to heal the deepest wounds.",
  "The journey of a thousand miles begins with a single confident step.",
  "A great book should leave you with many experiences, and slightly exhausted at the end.",
  // new additions
  "One book, one pen, one child and one teacher can change the world around us.",
  "Not all those who wander are lost; some are simply browsing the library shelves.",
  "The reading of all good books is like a conversation with the finest minds of past centuries.",
  "A reader lives a thousand lives before he dies. The man who never reads lives only one.",
  "It is what you read when you don't have to that determines what you will be when you can't help it.",
  "You can never get a cup of tea large enough or a book long enough to suit me.",
  "I declare after all there is no enjoyment like reading! How much sooner one tires of any thing than of a book.",
  "Sleep is good, he said, and books are better than the greatest adventures.",
  "The world belongs to those who read and seek to understand what they have read.",
  "Show me a family of readers, and I will show you the people who move the world forward.",
  "Reading gives us someplace to go when we have to stay where we are.",
  "Think before you speak. Read before you think.",
  "The greatest gift is a passion for reading. It is cheap, it consoles, it entertains and enlightens.",
  "There is no substitute for books in the life of a child who can read.",
];

// Helper to normalize characters like smart quotes and curly apostrophes
const normChar = (c: string) => {
  if (c === "’" || c === "‘" || c === "`") return "'";
  if (c === "“" || c === "”") return '"';
  return c;
};

export default function SpeedTyping({ content, onComplete, onExit }: GameProps) {
  const list = useMemo(() => {
    const fromContent = content.filter((c) => c.kind === "passage").map((c) => c.value);
    return fromContent.length ? fromContent : FALLBACK;
  }, [content]);

  // Lock passage in state so it NEVER shifts mid-typing
  const [passage, setPassage] = useState<string>(() => shuffle([...list])[0] || FALLBACK[0]);

  const [typed, setTyped] = useState("");
  const [startAt, setStartAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!startAt || done) return;
    const t = window.setInterval(() => setElapsed((Date.now() - startAt) / 1000), 200);
    return () => window.clearInterval(t);
  }, [startAt, done]);

  const correctChars = typed.split("").filter((c, i) => normChar(c) === normChar(passage[i] || "")).length;
  const accuracy = typed.length ? Math.round((correctChars / typed.length) * 100) : 100;
  const minutes = Math.max(elapsed / 60, 1 / 60);
  const wpm = Math.round(correctChars / 5 / minutes);

  const onChange = (v: string) => {
    if (done) return;
    if (!startAt) setStartAt(Date.now());
    setTyped(v);
    if (v.length >= passage.length) {
      setDone(true);
      const finalCorrect = v.split("").filter((c, i) => normChar(c) === normChar(passage[i] || "")).length;
      const finalAcc = Math.round((finalCorrect / passage.length) * 100);
      onComplete(finalAcc >= 85 && wpm >= 15, wpm);
    }
  };

  const restart = () => {
    setTyped("");
    setStartAt(null);
    setElapsed(0);
    setDone(false);
    // Pick a new passage different from current
    const available = list.filter((p) => p !== passage);
    setPassage(shuffle(available.length ? available : list)[0]);
  };


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2">
          <Badge variant="secondary">{wpm} WPM</Badge>
          <Badge variant={accuracy < 90 ? "destructive" : "secondary"}>{accuracy}% accuracy</Badge>
          <Badge variant="secondary">{elapsed.toFixed(1)}s</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={restart}><RotateCcw className="h-4 w-4 mr-1" />New passage</Button>
          <Button size="sm" variant="ghost" onClick={onExit}>Close</Button>
        </div>
      </div>

      <Card className="p-5 text-base leading-relaxed">
        {passage.split("").map((ch, i) => {
          const t = typed[i];
          const cls = t === undefined ? "text-muted-foreground" : t === ch ? "text-emerald-600" : "text-destructive underline";
          return <span key={i} className={cls}>{ch}</span>;
        })}
      </Card>

      {!done ? (
        <Textarea
          autoFocus
          value={typed}
          rows={4}
          placeholder="Start typing the passage…"
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Card className="p-5 text-center space-y-2 border-primary/40 bg-primary/5">
          <Trophy className="h-7 w-7 text-primary mx-auto" />
          <p className="font-semibold">{wpm} WPM at {accuracy}% accuracy</p>
          <Button size="sm" variant="outline" onClick={restart}>Try another</Button>
        </Card>
      )}
    </div>
  );
}
