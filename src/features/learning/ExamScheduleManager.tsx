import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ExamRow = {
  id: string;
  class_number: string;
  subject: string;
  exam_name: string;
  exam_date: string;
  syllabus: string[] | null;
  instructions: string | null;
};

const CLASSES = ["6", "7", "8", "9", "10", "11", "12"];

const emptyForm = {
  class_number: "10",
  subject: "",
  exam_name: "",
  exam_date: "",
  syllabus_text: "",
  instructions: "",
};

function daysUntil(date: string) {
  const target = new Date(`${date}T00:00:00`).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today.getTime()) / 86400000);
}

export default function ExamScheduleManager() {
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: loadError } = await (supabase as any)
      .from("exam_schedule")
      .select("id,class_number,subject,exam_name,exam_date,syllabus,instructions")
      .order("exam_date", { ascending: true });
    if (loadError) setError(loadError.message);
    else setExams((data || []) as ExamRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () => exams.filter((exam) => classFilter === "all" || exam.class_number === classFilter),
    [exams, classFilter],
  );

  const startCreate = () => {
    setEditingId("");
    setForm({ ...emptyForm, class_number: classFilter === "all" ? "10" : classFilter });
    setFormOpen(true);
  };

  const startEdit = (exam: ExamRow) => {
    setEditingId(exam.id);
    setForm({
      class_number: exam.class_number,
      subject: exam.subject,
      exam_name: exam.exam_name,
      exam_date: exam.exam_date,
      syllabus_text: Array.isArray(exam.syllabus) ? exam.syllabus.join("\n") : "",
      instructions: exam.instructions || "",
    });
    setFormOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.subject.trim() || !form.exam_name.trim() || !form.exam_date) {
      toast.error("Add a subject, exam name, and date.");
      return;
    }
    const syllabus = form.syllabus_text.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 60);
    setSaving(true);
    try {
      const payload = {
        class_number: form.class_number,
        subject: form.subject.trim().slice(0, 100),
        exam_name: form.exam_name.trim().slice(0, 160),
        exam_date: form.exam_date,
        syllabus,
        instructions: form.instructions.trim().slice(0, 1000) || null,
      };
      const result = editingId
        ? await (supabase as any).from("exam_schedule").update(payload).eq("id", editingId)
        : await (supabase as any).from("exam_schedule").insert(payload);
      if (result.error) throw result.error;
      toast.success(editingId ? "Exam updated" : "Exam added to the calendar");
      setFormOpen(false);
      setEditingId("");
      setForm(emptyForm);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "The exam could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (exam: ExamRow) => {
    if (!window.confirm(`Delete "${exam.exam_name}" for Class ${exam.class_number}?`)) return;
    const { error: deleteError } = await (supabase as any).from("exam_schedule").delete().eq("id", exam.id);
    if (deleteError) toast.error(deleteError.message);
    else {
      toast.success("Exam removed");
      await load();
    }
  };

  return (
    <div className="space-y-3">
      <Card className="border-border/60 shadow-none">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg"><CalendarDays className="h-5 w-5 text-primary" /> Exam calendar</CardTitle>
            <CardDescription>Dates and syllabus become the countdown and revision plan on each student's My Day.</CardDescription>
          </div>
          <Button type="button" className="min-h-10 rounded-xl" onClick={startCreate}><Plus className="mr-1.5 h-4 w-4" /> Add exam</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor="exam-class-filter" className="text-xs">Class</Label>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger id="exam-class-filter" className="h-10 w-36 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {CLASSES.map((item) => <SelectItem key={item} value={item}>Class {item}</SelectItem>)}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="rounded-full">{visible.length} exam{visible.length === 1 ? "" : "s"}</Badge>
          </div>

          {formOpen && (
            <form onSubmit={save} className="space-y-3 rounded-xl border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{editingId ? "Edit exam" : "New exam"}</p>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-lg" aria-label="Close exam form" onClick={() => { setFormOpen(false); setEditingId(""); }}><X className="h-4 w-4" /></Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label htmlFor="exam-class" className="text-xs">Class</Label>
                  <Select value={form.class_number} onValueChange={(value) => setForm({ ...form, class_number: value })}>
                    <SelectTrigger id="exam-class" className="mt-1 min-h-10 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>{CLASSES.map((item) => <SelectItem key={item} value={item}>Class {item}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="exam-subject" className="text-xs">Subject</Label>
                  <Input id="exam-subject" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder="Mathematics" className="mt-1 min-h-10 rounded-xl" />
                </div>
                <div>
                  <Label htmlFor="exam-name" className="text-xs">Exam name</Label>
                  <Input id="exam-name" value={form.exam_name} onChange={(event) => setForm({ ...form, exam_name: event.target.value })} placeholder="Half-yearly examination" className="mt-1 min-h-10 rounded-xl" />
                </div>
                <div>
                  <Label htmlFor="exam-date" className="text-xs">Date</Label>
                  <Input id="exam-date" type="date" value={form.exam_date} onChange={(event) => setForm({ ...form, exam_date: event.target.value })} className="mt-1 min-h-10 rounded-xl" />
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <div>
                  <Label htmlFor="exam-syllabus" className="text-xs">Syllabus chapters (one per line)</Label>
                  <textarea id="exam-syllabus" value={form.syllabus_text} onChange={(event) => setForm({ ...form, syllabus_text: event.target.value })} rows={5} className="mt-1 w-full rounded-xl border bg-background p-3 text-sm" placeholder={"Real Numbers\nPolynomials\nTriangles"} />
                </div>
                <div>
                  <Label htmlFor="exam-instructions" className="text-xs">Instructions (optional)</Label>
                  <textarea id="exam-instructions" value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} rows={5} className="mt-1 w-full rounded-xl border bg-background p-3 text-sm" placeholder="Bring your own geometry box. Reporting time 9:00 am." />
                </div>
              </div>
              <Button type="submit" className="min-h-10 rounded-xl" disabled={saving}>
                {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />} Save exam
              </Button>
            </form>
          )}

          {loading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading exams…</div>
          ) : error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
              <Button type="button" variant="outline" size="sm" className="ml-2 rounded-lg" onClick={() => void load()}>Retry</Button>
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center">
              <CalendarDays className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">No exams scheduled for this filter</p>
              <p className="mt-1 text-xs text-muted-foreground">Students see a countdown once an exam is added here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {visible.map((exam) => {
                const days = daysUntil(exam.exam_date);
                const past = days < 0;
                return (
                  <div key={exam.id} className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 ${past ? "opacity-60" : ""}`}>
                    <div className={`grid h-12 w-14 shrink-0 place-items-center rounded-xl ${days >= 0 && days <= 7 ? "bg-amber-500/10 text-amber-700" : "bg-primary/10 text-primary"}`}>
                      <span className="text-sm font-black leading-none">{new Date(`${exam.exam_date}T00:00:00`).toLocaleDateString(undefined, { day: "numeric" })}</span>
                      <span className="text-[10px] font-semibold uppercase">{new Date(`${exam.exam_date}T00:00:00`).toLocaleDateString(undefined, { month: "short" })}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="rounded-full">Class {exam.class_number}</Badge>
                        <Badge variant="outline" className="rounded-full">{exam.subject}</Badge>
                        {!past && <span className="text-[11px] font-medium text-muted-foreground">{days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`}</span>}
                      </div>
                      <p className="mt-1 truncate text-sm font-semibold">{exam.exam_name}</p>
                      <p className="text-xs text-muted-foreground">{Array.isArray(exam.syllabus) && exam.syllabus.length ? `${exam.syllabus.length} syllabus chapters` : "No syllabus chapters listed"}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-xl" aria-label={`Edit ${exam.exam_name}`} onClick={() => startEdit(exam)}><Pencil className="h-4 w-4" /></Button>
                      <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-destructive" aria-label={`Delete ${exam.exam_name}`} onClick={() => void remove(exam)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
