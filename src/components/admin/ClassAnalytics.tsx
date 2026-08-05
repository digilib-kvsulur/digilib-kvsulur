import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, Trophy, GraduationCap, Award, Search, FileSpreadsheet, ArrowUpRight, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Papa from "papaparse";
import StudentDetailModal from "./StudentDetailModal";

interface StudentAnalytic {
  id: string;
  name: string;
  admission_number: string;
  points: number;
  books_count: number;
  quiz_count: number;
}

interface ClassData {
  class_name: string;
  student_count: number;
  total_points: number;
  books_read: number;
  quiz_completions: number;
  students: StudentAnalytic[];
}

const ClassAnalytics = () => {
  const [classData, setClassData] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [detailUser, setDetailUser] = useState<any | null>(null);
  const [rawProfiles, setRawProfiles] = useState<Record<string, any>>({});

  useEffect(() => {
    loadClassAnalytics();
  }, []);

  const loadClassAnalytics = async () => {
    try {
      // Get all approved students using pagination to avoid the 1000-row limit
      let allStudents: any[] = [];
      const PAGE = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, student_class, points, admission_number, roll_number, role")
          .eq("role", "student")
          .eq("is_approved", true)
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allStudents = [...allStudents, ...data];
        if (data.length < PAGE) break;
        from += PAGE;
      }
      // Store raw profiles for detail modal
      const profileMap: Record<string, any> = {};
      allStudents.forEach((s: any) => { profileMap[s.id] = s; });
      setRawProfiles(profileMap);

      // Get reading history
      let allReading: any[] = [];
      from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("reading_history")
          .select("user_id")
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allReading = [...allReading, ...data];
        if (data.length < PAGE) break;
        from += PAGE;
      }

      // Get quiz results
      let allQuizzes: any[] = [];
      from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("quiz_results")
          .select("user_id")
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allQuizzes = [...allQuizzes, ...data];
        if (data.length < PAGE) break;
        from += PAGE;
      }

      // Pre-calculate counts for high performance
      const readingCountMap: Record<string, number> = {};
      allReading.forEach(rh => {
        if (rh.user_id) readingCountMap[rh.user_id] = (readingCountMap[rh.user_id] || 0) + 1;
      });

      const quizCountMap: Record<string, number> = {};
      allQuizzes.forEach(qr => {
        if (qr.user_id) quizCountMap[qr.user_id] = (quizCountMap[qr.user_id] || 0) + 1;
      });

      // Group students by class
      const classGroups: Record<string, any[]> = {};
      allStudents.forEach(student => {
        const className = (student.student_class || "Unassigned").trim();
        if (!classGroups[className]) {
          classGroups[className] = [];
        }
        classGroups[className].push(student);
      });

      // Calculate analytics
      const analyticsData: ClassData[] = Object.entries(classGroups).map(([className, classStudents]) => {
        const studentAnalytics = classStudents.map(student => {
          return {
            id: student.id,
            name: `${student.first_name || ""} ${student.last_name || ""}`.trim() || "Student",
            admission_number: student.admission_number || "—",
            points: student.points || 0,
            books_count: readingCountMap[student.id] || 0,
            quiz_count: quizCountMap[student.id] || 0
          };
        });

        return {
          class_name: className,
          student_count: classStudents.length,
          total_points: studentAnalytics.reduce((sum, s) => sum + s.points, 0),
          books_read: studentAnalytics.reduce((sum, s) => sum + s.books_count, 0),
          quiz_completions: studentAnalytics.reduce((sum, s) => sum + s.quiz_count, 0),
          students: studentAnalytics.sort((a, b) => b.points - a.points)
        };
      });

      // Sort classes alphanumeric (e.g. 6A, 6B, 7A...)
      const sortedClasses = analyticsData.sort((a, b) => 
        a.class_name.localeCompare(b.class_name, undefined, { numeric: true, sensitivity: 'base' })
      );
      setClassData(sortedClasses);

      // Default select the first class
      if (sortedClasses.length > 0) {
        setSelectedClass(sortedClasses[0].class_name);
      }
    } catch (error) {
      console.error("Error loading class analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const activeClassInfo = useMemo(() => {
    return classData.find(c => c.class_name === selectedClass);
  }, [classData, selectedClass]);

  const filteredStudents = useMemo(() => {
    if (!activeClassInfo) return [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return activeClassInfo.students;
    return activeClassInfo.students.filter(s =>
      s.name.toLowerCase().includes(query) || s.admission_number.toLowerCase().includes(query)
    );
  }, [activeClassInfo, searchQuery]);

  const topStudent = useMemo(() => {
    if (!activeClassInfo || activeClassInfo.students.length === 0) return null;
    return activeClassInfo.students[0];
  }, [activeClassInfo]);

  const avgPoints = useMemo(() => {
    if (!activeClassInfo || activeClassInfo.student_count === 0) return 0;
    return Math.round(activeClassInfo.total_points / activeClassInfo.student_count);
  }, [activeClassInfo]);

  const exportClassCsv = () => {
    if (!activeClassInfo) return;
    const exportData = activeClassInfo.students.map((s, idx) => ({
      Rank: idx + 1,
      Name: s.name,
      "Admission Number": s.admission_number,
      Points: s.points,
      "Books Read": s.books_count,
      "Quizzes Completed": s.quiz_count,
    }));
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Class_${selectedClass}_Analytics.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2"><div className="h-4 bg-gray-200 rounded w-20"></div></CardHeader>
              <CardContent><div className="h-8 bg-gray-200 rounded w-24"></div></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
            <GraduationCap className="h-5.5 w-5.5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Class-wise Analytics</h2>
            <p className="text-xs text-slate-500">Monitor reading performance, milestones and leaderboards by class</p>
          </div>
        </div>

        {activeClassInfo && (
          <Button onClick={exportClassCsv} variant="outline" size="sm" className="border-indigo-300 text-indigo-700 hover:bg-indigo-50">
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Export Class Report
          </Button>
        )}
      </div>

      {classData.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="text-center py-16">
            <GraduationCap className="h-14 w-14 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800 mb-1">No class data found</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">Assign students to classes to begin gathering analytics data.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* Class Sidebar Selector */}
          <div className="space-y-3 lg:col-span-1">
            <Card className="border-border/50">
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Select Class</CardTitle>
              </CardHeader>
              <CardContent className="p-2 pt-0 space-y-1">
                {classData.map(c => (
                  <button
                    key={c.class_name}
                    onClick={() => { setSelectedClass(c.class_name); setSearchQuery(""); }}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-between ${
                      selectedClass === c.class_name
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                        : "hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <span>Class {c.class_name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      selectedClass === c.class_name ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                    }`}>
                      {c.student_count}
                    </span>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Class Champion Card */}
            {topStudent && (
              <Card className="border-amber-200 bg-amber-500/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
                <CardContent className="pt-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-500" />
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-widest">Class Champion</span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 leading-snug">{topStudent.name}</h4>
                    <p className="text-[10px] text-slate-500 mt-1">UID: {topStudent.admission_number}</p>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[9px] text-amber-700 font-bold uppercase tracking-wider">Top Score</p>
                      <p className="text-xl font-black text-amber-600">{topStudent.points.toLocaleString()} <span className="text-xs font-medium">XP</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Books Read</p>
                      <p className="text-sm font-bold text-slate-800">{topStudent.books_count} books</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Class Analytics Pane */}
          {activeClassInfo && (
            <div className="lg:col-span-3 space-y-6">
              
              {/* Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Class Size", value: activeClassInfo.student_count, desc: "Total students", icon: Users, color: "text-blue-600", bg: "bg-blue-50 border-blue-100" },
                  { label: "Total Points", value: activeClassInfo.total_points.toLocaleString(), desc: "Accumulated XP", icon: Trophy, color: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
                  { label: "Average XP", value: avgPoints.toLocaleString(), desc: "XP per student", icon: Award, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
                  { label: "Books Read", value: activeClassInfo.books_read, desc: "Milestones met", icon: BookOpen, color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-100" },
                ].map((s, idx) => (
                  <Card key={idx} className={`border ${s.bg}`}>
                    <CardContent className="p-4 flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{s.label}</p>
                        <p className="text-2xl font-black text-slate-900 leading-none">{s.value}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{s.desc}</p>
                      </div>
                      <div className={`p-2 rounded-lg bg-white shadow-xs shrink-0`}>
                        <s.icon className={`h-4.5 w-4.5 ${s.color}`} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Leaderboard & Filter */}
              <Card className="border-border/50">
                <CardHeader className="py-4 border-b border-slate-100 flex flex-row items-center justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-indigo-600" /> Class {selectedClass} Leaderboard
                    </CardTitle>
                    <CardDescription className="text-xs">Ranking of all students in this class based on XP points</CardDescription>
                  </div>
                  <div className="relative w-48 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="Search student or UID..."
                      className="pl-9 h-8.5 rounded-lg text-xs"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/70 border-b text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4 w-12 text-center">Rank</th>
                          <th className="py-3 px-4">Student</th>
                          <th className="py-3 px-4">Admission #</th>
                          <th className="py-3 px-4 text-center">Books</th>
                          <th className="py-3 px-4 text-center">Quizzes</th>
                          <th className="py-3 px-4 text-right pr-4">XP points</th>
                          <th className="py-3 pr-3 w-6"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((s, idx) => (
                          <tr
                            key={s.id}
                            className="border-b last:border-0 hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                            onClick={() => setDetailUser(rawProfiles[s.id] || { id: s.id, first_name: s.name, last_name: '', admission_number: s.admission_number, points: s.points, role: 'student' })}
                          >
                            <td className="py-3 px-4 text-center font-bold text-slate-600">
                              {idx + 1 === 1 ? (
                                <span className="inline-flex w-5 h-5 bg-amber-100 text-amber-700 rounded-full items-center justify-center text-[10px]">🥇</span>
                              ) : idx + 1 === 2 ? (
                                <span className="inline-flex w-5 h-5 bg-slate-100 text-slate-600 rounded-full items-center justify-center text-[10px]">🥈</span>
                              ) : idx + 1 === 3 ? (
                                <span className="inline-flex w-5 h-5 bg-orange-100 text-orange-700 rounded-full items-center justify-center text-[10px]">🥉</span>
                              ) : (
                                idx + 1
                              )}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900">{s.name}</td>
                            <td className="py-3 px-4 font-mono text-slate-500">{s.admission_number}</td>
                            <td className="py-3 px-4 text-center font-semibold text-slate-700">{s.books_count}</td>
                            <td className="py-3 px-4 text-center font-semibold text-slate-700">{s.quiz_count}</td>
                            <td className="py-3 px-4 text-right font-black text-indigo-600 pr-4">{s.points.toLocaleString()}</td>
                            <td className="py-2 pr-3 text-right">
                              <Eye className="h-3.5 w-3.5 text-indigo-300 group-hover:text-indigo-500 transition-colors" />
                            </td>
                          </tr>
                        ))}

                        {filteredStudents.length === 0 && (
                          <tr>
                            <td colSpan={7} className="text-center py-10 text-slate-500">
                              No students match your search filter.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      )}

      {/* Student Detail Modal */}
      <StudentDetailModal user={detailUser} onClose={() => setDetailUser(null)} />

      {/* Popular books heatmap: class × month borrow counts */}
      <BorrowHeatmap />
    </div>
  );
};

function BorrowHeatmap() {
  const [cells, setCells] = useState<{ className: string; month: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: issues } = await supabase
        .from("book_issues")
        .select("user_id, issue_date")
        .gte("issue_date", new Date(new Date().getFullYear(), 0, 1).toISOString());
      const userIds = Array.from(new Set((issues || []).map((i) => i.user_id)));
      let classMap: Record<string, string> = {};
      if (userIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, student_class").in("id", userIds);
        (profs || []).forEach((p) => { classMap[p.id] = p.student_class || "Unknown"; });
      }
      const map = new Map<string, number>();
      (issues || []).forEach((i) => {
        const cls = classMap[i.user_id] || "Unknown";
        const month = (i.issue_date || "").substring(0, 7);
        if (!month) return;
        const key = `${cls}|${month}`;
        map.set(key, (map.get(key) || 0) + 1);
      });
      setCells(Array.from(map.entries()).map(([k, count]) => {
        const [className, month] = k.split("|");
        return { className, month, count };
      }));
      setLoading(false);
    })();
  }, []);

  const classes = Array.from(new Set(cells.map((c) => c.className))).sort();
  const months = Array.from(new Set(cells.map((c) => c.month))).sort();
  const max = Math.max(1, ...cells.map((c) => c.count));
  const lookup = (cls: string, m: string) => cells.find((c) => c.className === cls && c.month === m)?.count || 0;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-lg">Popular Books by Class (Heatmap)</CardTitle>
        <CardDescription>Borrow counts by class and month (this year)</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-24 flex items-center justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
        ) : months.length === 0 ? (
          <p className="text-sm text-muted-foreground">No borrow data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-left">Class</th>
                  {months.map((m) => <th key={m} className="p-2 font-medium">{m.slice(5)}</th>)}
                </tr>
              </thead>
              <tbody>
                {classes.map((cls) => (
                  <tr key={cls}>
                    <td className="p-2 font-medium whitespace-nowrap">{cls}</td>
                    {months.map((m) => {
                      const n = lookup(cls, m);
                      const intensity = n / max;
                      return (
                        <td key={m} className="p-1">
                          <div
                            className="w-10 h-8 rounded flex items-center justify-center text-[10px] font-semibold"
                            style={{ backgroundColor: `rgba(79, 70, 229, ${0.12 + intensity * 0.75})`, color: intensity > 0.55 ? "#fff" : "#312e81" }}
                            title={`${cls} ${m}: ${n}`}
                          >
                            {n || ""}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ClassAnalytics;
