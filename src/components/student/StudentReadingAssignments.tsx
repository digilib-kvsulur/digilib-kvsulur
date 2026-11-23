import { useEffect, useState } from "react";
import { BookOpen, CalendarClock, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export default function StudentReadingAssignments({ userId, studentClass }: { userId: string; studentClass?: string | null }) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [progress, setProgress] = useState<Map<string, any>>(new Map());
  const [bookTitles, setBookTitles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");

  const load = async () => {
    if (!studentClass) { setAssignments([]); setLoading(false); return; }
    setLoading(true);
    const [{ data: rows }, { data: progressRows }] = await Promise.all([
      (supabase as any).from("reading_assignments").select("id,title,description,book_ids,due_date,created_at").eq("class_level", studentClass).eq("status", "published").order("due_date", { ascending: true, nullsFirst: false }),
      (supabase as any).from("reading_assignment_progress").select("assignment_id,completed_at").eq("user_id", userId),
    ]);
    setAssignments(rows || []);
    setProgress(new Map((progressRows || []).map((item: any) => [item.assignment_id, item])));
    const ids = Array.from(new Set((rows || []).flatMap((item: any) => item.book_ids || [])));
    if (ids.length) {
      const { data: books } = await supabase.from("books").select("id,title").in("id", ids);
      setBookTitles(new Map((books || []).map((book) => [book.id, book.title])));
    } else setBookTitles(new Map());
    setLoading(false);
  };

  useEffect(() => { let alive = true; load().then(() => { if (!alive) return; }); return () => { alive = false; }; }, [userId, studentClass]);

  const toggleComplete = async (assignment: any) => {
    setSavingId(assignment.id);
    const current = progress.get(assignment.id);
    const completedAt = current?.completed_at ? null : new Date().toISOString();
    const { error } = await (supabase as any).from("reading_assignment_progress").upsert({ assignment_id: assignment.id, user_id: userId, completed_at: completedAt }, { onConflict: "assignment_id,user_id" });
    if (!error) await load();
    setSavingId("");
  };

  if (!loading && assignments.length === 0) return null;
  return <Card className="border-border/70"><CardHeader className="pb-3"><CardTitle className="text-base">Teacher reading assignments</CardTitle><p className="text-xs text-muted-foreground">Class {studentClass} · Your completion stays private to you and assigned class staff.</p></CardHeader><CardContent className="space-y-2">
    {loading ? <div role="status" className="flex items-center gap-2 py-3 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading assignments…</div> : assignments.map((assignment) => {
      const complete = Boolean(progress.get(assignment.id)?.completed_at);
      return <div key={assignment.id} className="flex items-center gap-3 rounded-xl border p-3"><BookOpen className="h-4 w-4 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{assignment.title}</p>{assignment.description && <p className="line-clamp-2 text-xs text-muted-foreground">{assignment.description}</p>}{assignment.book_ids?.length > 0 && <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs">{assignment.book_ids.map((bookId: string) => <a key={bookId} className="text-primary underline-offset-2 hover:underline" href={`/book/${bookId}`}>{bookTitles.get(bookId) || "Assigned book"}</a>)}</div>}<p className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted-foreground">{assignment.due_date && <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />Due {new Date(`${assignment.due_date}T00:00:00`).toLocaleDateString()}</span>}</p></div><Button variant={complete ? "secondary" : "outline"} size="sm" className="min-h-10 shrink-0 gap-1.5" disabled={savingId === assignment.id} onClick={() => toggleComplete(assignment)}>{savingId === assignment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : complete ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4" />}{complete ? "Done" : "Mark done"}</Button></div>;
    })}
  </CardContent></Card>;
}
