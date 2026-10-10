import { useEffect, useState } from "react";
import { Calendar, Clock, Flame, Zap } from "lucide-react";

interface VacationCountdownTimerProps {
  targetTime?: string | Date | null;
  mode?: "start" | "end";
  label?: string;
  compact?: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  isExpired: boolean;
  isMoreThan48h: boolean;
}

function calculateTimeLeft(target?: string | Date | null, mode: "start" | "end" = "end"): TimeLeft | null {
  if (!target) return null;

  const now = new Date().getTime();
  let targetMs: number;

  if (typeof target === "string" && /^\d{4}-\d{2}-\d{2}$/.test(target.trim())) {
    const parts = target.trim().split("-").map(Number);
    if (mode === "start") {
      // Start of day: 00:00:00.000
      const d = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
      targetMs = d.getTime();
    } else {
      // End of day: 23:59:59.999
      const d = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
      targetMs = d.getTime();
    }
  } else {
    targetMs = new Date(target).getTime();
  }

  const diff = targetMs - now;
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isExpired: true, isMoreThan48h: false };
  }

  const isMoreThan48h = diff > 48 * 60 * 60 * 1000;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, totalMs: diff, isExpired: false, isMoreThan48h };
}

export default function VacationCountdownTimer({
  targetTime,
  mode = "end",
  label,
  compact = false,
}: VacationCountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() => calculateTimeLeft(targetTime, mode));

  useEffect(() => {
    setTimeLeft(calculateTimeLeft(targetTime, mode));
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetTime, mode));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetTime, mode]);

  if (!timeLeft) return null;

  if (timeLeft.isExpired) {
    if (mode === "start") {
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
          <Zap className="h-3.5 w-3.5" />
          <span>Live Now 🔥</span>
        </div>
      );
    }
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
        <Clock className="h-3.5 w-3.5" />
        <span>Window Closed</span>
      </div>
    );
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const isUrgent = mode === "end" && !timeLeft.isMoreThan48h && timeLeft.hours < 2;
  const effectiveLabel = label || (mode === "start" ? "Starts In" : "Window Closes In");

  // When more than 48 hours remain, show day count
  if (timeLeft.isMoreThan48h) {
    const daysText = mode === "start"
      ? `Starts in ${timeLeft.days} ${timeLeft.days === 1 ? "Day" : "Days"}`
      : `${timeLeft.days} ${timeLeft.days === 1 ? "Day" : "Days"} Left`;

    if (compact) {
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300">
          <Calendar className="h-3.5 w-3.5" />
          <span>{daysText}</span>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-background p-3 sm:p-4 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 bg-amber-600">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <span>{effectiveLabel}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">Live countdown timer starts 48 hours before the event</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:self-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-800 dark:text-amber-200 font-black text-sm sm:text-base">
              <Calendar className="h-4 w-4" />
              <span>{daysText}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Under 48 hours: Live ticking timer
  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
          isUrgent
            ? "bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-400 animate-pulse"
            : "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300"
        }`}
      >
        {isUrgent ? <Flame className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
        <span>
          {mode === "start" ? "Starts: " : ""}
          {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border p-3 sm:p-4 backdrop-blur-sm transition-all ${
        isUrgent
          ? "border-red-500/40 bg-gradient-to-r from-red-500/15 via-orange-500/10 to-amber-500/10 shadow-sm"
          : "border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-primary/10 shadow-sm"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 ${
              isUrgent ? "bg-red-600 animate-bounce" : "bg-amber-600"
            }`}
          >
            {isUrgent ? <Zap className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span>{label}</span>
              {isUrgent && (
                <span className="text-[10px] text-red-600 dark:text-red-400 font-extrabold uppercase animate-pulse">
                  Closing Soon!
                </span>
              )}
            </p>
            <p className="text-[11px] text-muted-foreground">Submit before deadline to protect your streak</p>
          </div>
        </div>

        {/* Digit Blocks */}
        <div className="flex items-center gap-1.5 sm:self-center">
          <div className="flex flex-col items-center">
            <span
              className={`min-w-9 text-center font-mono text-base sm:text-lg font-black px-2 py-0.5 rounded-lg border shadow-sm ${
                isUrgent
                  ? "bg-red-500/20 border-red-500/40 text-red-700 dark:text-red-300"
                  : "bg-background border-border text-foreground"
              }`}
            >
              {pad(timeLeft.hours)}
            </span>
            <span className="text-[9px] uppercase font-bold text-muted-foreground mt-0.5">Hours</span>
          </div>
          <span className="text-base font-black text-muted-foreground -mt-3.5">:</span>
          <div className="flex flex-col items-center">
            <span
              className={`min-w-9 text-center font-mono text-base sm:text-lg font-black px-2 py-0.5 rounded-lg border shadow-sm ${
                isUrgent
                  ? "bg-red-500/20 border-red-500/40 text-red-700 dark:text-red-300"
                  : "bg-background border-border text-foreground"
              }`}
            >
              {pad(timeLeft.minutes)}
            </span>
            <span className="text-[9px] uppercase font-bold text-muted-foreground mt-0.5">Mins</span>
          </div>
          <span className="text-base font-black text-muted-foreground -mt-3.5">:</span>
          <div className="flex flex-col items-center">
            <span
              className={`min-w-9 text-center font-mono text-base sm:text-lg font-black px-2 py-0.5 rounded-lg border shadow-sm ${
                isUrgent
                  ? "bg-red-500/20 border-red-500/40 text-red-700 dark:text-red-300 animate-pulse"
                  : "bg-amber-500/20 border-amber-500/40 text-amber-700 dark:text-amber-300"
              }`}
            >
              {pad(timeLeft.seconds)}
            </span>
            <span className="text-[9px] uppercase font-bold text-muted-foreground mt-0.5">Secs</span>
          </div>
        </div>
      </div>
    </div>
  );
}
