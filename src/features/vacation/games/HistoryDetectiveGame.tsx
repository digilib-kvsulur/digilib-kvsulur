import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { VacationGameProps } from "./types";
import { triggerConfetti, triggerWinnerConfetti } from "@/lib/confetti";
import {
  Hourglass,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  MapPin,
  Landmark,
} from "lucide-react";

export default function HistoryDetectiveGame({ dayTitle, onComplete, onClose }: VacationGameProps) {
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [score, setScore] = useState(0);

  // Stage 1: Timeline Chronosphere (Sequence Indian History eras)
  const initialEras = [
    { id: "isro", title: "Chandrayaan-3 Lands on Moon South Pole (2023 CE)", order: 4 },
    { id: "indus", title: "Indus Valley Civilization & Harappan Urban Planning (~2500 BCE)", order: 1 },
    { id: "independence", title: "India Wins Independence & Constitution Adopted (1947 CE)", order: 3 },
    { id: "maurya", title: "Emperor Ashoka & Mauryan Edicts of Non-Violence (~260 BCE)", order: 2 },
  ];
  const [userSequence, setUserSequence] = useState<string[]>([]);
  const [sequenceChecked, setSequenceChecked] = useState(false);

  const handleAddToSequence = (id: string) => {
    if (!userSequence.includes(id)) {
      setUserSequence((s) => [...s, id]);
    }
  };

  const handleCheckSequence = () => {
    // Correct order: indus -> maurya -> independence -> isro
    const isCorrect =
      userSequence[0] === "indus" &&
      userSequence[1] === "maurya" &&
      userSequence[2] === "independence" &&
      userSequence[3] === "isro";

    if (isCorrect) {
      setScore((s) => s + 220);
      triggerConfetti();
      setSequenceChecked(true);
    } else {
      setUserSequence([]);
    }
  };

  // Stage 2: Mystery Artifact Forensic Matcher
  // Clues: "Built in 7th-8th century CE", "Shore temple sculpted from single granite boulders", "Famous UNESCO site in Tamil Nadu"
  const [artifactGuess, setArtifactGuess] = useState<number | null>(null);
  const [artifactSolved, setArtifactSolved] = useState(false);

  const handleSolveArtifact = () => {
    // Index 1: Shore Temple, Mamallapuram
    if (artifactGuess === 1) {
      setScore((s) => s + 280);
      triggerWinnerConfetti(1);
      setArtifactSolved(true);
    }
  };

  const handleFinish = () => {
    const finalScore = Math.max(250, score);
    const stars = finalScore >= 450 ? 3 : finalScore >= 350 ? 2 : 1;
    onComplete({
      score: finalScore,
      maxScore: 500,
      stars,
      summary: `Completed History Detective: Chronological Era Sequencer Mastered + Mamallapuram Monument Artifact Solved.`,
      details: {
        sequence: userSequence,
      },
    });
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-600 text-white shadow-md">
            <Hourglass className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-foreground">{dayTitle}</h3>
            <p className="text-xs text-muted-foreground">Historical Investigation, Timeline Sequencer &amp; Heritage Mystery</p>
          </div>
        </div>
        <div className="text-right">
          <Badge className="bg-amber-700 text-white font-black text-xs">
            Score: {score} / 500 XP
          </Badge>
          <p className="text-[10px] text-muted-foreground font-bold mt-0.5">Stage {stage} of 2</p>
        </div>
      </div>

      <Progress value={(stage / 2) * 100} className="h-2" />

      {/* STAGE 1: Timeline Chronosphere */}
      {stage === 1 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                <Landmark className="h-4 w-4" /> Challenge 1: The Chronosphere Era Reordering
              </span>
              <Badge variant="outline" className="text-[10px] font-bold">220 XP</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Tap the 4 pivotal historical events below in exact chronological order from <strong>Earliest in Antiquity</strong> to <strong>Most Recent Modern Era</strong>!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Options to click */}
            <div className="space-y-1.5 p-3 rounded-xl border bg-card">
              <label className="text-xs font-bold text-foreground">Available Milestones (Tap to add):</label>
              <div className="space-y-1.5">
                {initialEras.map((era) => {
                  const isAdded = userSequence.includes(era.id);
                  return (
                    <button
                      key={era.id}
                      type="button"
                      disabled={isAdded || sequenceChecked}
                      onClick={() => handleAddToSequence(era.id)}
                      className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${
                        isAdded ? "opacity-40 cursor-not-allowed bg-muted" : "hover:border-amber-500 hover:bg-amber-500/10 font-medium"
                      }`}
                    >
                      {era.title}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* User Chrono Order */}
            <div className="space-y-2 p-3 rounded-xl border bg-card flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-foreground">Your Chrono Timeline:</label>
                  {!sequenceChecked && userSequence.length > 0 && (
                    <button onClick={() => setUserSequence([])} className="text-[10px] text-destructive hover:underline font-semibold">
                      Reset
                    </button>
                  )}
                </div>
                <div className="space-y-1.5 border rounded-lg p-2 min-h-28 bg-muted/30">
                  {userSequence.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground text-center py-6">
                      Tap events on the left in order (Oldest → Newest)
                    </p>
                  ) : (
                    userSequence.map((id, idx) => {
                      const item = initialEras.find((e) => e.id === id);
                      return (
                        <div key={id} className="text-xs p-2 rounded bg-amber-500/15 border border-amber-500/30 font-bold flex items-center justify-between text-amber-900 dark:text-amber-100">
                          <span>Era #{idx + 1}: {item?.title}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {!sequenceChecked ? (
                <Button
                  onClick={handleCheckSequence}
                  disabled={userSequence.length !== 4}
                  className="bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs mt-2"
                >
                  Verify Historical Order
                </Button>
              ) : (
                <div className="pt-2">
                  <Button onClick={() => setStage(2)} className="w-full gradient-primary text-white font-bold text-xs gap-1">
                    Proceed to Mystery Artifact <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STAGE 2: Artifact Matcher */}
      {stage === 2 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-yellow-800 dark:text-yellow-200 flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> Challenge 2: The Mystery Shore Artifact
              </span>
              <Badge variant="outline" className="text-[10px] font-bold">280 XP</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Forensic archeology clue: Built during the 8th century CE Pallava dynasty, sculpted from monolith granite rocks overlooking the Bay of Bengal in Tamil Nadu. Name this UNESCO World Heritage masterpiece:
            </p>
          </div>

          <div className="space-y-2">
            {[
              { id: 0, text: "A) Sun Temple at Konark, Odisha" },
              { id: 1, text: "B) Shore Temple & Pancha Rathas at Mamallapuram (Mahabalipuram)" },
              { id: 2, text: "C) Brihadisvara Temple at Thanjavur" },
              { id: 3, text: "D) Kailasa Temple at Ellora Caves" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setArtifactGuess(opt.id)}
                className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                  artifactGuess === opt.id
                    ? "border-amber-600 bg-amber-500/15 font-bold shadow-sm"
                    : "hover:bg-muted"
                }`}
              >
                {opt.text}
              </button>
            ))}
          </div>

          <div className="pt-2">
            {!artifactSolved ? (
              <Button
                onClick={handleSolveArtifact}
                disabled={artifactGuess === null}
                className="bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs"
              >
                Submit Artifact Deduction
              </Button>
            ) : (
              <Button onClick={() => setStage(3)} className="w-full gradient-primary text-white font-bold text-xs gap-1.5">
                Claim Historian Honors <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* STAGE 3: Victory */}
      {stage === 3 && (
        <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-600 text-white flex items-center justify-center mx-auto shadow-xl animate-bounce">
            <Sparkles className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-foreground">Grand History Detective Certified! 🏛️</h3>
            <p className="text-xs text-muted-foreground">
              You sequenced civilizations with precision and solved the Tamil Nadu coastal archeology enigma!
            </p>
          </div>

          <div className="inline-flex items-center gap-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-100 font-bold text-sm">
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
