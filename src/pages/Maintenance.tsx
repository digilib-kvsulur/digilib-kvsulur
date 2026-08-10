import { useState, useEffect } from "react";
import { Wrench, BookOpen, Clock, MessageCircle } from "lucide-react";

// Maintenance end: 14 Aug 2026, 4:00 PM IST (UTC+5:30 → UTC: 10:30)
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
  <div className="flex flex-col items-center gap-1.5">
    <div
      className="relative w-16 h-16 xs:w-18 xs:h-18 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-xl sm:rounded-2xl flex items-center justify-center overflow-hidden"
      style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        boxShadow:
          "0 0 20px hsl(var(--primary) / 0.15), inset 0 1px 0 hsl(var(--primary) / 0.1)",
        minWidth: "4rem",
      }}
    >
      {/* Shimmer overlay */}
      <div
        className="absolute inset-0 animate-shimmer pointer-events-none"
        aria-hidden="true"
      />
      <span
        className="relative z-10 text-2xl sm:text-3xl md:text-4xl font-mono font-extrabold tracking-tight"
        style={{ color: "hsl(var(--primary))" }}
      >
        {pad(value)}
      </span>
    </div>
    <span
      className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest"
      style={{ color: "hsl(var(--muted-foreground))" }}
    >
      {label}
    </span>
  </div>
);

const Separator = () => (
  <span
    className="text-2xl sm:text-3xl md:text-4xl font-mono font-bold mt-3 sm:mt-4 animate-pulse select-none"
    style={{ color: "hsl(var(--primary) / 0.35)" }}
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
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8 sm:py-12 relative overflow-hidden"
      style={{ background: "hsl(var(--background))" }}
    >
      {/* ── Ambient blobs ── */}
      <div
        className="absolute -top-24 -left-24 w-64 h-64 sm:w-96 sm:h-96 md:w-[500px] md:h-[500px] rounded-full blur-3xl opacity-[0.12] pointer-events-none"
        style={{ background: "hsl(var(--primary))" }}
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-24 -right-24 w-64 h-64 sm:w-96 sm:h-96 md:w-[500px] md:h-[500px] rounded-full blur-3xl opacity-[0.12] pointer-events-none"
        style={{ background: "hsl(var(--accent))" }}
        aria-hidden="true"
      />

      {/* ── Main card ── */}
      <div
        className="glass-card relative z-10 w-full max-w-xl sm:max-w-2xl rounded-2xl sm:rounded-3xl px-5 py-8 sm:px-8 sm:py-10 md:px-12 md:py-12 text-center space-y-6 sm:space-y-8 animate-fade-in"
        style={{
          boxShadow:
            "0 25px 50px -12px hsl(var(--primary) / 0.15), 0 0 0 1px hsl(var(--border) / 0.6)",
        }}
      >
        {/* ── Logo / Icon ── */}
        <div className="flex flex-col items-center gap-2 sm:gap-3 animate-float">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-xl sm:rounded-2xl blur-xl opacity-50"
              style={{ background: "hsl(var(--primary))" }}
              aria-hidden="true"
            />
            <div
              className="relative flex items-center justify-center gap-2 px-4 py-3 sm:px-5 sm:py-4 rounded-xl sm:rounded-2xl"
              style={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
              }}
            >
              <BookOpen
                className="w-7 h-7 sm:w-8 sm:h-8"
                style={{ color: "hsl(var(--primary))" }}
              />
              <Wrench
                className="w-4 h-4 sm:w-5 sm:h-5"
                style={{ color: "hsl(var(--accent))" }}
              />
            </div>
          </div>
          <span
            className="text-xs sm:text-sm font-semibold tracking-[0.15em] sm:tracking-[0.2em] uppercase"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            DLMS · PM SHRI KV AFS Sulur
          </span>
        </div>

        {/* ── Heading ── */}
        <div className="space-y-2 sm:space-y-3">
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight animate-gradient bg-clip-text text-transparent leading-tight"
            style={{
              backgroundImage: "var(--gradient-primary)",
              backgroundSize: "200% 200%",
            }}
          >
            Site Under Maintenance
          </h1>
          <p
            className="text-sm sm:text-base md:text-lg leading-relaxed max-w-md mx-auto"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            We're upgrading DLMS to bring you an even better library experience.
            We'll be back on{" "}
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
          className="pt-5 sm:pt-6 border-t"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          <div
            className="flex items-center justify-center gap-1.5 sm:gap-2 mb-4 sm:mb-5"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-[10px] sm:text-xs font-semibold tracking-[0.15em] uppercase">
              Back online in
            </span>
          </div>

          <div className="flex items-start justify-center gap-2 sm:gap-3 md:gap-4">
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
          className="text-xs sm:text-sm"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          This applies to all library locations. Thank you for your patience.
        </p>

        {/* ── Support CTA button ── */}
        <div className="pt-1">
          <a
            id="maintenance-support-btn"
            href="https://wa.me/919865190190"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-6 py-3 sm:px-8 sm:py-3.5 rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{
              background: "var(--gradient-primary)",
              color: "hsl(var(--primary-foreground))",
              boxShadow:
                "0 0 0 0 hsl(var(--primary) / 0), 0 4px 24px hsl(var(--primary) / 0.4)",
              focusRingColor: "hsl(var(--primary))",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.boxShadow =
                "0 0 0 0 hsl(var(--primary) / 0), 0 8px 32px hsl(var(--primary) / 0.55)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.boxShadow =
                "0 0 0 0 hsl(var(--primary) / 0), 0 4px 24px hsl(var(--primary) / 0.4)";
            }}
          >
            <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span>Contact Support via WhatsApp</span>
          </a>
          <p
            className="mt-2 text-[10px] sm:text-xs"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Need urgent help? We're available on WhatsApp.
          </p>
        </div>
      </div>

      {/* ── Bottom brand strip ── */}
      <div className="relative z-10 mt-5 sm:mt-6 flex items-center gap-2 opacity-40">
        <BookOpen
          className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0"
          style={{ color: "hsl(var(--primary))" }}
        />
        <span
          className="text-[10px] sm:text-xs font-medium text-center"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          PM SHRI Kendriya Vidyalaya AFS Sulur · Digital Library Management System
        </span>
      </div>
    </div>
  );
}
