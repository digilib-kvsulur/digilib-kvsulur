import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GameProps } from "./gameTypes";
import { Check, Map, Leaf, FlaskConical, Code2, Brain, ArrowRight } from "lucide-react";

const GAME_META: Record<string, { title: string; icon: typeof Brain; intro: string }> = {
  "logic-grid": { title: "Logic Grid", icon: Brain, intro: "Use clues carefully. The rounds get trickier as you go." },
  "map-quest": { title: "Map Quest", icon: Map, intro: "Travel the world through five quick geography rounds." },
  "science-sprint": { title: "Science Sprint", icon: FlaskConical, intro: "Race through science questions, one round at a time." },
  "code-breakers": { title: "Code Breakers", icon: Code2, intro: "Crack patterns, logic and beginner coding concepts." },
  "eco-sort": { title: "Eco Sort", icon: Leaf, intro: "Make smart choices for a cleaner, greener planet." },
};

export default function NewArcadeGame({ gameKey, arcadeQuestions = [], onComplete, onExit }: GameProps & { gameKey: string }) {
  const game = GAME_META[gameKey];
  const Icon = game?.icon || Brain;
  const questions = arcadeQuestions;
  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<{ question_id: string; answer: string }[]>([]);
  const [finished, setFinished] = useState(false);
  const [verifiedCorrect, setVerifiedCorrect] = useState<number | null>(null);
  const question = questions[round];

  if (!game || !question) return <div className="p-6 text-center text-sm text-muted-foreground">This challenge could not load. Close it and try again.</div>;
  const choose = (option: string) => {
    if (selected) return;
    setSelected(option);
    const nextAnswers = [...answers, { question_id: question.id, answer: option }];
    setAnswers(nextAnswers);
    if (round === questions.length - 1) {
      void Promise.resolve(onComplete(false, 0, nextAnswers)).then((result) => {
        setVerifiedCorrect(Number(result?.correct_answers) || 0);
        setFinished(true);
      });
      return;
    }
    setCorrect(round + 1);
  };
  const next = () => { setRound((n) => n + 1); setSelected(null); };

  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-violet-500/10 via-sky-500/10 to-emerald-500/10 p-4">
      <div className="flex items-center gap-3"><span className="rounded-xl bg-background p-2.5 shadow-sm"><Icon className="h-5 w-5 text-primary" /></span><div><h3 className="font-bold">{game.title}</h3><p className="text-xs text-muted-foreground">{game.intro}</p></div></div>
      <Badge variant="secondary">Round {Math.min(round + 1, questions.length)} / {questions.length}</Badge>
    </div>
    <Progress value={finished ? 100 : (round / questions.length) * 100} aria-label="Round progress" />
    {finished ? <div className="rounded-2xl border bg-card p-6 text-center space-y-3"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-500/10"><Check className="h-7 w-7 text-amber-600" /></div><h3 className="text-xl font-bold">{(verifiedCorrect || 0) >= 3 ? "Challenge cleared!" : "Good effort!"}</h3><p className="text-sm text-muted-foreground">You answered {verifiedCorrect || 0} of {questions.length} correctly. Your result was checked and saved securely.</p><Button variant="outline" onClick={onExit}>Back to arcade</Button></div> : <div className="rounded-2xl border bg-card p-5 sm:p-7 space-y-5"><div className="flex items-center justify-between"><Badge variant="outline">{question.difficulty < 3 ? "Warm-up" : question.difficulty < 5 ? "Challenge" : "Boss round"}</Badge><span className="text-xs text-muted-foreground">Round {round + 1} of {questions.length}</span></div><h3 className="text-lg sm:text-xl font-semibold leading-relaxed">{question.prompt}</h3><div className="grid gap-2">{question.options.map((option) => <Button key={option} variant={selected === option ? "secondary" : "outline"} className="h-auto min-h-12 justify-start whitespace-normal text-left" onClick={() => choose(option)} disabled={!!selected}>{option}</Button>)}</div>{selected && <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 p-3"><p className="text-sm text-muted-foreground">Answer locked in. Continue to the next round.</p>{round < questions.length - 1 && <Button size="sm" onClick={next}>Next round <ArrowRight className="ml-1 h-4 w-4" /></Button>}</div>}</div>}
  </div>;
}
