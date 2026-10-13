import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { VacationGameProps } from "./types";
import { triggerConfetti, triggerWinnerConfetti } from "@/lib/confetti";
import {
  Mic,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Flame,
  Volume2,
  Tv,
} from "lucide-react";

export default function SpeechSparkGame({ dayTitle, onComplete, onClose }: VacationGameProps) {
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [score, setScore] = useState(0);

  // Stage 1: Word Velocity Unscramble
  const words = [
    { scrambled: "R O T A E L Q U", answer: "ELOQUENT", hint: "Fluent or persuasive in speaking or writing." },
    { scrambled: "C T I O N V I N O C", answer: "CONVICTION", hint: "A firmly held belief or opinion with confidence." },
    { scrambled: "R I C H A S M A", answer: "CHARISMA", hint: "Compelling attractiveness or charm that inspires devotion." },
  ];
  const [wordIndex, setWordIndex] = useState(0);
  const [wordGuess, setWordGuess] = useState("");
  const [wordSolved, setWordSolved] = useState(false);

  const handleCheckWord = (targetWord: string) => {
    if (wordGuess.trim().toUpperCase() === targetWord) {
      setScore((s) => s + 70);
      triggerConfetti();
      setWordSolved(true);
    }
  };

  const handleNextWord = () => {
    setWordGuess("");
    setWordSolved(false);
    if (wordIndex + 1 < words.length) {
      setWordIndex((i) => i + 1);
    } else {
      setStage(2);
    }
  };

  // Stage 2: Shark Tank Elevator Pitch Architect
  const [selectedHook, setSelectedHook] = useState<string>("");
  const [selectedSolution, setSelectedSolution] = useState<string>("");
  const [selectedCallToAction, setSelectedCallToAction] = useState<string>("");
  const [pitchDelivered, setPitchDelivered] = useState(false);

  const hooks = [
    "Did you know 65% of students struggle to find time for independent reading?",
    "Imagine a school library where AI recommends the exact book that sparks your curiosity in 3 seconds.",
    "Every year, thousands of students lose their reading habit simply because books aren't personalized.",
  ];

  const solutions = [
    "Our student-led DLMS peer reading network turns book reviews into friendly school competitions and level-ups.",
    "We built a smart solar-powered audio-reading kiosk that brings stories to every playground and classroom.",
    "A gamified reading companion app that awards XP, badges, and real privileges for every completed chapter.",
  ];

  const callsToAction = [
    "Join our reading revolution and empower 1,000 students to become lifelong thinkers!",
    "Support our digital reading guild and let's make our school the smartest library in India!",
    "Together, let's turn every page into an adventure that unlocks world-class leadership!",
  ];

  const handleDeliverPitch = () => {
    if (selectedHook && selectedSolution && selectedCallToAction) {
      setPitchDelivered(true);
      setScore((s) => s + 290);
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
      summary: `Completed Functional English & Communication Show: Advanced Vocabulary Velocity + 60-Second Shark Tank Elevator Pitch Delivered with High Conviction.`,
      details: {
        hook: selectedHook,
        solution: selectedSolution,
      },
    });
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-600 text-white shadow-md">
            <Mic className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-foreground">{dayTitle}</h3>
            <p className="text-xs text-muted-foreground">Public Speaking, Shark Tank Pitch &amp; Communication Mastery</p>
          </div>
        </div>
        <div className="text-right">
          <Badge className="bg-rose-600 text-white font-black text-xs">
            Score: {score} / 500 XP
          </Badge>
          <p className="text-[10px] text-muted-foreground font-bold mt-0.5">Stage {stage} of 2</p>
        </div>
      </div>

      <Progress value={(stage / 2) * 100} className="h-2" />

      {/* STAGE 1: Vocabulary Velocity */}
      {stage === 1 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                <Volume2 className="h-4 w-4" /> Challenge 1: Orator Vocabulary Velocity
              </span>
              <Badge variant="outline" className="text-[10px] font-bold">210 XP</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Great speakers possess a commanding vocabulary. Unscramble the powerful speech keyword:
            </p>
          </div>

          <div className="p-6 rounded-2xl border bg-card text-center space-y-3 shadow-sm">
            <Badge variant="outline" className="text-xs font-mono tracking-widest text-primary font-black py-1 px-3">
              {words[wordIndex].scrambled}
            </Badge>
            <p className="text-xs text-muted-foreground italic">&ldquo;{words[wordIndex].hint}&rdquo;</p>

            <div className="flex max-w-sm mx-auto gap-2">
              <input
                type="text"
                value={wordGuess}
                onChange={(e) => setWordGuess(e.target.value)}
                placeholder="Type unscrambled word..."
                className="w-full text-center font-black tracking-wider uppercase border rounded-xl px-3 py-2 text-sm bg-background"
                disabled={wordSolved}
              />
              {!wordSolved ? (
                <Button onClick={() => handleCheckWord(words[wordIndex].answer)} className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs">
                  Verify
                </Button>
              ) : (
                <Button onClick={handleNextWord} className="gradient-primary text-white font-bold text-xs gap-1">
                  Next <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {wordSolved && (
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> Correct word: {words[wordIndex].answer}! +70 XP
              </p>
            )}
          </div>
        </div>
      )}

      {/* STAGE 2: Shark Tank Elevator Pitch */}
      {stage === 2 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                <Tv className="h-4 w-4" /> Challenge 2: The 60-Second Shark Tank Pitch
              </span>
              <Badge variant="outline" className="text-[10px] font-bold">290 XP</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Construct a compelling, persuasive 60-second product pitch. Select your Attention Hook, Breakthrough Solution, and Call to Action!
            </p>
          </div>

          <div className="space-y-3">
            {/* Step 1: Hook */}
            <div className="space-y-1.5 p-3 rounded-xl border bg-card">
              <label className="text-xs font-bold text-foreground">1. Select Powerful Opening Hook:</label>
              <div className="space-y-1">
                {hooks.map((h, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedHook(h)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${
                      selectedHook === h ? "border-amber-500 bg-amber-500/10 font-bold" : "hover:bg-muted"
                    }`}
                  >
                    &ldquo;{h}&rdquo;
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Solution */}
            <div className="space-y-1.5 p-3 rounded-xl border bg-card">
              <label className="text-xs font-bold text-foreground">2. Select Your Breakthrough Solution:</label>
              <div className="space-y-1">
                {solutions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedSolution(s)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${
                      selectedSolution === s ? "border-amber-500 bg-amber-500/10 font-bold" : "hover:bg-muted"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Call to Action */}
            <div className="space-y-1.5 p-3 rounded-xl border bg-card">
              <label className="text-xs font-bold text-foreground">3. Select Your Resounding Call to Action:</label>
              <div className="space-y-1">
                {callsToAction.map((cta, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedCallToAction(cta)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${
                      selectedCallToAction === cta ? "border-amber-500 bg-amber-500/10 font-bold" : "hover:bg-muted"
                    }`}
                  >
                    &ldquo;{cta}&rdquo;
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2">
            {!pitchDelivered ? (
              <Button
                onClick={handleDeliverPitch}
                disabled={!selectedHook || !selectedSolution || !selectedCallToAction}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5"
              >
                <Flame className="h-3.5 w-3.5" /> Deliver Pitch to Shark Tank Judges!
              </Button>
            ) : (
              <Button onClick={() => setStage(3)} className="w-full gradient-primary text-white font-bold text-xs gap-1.5">
                View Judges Scorecard <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* STAGE 3: Victory */}
      {stage === 3 && (
        <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center mx-auto shadow-xl animate-bounce">
            <Sparkles className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-foreground">Master Communicator Certified! 🎙️</h3>
            <p className="text-xs text-muted-foreground">
              Judges gave your 60-second pitch a unanimous standing ovation for clarity, persuasiveness, and executive presence!
            </p>
          </div>

          <div className="inline-flex items-center gap-3 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-100 font-bold text-sm">
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
