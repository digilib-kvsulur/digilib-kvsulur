import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, LogOut, Users, Trophy, GraduationCap, TrendingUp, Calendar } from "lucide-react";
import NotificationBell from "@/components/dashboard/NotificationBell";

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [teacher, setTeacher] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [classes, setClasses] = useState<string[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      if (!profile || (profile.role !== "teacher" && profile.role !== "admin")) {
        toast({ title: "Access denied", variant: "destructive" });
        navigate("/"); return;
      }
      setTeacher(profile);
      const initial = profile.student_class || "";
      const { data: cls } = await supabase.from("profiles").select("student_class").eq("role", "student").eq("is_approved", true);
      const uniq = Array.from(new Set((cls || []).map((c: any) => c.student_class).filter(Boolean))).sort();
      setClasses(uniq as string[]);
      setSelectedClass(initial || (uniq[0] as string) || "");
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    (async () => {
      const { data: st } = await supabase.from("profiles")
        .select("id, first_name, last_name, roll_number, points, student_class")
        .eq("role", "student").eq("is_approved", true).eq("student_class", selectedClass)
        .order("points", { ascending: false });
      setStudents(st || []);
      const ids = (st || []).map((s: any) => s.id);
      if (ids.length) {
        const { data: bi } = await supabase.from("book_issues")
          .select("id, user_id, status, due_date, books(title)")
          .in("user_id", ids).eq("status", "issued");
        setIssues(bi || []);
      } else setIssues([]);
    })();
  }, [selectedClass]);

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/login"); };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-10 w-10 border-b-2 border-primary rounded-full" /></div>;

  const totalPoints = students.reduce((s, x) => s + (x.points || 0), 0);
  const avgPoints = students.length ? Math.round(totalPoints / students.length) : 0;
  const overdue = issues.filter(i => i.due_date && new Date(i.due_date) < new Date()).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 gradient-primary rounded-lg flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold">Teacher Dashboard</h1>
              <p className="text-xs text-muted-foreground">Welcome, {teacher?.first_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button variant="outline" size="sm" onClick={() => navigate("/catalog")}>Catalog</Button>
            <Button variant="outline" size="sm" onClick={handleLogout}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Viewing class:</span>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {classes.map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4"><Users className="h-5 w-5 text-primary mb-2" /><p className="text-2xl font-bold">{students.length}</p><p className="text-xs text-muted-foreground">Students</p></CardContent></Card>
          <Card><CardContent className="p-4"><Trophy className="h-5 w-5 text-warning mb-2" /><p className="text-2xl font-bold">{avgPoints}</p><p className="text-xs text-muted-foreground">Avg points</p></CardContent></Card>
          <Card><CardContent className="p-4"><BookOpen className="h-5 w-5 text-success mb-2" /><p className="text-2xl font-bold">{issues.length}</p><p className="text-xs text-muted-foreground">Books out</p></CardContent></Card>
          <Card><CardContent className="p-4"><Calendar className="h-5 w-5 text-destructive mb-2" /><p className="text-2xl font-bold">{overdue}</p><p className="text-xs text-muted-foreground">Overdue</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Class leaderboard</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {students.length === 0 && <p className="text-sm text-muted-foreground">No students in this class yet.</p>}
              {students.map((s, i) => {
                const active = issues.filter(x => x.user_id === s.id);
                return (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">{i + 1}</div>
                      <div>
                        <p className="font-medium text-sm">{s.first_name} {s.last_name}</p>
                        <p className="text-xs text-muted-foreground">Roll {s.roll_number || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{active.length} borrowed</Badge>
                      <Badge className="gradient-primary text-primary-foreground">{s.points || 0} pts</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TeacherDashboard;
