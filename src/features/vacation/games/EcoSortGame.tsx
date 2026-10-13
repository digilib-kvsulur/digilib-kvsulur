import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { VacationGameProps } from "./types";
import { triggerConfetti, triggerWinnerConfetti } from "@/lib/confetti";
import {
  Leaf,
  CheckCircle2,
  AlertTriangle,
  Sun,
  Wind,
  Zap,
  BatteryCharging,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function EcoSortGame({ dayTitle, onComplete, onClose }: VacationGameProps) {
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [score, setScore] = useState(0);

  // Stage 1: Waste Classification Rush
  const wasteItems = [
    { id: 1, name: "Banana Peels & Vegetable Scraps", bin: "compost", icon: "🍌" },
    { id: 2, name: "Crushed Plastic Water Bottle", bin: "recycle", icon: "🧴" },
    { id: 3, name: "Exhausted Lithium Battery", bin: "hazardous", icon: "🔋" },
    { id: 4, name: "Torn Denim Jeans (Fabric)", bin: "upcycle", icon: "👖" },
    { id: 5, name: "Cardboard Delivery Box", bin: "recycle", icon: "📦" },
    { id: 6, name: "Broken Fluorescent Tube", bin: "hazardous", icon: "💡" },
  ];
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [sortingMistakes, setSortingMistakes] = useState(0);
  const [stage1Complete, setStage1Complete] = useState(false);

  const handleSortItem = (selectedBin: "compost" | "recycle" | "hazardous" | "upcycle") => {
    const item = wasteItems[currentItemIndex];
    if (item.bin === selectedBin) {
      setScore((s) => s + 35);
      triggerConfetti();
    } else {
      setSortingMistakes((m) => m + 1);
    }

    if (currentItemIndex + 1 < wasteItems.length) {
      setCurrentItemIndex((i) => i + 1);
    } else {
      setStage1Complete(true);
    }
  };

  // Stage 2: Renewable Micro-Grid Balancer
  // Campus needs 100 kW. Solar provides (sun * 10), Wind provides (wind * 8), Battery storage buffers the rest.
  const [solarPanels, setSolarPanels] = useState(5); // 50 kW
  const [windTurbines, setWindTurbines] = useState(4); // 32 kW
  const [batteryKwh, setBatteryKwh] = useState(18); // 18 kW = 100 kW total
  const [gridTested, setGridTested] = useState(false);

  const totalGenerated = solarPanels * 10 + windTurbines * 8 + batteryKwh;
  const isGridBalanced = totalGenerated >= 98 && totalGenerated <= 104;

  const handleTestGrid = () => {
    setGridTested(true);
    if (isGridBalanced) {
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
      summary: `Completed Eco-Innovation Challenge: 100% Waste Sorting Mastery + 100kW Zero-Carbon Renewable Campus Micro-Grid Balanced.`,
      details: {
        sortingMistakes,
        gridGeneration: totalGenerated,
      },
    });
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md">
            <Leaf className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-foreground">{dayTitle}</h3>
            <p className="text-xs text-muted-foreground">Eco-Innovation, Circular Economy &amp; Clean Energy Lab</p>
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

      {/* STAGE 1: Waste Classification Rush */}
      {stage === 1 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <Leaf className="h-4 w-4" /> Challenge 1: The Circular Economy Sorting Rush
              </span>
              <Badge variant="outline" className="text-[10px] font-bold">210 XP</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Sort each incoming municipal waste item into the appropriate stream: Compost, Recycle, Hazardous E-Waste, or Upcycle Crafts!
            </p>
          </div>

          {!stage1Complete ? (
            <div className="space-y-4">
              {/* Item Card */}
              <div className="p-6 rounded-2xl border-2 border-emerald-500/40 bg-card text-center space-y-2 shadow-sm">
                <span className="text-4xl">{wasteItems[currentItemIndex].icon}</span>
                <h4 className="text-base font-black text-foreground">{wasteItems[currentItemIndex].name}</h4>
                <p className="text-xs text-muted-foreground font-semibold">
                  Item {currentItemIndex + 1} of {wasteItems.length}
                </p>
              </div>

              {/* 4 Bins */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: "compost", name: "🍏 Organic Compost", color: "bg-lime-500/15 border-lime-500/40 text-lime-900 dark:text-lime-200" },
                  { id: "recycle", name: "♻️ Clean Recycle", color: "bg-sky-500/15 border-sky-500/40 text-sky-900 dark:text-sky-200" },
                  { id: "hazardous", name: "⚡ Hazardous / E-Waste", color: "bg-rose-500/15 border-rose-500/40 text-rose-900 dark:text-rose-200" },
                  { id: "upcycle", name: "🎨 DIY Upcycling", color: "bg-purple-500/15 border-purple-500/40 text-purple-900 dark:text-purple-200" },
                ].map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleSortItem(b.id as any)}
                    className={`p-3 rounded-xl border text-xs font-bold transition-transform active:scale-95 text-center ${b.color}`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-center space-y-2">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto" />
              <h4 className="text-sm font-black text-emerald-900 dark:text-emerald-100">All Waste Stream Items Sorted!</h4>
              <p className="text-xs text-muted-foreground">
                You prevented 100% of landfill contamination with zero toxic leakage!
              </p>
              <Button onClick={() => setStage(2)} className="gradient-primary text-white font-bold text-xs gap-1.5 mt-2">
                Proceed to Stage 2: Clean Energy Grid <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* STAGE 2: Micro-Grid Balancer */}
      {stage === 2 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-teal-500/30 bg-teal-500/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-teal-700 dark:text-teal-300 flex items-center gap-1.5">
                <Zap className="h-4 w-4" /> Challenge 2: Zero-Emission Campus Micro-Grid
              </span>
              <Badge variant="outline" className="text-[10px] font-bold">290 XP</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Our PM SHRI school campus requires exactly <strong>100 kW</strong> of power. Adjust your solar array, wind turbines, and battery reserves to supply between 98 kW and 104 kW with 0% coal dependence!
            </p>
          </div>

          <div className="space-y-3 p-4 rounded-xl border bg-card">
            {/* Solar slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="flex items-center gap-1 text-amber-600"><Sun className="h-3.5 w-3.5" /> Solar Arrays ({solarPanels * 10} kW)</span>
                <span>{solarPanels} Panels</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                value={solarPanels}
                onChange={(e) => { setSolarPanels(Number(e.target.value)); setGridTested(false); }}
                className="w-full accent-amber-500"
              />
            </div>

            {/* Wind slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="flex items-center gap-1 text-sky-600"><Wind className="h-3.5 w-3.5" /> Wind Turbines ({windTurbines * 8} kW)</span>
                <span>{windTurbines} Turbines</span>
              </div>
              <input
                type="range"
                min={0}
                max={8}
                value={windTurbines}
                onChange={(e) => { setWindTurbines(Number(e.target.value)); setGridTested(false); }}
                className="w-full accent-sky-500"
              />
            </div>

            {/* Battery slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="flex items-center gap-1 text-emerald-600"><BatteryCharging className="h-3.5 w-3.5" /> Battery Reserve Buffer ({batteryKwh} kW)</span>
                <span>{batteryKwh} kW</span>
              </div>
              <input
                type="range"
                min={0}
                max={40}
                value={batteryKwh}
                onChange={(e) => { setBatteryKwh(Number(e.target.value)); setGridTested(false); }}
                className="w-full accent-emerald-500"
              />
            </div>

            {/* Total Meter */}
            <div className="p-3 rounded-lg bg-muted/50 border flex items-center justify-between text-xs font-bold">
              <span>Total Grid Output:</span>
              <span className={`text-sm ${isGridBalanced ? "text-emerald-600 dark:text-emerald-400 font-black" : "text-amber-600"}`}>
                {totalGenerated} kW / 100 kW Target {isGridBalanced ? "✓ OPTIMAL" : "(Need ~100 kW)"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              onClick={handleTestGrid}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs gap-1.5"
            >
              <Zap className="h-3.5 w-3.5" /> Synchronize Grid Power
            </Button>

            {isGridBalanced && gridTested && (
              <Button
                onClick={() => setStage(3)}
                className="gradient-primary text-white font-bold text-xs gap-1.5"
              >
                Claim Eco Trophy! <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* STAGE 3: Victory */}
      {stage === 3 && (
        <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-600 text-white flex items-center justify-center mx-auto shadow-xl animate-bounce">
            <Sparkles className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-foreground">Eco-Innovation Champion! 🌿</h3>
            <p className="text-xs text-muted-foreground">
              You mastered circular waste recycling and powered an entire school with 100% clean solar, wind, and storage!
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
