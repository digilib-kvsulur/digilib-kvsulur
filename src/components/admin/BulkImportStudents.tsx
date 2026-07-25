import { useState } from "react";
import Papa from "papaparse";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileDown, CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

const SAMPLE_CSV = `student_uid,student_name,student_class,role
12345,Aarav Sharma,8,student
12346,Diya Patel,9,student
EMP001,Amit Kumar,8,teacher`;

interface ResultRow { email: string; success: boolean; password?: string; error?: string }

const BulkImportStudents = ({ onImported }: { onImported?: () => void }) => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [progressStatus, setProgressStatus] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const { toast } = useToast();

  const reset = () => { setRows([]); setResults([]); setFileName(""); setServerError(null); setProgressStatus(""); setProgressPercent(0); };

  const handleFile = (file: File) => {
    setFileName(file.name);
    setServerError(null);
    setResults([]);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => {
        const clean = h.trim().toLowerCase().replace(/\s+/g, "_");
        if (clean === "student_uid" || clean === "uid" || clean === "admission_number" || clean === "employee_id") return "student_uid";
        if (clean === "student_name" || clean === "name" || clean === "first_name" || clean === "teacher_name") return "student_name";
        if (clean === "student_class" || clean === "class" || clean === "assigned_class") return "student_class";
        if (clean === "role" || clean === "user_type") return "role";
        return clean;
      },
      complete: (res) => {
        const raw = (res.data as any[]).filter(r => r.student_uid && r.student_name);
        const cleaned = raw.filter(r => String(r.student_uid).trim().length > 0);
        const missing = (res.data as any[]).length - raw.length;
        setRows(cleaned);
        if (cleaned.length === 0) {
          toast({ title: "No valid rows", description: "CSV must have 'uid', and 'name' columns.", variant: "destructive" });
        } else if (missing > 0) {
          toast({ title: `${cleaned.length} valid rows found`, description: `${missing} row(s) skipped — missing required columns.` });
        } else {
          toast({ title: `${cleaned.length} user(s) ready`, description: "Review preview below then click Import." });
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

  const downloadTeacherSample = () => {
    const teacherCsv = `student_uid,student_name,student_class,role\nEMP001,Amit Kumar,8A,teacher\nEMP002,Priya Sharma,,teacher\nEMP003,Rahul Verma,10B,teacher`;
    const blob = new Blob([teacherCsv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "teachers-sample.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const submit = async () => {
    if (rows.length === 0) return;
    setLoading(true);
    setServerError(null);
    setResults([]);
    setProgressPercent(0);

    const formattedRows = rows.map(r => ({
      ...r,
      student_uid: String(r.student_uid).trim(),
      email: `${String(r.student_uid).trim()}@kvsulur.com`,
      role: r.role ? String(r.role).trim().toLowerCase() : 'student'
    }));

    const BATCH_SIZE = 100;
    const totalBatches = Math.ceil(formattedRows.length / BATCH_SIZE);
    const allResults: ResultRow[] = [];

    try {
      for (let i = 0; i < formattedRows.length; i += BATCH_SIZE) {
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const chunk = formattedRows.slice(i, i + BATCH_SIZE);
        const currentCount = Math.min(i + BATCH_SIZE, formattedRows.length);
        
        setProgressStatus(`Importing batch ${batchNum} of ${totalBatches} (${currentCount}/${formattedRows.length} students)...`);
        setProgressPercent(Math.round((currentCount / formattedRows.length) * 100));

        const { data, error } = await supabase.functions.invoke("admin-bulk-create-users", {
          body: { rows: chunk }
        });

        if (error) {
          throw new Error(`Batch ${batchNum} failed: ${error.message}`);
        }
        
        if ((data as any)?.error) {
          throw new Error(`Batch ${batchNum} error: ${(data as any).error}`);
        }

        const chunkResults = ((data as any).results as ResultRow[]) || [];
        allResults.push(...chunkResults);
        setResults([...allResults]);
      }

      // Final auto-sync to ensure all auth users have profile rows in public.profiles
      try {
        const { error: rpcErr } = await supabase.rpc("sync_missing_auth_profiles");
        if (rpcErr) {
          await supabase.functions.invoke("admin-bulk-create-users", {
            body: { action: "sync_all_auth_users" }
          });
        }
      } catch (_) {}

      const ok = allResults.filter(x => x.success).length;
      if (ok > 0) {
        toast({ title: "Import Complete", description: `${ok}/${allResults.length} students processed successfully!` });
        onImported?.();
      } else {
        toast({ 
          title: "0 Students Imported", 
          description: "See the detailed response errors below.", 
          variant: "destructive" 
        });
      }
    } catch (e: any) {
      console.error("Bulk import error:", e);
      setServerError(e.message || "Edge function failed during batch import.");
      toast({ title: "Import stopped early", description: e.message, variant: "destructive" });
    } finally { 
      setLoading(false); 
      setProgressStatus("");
    }
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
    <Dialog open={open} onOpenChange={(o) => { if (!loading) { setOpen(o); if (!o) reset(); } }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Upload className="h-4 w-4 mr-2" />Bulk Import</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Import Students</DialogTitle>
          <DialogDescription>
            Upload a CSV to create multiple student accounts. Required columns: <code>student_uid</code>, <code>student_name</code>, and <code>student_class</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {serverError && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs font-semibold">{serverError}</AlertDescription>
            </Alert>
          )}

          {loading && (
            <div className="space-y-2 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                  {progressStatus}
                </span>
                <span>{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-2 bg-indigo-200" />
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={downloadSample} disabled={loading}>
              <FileDown className="h-4 w-4 mr-2" />Student CSV Template
            </Button>
            <Button variant="outline" size="sm" onClick={downloadTeacherSample} disabled={loading}>
              <FileDown className="h-4 w-4 mr-2" />Teacher CSV Template
            </Button>
            <label className="inline-flex">
              <input
                type="file" accept=".csv" className="hidden" disabled={loading}
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <span className={`inline-flex items-center px-3 py-1.5 text-sm rounded-md border border-input bg-background cursor-pointer ${loading ? "opacity-50 pointer-events-none" : "hover:bg-accent"}`}>
                <Upload className="h-4 w-4 mr-2" />Choose CSV file
              </span>
            </label>
            {fileName && <Badge variant="secondary" className="self-center">{fileName} · {rows.length} rows</Badge>}
          </div>

          {rows.length > 0 && results.length === 0 && !loading && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-3 py-2 text-xs font-medium">Preview (first 5)</div>
              <div className="text-xs">
                {rows.slice(0, 5).map((r, i) => (
                  <div key={i} className="px-3 py-1.5 border-t flex flex-wrap gap-3">
                    <span className="font-medium">UID: {r.student_uid}</span>
                    <span className="text-muted-foreground">{r.student_name}</span>
                    {r.student_class && <span className="text-muted-foreground">Class {r.student_class}</span>}
                    <span className="text-indigo-600 font-mono text-[10px] ml-auto">{r.student_uid}@kvsulur.com</span>
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
                  <FileDown className="h-3 w-3 mr-1" />Download credentials
                </Button>
              </div>
              <ScrollArea className="max-h-64">
                {results.map((r, i) => (
                  <div key={i} className="px-3 py-2 border-t text-xs flex items-center gap-2">
                    {r.success
                      ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                    <span className="font-mono text-slate-800">{r.email}</span>
                    {r.success
                      ? <span className="text-muted-foreground ml-auto">pwd: <code>{r.password}</code></span>
                      : <span className="text-destructive font-semibold ml-auto">{r.error}</span>}
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Close</Button>
          <Button onClick={submit} disabled={loading || rows.length === 0} className="gradient-primary border-0">
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing ({progressPercent}%)...</> : `Import ${rows.length} student${rows.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkImportStudents;
