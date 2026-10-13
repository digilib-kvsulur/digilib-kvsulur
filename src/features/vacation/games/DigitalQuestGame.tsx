import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { VacationGameProps } from "./types";
import { triggerConfetti, triggerWinnerConfetti } from "@/lib/confetti";
import {
  Compass,
  CheckCircle2,
  Key,
  Search,
  Sparkles,
  ArrowRight,
  QrCode,
  Terminal,
  FileSearch,
} from "lucide-react";

export default function DigitalQuestGame({ dayTitle, onComplete, onClose }: VacationGameProps) {
  const [stage, setStage] = useState<1 | 2 | 3 | 4>(1);
  const [score, setScore] = useState(0);

  // Stage 1: Geolocation Coordinate Decode
  const [coordGuess, setCoordGuess] = useState("");
  const [coordSolved, setCoordSolved] = useState(false);
  const [coordError, setCoordError] = useState(false);

  // Stage 2: Web Detective Archive Riddle
  const [archiveAnswer, setArchiveAnswer] = useState<number | null>(null);
  const [archiveSolved, setArchiveSolved] = useState(false);

  // Stage 3: Master Terminal Key
  const [terminalKey, setTerminalKey] = useState("");
  const [terminalBreached, setTerminalBreached] = useState(false);

  // Clue 1 check: Answer is "SULUR" or "11.0" or "KONGU" or "COIMBATORE"
  const handleSolveCoords = () => {
    const clean = coordGuess.trim().toUpperCase();
    if (clean === "SULUR" || clean === "COIMBATORE" || clean === "KV SULUR" || clean.includes("SULUR")) {
      setCoordSolved(true);
      setCoordError(false);
      setScore((s) => s + 150);
      triggerConfetti();
    } else {
      setCoordError(true);
    }
  };

  // Clue 2: What was the world's first search engine created in 1990 at McGill University?
  // Answer: Archie (index 1)
  const handleSolveArchive = () => {
    if (archiveAnswer === 1) {
      setArchiveSolved(true);
      setScore((s) => s + 170);
      triggerConfetti();
    }
  };

  // Clue 3: Master Key is "KNOWLEDGE" or "DIGILIB" or "LIBRARY"
  const handleSolveTerminal = () => {
    const clean = terminalKey.trim().toUpperCase();
    if (clean === "KNOWLEDGE" || clean === "DIGILIB" || clean === "LIBRARY" || clean === "INNOVATE" || clean.length >= 4) {
      setTerminalBreached(true);
      setScore((s) => s + 180);
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
      summary: `Completed Digital Treasure Quest: Geolocation Clue Decoded + Web History Archive Mastered + Cyber Terminal Portal Unlocked.`,
      details: {
        location: coordGuess,
        terminalKey,
      },
    });
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-md">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-foreground">{dayTitle}</h3>
            <p className="text-xs text-muted-foreground">Digital Treasure Hunt & Information Literacy Quest</p>
          </div>
        </div>
        <div className="text-right">
          <Badge className="bg-sky-600 text-white font-black text-xs">
            Score: {score} / 500 XP
          </Badge>
          <p className="text-[10px] text-muted-foreground font-bold mt-0.5">Stage {stage} of 3</p>
        </div>
      </div>

      <Progress value={(stage / 3) * 100} className="h-2" />

      {/* STAGE 1: Geolocation Coordinate Clue */}
      {stage === 1 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                <QrCode className="h-4 w-4" /> Quest 1: The Encrypted Geolocation Coordinate
              </span>
              <Badge variant="outline" className="text-[10px] font-bold">150 XP</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Our autonomous library satellite intercepted this encrypted mission coordinate:
            </p>
            <div className="p-3 bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl border space-y-1">
              <p>&gt; LAT: 11.0267° N | LONG: 77.1264° E</p>
              <p>&gt; CLUE: Famous Air Force Station base &amp; PM SHRI Kendriya Vidyalaya campus nestled in Coimbatore district.</p>
              <p>&gt; MISSION: Decode the 5-letter township name!</p>
            </div>
          </div>

          <div className="space-y-2 p-3 rounded-xl border bg-card">
            <label className="text-xs font-bold text-foreground">Enter the Decrypted Township Name:</label>
            <div className="flex gap-2">
              <Input
                value={coordGuess}
                onChange={(e) => setCoordGuess(e.target.value)}
                placeholder="Type location name (Hint: S_L_R)..."
                className="font-mono text-xs uppercase"
                disabled={coordSolved}
              />
              {!coordSolved ? (
                <Button onClick={handleSolveCoords} className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shrink-0">
                  Verify Clue
                </Button>
              ) : (
                <Badge className="bg-emerald-600 text-white font-bold text-xs px-3">Unlocked ✓</Badge>
              )}
            </div>
            {coordError && (
              <p className="text-[11px] text-destructive font-semibold">
                Incorrect coordinate! Hint: Look at our school name: KV S _ _ _ R!
              </p>
            )}
            {coordSolved && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Correct! Base coordinates verified: SULUR.
                </span>
                <Button onClick={() => setStage(2)} className="gradient-primary text-white font-bold text-xs gap-1.5">
                  Proceed to Quest 2 <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STAGE 2: Web Detective Archive */}
      {stage === 2 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                <FileSearch className="h-4 w-4" /> Quest 2: Internet History Detective
              </span>
              <Badge variant="outline" className="text-[10px] font-bold">170 XP</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Before Google (1998) and Yahoo (1994), what was the world&apos;s very first Internet search engine created in 1990 by computer science students at McGill University?
            </p>
          </div>

          <div className="space-y-2">
            {[
              { id: 0, text: "A) AltaVista — The web index crawler" },
              { id: 1, text: "B) Archie — The FTP file archive searcher" },
              { id: 2, text: "C) AskJeeves — The natural question engine" },
              { id: 3, text: "D) Mosaic — The early graphical web explorer" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setArchiveAnswer(opt.id)}
                className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                  archiveAnswer === opt.id
                    ? "border-indigo-500 bg-indigo-500/15 font-bold shadow-sm"
                    : "hover:bg-muted"
                }`}
              >
                {opt.text}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            {!archiveSolved ? (
              <Button
                onClick={handleSolveArchive}
                disabled={archiveAnswer === null}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
              >
                Submit Clue Solution
              </Button>
            ) : (
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Solved! &apos;Archie&apos; indexed FTP files in 1990.
                </span>
                <Button onClick={() => setStage(3)} className="gradient-primary text-white font-bold text-xs gap-1.5">
                  Proceed to Final Portal <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STAGE 3: Master Terminal Breach */}
      {stage === 3 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                <Terminal className="h-4 w-4" /> Quest 3: The Golden Digital Key
              </span>
              <Badge variant="outline" className="text-[10px] font-bold">180 XP</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Final barrier! Enter the treasure vault passphrase. The secret word that unlocks all digital learning and power:
            </p>
            <div className="p-3 bg-slate-950 text-amber-400 font-mono text-xs rounded-xl border">
              <p>&quot;I am not gold, nor diamonds bright, but open doors with radiant light. In libraries kept, on screens displayed, by curious minds I am remade.&quot;</p>
              <p className="text-[10px] text-slate-400 mt-1">Hint: K _ _ _ L _ _ _ E (or &apos;LIBRARY&apos; / &apos;DIGILIB&apos;)</p>
            </div>
          </div>

          <div className="space-y-2 p-3 rounded-xl border bg-card">
            <label className="text-xs font-bold text-foreground">Enter Passphrase to Open Vault:</label>
            <div className="flex gap-2">
              <Input
                value={terminalKey}
                onChange={(e) => setTerminalKey(e.target.value)}
                placeholder="Enter passphrase (e.g. KNOWLEDGE)..."
                className="font-mono text-xs uppercase"
                disabled={terminalBreached}
              />
              {!terminalBreached ? (
                <Button onClick={handleSolveTerminal} className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shrink-0">
                  Unlock Vault
                </Button>
              ) : (
                <Badge className="bg-emerald-600 text-white font-bold text-xs px-3">Breached ✓</Badge>
              )}
            </div>

            {terminalBreached && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Vault Unlocked! Treasure claimed!
                </span>
                <Button onClick={() => setStage(4)} className="gradient-primary text-white font-bold text-xs gap-1.5">
                  Claim Victory! <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STAGE 4: Victory */}
      {stage === 4 && (
        <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-xl animate-bounce">
            <Key className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-foreground">Digital Quest Conquered! 🏆</h3>
            <p className="text-xs text-muted-foreground">
              You navigated satellite coordinates, solved internet history archives, and decrypted the secret knowledge portal!
            </p>
          </div>

          <div className="inline-flex items-center gap-3 p-3 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-900 dark:text-sky-100 font-bold text-sm">
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
