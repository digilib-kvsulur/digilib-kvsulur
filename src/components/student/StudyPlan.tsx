import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Timer, CheckCircle, BookOpen, Brain, RefreshCw, AlertTriangle,
  Trophy, Sparkles, Coffee, PenLine, Sunrise, Sun, Moon
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Task {
  id: number;
  title: string;
  detail?: string;
  type: "reading" | "study" | "quiz" | "revision" | "return" | "break" | "write";
  duration: number;
  xp: number;
  priority: "high" | "normal" | "low";
  slot: "morning" | "afternoon" | "evening";
  completed: boolean;
}

const TYPE_META: Record<Task["type"], { icon: any; label: string; tint: string }> = {
  reading: { icon: BookOpen, label: "Reading", tint: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40" },
  study: { icon: Timer, label: "Syllabus", tint: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" },
  quiz: { icon: Brain, label: "Quiz", tint: "text-purple-600 bg-purple-50 dark:bg-purple-950/40" },
  revision: { icon: RefreshCw, label: "Revision", tint: "text-sky-600 bg-sky-50 dark:bg-sky-950/40" },
  return: { icon: AlertTriangle, label: "Library", tint: "text-amber-600 bg-amber-50 dark:bg-amber-950/40" },
  break: { icon: Coffee, label: "Break", tint: "text-rose-600 bg-rose-50 dark:bg-rose-950/40" },
  write: { icon: PenLine, label: "Reflect", tint: "text-teal-600 bg-teal-50 dark:bg-teal-950/40" },
};

const SLOT_META = {
  morning: { icon: Sunrise, label: "Morning" },
  afternoon: { icon: Sun, label: "Afternoon" },
  evening: { icon: Moon, label: "Evening" },
} as const;

export default function StudyPlan({ userId, studentClass }: { userId?: string; studentClass?: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string>("");

  const getBaseClass = (cls?: string) => (cls ? cls.replace(/[^0-9]/g, "") : "");

  const storageKey = (uid: string) => `study_plan_v2_${uid}_${new Date().toISOString().split("T")[0]}`;

  const loadDailyPlan = async (forceRefresh = false) => {
    if (!userId) return;
    setLoading(true);

    const key = storageKey(userId);
    const saved = localStorage.getItem(key);
    if (saved && !forceRefresh) {
      try {
        const parsed = JSON.parse(saved);
        setTasks(parsed.tasks || parsed);
        setNote(parsed.note || "");
        setLoading(false);
        return;
      } catch {
        /* regenerate below */
      }
    }

    try {
      const baseClass = getBaseClass(studentClass);
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const generated: Task[] = [];
      let id = 1;
      const notes: string[] = [];

      const [issuesRes, chaptersRes, quizRes, historyRes] = await Promise.all([
        supabase
          .from("book_issues")
          .select("book_id, due_date, book_title, books(title)")
          .eq("user_id", userId)
          .eq("status", "issued"),
        baseClass
          ? supabase
              .from("ncert_books")
              .select("chapter_title, chapter_number, subject")
              .eq("class_number", baseClass)
              .limit(40)
          : Promise.resolve({ data: [] as any[] }),
        supabase
          .from("quizzes")
          .select("title, subject, difficulty, points_reward")
          .eq("is_active", true)
          .limit(10),
        supabase
          .from("reading_history")
          .select("book_title, completed_date")
          .eq("user_id", userId)
          .order("completed_date", { ascending: false })
          .limit(1),
      ]);

      const issues = (issuesRes as any)?.data || [];
      const chapters = (chaptersRes as any)?.data || [];
      const quizzes = (quizRes as any)?.data || [];
      const lastRead = (historyRes as any)?.data?.[0];

      // 1. Overdue / due-soon library book gets top priority
      const dueSoon = issues
        .map((i: any) => ({
          title: i.books?.title || i.book_title || "your library book",
          due: i.due_date ? new Date(i.due_date) : null,
        }))
        .filter((i: any) => i.due)
        .sort((a: any, b: any) => a.due.getTime() - b.due.getTime())[0];

      if (dueSoon) {
        const daysLeft = Math.ceil((dueSoon.due.getTime() - today.getTime()) / 86400000);
        if (daysLeft <= 0) {
          generated.push({
            id: id++,
            title: `Return "${dueSoon.title}" to the library today`,
            detail: `Overdue by ${Math.abs(daysLeft)} day(s) — ₹1 fine per extra day.`,
            type: "return",
            duration: 10,
            xp: 0,
            priority: "high",
            slot: "morning",
            completed: false,
          });
          notes.push("You have an overdue book — return it first to stop the fine.");
        } else if (daysLeft <= 3) {
          generated.push({
            id: id++,
            title: `Finish "${dueSoon.title}" — due in ${daysLeft} day(s)`,
            detail: "Aim for 25–30 pages so you can return or renew on time.",
            type: "reading",
            duration: 35,
            xp: 10,
            priority: "high",
            slot: "morning",
            completed: false,
          });
        }
      }

      // 2. Core reading block
      const readingTitle = issues[0]?.books?.title || issues[0]?.book_title;
      if (!generated.some((t) => t.type === "reading")) {
        generated.push({
          id: id++,
          title: readingTitle ? `Read 15 pages of "${readingTitle}"` : "Read 20 pages of any library book",
          detail: readingTitle
            ? "Note down one new word and one favourite line."
            : "Not borrowed anything yet? Pick a book from the Catalog today.",
          type: "reading",
          duration: 25,
          xp: 10,
          priority: "normal",
          slot: "morning",
          completed: false,
        });
      }

      // 3. Two syllabus chapters from different subjects
      if (chapters.length > 0) {
        const shuffled = [...chapters].sort(() => Math.random() - 0.5);
        const picked: any[] = [];
        for (const ch of shuffled) {
          if (picked.length >= 2) break;
          if (!picked.some((p) => p.subject === ch.subject)) picked.push(ch);
        }
        picked.forEach((ch, idx) => {
          generated.push({
            id: id++,
            title: `${idx === 0 ? "Study" : "Skim & revise"} ${ch.subject} Ch ${ch.chapter_number ?? ""}: ${ch.chapter_title}`,
            detail: idx === 0 ? "Read carefully and write 5 key points." : "Quick 2nd look — only headings, formulas and diagrams.",
            type: idx === 0 ? "study" : "revision",
            duration: idx === 0 ? 45 : 20,
            xp: idx === 0 ? 15 : 8,
            priority: idx === 0 ? "high" : "normal",
            slot: idx === 0 ? "afternoon" : "evening",
            completed: false,
          });
        });
      } else {
        generated.push({
          id: id++,
          title: `Study today's ${baseClass ? `Class ${baseClass} ` : ""}school topics`,
          detail: "Open Study Hub for NCERT chapters and notes.",
          type: "study",
          duration: 45,
          xp: 15,
          priority: "high",
          slot: "afternoon",
          completed: false,
        });
      }

      // 4. Short break
      generated.push({
        id: id++,
        title: "Take a 10-minute screen-free break",
        detail: "Stretch, drink water, rest your eyes before the next block.",
        type: "break",
        duration: 10,
        xp: 0,
        priority: "low",
        slot: "afternoon",
        completed: false,
      });

      // 5. Quiz challenge
      const quiz = quizzes[0];
      generated.push({
        id: id++,
        title: quiz ? `Attempt the "${quiz.title}" quiz` : "Attempt any library quiz",
        detail: quiz
          ? `${quiz.subject} · ${quiz.difficulty} · +${quiz.points_reward ?? 5} XP`
          : "Open the Quizzes tab and try one to earn XP.",
        type: "quiz",
        duration: 15,
        xp: quiz?.points_reward ?? 5,
        priority: "normal",
        slot: "evening",
        completed: false,
      });

      // 6. Reflection
      generated.push({
        id: id++,
        title: lastRead?.book_title
          ? `Write 3 lines about "${lastRead.book_title}"`
          : "Write 3 lines about what you read today",
        detail: "Save it in My Notes, or post it as a review to earn extra points.",
        type: "write",
        duration: 10,
        xp: 5,
        priority: "low",
        slot: "evening",
        completed: false,
      });

      setTasks(generated);
      const noteText = notes[0] || `Plan generated for ${todayStr}. Tick tasks as you finish them.`;
      setNote(noteText);
      localStorage.setItem(key, JSON.stringify({ tasks: generated, note: noteText }));
    } catch (e) {
      console.error("Failed to generate study plan", e);
      setTasks([
        { id: 1, title: "Read 20 pages of your current book", type: "reading", duration: 30, xp: 10, priority: "normal", slot: "morning", completed: false },
        { id: 2, title: "Revise one NCERT chapter", type: "study", duration: 45, xp: 15, priority: "high", slot: "afternoon", completed: false },
        { id: 3, title: "Take a library quiz", type: "quiz", duration: 15, xp: 5, priority: "normal", slot: "evening", completed: false },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDailyPlan();
     
  }, [userId, studentClass]);

  const persist = (updated: Task[]) => {
    setTasks(updated);
    if (userId) localStorage.setItem(storageKey(userId), JSON.stringify({ tasks: updated, note }));
  };

  const toggleTask = (id: number) => {
    persist(tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const done = tasks.filter((t) => t.completed);
  const progress = tasks.length ? (done.length / tasks.length) * 100 : 0;
  const totalMinutes = tasks.reduce((s, t) => s + t.duration, 0);
  const earnedXp = done.reduce((s, t) => s + t.xp, 0);
  const totalXp = tasks.reduce((s, t) => s + t.xp, 0);

  const slots: Array<Task["slot"]> = ["morning", "afternoon", "evening"];

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Timer className="h-5 w-5 text-indigo-600" /> Daily Study Plan
            </CardTitle>
            <CardDescription>
              Built from your borrowed books, syllabus and live quizzes
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-indigo-600">{Math.round(progress)}%</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Completed</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <Badge variant="secondary" className="gap-1 text-[11px]">
            <Timer className="h-3 w-3" /> {totalMinutes} mins planned
          </Badge>
          <Badge variant="secondary" className="gap-1 text-[11px]">
            <Sparkles className="h-3 w-3" /> {earnedXp}/{totalXp} XP earned
          </Badge>
          <Badge variant="secondary" className="gap-1 text-[11px]">
            <CheckCircle className="h-3 w-3" /> {done.length}/{tasks.length} tasks
          </Badge>
        </div>

        <div className="h-2 w-full bg-muted rounded-full mt-3 overflow-hidden">
          <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {note && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">{note}</p>
            )}

            {tasks.length > 0 && done.length === tasks.length && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2.5">
                <Trophy className="h-5 w-5 text-emerald-600" />
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  Full plan completed today — brilliant work!
                </p>
              </div>
            )}

            {slots.map((slot) => {
              const list = tasks.filter((t) => t.slot === slot);
              if (list.length === 0) return null;
              const SlotIcon = SLOT_META[slot].icon;
              return (
                <div key={slot} className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <SlotIcon className="h-3.5 w-3.5" /> {SLOT_META[slot].label}
                  </div>
                  {list.map((task) => {
                    const meta = TYPE_META[task.type];
                    const Icon = meta.icon;
                    return (
                      <div
                        key={task.id}
                        onClick={() => toggleTask(task.id)}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                          task.completed ? "bg-muted/50 border-border" : "bg-card hover:border-indigo-300"
                        } ${task.priority === "high" && !task.completed ? "border-amber-400/60" : ""}`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 mt-0.5 transition-colors ${
                            task.completed ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/30"
                          }`}
                        >
                          {task.completed && <CheckCircle className="h-4 w-4 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-bold transition-colors ${
                              task.completed ? "text-muted-foreground line-through" : "text-foreground"
                            }`}
                          >
                            {task.title}
                          </p>
                          {task.detail && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{task.detail}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${meta.tint}`}>
                              <Icon className="h-3 w-3" /> {meta.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-medium">{task.duration} mins</span>
                            {task.xp > 0 && (
                              <span className="text-[10px] text-amber-600 font-bold">+{task.xp} XP</span>
                            )}
                            {task.priority === "high" && !task.completed && (
                              <span className="text-[10px] font-bold text-amber-600">Priority</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            <Button
              onClick={() => loadDailyPlan(true)}
              variant="ghost"
              size="sm"
              className="w-full text-xs text-indigo-600 hover:text-indigo-700 mt-1 font-bold"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Generate a fresh plan
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
