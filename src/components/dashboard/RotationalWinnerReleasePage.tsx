import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, BookOpen, Clock3, PartyPopper, RefreshCw, Trophy, Calendar, Sparkles, MapPin, Award } from "lucide-react";
import { getActiveRotationalCycle, VerifiedRotationalCycle, VerifiedWinnerRecord } from "@/lib/rotationalBadgeService";

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

export interface RotationalReleasePlan {
  cycle: VerifiedRotationalCycle;
  release_at: string;
  is_released: boolean;
  is_expired: boolean;
  hours_remaining_of_48: number;
}

export function useRotationalReleasePlan() {
  const [plan, setPlan] = useState<RotationalReleasePlan | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const cycle = await getActiveRotationalCycle();
      if (!cycle || !cycle.winners || cycle.winners.length === 0) {
        setPlan(null);
        setLoading(false);
        return;
      }

      const releaseAtStr = cycle.settings?.scheduledAnnouncementAt || cycle.verifiedAt;
      const releaseTime = new Date(releaseAtStr).getTime();
      const now = Date.now();
      const isReleased = now >= releaseTime;
      const expiresAt = releaseTime + FORTY_EIGHT_HOURS_MS;
      const isExpired = isReleased && now > expiresAt;

      const msRemaining48 = Math.max(0, expiresAt - now);
      const hoursRemaining48 = Math.ceil(msRemaining48 / (60 * 60 * 1000));

      if (isExpired) {
        setPlan(null);
      } else {
        setPlan({
          cycle,
          release_at: releaseAtStr,
          is_released: isReleased,
          is_expired: isExpired,
          hours_remaining_of_48: hoursRemaining48,
        });
      }
    } catch (e) {
      console.error("Error loading rotational release plan:", e);
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  return { plan, loading, refresh };
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

function RotationalCountdown({ target, compact = false }: { target: string; compact?: boolean }) {
  const time = useCountdown(target);
  if (time.complete) return <span className="text-xs font-bold sm:text-sm text-blue-600 dark:text-blue-300">Announcing now…</span>;
  
  const units = [
    ...(time.days ? [{ value: time.days, label: "days" }] : []),
    { value: time.hours, label: "hrs" },
    { value: time.minutes, label: "min" },
    { value: time.seconds, label: "sec" },
  ];

  if (compact) {
    return (
      <span className="whitespace-nowrap font-mono text-[11px] font-black tabular-nums sm:text-xs text-blue-800 dark:text-blue-200">
        {units.map(({ value, label }) => `${String(value).padStart(2, "0")}${label}`).join(" ")}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap justify-center gap-1.5 sm:justify-end">
      {units.map(({ value, label }) => (
        <span key={label} className="min-w-[2.9rem] rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/60 px-1.5 py-1 text-center tabular-nums shadow-xs">
          <span className="block font-mono text-base font-black leading-tight sm:text-xl text-blue-700 dark:text-blue-200">
            {String(value).padStart(2, "0")}
          </span>
          <span className="block text-[8px] font-bold uppercase tracking-wide text-blue-600/80 dark:text-blue-400">
            {label}
          </span>
        </span>
      ))}
    </div>
  );
}

/**
 * Top banner to display on student dashboard when rotational results are scheduled or live within 48h
 */
export function RotationalWinnerReleaseBanner({
  onAvailabilityChange,
  onOpen,
}: {
  onAvailabilityChange?: (available: boolean) => void;
  onOpen: () => void;
}) {
  const { plan } = useRotationalReleasePlan();

  useEffect(() => {
    onAvailabilityChange?.(Boolean(plan && !plan.is_expired));
  }, [onAvailabilityChange, plan]);

  if (!plan || plan.is_expired) return null;

  const { cycle, is_released, release_at, hours_remaining_of_48 } = plan;
  const totalAwards = cycle.winners?.length || 0;

  return (
    <div className="mb-4 min-w-0 rounded-2xl border border-blue-400/60 bg-gradient-to-r from-blue-600/15 via-indigo-600/10 to-sky-500/10 p-3 shadow-sm sm:p-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm sm:h-10 sm:w-10">
            <Crown className="h-4 w-4 sm:h-5 sm:w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm font-black leading-snug text-foreground sm:text-base">
              {is_released ? "👑 Monthly reading champions announced!" : "👑 Monthly rotational honours are on the way"}
            </p>
            <p className="mt-0.5 line-clamp-2 break-words text-[11px] text-muted-foreground sm:text-xs">
              {cycle.cycleLabel} · {totalAwards} honour{totalAwards === 1 ? "" : "s"} planned
              {is_released && ` · Available for next ${hours_remaining_of_48} hours`}
            </p>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:shrink-0 sm:justify-end sm:gap-3">
          {!is_released && (
            <div className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg bg-blue-50/80 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 px-2 py-2 text-blue-900 dark:text-blue-200 sm:px-3">
              <Clock3 className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400 sm:h-4 sm:w-4" />
              <RotationalCountdown target={release_at} compact />
            </div>
          )}
          <Button
            size="sm"
            onClick={onOpen}
            className="min-w-0 bg-blue-600 hover:bg-blue-700 px-3 text-xs text-white font-bold sm:text-sm shadow-xs"
          >
            {is_released ? "See Winners" : "Preview Honours"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Full page component rendered under the "Monthly Honours" tab in Student Dashboard
 */
export default function RotationalWinnerReleasePage() {
  const { plan, loading, refresh } = useRotationalReleasePlan();
  const [filterType, setFilterType] = useState<"all" | "best_user" | "reader_month">("all");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (loading) {
    return (
      <Card className="border-blue-200 dark:border-blue-900">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Loading rotational honours announcement…
        </CardContent>
      </Card>
    );
  }

  if (!plan || plan.is_expired) {
    return (
      <Card className="border-blue-200 dark:border-blue-900">
        <CardContent className="px-4 py-10 text-center sm:py-14">
          <Crown className="mx-auto mb-3 h-10 w-10 text-blue-400/50" />
          <p className="font-bold text-foreground">No active rotational announcement</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground sm:text-sm">
            When the library publishes new monthly reading honours, the countdown and winners will appear here for 48 hours.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { cycle, release_at, is_released, hours_remaining_of_48 } = plan;
  const winners = cycle.winners || [];
  const bestUsers = winners.filter((w) => w.badgeType === "best_library_user");
  const readerMonths = winners.filter((w) => w.badgeType === "reader_of_the_month");

  const filteredWinners = filterType === "all"
    ? winners
    : filterType === "best_user"
    ? bestUsers
    : readerMonths;

  const formattedCollectionDate = cycle.settings?.collectionDate
    ? new Date(cycle.settings.collectionDate).toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Collection Date TBA";

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl space-y-4 sm:space-y-6">
      {/* Blue Theme Hero Header */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-indigo-700 to-sky-800 p-4 text-white shadow-xl border border-blue-500/30 sm:rounded-3xl sm:p-8">
        <div className="flex min-w-0 items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <Badge className="mb-2 border border-white/25 bg-white/15 text-[10px] text-white sm:mb-3 sm:text-xs">
              <Crown className="mr-1 h-3 w-3 text-amber-300 sm:mr-1.5 sm:h-3.5 sm:w-3.5" />
              Monthly Reading Honours · {cycle.cycleLabel}
            </Badge>
            <h1 className="break-words text-xl font-black leading-tight sm:text-3xl">
              {is_released ? "👑 Celebrating our Reading Champions!" : "Royal Reading Honours are on the Way"}
            </h1>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-blue-100 sm:text-sm">
              {is_released
                ? `Official announcement for ${cycle.cycleLabel}. This honours showcase remains live for the next ${hours_remaining_of_48} hours.`
                : `Preview the planned rotational awards for ${cycle.cycleLabel}. Winner names stay sealed until the release timer completes.`}
            </p>
          </div>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => void refresh()}
            aria-label="Refresh rotational results"
            className="h-8 w-8 shrink-0 bg-white/20 hover:bg-white/30 text-white sm:h-10 sm:w-10 border border-white/20"
          >
            <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Card */}
      <Card className="min-w-0 overflow-hidden rounded-2xl border-blue-200 dark:border-blue-900/60 shadow-md">
        <CardHeader className="bg-blue-50/50 dark:bg-blue-950/20 p-4 pb-4 sm:p-6 sm:pb-4 border-b border-blue-100 dark:border-blue-900/40">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-start gap-2 break-words text-base leading-snug sm:text-lg text-blue-950 dark:text-blue-100 font-bold">
                <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 sm:h-5 sm:w-5" />
                <span>{cycle.cycleLabel} — Rotational Badge Honours</span>
              </CardTitle>
              <p className="mt-1 flex items-start gap-1.5 break-words text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                <span>
                  Physical Badge Collection: <strong>{formattedCollectionDate}</strong> at <strong>{cycle.settings?.collectionVenue || "Central Library"}</strong>
                </span>
              </p>
            </div>

            {is_released ? (
              <div className="flex flex-col items-end gap-1">
                <Badge className="w-fit bg-blue-600 hover:bg-blue-600 text-white font-bold shadow-xs">
                  <PartyPopper className="mr-1 h-3.5 w-3.5" /> Announced &amp; Live
                </Badge>
                <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                  Visible for next {hours_remaining_of_48} hours
                </span>
              </div>
            ) : (
              <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-blue-200 dark:border-blue-900 bg-background px-2.5 py-2 sm:min-w-[14rem] sm:px-3 shadow-xs">
                <p className="text-center text-[9px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 sm:text-[10px]">
                  Time remaining until release
                </p>
                <RotationalCountdown target={release_at} />
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="min-w-0 space-y-5 p-4 sm:p-6">
          {/* Collection Advice Bar */}
          {is_released && cycle.settings?.librarianNote && (
            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs space-y-1">
              <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-blue-600" />
                Librarian Instructions &amp; Collection Note
              </span>
              <p className="text-blue-800 dark:text-blue-300 text-[11px] leading-relaxed">
                {cycle.settings.librarianNote}
              </p>
            </div>
          )}

          {/* Planned Honours Overview */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                {is_released ? "Award Winners" : "Prizes & Honours Planned"} · {winners.length} Total Award{winners.length === 1 ? "" : "s"}
              </h3>

              {is_released && (
                <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border">
                  <Button
                    size="sm"
                    variant={filterType === "all" ? "default" : "ghost"}
                    className={`h-7 px-2.5 text-xs font-bold ${filterType === "all" ? "bg-blue-600 text-white" : ""}`}
                    onClick={() => setFilterType("all")}
                  >
                    All ({winners.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={filterType === "best_user" ? "default" : "ghost"}
                    className={`h-7 px-2.5 text-xs font-bold ${filterType === "best_user" ? "bg-blue-600 text-white" : ""}`}
                    onClick={() => setFilterType("best_user")}
                  >
                    👑 Best Users ({bestUsers.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={filterType === "reader_month" ? "default" : "ghost"}
                    className={`h-7 px-2.5 text-xs font-bold ${filterType === "reader_month" ? "bg-blue-600 text-white" : ""}`}
                    onClick={() => setFilterType("reader_month")}
                  >
                    📚 Readers of Month ({readerMonths.length})
                  </Button>
                </div>
              )}
            </div>

            {/* When NOT released yet: Show planned awards preview */}
            {!is_released && (
              <div className="space-y-4">
                <div className="grid min-w-0 gap-2 sm:grid-cols-2">
                  <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 space-y-1">
                    <span className="font-bold text-xs text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                      <Crown className="h-4 w-4 text-amber-500" />
                      👑 Best Library User Awards ({bestUsers.length} Classes)
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Awarded to the top reader across each standard based on cumulative XP and book issues.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 space-y-1">
                    <span className="font-bold text-xs text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4 text-indigo-500" />
                      📚 Reader of the Month Awards ({readerMonths.length} Sections)
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Awarded to section champions who showed exceptional dedication to reading.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-dashed border-blue-300 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/10 p-6 text-center text-sm text-blue-900 dark:text-blue-300 space-y-1">
                  <p className="font-bold">🔒 Winner names are sealed until announcement</p>
                  <p className="text-xs text-muted-foreground">
                    The results will be unveiled live on this screen when the countdown expires. Check back soon!
                  </p>
                </div>
              </div>
            )}

            {/* When RELEASED: Show winners grid */}
            {is_released && (
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                {filteredWinners.map((winner, index) => {
                  const isBest = winner.badgeType === "best_library_user";
                  return (
                    <div
                      key={`${winner.studentId}-${winner.badgeType}-${index}`}
                      className="flex min-w-0 items-start gap-3 rounded-xl border border-blue-200/80 dark:border-blue-900/60 bg-card p-3 shadow-xs hover:border-blue-400 transition-all"
                    >
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold shadow-xs ${
                        isBest ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300/40" : "bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-300/40"
                      }`}>
                        {isBest ? <Crown className="h-5 w-5 text-amber-500" /> : <BookOpen className="h-5 w-5 text-blue-600" />}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="break-words text-sm font-bold leading-snug text-foreground">
                            {winner.studentName}
                          </p>
                          {winner.isExtra && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-violet-50 text-violet-700 border-violet-200">
                              ⭐ Extra Honour
                            </Badge>
                          )}
                        </div>

                        <p className="break-words text-xs font-semibold text-blue-700 dark:text-blue-300 mt-0.5">
                          {isBest ? "👑 Best Library User" : "📚 Reader of the Month"}
                          <span className="text-muted-foreground font-normal"> · {winner.scopeValue}</span>
                        </p>

                        <p className="text-[11px] text-muted-foreground mt-1">
                          Admn #{winner.admissionNumber} · {winner.points} XP · {winner.booksIssuedCount} Books Borrowed
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
