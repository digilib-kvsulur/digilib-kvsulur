import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { GameProps, shuffle } from "./gameTypes";
import { RotateCcw, Trophy, MapPin } from "lucide-react";

const FALLBACK = [
  { place: "Hogwarts", answer: "Harry Potter" },
  { place: "Malgudi", answer: "R. K. Narayan" },
  { place: "Neverland", answer: "Peter Pan" },
  { place: "Wonderland", answer: "Alice in Wonderland" },
];

export default function LiteraryPlaces({ books, content, onComplete, onExit }: GameProps) {
  const [seed, setSeed] = useState(0);
  const items = useMemo(() => {
    const list = content
      .filter((c) => c.kind === "place" && c.extra?.answer)
      .map((c) => ({ place: c.value, answer: String(c.extra?.answer) }));
    return list.length >= 4 ? list : [...list, ...FALLBACK];
  }, [content]);

  const rounds = useMemo(() => shuffle(items).slice(0, 5), [items, seed]);
  const distractors = useMemo(
    () => [...new Set([...items.map((i) => i.answer), ...books.map((b) => b.author)])],
    [items, books]
  );

  const [i, setI] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  const r = rounds[i];
  const options = useMemo(
    () => shuffle([r?.answer, ...shuffle(distractors.filter((d) => d !== r?.answer)).slice(0, 3)].filter(Boolean) as string[]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [r?.place, seed]
  );

  const choose = (opt: string) => {
    if (picked) return;
    setPicked(opt);
    const got = opt === r.answer;
    const nc = got ? correct + 1 : correct;
    window.setTimeout(() => {
      setCorrect(nc);
      setPicked(null);
      if (i + 1 >= rounds.length) {
        setOver(true);
        onComplete(nc >= Math.ceil(rounds.length * 0.6), nc);
      } else setI((x) => x + 1);
    }, 900);
  };

  const restart = () => {
    setI(0); setCorrect(0); setPicked(null); setOver(false); setSeed((s) => s + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2">
          <Badge variant="secondary">Place {Math.min(i + 1, rounds.length)}/{rounds.length}</Badge>
          <Badge variant="secondary">Correct {correct}</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={restart}><RotateCcw className="h-4 w-4 mr-1" />Restart</Button>
          <Button size="sm" variant="ghost" onClick={onExit}>Close</Button>
        </div>
      </div>

      {!over && r ? (
        <Card className="p-6 space-y-4 text-center">
          <MapPin className="h-7 w-7 text-primary mx-auto" />
          <p className="text-xl font-bold">{r.place}</p>
          <p className="text-xs text-muted-foreground">Which book or author does this place belong to?</p>
          <div className="grid gap-2 sm:grid-cols-2 max-w-md mx-auto">
            {options.map((o) => {
              const state = picked ? (o === r.answer ? "default" : o === picked ? "destructive" : "outline") : "secondary";
              return (
                <Button key={o} variant={state as any} onClick={() => choose(o)} className="justify-start">
                  {o}
                </Button>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card className="p-5 text-center space-y-2 border-primary/40 bg-primary/5">
          <Trophy className="h-7 w-7 text-primary mx-auto" />
          <p className="font-semibold">You matched {correct} of {rounds.length}</p>
          <Button size="sm" variant="outline" onClick={restart}>Play again</Button>
        </Card>
      )}
    </div>
  );
}
