import { useState } from "react";
import Papa from "papaparse";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileDown, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const SAMPLE_CSV = `title,author,accession_number,language,category,subject,class_level,description,total_copies
The Alchemist,Paulo Coelho,KV-ACC-1001,English,Fiction,,,A shepherd boy's journey,3
Wings of Fire,A.P.J. Abdul Kalam,KV-ACC-1002,English,Biography,,,Autobiography,5
Physics Class 11,NCERT,KV-ACC-1003,English,Textbook,Physics,11,Class 11 Physics,10`;

const BulkImportBooks = ({ onImported }: { onImported?: () => void }) => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [results, setResults] = useState<{ title: string; success: boolean; error?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const { toast } = useToast();

  const reset = () => { setRows([]); setResults([]); setFileName(""); };

  const handleFile = (file: File) => {
    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
      complete: (res) => {
        const cleaned = (res.data as any[]).filter(r => r.title && r.author);
        setRows(cleaned);
        if (cleaned.length === 0) {
          toast({ title: "No valid rows", description: "Make sure your CSV has 'title' and 'author' columns.", variant: "destructive" });
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
      const { error } = await supabase.from("books").insert({
        title: String(r.title).trim(),
        author: String(r.author).trim(),
        accession_number: accession,
        language: r.language?.trim() || null,
        category: r.category?.trim() || null,
        subject: r.subject?.trim() || null,
        class_level: r.class_level?.trim() || null,
        description: r.description?.trim() || null,
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
            Upload a CSV. Required: <code>title</code>, <code>author</code>. Optional: <code>accession_number</code> (library book code), <code>language</code>, <code>category</code>, <code>subject</code>, <code>class_level</code>, <code>total_copies</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
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

          {results.length > 0 && (
            <div className="border rounded-lg max-h-72 overflow-y-auto">
              {results.map((r, i) => (
                <div key={i} className="px-3 py-1.5 border-b last:border-0 text-xs flex items-center gap-2">
                  {r.success
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    : <XCircle className="h-3.5 w-3.5 text-destructive" />}
                  <span>{r.title}</span>
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
