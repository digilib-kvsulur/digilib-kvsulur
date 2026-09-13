import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Award, Crown, Medal, Calendar, CheckCircle2, AlertTriangle, 
  Printer, Download, RefreshCw, Sparkles, ShieldCheck, UserCheck, 
  HelpCircle, BookOpen, ChevronRight, Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  computeRotationalBadges, 
  verifyAndPublishRotationalCycle, 
  getActiveRotationalCycle,
  updateRotationalCollectionDetails,
  RotationalAwardCandidate, 
  RotationalBadgeSettings, 
  DEFAULT_ROTATIONAL_SETTINGS, 
  VerifiedRotationalCycle 
} from "@/lib/rotationalBadgeService";

interface RotationalBadgeManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const RotationalBadgeManager: React.FC<RotationalBadgeManagerProps> = ({
  open,
  onOpenChange,
}) => {
  const { toast } = useToast();

  const now = new Date();
  const [evalMode, setEvalMode] = useState<"monthly" | "date_range" | "lifetime">("monthly");
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);

  const firstDayStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const todayStr = now.toISOString().split("T")[0];
  const [customStartDate, setCustomStartDate] = useState<string>(firstDayStr);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);

  const [settings, setSettings] = useState<RotationalBadgeSettings>(DEFAULT_ROTATIONAL_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyConfirmOpen, setVerifyConfirmOpen] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editVenue, setEditVenue] = useState("");
  const [editNote, setEditNote] = useState("");
  const [savingCollection, setSavingCollection] = useState(false);

  // Analysis state
  const [classAwards, setClassAwards] = useState<RotationalAwardCandidate[]>([]);
  const [sectionAwards, setSectionAwards] = useState<RotationalAwardCandidate[]>([]);
  const [stats, setStats] = useState<{
    totalStudentsEvaluated: number;
    eligibleStudentsCount: number;
    classesCount: number;
    sectionsCount: number;
    totalBadgesAwarded: number;
    noAwardCount: number;
  }>({
    totalStudentsEvaluated: 0,
    eligibleStudentsCount: 0,
    classesCount: 0,
    sectionsCount: 0,
    totalBadgesAwarded: 0,
    noAwardCount: 0,
  });

  // Active verified cycle
  const [activeCycle, setActiveCycle] = useState<VerifiedRotationalCycle | null>(null);
  const [activeTab, setActiveTab] = useState<"analysis" | "activeCycle" | "settings">("analysis");

  const cycleLabel = useMemo(() => {
    if (evalMode === "lifetime") return "Lifetime (All-Time Cumulative)";
    if (evalMode === "date_range") return `${customStartDate} to ${customEndDate}`;
    return `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;
  }, [evalMode, selectedMonth, selectedYear, customStartDate, customEndDate]);

  const cycleId = useMemo(() => {
    if (evalMode === "lifetime") return `lifetime-${selectedYear}`;
    if (evalMode === "date_range") return `date-${customStartDate}-${customEndDate}`;
    return `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
  }, [evalMode, selectedYear, selectedMonth, customStartDate, customEndDate]);

  useEffect(() => {
    if (open) {
      loadActiveCycle();
      runAnalysis();
    }
  }, [open, selectedYear, selectedMonth, evalMode, customStartDate, customEndDate]);

  const saveCollectionDetails = async (notify: boolean) => {
    if (!editDate) {
      toast({ title: "Date required", description: "Pick a badge collection date first.", variant: "destructive" });
      return;
    }
    setSavingCollection(true);
    try {
      const res = await updateRotationalCollectionDetails(
        { collectionDate: editDate, collectionVenue: editVenue, librarianNote: editNote },
        notify
      );
      if (!res.success) throw new Error(res.error);
      toast({
        title: "Collection details updated",
        description: notify
          ? `${res.notified} winner(s) notified about the new collection date.`
          : "Saved without sending notifications.",
      });
      await loadActiveCycle();
    } catch (err: any) {
      toast({ title: "Update failed", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSavingCollection(false);
    }
  };

  const loadActiveCycle = async () => {
    try {
      const cycle = await getActiveRotationalCycle();
      setActiveCycle(cycle);
      if (cycle?.settings) {
        setEditDate(cycle.settings.collectionDate || "");
        setEditVenue(cycle.settings.collectionVenue || "");
        setEditNote(cycle.settings.librarianNote || "");
      }
      if (cycle?.settings?.collectionDate) {
        setSettings((prev) => ({
          ...prev,
          collectionDate: cycle.settings.collectionDate,
          collectionVenue: cycle.settings.collectionVenue || prev.collectionVenue,
          librarianNote: cycle.settings.librarianNote || prev.librarianNote,
          minPointsThreshold: cycle.settings.minPointsThreshold ?? prev.minPointsThreshold,
        }));
      }
    } catch (err) {
      console.error("Failed to load active cycle:", err);
    }
  };

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const currentSettings: RotationalBadgeSettings = {
        ...settings,
        mode: evalMode,
        startDate: evalMode === "date_range" ? customStartDate : undefined,
        endDate: evalMode === "date_range" ? customEndDate : undefined,
      };
      const res = await computeRotationalBadges(currentSettings, selectedYear, selectedMonth);
      setClassAwards(res.classAwards);
      setSectionAwards(res.sectionAwards);
      setStats(res.statistics);
    } catch (err: any) {
      console.error("Error computing rotational badges:", err);
      toast({
        title: "Analysis Failed",
        description: err?.message || "Could not analyze library points & issues.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndPublish = async () => {
    if (!settings.collectionDate) {
      toast({
        title: "Date Required",
        description: "Please set the date of collecting the physical badges.",
        variant: "destructive",
      });
      return;
    }

    setVerifying(true);
    try {
      const currentSettings: RotationalBadgeSettings = {
        ...settings,
        mode: evalMode,
        startDate: evalMode === "date_range" ? customStartDate : undefined,
        endDate: evalMode === "date_range" ? customEndDate : undefined,
      };
      const result = await verifyAndPublishRotationalCycle(
        cycleId,
        cycleLabel,
        currentSettings,
        classAwards,
        sectionAwards
      );

      if (result.success) {
        toast({
          title: "🎉 Badges Verified & Issued!",
          description: `Successfully awarded ${result.winnersCount} rotational badges for ${cycleLabel}. Students have been notified with the badge collection date!`,
        });
        setVerifyConfirmOpen(false);
        await loadActiveCycle();
        setActiveTab("activeCycle");
      } else {
        toast({
          title: "Verification Error",
          description: result.error || "Failed to publish rotational badges.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const formattedCollectionDate = new Date(settings.collectionDate).toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    const rows = [
      ...classAwards
        .filter((a) => a.status === "awarded" && a.winner)
        .map((a) => ({
          tier: "Class Standard Award",
          badge: "👑 Best Library User",
          scope: a.scopeValue,
          name: `${a.winner!.first_name} ${a.winner!.last_name || ""}`.trim(),
          admn: a.winner!.admission_number || "—",
          section: a.winner!.section,
          points: a.winner!.points,
          books: a.winner!.booksIssuedCount,
          score: a.winner!.compositeScore,
        })),
      ...sectionAwards
        .filter((a) => a.status === "awarded" && a.winner)
        .map((a) => ({
          tier: "Section Award",
          badge: "📚 Reader of the Month",
          scope: `Section ${a.scopeValue}`,
          name: `${a.winner!.first_name} ${a.winner!.last_name || ""}`.trim(),
          admn: a.winner!.admission_number || "—",
          section: a.winner!.section,
          points: a.winner!.points,
          books: a.winner!.booksIssuedCount,
          score: a.winner!.compositeScore,
        })),
    ];

    printWindow.document.write(`
      <html>
      <head>
        <title>PM SHRI KV Sulur - Rotational Library Badge Distribution Sheet (${cycleLabel})</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; color: #111; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 16px; }
          h1 { margin: 0; font-size: 20px; font-weight: 900; text-transform: uppercase; }
          h2 { margin: 4px 0; font-size: 14px; font-weight: 700; }
          h3 { margin: 6px 0; font-size: 16px; font-weight: 800; text-transform: uppercase; color: #1e3a8a; }
          .meta-box { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 16px; background: #f1f5f9; padding: 8px 12px; border-radius: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
          th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; }
          th { background: #e2e8f0; font-weight: 700; text-transform: uppercase; }
          .class-badge { background: #fef3c7; font-weight: bold; }
          .section-badge { background: #e0e7ff; font-weight: bold; }
          .sig-box { margin-top: 50px; display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PM SHRI KENDRIYA VIDYALAYA AFS SULUR</h1>
          <h2>DIGITAL LIBRARY MANAGEMENT SYSTEM (DLMS)</h2>
          <h3>ROTATIONAL BADGE DISTRIBUTION &amp; VERIFICATION SHEET</h3>
          <p style="font-size: 12px; margin: 2px 0;">Cycle: <strong>${cycleLabel}</strong></p>
        </div>
        <div class="meta-box">
          <span><strong>Physical Badge Collection Date:</strong> ${formattedCollectionDate}</span>
          <span><strong>Collection Venue:</strong> ${settings.collectionVenue}</span>
          <span><strong>Total Badges:</strong> ${rows.length}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">S.No</th>
              <th style="width: 150px;">Award Badge</th>
              <th style="width: 80px;">Scope</th>
              <th>Student Name</th>
              <th style="width: 90px; text-align: center;">Admn No</th>
              <th style="width: 70px; text-align: center;">Class/Sec</th>
              <th style="width: 55px; text-align: right;">Points</th>
              <th style="width: 55px; text-align: right;">Issues</th>
              <th style="width: 65px; text-align: right;">Score</th>
              <th style="width: 120px; text-align: center;">Recipient Signature</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (r, idx) => `
              <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td class="${r.tier.includes("Class") ? "class-badge" : "section-badge"}">${r.badge}</td>
                <td><strong>${r.scope}</strong></td>
                <td><strong>${r.name}</strong></td>
                <td style="text-align: center; font-family: monospace;">${r.admn}</td>
                <td style="text-align: center;">${r.section}</td>
                <td style="text-align: right;">${r.points}</td>
                <td style="text-align: right;">${r.books}</td>
                <td style="text-align: right; font-weight: bold;">${r.score}</td>
                <td></td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        <div class="sig-box">
          <div>
            <p>_____________________________</p>
            <p>Student Library Committee Member</p>
          </div>
          <div>
            <p>_____________________________</p>
            <p>Librarian Signature</p>
          </div>
          <div>
            <p>_____________________________</p>
            <p>Principal Signature</p>
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  const handleExportCSV = () => {
    const rows = [
      ["Cycle", "Category", "Award", "Class/Section", "Student Name", "Admission No", "Points", "Books Issued", "Score", "Collection Date", "Collection Venue"]
    ];

    const allAwards = [
      ...classAwards
        .filter((a) => a.status === "awarded" && a.winner)
        .map((a) => [
          `"${cycleLabel}"`,
          `"Class Standard"`,
          `"Best Library User"`,
          `"${a.scopeValue}"`,
          `"${a.winner!.first_name} ${a.winner!.last_name || ""}".trim()`,
          `"${a.winner!.admission_number}"`,
          `"${a.winner!.points}"`,
          `"${a.winner!.booksIssuedCount}"`,
          `"${a.winner!.compositeScore}"`,
          `"${settings.collectionDate}"`,
          `"${settings.collectionVenue}"`
        ]),
      ...sectionAwards
        .filter((a) => a.status === "awarded" && a.winner)
        .map((a) => [
          `"${cycleLabel}"`,
          `"Section"`,
          `"Reader of the Month"`,
          `"${a.scopeValue}"`,
          `"${a.winner!.first_name} ${a.winner!.last_name || ""}".trim()`,
          `"${a.winner!.admission_number}"`,
          `"${a.winner!.points}"`,
          `"${a.winner!.booksIssuedCount}"`,
          `"${a.winner!.compositeScore}"`,
          `"${settings.collectionDate}"`,
          `"${settings.collectionVenue}"`
        ])
    ];

    rows.push(...(allAwards as any));

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `KV-Sulur-Rotational-Badges-${cycleId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "CSV Exported",
      description: `Downloaded rotational badge list for ${cycleLabel}.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <div className="p-5 pb-3 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Crown className="h-6 w-6 text-amber-500" />
                Rotational Library Badges System
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Monthly Section-wise &ldquo;Reader of the Month&rdquo; &amp; Class-wise &ldquo;Best Library User&rdquo; with intelligent points/issue analysis.
              </DialogDescription>
            </div>

            {/* Evaluation Mode & Scope Selector */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div className="flex items-center bg-muted p-1 rounded-lg border text-xs">
                <Button
                  variant={evalMode === "monthly" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setEvalMode("monthly")}
                  className="h-7 text-xs px-2.5 font-bold"
                >
                  Monthly
                </Button>
                <Button
                  variant={evalMode === "date_range" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setEvalMode("date_range")}
                  className="h-7 text-xs px-2.5 font-bold"
                >
                  By Date Range
                </Button>
                <Button
                  variant={evalMode === "lifetime" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setEvalMode("lifetime")}
                  className="h-7 text-xs px-2.5 font-bold"
                >
                  Lifetime (All-Time)
                </Button>
              </div>

              {evalMode === "monthly" && (
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg border bg-background text-foreground h-8"
                  >
                    {MONTH_NAMES.map((m, idx) => (
                      <option key={m} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg border bg-background text-foreground h-8"
                  >
                    {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {evalMode === "date_range" && (
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground font-semibold">From:</span>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="h-8 text-xs w-32 px-2"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground font-semibold">To:</span>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="h-8 text-xs w-32 px-2"
                    />
                  </div>
                </div>
              )}

              {evalMode === "lifetime" && (
                <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-bold border-amber-300 text-xs h-8 px-3">
                  ♾️ All-Time Cumulative XP &amp; Issues
                </Badge>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={runAnalysis}
                disabled={loading}
                className="h-8 text-xs font-semibold"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                Analyze
              </Button>
            </div>
          </div>

          {/* Highlights & Constraints Banner */}
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50">
              <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-300 block">
                Rule 1
              </span>
              <span className="font-semibold text-amber-900 dark:text-amber-200">
                1 Badge Per User Strictly
              </span>
            </div>
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/50">
              <span className="text-[10px] uppercase font-bold text-indigo-800 dark:text-indigo-300 block">
                Class Standard Level
              </span>
              <span className="font-semibold text-indigo-900 dark:text-indigo-200">
                Best Library User
              </span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50">
              <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300 block">
                Section Level
              </span>
              <span className="font-semibold text-emerald-900 dark:text-emerald-200">
                Reader of the Month
              </span>
            </div>
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200/50">
              <span className="text-[10px] uppercase font-bold text-purple-800 dark:text-purple-300 block">
                Points Safeguard
              </span>
              <span className="font-semibold text-purple-900 dark:text-purple-200">
                Min {settings.minPointsThreshold} XP Required
              </span>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="flex-1 min-h-0 flex flex-col p-5 overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={(v: any) => setActiveTab(v)}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <TabsList className="grid grid-cols-3 w-[420px]">
                <TabsTrigger value="analysis" className="text-xs">
                  <Sparkles className="h-3.5 w-3.5 mr-1 text-amber-500" />
                  Nominees ({stats.totalBadgesAwarded})
                </TabsTrigger>
                <TabsTrigger value="activeCycle" className="text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                  Active Award ({activeCycle?.winners?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="settings" className="text-xs">
                  <ShieldCheck className="h-3.5 w-3.5 mr-1 text-primary" />
                  Collection &amp; Thresholds
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  className="h-8 text-xs font-semibold"
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="h-8 text-xs font-semibold"
                >
                  <Printer className="h-3.5 w-3.5 mr-1.5" />
                  Print Sheet
                </Button>
              </div>
            </div>

            {/* Tab 1: Analysis & Proposed Nominees */}
            <TabsContent value="analysis" className="flex-1 min-h-0 overflow-y-auto space-y-6 pr-1">
              {/* Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="border-border/60 shadow-2xs">
                  <CardContent className="p-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-muted-foreground font-semibold">Total Students</p>
                      <p className="text-xl font-black text-foreground">{stats.totalStudentsEvaluated}</p>
                    </div>
                    <BookOpen className="h-5 w-5 text-muted-foreground/60" />
                  </CardContent>
                </Card>
                <Card className="border-border/60 shadow-2xs">
                  <CardContent className="p-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-muted-foreground font-semibold">Qualified Readers</p>
                      <p className="text-xl font-black text-emerald-600">{stats.eligibleStudentsCount}</p>
                    </div>
                    <UserCheck className="h-5 w-5 text-emerald-500" />
                  </CardContent>
                </Card>
                <Card className="border-border/60 shadow-2xs">
                  <CardContent className="p-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-muted-foreground font-semibold">Badges to Issue</p>
                      <p className="text-xl font-black text-amber-500">{stats.totalBadgesAwarded}</p>
                    </div>
                    <Award className="h-5 w-5 text-amber-500" />
                  </CardContent>
                </Card>
                <Card className="border-border/60 shadow-2xs">
                  <CardContent className="p-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-muted-foreground font-semibold">Unawarded (&lt; {settings.minPointsThreshold} XP)</p>
                      <p className="text-xl font-black text-rose-500">{stats.noAwardCount}</p>
                    </div>
                    <AlertTriangle className="h-5 w-5 text-rose-500" />
                  </CardContent>
                </Card>
              </div>

              {/* Section 1: Standard-wise "Best Library User" */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-500" />
                    Class Standard Level: &ldquo;Best Library User&rdquo;
                  </h3>
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    1 Winner per Standard (Includes All Sections)
                  </Badge>
                </div>

                <div className="border rounded-xl overflow-hidden shadow-2xs divide-y divide-border">
                  {classAwards.map((ca) => (
                    <div
                      key={ca.scopeValue}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center font-bold text-xs shrink-0">
                          {ca.scopeValue.replace("Class ", "Std ")}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground">{ca.scopeValue}</span>
                            <Badge className="bg-amber-500 hover:bg-amber-600 text-[10px] text-white">
                              👑 Best Library User
                            </Badge>
                          </div>
                          {ca.winner ? (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Winner: <strong className="text-foreground">{ca.winner.first_name} {ca.winner.last_name || ""}</strong> (Sec {ca.winner.section} · Admn #{ca.winner.admission_number})
                            </p>
                          ) : (
                            <p className="text-xs text-rose-500 font-medium mt-0.5">
                              {ca.runnerUpNote || "No student met the minimum points threshold."}
                            </p>
                          )}
                        </div>
                      </div>

                      {ca.winner ? (
                        <div className="flex items-center gap-4 shrink-0 sm:text-right">
                          <div>
                            <span className="text-xs font-black text-primary block">
                              {ca.winner.compositeScore} Score
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {ca.winner.points} XP · {ca.winner.booksIssuedCount} Books Borrowed
                            </span>
                          </div>
                          <Badge variant="outline" className="text-[10px] font-bold border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30">
                            Qualified
                          </Badge>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-bold border-rose-400 text-rose-600 bg-rose-50 dark:bg-rose-950/30">
                          No Badge Awarded
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Section-wise "Reader of the Month" */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Award className="h-4 w-4 text-indigo-500" />
                    Section Level: &ldquo;Reader of the Month&rdquo;
                  </h3>
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    1 Winner per Section (Single Badge Per User)
                  </Badge>
                </div>

                <div className="border rounded-xl overflow-hidden shadow-2xs divide-y divide-border">
                  {sectionAwards.map((sa) => (
                    <div
                      key={sa.scopeValue}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 flex items-center justify-center font-bold text-xs shrink-0">
                          {sa.scopeValue}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground">Section {sa.scopeValue}</span>
                            <Badge className="bg-indigo-600 hover:bg-indigo-700 text-[10px] text-white">
                              📚 Reader of the Month
                            </Badge>
                          </div>
                          {sa.winner ? (
                            <div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Winner: <strong className="text-foreground">{sa.winner.first_name} {sa.winner.last_name || ""}</strong> (Admn #{sa.winner.admission_number})
                              </p>
                              {sa.runnerUpNote && (
                                <p className="text-[10px] text-amber-700 dark:text-amber-300 font-medium mt-0.5 flex items-center gap-1">
                                  <Info className="h-3 w-3 inline shrink-0" />
                                  {sa.runnerUpNote}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-rose-500 font-medium mt-0.5">
                              {sa.runnerUpNote || "No student in this section met the minimum points threshold."}
                            </p>
                          )}
                        </div>
                      </div>

                      {sa.winner ? (
                        <div className="flex items-center gap-4 shrink-0 sm:text-right">
                          <div>
                            <span className="text-xs font-black text-primary block">
                              {sa.winner.compositeScore} Score
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {sa.winner.points} XP · {sa.winner.booksIssuedCount} Books Borrowed
                            </span>
                          </div>
                          <Badge variant="outline" className="text-[10px] font-bold border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30">
                            Qualified
                          </Badge>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-bold border-rose-400 text-rose-600 bg-rose-50 dark:bg-rose-950/30">
                          No Badge Awarded
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: Currently Active Verified Cycle */}
            <TabsContent value="activeCycle" className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
              {activeCycle ? (
                <div className="space-y-4">
                  <Card className="border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            Verified Active Cycle: {activeCycle.cycleLabel}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Verified on {new Date(activeCycle.verifiedAt).toLocaleString("en-IN")}. {activeCycle.winners.length} students awarded badges.
                          </CardDescription>
                        </div>
                        <Badge className="bg-emerald-600 text-white font-bold">
                          Live Active Awards
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-background p-3 rounded-lg border">
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Badge Collection Date</span>
                          <span className="font-bold text-foreground text-sm flex items-center gap-1.5 mt-0.5 text-primary">
                            <Calendar className="h-4 w-4" />
                            {new Date(activeCycle.settings.collectionDate).toLocaleDateString("en-IN", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric"
                            })}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Collection Venue</span>
                          <span className="font-semibold text-foreground block mt-0.5">
                            {activeCycle.settings.collectionVenue}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 rounded-lg border bg-background p-3 space-y-3">
                        <p className="text-xs font-bold flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-primary" />
                          Change collection details &amp; notify winners
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-[11px] font-bold">New Collection Date</Label>
                            <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                          </div>
                          <div>
                            <Label className="text-[11px] font-bold">Collection Venue</Label>
                            <Input value={editVenue} onChange={(e) => setEditVenue(e.target.value)} />
                          </div>
                        </div>
                        <div>
                          <Label className="text-[11px] font-bold">Message to winners</Label>
                          <Textarea
                            rows={2}
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                            placeholder="Bring your student ID card to collect the badge."
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" disabled={savingCollection} onClick={() => saveCollectionDetails(true)}>
                            {savingCollection ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <UserCheck className="h-4 w-4 mr-2" />
                            )}
                            Update &amp; Notify {activeCycle.winners.length} Winner(s)
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={savingCollection}
                            onClick={() => saveCollectionDetails(false)}
                          >
                            Save without notifying
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* List of active winners */}
                  <div className="border rounded-xl divide-y divide-border overflow-hidden">
                    <div className="p-3 bg-muted/40 font-bold text-xs flex justify-between">
                      <span>Award Winner</span>
                      <span>Award Category</span>
                    </div>
                    {activeCycle.winners.map((w) => (
                      <div key={w.studentId + w.badgeType} className="p-3 flex items-center justify-between text-xs hover:bg-muted/20">
                        <div>
                          <p className="font-bold text-foreground text-sm">{w.studentName}</p>
                          <p className="text-muted-foreground text-[11px]">
                            {w.scopeValue} · Admn #{w.admissionNumber} · {w.points} XP · {w.booksIssuedCount} Books Borrowed
                          </p>
                        </div>
                        <Badge className={w.badgeType === "best_library_user" ? "bg-amber-500 text-white" : "bg-indigo-600 text-white"}>
                          {w.badgeType === "best_library_user" ? "👑 Best Library User" : "📚 Reader of the Month"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-muted-foreground space-y-3">
                  <Award className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                  <h4 className="font-bold text-base text-foreground">No Verified Active Cycle Yet</h4>
                  <p className="text-xs max-w-sm mx-auto">
                    Run the analysis for {cycleLabel}, verify the candidate list, set the collection date, and click &ldquo;Verify &amp; Issue Badges&rdquo;.
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Tab 3: Settings & Verification Config */}
            <TabsContent value="settings" className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
              <Card className="border-border/60">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Physical Badge Collection Setup (Required for Student Popup)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    This date and location will be displayed in the celebratory popup modal shown to student winners upon login.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <Label className="text-xs font-bold">Physical Badge Collection Date *</Label>
                    <Input
                      type="date"
                      value={settings.collectionDate}
                      onChange={(e) => setSettings({ ...settings, collectionDate: e.target.value })}
                      className="mt-1.5 h-10"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Students will be notified to visit the library on this specific date.
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs font-bold">Collection Venue / Instructions *</Label>
                    <Input
                      value={settings.collectionVenue}
                      onChange={(e) => setSettings({ ...settings, collectionVenue: e.target.value })}
                      placeholder="e.g. Central Library Counter during Lunch Break / 4th Period"
                      className="mt-1.5 h-10"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold">Librarian Congratulatory Note</Label>
                    <Textarea
                      rows={2}
                      value={settings.librarianNote}
                      onChange={(e) => setSettings({ ...settings, librarianNote: e.target.value })}
                      className="mt-1.5 text-xs"
                      placeholder="Special note or instructions for the winners..."
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Thresholds and Weights Card */}
              <Card className="border-border/60">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Intelligent Scoring &amp; Threshold Rules
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Adjust the minimum XP required and weightage for book issues vs XP.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs font-bold">Minimum Points Threshold (XP)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={settings.minPointsThreshold}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            minPointsThreshold: Math.max(0, parseInt(e.target.value) || 0),
                          })
                        }
                        className="mt-1.5 h-10 font-bold"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        If student XP &lt; this, no badge is awarded to anyone in that section/class.
                      </p>
                    </div>

                    <div>
                      <Label className="text-xs font-bold">Books Issue Weight (Points per Book)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={settings.booksIssueWeight}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            booksIssueWeight: Math.max(0, parseInt(e.target.value) || 0),
                          })
                        }
                        className="mt-1.5 h-10 font-bold"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Default: 25 pts per book borrowed in the evaluation period.
                      </p>
                    </div>

                    <div>
                      <Label className="text-xs font-bold">XP Points Weight Multiplier</Label>
                      <Input
                        type="number"
                        step={0.1}
                        min={0.1}
                        value={settings.pointsWeight}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            pointsWeight: Math.max(0.1, parseFloat(e.target.value) || 1.0),
                          })
                        }
                        className="mt-1.5 h-10 font-bold"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Multiplier applied to student XP (default: 1.0).
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => {
                        runAnalysis();
                        toast({ title: "Rules Applied & Re-calculated" });
                      }}
                      className="text-xs font-semibold"
                    >
                      Apply &amp; Re-analyze
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            Cycle: <strong className="text-foreground">{cycleLabel}</strong> ·{" "}
            <strong>{stats.totalBadgesAwarded}</strong> Badges Ready to Issue
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              size="sm"
              onClick={() => setVerifyConfirmOpen(true)}
              disabled={stats.totalBadgesAwarded === 0 || loading || verifying}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Verify &amp; Issue Badges ({stats.totalBadgesAwarded})
            </Button>
          </div>
        </div>

        {/* Confirmation Dialog */}
        <Dialog open={verifyConfirmOpen} onOpenChange={setVerifyConfirmOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <Crown className="h-5 w-5 text-amber-500" />
                Confirm Badge Verification &amp; Issuance
              </DialogTitle>
              <DialogDescription className="text-xs space-y-2 pt-2">
                <p>
                  You are about to verify and publish the Rotational Badges for <strong>{cycleLabel}</strong>.
                </p>
                <div className="p-3 bg-muted rounded-lg space-y-1 text-foreground text-xs">
                  <p>• <strong>Total Badges:</strong> {stats.totalBadgesAwarded}</p>
                  <p>• <strong>Single Badge Rule:</strong> Strictly 1 badge per user (Class Toppers prioritized, Section runner-ups promoted).</p>
                  <p>• <strong>Physical Badge Collection Date:</strong> {settings.collectionDate}</p>
                  <p>• <strong>Venue:</strong> {settings.collectionVenue}</p>
                </div>
                <p className="text-emerald-700 dark:text-emerald-300 font-medium">
                  Winning students will receive notifications and a celebratory badge winning popup upon their next login!
                </p>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setVerifyConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleVerifyAndPublish}
                disabled={verifying}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {verifying ? "Issuing..." : "Confirm & Issue Badges"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default RotationalBadgeManager;
