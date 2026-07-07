import { useState } from "react";
import Papa from "papaparse";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileDown, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const SAMPLE_CSV = `email,first_name,last_name,student_class,roll_number,admission_number,phone,password
student1@example.com,Aarav,Sharma,8,12,2024A001,9876543210,
student2@example.com,Diya,Patel,9,07,2024A002,,Welcome@123`;

interface ResultRow { email: string; success: boolean; password?: string; error?: string }

const BulkImportStudents = ({ onImported }: { onImported?: () => void }) => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
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
        const cleaned = (res.data as any[]).filter(r => r.email && r.first_name);
        setRows(cleaned);
        if (cleaned.length === 0) {
          toast({ title: "No valid rows", description: "Make sure your CSV has 'email' and 'first_name' columns.", variant: "destructive" });
        }
      },
      error: (err) => toast({ title: "Parse error", description: err.message, variant: "destructive" }),
    });
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "students-sample.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const submit = async () => {
    if (rows.length === 0) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-bulk-create-users", { body: { rows } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const r = (data as any).results as ResultRow[];
      setResults(r);
      const ok = r.filter(x => x.success).length;
      toast({ title: "Import complete", description: `${ok}/${r.length} students created successfully.` });
      onImported?.();
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const downloadResults = () => {
    const csv = Papa.unparse(results);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "import-results.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Upload className="h-4 w-4 mr-2" />Bulk Import</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Import Students</DialogTitle>
          <DialogDescription>
            Upload a CSV to create multiple student accounts. Required columns: <code>admission_number</code> (5 digits), <code>email</code>, <code>first_name</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={downloadSample}>
              <FileDown className="h-4 w-4 mr-2" />Download sample CSV
            </Button>
            <label className="inline-flex">
              <input
                type="file" accept=".csv" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <span className="inline-flex items-center px-3 py-1.5 text-sm rounded-md border border-input bg-background hover:bg-accent cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />Choose CSV file
              </span>
            </label>
            {fileName && <Badge variant="secondary" className="self-center">{fileName} · {rows.length} rows</Badge>}
          </div>

          {rows.length > 0 && results.length === 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-3 py-2 text-xs font-medium">Preview (first 5)</div>
              <div className="text-xs">
                {rows.slice(0, 5).map((r, i) => (
                  <div key={i} className="px-3 py-1.5 border-t flex flex-wrap gap-3">
                    <span className="font-medium">{r.first_name} {r.last_name}</span>
                    <span className="text-muted-foreground">{r.email}</span>
                    {r.student_class && <span className="text-muted-foreground">Class {r.student_class}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-3 py-2 text-xs font-medium flex items-center justify-between">
                <span>Results ({results.filter(r => r.success).length} ok / {results.filter(r => !r.success).length} failed)</span>
                <Button size="sm" variant="ghost" onClick={downloadResults}>
                  <FileDown className="h-3 w-3 mr-1" />Download with passwords
                </Button>
              </div>
              <ScrollArea className="max-h-64">
                {results.map((r, i) => (
                  <div key={i} className="px-3 py-1.5 border-t text-xs flex items-center gap-2">
                    {r.success
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                      : <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                    <span className="font-mono">{r.email}</span>
                    {r.success
                      ? <span className="text-muted-foreground ml-auto">pwd: <code>{r.password}</code></span>
                      : <span className="text-destructive ml-auto">{r.error}</span>}
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          <Button onClick={submit} disabled={loading || rows.length === 0 || results.length > 0} className="gradient-primary border-0">
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing...</> : `Import ${rows.length} student${rows.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkImportStudents;
