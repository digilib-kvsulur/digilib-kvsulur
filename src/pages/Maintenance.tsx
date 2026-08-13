import { useState, useEffect } from "react";
import { Wrench, BookOpen, Clock, Mail, X, Sparkles, Bell } from "lucide-react";

// 17 Aug 2026, 12:00 AM IST = 16 Aug 2026, 18:30 UTC
const MAINTENANCE_END = new Date("2026-08-16T18:30:00Z");

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

const TimerBlock = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center gap-1 sm:gap-1.5">
    <div
      className="relative rounded-lg sm:rounded-xl flex items-center justify-center overflow-hidden"
      style={{
        width: "clamp(3rem, 16vw, 5.5rem)",
        height: "clamp(3rem, 16vw, 5.5rem)",
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        boxShadow: "0 0 18px hsl(var(--warning) / 0.18), inset 0 1px 0 hsl(var(--warning) / 0.12)",
      }}
    >
      <div className="absolute inset-0 animate-shimmer pointer-events-none" aria-hidden="true" />
      <span
        className="relative z-10 font-mono font-extrabold tracking-tight"
        style={{
          fontSize: "clamp(1.1rem, 5vw, 2.2rem)",
          color: "hsl(var(--warning))",
        }}
      >
        {pad(value)}
      </span>
    </div>
    <span
      className="font-semibold uppercase tracking-widest"
      style={{
        fontSize: "clamp(0.5rem, 2vw, 0.7rem)",
        color: "hsl(var(--muted-foreground))",
      }}
    >
      {label}
    </span>
  </div>
);

const Separator = () => (
  <span
    className="font-mono font-bold animate-pulse select-none"
    style={{
      fontSize: "clamp(1.2rem, 5vw, 2.2rem)",
      color: "hsl(var(--warning) / 0.35)",
      marginTop: "clamp(0.4rem, 2vw, 1rem)",
    }}
  >
    :
  </span>
);

const DevModal = ({ onClose }: { onClose: () => void }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
    style={{ background: "hsl(var(--background) / 0.85)", backdropFilter: "blur(8px)" }}
    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
  >
    <div
      className="glass-card relative w-full max-w-lg p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl space-y-4"
      style={{ border: "1px solid hsl(var(--warning) / 0.45)" }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted transition-colors"
        style={{ color: "hsl(var(--muted-foreground))" }}
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 pr-8">
        <div
          className="p-2 rounded-xl"
          style={{
            background: "hsl(var(--warning) / 0.15)",
            border: "1px solid hsl(var(--warning) / 0.3)",
          }}
        >
          <Sparkles className="w-6 h-6" style={{ color: "hsl(var(--warning))" }} />
        </div>
        <h2
          className="text-lg sm:text-xl font-bold leading-tight"
          style={{ color: "hsl(var(--foreground))" }}
        >
          Message from the Developer
        </h2>
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1px solid hsl(var(--border))" }} />

      {/* Body */}
      <p
        className="text-sm sm:text-base leading-relaxed"
        style={{ color: "hsl(var(--muted-foreground))" }}
      >
        Dear Students,
        <br /><br />
        Due to the <span className="font-semibold" style={{ color: "hsl(var(--foreground))" }}>
          unexpectedly overwhelming response
        </span> from our students, we are taking additional time to upgrade our database infrastructure — ensuring a{" "}
        <span className="font-semibold" style={{ color: "hsl(var(--foreground))" }}>
          lifetime of uninterrupted DLMS experience
        </span>{" "}for everyone.
        <br /><br />
        All your data (Including XPs & Ranking) is preserved in a safe and secure manner.
        <br /><br />
        We are working tirelessly to get the site back online by{" "}
        <span className="font-semibold" style={{ color: "hsl(var(--warning))" }}>
          Before 16th Aug 2026, Late Night
        </span>. Your patience and cooperation mean the world to us.
        <br /><br />
        Thank you for being part of this journey. 🙏
      </p>

      {/* Signature */}
      <div
        className="rounded-xl p-3 sm:p-4"
        style={{
          background: "hsl(var(--warning) / 0.08)",
          border: "1px solid hsl(var(--warning) / 0.2)",
        }}
      >
        <p className="text-xs sm:text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
          — G V Tanish Vettrivel
        </p>
        <p className="text-[10px] sm:text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
          Developer, DLMS · PM SHRI KV AFS Sulur
        </p>
      </div>

      {/* CTA */}
      <div className="flex justify-end pt-1">
        <button
          onClick={onClose}
          className="px-5 py-2.5 rounded-xl font-semibold text-sm sm:text-base transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            background: "var(--gradient-warm)",
            color: "hsl(var(--warning-foreground))",
            boxShadow: "0 4px 15px hsl(var(--warning) / 0.35)",
          }}
        >
          Okay, got it! 👍
        </button>
      </div>
    </div>
  </div>
);

