import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  GraduationCap,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Users,
  RefreshCw,
  ShieldAlert,
  Lock,
  Calendar,
} from "lucide-react";

interface StudentRecord {
  id: string;
  first_name: string | null;
  last_name: string | null;
  student_class: string | null;
}

// Robust class parser handling "11B", "11-A", "Class 10", "10", "12 A", etc.
export const parseStudentGrade = (rawClass?: string | null): { grade: number | null; section: string; raw: string } => {
  if (!rawClass) return { grade: null, section: "", raw: "" };
  const raw = rawClass.trim();
  if (raw.toLowerCase().includes("alumni")) return { grade: 99, section: "", raw };

  const romanMap: Record<string, number> = {
    i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12
  };

  const clean = raw.replace(/^class\s+/i, "").trim();
  const digitMatch = clean.match(/^(\d{1,2})\s*[-_/]?\s*([A-Za-z]?)$/i);
  if (digitMatch) {
    const grade = parseInt(digitMatch[1], 10);
    const section = digitMatch[2]?.toUpperCase() || "";
    return { grade: grade >= 1 && grade <= 12 ? grade : null, section, raw };
  }

  const romanMatch = clean.match(/^(xii|xi|x|ix|viii|vii|vi|v|iv|iii|ii|i)\s*[-_/]?\s*([A-Za-z]?)$/i);
  if (romanMatch) {
    const grade = romanMap[romanMatch[1].toLowerCase()] || null;
    const section = romanMatch[2]?.toUpperCase() || "";
    return { grade, section, raw };
  }

  return { grade: null, section: "", raw };
};

