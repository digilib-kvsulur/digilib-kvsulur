import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2 } from "lucide-react";

const GAMES = [
  ["logic-grid", "Logic Grid"], ["map-quest", "Map Quest"], ["science-sprint", "Science Sprint"], ["code-breakers", "Code Breakers"], ["eco-sort", "Eco Sort"],
] as const;
type Question = { id: string; game_key: string; difficulty: number; prompt: string; options: string[]; answer: string; hint: string; is_active: boolean };

export default function ArcadeChallengeManager() {
  const { toast } = useToast();
  const [gameKey, setGameKey] = useState<string>(GAMES[0][0]);
  const [rows, setRows] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState("");
  const [answer, setAnswer] = useState("");
  const [hint, setHint] = useState("");
  const [difficulty, setDifficulty] = useState("1");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).from("game_challenge_questions").select("*").eq("game_key", gameKey).order("difficulty").order("created_at");
    if (error) toast({ title: "Could not load challenge bank", description: error.message, variant: "destructive" });
    setRows((data || []) as Question[]);
    setLoading(false);
  }, [gameKey, toast]);
  useEffect(() => { void load(); }, [load]);

  const add = async () => {
    const choices = options.split("\n").map((item) => item.trim()).filter(Boolean);
    if (!prompt.trim() || choices.length < 2 || !answer.trim() || !choices.includes(answer.trim())) {
      toast({ title: "Check the question", description: "Add a prompt, at least two options, and an answer that exactly matches one option.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any).from("game_challenge_questions").insert({ game_key: gameKey, difficulty: Number(difficulty), prompt: prompt.trim(), options: choices, answer: answer.trim(), hint: hint.trim() });
    setSaving(false);
    if (error) return toast({ title: "Question not added", description: error.message, variant: "destructive" });
    setPrompt(""); setOptions(""); setAnswer(""); setHint("");
    toast({ title: "Question added to the challenge bank" });
    void load();
  };

  const update = async (row: Question, patch: Partial<Question>) => {
    const { error } = await (supabase as any).from("game_challenge_questions").update(patch).eq("id", row.id);
    if (error) toast({ title: "Could not update question", description: error.message, variant: "destructive" });
    else setRows((current) => current.map((item) => item.id === row.id ? { ...item, ...patch } : item));
  };
  const remove = async (row: Question) => {
    const { error } = await (supabase as any).from("game_challenge_questions").delete().eq("id", row.id);
    if (error) toast({ title: "Could not delete question", description: error.message, variant: "destructive" });
    else setRows((current) => current.filter((item) => item.id !== row.id));
  };

  return <div className="space-y-4">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-semibold">Server-verified question bank</h3><p className="text-xs text-muted-foreground">Answers stay on the server. Students receive only prompts and choices.</p></div><Select value={gameKey} onValueChange={setGameKey}><SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger><SelectContent>{GAMES.map(([key, title]) => <SelectItem key={key} value={key}>{title}</SelectItem>)}</SelectContent></Select></div>
    <Card className="rounded-2xl"><CardContent className="grid gap-3 p-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><Label htmlFor="arcade-prompt">Question prompt</Label><Textarea id="arcade-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Write a clear question for students…" /></div>
      <div><Label htmlFor="arcade-options">Answer choices (one per line)</Label><Textarea id="arcade-options" value={options} onChange={(event) => setOptions(event.target.value)} placeholder={"Choice one\nChoice two\nChoice three"} /></div>
      <div className="space-y-3"><div><Label htmlFor="arcade-answer">Correct answer</Label><Input id="arcade-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} /></div><div><Label htmlFor="arcade-hint">Hint</Label><Input id="arcade-hint" value={hint} onChange={(event) => setHint(event.target.value)} /></div><div><Label>Difficulty round</Label><Select value={difficulty} onValueChange={setDifficulty}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[1,2,3,4,5].map((level) => <SelectItem key={level} value={String(level)}>Round {level}</SelectItem>)}</SelectContent></Select></div></div>
      <div className="sm:col-span-2"><Button onClick={() => void add()} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Add question</Button></div>
    </CardContent></Card>
    {loading ? <p className="p-4 text-sm text-muted-foreground">Loading questions…</p> : rows.length ? <div className="space-y-2">{rows.map((row) => <Card key={row.id} className="rounded-xl"><CardContent className="flex items-start gap-3 p-3"><div className="min-w-0 flex-1"><div className="mb-1 flex items-center gap-2"><Badge variant="outline">Round {row.difficulty}</Badge><span className="text-xs text-muted-foreground">{row.options.length} choices</span></div><p className="text-sm font-medium">{row.prompt}</p><p className="mt-1 text-xs text-muted-foreground">Answer: {row.answer}{row.hint && ` · Hint: ${row.hint}`}</p></div><Switch checked={row.is_active} onCheckedChange={(checked) => void update(row, { is_active: checked })} aria-label={`${row.is_active ? "Deactivate" : "Activate"} question`} /><Button size="icon" variant="ghost" aria-label="Delete question" onClick={() => void remove(row)}><Trash2 className="h-4 w-4 text-destructive" /></Button></CardContent></Card>)}</div> : <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No questions for this game yet.</p>}
  </div>;
}
