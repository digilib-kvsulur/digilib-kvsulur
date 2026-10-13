import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  RotateCcw,
  ShieldAlert,
  AlertTriangle,
  Lock,
  Users,
  Zap,
  CheckCircle2,
  History,
  RefreshCw,
  KeyRound,
  CheckCheck,
  ShieldCheck,
  Bell,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export interface StudentRecord {
  id: string;
  first_name: string;
  last_name: string;
  student_class?: string;
  points: number;
  admission_number?: string | null;
  roll_number?: string | null;
}

export interface PointsResetAuditRow {
  id: string;
  admin_id: string | null;
  admin_email: string | null;
  admin_name: string | null;
  scope: string;
  target_class: string | null;
  students_affected: number;
  total_points_cleared: number;
  reason: string;
  notify_students: boolean;
  created_at: string;
}

interface LifetimePointsResetProps {
  allUsers: StudentRecord[];
  classOptions: string[];
  selectedUserIds?: Set<string>;
  onResetComplete?: () => void;
  // External modal control (e.g. from bulk selection in other tab)
  externalModalOpen?: boolean;
  onExternalModalClose?: () => void;
  externalScope?: "all_students" | "class" | "selected";
}

const REQUIRED_CONFIRM_PHRASE = "RESET LIFETIME POINTS";

const REASON_PRESETS = [
  "Annual Academic Session Rollover (Fresh start for all classes)",
  "New Academic Year Promotion (Reset graduating & promoted batches)",
  "End of Semester / Term XP Season Completion",
  "Points System Recalibration & Integrity Audit",
  "Class 12 Outgoing Batch Archival",
  "other",
];

