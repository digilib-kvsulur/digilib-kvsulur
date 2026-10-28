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
  if (time.complete) return <span className="text-xs font-bold sm:text-sm">Announcement is opening…</span>;
  const units = [
    ...(time.days ? [{ value: time.days, label: "days" }] : []),
    { value: time.hours, label: "hrs" },
    { value: time.minutes, label: "min" },
    { value: time.seconds, label: "sec" },
  ];
  if (compact) {
    return <span className="whitespace-nowrap font-mono text-[11px] font-black tabular-nums sm:text-xs">{units.map(({ value, label }) => `${String(value).padStart(2, "0")}${label}`).join(" ")}</span>;
  }
  return (
    <div className="flex flex-wrap justify-center gap-1.5 sm:justify-end">
      {units.map(({ value, label }) => (
        <span key={label} className="min-w-[2.9rem] rounded-lg border bg-background px-1.5 py-1 text-center tabular-nums">
          <span className="block font-mono text-base font-black leading-tight sm:text-xl">{String(value).padStart(2, "0")}</span>
          <span className="block text-[8px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
        </span>
      ))}
    </div>
  );
}

export function EventWinnerReleaseBanner({ onAvailabilityChange, onOpen }: { onAvailabilityChange?: (available: boolean) => void; onOpen: () => void }) {
  const { plans } = useEventWinnerReleasePlans();
  const activePlans = useMemo(() => plans.filter((plan) => !plan.is_released), [plans]);
  const next = activePlans[0];

  useEffect(() => onAvailabilityChange?.(plans.length > 0), [onAvailabilityChange, plans.length]);
  if (!plans.length) return null;

  return (
    <div className="mb-4 min-w-0 rounded-2xl border border-amber-300/70 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-violet-500/10 p-3 shadow-sm sm:p-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm sm:h-10 sm:w-10"><Trophy className="h-4 w-4 sm:h-5 sm:w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm font-black leading-snug text-foreground sm:text-base">{next ? "Event winners are on the way" : "Event winners announced!"}</p>
            <p className="mt-0.5 line-clamp-2 break-words text-[11px] text-muted-foreground sm:text-xs">
              {next ? `${next.event_title} · ${next.total_awards} award${next.total_awards === 1 ? "" : "s"} planned` : `${plans.length} recent event announcement${plans.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:shrink-0 sm:justify-end sm:gap-3">
          {next && <div className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg bg-background/80 px-2 py-2 text-amber-800 dark:text-amber-200 sm:px-3"><Clock3 className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" /><Countdown target={next.release_at} compact /></div>}
          <Button size="sm" onClick={onOpen} className="min-w-0 bg-amber-600 px-3 text-xs text-white hover:bg-amber-700 sm:text-sm">{next ? "Preview awards" : "See winners"}</Button>
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
    <div className="mx-auto w-full min-w-0 max-w-5xl space-y-4 sm:space-y-6">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-amber-600 via-orange-600 to-violet-700 p-4 text-white shadow-lg sm:rounded-3xl sm:p-8">
        <div className="flex min-w-0 items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <Badge className="mb-2 border border-white/25 bg-white/15 text-[10px] text-white sm:mb-3 sm:text-xs"><PartyPopper className="mr-1 h-3 w-3 sm:mr-1.5 sm:h-3.5 sm:w-3.5" /> Event results</Badge>
            <h1 className="break-words text-xl font-black leading-tight sm:text-3xl">Awards are waiting in the wings</h1>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-white/90 sm:text-sm">Take a look at the events and prizes planned. Winner names stay under wraps until announcement time.</p>
          </div>
          <Button variant="secondary" size="icon" onClick={() => void refresh()} aria-label="Refresh event results" className="h-8 w-8 shrink-0 sm:h-10 sm:w-10"><RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></Button>
        </div>
      </div>

      {loading ? <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading planned announcements…</CardContent></Card> : ordered.length === 0 ? (
        <Card><CardContent className="px-4 py-10 text-center sm:py-14"><Trophy className="mx-auto mb-3 h-10 w-10 text-amber-500/50" /><p className="font-bold">No temporary results page right now</p><p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground sm:text-sm">When an event announcement is scheduled, its prizes and countdown will appear here.</p></CardContent></Card>
      ) : (
        <div className="space-y-5">
          {ordered.map((plan) => {
            const released = plan.is_released;
            const remaining = Math.max(0, new Date(plan.release_at).getTime() - now);
            return (
              <Card key={`${plan.event_id}:${plan.release_at}`} className="min-w-0 overflow-hidden rounded-2xl border-border/70 shadow-sm">
                <CardHeader className="bg-muted/30 p-4 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="flex items-start gap-2 break-words text-base leading-snug sm:text-lg"><Award className="mt-0.5 h-4 w-4 shrink-0 text-amber-500 sm:h-5 sm:w-5" /><span className="min-w-0">{plan.event_title}</span></CardTitle>
                      <p className="mt-1 flex items-start gap-1.5 break-words text-[11px] leading-relaxed text-muted-foreground sm:text-xs"><CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Announcement {new Date(plan.release_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span></p>
                    </div>
                    {released ? <Badge className="w-fit bg-emerald-600 text-white"><PartyPopper className="mr-1 h-3.5 w-3.5" /> Announced</Badge> : <div className="flex min-w-0 flex-col gap-1 rounded-xl border bg-background px-2.5 py-2 sm:min-w-[14rem] sm:px-3"><p className="text-center text-[9px] font-bold uppercase tracking-wider text-muted-foreground sm:text-[10px]">Time remaining</p><Countdown target={plan.release_at} /></div>}
                  </div>
                </CardHeader>
                <CardContent className="min-w-0 space-y-4 p-4 sm:p-5">
                  <div>
                    <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-muted-foreground">Prizes planned · {plan.total_awards} award{plan.total_awards === 1 ? "" : "s"}</h3>
                    <div className="flex flex-wrap gap-2">
                      {(plan.prizes || []).map((prize, index) => <Badge key={`${prize.position}-${index}`} variant="outline" className="max-w-full whitespace-normal break-words rounded-lg border-amber-300 bg-amber-500/5 px-2.5 py-1.5 text-left text-[11px] leading-snug sm:px-3 sm:text-xs">{prize.title || prize.position || "Award"}</Badge>)}
                    </div>
                  </div>
                  {released ? (
                    <div className="grid min-w-0 gap-2 sm:grid-cols-2">
                      {(plan.winners || []).map((winner, index) => <div key={`${winner.name}-${index}`} className="flex min-w-0 items-start gap-2.5 rounded-xl border bg-card p-2.5 sm:items-center sm:gap-3 sm:p-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-700 sm:h-9 sm:w-9"><Trophy className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="break-words text-sm font-bold leading-snug">{winner.name || "Student"}</p><p className="break-words text-[11px] leading-snug text-muted-foreground sm:text-xs">{winner.title || winner.position || "Winner"}{winner.student_class ? ` · Class ${winner.student_class}` : ""}</p></div></div>)}
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
