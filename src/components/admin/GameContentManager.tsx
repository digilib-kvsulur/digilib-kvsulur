import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Upload, Download, Search } from "lucide-react";

interface ContentRow {
  id: string;
  game_key: string;
  kind: string;
  value: string;
  hint: string | null;
  extra: any;
  is_active: boolean;
}

const KIND_BY_GAME: Record<string, string> = {
  "reading-wordle": "word",
  "book-hangman": "word",
  "spell-bee": "word",
  "word-chain": "word",
  "word-search": "word",
  "speed-typing": "passage",
  "quick-draw": "prompt",
  "riddle-rounds": "riddle",
  "literary-places": "place",
};

const NEEDS_ANSWER = ["riddle-rounds", "literary-places"];

export default function GameContentManager({ games }: { games: { key: string; name: string }[] }) {
  const { toast } = useToast();
  const editable = useMemo(() => games.filter((g) => KIND_BY_GAME[g.key]), [games]);
  const [gameKey, setGameKey] = useState<string>("");
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [value, setValue] = useState("");
  const [hint, setHint] = useState("");
  const [answer, setAnswer] = useState("");
  const [bulk, setBulk] = useState("");

  useEffect(() => {
    if (!gameKey && editable.length) setGameKey(editable[0].key);
  }, [editable, gameKey]);

  const load = useCallback(async () => {
    if (!gameKey) return;
    setLoading(true);
    const { data } = await supabase
      .from("game_content")
      .select("*")
      .eq("game_key", gameKey)
      .order("created_at", { ascending: false });
    setRows((data || []) as unknown as ContentRow[]);
    setLoading(false);
  }, [gameKey]);

  useEffect(() => { load(); }, [load]);

  const kind = KIND_BY_GAME[gameKey] || "word";
  const needsAnswer = NEEDS_ANSWER.includes(gameKey);

  const addItem = async () => {
    if (!value.trim()) return;
    const { error } = await supabase.from("game_content").insert({
      game_key: gameKey,
      kind,
      value: kind === "word" ? value.trim().toUpperCase() : value.trim(),
      hint: hint.trim() || null,
      extra: needsAnswer && answer.trim() ? { answer: answer.trim() } : {},
    });
    if (error) return toast({ title: "Could not add", description: error.message, variant: "destructive" });
    setValue(""); setHint(""); setAnswer("");
    toast({ title: "Item added" });
    load();
  };

  const importBulk = async () => {
    const lines = bulk.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;
    const payload = lines.map((line) => {
      const [v, a, h] = line.split("|").map((x) => (x || "").trim());
      return {
        game_key: gameKey,
        kind,
        value: kind === "word" ? v.toUpperCase() : v,
        hint: h || null,
        extra: needsAnswer && a ? { answer: a } : {},
      };
    });
    const { error } = await supabase.from("game_content").insert(payload);
    if (error) return toast({ title: "Import failed", description: error.message, variant: "destructive" });
    setBulk("");
    toast({ title: `Imported ${payload.length} items` });
    load();
  };

  const toggle = async (r: ContentRow, v: boolean) => {
    setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, is_active: v } : x)));
    await supabase.from("game_content").update({ is_active: v }).eq("id", r.id);
  };

  const saveRow = async (r: ContentRow) => {
    const { error } = await supabase
      .from("game_content")
      .update({ value: r.value, hint: r.hint, extra: r.extra || {} })
      .eq("id", r.id);
    toast({
      title: error ? "Save failed" : "Saved",
      description: error?.message,
      variant: error ? "destructive" : undefined,
    });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("game_content").delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    setRows((rs) => rs.filter((r) => r.id !== id));
  };

  const exportCsv = () => {
    const csv = ["value|answer|hint", ...rows.map((r) => `${r.value}|${r.extra?.answer || ""}|${r.hint || ""}`)].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${gameKey}-content.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = rows.filter((r) => r.value.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-52">
          <Label className="text-xs">Game</Label>
          <Select value={gameKey} onValueChange={setGameKey}>
            <SelectTrigger><SelectValue placeholder="Choose a game" /></SelectTrigger>
            <SelectContent>
              {editable.map((g) => <SelectItem key={g.key} value={g.key}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-48">
          <Label className="text-xs">Search</Label>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" placeholder="Filter items" />
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Export</Button>
        <Badge variant="secondary">{rows.length} items · kind: {kind}</Badge>
      </div>

      <Card>
        <CardContent className="p-4 grid gap-3 md:grid-cols-4 items-end">
          <div className="md:col-span-2">
            <Label className="text-xs">{kind === "passage" ? "Passage" : kind === "riddle" ? "Riddle" : kind === "place" ? "Place" : kind === "prompt" ? "Prompt" : "Word"}</Label>
            <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Add a new item" />
          </div>
          {needsAnswer && (
            <div>
              <Label className="text-xs">Answer</Label>
              <Input value={answer} onChange={(e) => setAnswer(e.target.value)} />
            </div>
          )}
          <div>
            <Label className="text-xs">Hint (optional)</Label>
            <Input value={hint} onChange={(e) => setHint(e.target.value)} />
          </div>
          <Button onClick={addItem} disabled={!gameKey}><Plus className="h-4 w-4 mr-1" />Add</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-2">
          <Label className="text-xs">Bulk import — one per line, format: <code>value | answer | hint</code></Label>
          <Textarea rows={4} value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={"NOVEL | | A long work of fiction\nATLAS | | A book of maps"} />
          <Button size="sm" onClick={importBulk} disabled={!bulk.trim()}><Upload className="h-4 w-4 mr-1" />Import items</Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-3 grid gap-2 md:grid-cols-12 items-center">
                <Input
                  className="md:col-span-5"
                  value={r.value}
                  onChange={(e) => setRows((rs) => rs.map((x) => x.id === r.id ? { ...x, value: e.target.value } : x))}
                />
                {needsAnswer && (
                  <Input
                    className="md:col-span-3"
                    placeholder="Answer"
                    value={r.extra?.answer || ""}
                    onChange={(e) => setRows((rs) => rs.map((x) => x.id === r.id ? { ...x, extra: { ...(x.extra || {}), answer: e.target.value } } : x))}
                  />
                )}
                <Input
                  className={needsAnswer ? "md:col-span-2" : "md:col-span-5"}
                  placeholder="Hint"
                  value={r.hint || ""}
                  onChange={(e) => setRows((rs) => rs.map((x) => x.id === r.id ? { ...x, hint: e.target.value } : x))}
                />
                <div className="md:col-span-2 flex items-center gap-2 justify-end">
                  <Switch checked={r.is_active} onCheckedChange={(v) => toggle(r, v)} />
                  <Button size="sm" variant="outline" onClick={() => saveRow(r)}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!filtered.length && <p className="text-sm text-muted-foreground text-center py-6">No items yet for this game.</p>}
        </div>
      )}
    </div>
  );
}
