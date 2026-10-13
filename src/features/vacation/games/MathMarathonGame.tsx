import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { VacationGameProps } from "./types";
import { triggerConfetti, triggerWinnerConfetti } from "@/lib/confetti";
import {
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Receipt,
  Timer,
} from "lucide-react";

export default function MathMarathonGame({ dayTitle, onComplete, onClose }: VacationGameProps) {
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [score, setScore] = useState(0);

  // Stage 1: Lightning Mental Math (3 rapid rounds)
  const mathRounds = [
    { question: "If a book costs ₹240 after a 20% library discount, what was its original price?", options: ["₹280", "₹300", "₹320", "₹260"], answer: 1 },
    { question: "A student reads 45 pages/hour for 40 mins. How many pages did they read?", options: ["25 pages", "30 pages", "35 pages", "28 pages"], answer: 1 },
    { question: "What is the square root of (144 × 25)?", options: ["50", "60", "70", "120"], answer: 1 },
  ];
  const [roundIdx, setRoundIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);

  const handleSelectMath = (idx: number) => {
    setSelectedOpt(idx);
    if (idx === mathRounds[roundIdx].answer) {
      setScore((s) => s + 70);
      triggerConfetti();
    }
  };

  const handleNextMath = () => {
    setSelectedOpt(null);
    if (roundIdx + 1 < mathRounds.length) {
      setRoundIdx((r) => r + 1);
    } else {
      setStage(2);
    }
  };

  // Stage 2: Real-Life Science Exhibition Budget Master
  // Budget ₹5,000. Must select 1 Display Board, 1 Experiment Kit, 1 Banner, and Refreshments without exceeding ₹5,000!
  const [selectedBoard, setSelectedBoard] = useState<{ name: string; cost: number } | null>(null);
  const [selectedKit, setSelectedKit] = useState<{ name: string; cost: number } | null>(null);
  const [selectedBanner, setSelectedBanner] = useState<{ name: string; cost: number } | null>(null);
  const [selectedSnacks, setSelectedSnacks] = useState<{ name: string; cost: number } | null>(null);
  const [budgetVerified, setBudgetVerified] = useState(false);

  const totalSpent =
    (selectedBoard?.cost || 0) +
    (selectedKit?.cost || 0) +
    (selectedBanner?.cost || 0) +
    (selectedSnacks?.cost || 0);

  const isUnderBudget = totalSpent > 0 && totalSpent <= 5000;
  const hasAllItems = Boolean(selectedBoard && selectedKit && selectedBanner && selectedSnacks);

  const handleVerifyBudget = () => {
    if (hasAllItems && isUnderBudget) {
      setBudgetVerified(true);
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
      summary: `Completed Math Marathon: 100% Mental Math Sprint Accuracy + Optimized ₹${totalSpent} School Project Budget within ₹5,000 Limit.`,
      details: {
        totalSpent,
      },
    });
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-green-600 to-emerald-600 text-white shadow-md">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-foreground">{dayTitle}</h3>
            <p className="text-xs text-muted-foreground">Real-Life Financial Maths, Speed Sprint &amp; Budget Optimization</p>
          </div>
        </div>
        <div className="text-right">
          <Badge className="bg-emerald-600 text-white font-black text-xs">
            Score: {score} / 500 XP
          </Badge>
          <p className="text-[10px] text-muted-foreground font-bold mt-0.5">Stage {stage} of 2</p>
        </div>
      </div>

      <Progress value={(stage / 2) * 100} className="h-2" />

      {/* STAGE 1: Lightning Mental Math */}
      {stage === 1 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <Timer className="h-4 w-4" /> Challenge 1: Lightning Mental Math Sprint
              </span>
              <Badge variant="outline" className="text-[10px] font-bold">210 XP</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Calculate quickly without a pencil or calculator. Select the mathematically correct answer:
            </p>
          </div>

          <div className="p-4 rounded-xl border bg-card space-y-3 shadow-sm">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Sprint Question {roundIdx + 1} of {mathRounds.length}</span>
              <Badge variant="secondary" className="text-[10px]">Speed Bonus</Badge>
            </div>
            <h4 className="text-sm font-black text-foreground">{mathRounds[roundIdx].question}</h4>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {mathRounds[roundIdx].options.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={selectedOpt !== null}
                  onClick={() => handleSelectMath(i)}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                    selectedOpt === i
                      ? i === mathRounds[roundIdx].answer
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-800 dark:text-emerald-200"
                        : "bg-rose-500/20 border-rose-500 text-rose-800"
                      : "hover:bg-muted"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            {selectedOpt !== null && (
              <div className="pt-2 flex justify-end">
                <Button onClick={handleNextMath} className="gradient-primary text-white font-bold text-xs gap-1">
                  Next Question <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STAGE 2: Real-World Exhibition Budget Master */}
      {stage === 2 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-teal-500/30 bg-teal-500/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-teal-700 dark:text-teal-300 flex items-center gap-1.5">
                <Receipt className="h-4 w-4" /> Challenge 2: Science Exhibition ₹5,000 Budget Master
              </span>
              <Badge variant="outline" className="text-[10px] font-bold">290 XP</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You are the Project Director. You have an exact budget ceiling of <strong>₹5,000</strong>. Select 1 Display Board, 1 Experiment Kit, 1 Banner, and Refreshments without going over budget!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Display Board */}
            <div className="space-y-1 p-2.5 rounded-xl border bg-card">
              <label className="text-xs font-bold">1. Display Board:</label>
              {[
                { name: "Eco-Cardboard Tri-Fold", cost: 600 },
                { name: "Acrylic Illuminated Board", cost: 1800 },
              ].map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setSelectedBoard(item)}
                  className={`w-full text-left p-2 rounded-lg border text-xs flex justify-between ${
                    selectedBoard?.name === item.name ? "border-emerald-500 bg-emerald-500/10 font-bold" : "hover:bg-muted"
                  }`}
                >
                  <span>{item.name}</span>
                  <span className="font-mono">₹{item.cost}</span>
                </button>
              ))}
            </div>

            {/* Experiment Kit */}
            <div className="space-y-1 p-2.5 rounded-xl border bg-card">
              <label className="text-xs font-bold">2. Working Science Kit:</label>
              {[
                { name: "Standard Circuit & Sensor Kit", cost: 1600 },
                { name: "Microcontroller Robotics Kit", cost: 2800 },
              ].map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setSelectedKit(item)}
                  className={`w-full text-left p-2 rounded-lg border text-xs flex justify-between ${
                    selectedKit?.name === item.name ? "border-emerald-500 bg-emerald-500/10 font-bold" : "hover:bg-muted"
                  }`}
                >
                  <span>{item.name}</span>
                  <span className="font-mono">₹{item.cost}</span>
                </button>
              ))}
            </div>

            {/* Banner */}
            <div className="space-y-1 p-2.5 rounded-xl border bg-card">
              <label className="text-xs font-bold">3. Team Poster & Banner:</label>
              {[
                { name: "Printed Flex Banner (6x3 ft)", cost: 750 },
                { name: "Recycled Cloth Fabric Banner", cost: 450 },
              ].map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setSelectedBanner(item)}
                  className={`w-full text-left p-2 rounded-lg border text-xs flex justify-between ${
                    selectedBanner?.name === item.name ? "border-emerald-500 bg-emerald-500/10 font-bold" : "hover:bg-muted"
                  }`}
                >
                  <span>{item.name}</span>
                  <span className="font-mono">₹{item.cost}</span>
                </button>
              ))}
            </div>

            {/* Refreshments */}
            <div className="space-y-1 p-2.5 rounded-xl border bg-card">
              <label className="text-xs font-bold">4. Team Snacks & Drinks:</label>
              {[
                { name: "Fresh Juice & Healthy Snacks", cost: 650 },
                { name: "Premium Catering Box", cost: 1400 },
              ].map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setSelectedSnacks(item)}
                  className={`w-full text-left p-2 rounded-lg border text-xs flex justify-between ${
                    selectedSnacks?.name === item.name ? "border-emerald-500 bg-emerald-500/10 font-bold" : "hover:bg-muted"
                  }`}
                >
                  <span>{item.name}</span>
                  <span className="font-mono">₹{item.cost}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Budget Total Bar */}
          <div className="p-3 rounded-xl bg-muted/60 border flex items-center justify-between text-xs font-bold">
            <span>Total Spent: <strong className="font-mono text-sm">₹{totalSpent}</strong></span>
            <span className={isUnderBudget ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 font-black"}>
              {totalSpent <= 5000 ? `₹${5000 - totalSpent} Under Budget ✓` : `₹${totalSpent - 5000} OVER BUDGET ❌`}
            </span>
          </div>

          <div className="pt-1">
            {!budgetVerified ? (
              <Button
                onClick={handleVerifyBudget}
                disabled={!hasAllItems || !isUnderBudget}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                Approve Project Budget Allocation
              </Button>
            ) : (
              <Button onClick={() => setStage(3)} className="w-full gradient-primary text-white font-bold text-xs gap-1.5">
                Claim Math Master Honors <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* STAGE 3: Victory */}
      {stage === 3 && (
        <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-green-600 text-white flex items-center justify-center mx-auto shadow-xl animate-bounce">
            <Sparkles className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-foreground">Math Marathon Champion! 🧮</h3>
            <p className="text-xs text-muted-foreground">
              You conquered rapid calculation sprints and delivered a perfectly balanced science budget with zero waste!
            </p>
          </div>

          <div className="inline-flex items-center gap-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-100 font-bold text-sm">
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
