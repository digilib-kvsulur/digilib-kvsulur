import { useState, useEffect } from "react";
import { Wrench, BookOpen, Clock } from "lucide-react";

// Maintenance end: 14 Aug 2026, 4:00 PM IST (UTC+5:30 = 10:30 UTC)
const MAINTENANCE_END = new Date("2026-08-14T10:30:00Z");

function getTimeLeft() {
  const diff = MAINTENANCE_END.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

const pad = (n: number) => n.toString().padStart(2, "0");

interface TimerBlockProps {
  value: number;
  label: string;
}

const TimerBlock = ({ value, label }: TimerBlockProps) => (
  <div className="flex flex-col items-center gap-2">
    <div
      className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center overflow-hidden"
      style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        boxShadow: "0 0 20px hsl(var(--primary) / 0.15), inset 0 1px 0 hsl(var(--primary) / 0.1)",
      }}
    >
      {/* Shimmer overlay */}
      <div
        className="absolute inset-0 animate-shimmer pointer-events-none"
        aria-hidden="true"
      />
      <span
        className="relative z-10 text-3xl sm:text-4xl font-mono font-extrabold tracking-tight"
        style={{ color: "hsl(var(--primary))" }}
      >
        {pad(value)}
      </span>
    </div>
    <span
      className="text-xs font-semibold uppercase tracking-widest"
      style={{ color: "hsl(var(--muted-foreground))" }}
    >
      {label}
    </span>
  </div>
);

const Separator = () => (
  <span
    className="text-3xl sm:text-4xl font-mono font-bold mt-4 animate-pulse select-none"
    style={{ color: "hsl(var(--primary) / 0.4)" }}
  >
    :
  </span>
);

export default function Maintenance() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft());

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "hsl(var(--background))" }}
    >
      {/* ── Ambient blobs using site's primary + accent colours ── */}
      <div
        className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-3xl opacity-[0.12] pointer-events-none"
        style={{ background: "hsl(var(--primary))" }}
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full blur-3xl opacity-[0.12] pointer-events-none"
        style={{ background: "hsl(var(--accent))" }}
        aria-hidden="true"
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] rounded-full blur-3xl opacity-[0.05] pointer-events-none"
        style={{ background: "hsl(var(--primary))" }}
        aria-hidden="true"
      />

      {/* ── Card ── */}
      <div
        className="glass-card relative z-10 w-full max-w-2xl rounded-3xl p-8 md:p-12 text-center space-y-8 animate-fade-in"
        style={{
          boxShadow:
            "0 25px 50px -12px hsl(var(--primary) / 0.15), 0 0 0 1px hsl(var(--border) / 0.6)",
        }}
      >
        {/* ── Logo / Icon ── */}
        <div className="flex flex-col items-center gap-3 animate-float">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-2xl blur-xl opacity-60"
              style={{ background: "hsl(var(--primary))" }}
              aria-hidden="true"
            />
            <div
              className="relative flex items-center justify-center gap-2 px-5 py-4 rounded-2xl"
              style={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
              }}
            >
              <BookOpen
                className="w-8 h-8"
                style={{ color: "hsl(var(--primary))" }}
              />
              <Wrench
                className="w-5 h-5"
                style={{ color: "hsl(var(--accent))" }}
              />
            </div>
          </div>
          <span
            className="text-sm font-semibold tracking-[0.2em] uppercase"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            DigiLib · KV Sulur
          </span>
        </div>

        {/* ── Heading ── */}
        <div className="space-y-3">
          <h1
            className="text-4xl md:text-5xl font-extrabold tracking-tight animate-gradient bg-clip-text text-transparent"
            style={{
              backgroundImage: "var(--gradient-primary)",
              backgroundSize: "200% 200%",
            }}
          >
            Site Under Maintenance
          </h1>
          <p
            className="text-base md:text-lg leading-relaxed max-w-md mx-auto"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            We're upgrading DLMS to bring you an even better library
            experience. We'll be back on{" "}
            <span
              className="font-semibold"
              style={{ color: "hsl(var(--foreground))" }}
            >
              14 Aug 2026 at 4:00 PM IST
            </span>
            .
          </p>
        </div>

        {/* ── Countdown Timer ── */}
        <div
          className="pt-6 border-t"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          <div
            className="flex items-center justify-center gap-2 mb-5"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            <Clock className="w-4 h-4" />
            <span className="text-xs font-semibold tracking-[0.15em] uppercase">
              Back online in
            </span>
          </div>

          <div className="flex items-start justify-center gap-3 sm:gap-4">
            <TimerBlock value={timeLeft.days} label="Days" />
            <Separator />
            <TimerBlock value={timeLeft.hours} label="Hours" />
            <Separator />
            <TimerBlock value={timeLeft.minutes} label="Mins" />
            <Separator />
            <TimerBlock value={timeLeft.seconds} label="Secs" />
          </div>
        </div>

        {/* ── Footer note ── */}
        <p
          className="text-xs"
          style={{ color: "hsl(var(--muted-foreground) / 0.7)" }}
        >
          This applies to all. Thank you for your patience.
        </p>
      </div>

      {/* ── Bottom brand strip ── */}
      <div className="relative z-10 mt-6 flex items-center gap-2 opacity-50">
        <BookOpen
          className="w-4 h-4"
          style={{ color: "hsl(var(--primary))" }}
        />
        <span
          className="text-xs font-medium"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          PM SHRI Kendriya Vidyalaya Sulur Digital Library Management System Team
          For Support Please click <a href="https://wa.me/919865190190">HERE</a>
        </span>
      </div>
    </div>
  );
}
