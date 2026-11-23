import { useEffect, useState } from "react";
import { BookOpen, CalendarClock, CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type BookOption = { id: string; title: string; author?: string | null };

export default function ReadingAssignmentsManager({ classLevel, assignedClass, teacherId, books, canAdminister = false }: { classLevel: string; assignedClass?: string | null; teacherId: string; books: BookOption[]; canAdminister?: boolean }) {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [bookIds, setBookIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const canManage = canAdminister || Boolean(assignedClass && assignedClass === classLevel);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("reading_assignments").select("*").eq("class_level", classLevel).order("created_at", { ascending: false });
    const rows = data || [];
    setAssignments(rows);
    if (canManage && rows.length) {
      const [{ data: completionRows }, { data: classStudents }] = await Promise.all([
        (supabase as any).from("reading_assignment_progress").select("assignment_id,user_id,completed_at").in("assignment_id", rows.map((item: any) => item.id)),
        supabase.rpc("get_teacher_class_students", { p_class: classLevel }),
      ]);
      setProgress(completionRows || []);
      setStudents(classStudents || []);
    } else { setProgress([]); setStudents([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [classLevel, canManage]);

  const createAssignment = async () => {
    if (!canManage || !title.trim() || !bookIds.length) return;
    setSaving(true);
    const { error } = await (supabase as any).from("reading_assignments").insert({ class_level: classLevel, title: title.trim(), description: description.trim() || null, due_date: dueDate || null, book_ids: bookIds, created_by: teacherId });
    setSaving(false);
    if (error) { toast({ title: "Assignment could not be created", description: error.message, variant: "destructive" }); return; }
    setTitle(""); setDescription(""); setDueDate(""); setBookIds([]); setQuery("");
    await load();
    toast({ title: "Reading assigned", description: `Class ${classLevel} students can now see the assignment.` });
  };

  const archiveAssignment = async (id: string) => {
    const { error } = await (supabase as any).from("reading_assignments").update({ status: "archived" }).eq("id", id);
    if (!error) await load();
  };

  return <div className="space-y-4">
    {canManage ? <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Plus className="h-4 w-4 text-primary" /> Assign reading to Class {classLevel}</CardTitle><CardDescription>Choose books and a due date. Students see the assignment and can mark it complete; you see completion counts for this class.</CardDescription></CardHeader><CardContent className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="assignment-title">Assignment title</Label><Input id="assignment-title" value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Read a book about space" /></div><div className="space-y-2"><Label htmlFor="assignment-due">Due date (optional)</Label><Input id="assignment-due" type="date" min={new Date().toISOString().slice(0, 10)} value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div></div>
      <div className="space-y-2"><Label htmlFor="assignment-description">Instructions (optional)</Label><Textarea id="assignment-description" value={description} maxLength={1000} onChange={(e) => setDescription(e.target.value)} placeholder="What should students read or reflect on?" rows={2} /></div>
      <div className="space-y-2"><Label htmlFor="assignment-book-search">Select books ({bookIds.length} selected)</Label><Input id="assignment-book-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a catalog book" /><div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border p-2">{books.filter((book) => `${book.title} ${book.author || ""}`.toLowerCase().includes(query.toLowerCase())).slice(0, 30).map((book) => <label key={book.id} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm hover:bg-muted"><input type="checkbox" checked={bookIds.includes(book.id)} onChange={() => setBookIds((current) => current.includes(book.id) ? current.filter((id) => id !== book.id) : [...current, book.id])} /><span className="min-w-0 truncate">{book.title}<span className="text-muted-foreground">{book.author ? ` · ${book.author}` : ""}</span></span></label>)}{books.length === 0 && <p className="p-3 text-sm text-muted-foreground">No catalog books are available to assign yet.</p>}</div></div>
      <Button disabled={!title.trim() || bookIds.length === 0 || saving} onClick={createAssignment} className="min-h-11 gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create assignment</Button>
    </CardContent></Card> : <Card><CardContent className="py-5 text-sm text-muted-foreground">Reading assignments can only be managed for your assigned class. Select Class {assignedClass || "—"} or ask an admin to update your profile.</CardContent></Card>}

    <Card><CardHeader><CardTitle className="text-base">Class reading assignments</CardTitle><CardDescription>Student completion is private to the student and assigned class staff.</CardDescription></CardHeader><CardContent className="space-y-3">
      {loading ? <div role="status" className="flex items-center gap-2 py-5 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading assignments…</div> : assignments.length ? assignments.map((assignment) => {
        const complete = progress.filter((item) => item.assignment_id === assignment.id && item.completed_at).length;
        const bookTitles = books.filter((book) => (assignment.book_ids || []).includes(book.id)).map((book) => book.title);
        return <div key={assignment.id} className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="font-semibold">{assignment.title}</p>{assignment.description && <p className="mt-1 text-sm text-muted-foreground">{assignment.description}</p>}<p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{bookTitles.join(", ") || `${assignment.book_ids?.length || 0} selected book(s)`}</span>{assignment.due_date && <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />Due {new Date(`${assignment.due_date}T00:00:00`).toLocaleDateString()}</span>}<span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />{complete} / {students.length} completed</span></p></div>{canManage && <Button variant="ghost" size="sm" className="min-h-10 self-end text-destructive sm:self-center" onClick={() => archiveAssignment(assignment.id)} aria-label={`Archive ${assignment.title}`}><Trash2 className="h-4 w-4" /> Archive</Button>}</div>;
      }) : <p className="py-5 text-center text-sm text-muted-foreground">No reading assignments for this class yet.</p>}
    </CardContent></Card>
  </div>;
}
