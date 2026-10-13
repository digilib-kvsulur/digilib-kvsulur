import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { VacationGameProps } from "./types";
import { triggerConfetti, triggerWinnerConfetti } from "@/lib/confetti";
import {
  KeyRound,
  CheckCircle2,
  Lock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Radio,
} from "lucide-react";

export default function CodeBreakersGame({ dayTitle, onComplete, onClose }: VacationGameProps) {
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [score, setScore] = useState(0);

  // Stage 1: Caesar Cipher Shift (+3)
  // Ciphertext: "WKH IXWXUH EHORQJV WR WKRVH ZKR UHDG"
  // Plaintext: "THE FUTURE BELONGS TO THOSE WHO READ"
  const [caesarInput, setCaesarInput] = useState("");
  const [caesarSolved, setCaesarSolved] = useState(false);

  const handleCheckCaesar = () => {
    const clean = caesarInput.trim().toUpperCase();
    if (clean === "FUTURE" || clean.includes("FUTURE") || clean.includes("THE FUTURE")) {
      setCaesarSolved(true);
      setScore((s) => s + 220);
      triggerConfetti();
    }
  };

  // Stage 2: Morse Code Vault Unlock
  // Clue: ·-· · ·- -·· -> R E A D
  const [morseInput, setMorseInput] = useState("");
  const [morseSolved, setMorseSolved] = useState(false);

  const handleCheckMorse = () => {
    const clean = morseInput.trim().toUpperCase();
    if (clean === "READ" || clean === "BOOK" || clean.length >= 3) {
      setMorseSolved(true);
      setScore((s) => s + 280);
      triggerWinnerConfetti(1);
    }
  };

  const handleFinish = () => {
    const finalScore = Math.max(250, score);
    const stars = finalScore >= 450 ? 3 : finalScore >= 350 ? 2 : 1;
    onComplete({
      score: finalScore,
      maxScore: 500,
      stars,
      summary: `Completed Mystery Code Breakers: Caesar Shift Decrypted + Cryptographic Morse Transmission Decoded + Intelligence Vault Unlocked.`,
      details: {
        caesar: caesarInput,
        morse: morseInput,
      },
    });
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-md">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-foreground">{dayTitle}</h3>
            <p className="text-xs text-muted-foreground">Logic, Cryptography &amp; Secret Code Breakers Lab</p>
          </div>
        </div>
        <div className="text-right">
          <Badge className="bg-violet-600 text-white font-black text-xs">
            Score: {score} / 500 XP
          </Badge>
          <p className="text-[10px] text-muted-foreground font-bold mt-0.5">Stage {stage} of 2</p>
        </div>
      </div>

      <Progress value={(stage / 2) * 100} className="h-2" />

      {/* STAGE 1: Caesar Shift */}
      {stage === 1 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
                <Lock className="h-4 w-4" /> Challenge 1: The Caesar Wheel Shift (+3)
              </span>
              <Badge variant="outline" className="text-[10px] font-bold">220 XP</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every letter in this scrambled transmission was shifted forward by 3 steps in the alphabet (D = A, E = B, F = C). Decode the target word:
            </p>
          </div>

          <div className="p-5 rounded-xl border bg-card space-y-3">
            <div className="p-3 bg-slate-950 text-amber-400 font-mono text-center tracking-widest text-base font-black rounded-lg">
              IXWXUH
            </div>
            <p className="text-center text-xs text-muted-foreground font-semibold">
              Shift each letter back by 3: (I-3=F, X-3=U, W-3=T...)
            </p>

            <div className="flex max-w-sm mx-auto gap-2">
              <Input
                value={caesarInput}
                onChange={(e) => setCaesarInput(e.target.value)}
                placeholder="Type decoded word (6 letters)..."
                className="font-mono text-center uppercase tracking-widest text-xs"
                disabled={caesarSolved}
              />
              {!caesarSolved ? (
                <Button onClick={handleCheckCaesar} className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shrink-0">
                  Decrypt
                </Button>
              ) : (
                <Badge className="bg-emerald-600 text-white font-bold text-xs px-3">Decrypted ✓</Badge>
              )}
            </div>

            {caesarSolved && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Correct: &lsquo;FUTURE&rsquo;! +220 XP
                </span>
                <Button onClick={() => setStage(2)} className="gradient-primary text-white font-bold text-xs gap-1">
                  Proceed to Morse Vault <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STAGE 2: Morse Code Signal */}
      {stage === 2 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                <Radio className="h-4 w-4" /> Challenge 2: Deep Signal Morse Translation
              </span>
              <Badge variant="outline" className="text-[10px] font-bold">280 XP</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Our radio antenna picked up this pulsed transmission. Use the cipher chart to translate the 4-letter library word:
            </p>
          </div>

          <div className="p-4 rounded-xl border bg-card space-y-3">
            <div className="p-3 bg-slate-950 text-emerald-400 font-mono text-center tracking-widest text-lg font-black rounded-lg">
              · - · &nbsp;&nbsp; · &nbsp;&nbsp; · - &nbsp;&nbsp; - · ·
            </div>

            <div className="p-2.5 rounded-lg bg-muted/50 border text-[11px] font-mono grid grid-cols-4 gap-2 text-center text-muted-foreground">
              <span>· - · = R</span>
              <span>· = E</span>
              <span>· - = A</span>
              <span>- · · = D</span>
            </div>

            <div className="flex max-w-sm mx-auto gap-2">
              <Input
                value={morseInput}
                onChange={(e) => setMorseInput(e.target.value)}
                placeholder="Type translated word (4 letters)..."
                className="font-mono text-center uppercase tracking-widest text-xs"
                disabled={morseSolved}
              />
              {!morseSolved ? (
                <Button onClick={handleCheckMorse} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0">
                  Transmit
                </Button>
              ) : (
                <Badge className="bg-emerald-600 text-white font-bold text-xs px-3">Unlocked ✓</Badge>
              )}
            </div>

            {morseSolved && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Correct: &lsquo;READ&rsquo;! Secret Vault Unlocked!
                </span>
                <Button onClick={() => setStage(3)} className="gradient-primary text-white font-bold text-xs gap-1">
                  Claim Master Honors <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STAGE 3: Victory */}
      {stage === 3 && (
        <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-violet-500 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-xl animate-bounce">
            <Sparkles className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-foreground">Master Code Breaker Certified! 🕵️</h3>
            <p className="text-xs text-muted-foreground">
              You cracked classical Caesar shifts and decoded pulsed radio Morse ciphers with cryptographic perfection!
            </p>
          </div>

          <div className="inline-flex items-center gap-3 p-3 rounded-2xl bg-violet-500/10 border border-violet-500/30 text-violet-900 dark:text-violet-100 font-bold text-sm">
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
