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
import { Plus, Trash2, Upload, Download, Search, FileSpreadsheet, AlertCircle, X } from "lucide-react";
import Papa from "papaparse";

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
  const [previewRows, setPreviewRows] = useState<{ value: string; answer: string; hint: string }[]>([]);
  const [fileLoading, setFileLoading] = useState(false);

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

  const downloadSampleCsv = () => {
    if (!gameKey) return;
    let headers = "value,hint";
    let example = "NOVEL,A long work of fiction\nATLAS,A book of maps";
    if (needsAnswer) {
      headers = "value,answer,hint";
      example = "What has keys but no locks?,piano,A musical instrument\nWhat has hands but cannot clap?,clock,Tells time";
    } else if (kind === "passage") {
      headers = "passage,hint";
      example = "\"A book is a gift you can open again and again.\",Garrison Keillor\n\"Reading is to the mind what exercise is to the body.\",Joseph Addison";
    } else if (kind === "prompt") {
      headers = "prompt,hint";
      example = "A library building in the future,A creative theme\nDraw a magical spell book,A fantasy theme";
    } else if (kind === "place") {
      headers = "place,answer,hint";
      example = "Where is Sherlock Holmes' home?,221B Baker Street,London\nWhere is Hogwarts School of Witchcraft and Wizardry?,Scotland,Harry Potter setting";
    } else if (kind === "word") {
      headers = "word,hint";
      example = "NOVEL,A long work of fiction\nATLAS,A book of maps";
    }

    const csvContent = `${headers}\n${example}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${gameKey}_sample.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedData = results.data as any[];
        if (!parsedData.length) {
          toast({ title: "Empty file", description: "No data found in the CSV.", variant: "destructive" });
          return;
        }

        const formatted = parsedData.map((row) => {
          const keys = Object.keys(row);
          const valKey = keys.find(k => ["value", "word", "passage", "prompt", "riddle", "place"].includes(k.toLowerCase().trim()));
          const ansKey = keys.find(k => ["answer", "solution"].includes(k.toLowerCase().trim()));
          const hintKey = keys.find(k => ["hint"].includes(k.toLowerCase().trim()));

          const v = valKey ? row[valKey] : "";
          const a = ansKey ? row[ansKey] : "";
          const h = hintKey ? row[hintKey] : "";

          return {
            value: v || "",
            answer: a || "",
            hint: h || "",
          };
        }).filter(item => item.value.trim().length > 0);

        if (!formatted.length) {
          toast({ title: "No valid rows", description: "Could not find a value or content column (e.g. word, passage, riddle, etc.).", variant: "destructive" });
          return;
        }

        setPreviewRows(formatted);
        toast({ title: "CSV Parsed", description: `Found ${formatted.length} valid rows. Preview them below.` });
        
        // Clear file input
        e.target.value = "";
      },
      error: (error) => {
        toast({ title: "Error parsing CSV", description: error.message, variant: "destructive" });
      }
    });
  };

  const importPreviewRows = async () => {
    if (!previewRows.length || !gameKey) return;
    setFileLoading(true);

    const payload = previewRows.map((row) => {
      const v = row.value.trim();
      const a = row.answer.trim();
      const h = row.hint.trim();

      return {
        game_key: gameKey,
        kind,
        value: kind === "word" ? v.toUpperCase() : v,
        hint: h || null,
        extra: needsAnswer && a ? { answer: a } : {},
      };
    });

    const { error } = await supabase.from("game_content").insert(payload);
    setFileLoading(false);

    if (error) {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Imported ${payload.length} items successfully.` });
      setPreviewRows([]);
      load();
    }
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

  if (editable.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-8 text-center text-sm text-muted-foreground space-y-3">
          <p className="font-semibold text-base">No games synced yet</p>
          <p className="max-w-md mx-auto text-xs">
            There are no games in the database that support custom content management yet.
            Please go to the <strong>Game settings</strong> tab and click <strong>Sync Games</strong> to initialize the developed games list.
          </p>
        </CardContent>
      </Card>
    );
  }

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

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-1.5">
              <FileSpreadsheet className="h-4 w-4 text-primary" /> CSV File Import
            </h3>
            <p className="text-xs text-muted-foreground">
              Import game content from a spreadsheet. Column headers can be: <code>word/passage/riddle/place</code>, <code>answer</code>, and <code>hint</code>.
            </p>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  disabled={!gameKey}
                  className="hidden"
                  id="csv-file-upload"
                />
                <Button asChild variant="outline" size="sm" disabled={!gameKey}>
                  <label htmlFor="csv-file-upload" className="cursor-pointer flex items-center gap-1.5">
                    <Upload className="h-4 w-4" /> Upload CSV File
                  </label>
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={downloadSampleCsv} disabled={!gameKey} className="text-xs">
                <Download className="h-3.5 w-3.5 mr-1" /> Template CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-primary" /> Pipe-separated Bulk Paste
            </h3>
            <p className="text-xs text-muted-foreground">
              Paste lines in format: <code>value | answer (optional) | hint (optional)</code>
            </p>
            <div className="space-y-2">
              <Textarea
                rows={2}
                value={bulk}
                onChange={(e) => setBulk(e.target.value)}
                placeholder={needsAnswer ? "What tells time? | clock | A device" : "NOVEL | | A work of fiction"}
                disabled={!gameKey}
                className="text-xs"
              />
              <Button size="sm" onClick={importBulk} disabled={!bulk.trim() || !gameKey} className="w-full sm:w-auto">
                <Upload className="h-4 w-4 mr-1.5" /> Import pasted items
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {previewRows.length > 0 && (
        <Card className="border-primary bg-primary/5 dark:bg-primary/10">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-1.5 text-primary">
                  <AlertCircle className="h-4 w-4" /> CSV Import Preview ({previewRows.length} items)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Confirm the parsed data below before importing to database.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={importPreviewRows} disabled={fileLoading}>
                  {fileLoading ? "Importing..." : "Confirm & Import"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPreviewRows([])}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto border rounded-lg bg-background text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted border-b">
                    <th className="p-2 font-medium">Value / Content</th>
                    {needsAnswer && <th className="p-2 font-medium">Answer</th>}
                    <th className="p-2 font-medium">Hint</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.slice(0, 10).map((row, idx) => (
                    <tr key={idx} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="p-2 truncate max-w-xs">{row.value}</td>
                      {needsAnswer && <td className="p-2 truncate max-w-xs">{row.answer}</td>}
                      <td className="p-2 truncate max-w-xs">{row.hint || <span className="text-muted-foreground italic">None</span>}</td>
                    </tr>
                  ))}
                  {previewRows.length > 10 && (
                    <tr>
                      <td colSpan={needsAnswer ? 3 : 2} className="p-2 text-center text-muted-foreground bg-muted/20 font-medium">
                        ... and {previewRows.length - 10} more rows
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

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
