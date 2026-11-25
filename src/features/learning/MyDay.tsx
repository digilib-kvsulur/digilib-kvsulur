import { useCallback, useEffect, useState } from "react";
import { AlertCircle, ArrowRight, BookCheck, BookOpen, CalendarDays, CheckCircle2, Layers, Loader2, RefreshCw, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchToday } from "./api";
import type { LearningTarget, TodayItem } from "./types";

const ICONS: Record<string, typeof BookOpen> = {
  flashcards: Layers,
  exam: CalendarDays,
  chapter: BookOpen,
  weak_topic: Target,
  reading_assignment: BookCheck,
  book_due: AlertCircle,
};

function iconFor(kind: string) {
  return ICONS[kind] || SparkleFallback;
}

function SparkleFallback(props: { className?: string }) {
  return <Target {...props} />;
}

function timeLabel(item: TodayItem) {
  if (!item.due_at) return "";
  const due = new Date(item.due_at);
  if (Number.isNaN(due.getTime())) return "";
  const days = Math.ceil((due.getTime() - Date.now()) / 86400000);
  if (days < 0) return "Overdue";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

export default function MyDay({
  setActiveTab,
  onOpenLearning,
  onCountChange,
}: {
  setActiveTab: (tab: any) => void;
  onOpenLearning?: (target: LearningTarget) => void;
  onCountChange?: (count: number) => void;
}) {
  const [items, setItems] = useState<TodayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await fetchToday();
      setItems(data.items || []);
      setError("");
      onCountChange?.(data.items?.length || 0);
    } catch (e: any) {
      setError(e?.message || "Your plan could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = (item: TodayItem) => {
    const params = item.cta_params || {};
    if (item.kind === "flashcards") {
      onOpenLearning?.({ tool: "flashcards" });
      return;
    }
    if (item.kind === "exam") {
      onOpenLearning?.({ tool: "mocks", subject: params.subject });
      return;
    }
    if (item.kind === "chapter" || item.kind === "weak_topic") {
      onOpenLearning?.({
        classNumber: params.classNumber,
        subject: params.subject,
        chapterTitle: params.chapterTitle,
      });
      return;
    }
    setActiveTab(item.cta_tab || "overview");
  };

  return (
    <Card className="rounded-2xl border-border/70 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-base">
            My Day
            {!loading && items.length > 0 && <Badge variant="secondary" className="rounded-full">{items.length}</Badge>}
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })} · your shortest path to progress
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-xl" aria-label="Refresh my day" onClick={() => void load(true)} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div role="status" className="flex items-center gap-2 py-5 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Building your plan…
          </div>
        ) : error ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <span>{error}</span>
            <Button type="button" size="sm" variant="outline" className="rounded-lg" onClick={() => void load()}>Try again</Button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl bg-muted/40 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> Nothing urgent right now
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Start a short review or practise a chapter to build momentum.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" className="min-h-10 rounded-xl" onClick={() => onOpenLearning?.({ tool: "flashcards" })}>
                <Layers className="mr-1.5 h-4 w-4" /> Review cards
              </Button>
              <Button type="button" size="sm" variant="outline" className="min-h-10 rounded-xl" onClick={() => onOpenLearning?.({ tool: "mastery" })}>
                <Target className="mr-1.5 h-4 w-4" /> Find a weak topic
              </Button>
            </div>
          </div>
        ) : (
          items.map((item, index) => {
            const Icon = iconFor(item.kind);
            const label = timeLabel(item);
            return (
              <div key={`${item.kind}-${index}-${item.title}`} className="flex min-w-0 items-center gap-3 rounded-xl border p-3">
                <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${item.priority <= 1 ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary"}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-sm font-semibold">{item.title}</p>
                    {label && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{label}</span>}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
                </div>
                <Button type="button" size="sm" variant="ghost" className="min-h-10 shrink-0 rounded-lg" onClick={() => open(item)} aria-label={`Open ${item.title}`}>
                  <span className="hidden sm:inline">Open</span>
                  <ArrowRight className="h-4 w-4 sm:ml-1" />
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
