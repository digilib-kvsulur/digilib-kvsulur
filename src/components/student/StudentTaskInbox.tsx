import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, BookOpen, CalendarDays, CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type TaskItem = { id: string; title: string; detail: string; priority: number; tab: string; icon: typeof BookOpen };

export default function StudentTaskInbox({ userId, setActiveTab }: { userId: string; setActiveTab: (tab: any) => void }) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const today = new Date();
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const [issues, requests, events] = await Promise.all([
        supabase.from("book_issues").select("id,due_date,books(title)").eq("user_id", userId).eq("status", "issued").not("due_date", "is", null).order("due_date", { ascending: true }).limit(10),
        supabase.from("book_requests").select("id,status,created_at,books(title)").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
        supabase.from("library_events").select("id,title,event_date,registration_deadline").eq("is_published", true).gte("event_date", todayDate.toISOString().slice(0, 10)).order("event_date", { ascending: true }).limit(3),
      ]);
      if (!alive) return;
      const next: TaskItem[] = [];
      (issues.data || []).forEach((issue: any) => {
        const due = new Date(issue.due_date);
        const dayDelta = Math.ceil((new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime() - todayDate.getTime()) / 86400000);
        if (dayDelta <= 7) next.push({ id: `loan-${issue.id}`, title: dayDelta < 0 ? `Return ${issue.books?.title || "your library book"}` : `Your book is due ${dayDelta === 0 ? "today" : `in ${dayDelta} day${dayDelta === 1 ? "" : "s"}`}`, detail: `${issue.books?.title || "Issued book"} · Due ${due.toLocaleDateString()}`, priority: dayDelta < 0 ? 0 : dayDelta <= 2 ? 1 : 2, tab: "issued", icon: AlertCircle });
      });
      (requests.data || []).forEach((request: any) => {
        const status = String(request.status || "pending").toLowerCase();
        if (["pending", "approved", "ready", "rejected"].includes(status)) next.push({ id: `request-${request.id}`, title: status === "pending" ? "Book request awaiting review" : status === "rejected" ? "Check your book request update" : "Book request approved — check next steps", detail: request.books?.title || "Open your request details", priority: status === "pending" ? 3 : 1, tab: "issued", icon: BookOpen });
      });
      const nextEvent: any = events.data?.[0];
      if (nextEvent) {
        const eventDate = new Date(`${nextEvent.event_date}T00:00:00`);
        const days = Math.ceil((eventDate.getTime() - todayDate.getTime()) / 86400000);
        next.push({ id: `event-${nextEvent.id}`, title: `Upcoming: ${nextEvent.title}`, detail: days === 0 ? "Today" : `In ${days} day${days === 1 ? "" : "s"} · ${eventDate.toLocaleDateString()}`, priority: 4, tab: "events", icon: CalendarDays });
      }
      if (alive) { setTasks(next.sort((a, b) => a.priority - b.priority).slice(0, 4)); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [userId]);

  const countLabel = useMemo(() => tasks.length === 0 ? "You're all caught up" : `${tasks.length} next step${tasks.length === 1 ? "" : "s"}`, [tasks.length]);

  return <Card className="border-border/70">
    <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
      <div><CardTitle className="text-base">Your next steps</CardTitle><p className="mt-1 text-xs text-muted-foreground">Loans, requests, and upcoming library events</p></div>
      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{loading ? "Updating" : countLabel}</span>
    </CardHeader>
    <CardContent className="space-y-2">
      {loading ? <div role="status" className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Checking your updates…</div> : tasks.length ? tasks.map((task) => {
        const Icon = task.icon;
        return <div key={task.id} className="flex min-w-0 items-center gap-3 rounded-xl border p-3">
          <Icon className={`h-4 w-4 shrink-0 ${task.priority < 2 ? "text-amber-600" : "text-primary"}`} />
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{task.title}</p><p className="truncate text-xs text-muted-foreground">{task.detail}</p></div>
          <Button size="sm" variant="ghost" className="min-h-10 shrink-0" onClick={() => setActiveTab(task.tab)} aria-label={`Open ${task.title}`}><span className="hidden sm:inline">Open</span><ArrowRight className="h-4 w-4 sm:ml-1" /></Button>
        </div>;
      }) : <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-4 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-emerald-600" />No urgent library tasks right now. Keep studying at your pace.</div>}
    </CardContent>
  </Card>;
}
