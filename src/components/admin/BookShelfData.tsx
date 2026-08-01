import { useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Upload, Image as ImageIcon, Database, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const csvEscape = (v: any) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const download = (name: string, rows: any[], cols: string[]) => {
  const csv = [cols.join(","), ...rows.map(r => cols.map(c => csvEscape(r[c])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

const parseCsv = (text: string): Record<string, string>[] => {
  const rows: string[][] = [];
  let cur = "", row: string[] = [], inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(cur); cur = ""; }
    else if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else if (ch !== "\r") cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const header = (rows.shift() || []).map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return rows
    .filter(r => r.some(c => c.trim() !== ""))
    .map(r => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
};

const SHELF_COLS = [
  "accession_number", "title", "author", "category", "subject", "language",
  "class_level", "description", "total_copies", "available_copies", "cover_url",
];

export default function BookShelfData() {
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{ updated: number; skipped: number; errors: string[] } | null>(null);
  const shelfInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const fetchAllBooks = async () => {
    const all: any[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from("books").select("*").order("title").range(from, from + 999);
      if (error) throw error;
      all.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    return all;
  };

  const exportShelf = async () => {
    setBusy("shelf-export");
    try {
      const books = await fetchAllBooks();
      download(`book-shelf-${new Date().toISOString().slice(0, 10)}.csv`, books, SHELF_COLS);
      toast({ title: "Export ready", description: `${books.length} books exported.` });
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const exportCoverSheet = async () => {
    setBusy("cover-export");
    try {
      const books = await fetchAllBooks();
      download(
        `book-covers-${new Date().toISOString().slice(0, 10)}.csv`,
        books,
        ["accession_number", "title", "author", "cover_url"]
      );
      toast({ title: "Cover sheet ready", description: "Fill the cover_url column and re-import." });
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const importShelf = async (file: File) => {
    setBusy("shelf-import");
    setResult(null);
    try {
      const rows = parseCsv(await file.text());
      let updated = 0, skipped = 0;
      const errors: string[] = [];
      for (const r of rows) {
        const acc = (r.accession_number || "").trim();
        if (!acc || !r.title) { skipped++; continue; }
        const payload: any = {
          accession_number: acc,
          title: r.title,
          author: r.author || "Unknown",
          category: r.category || null,
          subject: r.subject || null,
          language: r.language || null,
          class_level: r.class_level || null,
          description: r.description || null,
          cover_url: r.cover_url || null,
          updated_at: new Date().toISOString(),
        };
        if (r.total_copies) payload.total_copies = Number(r.total_copies) || 1;
        if (r.available_copies) payload.available_copies = Number(r.available_copies) || 0;

        const { data: existing } = await supabase.from("books").select("id").eq("accession_number", acc).maybeSingle();
        const { error } = existing
          ? await supabase.from("books").update(payload).eq("id", existing.id)
          : await supabase.from("books").insert(payload);
        if (error) errors.push(`${acc}: ${error.message}`); else updated++;
      }
      setResult({ updated, skipped, errors });
      toast({ title: "Import complete", description: `${updated} rows saved, ${skipped} skipped.` });
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Database className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold text-foreground">Book Shelf Data</h2>
          <p className="text-sm text-muted-foreground">Export and import your full shelf catalogue and cover images.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Download className="h-4 w-4" /> Export Shelf Data</CardTitle>
            <CardDescription>Download every book with accession number, copies and metadata as CSV.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={exportShelf} disabled={busy !== null}>
              {busy === "shelf-export" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Export All Books
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Upload className="h-4 w-4" /> Import Shelf Data</CardTitle>
            <CardDescription>Upload the same CSV back — books are matched and updated by accession number.</CardDescription>
          </CardHeader>
          <CardContent>
            <input ref={shelfInput} type="file" accept=".csv" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) importShelf(f); e.target.value = ""; }} />
            <Button variant="outline" className="w-full" onClick={() => shelfInput.current?.click()} disabled={busy !== null}>
              {busy === "shelf-import" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload Shelf CSV
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Export Cover Sheet</CardTitle>
            <CardDescription>Bulk cover workflow: export accession number, title and current cover URL.</CardDescription>
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
            <CardTitle className="text-lg flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Import Cover Pages</CardTitle>
            <CardDescription>Upload the cover sheet with cover_url filled to set cover pages in bulk.</CardDescription>
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
            <strong>{result.updated}</strong> rows saved · <strong>{result.skipped}</strong> skipped
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
