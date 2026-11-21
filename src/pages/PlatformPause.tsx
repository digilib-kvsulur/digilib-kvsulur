import { useState, useEffect } from "react";
import {
  Heart,
  ShieldCheck,
  Flame,
  Lock,
  Mail,
  BookOpen,
  Sparkles,
  Clock,
  Quote,
  FileText,
  X,
  HeartHandshake,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { PAUSE_CONFIG, getPauseRemainingMs } from "@/config/pauseConfig";

function getTimeLeft() {
  const diff = getPauseRemainingMs();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

const pad = (n: number) => n.toString().padStart(2, "0");

const TimerPill = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center gap-1.5 flex-1 min-w-[64px] max-w-[90px]">
    <div
      className="w-full aspect-square rounded-2xl flex items-center justify-center relative overflow-hidden backdrop-blur-md transition-transform hover:scale-105"
      style={{
        background: "hsl(var(--card) / 0.85)",
        border: "1px solid hsl(217 91% 60% / 0.25)",
        boxShadow: "0 8px 24px -6px hsl(217 91% 60% / 0.18), inset 0 1px 0 hsl(0 0% 100% / 0.15)",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-indigo-500/10 pointer-events-none" />
      <span className="relative z-10 font-mono font-black text-2xl sm:text-3xl tracking-tight text-blue-600 dark:text-blue-400">
        {pad(value)}
      </span>
    </div>
    <span className="text-[11px] sm:text-xs font-semibold tracking-wider uppercase text-muted-foreground">
      {label}
    </span>
  </div>
);

const PolicyModal = ({ onClose }: { onClose: () => void }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
    style={{ background: "hsl(var(--background) / 0.8)", backdropFilter: "blur(12px)" }}
    onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
  >
    <div
      className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden border border-blue-500/30"
      style={{ background: "hsl(var(--card))" }}
    >
      {/* Header */}
      <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">Community & Moderation Policy</h3>
            <p className="text-xs text-muted-foreground">PM SHRI KV Sulur Digital Library</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-6 sm:p-8 overflow-y-auto space-y-5 text-sm leading-relaxed text-muted-foreground">
        <div>
          <h4 className="font-semibold text-foreground text-base mb-1.5 flex items-center gap-2">
            <Heart className="w-4 h-4 text-blue-500 fill-blue-500/20" />
            1. Respect & Kindness Above All
          </h4>
          <p>
            Treat every member of our school community with warmth and empathy. Harassment, teasing,
            bullying, hurtful comments, slurs, and sharing personal information are strictly prohibited.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-foreground text-base mb-1.5 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            2. Report, Don't Retaliate
          </h4>
          <p>
            If someone posts something unkind or upsetting, do not retaliate. Report it immediately or
            talk to your teacher or school counsellor so our safety team can address it calmly.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-foreground text-base mb-1.5 flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-500" />
            3. Account Responsibility
          </h4>
          <p>
            Always protect your password. Do not share your login credentials with classmates. You are
            responsible for activity taking place under your account.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-foreground text-base mb-1.5 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            4. Learning & Original Creative Work
          </h4>
          <p>
            DLMS is built to celebrate book reviews, creative writing, science questions, and positive
            discussions. Always respect other students' original ideas and contributions.
          </p>
        </div>

        <div className="rounded-2xl p-4 bg-blue-500/5 border border-blue-500/20 text-xs space-y-1">
          <p className="font-medium text-foreground">Need support or have questions?</p>
          <p>
            Reach out directly to the DLMS moderation team at{" "}
            <a href={`mailto:${PAUSE_CONFIG.supportEmail}`} className="text-blue-500 underline font-semibold">
              {PAUSE_CONFIG.supportEmail}
            </a>
            .
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border bg-muted/20 flex justify-end">
        <button
          onClick={onClose}
          className="px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md shadow-blue-500/20"
        >
          Understood
        </button>
      </div>
    </div>
  </div>
);

export default function PlatformPause() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft());
  const [showPolicy, setShowPolicy] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-start sm:justify-center px-4 py-8 sm:py-16 overflow-x-hidden bg-gradient-to-b from-background via-blue-950/5 to-background">
      {/* Background ambient orbs */}
      <div
        className="fixed -top-40 -left-40 w-80 sm:w-[500px] h-80 sm:h-[500px] rounded-full blur-[130px] opacity-25 pointer-events-none"
        style={{ background: "hsl(217 91% 60%)" }}
        aria-hidden="true"
      />
      <div
        className="fixed top-1/2 -right-40 w-80 sm:w-[500px] h-80 sm:h-[500px] rounded-full blur-[140px] opacity-20 pointer-events-none"
        style={{ background: "hsl(262 83% 58%)" }}
        aria-hidden="true"
      />
      <div
        className="fixed -bottom-40 left-1/3 w-80 sm:w-[500px] h-80 sm:h-[500px] rounded-full blur-[130px] opacity-15 pointer-events-none"
        style={{ background: "hsl(199 89% 48%)" }}
        aria-hidden="true"
      />

      {showPolicy && <PolicyModal onClose={() => setShowPolicy(false)} />}

      <div className="relative z-10 w-full max-w-3xl flex flex-col items-center gap-6 sm:gap-8">
        {/* Top Header Badge */}
        <div className="flex flex-col items-center text-center gap-3">
          {/* School Emblem / Icon */}
          <div className="relative group">
            <div className="absolute inset-0 rounded-2xl blur-lg bg-blue-500/30 group-hover:bg-blue-500/50 transition-all duration-500" />
            <div className="relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-card border border-blue-500/30 shadow-xl overflow-hidden p-2">
              <img
                src="/logos/kv-square.png"
                alt="KV Sulur"
                className="w-full h-full object-contain"
                onError={(e) => {
                  // Fallback to lucide BookOpen icon if logo fails to load
                  e.currentTarget.style.display = "none";
                  e.currentTarget.parentElement?.classList.add("bg-blue-600");
                }}
              />
              <BookOpen className="w-7 h-7 text-blue-500 hidden group-[.fallback]:block" />
            </div>
          </div>

          {/* School Name */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs sm:text-sm font-semibold tracking-wide">
            <Heart className="w-3.5 h-3.5 fill-blue-500/30" />
            <span>PM SHRI KV AFS SULUR · DIGITAL LIBRARY</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground leading-tight mt-1">
            DLMS is taking a short break <span className="inline-block animate-pulse">💙</span>
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground max-w-lg leading-relaxed">
            Our school platform is temporarily paused while we upgrade community safety features to
            ensure DLMS remains a kind, encouraging space for everyone.
          </p>
        </div>

        {/* Countdown Card */}
        <div className="w-full rounded-3xl p-5 sm:p-6 bg-card/60 backdrop-blur-xl border border-blue-500/20 shadow-xl shadow-blue-500/5 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            <Clock className="w-4 h-4 text-blue-500" />
            <span>Reopening In</span>
          </div>

          <div className="flex items-center justify-center gap-2 sm:gap-3 w-full max-w-md">
            <TimerPill value={timeLeft.days} label="Days" />
            <span className="font-mono font-bold text-xl text-blue-500/40 pb-5">:</span>
            <TimerPill value={timeLeft.hours} label="Hours" />
            <span className="font-mono font-bold text-xl text-blue-500/40 pb-5">:</span>
            <TimerPill value={timeLeft.minutes} label="Minutes" />
            <span className="font-mono font-bold text-xl text-blue-500/40 pb-5">:</span>
            <TimerPill value={timeLeft.seconds} label="Seconds" />
          </div>

          <div className="text-xs sm:text-sm text-muted-foreground text-center">
            Platform resumes on{" "}
            <span className="font-semibold text-foreground">
              {PAUSE_CONFIG.displayDate} at {PAUSE_CONFIG.displayTime}
            </span>
          </div>
        </div>

        {/* The Open Letter Card */}
        <div
          className="w-full rounded-3xl p-6 sm:p-10 bg-card/80 backdrop-blur-xl border border-border shadow-2xl relative overflow-hidden space-y-6"
          style={{
            boxShadow: "0 25px 50px -12px hsl(217 91% 60% / 0.08), 0 0 0 1px hsl(var(--border))",
          }}
        >
          {/* Top Decorative Corner Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Letter Header */}
          <div className="flex items-start justify-between border-b border-border/80 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <Quote className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-foreground">
                  A Message from Team DLMS
                </h2>
                <p className="text-xs text-muted-foreground">To all students, teachers, and staff</p>
              </div>
            </div>
            <span className="hidden sm:inline-flex text-xs px-3 py-1 rounded-full bg-muted font-medium text-muted-foreground">
              Official School Notice
            </span>
          </div>

          {/* Letter Body */}
          <div className="space-y-4 text-sm sm:text-base leading-relaxed text-foreground/90 font-normal">
            <p className="font-semibold text-base sm:text-lg text-foreground">
              {PAUSE_CONFIG.salutation}
            </p>

            <p>
              DLMS was built for all of us, to learn, share and grow together. Recently, a comment was
              posted on the platform that hurt a fellow member of our school family. This goes
              against the spirit of DLMS.
            </p>

            <p>
              Because we care about every one of you, the school has decided to pause DLMS for one
              week, until{" "}
              <span className="font-semibold text-blue-600 dark:text-blue-400 underline decoration-blue-500/30 underline-offset-4">
                {PAUSE_CONFIG.displayDate}
              </span>
              . We&apos;ll use this time to make the platform safer.
            </p>

            {/* Inspiring Highlight Box */}
            <div className="my-6 p-4 sm:p-5 rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 border-l-4 border-blue-500 border-y border-r border-border/60">
              <p className="italic font-medium text-base sm:text-lg text-blue-950 dark:text-blue-100">
                &ldquo;A single unkind comment can stay with someone long after it&apos;s deleted.
                Kindness costs nothing, and it is what makes a community strong.&rdquo;
              </p>
            </div>

            <p>
              To everyone who uses DLMS respectfully, thank you. This break isn&apos;t a punishment
              for you. It&apos;s a promise that this space will be safe for you.
            </p>

            <p>
              If anything on DLMS ever upsets you, please tell a teacher or the school counsellor.
              Please also keep your passwords private.
            </p>

            {/* Streak Reassurance Callout */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3.5 my-2">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex-shrink-0">
                <Flame className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Your daily streak will be preserved and will resume on the reopening day. Don&apos;t
                worry!
              </p>
            </div>
          </div>

          {/* Letter Sign-off */}
          <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">{PAUSE_CONFIG.closing}</p>
              <p className="font-bold text-foreground text-base sm:text-lg">{PAUSE_CONFIG.author}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Campus Digital Safety Initiative</span>
            </div>
          </div>
        </div>

        {/* 4 Feature Cards (Pillars) */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Streak */}
          <div className="p-5 rounded-2xl bg-card/60 backdrop-blur-md border border-border flex items-start gap-4 hover:border-amber-500/40 transition-colors">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex-shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-foreground">Reading Streaks are Frozen</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                No active streaks will break during this pause. Everything will resume smoothly on
                reopening day.
              </p>
            </div>
          </div>

          {/* Card 2: Platform Safety */}
          <div className="p-5 rounded-2xl bg-card/60 backdrop-blur-md border border-border flex items-start gap-4 hover:border-blue-500/40 transition-colors">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-foreground">Safety Upgrades Underway</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                We are implementing improved moderation filters and student protection systems to
                keep our library safe.
              </p>
            </div>
          </div>

          {/* Card 3: School Counsellor */}
          <div className="p-5 rounded-2xl bg-card/60 backdrop-blur-md border border-border flex items-start gap-4 hover:border-rose-500/40 transition-colors">
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex-shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-foreground">Talk to a Teacher or Counsellor</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If anything upsets you or someone you know, remember that our school faculty is always
                here to support you.
              </p>
            </div>
          </div>

          {/* Card 4: Password Privacy */}
          <div className="p-5 rounded-2xl bg-card/60 backdrop-blur-md border border-border flex items-start gap-4 hover:border-indigo-500/40 transition-colors">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex-shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-foreground">Keep Passwords Confidential</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Never share your DLMS login credentials with friends or peers. Protect your account
                and identity.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md pt-2">
          <button
            onClick={() => setShowPolicy(true)}
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-card border border-border hover:bg-muted text-foreground transition-all duration-200 shadow-sm"
          >
            <FileText className="w-4 h-4 text-blue-500" />
            <span>Community Policy</span>
          </button>

          <a
            href={`mailto:${PAUSE_CONFIG.supportEmail}?subject=DLMS%20Support%20%26%20Community%20Care`}
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 shadow-lg shadow-blue-500/25"
          >
            <Mail className="w-4 h-4" />
            <span>Contact Support</span>
          </a>
        </div>

        {/* Footer Brand Strip */}
        <div className="pt-4 pb-8 flex flex-col items-center gap-2 text-center text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-foreground">
              PM SHRI Kendriya Vidyalaya AFS Sulur
            </span>
          </div>
          <p className="text-[11px] opacity-75">
            Digital Library Management System · Fostering a Safe & Inspiring Learning Community
          </p>
        </div>
      </div>
    </div>
  );
}
