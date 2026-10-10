import { useEffect, useState } from "react";
import { Clock, Flame, Zap } from "lucide-react";

interface VacationCountdownTimerProps {
  targetTime?: string | Date | null;
  label?: string;
  compact?: boolean;
}

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  isExpired: boolean;
}

function calculateTimeLeft(target?: string | Date | null): TimeLeft {
  const now = new Date().getTime();
  let targetMs: number;

  if (target) {
    targetMs = new Date(target).getTime();
  } else {
    // Default: end of today in local time
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    targetMs = endOfDay.getTime();
  }

  const diff = targetMs - now;
  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, totalMs: 0, isExpired: true };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { hours, minutes, seconds, totalMs: diff, isExpired: false };
}

export default function VacationCountdownTimer({
  targetTime,
  label = "Today's Window Closes In",
  compact = false,
}: VacationCountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(targetTime));

  useEffect(() => {
    setTimeLeft(calculateTimeLeft(targetTime));
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetTime]);

  if (timeLeft.isExpired) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
        <Clock className="h-3.5 w-3.5" />
        <span>Today&apos;s Window Closed</span>
      </div>
    );
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const isUrgent = timeLeft.hours < 2;

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
