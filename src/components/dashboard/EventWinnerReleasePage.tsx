import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, CalendarClock, Clock3, PartyPopper, RefreshCw, Trophy } from "lucide-react";

type WinnerReleasePlan = {
  event_id: string;
  event_title: string;
  event_date: string | null;
  release_at: string;
  total_awards: number;
  prizes: { position?: string; title?: string; title_hindi?: string | null }[];
  is_released: boolean;
  winners: { name: string; student_class?: string | null; position?: string; title?: string; title_hindi?: string | null }[];
};

export function useEventWinnerReleasePlans() {
  const [plans, setPlans] = useState<WinnerReleasePlan[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await (supabase as any).rpc("get_event_winner_release_plans");
    if (!error && Array.isArray(data)) setPlans(data as WinnerReleasePlan[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  return { plans, loading, refresh };
}

function useCountdown(target: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const seconds = Math.max(0, Math.floor((new Date(target).getTime() - now) / 1000));
  return {
    complete: seconds <= 0,
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  };
}

function Countdown({ target, compact = false }: { target: string; compact?: boolean }) {
  const time = useCountdown(target);
  if (time.complete) return <span className="font-bold">Announcement is opening…</span>;
  const bits = [
    ...(time.days ? [`${time.days}d`] : []),
    `${String(time.hours).padStart(2, "0")}h`,
    `${String(time.minutes).padStart(2, "0")}m`,
    `${String(time.seconds).padStart(2, "0")}s`,
  ];
  return <span className={compact ? "font-mono font-black tabular-nums" : "font-mono text-lg sm:text-xl font-black tabular-nums"}>{bits.join(" : ")}</span>;
}

export function EventWinnerReleaseBanner({ onAvailabilityChange, onOpen }: { onAvailabilityChange?: (available: boolean) => void; onOpen: () => void }) {
  const { plans } = useEventWinnerReleasePlans();
  const activePlans = useMemo(() => plans.filter((plan) => !plan.is_released), [plans]);
  const next = activePlans[0];

  useEffect(() => onAvailabilityChange?.(plans.length > 0), [onAvailabilityChange, plans.length]);
  if (!plans.length) return null;

  return (
    <div className="mb-4 rounded-2xl border border-amber-300/70 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-violet-500/10 p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm"><Trophy className="h-5 w-5" /></span>
          <div>
            <p className="font-black text-foreground">{next ? "Event winners are on the way" : "Event winners announced!"}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {next ? `${next.event_title} · ${next.total_awards} award${next.total_awards === 1 ? "" : "s"} planned` : `${plans.length} recent event announcement${plans.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          {next && <div className="flex items-center gap-1.5 rounded-lg bg-background/80 px-3 py-2 text-sm text-amber-800 dark:text-amber-200"><Clock3 className="h-4 w-4" /><Countdown target={next.release_at} compact /></div>}
          <Button size="sm" onClick={onOpen} className="shrink-0 bg-amber-600 text-white hover:bg-amber-700">{next ? "Preview awards" : "See winners"}</Button>
        </div>
      </div>
    </div>
  );
}

export default function EventWinnerReleasePage() {
  const { plans, loading, refresh } = useEventWinnerReleasePlans();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const ordered = useMemo(() => [...plans].sort((a, b) => new Date(a.release_at).getTime() - new Date(b.release_at).getTime()), [plans]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-amber-600 via-orange-600 to-violet-700 p-6 text-white shadow-lg sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge className="mb-3 border border-white/25 bg-white/15 text-white"><PartyPopper className="mr-1.5 h-3.5 w-3.5" /> Event results</Badge>
            <h1 className="text-2xl font-black sm:text-3xl">Awards are waiting in the wings</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/85">Take a look at the events and prizes planned. Winner names stay under wraps until announcement time.</p>
          </div>
          <Button variant="secondary" size="icon" onClick={() => void refresh()} aria-label="Refresh event results"><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      {loading ? <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading planned announcements…</CardContent></Card> : ordered.length === 0 ? (
        <Card><CardContent className="py-14 text-center"><Trophy className="mx-auto mb-3 h-10 w-10 text-amber-500/50" /><p className="font-bold">No temporary results page right now</p><p className="mt-1 text-sm text-muted-foreground">When an event announcement is scheduled, its prizes and countdown will appear here.</p></CardContent></Card>
      ) : (
        <div className="space-y-5">
          {ordered.map((plan) => {
            const released = plan.is_released;
            const remaining = Math.max(0, new Date(plan.release_at).getTime() - now);
            return (
              <Card key={`${plan.event_id}:${plan.release_at}`} className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
                <CardHeader className="bg-muted/30 pb-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg"><Award className="h-5 w-5 text-amber-500" />{plan.event_title}</CardTitle>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarClock className="h-3.5 w-3.5" />Announcement {new Date(plan.release_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                    </div>
                    {released ? <Badge className="w-fit bg-emerald-600 text-white"><PartyPopper className="mr-1 h-3.5 w-3.5" /> Announced</Badge> : <div className="rounded-xl border bg-background px-3 py-2 text-center"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Time remaining</p><Countdown target={plan.release_at} /></div>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 p-5">
                  <div>
                    <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-muted-foreground">Prizes planned · {plan.total_awards} award{plan.total_awards === 1 ? "" : "s"}</h3>
                    <div className="flex flex-wrap gap-2">
                      {(plan.prizes || []).map((prize, index) => <Badge key={`${prize.position}-${index}`} variant="outline" className="rounded-lg border-amber-300 bg-amber-500/5 px-3 py-1.5 text-xs">{prize.title || prize.position || "Award"}</Badge>)}
                    </div>
                  </div>
                  {released ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {(plan.winners || []).map((winner, index) => <div key={`${winner.name}-${index}`} className="flex items-center gap-3 rounded-xl border bg-card p-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10 text-amber-700"><Trophy className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-sm font-bold">{winner.name || "Student"}</p><p className="text-xs text-muted-foreground">{winner.title || winner.position || "Winner"}{winner.student_class ? ` · Class ${winner.student_class}` : ""}</p></div></div>)}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-center text-sm text-muted-foreground">Winner names will appear here when the announcement opens.</div>
                  )}
                  {!released && remaining === 0 && <p className="text-center text-xs font-semibold text-amber-700">The announcement is being released. This page will refresh automatically.</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
