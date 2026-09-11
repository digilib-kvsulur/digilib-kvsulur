import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  GraduationCap,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Users,
  RefreshCw,
  Archive,
  ShieldAlert,
} from "lucide-react";

export const AcademicYearRollover: React.FC = () => {
  const [classCounts, setClassCounts] = useState<Record<string, number>>({});
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState(false);
  const [currentSession, setCurrentSession] = useState("2025-2026");
  const [nextSession, setNextSession] = useState("2026-2027");
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadClassStats();
  }, []);

  const loadClassStats = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("student_class")
        .eq("role", "student")
        .eq("is_approved", true);

      const counts: Record<string, number> = {};
      let total = 0;
      (data || []).forEach((row) => {
        const cls = (row.student_class || "Unassigned").trim();
        counts[cls] = (counts[cls] || 0) + 1;
        total++;
      });

      setClassCounts(counts);
      setTotalStudents(total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const executeAnnualRollover = async () => {
    const confirmed = confirm(
      `⚠️ CRITICAL CONFIRMATION:\n\nAre you sure you want to execute the Academic Year Rollover from ${currentSession} to ${nextSession}?\n\nThis will:\n1. Promote Class 1-11 students up by one grade (e.g. 10th -> 11th).\n2. Mark Class 12 students as Alumni.\n\nThis action modifies student class records.`
    );
    if (!confirmed) return;

    setPromoting(true);
    setProgressLog([]);
    const logs: string[] = [];

    const log = (msg: string) => {
      logs.push(msg);
      setProgressLog([...logs]);
    };

    try {
      log(`Starting Academic Year Rollover: ${currentSession} ➔ ${nextSession}`);

      // 1. Promote Class 12 -> Alumni
      log("Step 1: Updating Class 12 students to Alumni status...");
      const { data: class12Students, error: err12 } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, student_class")
        .eq("role", "student")
        .eq("student_class", "12");

      if (err12) throw err12;

      if (class12Students && class12Students.length > 0) {
        const ids12 = class12Students.map((s) => s.id);
        const { error: updErr12 } = await supabase
          .from("profiles")
          .update({ student_class: "Alumni" })
          .in("id", ids12);
        if (updErr12) throw updErr12;
        log(`✓ Successfully graduated ${class12Students.length} Class 12 students to Alumni.`);
      } else {
        log("No Class 12 students found.");
      }

      // 2. Promote Classes in descending order (11 -> 12, 10 -> 11, etc. to prevent collisions)
      for (let i = 11; i >= 1; i--) {
        const fromClass = String(i);
        const toClass = String(i + 1);

        log(`Step ${13 - i}: Promoting Class ${fromClass} students to Class ${toClass}...`);

        const { data: studentsInGrade } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "student")
          .eq("student_class", fromClass);

        if (studentsInGrade && studentsInGrade.length > 0) {
          const ids = studentsInGrade.map((s) => s.id);
          const { error: promErr } = await supabase
            .from("profiles")
            .update({ student_class: toClass })
            .in("id", ids);

          if (promErr) throw promErr;
          log(`✓ Promoted ${studentsInGrade.length} students from Class ${fromClass} ➔ Class ${toClass}.`);
        } else {
          log(`No students found in Class ${fromClass}.`);
        }
      }

      log(`🎉 Academic Year Rollover to ${nextSession} Completed Successfully!`);
      toast({
        title: "Rollover Completed! 🎓",
        description: `All students have been promoted to the ${nextSession} academic session.`,
      });

      loadClassStats();
    } catch (err: any) {
      console.error("Rollover error:", err);
      log(`❌ Error encountered: ${err.message}`);
      toast({
        title: "Rollover Failed",
        description: err.message || "An error occurred during class rollover.",
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
            <p className="text-3xl font-black text-foreground">{totalStudents}</p>
            <p className="text-xs text-muted-foreground mt-1">Across Classes 1–12</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
              Current Academic Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{currentSession}</p>
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
            Review grade strength before triggering bulk annual class promotion.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-6">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
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
              onClick={executeAnnualRollover}
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
    </div>
  );
};

export default AcademicYearRollover;
