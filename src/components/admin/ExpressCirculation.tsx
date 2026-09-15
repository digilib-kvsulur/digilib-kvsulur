import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Barcode,
  Camera,
  User,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Zap,
  Clock,
  ArrowRight,
  Search,
} from "lucide-react";
import { BarcodeScannerModal } from "@/components/shared/BarcodeScannerModal";

interface ActiveLoan {
  id: string;
  book_id: string;
  issue_date: string;
  due_date: string;
  accession_number?: string | null;
  book: { title: string; author: string };
}

export const ExpressCirculation: React.FC = () => {
  const [studentScanInput, setStudentScanInput] = useState("");
  const [bookScanInput, setBookScanInput] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>([]);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [processingBook, setProcessingBook] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<"student" | "book">("student");

  const studentInputRef = useRef<HTMLInputElement | null>(null);
  const bookInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  const playSuccessBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      /* ignore */
    }
  };

  const playAlertBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      /* ignore */
    }
  };

  // Lookup student by admission number, barcode or name
  const lookupStudent = async (identifier: string) => {
    const raw = identifier.trim();
    if (!raw) return;
    setLoadingStudent(true);
    try {
      // Remove possible KVS- prefix from barcode
      const cleanAdmn = raw.replace(/^KVS-/i, "");

      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, admission_number, student_class, role, library_card_barcode")
        .or(`admission_number.eq.${cleanAdmn},admission_number.eq.${raw},library_card_barcode.eq.${raw}`)
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        // Fallback: search by name
        const { data: nameData } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, admission_number, student_class, role, library_card_barcode")
          .ilike("first_name", `%${raw}%`)
          .limit(1)
          .maybeSingle();

        if (!nameData) {
          playAlertBeep();
          toast({ title: "Student Not Found", description: `No student matches "${raw}"`, variant: "destructive" });
          return;
        }
        setSelectedStudent(nameData);
        loadStudentLoans(nameData.id);
        playSuccessBeep();
      } else {
        setSelectedStudent(data);
        loadStudentLoans(data.id);
        playSuccessBeep();
      }

      setStudentScanInput("");
      setTimeout(() => bookInputRef.current?.focus(), 150);
    } catch (err: any) {
      toast({ title: "Lookup Error", description: err.message, variant: "destructive" });
    } finally {
      setLoadingStudent(false);
    }
  };

  const loadStudentLoans = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("book_issues")
        .select("id, book_id, issue_date, due_date, accession_number, books(title, author)")
        .eq("user_id", userId)
        .eq("status", "issued")
        .order("issue_date", { ascending: false });

      setActiveLoans((data as any) || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Fast Process Book Barcode (Issue or Return)
  const processBookBarcode = async (accessionOrTitle: string) => {
    const code = accessionOrTitle.trim();
    if (!code) return;
    if (!selectedStudent) {
      playAlertBeep();
      toast({ title: "No Student Selected", description: "Scan a student barcode first!", variant: "destructive" });
      studentInputRef.current?.focus();
      return;
    }

    setProcessingBook(true);
    try {
      // 1. Check if the book is ALREADY issued to THIS student -> Fast Return!
      const existingLoan = activeLoans.find(
        (l) => l.accession_number === code || l.book?.title.toLowerCase() === code.toLowerCase()
      );

      if (existingLoan) {
        // Perform Return
        const { error: retErr } = await supabase
          .from("book_issues")
          .update({
            status: "returned",
            return_date: new Date().toISOString().split("T")[0],
          })
          .eq("id", existingLoan.id);

        if (retErr) throw retErr;

        // Restore available count
        await supabase.rpc("increment_book_available_copies", { p_book_id: existingLoan.book_id } as any);

        playSuccessBeep();
        toast({
          title: "Book Returned! 📚↩️",
          description: `"${existingLoan.book?.title}" returned by ${selectedStudent.first_name}.`,
        });

        loadStudentLoans(selectedStudent.id);
        setBookScanInput("");
        return;
      }

      // 2. Otherwise: find book in catalog to ISSUE
      const { data: booksData } = await supabase
        .from("books")
        .select("id, title, author, available_copies, total_copies, accession_number, accession_numbers")
        .or(`accession_number.eq.${code},isbn.eq.${code}`)
        .limit(1)
        .maybeSingle();

      let targetBook = booksData;
      if (!targetBook) {
        // Search by title partial match
        const { data: titleMatch } = await supabase
          .from("books")
          .select("id, title, author, available_copies, total_copies, accession_number, accession_numbers")
          .ilike("title", `%${code}%`)
          .limit(1)
          .maybeSingle();

        targetBook = titleMatch;
      }

      if (!targetBook) {
        playAlertBeep();
        toast({ title: "Book Not Found", description: `No catalog book matches "${code}"`, variant: "destructive" });
        return;
      }

      if (targetBook.available_copies <= 0) {
        playAlertBeep();
        toast({
          title: "No Available Copies",
          description: `All copies of "${targetBook.title}" are currently issued.`,
          variant: "destructive",
        });
        return;
      }

      // Role-based Circulation Rules
      // Students: 1 book at a time, 7 days loan period
      // Teachers/Staff: Up to 5 books, 30 days (1 month) loan period
      const isStudent = !selectedStudent.role || selectedStudent.role === "student";
      const isTeacher = selectedStudent.role === "teacher" || selectedStudent.role === "staff" || selectedStudent.role === "admin";

      if (isStudent && activeLoans.length >= 1) {
        playAlertBeep();
        toast({
          title: "Borrow Limit Reached (Max 1 Book)",
          description: `Students are strictly allowed 1 book at a time. ${selectedStudent.first_name} currently has "${activeLoans[0]?.book?.title || 'a book'}" issued. Please return it before issuing another.`,
          variant: "destructive",
        });
        return;
      }

      // Perform Issue with role-based due date
      const loanDays = isStudent ? 7 : 30;
      const today = new Date().toISOString().split("T")[0];
      const dueDate = new Date(Date.now() + loanDays * 86400_000).toISOString().split("T")[0];

      const { error: issueErr } = await supabase.from("book_issues").insert({
        user_id: selectedStudent.id,
        book_id: targetBook.id,
        issue_date: today,
        due_date: dueDate,
        status: "issued",
        accession_number: code.startsWith("KVS") ? code : targetBook.accession_number || null,
      });

      if (issueErr) throw issueErr;

      // Decrement copies
      await supabase
        .from("books")
        .update({ available_copies: Math.max(0, targetBook.available_copies - 1) })
        .eq("id", targetBook.id);

      playSuccessBeep();
      toast({
        title: "Book Issued! 📖⚡",
        description: `"${targetBook.title}" issued to ${selectedStudent.first_name}. Due: ${dueDate} (${loanDays} days)`,
      });

      loadStudentLoans(selectedStudent.id);
      setBookScanInput("");
    } catch (err: any) {
      console.error(err);
      playAlertBeep();
      toast({ title: "Circulation Error", description: err.message || "Failed to process book.", variant: "destructive" });
    } finally {
      setProcessingBook(false);
    }
  };

  const handleBarcodeScanned = (detected: string) => {
    if (scannerTarget === "student") {
      lookupStudent(detected);
    } else {
      processBookBarcode(detected);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-foreground flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500 fill-amber-500" /> Express Circulation Counter
          </h2>
          <p className="text-xs text-muted-foreground">
            Zero-click barcode issue &amp; return desk. Scan student ID card, then scan book accession code.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Step 1: Student Scan Card */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
                Scan Student Barcode / ID
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => {
                  setScannerTarget("student");
                  setScannerOpen(true);
                }}
              >
                <Camera className="h-3.5 w-3.5" /> Camera Scan
              </Button>
            </CardTitle>
            <CardDescription className="text-xs">
              Scan student library card barcode (`KVS-...`) or enter admission number.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                lookupStudent(studentScanInput);
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={studentInputRef}
                  placeholder="Scan or type admission no..."
                  value={studentScanInput}
                  onChange={(e) => setStudentScanInput(e.target.value)}
                  className="pl-9 h-10 font-mono text-sm"
                  autoFocus
                />
              </div>
              <Button type="submit" disabled={loadingStudent} className="h-10 text-xs font-semibold px-4 gradient-primary border-0">
                {loadingStudent ? "Finding..." : "Find"}
              </Button>
            </form>

            {selectedStudent && (
              <div className="p-3.5 bg-primary/5 border border-primary/20 rounded-xl space-y-2.5 animate-in fade-in">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-foreground">
                      {selectedStudent.first_name} {selectedStudent.last_name}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {selectedStudent.role === "teacher" ? "Faculty / Staff" : `Class ${selectedStudent.student_class || "N/A"}`} · Admn: {selectedStudent.admission_number || "N/A"}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-xs font-bold ${
                    selectedStudent.role === "teacher"
                      ? "text-purple-700 bg-purple-50 border-purple-200"
                      : "text-emerald-700 bg-emerald-50 border-emerald-200"
                  }`}>
                    {selectedStudent.role === "teacher" ? "Faculty (1 Mo)" : "Student (7 Days)"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-primary/10">
                  <div className="flex flex-col bg-background/60 p-2 rounded-lg border border-border/40">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Active Loan</span>
                    <span className={`font-bold ${
                      (!selectedStudent.role || selectedStudent.role === "student") && activeLoans.length >= 1
                        ? "text-red-600 font-mono"
                        : "text-foreground font-mono"
                    }`}>
                      {activeLoans.length} / {(!selectedStudent.role || selectedStudent.role === "student") ? "1 max" : "5 max"}
                    </span>
                  </div>
                  <div className="flex flex-col bg-background/60 p-2 rounded-lg border border-border/40">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Loan Period</span>
                    <span className="font-bold text-foreground">
                      {(!selectedStudent.role || selectedStudent.role === "student") ? "7 Days" : "30 Days (1 Mo)"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Book Scan Card */}
        <Card className={`border-border/60 ${!selectedStudent ? "opacity-60 pointer-events-none" : ""}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                Scan Book Accession Code
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                disabled={!selectedStudent}
                onClick={() => {
                  setScannerTarget("book");
                  setScannerOpen(true);
                }}
              >
                <Camera className="h-3.5 w-3.5" /> Camera Scan
              </Button>
            </CardTitle>
            <CardDescription className="text-xs">
              Scan accession sticker on the book. If already issued to this student, it will be automatically RETURNED.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                processBookBarcode(bookScanInput);
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={bookInputRef}
                  placeholder="Scan book accession number or title..."
                  value={bookScanInput}
                  onChange={(e) => setBookScanInput(e.target.value)}
                  className="pl-9 h-10 font-mono text-sm"
                  disabled={!selectedStudent}
                />
              </div>
              <Button type="submit" disabled={processingBook || !selectedStudent} className="h-10 text-xs font-semibold px-4 bg-indigo-600 hover:bg-indigo-700 text-white border-0">
                {processingBook ? "Processing..." : "Process"}
              </Button>
            </form>

            {/* Currently Issued to this Student */}
            {selectedStudent && (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Currently Issued to {selectedStudent.first_name} ({activeLoans.length})
                </p>
                {activeLoans.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 italic">No active books currently borrowed.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {activeLoans.map((loan) => (
                      <div
                        key={loan.id}
                        className="p-2.5 rounded-lg border border-border/60 bg-muted/30 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{loan.book?.title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Due: {loan.due_date} {loan.accession_number ? `· Acc: ${loan.accession_number}` : ""}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs font-semibold shrink-0 text-indigo-600 hover:bg-indigo-50 border-indigo-200"
                          onClick={() => processBookBarcode(loan.accession_number || loan.book?.title)}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" /> Return
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <BarcodeScannerModal
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={handleBarcodeScanned}
        title={scannerTarget === "student" ? "Scan Student Library Card" : "Scan Book Accession Barcode"}
      />
    </div>
  );
};

export default ExpressCirculation;
