import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Award, Medal, Crown, Printer, Download, Search, RefreshCw, 
  Calendar, CheckCircle2, Filter, Sparkles, FileSpreadsheet, ShieldCheck
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TopStudent {
  id: string;
  first_name: string;
  last_name?: string;
  student_class: string;
  admission_number?: string;
  points: number;
  rank: number;
  badgeType: "Gold" | "Silver" | "Bronze";
}

interface ClassBadgeGroup {
  className: string;
  topStudents: TopStudent[];
}

interface PhysicalBadgeGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PhysicalBadgeGenerator: React.FC<PhysicalBadgeGeneratorProps> = ({
  open,
  onOpenChange,
}) => {
  const { toast } = useToast();
  const [period, setPeriod] = useState<"monthly" | "lifetime">("monthly");
  const [loading, setLoading] = useState(false);
  const [classGroups, setClassGroups] = useState<ClassBadgeGroup[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("all");

  useEffect(() => {
    if (open) {
      fetchTopStudentsPerClass();
    }
  }, [open, period]);

  const fetchTopStudentsPerClass = async () => {
    setLoading(true);
    try {
      // 1. Fetch all student profiles
      let allStudents: any[] = [];
      let from = 0;
      const PAGE_SIZE = 1000;

      while (true) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, student_class, admission_number, points, monthly_points, role")
          .eq("role", "student")
          .not("student_class", "is", null)
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        allStudents = [...allStudents, ...data];
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      // Filter out students without class
      const validStudents = allStudents.filter(
        (s) => s.student_class && s.student_class.trim() !== ""
      );

      // Group students by student_class
      const groupsMap: Record<string, any[]> = {};
      validStudents.forEach((student) => {
        const rawClass = (student.student_class || "").trim().toUpperCase();
        if (!groupsMap[rawClass]) groupsMap[rawClass] = [];
        
        const effectivePoints = period === "monthly" 
          ? (Number(student.monthly_points) || 0) 
          : (Number(student.points) || 0);

        groupsMap[rawClass].push({
          ...student,
          effectivePoints,
        });
      });

      // Sort classes naturally (e.g. 6A, 6B, 7A, 8A... 12B)
      const sortedClasses = Object.keys(groupsMap).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ""), 10) || 0;
        const numB = parseInt(b.replace(/\D/g, ""), 10) || 0;
        if (numA !== numB) return numA - numB;
        return a.localeCompare(b);
      });

      const compiledGroups: ClassBadgeGroup[] = [];

      sortedClasses.forEach((cls) => {
        const studentList = groupsMap[cls];
        // Sort descending by points
        studentList.sort((a, b) => {
          if (b.effectivePoints !== a.effectivePoints) {
            return b.effectivePoints - a.effectivePoints;
          }
          return (a.first_name || "").localeCompare(b.first_name || "");
        });

        // Pick top 3
        const top3 = studentList.slice(0, 3).map((s, idx) => {
          const rank = idx + 1;
          const badgeType: "Gold" | "Silver" | "Bronze" = 
            rank === 1 ? "Gold" : rank === 2 ? "Silver" : "Bronze";

          return {
            id: s.id,
            first_name: s.first_name || "Unknown",
            last_name: s.last_name || "",
            student_class: cls,
            admission_number: s.admission_number || "—",
            points: s.effectivePoints,
            rank,
            badgeType,
          };
        });

        if (top3.length > 0) {
          compiledGroups.push({
            className: cls,
            topStudents: top3,
          });
        }
      });

      setClassGroups(compiledGroups);
    } catch (error: any) {
      console.error("Error generating top badge list:", error);
      toast({
        title: "Error Generating Badge List",
        description: error?.message || "Failed to compile top learners list.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = useMemo(() => {
    return classGroups
      .filter((group) => {
        if (selectedClass !== "all" && group.className !== selectedClass) {
          return false;
        }
        if (!searchFilter.trim()) return true;
        const q = searchFilter.toLowerCase();
        return (
          group.className.toLowerCase().includes(q) ||
          group.topStudents.some(
            (s) =>
              s.first_name.toLowerCase().includes(q) ||
              (s.last_name && s.last_name.toLowerCase().includes(q)) ||
              (s.admission_number && s.admission_number.toLowerCase().includes(q))
          )
        );
      })
      .map((group) => {
        if (!searchFilter.trim()) return group;
        const q = searchFilter.toLowerCase();
        if (group.className.toLowerCase().includes(q)) return group;
        return {
          ...group,
          topStudents: group.topStudents.filter(
            (s) =>
              s.first_name.toLowerCase().includes(q) ||
              (s.last_name && s.last_name.toLowerCase().includes(q)) ||
              (s.admission_number && s.admission_number.toLowerCase().includes(q))
          ),
        };
      })
      .filter((group) => group.topStudents.length > 0);
  }, [classGroups, searchFilter, selectedClass]);

  const totalBadgesCount = useMemo(() => {
    return classGroups.reduce((acc, g) => acc + g.topStudents.length, 0);
  }, [classGroups]);

  const handleExportCSV = () => {
    try {
      const rows = [
        ["Class", "Rank", "Badge Tier", "Student Name", "Admission No", "Points", "Period", "Date Generated", "Signature/Received By"]
      ];

      const dateStr = new Date().toLocaleDateString("en-IN");
      const periodLabel = period === "monthly" ? "Current Month" : "All-Time Lifetime";

      classGroups.forEach((group) => {
        group.topStudents.forEach((student) => {
          const fullName = `${student.first_name} ${student.last_name || ""}`.trim();
          rows.push([
            `"${group.className}"`,
            `"#${student.rank}"`,
            `"${student.badgeType} Badge"`,
            `"${fullName}"`,
            `"${student.admission_number}"`,
            `"${student.points}"`,
            `"${periodLabel}"`,
            `"${dateStr}"`,
            `""`
          ]);
        });
      });

      const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `KV-Sulur-Physical-Badges-Top3-${period}-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "CSV Exported! 📊",
        description: `Exported ${totalBadgesCount} badge awardees for physical distribution.`,
      });
    } catch (e: any) {
      toast({ title: "Export Error", description: e?.message, variant: "destructive" });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getBadgeStyle = (tier: "Gold" | "Silver" | "Bronze") => {
    switch (tier) {
      case "Gold":
        return {
          icon: <Crown className="h-4 w-4 text-yellow-600 dark:text-yellow-400 fill-yellow-500/20" />,
          bg: "bg-yellow-500/15 text-yellow-800 dark:text-yellow-300 border-yellow-500/40",
          border: "border-l-4 border-l-yellow-500",
          label: "1st Place · Gold Badge",
        };
      case "Silver":
        return {
          icon: <Medal className="h-4 w-4 text-slate-500 dark:text-slate-300 fill-slate-400/20" />,
          bg: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-400/40",
          border: "border-l-4 border-l-slate-400",
          label: "2nd Place · Silver Badge",
        };
      case "Bronze":
        return {
          icon: <Award className="h-4 w-4 text-amber-700 dark:text-amber-500 fill-amber-600/20" />,
          bg: "bg-amber-600/15 text-amber-900 dark:text-amber-300 border-amber-600/40",
          border: "border-l-4 border-l-amber-600",
          label: "3rd Place · Bronze Badge",
        };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[96vw] max-h-[92vh] flex flex-col p-0 overflow-hidden border border-border shadow-2xl rounded-2xl bg-card">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-border bg-muted/40 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <Award className="h-5 w-5" />
                </div>
                <DialogTitle className="text-xl font-black text-foreground flex items-center gap-2">
                  Top 3 Per Class Badge List 🎖️
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Generate the top three students of each class together to distribute physical Gold, Silver, and Bronze badges.
              </DialogDescription>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex rounded-xl border border-primary/20 bg-background p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setPeriod("monthly")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                    period === "monthly"
                      ? "gradient-primary text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setPeriod("lifetime")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                    period === "lifetime"
                      ? "gradient-primary text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Crown className="h-3.5 w-3.5" />
                  All-Time
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={loading || classGroups.length === 0}
                className="h-9 gap-1.5 text-xs font-bold rounded-xl border-border"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                Export CSV
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={handlePrint}
                disabled={loading || classGroups.length === 0}
                className="h-9 gap-1.5 text-xs font-bold rounded-xl gradient-primary text-white border-0 shadow-sm"
              >
                <Printer className="h-4 w-4" />
                Print List
              </Button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/60">
            <div className="p-2.5 rounded-xl bg-card border border-border/60 text-center">
              <p className="text-lg font-black text-foreground">{classGroups.length}</p>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Classes Evaluated</p>
            </div>
            <div className="p-2.5 rounded-xl bg-card border border-border/60 text-center">
              <p className="text-lg font-black text-yellow-600 dark:text-yellow-400">
                {classGroups.filter(g => g.topStudents.some(s => s.rank === 1)).length} 🥇
              </p>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Gold Badges</p>
            </div>
            <div className="p-2.5 rounded-xl bg-card border border-border/60 text-center">
              <p className="text-lg font-black text-slate-500 dark:text-slate-300">
                {classGroups.filter(g => g.topStudents.some(s => s.rank === 2)).length} 🥈
              </p>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Silver Badges</p>
            </div>
            <div className="p-2.5 rounded-xl bg-card border border-border/60 text-center">
              <p className="text-lg font-black text-amber-600 dark:text-amber-400">
                {classGroups.filter(g => g.topStudents.some(s => s.rank === 3)).length} 🥉
              </p>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Bronze Badges</p>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="px-4 sm:px-6 py-2.5 border-b border-border bg-card flex items-center gap-3 flex-wrap shrink-0">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by student name, admission number, or class..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="h-8 pl-8 text-xs rounded-lg"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Class Filter:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="h-8 text-xs rounded-lg border border-input bg-background px-2.5 font-medium focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Classes ({classGroups.length})</option>
              {classGroups.map((g) => (
                <option key={g.className} value={g.className}>
                  Class {g.className}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchTopStudentsPerClass}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-sm font-semibold text-foreground">Analyzing leaderboard points across all classes…</p>
              <p className="text-xs text-muted-foreground">Ranking Top 3 earners for each section</p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="py-16 text-center space-y-2 border border-dashed border-border rounded-2xl">
              <Award className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-bold text-foreground">No matching classes or students found</p>
              <p className="text-xs text-muted-foreground">Try clearing your search or filter</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredGroups.map((group) => (
                <div 
                  key={group.className} 
                  className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm"
                >
                  <div className="p-3.5 bg-muted/50 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-foreground bg-primary/10 text-primary px-2.5 py-0.5 rounded-md">
                        Class {group.className}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">
                        {group.topStudents.length} Badge Recipient(s)
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-muted-foreground">
                      {period === "monthly" ? "Monthly Standings" : "Lifetime Standings"}
                    </Badge>
                  </div>

                  <div className="divide-y divide-border/60">
                    {group.topStudents.map((student) => {
                      const badgeStyle = getBadgeStyle(student.badgeType);
                      const fullName = `${student.first_name} ${student.last_name || ""}`.trim();

                      return (
                        <div
                          key={student.id}
                          className={`p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:bg-muted/20 ${badgeStyle.border}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 font-bold text-xs">
                              #{student.rank}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-foreground truncate flex items-center gap-1.5">
                                {fullName}
                                <Badge className={`text-[10px] font-bold px-2 py-0.2 border ${badgeStyle.bg}`}>
                                  {badgeStyle.icon}
                                  <span className="ml-1">{student.badgeType} Badge</span>
                                </Badge>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Admission No: <span className="font-mono text-foreground font-medium">{student.admission_number}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0 sm:text-right">
                            <div>
                              <p className="text-sm font-black text-primary">
                                {student.points.toLocaleString()} XP
                              </p>
                              <p className="text-[10px] text-muted-foreground font-medium">
                                {period === "monthly" ? "Earned This Month" : "Total Lifetime XP"}
                              </p>
                            </div>
                            <div className="hidden sm:block border-l border-border/80 pl-4 text-[11px] text-muted-foreground font-medium text-left">
                              <span className="text-[10px] text-muted-foreground/70 block uppercase">Distribution</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Ready
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Printable Section (Hidden in Screen, Visible in Print) */}
        <div className="hidden print:block fixed inset-0 bg-white p-8 z-[9999] text-black">
          <div className="text-center pb-4 border-b-2 border-black space-y-1">
            <h1 className="text-xl font-black uppercase tracking-wide">PM SHRI KENDRIYA VIDYALAYA SULUR</h1>
            <h2 className="text-sm font-bold">DIGITAL LIBRARY MANAGEMENT SYSTEM (DLMS)</h2>
            <h3 className="text-base font-extrabold uppercase pt-1">
              CLASS-WISE TOPPERS &amp; PHYSICAL BADGE DISTRIBUTION SHEET
            </h3>
            <p className="text-xs font-semibold">
              Period: {period === "monthly" ? "Current Monthly Leaderboard" : "Lifetime Cumulative Leaderboard"} | Generated Date: {new Date().toLocaleDateString("en-IN")}
            </p>
          </div>

          <div className="py-4 space-y-6">
            {classGroups.map((group) => (
              <div key={group.className} className="break-inside-avoid space-y-2 mb-4">
                <h4 className="text-sm font-black bg-gray-200 px-3 py-1 border border-black">
                  CLASS: {group.className}
                </h4>
                <table className="w-full text-xs border-collapse border border-black">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black p-1.5 text-center w-12">Rank</th>
                      <th className="border border-black p-1.5 text-left">Student Name</th>
                      <th className="border border-black p-1.5 text-center w-28">Admission No</th>
                      <th className="border border-black p-1.5 text-center w-28">Badge Award</th>
                      <th className="border border-black p-1.5 text-right w-20">Points</th>
                      <th className="border border-black p-1.5 text-center w-36">Student Signature</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.topStudents.map((s) => (
                      <tr key={s.id}>
                        <td className="border border-black p-1.5 text-center font-bold">#{s.rank}</td>
                        <td className="border border-black p-1.5 font-bold">{s.first_name} {s.last_name || ""}</td>
                        <td className="border border-black p-1.5 text-center">{s.admission_number}</td>
                        <td className="border border-black p-1.5 text-center font-bold">
                          {s.badgeType === "Gold" ? "🥇 GOLD" : s.badgeType === "Silver" ? "🥈 SILVER" : "🥉 BRONZE"}
                        </td>
                        <td className="border border-black p-1.5 text-right font-mono">{s.points}</td>
                        <td className="border border-black p-1.5"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          <div className="pt-12 flex justify-between text-xs font-bold border-t border-black mt-8">
            <div className="text-center">
              <p className="pb-10">_______________________________</p>
              <p>Librarian Signature</p>
            </div>
            <div className="text-center">
              <p className="pb-10">_______________________________</p>
              <p>Principal Signature</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PhysicalBadgeGenerator;
