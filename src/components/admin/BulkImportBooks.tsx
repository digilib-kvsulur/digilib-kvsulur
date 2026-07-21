import { useState } from "react";
import Papa from "papaparse";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileDown, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { fetchBookByQuery } from "@/lib/bookApi";

const SAMPLE_CSV = `book_name,author_name,acession_number,total_copies
The Alchemist,Paulo Coelho,KV-ACC-1001,3
Wings of Fire,A.P.J. Abdul Kalam,KV-ACC-1002,5
Physics Class 11,NCERT,KV-ACC-1003,10`;

const BulkImportBooks = ({ onImported }: { onImported?: () => void }) => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [results, setResults] = useState<{ title: string; success: boolean; error?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [autofetch, setAutofetch] = useState(false);
  const { toast } = useToast();

  const reset = () => { setRows([]); setResults([]); setFileName(""); setAutofetch(false); };

  const handleFile = (file: File) => {
    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => {
        const clean = h.trim().toLowerCase().replace(/\s+/g, "_");
        if (clean === "book_name" || clean === "book_title" || clean === "name" || clean === "title") return "title";
        if (clean === "author_name" || clean === "author") return "author";
        if (clean === "acession_number" || clean === "accession_number" || clean === "accession") return "accession_number";
        return clean;
      },
      complete: (res) => {
        const cleaned = (res.data as any[]).filter(r => r.title && r.author);
        setRows(cleaned);
        if (cleaned.length === 0) {
          toast({ title: "No valid rows", description: "Make sure your CSV has 'BOOK NAME' and 'AUTHOR NAME' columns.", variant: "destructive" });
        }
      },
    });
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "books-sample.csv"; a.click();
  };

  const submit = async () => {
    if (rows.length === 0) return;
    setLoading(true);
    const out: { title: string; success: boolean; error?: string }[] = [];
    for (const r of rows) {
      const copies = Math.max(1, parseInt(r.total_copies) || 1);
      const accession = (r.accession_number || r.accession_code || r.library_book_code || r.library_code)?.trim() || null;
      
      let fetchedDetails = {};
      if (autofetch) {
        try {
          const details = await fetchBookByQuery(r.title, r.author);
          if (details) {
            fetchedDetails = {
              description: details.description || null,
              cover_url: details.cover_url || null,
              category: details.category || null,
              subject: details.subject || null,
              language: details.language || null,
            };
          }
        } catch (err) {
          console.error("Autofetch error for book:", r.title, err);
        }
      }

      const { error } = await supabase.from("books").insert({
        title: String(r.title).trim(),
        author: String(r.author).trim(),
        accession_number: accession,
        language: r.language?.trim() || (fetchedDetails as any).language || null,
        category: r.category?.trim() || (fetchedDetails as any).category || null,
        subject: r.subject?.trim() || (fetchedDetails as any).subject || null,
        class_level: r.class_level?.trim() || null,
        description: r.description?.trim() || (fetchedDetails as any).description || null,
        cover_url: r.cover_url?.trim() || (fetchedDetails as any).cover_url || null,
        total_copies: copies,
        available_copies: copies,
      });
      out.push({ title: r.title, success: !error, error: error?.message });
    }
    setResults(out);
    const ok = out.filter(x => x.success).length;
    toast({ title: "Import complete", description: `${ok}/${out.length} books added.` });
    onImported?.();
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Upload className="h-4 w-4 mr-2" />Bulk Import</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Books</DialogTitle>
          <DialogDescription>
            Upload a CSV containing books. Required columns: <code>BOOK NAME</code> (or <code>title</code>), <code>AUTHOR NAME</code> (or <code>author</code>). Optional: <code>ACESSION NUMBER</code>, <code>total_copies</code>, etc.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap items-center">
            <Button variant="outline" size="sm" onClick={downloadSample}>
              <FileDown className="h-4 w-4 mr-2" />Sample CSV
            </Button>
            <label className="inline-flex">
              <input type="file" accept=".csv" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              <span className="inline-flex items-center px-3 py-1.5 text-sm rounded-md border border-input bg-background hover:bg-accent cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />Choose CSV
              </span>
            </label>
            {fileName && <Badge variant="secondary" className="self-center">{fileName} · {rows.length} rows</Badge>}
          </div>

          <div className="flex items-center space-x-2 border rounded-lg p-3 bg-indigo-500/5 border-indigo-400/20">
            <input 
              type="checkbox" 
              id="bulk-autofetch" 
              checked={autofetch} 
              onChange={(e) => setAutofetch(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" 
            />
            <label htmlFor="bulk-autofetch" className="text-xs font-semibold text-foreground cursor-pointer select-none">
              Auto-fetch missing covers and descriptions from internet (Google Books / Open Library)
            </label>
          </div>

          {rows.length > 0 && results.length === 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-3 py-2 text-xs font-medium">Preview (first 5)</div>
              <div className="text-xs">
                {rows.slice(0, 5).map((r, i) => (
                  <div key={i} className="px-3 py-1.5 border-t flex flex-wrap gap-3">
                    <span className="font-medium">{r.title}</span>
                    <span className="text-muted-foreground">by {r.author}</span>
                    {r.accession_number && <span className="text-muted-foreground">Acc: {r.accession_number}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="border rounded-lg max-h-72 overflow-y-auto">
              <div className="bg-muted px-3 py-2 text-xs font-medium">Results ({results.filter(r => r.success).length} ok / {results.filter(r => !r.success).length} failed)</div>
              {results.map((r, i) => (
                <div key={i} className="px-3 py-1.5 border-b last:border-0 text-xs flex items-center gap-2">
                  {r.success
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                    : <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                  <span className="font-medium truncate max-w-sm">{r.title}</span>
                  {r.error && <span className="text-destructive ml-auto">{r.error}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          <Button onClick={submit} disabled={loading || rows.length === 0 || results.length > 0} className="gradient-primary border-0">
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing...</> : `Import ${rows.length} book${rows.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkImportBooks;
