import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BarcodeSVG from "@/components/shared/BarcodeSVG";
import { defaultStudentBarcode } from "@/lib/barcode";
import { Barcode, Printer, Search, Users, RefreshCw, CheckSquare, Wand2 } from "lucide-react";

interface StudentRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  student_class: string | null;
  admission_number: string | null;
  library_card_barcode: string | null;
}

interface PrintItem {
  id: string;
  name: string;
  studentClass: string;
  admissionNumber: string;
  barcode: string;
}

const StudentBarcodeGenerator = () => {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [printQueue, setPrintQueue] = useState<PrintItem[]>([]);
  const [stickerColumns, setStickerColumns] = useState("3");
  const [generating, setGenerating] = useState(false);
  const [barcodeWidth, setBarcodeWidth] = useState(2);
  const [barcodeHeight, setBarcodeHeight] = useState(40);
  const [barcodeFontSize, setBarcodeFontSize] = useState(14);
  const { toast } = useToast();

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const all: StudentRow[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, student_class, admission_number, library_card_barcode")
          .eq("role", "student")
          .eq("is_approved", true)
          .order("student_class")
          .order("first_name")
          .range(from, from + 999);
        if (error) throw error;
        all.push(...(data as StudentRow[] || []));
        if (!data || data.length < 1000) break;
      }
      setStudents(all);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to load students", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const classes = Array.from(new Set(students.map((s) => s.student_class).filter(Boolean))).sort();

  const filtered = students.filter((s) => {
    const q = searchQuery.trim().toLowerCase();
    const matchClass = classFilter === "all" || s.student_class === classFilter;
    const name = `${s.first_name || ""} ${s.last_name || ""}`.toLowerCase();
    const matchSearch =
      !q ||
      name.includes(q) ||
      (s.admission_number || "").toLowerCase().includes(q) ||
      (s.library_card_barcode || "").toLowerCase().includes(q);
    return matchClass && matchSearch;
  });

  const getBarcode = (s: StudentRow) =>
    s.library_card_barcode?.trim() || defaultStudentBarcode(s.admission_number);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelected(new Set(filtered.map((s) => s.id)));
  };

  const clearSelection = () => setSelected(new Set());

  const addToPrintQueue = (student: StudentRow) => {
    const barcode = getBarcode(student);
    if (!barcode) {
      toast({ title: "No barcode", description: "Assign an admission number first.", variant: "destructive" });
      return;
    }
    const item: PrintItem = {
      id: student.id,
      name: `${student.first_name || ""} ${student.last_name || ""}`.trim(),
      studentClass: student.student_class || "—",
      admissionNumber: student.admission_number || "—",
      barcode,
    };
    if (printQueue.some((p) => p.id === item.id)) {
      toast({ title: "Already in queue", description: `${item.name} is already added.` });
      return;
    }
    setPrintQueue((p) => [...p, item]);
  };

  const addSelectedToQueue = () => {
    const toAdd = filtered.filter((s) => selected.has(s.id));
    let added = 0;
    const next = [...printQueue];
    toAdd.forEach((s) => {
      const barcode = getBarcode(s);
      if (!barcode || next.some((p) => p.id === s.id)) return;
      next.push({
        id: s.id,
        name: `${s.first_name || ""} ${s.last_name || ""}`.trim(),
        studentClass: s.student_class || "—",
        admissionNumber: s.admission_number || "—",
        barcode,
      });
      added++;
    });
    setPrintQueue(next);
    toast({ title: `${added} student barcode(s) added`, description: "Ready to print from the layout panel." });
  };

  const generateBarcodesForMissing = async () => {
    setGenerating(true);
    try {
      const missing = students.filter((s) => !s.library_card_barcode?.trim() && s.admission_number?.trim());
      if (missing.length === 0) {
        toast({ title: "All set", description: "Every approved student already has a library barcode." });
        return;
      }
      let updated = 0;
      for (const s of missing) {
        const barcode = defaultStudentBarcode(s.admission_number);
        const { error } = await supabase
          .from("profiles")
          .update({ library_card_barcode: barcode })
          .eq("id", s.id);
        if (!error) updated++;
      }
      toast({ title: "Barcodes generated", description: `Created ${updated} student library barcodes.` });
      await loadStudents();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    if (printQueue.length === 0) {
      toast({ title: "Print layout empty", variant: "destructive" });
      return;
    }
    window.print();
  };

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #student-barcode-print, #student-barcode-print * { visibility: visible; }
          #student-barcode-print {
            position: absolute; left: 0; top: 0; width: 100%;
            margin: 0; padding: 0; background: white !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Student Library Barcodes
          </h2>
          <p className="text-sm text-muted-foreground">
            Generate and print Code 39 barcodes for student library ID cards (scan at issue desk)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={loadStudents} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={generateBarcodesForMissing} disabled={generating} className="gradient-primary border-0">
            <Wand2 className="h-4 w-4 mr-2" /> Auto-Generate Missing
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 no-print">
        <Card className="xl:col-span-5 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-5 w-5 text-indigo-500" /> Select Students
            </CardTitle>
            <CardDescription>Filter by class, select students, and add to print queue</CardDescription>
            <div className="flex flex-col sm:flex-row gap-2 mt-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name or admission no..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c} value={c!}>Class {c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <Button size="sm" variant="outline" onClick={selectAllFiltered}>
                <CheckSquare className="h-4 w-4 mr-1" /> Select filtered ({filtered.length})
              </Button>
              <Button size="sm" variant="outline" onClick={clearSelection}>Clear</Button>
              <Button size="sm" onClick={addSelectedToQueue} disabled={selected.size === 0}>
                Add {selected.size} to Print
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[55vh] overflow-y-auto border-t">
              {loading ? (
                <p className="p-8 text-center text-sm text-muted-foreground">Loading students...</p>
              ) : filtered.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">No students found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>Student</TableHead>
                      <TableHead>Barcode</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((s) => {
                      const barcode = getBarcode(s);
                      return (
                        <TableRow key={s.id}>
                          <TableCell>
                            <Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggleSelect(s.id)} />
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-sm">{s.first_name} {s.last_name}</p>
                            <p className="text-xs text-muted-foreground">Class {s.student_class} · Adm {s.admission_number || "—"}</p>
                          </TableCell>
                          <TableCell>
                            {barcode ? (
                              <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{barcode}</code>
                            ) : (
                              <span className="text-xs text-red-500">Missing</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addToPrintQueue(s)}>
                              + Print
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-7 border-border/50">
          <CardHeader className="pb-3 border-b">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Barcode className="h-5 w-5 text-indigo-500" /> Print Layout ({printQueue.length})
                </CardTitle>
                <CardDescription>Student ID barcode stickers — scan at circulation desk</CardDescription>
              </div>
              {printQueue.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPrintQueue([])}>Clear</Button>
                  <Button size="sm" onClick={handlePrint} className="gradient-primary border-0">
                    <Printer className="h-4 w-4 mr-2" /> Print
                  </Button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3 max-w-xs">
              <div className="space-y-1">
                <Label className="text-xs">Columns</Label>
                <Select value={stickerColumns} onValueChange={setStickerColumns}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 bg-muted/20 min-h-[40vh] max-h-[55vh] overflow-y-auto">
            {printQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Barcode className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No barcodes in print layout</p>
                <p className="text-xs text-muted-foreground mt-1">Select students from the list to add stickers</p>
              </div>
            ) : (
              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: `repeat(${stickerColumns}, minmax(0, 1fr))` }}
              >
                {printQueue.map((item) => (
                  <div key={item.id} className="bg-white border rounded-lg p-3 text-center shadow-sm">
                    <p className="text-[10px] font-black uppercase truncate">{item.name}</p>
                    <p className="text-[9px] text-muted-foreground">Class {item.studentClass} · {item.admissionNumber}</p>
                    <div className="mt-2">
                      <BarcodeSVG value={item.barcode} />
                    </div>
                    <button
                      type="button"
                      className="text-[10px] text-red-500 mt-1 hover:underline"
                      onClick={() => setPrintQueue((p) => p.filter((x) => x.id !== item.id))}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div id="student-barcode-print" className="hidden print:block p-4">
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${stickerColumns}, minmax(0, 1fr))` }}
        >
          {printQueue.map((item) => (
            <div key={item.id} className="text-center bg-white border p-3" style={{ pageBreakInside: "avoid" }}>
              <p className="text-[10px] font-black uppercase">{item.name}</p>
              <p className="text-[8px] text-gray-600">Class {item.studentClass} · Adm {item.admissionNumber}</p>
              <BarcodeSVG value={item.barcode} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentBarcodeGenerator;
