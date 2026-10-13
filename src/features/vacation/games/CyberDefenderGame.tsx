import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { VacationGameProps } from "./types";
import { triggerConfetti, triggerWinnerConfetti } from "@/lib/confetti";
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Eye,
  KeyRound,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function CyberDefenderGame({ dayTitle, onComplete, onClose }: VacationGameProps) {
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [score, setScore] = useState(0);

  // Stage 1: Phishing Scenario Radar (3 messages to analyze)
  const scenarios = [
    {
      id: 1,
      sender: "support@google-account-verify-login.xyz",
      title: "URGENT: Your Gmail will be deleted in 24 hours!",
      body: "Click this link immediately to enter your password and avoid account loss: http://verify.xyz/login",
      isPhishing: true,
      explanation: "Fake domain (.xyz instead of google.com), false urgency, insecure HTTP link requesting credentials.",
    },
    {
      id: 2,
      sender: "no-reply@accounts.google.com",
      title: "Security alert: New sign-in on Windows",
      body: "We detected a sign-in to your Google Account from Chrome on Windows. If this was you, you don't need to do anything.",
      isPhishing: false,
      explanation: "Authentic domain (@accounts.google.com), informational only, doesn't demand passwords or urgent links.",
    },
    {
      id: 3,
      sender: "Principal@kvsulur.edu.in",
      title: "Free iPhone 16 Giveaway for Class 10 Students!",
      body: "Forward your WhatsApp OTP and UPI PIN to claim your free laptop and iPhone prize today!",
      isPhishing: true,
      explanation: "Classic giveaway scam requesting sensitive OTP / UPI PINs. Never share OTPs!",
    },
  ];
  const [currentScenario, setCurrentScenario] = useState(0);
  const [scenarioAnswered, setScenarioAnswered] = useState<boolean | null>(null);

  const handleDecision = (userFlaggedPhishing: boolean) => {
    const item = scenarios[currentScenario];
    const isCorrect = item.isPhishing === userFlaggedPhishing;
    if (isCorrect) {
      setScore((s) => s + 70);
      triggerConfetti();
    }
    setScenarioAnswered(isCorrect);
  };

  const handleNextScenario = () => {
    setScenarioAnswered(null);
    if (currentScenario + 1 < scenarios.length) {
      setCurrentScenario((c) => c + 1);
    } else {
      setStage(2);
    }
  };

  // Stage 2: Password Citadel (Entropy calculation)
  const [customPassword, setCustomPassword] = useState("");
  const hasUpper = /[A-Z]/.test(customPassword);
  const hasLower = /[a-z]/.test(customPassword);
  const hasDigit = /[0-9]/.test(customPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(customPassword);
  const isLong = customPassword.length >= 10;
  const entropyPassed = hasUpper && hasLower && hasDigit && hasSpecial && isLong;

  const handleVerifyPassword = () => {
    if (entropyPassed) {
      setScore((s) => s + 290);
      triggerWinnerConfetti(1);
      setStage(3);
    }
  };

  const handleFinish = () => {
    const finalScore = Math.max(250, score);
    const stars = finalScore >= 450 ? 3 : finalScore >= 350 ? 2 : 1;
    onComplete({
      score: finalScore,
      maxScore: 500,
      stars,
      summary: `Completed Cyber Safety & Digital Literacy Simulation: 100% Phishing Detection Accuracy + Cryptographic High-Entropy Password Forged.`,
      details: {
        scenariosPassed: scenarios.length,
      },
    });
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-foreground">{dayTitle}</h3>
            <p className="text-xs text-muted-foreground">Cyber Safety, Phishing Radar &amp; Digital Defense Lab</p>
          </div>
        </div>
        <div className="text-right">
          <Badge className="bg-blue-600 text-white font-black text-xs">
            Score: {score} / 500 XP
          </Badge>
          <p className="text-[10px] text-muted-foreground font-bold mt-0.5">Stage {stage} of 2</p>
        </div>
      </div>

      <Progress value={(stage / 2) * 100} className="h-2" />

      {/* STAGE 1: Phishing Radar */}
      {stage === 1 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                <Eye className="h-4 w-4" /> Challenge 1: The Phishing &amp; Scam Radar
              </span>
              <Badge variant="outline" className="text-[10px] font-bold">210 XP</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Examine the incoming email communication below. Is it a <strong>Cyber Scam / Phishing Attack</strong> or an <strong>Authentic Official Notice</strong>?
            </p>
          </div>

          {/* Email Preview Box */}
          <div className="p-4 rounded-xl border bg-card space-y-2 shadow-sm">
            <div className="flex items-center justify-between border-b pb-2 text-xs">
              <span className="text-muted-foreground">From: <strong className="text-foreground">{scenarios[currentScenario].sender}</strong></span>
              <Badge variant="outline" className="text-[10px]">Msg {currentScenario + 1} of {scenarios.length}</Badge>
            </div>
            <h4 className="text-sm font-black text-foreground">{scenarios[currentScenario].title}</h4>
            <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg font-mono">
              {scenarios[currentScenario].body}
            </p>

            {scenarioAnswered === null ? (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  onClick={() => handleDecision(true)}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-1.5"
                >
                  <AlertTriangle className="h-3.5 w-3.5" /> 🚨 Phishing / Scam
                </Button>
                <Button
                  onClick={() => handleDecision(false)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> ✅ Authentic / Safe
                </Button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-muted/60 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  {scenarioAnswered ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" /> Correct Analysis! +70 XP
                    </span>
                  ) : (
                    <span className="text-rose-600 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" /> Missed threat indicators!
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  <strong>Why:</strong> {scenarios[currentScenario].explanation}
                </p>
                <Button onClick={handleNextScenario} className="gradient-primary text-white font-bold text-xs gap-1">
                  Continue Radar Scan <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STAGE 2: Password Citadel */}
      {stage === 2 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-300 flex items-center gap-1.5">
                <Lock className="h-4 w-4" /> Challenge 2: Forge an Uncrackable Password Citadel
              </span>
              <Badge variant="outline" className="text-[10px] font-bold">290 XP</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Cyber criminals use automated supercomputers to crack weak passwords in seconds. Forge a resilient fortress password meeting all 5 cryptographic shields:
            </p>
          </div>

          <div className="space-y-3 p-4 rounded-xl border bg-card">
            <label className="text-xs font-bold text-foreground">Test Password Entropy:</label>
            <Input
              type="text"
              value={customPassword}
              onChange={(e) => setCustomPassword(e.target.value)}
              placeholder="Type or create a fortress password..."
              className="font-mono text-xs"
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1">
              <span className={`p-1.5 rounded border flex items-center gap-1 font-bold ${isLong ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-muted text-muted-foreground"}`}>
                {isLong ? "✓" : "○"} 10+ Characters
              </span>
              <span className={`p-1.5 rounded border flex items-center gap-1 font-bold ${hasUpper ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-muted text-muted-foreground"}`}>
                {hasUpper ? "✓" : "○"} Uppercase (A-Z)
              </span>
              <span className={`p-1.5 rounded border flex items-center gap-1 font-bold ${hasLower ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-muted text-muted-foreground"}`}>
                {hasLower ? "✓" : "○"} Lowercase (a-z)
              </span>
              <span className={`p-1.5 rounded border flex items-center gap-1 font-bold ${hasDigit ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-muted text-muted-foreground"}`}>
                {hasDigit ? "✓" : "○"} Numbers (0-9)
              </span>
              <span className={`p-1.5 rounded border flex items-center gap-1 font-bold ${hasSpecial ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-muted text-muted-foreground"}`}>
                {hasSpecial ? "✓" : "○"} Symbols (!@#$%)
              </span>
            </div>

            <div className="pt-2">
              <Button
                onClick={handleVerifyPassword}
                disabled={!entropyPassed}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs gap-1.5"
              >
                <KeyRound className="h-3.5 w-3.5" /> Lock In Citadel Password &amp; Defend!
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 3: Victory */}
      {stage === 3 && (
        <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 text-white flex items-center justify-center mx-auto shadow-xl animate-bounce">
            <Sparkles className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-foreground">Cyber Defender Certified! 🛡️</h3>
            <p className="text-xs text-muted-foreground">
              You identified all phishing and credential scams and forged a cryptographic fortress password to protect your digital presence!
            </p>
          </div>

          <div className="inline-flex items-center gap-3 p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-900 dark:text-cyan-100 font-bold text-sm">
            <span>⭐ ⭐ ⭐ 3 Stars</span>
            <span>•</span>
            <span>+{Math.max(250, score)} Vacation XP Earned!</span>
          </div>

          <div className="pt-2">
            <Button
              onClick={handleFinish}
              className="gradient-primary text-white font-black text-sm px-6 py-2 rounded-xl shadow-lg hover:scale-105 transition-transform"
            >
              Complete Challenge & Record Score →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
