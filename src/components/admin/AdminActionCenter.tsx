import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, BookOpen, CheckCircle2, ClipboardCheck, FileCheck2, Loader2, UserRoundCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type QueueItem = { id: string; label: string; count: number | null; tab: string; icon: typeof BookOpen; detail: string };

export default function AdminActionCenter({ onNavigate }: { onNavigate: (tab: any) => void }) {
  const [queues, setQueues] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [users, requests, renewals, overdue, materials, support] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student").eq("is_approved", false),
        supabase.from("book_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("book_renewals").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("book_issues").select("id", { count: "exact", head: true }).eq("status", "issued").lt("due_date", today),
        (supabase as any).from("study_materials").select("id", { count: "exact", head: true }).eq("review_status", "pending"),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["open", "pending"]),
      ]);
      if (!alive) return;
      const data: QueueItem[] = [
        { id: "users", label: "Student approvals", count: users.count, tab: "users", icon: UserRoundCheck, detail: "Review access requests" },
        { id: "requests", label: "Book requests & renewals", count: requests.count === null && renewals.count === null ? null : (requests.count || 0) + (renewals.count || 0), tab: "book-requests", icon: BookOpen, detail: "Approve or decline circulation requests" },
        { id: "overdue", label: "Overdue books", count: overdue.count, tab: "overdue", icon: AlertTriangle, detail: "Follow up on active loans" },
        { id: "materials", label: "Learning resources to review", count: materials.count, tab: "materials", icon: FileCheck2, detail: "Approve resources before students see them" },
        { id: "support", label: "Open support tickets", count: support.count, tab: "support", icon: ClipboardCheck, detail: "Respond to student and staff issues" },
      ];
      setQueues(data.filter((item) => item.count === null || item.count > 0));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  return <Card className="border-border/50"><CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0"><div><CardTitle className="text-lg">Action center</CardTitle><p className="mt-1 text-xs text-muted-foreground">Work waiting for an admin decision or follow-up</p></div><CheckCircle2 className="h-5 w-5 text-primary" /></CardHeader><CardContent className="space-y-2">
    {loading ? <div role="status" className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Checking operational queues…</div> : queues.length ? queues.map((item) => { const Icon = item.icon; return <div key={item.id} className="flex min-w-0 items-center gap-3 rounded-xl border p-3"><Icon className="h-4 w-4 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.label}</p><p className="truncate text-xs text-muted-foreground">{item.detail}</p></div><span className="min-w-8 rounded-full bg-primary/10 px-2 py-1 text-center text-xs font-bold text-primary">{item.count ?? "—"}</span><Button size="sm" variant="ghost" className="min-h-10 shrink-0" onClick={() => onNavigate(item.tab)} aria-label={`Open ${item.label}`}><span className="hidden sm:inline">Review</span><ArrowRight className="h-4 w-4 sm:ml-1" /></Button></div>; }) : <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-4 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-emerald-600" />No urgent admin actions. Operational queues are clear.</div>}
  </CardContent></Card>;
}
