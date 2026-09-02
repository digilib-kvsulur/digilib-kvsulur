import { useState } from "react";
import Papa from "papaparse";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileDown, CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

const SAMPLE_CSV = `student_uid,student_name,student_class,role
12345,Aarav Sharma,8,student
12346,Diya Patel,9,student
EMP001,Amit Kumar,8,teacher`;

export interface ParsedStudentRow {
  student_uid: string;
  student_name: string;
  student_class?: string;
  role?: string;
  status: "valid" | "warning" | "error";
  validationNotes: string[];
}

interface ResultRow {
  email: string;
  success: boolean;
  password?: string;
  error?: string;
}

const BulkImportStudents = ({ onImported }: { onImported?: () => void }) => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedStudentRow[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "valid" | "warning" | "error">("all");
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState("");
  const { toast } = useToast();

  const reset = () => {
    setRows([]);
    setResults([]);
    setFileName("");
    setFilterStatus("all");
    setProgressPercent(0);
    setProgressStatus("");
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
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
        const rawData = res.data as any[];
        const uidCounts: Record<string, number> = {};

        rawData.forEach((r) => {
          const uid = String(r.student_uid || "").trim();
          if (uid) uidCounts[uid] = (uidCounts[uid] || 0) + 1;
        });

        const validatedRows: ParsedStudentRow[] = rawData.map((r) => {
          const uid = String(r.student_uid || "").trim();
          const name = String(r.student_name || "").trim();
          const cls = String(r.student_class || "").trim();
          const role = String(r.role || "student").trim().toLowerCase();
          const notes: string[] = [];

          let status: "valid" | "warning" | "error" = "valid";

          if (!uid) {
            status = "error";
            notes.push("Missing UID/Admission Number");
          }
          if (!name) {
            status = "error";
            notes.push("Missing Student/Teacher Name");
          }
          if (uid && uidCounts[uid] > 1) {
            if (status !== "error") status = "warning";
            notes.push(`Duplicate UID "${uid}" in CSV`);
          }
          if (role === "student" && !cls) {
            if (status !== "error") status = "warning";
            notes.push("No class assigned");
          }

          if (notes.length === 0) {
            notes.push("Ready to import");
          }

          return {
            student_uid: uid,
            student_name: name,
            student_class: cls,
            role,
            status,
            validationNotes: notes,
          };
        });

        setRows(validatedRows);

        const validCount = validatedRows.filter((r) => r.status === "valid").length;
        const errCount = validatedRows.filter((r) => r.status === "error").length;

        if (validatedRows.length === 0) {
          toast({
            title: "No users found",
            description: "CSV must contain student_uid and student_name columns.",
            variant: "destructive",
          });
        } else if (errCount > 0) {
          toast({
            title: "User Pre-validation Complete",
            description: `Found ${validCount} valid users and ${errCount} invalid rows.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Pre-validation Passed",
            description: `${validCount} users ready for import.`,
          });
        }
      },
    });
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "students-sample.csv";
    a.click();
  };

  const submit = async () => {
    const importableRows = rows.filter((r) => r.status !== "error");
    if (importableRows.length === 0) return;

    setLoading(true);
    setProgressPercent(10);
    setProgressStatus("Preparing batch account creation...");

    try {
      const payload = importableRows.map((r) => ({
        student_uid: r.student_uid,
        student_name: r.student_name,
        student_class: r.student_class || "",
        role: r.role || "student",
      }));

      const { data, error } = await supabase.functions.invoke("admin-bulk-create-users", {
        body: { users: payload },
      });

      if (error) throw error;

      setProgressPercent(100);
      setResults(data?.results || []);
      toast({
        title: "Bulk user creation complete",
        description: `Successfully processed ${data?.results?.length || importableRows.length} user accounts.`,
      });
      onImported?.();
    } catch (err: any) {
      toast({
        title: "Bulk import failed",
        description: err.message || "Error calling Edge Function.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const validRows = rows.filter((r) => r.status === "valid");
  const warningRows = rows.filter((r) => r.status === "warning");
  const errorRows = rows.filter((r) => r.status === "error");

  const filteredRows = rows.filter((r) => {
    if (filterStatus === "valid") return r.status === "valid";
    if (filterStatus === "warning") return r.status === "warning";
    if (filterStatus === "error") return r.status === "error";
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Bulk Import Users
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" /> Bulk Import Students & Teachers
          </DialogTitle>
          <DialogDescription>
            Upload a CSV containing student or teacher records to generate library credentials.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <div className="flex gap-2 flex-wrap items-center">
            <Button variant="outline" size="sm" onClick={downloadSample}>
              <FileDown className="h-4 w-4 mr-2" /> Sample CSV
            </Button>
            <label className="inline-flex">
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <span className="inline-flex items-center px-3 py-1.5 text-sm rounded-md border border-input bg-background hover:bg-accent cursor-pointer font-medium">
                <Upload className="h-4 w-4 mr-2" /> Choose CSV File
              </span>
            </label>
            {fileName && (
              <Badge variant="secondary" className="self-center">
                {fileName} · {rows.length} Total Records
              </Badge>
            )}
          </div>

          {/* Validation Summary Bar */}
          {rows.length > 0 && results.length === 0 && (
            <div className="border rounded-xl p-3 bg-muted/30 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2 items-center text-xs">
                <span className="font-semibold text-muted-foreground">Pre-validation:</span>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> {validRows.length} Valid
                </Badge>
                {warningRows.length > 0 && (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                    <AlertTriangle className="h-3 w-3 mr-1" /> {warningRows.length} Warnings
                  </Badge>
                )}
                {errorRows.length > 0 && (
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                    <XCircle className="h-3 w-3 mr-1" /> {errorRows.length} Errors
                  </Badge>
                )}
              </div>

              {/* Filter Toggles */}
              <div className="flex gap-1">
                {(["all", "valid", "warning", "error"] as const).map((st) => (
                  <Button
                    key={st}
                    size="sm"
                    variant={filterStatus === st ? "default" : "ghost"}
                    className="h-7 text-[11px] capitalize px-2.5"
                    onClick={() => setFilterStatus(st)}
                  >
                    {st}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Progress Bar when importing */}
          {loading && (
            <div className="space-y-2 py-2">
              <div className="flex justify-between text-xs font-medium">
                <span>{progressStatus}</span>
                <span>{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          )}

          {/* Pre-validation Preview Table */}
          {rows.length > 0 && results.length === 0 && (
            <ScrollArea className="max-h-[35vh] border rounded-lg overflow-hidden">
              <div className="divide-y text-xs">
                {filteredRows.map((r, i) => (
                  <div
                    key={i}
                    className={`p-2.5 flex items-center justify-between gap-3 ${
                      r.status === "error"
                        ? "bg-destructive/5"
                        : r.status === "warning"
                        ? "bg-amber-500/5"
                        : "hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {r.status === "valid" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : r.status === "warning" ? (
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                      )}
                      <div className="truncate">
                        <span className="font-semibold text-foreground mr-2">
                          {r.student_name || "(Missing Name)"}
                        </span>
                        <Badge variant="outline" className="text-[10px] py-0 mr-2">
                          UID: {r.student_uid || "None"}
                        </Badge>
                        {r.student_class && (
                          <span className="text-muted-foreground mr-2">Class {r.student_class}</span>
                        )}
                        <Badge variant="secondary" className="text-[10px] capitalize py-0">
                          {r.role || "student"}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-muted-foreground">{r.validationNotes.join("; ")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Import Results Output */}
          {results.length > 0 && (
            <ScrollArea className="max-h-[35vh] border rounded-lg">
              <div className="bg-muted px-3 py-2 text-xs font-semibold border-b">
                Import Status: {results.filter((r) => r.success).length} succeeded /{" "}
                {results.filter((r) => !r.success).length} failed
              </div>
              <div className="divide-y text-xs">
                {results.map((r, i) => (
                  <div key={i} className="px-3 py-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {r.success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                      )}
                      <span className="font-medium truncate max-w-md">{r.email}</span>
                    </div>
                    {r.password && (
                      <Badge variant="outline" className="text-[10px] font-mono">
                        Pass: {r.password}
                      </Badge>
                    )}
                    {r.error && <span className="text-destructive text-[11px] ml-auto">{r.error}</span>}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button
            onClick={submit}
            disabled={loading || rows.length === 0 || rows.every((r) => r.status === "error") || results.length > 0}
            className="gradient-primary border-0"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing Users...
              </>
            ) : (
              `Import ${rows.filter((r) => r.status !== "error").length} Users`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkImportStudents;
