import { useState } from "react";
import Papa from "papaparse";
import { AlertTriangle, CheckCircle2, FileDown, Loader2, Upload, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Mode = "set" | "reduce";
type Status = "valid" | "error";

interface ImportRow {
  rowNumber: number;
  identifier: string;
  points: number | null;
  status: Status;
  note: string;
}

interface ImportResult {
  rowNumber: number;
  identifier: string;
  success: boolean;
  previousPoints?: number;
  newPoints?: number;
  error?: string;
}

const SAMPLE_CSV = `admission_number,points
12345,250
12346,100`;

const normalizeHeader = (header: string) => {
  const clean = header.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (["admission_number", "student_uid", "uid", "identifier", "username", "roll_number"].includes(clean)) return "identifier";
  if (["points", "point", "points_to_set", "points_to_reduce", "amount"].includes(clean)) return "points";
  return clean;
};

const BulkImportPoints = ({ onImported }: { onImported?: () => void }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("set");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const reset = () => {
    setRows([]);
    setResults([]);
    setFileName("");
    setMode("set");
  };

  const downloadSample = () => {
    const url = URL.createObjectURL(new Blob([SAMPLE_CSV], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "points-import-sample.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
    setResults([]);
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: normalizeHeader,
      complete: ({ data, meta }) => {
        const hasIdentifier = meta.fields?.includes("identifier");
        const hasPoints = meta.fields?.includes("points");
        if (!hasIdentifier || !hasPoints) {
          setRows([]);
          toast({ title: "CSV columns missing", description: "Use an admission_number (or identifier) column and a points column.", variant: "destructive" });
          return;
        }
        if (data.length > 1000) {
          setRows([]);
          toast({ title: "CSV is too large", description: "Import up to 1,000 users at a time.", variant: "destructive" });
          return;
        }

        const seen = new Set<string>();
        const parsed = data.map((record, index): ImportRow => {
          const identifier = String(record.identifier ?? "").trim();
          const rawPoints = String(record.points ?? "").trim();
          const points = rawPoints === "" ? null : Number(rawPoints);
          let note = "Ready to import";
          let status: Status = "valid";

          if (!identifier) { status = "error"; note = "Missing user identifier"; }
          else if (seen.has(identifier.toLowerCase())) { status = "error"; note = "Duplicate identifier in CSV"; }
          else if (points === null || !Number.isInteger(points) || points < 0) { status = "error"; note = "Points must be a whole number of zero or more"; }
          seen.add(identifier.toLowerCase());
          return { rowNumber: index + 2, identifier, points, status, note };
        });
        setRows(parsed);
        const invalid = parsed.filter((row) => row.status === "error").length;
        toast({ title: invalid ? "CSV needs attention" : "CSV is ready", description: `${parsed.length - invalid} valid row${parsed.length - invalid === 1 ? "" : "s"}${invalid ? `, ${invalid} invalid` : ""}.`, variant: invalid ? "destructive" : "default" });
      },
    });
  };

  const submit = async () => {
    const importable = rows.filter((row) => row.status === "valid");
    if (!importable.length) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-bulk-adjust-points", {
        body: { mode, rows: importable.map(({ rowNumber, identifier, points }) => ({ rowNumber, identifier, points })) },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const importResults = (data?.results || []) as ImportResult[];
      setResults(importResults);
      const succeeded = importResults.filter((result) => result.success).length;
      toast({ title: "Points import completed", description: `${succeeded} updated, ${importResults.length - succeeded} skipped.` });
      if (succeeded) onImported?.();
    } catch (error: any) {
      toast({ title: "Points import failed", description: error.message || "Unable to update points.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const validCount = rows.filter((row) => row.status === "valid").length;
  const errors = rows.length - validCount;
  const succeeded = results.filter((result) => result.success).length;

  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2"><Upload className="h-4 w-4" /> Import Points CSV</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Set or Reduce Points</DialogTitle>
          <DialogDescription>
            Upload a CSV with <span className="font-mono">admission_number</span> and <span className="font-mono">points</span>. Use Set total to replace a total, or Reduce by to deduct points without going below zero.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 min-h-0">
          <div className="flex flex-wrap gap-2 items-center">
            <Button size="sm" variant="outline" onClick={downloadSample}><FileDown className="h-4 w-4 mr-2" /> Sample CSV</Button>
            <label className="inline-flex">
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => event.target.files?.[0] && handleFile(event.target.files[0])} />
              <span className="inline-flex items-center px-3 py-1.5 text-sm rounded-md border border-input bg-background hover:bg-accent cursor-pointer font-medium"><Upload className="h-4 w-4 mr-2" /> Choose CSV</span>
            </label>
            {fileName && <Badge variant="secondary">{fileName} · {rows.length} rows</Badge>}
            <Select value={mode} onValueChange={(value) => setMode(value as Mode)} disabled={results.length > 0}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="set">Set total points</SelectItem><SelectItem value="reduce">Reduce points by</SelectItem></SelectContent>
            </Select>
          </div>

          {rows.length > 0 && results.length === 0 && <div className="flex gap-2 text-xs"><Badge variant="outline" className="text-emerald-700 bg-emerald-50"><CheckCircle2 className="h-3 w-3 mr-1" /> {validCount} ready</Badge>{errors > 0 && <Badge variant="outline" className="text-destructive bg-destructive/5"><XCircle className="h-3 w-3 mr-1" /> {errors} invalid</Badge>}</div>}

          {rows.length > 0 && results.length === 0 && <ScrollArea className="h-[300px] rounded-md border">
            <div className="divide-y text-sm">{rows.map((row) => <div key={row.rowNumber} className="flex items-center justify-between gap-4 px-3 py-2.5"><div className="min-w-0"><span className="font-medium">{row.identifier || "(missing identifier)"}</span><span className="ml-2 text-muted-foreground">{row.points ?? "—"} points</span></div><span className={row.status === "valid" ? "text-emerald-700 text-xs" : "text-destructive text-xs flex items-center gap-1"}>{row.status === "valid" ? row.note : <><AlertTriangle className="h-3.5 w-3.5" /> {row.note}</>}</span></div>)}</div>
          </ScrollArea>}

          {results.length > 0 && <ScrollArea className="h-[300px] rounded-md border"><div className="sticky top-0 bg-muted px-3 py-2 text-xs font-semibold border-b">{succeeded} updated / {results.length - succeeded} skipped</div><div className="divide-y text-sm">{results.map((result) => <div key={result.rowNumber} className="flex items-center justify-between gap-4 px-3 py-2.5"><div><span className="font-medium">{result.identifier}</span>{result.success && <span className="ml-2 text-muted-foreground">{result.previousPoints} → {result.newPoints} points</span>}</div><span className={result.success ? "text-emerald-700 text-xs" : "text-destructive text-xs"}>{result.success ? "Updated" : result.error}</span></div>)}</div></ScrollArea>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          <Button onClick={submit} disabled={loading || validCount === 0 || results.length > 0}>{loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Updating…</> : `${mode === "set" ? "Set" : "Reduce"} Points for ${validCount} Users`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkImportPoints;