export const LifetimePointsReset: React.FC<LifetimePointsResetProps> = ({
  allUsers,
  classOptions,
  selectedUserIds = new Set(),
  onResetComplete,
  externalModalOpen = false,
  onExternalModalClose,
  externalScope,
}) => {
  const { toast } = useToast();

  // Reset scope & targets
  const [scope, setScope] = useState<"all_students" | "class" | "selected">("all_students");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [reasonPreset, setReasonPreset] = useState<string>(REASON_PRESETS[0]);
  const [customReason, setCustomReason] = useState<string>("");
  const [notifyStudents, setNotifyStudents] = useState<boolean>(true);

  // Security confirmation state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [adminPassword, setAdminPassword] = useState<string>("");
  const [confirmationPhrase, setConfirmationPhrase] = useState<string>("");
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Audit history state
  const [auditLogs, setAuditLogs] = useState<PointsResetAuditRow[]>([]);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(false);

  // Handle external modal trigger
  useEffect(() => {
    if (externalModalOpen) {
      if (externalScope) setScope(externalScope);
      setModalOpen(true);
    }
  }, [externalModalOpen, externalScope]);

  // Set default class if options exist
  useEffect(() => {
    if (classOptions.length > 0 && !selectedClass) {
      setSelectedClass(classOptions[0]);
    }
  }, [classOptions, selectedClass]);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const { data, error } = await supabase.rpc("get_points_reset_audit" as any, { p_limit: 50 });
      if (error) {
        // Fallback to table select if RPC isn't deployed yet
        const { data: fallbackData } = await supabase
          .from("points_reset_audit" as any)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        if (fallbackData) setAuditLogs(fallbackData as PointsResetAuditRow[]);
      } else if (data) {
        setAuditLogs(data as PointsResetAuditRow[]);
      }
    } catch (err) {
      console.error("Failed to load points reset audit logs:", err);
    } finally {
      setLoadingAudit(false);
    }
  };

  // Determine affected students based on current scope
  const targetStudents = useMemo(() => {
    if (scope === "all_students") {
      return allUsers;
    }
    if (scope === "class") {
      return allUsers.filter((u) => u.student_class === selectedClass);
    }
    if (scope === "selected") {
      return allUsers.filter((u) => selectedUserIds.has(u.id));
    }
    return [];
  }, [scope, selectedClass, allUsers, selectedUserIds]);

  const targetStats = useMemo(() => {
    const totalStudents = targetStudents.length;
    const studentsWithPoints = targetStudents.filter((u) => (u.points || 0) > 0);
    const totalPoints = targetStudents.reduce((acc, u) => acc + (u.points || 0), 0);
    const maxPoints = targetStudents.length ? Math.max(...targetStudents.map((u) => u.points || 0)) : 0;
    const topStudents = [...studentsWithPoints]
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, 5);

    return {
      totalStudents,
      studentsWithPointsCount: studentsWithPoints.length,
      totalPoints,
      maxPoints,
      topStudents,
    };
  }, [targetStudents]);

  const finalReason = useMemo(() => {
    if (reasonPreset === "other") return customReason.trim();
    return reasonPreset;
  }, [reasonPreset, customReason]);

  const openConfirmationModal = () => {
    if (targetStudents.length === 0) {
      toast({
        title: "No Students Selected",
        description: "There are no students in the chosen target scope to reset.",
        variant: "destructive",
      });
      return;
    }
    if (!finalReason || finalReason.length < 5) {
      toast({
        title: "Reason Required",
        description: "Please select or provide a valid reason (at least 5 characters) for the audit trail.",
        variant: "destructive",
      });
      return;
    }
    setAdminPassword("");
    setConfirmationPhrase("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (isResetting) return;
    setModalOpen(false);
    setAdminPassword("");
    setConfirmationPhrase("");
    if (onExternalModalClose) onExternalModalClose();
  };

  const handleExecuteReset = async () => {
    if (confirmationPhrase.trim() !== REQUIRED_CONFIRM_PHRASE) {
      toast({
        title: "Phrase Mismatch",
        description: `Please type the exact phrase: "${REQUIRED_CONFIRM_PHRASE}".`,
        variant: "destructive",
      });
      return;
    }

    if (!adminPassword.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter your admin account password to verify identity.",
        variant: "destructive",
      });
      return;
    }

    setIsResetting(true);
    try {
      // 1. Re-authenticate administrator to verify active sudo credentials
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData.user) {
        throw new Error("Your login session has expired. Please sign in again.");
      }

      const adminEmail = authData.user.email;
      if (adminEmail) {
        const { error: verifyErr } = await supabase.auth.signInWithPassword({
          email: adminEmail,
          password: adminPassword,
        });
        if (verifyErr) {
          throw new Error("Admin security verification failed: Incorrect password.");
        }
      }

      // 2. Invoke the atomic, SECURITY DEFINER PostgreSQL RPC
      const payload: any = {
        p_scope: scope,
        p_target_class: scope === "class" ? selectedClass : null,
        p_student_ids: scope === "selected" ? Array.from(selectedUserIds) : null,
        p_confirmation_phrase: confirmationPhrase.trim(),
        p_reason: finalReason,
        p_notify_students: notifyStudents,
      };

      const { data: rpcRes, error: rpcErr } = await supabase.rpc("admin_reset_lifetime_points" as any, payload);

      if (rpcErr) {
        throw rpcErr;
      }

      const resObj = typeof rpcRes === "string" ? JSON.parse(rpcRes) : rpcRes;
      const affected = resObj?.students_affected ?? targetStats.totalStudents;
      const cleared = resObj?.total_points_cleared ?? targetStats.totalPoints;

      toast({
        title: "Lifetime Points Reset Complete ⚡",
        description: `Successfully wiped ${cleared.toLocaleString()} XP across ${affected} students to 0.`,
      });

      closeModal();
      loadAuditLogs();
      if (onResetComplete) onResetComplete();
    } catch (err: any) {
      console.error("Points reset failed:", err);
      toast({
        title: "Reset Failed",
        description: err.message || "Failed to reset points. Please verify permissions.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  const phraseMatches = confirmationPhrase.trim() === REQUIRED_CONFIRM_PHRASE;
  const canSubmit = phraseMatches && adminPassword.trim().length > 0 && !isResetting;

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-950 via-red-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-red-500/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-semibold tracking-wide border border-red-500/30">
              <ShieldAlert className="h-3.5 w-3.5" /> High-Privilege Administrative Operation
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Lifetime Points Reset Engine
            </h2>
            <p className="text-sm text-red-100/80 leading-relaxed">
              Reset students' accumulated lifetime experience points (XP) and monthly points to zero.
              Designed for annual rollover, new academic sessions, or seasonal leaderboard resets.
              Protected by multi-factor confirmation, admin re-authentication, and an immutable audit trail.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Button
              variant="destructive"
              size="lg"
              onClick={openConfirmationModal}
              className="w-full sm:w-auto shadow-lg shadow-red-900/40 bg-red-600 hover:bg-red-500 font-bold gap-2 text-sm"
              disabled={targetStudents.length === 0}
            >
              <RotateCcw className="h-4 w-4" /> Reset Lifetime Points
            </Button>
          </div>
        </div>

        {/* Ambient background accent */}
        <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Target & Scope Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scope & Reason Form */}
        <Card className="lg:col-span-2 border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> Step 1: Select Target Scope &amp; Reason
            </CardTitle>
            <CardDescription>
              Configure which students will have their points zeroed out and provide the mandatory justification.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Scope Selection */}
            <div className="space-y-2">
              <Label className="font-semibold text-sm">Target Scope</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setScope("all_students")}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    scope === "all_students"
                      ? "border-red-500 bg-red-500/5 ring-1 ring-red-500"
                      : "border-border/60 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-bold text-sm text-foreground">All Students</span>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    School-wide wipe across all classes ({allUsers.length} students)
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setScope("class")}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    scope === "class"
                      ? "border-red-500 bg-red-500/5 ring-1 ring-red-500"
                      : "border-border/60 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-bold text-sm text-foreground">By Class</span>
                    <Badge variant="outline" className="text-[10px]">{classOptions.length} classes</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Reset only a specific grade (e.g. Class 12 or Class 10)
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setScope("selected")}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    scope === "selected"
                      ? "border-red-500 bg-red-500/5 ring-1 ring-red-500"
                      : "border-border/60 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-bold text-sm text-foreground">Selected Students</span>
                    <Badge variant="outline" className="text-[10px]">{selectedUserIds.size} selected</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Reset only the students currently checked in the overview table
                  </p>
                </button>
              </div>
            </div>

            {/* Target Class Dropdown (if class scope) */}
            {scope === "class" && (
              <div className="space-y-2 p-4 rounded-xl bg-muted/40 border border-border/60">
                <Label className="text-sm font-semibold">Select Target Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-full sm:w-60">
                    <SelectValue placeholder="Choose class..." />
                  </SelectTrigger>
                  <SelectContent>
                    {classOptions.map((c) => (
                      <SelectItem key={c} value={c}>
                        Class {c} ({allUsers.filter((u) => u.student_class === c).length} students)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Selected Warning if empty */}
            {scope === "selected" && selectedUserIds.size === 0 && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-semibold">No students selected in table</p>
                  <p className="mt-0.5">
                    Go to the <strong>Manage Points</strong> tab, tick the checkboxes for the students you wish to reset, then return here.
                  </p>
                </div>
              </div>
            )}

            {/* Reason Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Mandatory Audit Justification</Label>
              <Select value={reasonPreset} onValueChange={setReasonPreset}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason preset..." />
                </SelectTrigger>
                <SelectContent>
                  {REASON_PRESETS.map((preset) => (
                    <SelectItem key={preset} value={preset}>
                      {preset === "other" ? "Other / Custom Reason" : preset}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {reasonPreset === "other" && (
                <div className="mt-2 space-y-1">
                  <Input
                    placeholder="Enter explicit reason (minimum 5 characters)..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    This reason is recorded permanently in the audit ledger.
                  </p>
                </div>
              )}
            </div>

            {/* Notification Toggle */}
            <div className="p-4 rounded-xl border border-border/60 bg-muted/20 flex items-start gap-3">
              <input
                type="checkbox"
                id="notify-students-check"
                checked={notifyStudents}
                onChange={(e) => setNotifyStudents(e.target.checked)}
                className="mt-1 h-4 w-4 rounded accent-primary cursor-pointer"
              />
              <div className="text-xs space-y-0.5 cursor-pointer" onClick={() => setNotifyStudents(!notifyStudents)}>
                <Label htmlFor="notify-students-check" className="font-semibold cursor-pointer flex items-center gap-1.5">
                  <Bell className="h-3.5 w-3.5 text-primary" /> Notify Affected Students
                </Label>
                <p className="text-muted-foreground">
                  Send an in-app notification to reset students informing them that points were reset for the new session.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Impact Preview Card */}
        <Card className="border-border/60 shadow-sm flex flex-col justify-between">
          <div>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" /> Live Impact Analysis
              </CardTitle>
              <CardDescription>
                Calculated in real-time for current selection.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Affected Students</p>
                  <p className="text-2xl font-black text-foreground mt-1">{targetStats.totalStudents}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Active XP Holders</p>
                  <p className="text-2xl font-black text-foreground mt-1">{targetStats.studentsWithPointsCount}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-900 dark:text-red-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider font-bold">Total Points to Wipe</span>
                  <Badge variant="destructive" className="font-mono text-xs">Irreversible</Badge>
                </div>
                <p className="text-3xl font-black text-red-600 dark:text-red-400 mt-2">
                  {targetStats.totalPoints.toLocaleString()} <span className="text-sm font-medium">XP</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Peak student balance: {targetStats.maxPoints.toLocaleString()} XP
                </p>
              </div>

              {targetStats.topStudents.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Top Affected Students
                  </p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {targetStats.topStudents.map((s) => (
                      <div key={s.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/40">
                        <span className="font-medium truncate max-w-[150px]">
                          {s.first_name} {s.last_name}
                          {s.student_class ? ` (${s.student_class})` : ""}
                        </span>
                        <span className="font-mono font-bold text-red-600 dark:text-red-400">
                          {s.points.toLocaleString()} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </div>

          <div className="p-6 pt-0">
            <Button
              variant="destructive"
              className="w-full font-bold gap-2"
              onClick={openConfirmationModal}
              disabled={targetStudents.length === 0}
            >
              <RotateCcw className="h-4 w-4" /> Open Security Confirmation
            </Button>
          </div>
        </Card>
      </div>

      {/* Audit History Card */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5 text-primary" /> Points Reset Audit Ledger
            </CardTitle>
            <CardDescription className="mt-1">
              Immutable historical records of previous lifetime points resets.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAuditLogs}
            disabled={loadingAudit}
            className="h-8 text-xs gap-1"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingAudit ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loadingAudit ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <ShieldCheck className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              No lifetime points resets have been performed yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date &amp; Time</TableHead>
                    <TableHead>Executed By</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Affected</TableHead>
                    <TableHead>Points Cleared</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Notification</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <p className="font-semibold text-foreground">{log.admin_name || "Admin"}</p>
                          <p className="text-muted-foreground font-mono text-[11px]">{log.admin_email || "—"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs uppercase font-medium">
                          {log.scope === "all_students"
                            ? "School-wide"
                            : log.scope === "class"
                            ? `Class ${log.target_class || ""}`
                            : "Selected"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-xs">
                        {log.students_affected} students
                      </TableCell>
                      <TableCell className="font-mono font-bold text-xs text-red-600 dark:text-red-400">
                        {Number(log.total_points_cleared).toLocaleString()} XP
                      </TableCell>
                      <TableCell className="text-xs max-w-xs truncate" title={log.reason}>
                        {log.reason}
                      </TableCell>
                      <TableCell>
                        {log.notify_students ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-[10px]">
                            Sent
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">Skipped</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* High-Security Multi-Barrier Confirmation Dialog */}
      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent className="max-w-lg border-red-500/30">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-red-600 dark:text-red-400">
                  Confirm Lifetime Points Reset
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Critical security verification required before execution.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Impact Warning Box */}
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-950 dark:text-red-200 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400" />
                This operation is irreversible!
              </p>
              <p>
                You are about to reset points for{" "}
                <strong>{targetStats.totalStudents} student{targetStats.totalStudents === 1 ? "" : "s"}</strong>
                {scope === "class" ? ` in Class ${selectedClass}` : scope === "all_students" ? " school-wide" : ""},
                wiping a total of{" "}
                <strong className="font-mono text-red-700 dark:text-red-300">
                  {targetStats.totalPoints.toLocaleString()} XP
                </strong>{" "}
                to zero.
              </p>
              <p className="text-[11px] text-muted-foreground">
                Reason: <em>"{finalReason}"</em>
              </p>
            </div>

            {/* Barrier 1: Admin Password Re-authentication */}
            <div className="space-y-2">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-primary" />
                Barrier 1: Enter Your Admin Password
              </Label>
              <Input
                type="password"
                placeholder="Admin account password..."
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                autoComplete="current-password"
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Re-authenticates your administrator session to prevent unauthorized access.
              </p>
            </div>

            {/* Barrier 2: Confirmation Phrase */}
            <div className="space-y-2">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-primary" />
                Barrier 2: Type Confirmation Phrase
              </Label>
              <p className="text-xs text-muted-foreground select-none">
                Type <span className="font-mono font-bold text-red-600 dark:text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">{REQUIRED_CONFIRM_PHRASE}</span> below:
              </p>
              <Input
                placeholder={REQUIRED_CONFIRM_PHRASE}
                value={confirmationPhrase}
                onChange={(e) => setConfirmationPhrase(e.target.value)}
                className={`font-mono text-sm tracking-wider uppercase ${
                  phraseMatches ? "border-emerald-500 focus-visible:ring-emerald-500" : ""
                }`}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeModal} disabled={isResetting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleExecuteReset}
              disabled={!canSubmit}
              className="gap-2 font-bold bg-red-600 hover:bg-red-500"
            >
              {isResetting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Resetting Points...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" /> Confirm &amp; Reset Points
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LifetimePointsReset;
