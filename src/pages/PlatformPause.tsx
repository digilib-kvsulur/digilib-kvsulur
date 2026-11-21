import { useState } from "react";
import {
  Heart,
  ShieldCheck,
  Flame,
  Lock,
  Mail,
  BookOpen,
  Sparkles,
  Quote,
  FileText,
  X,
} from "lucide-react";
import { PAUSE_CONFIG } from "@/config/pauseConfig";

const PolicyModal = ({ onClose }: { onClose: () => void }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in"
    style={{ background: "hsl(var(--background) / 0.82)", backdropFilter: "blur(12px)" }}
    onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
  >
    <div
      className="relative w-full max-w-2xl max-h-[88vh] sm:max-h-[85vh] flex flex-col rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-blue-500/30"
      style={{ background: "hsl(var(--card))" }}
    >
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between gap-3 bg-muted/30">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="p-2 sm:p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex-shrink-0">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-base sm:text-lg text-foreground truncate">
              Community & Moderation Policy
            </h3>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
              PM SHRI KV Sulur Digital Library
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 sm:p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors flex-shrink-0"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-8 overflow-y-auto overscroll-contain space-y-4 sm:space-y-5 text-xs sm:text-sm leading-relaxed text-muted-foreground">
        <div>
          <h4 className="font-semibold text-foreground text-sm sm:text-base mb-1 flex items-center gap-2">
            <Heart className="w-4 h-4 text-blue-500 fill-blue-500/20 flex-shrink-0" />
            1. Respect & Kindness Above All
          </h4>
          <p>
            Treat every member of our school community with warmth and empathy. Harassment, teasing,
            bullying, hurtful comments, slurs, and sharing personal information are strictly prohibited.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-foreground text-sm sm:text-base mb-1 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            2. Report, Don't Retaliate
          </h4>
          <p>
            If someone posts something unkind or upsetting, do not retaliate. Report it immediately or
            talk to your teacher or school counsellor so our safety team can address it calmly.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-foreground text-sm sm:text-base mb-1 flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-500 flex-shrink-0" />
            3. Account Responsibility
          </h4>
          <p>
            Always protect your password. Do not share your login credentials with classmates. You are
            responsible for activity taking place under your account.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-foreground text-sm sm:text-base mb-1 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0" />
            4. Learning & Original Creative Work
          </h4>
          <p>
            DLMS is built to celebrate book reviews, creative writing, science questions, and positive
            discussions. Always respect other students' original ideas and contributions.
          </p>
        </div>

        <div className="rounded-xl sm:rounded-2xl p-3.5 sm:p-4 bg-blue-500/5 border border-blue-500/20 text-xs space-y-1">
          <p className="font-medium text-foreground">Need support or have questions?</p>
          <p className="break-all sm:break-normal">
            Reach out directly to the DLMS moderation team at{" "}
            <a href={`mailto:${PAUSE_CONFIG.supportEmail}`} className="text-blue-500 underline font-semibold">
              {PAUSE_CONFIG.supportEmail}
            </a>
            .
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3.5 sm:p-4 border-t border-border bg-muted/20 flex justify-end">
        <button
          onClick={onClose}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md shadow-blue-500/20 active:scale-95 text-center"
        >
          Understood
        </button>
      </div>
    </div>
  </div>
);

