import { useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Upload, Image as ImageIcon, Loader2, CheckCircle2, Search, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { downloadCsv, parseCsv, fetchAllBooks } from "./BookShelfData";

export default function BookCoverData() {
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{ updated: number; skipped: number; errors: string[] } | null>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const exportCoverSheet = async () => {
    setBusy("cover-export");
    try {
      const books = await fetchAllBooks();
      downloadCsv(
        `book-covers-${new Date().toISOString().slice(0, 10)}.csv`,
        books,
        ["accession_number", "title", "author", "cover_url"]
      );
      toast({ title: "Cover sheet ready", description: "Fill the cover_url column and re-import." });
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const importCovers = async (file: File) => {
    setBusy("cover-import");
    setResult(null);
    try {
      const rows = parseCsv(await file.text());
      let updated = 0, skipped = 0;
      const errors: string[] = [];
      for (const r of rows) {
        const acc = (r.accession_number || "").trim();
        const cover = (r.cover_url || "").trim();
        if (!acc || !cover) { skipped++; continue; }
        const { error } = await supabase.from("books").update({ cover_url: cover }).eq("accession_number", acc);
        if (error) errors.push(`${acc}: ${error.message}`); else updated++;
      }
      setResult({ updated, skipped, errors });
      toast({ title: "Covers updated", description: `${updated} book covers set.` });
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const runSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("books")
        .select("id, title, author, accession_number, cover_url")
        .or(`title.ilike.%${q}%,author.ilike.%${q}%,accession_number.ilike.%${q}%`)
        .order("title")
        .limit(25);
      if (error) throw error;
      setMatches(data || []);
      setEdits(Object.fromEntries((data || []).map((b: any) => [b.id, b.cover_url || ""])));
      if (!data?.length) toast({ title: "No books found", description: `Nothing matched "${q}".` });
    } catch (e: any) {
      toast({ title: "Search failed", description: e.message, variant: "destructive" });
    } finally { setSearching(false); }
  };

  const saveOne = async (id: string) => {
    setSavingId(id);
    try {
      const { error } = await supabase.from("books")
        .update({ cover_url: edits[id]?.trim() || null, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      setMatches(m => m.map(b => b.id === id ? { ...b, cover_url: edits[id] } : b));
      toast({ title: "Saved", description: "Cover page updated." });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally { setSavingId(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ImageIcon className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold text-foreground">Cover Page Management</h2>
          <p className="text-sm text-muted-foreground">Set book cover images individually or with the bulk cover sheet.</p>
        </div>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Search className="h-4 w-4" /> Quick Cover Entry</CardTitle>
          <CardDescription>Search a book and paste its cover image URL — saved instantly.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search book title, author or accession number…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") runSearch(); }}
              />
            </div>
            <Button onClick={runSearch} disabled={searching || !query.trim()}>
              {searching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Search
            </Button>
          </div>

          <div className="space-y-2">
            {matches.map(b => (
              <div key={b.id} className="flex flex-col md:flex-row md:items-center gap-3 p-3 rounded-xl border border-border/50 bg-card">
                <div className="w-12 h-16 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                  {edits[b.id] ? (
                    <img src={edits[b.id]} alt={`${b.title} cover`} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{b.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {b.author} {b.accession_number ? `· Acc: ${b.accession_number}` : ""}
                  </p>
                </div>
                <Input
                  className="md:w-72"
                  placeholder="https://…/cover.jpg"
                  value={edits[b.id] ?? ""}
                  onChange={e => setEdits(s => ({ ...s, [b.id]: e.target.value }))}
                />
                <Button size="sm" onClick={() => saveOne(b.id)} disabled={savingId === b.id}>
                  {savingId === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span className="ml-2 md:hidden">Save</span>
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Download className="h-4 w-4" /> Export Cover Sheet</CardTitle>
            <CardDescription>Export accession number, title and current cover URL as CSV.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={exportCoverSheet} disabled={busy !== null}>
              {busy === "cover-export" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Export Cover Sheet
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Upload className="h-4 w-4" /> Import Cover Pages</CardTitle>
            <CardDescription>Upload the cover sheet with cover_url filled to set covers in bulk.</CardDescription>
          </CardHeader>
          <CardContent>
            <input ref={coverInput} type="file" accept=".csv" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) importCovers(f); e.target.value = ""; }} />
            <Button variant="outline" className="w-full" onClick={() => coverInput.current?.click()} disabled={busy !== null}>
              {busy === "cover-import" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload Cover CSV
            </Button>
          </CardContent>
        </Card>
      </div>

      {result && (
        <Alert className="border-success/30 bg-success/5">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <AlertDescription className="text-sm">
            <strong>{result.updated}</strong> covers saved · <strong>{result.skipped}</strong> skipped
            {result.errors.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto text-xs text-destructive space-y-0.5">
                {result.errors.slice(0, 25).map((e, i) => <div key={i}>{e}</div>)}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