export default function Maintenance() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft());
  const [showModal, setShowModal] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8 sm:py-12 relative overflow-hidden"
      style={{ background: "hsl(var(--background))" }}
    >
      {/* Modal */}
      {showModal && <DevModal onClose={() => setShowModal(false)} />}

      {/* Ambient blobs */}
      <div
        className="absolute -top-24 -left-24 w-64 h-64 sm:w-96 sm:h-96 md:w-[500px] md:h-[500px] rounded-full blur-3xl opacity-[0.13] pointer-events-none"
        style={{ background: "hsl(var(--warning))" }}
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-24 -right-24 w-64 h-64 sm:w-96 sm:h-96 md:w-[500px] md:h-[500px] rounded-full blur-3xl opacity-[0.11] pointer-events-none"
        style={{ background: "hsl(var(--destructive))" }}
        aria-hidden="true"
      />

      {/* Main card */}
      <div
        className="glass-card relative z-10 w-full max-w-xl sm:max-w-2xl rounded-2xl sm:rounded-3xl px-5 py-8 sm:px-8 sm:py-10 md:px-12 md:py-12 text-center space-y-6 sm:space-y-8 animate-fade-in"
        style={{
          boxShadow: "0 25px 50px -12px hsl(var(--warning) / 0.15), 0 0 0 1px hsl(var(--border) / 0.6)",
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-2 sm:gap-3 animate-float">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-xl sm:rounded-2xl blur-xl opacity-50"
              style={{ background: "hsl(var(--warning))" }}
              aria-hidden="true"
            />
            <div
              className="relative flex items-center justify-center gap-2 px-4 py-3 sm:px-5 sm:py-4 rounded-xl sm:rounded-2xl"
              style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
            >
              <BookOpen className="w-7 h-7 sm:w-8 sm:h-8" style={{ color: "hsl(var(--warning))" }} />
              <Wrench className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: "hsl(var(--destructive))" }} />
            </div>
          </div>
          <span
            className="text-xs sm:text-sm font-semibold tracking-[0.15em] sm:tracking-[0.2em] uppercase"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            DLMS · PM SHRI KV AFS Sulur
          </span>
        </div>

        {/* Heading */}
        <div className="space-y-2 sm:space-y-3">
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight animate-gradient bg-clip-text text-transparent leading-tight"
            style={{ backgroundImage: "var(--gradient-warm)", backgroundSize: "200% 200%" }}
          >
            Site Under Maintenance
          </h1>
          <p
            className="text-sm sm:text-base md:text-lg leading-relaxed max-w-md mx-auto"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            We're upgrading DLMS to bring you a better experience. We are working tirelessly to get it running soon before:{" "}
            <span className="font-semibold" style={{ color: "hsl(var(--foreground))" }}>
              16th Aug 2026, Midnight Night
            </span>
            .
          </p>
        </div>

        {/* Countdown Timer */}
        <div className="pt-5 sm:pt-6 border-t" style={{ borderColor: "hsl(var(--border))" }}>
          <div
            className="flex items-center justify-center gap-1.5 sm:gap-2 mb-4 sm:mb-5"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="text-[10px] sm:text-xs font-semibold tracking-[0.15em] uppercase">
              Back online in
            </span>
          </div>

          <div className="flex items-start justify-center" style={{ gap: "clamp(0.3rem, 2vw, 1rem)" }}>
            <TimerBlock value={timeLeft.days} label="Days" />
            <Separator />
            <TimerBlock value={timeLeft.hours} label="Hours" />
            <Separator />
            <TimerBlock value={timeLeft.minutes} label="Mins" />
            <Separator />
            <TimerBlock value={timeLeft.seconds} label="Secs" />
          </div>
        </div>

        {/* Footer note */}
        <p className="text-xs sm:text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
          This applies to all library locations. Thank you for your patience.
        </p>

        {/* Action buttons row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
          {/* Developer message button */}
          <button
            id="view-dev-message-btn"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
            style={{
              background: "hsl(var(--card))",
              color: "hsl(var(--warning))",
              border: "1.5px solid hsl(var(--warning) / 0.5)",
              boxShadow: "0 2px 12px hsl(var(--warning) / 0.15)",
            }}
          >
            <Bell className="w-4 h-4 flex-shrink-0" />
            <span>Developer Message</span>
          </button>

          {/* Contact button */}
          <a
            id="maintenance-support-btn"
            href="mailto:tanishvettrivel2010@gmail.com"
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
            style={{
              background: "var(--gradient-warm)",
              color: "hsl(var(--warning-foreground))",
              boxShadow: "0 4px 20px hsl(var(--warning) / 0.38)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.boxShadow =
                "0 6px 28px hsl(var(--warning) / 0.55)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.boxShadow =
                "0 4px 20px hsl(var(--warning) / 0.38)";
            }}
          >
            <Mail className="w-4 h-4 flex-shrink-0" />
            <span>Contact Developer</span>
          </a>
        </div>

        <p className="text-[10px] sm:text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
          tanishvettrivel2010@gmail.com
        </p>
      </div>

      {/* Bottom brand strip */}
      <div className="relative z-10 mt-5 sm:mt-6 flex items-center gap-2 opacity-40">
        <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: "hsl(var(--warning))" }} />
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