export default function PlatformPause() {
  const [showPolicy, setShowPolicy] = useState(false);

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-start sm:justify-center px-3.5 sm:px-6 py-6 sm:py-12 md:py-16 overflow-x-hidden bg-gradient-to-b from-background via-blue-950/5 to-background box-border">
      {/* Background ambient orbs */}
      <div
        className="fixed -top-40 -left-40 w-72 sm:w-[500px] h-72 sm:h-[500px] rounded-full blur-[110px] sm:blur-[130px] opacity-25 pointer-events-none"
        style={{ background: "hsl(217 91% 60%)" }}
        aria-hidden="true"
      />
      <div
        className="fixed top-1/2 -right-40 w-72 sm:w-[500px] h-72 sm:h-[500px] rounded-full blur-[120px] sm:blur-[140px] opacity-20 pointer-events-none"
        style={{ background: "hsl(262 83% 58%)" }}
        aria-hidden="true"
      />
      <div
        className="fixed -bottom-40 left-1/3 w-72 sm:w-[500px] h-72 sm:h-[500px] rounded-full blur-[110px] sm:blur-[130px] opacity-15 pointer-events-none"
        style={{ background: "hsl(199 89% 48%)" }}
        aria-hidden="true"
      />

      {showPolicy && <PolicyModal onClose={() => setShowPolicy(false)} />}

      <div className="relative z-10 w-full max-w-2xl sm:max-w-3xl flex flex-col items-center gap-5 sm:gap-8 mx-auto">
        {/* Top Header Badge & Headline */}
        <div className="flex flex-col items-center text-center gap-2.5 sm:gap-3 w-full px-1">
          {/* School Emblem / Icon */}
          <div className="relative group">
            <div className="absolute inset-0 rounded-2xl blur-lg bg-blue-500/30 group-hover:bg-blue-500/50 transition-all duration-500" />
            <div className="relative flex items-center justify-center w-13 h-13 sm:w-16 sm:h-16 rounded-2xl bg-card border border-blue-500/30 shadow-xl overflow-hidden p-2">
              <img
                src="/logos/kv-square.png"
                alt="KV Sulur"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.parentElement?.classList.add("bg-blue-600");
                }}
              />
              <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 text-blue-500 hidden group-[.fallback]:block" />
            </div>
          </div>

          {/* School Name Pill */}
          <div className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[11px] sm:text-xs font-semibold tracking-wide max-w-full">
            <Heart className="w-3.5 h-3.5 fill-blue-500/30 flex-shrink-0" />
            <span className="truncate">PM SHRI KV AFS SULUR · DIGITAL LIBRARY</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground leading-[1.2] mt-1 text-balance">
            DLMS is taking a short break <span className="inline-block animate-pulse">💙</span>
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-lg leading-relaxed px-2 text-balance">
            Our school platform is temporarily paused while we make DLMS a safer, kinder space for
            every student and teacher.
          </p>
        </div>

        {/* The Open Letter Card */}
        <div
          className="w-full rounded-2xl sm:rounded-3xl p-4 sm:p-8 md:p-10 bg-card/85 backdrop-blur-xl border border-border shadow-2xl relative overflow-hidden space-y-4 sm:space-y-6 box-border"
          style={{
            boxShadow: "0 25px 50px -12px hsl(217 91% 60% / 0.08), 0 0 0 1px hsl(var(--border))",
          }}
        >
          {/* Top Decorative Corner Glow */}
          <div className="absolute top-0 right-0 w-36 sm:w-48 h-36 sm:h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Letter Header */}
          <div className="flex items-center justify-between border-b border-border/80 pb-3.5 sm:pb-5 gap-2">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex-shrink-0">
                <Quote className="w-4 h-4 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-lg md:text-xl font-bold text-foreground leading-snug truncate">
                  A Message from Team DLMS
                </h2>
                <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                  To all students, teachers, and staff
                </p>
              </div>
            </div>
            <span className="hidden xs:inline-flex text-[11px] sm:text-xs px-2.5 sm:px-3 py-1 rounded-full bg-muted font-medium text-muted-foreground flex-shrink-0">
              Official Notice
            </span>
          </div>

          {/* Letter Body */}
          <div className="space-y-3.5 sm:space-y-4 text-xs sm:text-sm md:text-base leading-relaxed text-foreground/90 font-normal break-words">
            <p className="font-semibold text-sm sm:text-base md:text-lg text-foreground">
              {PAUSE_CONFIG.salutation}
            </p>

            <p>
              DLMS was built for all of us, to learn, share and grow together. Recently, a comment was
              posted on the platform that hurt a fellow member of our school family. This goes
              against the spirit of DLMS.
            </p>

            <p>
              Because we care about every one of you, the school has decided to pause DLMS for one
              week. It will be back in a week, and we&apos;ll use this time to make the platform safer.
            </p>

            {/* Inspiring Highlight Box */}
            <div className="my-3 sm:my-5 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 border-l-4 border-blue-500 border-y border-r border-border/60">
              <p className="italic font-medium text-xs sm:text-base md:text-lg text-blue-950 dark:text-blue-100 leading-relaxed">
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
            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start sm:items-center gap-2.5 sm:gap-3.5 my-2">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5 sm:mt-0">
                <Flame className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-amber-900 dark:text-amber-200 leading-snug">
                Your daily streak will be preserved and will resume on the reopening day. Don&apos;t
                worry!
              </p>
            </div>
          </div>

          {/* Letter Sign-off */}
          <div className="pt-3.5 sm:pt-4 border-t border-border">
            <p className="text-xs sm:text-sm text-muted-foreground">{PAUSE_CONFIG.closing}</p>
            <p className="font-bold text-foreground text-sm sm:text-base md:text-lg mt-0.5">
              {PAUSE_CONFIG.author}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 w-full max-w-md pt-1 px-1">
          <button
            onClick={() => setShowPolicy(true)}
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm bg-card border border-border hover:bg-muted text-foreground transition-all duration-200 shadow-sm active:scale-[0.98]"
          >
            <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span>Community Policy</span>
          </button>

          <a
            href={`mailto:${PAUSE_CONFIG.supportEmail}?subject=DLMS%20Support%20%26%20Community%20Care`}
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 shadow-lg shadow-blue-500/25 active:scale-[0.98]"
          >
            <Mail className="w-4 h-4 flex-shrink-0" />
            <span>Contact Support</span>
          </a>
        </div>

        {/* Footer Brand Strip */}
        <div className="pt-2 pb-6 sm:pb-8 flex flex-col items-center gap-1.5 sm:gap-2 text-center text-xs text-muted-foreground px-2">
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-center">
            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 flex-shrink-0" />
            <span className="font-semibold text-foreground text-[11px] sm:text-xs">
              PM SHRI Kendriya Vidyalaya AFS Sulur
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] opacity-75 max-w-md text-balance leading-normal">
            Digital Library Management System · Fostering a Safe & Inspiring Learning Community
          </p>
        </div>
      </div>
    </div>
  );
}
