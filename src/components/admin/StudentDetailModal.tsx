import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, ListChecks, Brain, Trophy, Flame, Hash, Calendar, CheckCircle, Clock, AlertTriangle } from "lucide-react";

interface StudentDetailModalProps {
  user: any | null;
  onClose: () => void;
}

export default function StudentDetailModal({ user, onClose }: StudentDetailModalProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [allIssues, setAllIssues] = useState<any[]>([]);
  const [streaks, setStreaks] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      supabase.from("reading_history")
        .select("id, book_title, book_author, completed_date, rating, points_earned, status")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .order("completed_date", { ascending: false }),
      supabase.from("quiz_results")
        .select("id, score, points_earned, completed_at, quizzes(title)")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false }),
      supabase.from("book_issues")
        .select("id, issue_date, due_date, status, accession_number, return_date, books(title, author)")
        .eq("user_id", user.id)
        .eq("status", "issued"),
      supabase.from("book_issues")
        .select("id, issue_date, due_date, status, accession_number, return_date, books(title, author)")
        .eq("user_id", user.id)
        .order("issue_date", { ascending: false }),
      supabase.from("login_streaks")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]).then(([{ data: h }, { data: q }, { data: active }, { data: all }, { data: s }]) => {
      setHistory(h || []);
      setQuizzes(q || []);
      setIssues(active || []);
      setAllIssues(all || []);
      setStreaks(s);
      setLoading(false);
    });
  }, [user?.id]);

  if (!user) return null;

  const today = new Date();
  const overdueIssues = issues.filter(i => new Date(i.due_date) < today);
  const isStudent = user.role !== "teacher";
  const idLabel = isStudent ? "Admn" : "Emp Code";
  const idValue = user.admission_number;

  return (
    <Dialog open={!!user} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {user.first_name} {user.last_name}
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2 text-xs">
            <span>{isStudent ? "Student" : "Teacher"} · {user.student_class ? `Class ${user.student_class}` : "No class"}</span>
            {user.roll_number && <span>· Roll #{user.roll_number}</span>}
            {idValue && <Badge variant="outline" className="font-mono text-[10px]">{idLabel}: {idValue}</Badge>}
            {user.email && <span className="text-muted-foreground">{user.email}</span>}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-5 mt-2">
            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Trophy, label: "Points", value: user.points || 0, color: "text-amber-500", bg: "bg-amber-50" },
                { icon: BookOpen, label: "Books Read", value: history.length, color: "text-indigo-500", bg: "bg-indigo-50" },
                { icon: BookOpen, label: "Currently Out", value: issues.length, color: issues.length > 0 ? "text-orange-500" : "text-slate-400", bg: issues.length > 0 ? "bg-orange-50" : "bg-muted/40" },
                { icon: Flame, label: "Streak", value: `${streaks?.current_streak || 0}d`, color: "text-rose-500", bg: "bg-rose-50" },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                  <s.icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
                  <p className="text-xl font-extrabold text-foreground">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Currently Borrowed */}
            <section>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-orange-500" />
                Currently Borrowed ({issues.length})
                {overdueIssues.length > 0 && (
                  <Badge variant="destructive" className="text-[9px] ml-1">
                    <AlertTriangle className="h-2.5 w-2.5 mr-1" />{overdueIssues.length} overdue
                  </Badge>
                )}
              </h4>
              {issues.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No books checked out currently.</p>
              ) : (
                <div className="space-y-1.5">
                  {issues.map(i => {
                    const overdue = new Date(i.due_date) < today;
                    return (
                      <div key={i.id} className={`p-2.5 rounded-lg border text-xs flex flex-wrap items-center justify-between gap-2 ${overdue ? 'border-destructive/30 bg-destructive/5' : 'bg-card'}`}>
                        <div className="min-w-0">
                          <span className="font-semibold">{i.books?.title}</span>
                          <span className="text-muted-foreground ml-2">by {i.books?.author}</span>
                          {i.accession_number && (
                            <span className="ml-2 font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">#{i.accession_number}</span>
                          )}
                        </div>
                        <div className="flex gap-1.5 shrink-0 items-center">
                          <span className="text-[10px] text-muted-foreground">
                            <Calendar className="h-3 w-3 inline mr-0.5" />Issued {new Date(i.issue_date).toLocaleDateString()}
                          </span>
                          <Badge variant={overdue ? "destructive" : "outline"} className="text-[9px]">
                            {overdue ? "Overdue" : "Due"} {new Date(i.due_date).toLocaleDateString()}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* All Issue History */}
            <section>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Hash className="h-4 w-4 text-slate-400" />
                Issue History ({allIssues.length} total)
              </h4>
              {allIssues.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No issue history.</p>
              ) : (
                <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                  {allIssues.map(i => (
                    <div key={i.id} className="p-2 rounded-lg border text-xs flex flex-wrap items-center justify-between gap-2 bg-card">
                      <div className="min-w-0">
                        <span className="font-medium">{i.books?.title}</span>
                        {i.accession_number && (
                          <span className="ml-2 font-mono text-[10px] text-muted-foreground">#{i.accession_number}</span>
                        )}
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {i.status === "returned" ? (
                          <Badge variant="secondary" className="text-[9px]">
                            <CheckCircle className="h-2.5 w-2.5 mr-0.5" /> Returned {i.return_date ? new Date(i.return_date).toLocaleDateString() : ""}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px]">
                            <Clock className="h-2.5 w-2.5 mr-0.5" /> Due {new Date(i.due_date).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Reading History */}
            <section>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <ListChecks className="h-4 w-4 text-indigo-400" />
                Reading History — Approved ({history.length})
              </h4>
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No approved readings yet.</p>
              ) : (
                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                  {history.map(h => (
                    <div key={h.id} className="p-2.5 rounded-lg border text-xs flex justify-between items-center bg-card">
                      <div>
                        <span className="font-semibold">{h.book_title}</span>
                        <span className="text-muted-foreground ml-2">by {h.book_author}</span>
                      </div>
                      <div className="flex gap-2 shrink-0 items-center">
                        {h.rating && <Badge variant="secondary">⭐ {h.rating}/5</Badge>}
                        <span className="text-[10px] text-muted-foreground">{new Date(h.completed_date).toLocaleDateString()}</span>
                        <Badge className="bg-green-100 text-green-700 text-[9px]">+{h.points_earned}pts</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Quiz Results */}
            <section>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Brain className="h-4 w-4 text-purple-400" />
                Quiz Results ({quizzes.length})
              </h4>
              {quizzes.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No quizzes completed yet.</p>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {quizzes.map(q => (
                    <div key={q.id} className="p-2.5 rounded-lg border text-xs flex justify-between items-center bg-card">
                      <div>
                        <span className="font-semibold">{(q.quizzes as any)?.title || "Quiz"}</span>
                        <span className="text-muted-foreground ml-2">+{q.points_earned} XP</span>
                      </div>
                      <Badge className={q.score >= 75 ? "bg-success text-white" : "bg-warning text-white"}>
                        {q.score}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