export const AcademicYearRollover: React.FC = () => {
  const [classCounts, setClassCounts] = useState<Record<string, number>>({});
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState(false);
  const [currentSession, setCurrentSession] = useState("2026-2027");
  const [nextSession, setNextSession] = useState("2027-2028");
  const [progressLog, setProgressLog] = useState<string[]>([]);

  // Security confirmation state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [securityInput, setSecurityInput] = useState("");
  const expectedPhrase = `PROMOTE ${currentSession}`;

  const { toast } = useToast();

  useEffect(() => {
    loadClassStats();
  }, []);

  // Paginated student fetching to overcome Supabase 1,000-row default limit
  const loadClassStats = async () => {
    setLoading(true);
    try {
      let allStudents: { student_class: string | null }[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("profiles")
          .select("student_class")
          .eq("role", "student")
          .eq("is_approved", true)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        if (data && data.length > 0) {
          allStudents = allStudents.concat(data);
          if (data.length < pageSize) hasMore = false;
          else page++;
        } else {
          hasMore = false;
        }
      }

      const counts: Record<string, number> = {};
      let total = 0;

      allStudents.forEach((row) => {
        const parsed = parseStudentGrade(row.student_class);
        if (parsed.grade && parsed.grade >= 1 && parsed.grade <= 12) {
          const key = String(parsed.grade);
          counts[key] = (counts[key] || 0) + 1;
        } else if (parsed.grade === 99) {
          counts["Alumni"] = (counts["Alumni"] || 0) + 1;
        } else {
          counts["Other"] = (counts["Other"] || 0) + 1;
        }
        total++;
      });

      setClassCounts(counts);
      setTotalStudents(total);
    } catch (e: any) {
      console.error("Failed to load class stats:", e);
      toast({ title: "Error", description: "Failed to load student statistics.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const executeAnnualRollover = async () => {
    if (securityInput.trim() !== expectedPhrase) {
      toast({
        title: "Security Verification Failed",
        description: `Please type exactly "${expectedPhrase}" to confirm.`,
        variant: "destructive",
      });
      return;
    }

    setConfirmModalOpen(false);
    setPromoting(true);
    setProgressLog([]);
    const logs: string[] = [];

    const log = (msg: string) => {
      logs.push(msg);
      setProgressLog([...logs]);
    };

    try {
      log(`[${new Date().toLocaleTimeString()}] 🚀 Initiating Academic Rollover: ${currentSession} ➔ ${nextSession}`);

      // 1. Fetch ALL active students with full pagination
      log("Step 1: Fetching all active student accounts across the entire school...");
      let allStudents: StudentRecord[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, student_class")
          .eq("role", "student")
          .eq("is_approved", true)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        if (data && data.length > 0) {
          allStudents = allStudents.concat(data);
          if (data.length < pageSize) hasMore = false;
          else page++;
        } else {
          hasMore = false;
        }
      }

      log(`✓ Retrieved ${allStudents.length} total active student records.`);

      // Group students by their parsed grade
      const gradeBuckets: Record<number, StudentRecord[]> = {};
      allStudents.forEach((s) => {
        const parsed = parseStudentGrade(s.student_class);
        if (parsed.grade) {
          gradeBuckets[parsed.grade] = gradeBuckets[parsed.grade] || [];
          gradeBuckets[parsed.grade].push(s);
        }
      });

      // 2. Promote Class 12 -> Alumni first to prevent collisions
      const seniors = gradeBuckets[12] || [];
      log(`Step 2: Processing ${seniors.length} Class 12 seniors graduating to Alumni...`);
      if (seniors.length > 0) {
        const seniorIds = seniors.map((s) => s.id);
        // Process in chunks of 200 for database safety
        for (let c = 0; c < seniorIds.length; c += 200) {
          const chunk = seniorIds.slice(c, c + 200);
          const { error: seniorErr } = await supabase
            .from("profiles")
            .update({ student_class: "Alumni" })
            .in("id", chunk);
          if (seniorErr) throw seniorErr;
        }
        log(`✓ Successfully updated ${seniors.length} Class 12 seniors to Alumni status.`);
      }

      // 3. Promote Grades 11 down to 1 in descending order (preserving section tags)
      for (let g = 11; g >= 1; g--) {
        const studentsInGrade = gradeBuckets[g] || [];
        log(`Step ${14 - g}: Advancing Grade ${g} ➔ Grade ${g + 1} (${studentsInGrade.length} students)...`);

        if (studentsInGrade.length === 0) {
          log(`• No students found in Grade ${g}. Skipping.`);
          continue;
        }

        // Group by new target class string to minimize database update queries
        const targetClassGroups: Record<string, string[]> = {};

        studentsInGrade.forEach((s) => {
          const parsed = parseStudentGrade(s.student_class);
          const nextGrade = g + 1;
          const targetClass = parsed.section
            ? `${nextGrade}${parsed.raw.includes("-") ? `-${parsed.section}` : parsed.section}`
            : String(nextGrade);

          targetClassGroups[targetClass] = targetClassGroups[targetClass] || [];
          targetClassGroups[targetClass].push(s.id);
        });

        // Execute batch updates for each section
        for (const [newClass, ids] of Object.entries(targetClassGroups)) {
          for (let c = 0; c < ids.length; c += 200) {
            const chunk = ids.slice(c, c + 200);
            const { error: updErr } = await supabase
              .from("profiles")
              .update({ student_class: newClass })
              .in("id", chunk);
            if (updErr) throw updErr;
          }
          log(`  → Updated ${ids.length} students to Class ${newClass}`);
        }
      }

      log(`🎉 Academic Year Rollover to ${nextSession} Completed Successfully!`);
      toast({
        title: "Rollover Completed! 🎓",
        description: `All eligible students have been promoted to the ${nextSession} academic session.`,
      });

      setSecurityInput("");
      await loadClassStats();
    } catch (err: any) {
      console.error("Rollover error:", err);
      log(`❌ Critical Error: ${err.message}`);
      toast({
        title: "Rollover Failed",
        description: err.message || "An error occurred during annual class rollover.",
        variant: "destructive",
      });
    } finally {
      setPromoting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-indigo-600" /> Academic Year Rollover &amp; Promotion Engine
          </h2>
          <p className="text-xs text-muted-foreground">
            Bulk promote students to the next grade at the end of the academic session and archive graduating seniors.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
              Current Active Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-foreground">{loading ? "..." : totalStudents}</p>
            <p className="text-xs text-muted-foreground mt-1">Across Classes 1–12 (Full Roster)</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
              Current Academic Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-indigo-600">{currentSession}</p>
            <p className="text-xs text-muted-foreground mt-1">PM SHRI KV AFS Sulur</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
              Target Academic Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{nextSession}</p>
            <p className="text-xs text-muted-foreground mt-1">Post-Rollover Session</p>
          </CardContent>
        </Card>
      </div>

      {/* Class distribution preview */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Current Student Distribution
          </CardTitle>
          <CardDescription className="text-xs">
            Review grade strength across all sections before triggering bulk annual class promotion.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-6">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              <p className="text-xs text-muted-foreground mt-2">Loading complete school roster...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((cls) => {
                const count = classCounts[cls] || 0;
                const nextCls = cls === "12" ? "Alumni" : `Class ${Number(cls) + 1}`;
                return (
                  <div key={cls} className="p-3 rounded-xl border border-border/70 bg-muted/20 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Class {cls}</span>
                      <Badge variant="secondary" className="text-[10px] font-bold">
                        {count}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span>➔</span>
                      <span className="font-semibold text-primary">{nextCls}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rollover Execution Box */}
      <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/10">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" /> Annual Rollover Execution
          </CardTitle>
          <CardDescription className="text-xs">
            This operation will advance all student grades in descending order so Class 11 becomes Class 12, Class 10 becomes Class 11, etc.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <Button
              disabled={promoting || loading || totalStudents === 0}
              onClick={() => {
                setSecurityInput("");
                setConfirmModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-10 px-5 gap-2 shadow-md shadow-indigo-600/20"
            >
              <GraduationCap className="h-4 w-4" />
              {promoting ? "Promoting Students..." : `Execute Promotion to ${nextSession}`}
            </Button>
            <Button variant="outline" size="sm" onClick={loadClassStats} disabled={promoting} className="rounded-xl h-10">
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh Counts
            </Button>
          </div>

          {progressLog.length > 0 && (
            <div className="p-3.5 bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl max-h-64 overflow-y-auto space-y-1">
              {progressLog.map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Strict Security Confirmation Modal */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-red-100 border border-red-200 text-red-600 flex items-center justify-center mb-2 mx-auto">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-lg font-black text-slate-900">
              Security Verification Required
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-slate-500">
              Annual class rollover is an irreversible school-wide operation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Impact Assessment</span>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-amber-800 text-[11px]">
                <li><strong>{totalStudents}</strong> student accounts will be evaluated.</li>
                <li>Class 12 seniors will graduate and convert to <strong>Alumni</strong>.</li>
                <li>Classes 1 through 11 will advance to the next grade with section preserved.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">
                Type <strong className="font-mono text-indigo-600">{expectedPhrase}</strong> to proceed:
              </label>
              <Input
                placeholder={expectedPhrase}
                value={securityInput}
                onChange={(e) => setSecurityInput(e.target.value)}
                className="font-mono text-xs h-10 rounded-xl"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmModalOpen(false)} className="rounded-xl flex-1">
              Cancel
            </Button>
            <Button
              disabled={securityInput.trim() !== expectedPhrase || promoting}
              onClick={executeAnnualRollover}
              className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex-1 disabled:opacity-50"
            >
              Confirm &amp; Promote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AcademicYearRollover;
