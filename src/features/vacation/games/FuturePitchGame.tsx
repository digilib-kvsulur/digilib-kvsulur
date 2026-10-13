import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { VacationGameProps } from "./types";
import { triggerConfetti, triggerWinnerConfetti } from "@/lib/confetti";
import {
  Rocket,
  CheckCircle2,
  Trophy,
  Sparkles,
  ArrowRight,
  Lightbulb,
  Cpu,
  Tv,
} from "lucide-react";

export default function FuturePitchGame({ dayTitle, onComplete, onClose }: VacationGameProps) {
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [score, setScore] = useState(0);

  // Stage 1: Problem Selection
  const [selectedProblem, setSelectedProblem] = useState<{ id: string; name: string; icon: string } | null>(null);

  const problems = [
    { id: "clean_water", name: "Potable Clean Water for Rural Schools", icon: "💧" },
    { id: "food_waste", name: "Zero Food Waste via Smart Surplus Sharing", icon: "🥗" },
    { id: "clean_energy", name: "Affordable Solar Power for Study Lamp Kiosks", icon: "☀️" },
    { id: "digital_divide", name: "Offline Digital Library Hubs in Remote Villages", icon: "📚" },
  ];

  // Stage 2: Tech Blueprint
  const [techComponents, setTechComponents] = useState<string[]>([]);
  const availableTech = [
    "AI Vision Sensors",
    "Recycled Bio-Polymers",
    "Solar Micro-Inverter",
    "Low-Power LoRa Mesh Network",
    "Autonomous Drone Delivery",
  ];

  const handleToggleTech = (tech: string) => {
    if (techComponents.includes(tech)) {
      setTechComponents(techComponents.filter((t) => t !== tech));
    } else if (techComponents.length < 2) {
      setTechComponents([...techComponents, tech]);
    }
  };

  // Stage 3: The Grand Finale Pitch
  const [pitching, setPitching] = useState(false);
  const [pitchScore, setPitchScore] = useState<number | null>(null);

  const handlePitchToJudges = () => {
    setPitching(true);
    setTimeout(() => {
      setPitching(false);
      setPitchScore(98);
      setScore(500);
      triggerWinnerConfetti(1);
    }, 1200);
  };

  const handleFinish = () => {
    onComplete({
      score: 500,
      maxScore: 500,
      stars: 3,
      summary: `Grand Finale Future Makers Pitch: Engineered '${selectedProblem?.name}' powered by ${techComponents.join(" + ")}. Achieved 98% Unanimous Investor Approval!`,
      details: {
        problem: selectedProblem?.name,
        tech: techComponents,
      },
    });
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 text-white shadow-md">
            <Rocket className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-foreground">{dayTitle}</h3>
            <p className="text-xs text-muted-foreground">Day 10 Grand Finale • Future Makers &amp; Innovation Pitch</p>
          </div>
        </div>
        <div className="text-right">
          <Badge className="bg-amber-600 text-white font-black text-xs">
            Grand Finale: 500 XP
          </Badge>
          <p className="text-[10px] text-muted-foreground font-bold mt-0.5">Stage {stage} of 3</p>
        </div>
      </div>

      <Progress value={(stage / 3) * 100} className="h-2" />

      {/* STAGE 1: Problem Selection */}
      {stage === 1 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                <Lightbulb className="h-4 w-4" /> Grand Finale Step 1: Select the Real-World Mission
              </span>
              <Badge variant="outline" className="text-[10px] font-bold">Invention Lab</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Future makers build solutions for real human challenges. Select the pressing problem your breakthrough will solve:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {problems.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedProblem(p)}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 ${
                  selectedProblem?.id === p.id
                    ? "border-amber-500 bg-amber-500/15 shadow-sm ring-2 ring-amber-500/40 font-bold"
                    : "hover:bg-muted"
                }`}
              >
                <span className="text-2xl">{p.icon}</span>
                <span className="text-xs text-foreground leading-tight">{p.name}</span>
              </button>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => setStage(2)}
              disabled={!selectedProblem}
              className="gradient-primary text-white font-bold text-xs gap-1.5"
            >
              Configure Tech Blueprint <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* STAGE 2: Tech Blueprint */}
      {stage === 2 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                <Cpu className="h-4 w-4" /> Grand Finale Step 2: Assemble Breakthrough Blueprint
              </span>
              <Badge variant="outline" className="text-[10px] font-bold">2 Tech Max</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Select <strong>2 high-tech components</strong> to build into your &lsquo;{selectedProblem?.name}&rsquo; prototype:
            </p>
          </div>

          <div className="space-y-2">
            {availableTech.map((tech) => {
              const isSelected = techComponents.includes(tech);
              return (
                <button
                  key={tech}
                  type="button"
                  onClick={() => handleToggleTech(tech)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between ${
                    isSelected ? "border-rose-500 bg-rose-500/15 font-bold shadow-sm" : "hover:bg-muted"
                  }`}
                >
                  <span>{tech}</span>
                  <span>{isSelected ? "Selected ✓" : "+ Add"}</span>
                </button>
              );
            })}
          </div>

          <div className="flex justify-between items-center pt-2">
            <Button variant="ghost" size="sm" onClick={() => setStage(1)} className="text-xs text-muted-foreground">
              ← Back
            </Button>
            <Button
              onClick={() => setStage(3)}
              disabled={techComponents.length < 2}
              className="gradient-primary text-white font-bold text-xs gap-1.5"
            >
              Enter Shark Tank Finale <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* STAGE 3: Shark Tank Finale Pitch */}
      {stage === 3 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                <Tv className="h-4 w-4" /> Grand Finale Step 3: 60-Second Investor Judging Panel
              </span>
              <Badge className="bg-amber-600 text-white font-black text-[10px]">Grand Finale</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Present your prototype &lsquo;<strong>{selectedProblem?.name}</strong>&rsquo; powered by <strong>{techComponents.join(" + ")}</strong> to our investor judges!
            </p>
          </div>

          <div className="p-5 rounded-2xl border bg-card text-center space-y-3">
            <span className="text-3xl">🚀</span>
            <h4 className="text-base font-black text-foreground">{selectedProblem?.name}</h4>
            <div className="flex justify-center gap-2">
              {techComponents.map((t) => (
                <Badge key={t} variant="secondary" className="text-xs font-bold">{t}</Badge>
              ))}
            </div>

            {pitchScore === null ? (
              <div className="pt-2">
                <Button
                  onClick={handlePitchToJudges}
                  disabled={pitching}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs px-6 py-2 shadow-lg"
                >
                  {pitching ? "Evaluating with Investor Panel..." : "🎙️ Pitch to Shark Tank Judges Now!"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="inline-flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 font-bold text-xs">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  <span>Unanimous 98% Investment Approval! +500 Grand Finale Points Awarded!</span>
                </div>
                <div>
                  <Button onClick={handleFinish} className="gradient-primary text-white font-black text-sm px-6 py-2 rounded-xl shadow-lg hover:scale-105 transition-transform">
                    Claim Grand Finale Mastermind Trophy 🏆
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
