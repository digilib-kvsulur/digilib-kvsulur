import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { VacationGameProps } from "./types";
import { triggerConfetti, triggerWinnerConfetti } from "@/lib/confetti";
import {
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Droplets,
  Layers,
  Activity,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export default function SteamPhysicsGame({ dayTitle, onComplete, onClose }: VacationGameProps) {
  const [stage, setStage] = useState<1 | 2 | 3 | 4>(1); // 1: Bridge, 2: Water Filter, 3: Science Theory, 4: Victory
  const [score, setScore] = useState(0);

  // Stage 1: Bridge Engineering
  const [beamMaterial, setBeamMaterial] = useState<"bamboo" | "steel" | "titanium">("steel");
  const [trussType, setTrussType] = useState<"warren" | "pratt" | "simple">("pratt");
  const [testingBridge, setTestingBridge] = useState(false);
  const [bridgeResult, setBridgeResult] = useState<null | { success: boolean; loadTested: number; deflection: string }>(null);

  // Stage 2: Water Filter Lab
  const availableLayers = ["Activated Charcoal", "Fine Silica Sand", "Coarse Gravel", "Microfiber Filter Fabric"];
  const [selectedLayers, setSelectedLayers] = useState<string[]>([]);
  const [filterTested, setFilterTested] = useState(false);
  const [purityScore, setPurityScore] = useState(0);

  // Stage 3: Science Theory Round
  const [selectedTheoryAnswer, setSelectedTheoryAnswer] = useState<number | null>(null);
  const [theorySubmitted, setTheorySubmitted] = useState(false);

  // Handle Bridge Test
  const handleTestBridge = () => {
    setTestingBridge(true);
    setTimeout(() => {
      setTestingBridge(false);
      let success = false;
      let loadTested = 45;
      let deflection = "3.2 mm";

      if (beamMaterial === "titanium" || (beamMaterial === "steel" && (trussType === "pratt" || trussType === "warren"))) {
        success = true;
        loadTested = beamMaterial === "titanium" ? 95 : 75;
        deflection = beamMaterial === "titanium" ? "0.8 mm" : "1.8 mm";
      }

      setBridgeResult({ success, loadTested, deflection });
      if (success) {
        setScore((prev) => prev + 150);
        triggerConfetti();
      }
    }, 1200);
  };

  // Handle Water Filter Test
  const handleTestFilter = () => {
    // Ideal order: Coarse Gravel -> Fine Silica Sand -> Activated Charcoal -> Microfiber Filter Fabric
    // Or reversed depending on flow
    setFilterTested(true);
    let purity = 30;
    if (selectedLayers.includes("Coarse Gravel")) purity += 20;
    if (selectedLayers.includes("Fine Silica Sand")) purity += 20;
    if (selectedLayers.includes("Activated Charcoal")) purity += 20;
    if (selectedLayers.includes("Microfiber Filter Fabric")) purity += 15;

    // bonus for 4 layers
    if (selectedLayers.length === 4) purity = 98;

    setPurityScore(purity);
    if (purity >= 70) {
      setScore((prev) => prev + 170);
      triggerConfetti();
    }
  };

  // Handle Theory Question
  const handleTheorySubmit = () => {
    setTheorySubmitted(true);
    // Question: In triangle trusses, why are triangles used instead of squares?
    // Answer index 1: Triangles cannot deform without altering their side lengths (rigid geometry).
    if (selectedTheoryAnswer === 1) {
      setScore((prev) => prev + 180);
      triggerWinnerConfetti(1);
    }
  };

  const handleFinishAll = () => {
    const finalScore = Math.max(250, score);
    const stars = finalScore >= 450 ? 3 : finalScore >= 350 ? 2 : 1;
    onComplete({
      score: finalScore,
      maxScore: 500,
      stars,
      summary: `Completed STEAM Engineering Simulator: Bridge Deflection (${bridgeResult?.loadTested || 75}T Load) + Water Purity (${purityScore || 98}%) + Structural Physics Theory.`,
      details: {
        bridge: bridgeResult,
        waterPurity: purityScore,
        material: beamMaterial,
      },
    });
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-foreground">{dayTitle}</h3>
            <p className="text-xs text-muted-foreground">Physics, Structural Engineering & Innovation Lab</p>
          </div>
        </div>
        <div className="text-right">
          <Badge className="bg-amber-600 text-white font-black text-xs">
            Score: {score} / 500 XP
          </Badge>
          <p className="text-[10px] text-muted-foreground font-bold mt-0.5">Stage {stage} of 3</p>
        </div>
      </div>

      <Progress value={(stage / 3) * 100} className="h-2" />

      {/* STAGE 1: Bridge Structural Lab */}
      {stage === 1 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                <Activity className="h-4 w-4" /> Challenge 1: The Heavy Rail Bridge
              </span>
              <Badge variant="outline" className="text-[10px] font-bold">150 XP</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Design a bridge over the canyon that can carry a <strong>75-Ton freight train</strong>. Choose the optimal truss geometry and material to minimize deflection and avoid structural failure!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Material Selector */}
            <div className="space-y-1.5 p-3 rounded-xl border bg-card">
              <label className="text-xs font-bold text-foreground">Select Structural Material:</label>
              <div className="space-y-1.5">
                {[
                  { id: "bamboo", name: "Treated Bamboo (Eco-Low Weight)", cost: "₹₹", strength: "Low (Holds 35T)" },
                  { id: "steel", name: "Structural Carbon Steel", cost: "₹₹₹", strength: "High (Holds 75T)" },
                  { id: "titanium", name: "Titanium Alloy Truss", cost: "₹₹₹₹", strength: "Ultra (Holds 95T)" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => { setBeamMaterial(m.id as any); setBridgeResult(null); }}
                    className={`w-full text-left p-2 rounded-lg border text-xs transition-all flex items-center justify-between ${
                      beamMaterial === m.id ? "border-amber-500 bg-amber-500/10 font-bold" : "hover:bg-muted"
                    }`}
                  >
                    <span>{m.name}</span>
                    <span className="text-[10px] text-muted-foreground">{m.strength}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Truss Pattern */}
            <div className="space-y-1.5 p-3 rounded-xl border bg-card">
              <label className="text-xs font-bold text-foreground">Truss Geometry Configuration:</label>
              <div className="space-y-1.5">
                {[
                  { id: "simple", name: "Simple Beam (No Bracing)", efficiency: "Weak Triangle Support" },
                  { id: "pratt", name: "Pratt Truss (Vertical Compression)", efficiency: "Heavy Freight Standard" },
                  { id: "warren", name: "Warren Truss (Equilateral Triangles)", efficiency: "Optimal Load Dissipation" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => { setTrussType(t.id as any); setBridgeResult(null); }}
                    className={`w-full text-left p-2 rounded-lg border text-xs transition-all flex items-center justify-between ${
                      trussType === t.id ? "border-amber-500 bg-amber-500/10 font-bold" : "hover:bg-muted"
                    }`}
                  >
                    <span>{t.name}</span>
                    <span className="text-[10px] text-muted-foreground">{t.efficiency}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bridge Visual Simulation Canvas */}
          <div className="h-32 rounded-xl border-2 border-dashed bg-slate-950 flex flex-col items-center justify-center p-3 text-white relative overflow-hidden">
            <div className="absolute inset-x-0 bottom-4 h-1 bg-amber-500/40" />
            <div className="flex items-center gap-1 z-10">
              <span className="text-xs font-mono text-amber-400">
                [Material: {beamMaterial.toUpperCase()} • Geometry: {trussType.toUpperCase()} TRUSS]
              </span>
            </div>
            {testingBridge ? (
              <div className="flex items-center gap-2 mt-2 text-amber-300 animate-pulse font-mono text-xs">
                <Activity className="h-4 w-4 animate-spin" /> Stress testing against 75-Ton freight train...
              </div>
            ) : bridgeResult ? (
              <div className="mt-2 flex items-center gap-2 text-xs font-bold">
                {bridgeResult.success ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> SUCCESS! Sustained {bridgeResult.loadTested}T Load (Deflection: {bridgeResult.deflection})
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" /> COLLAPSE! Structure buckled under load. Upgrade material or truss.
                  </span>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 mt-2">Click below to run stress physics simulation</p>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              onClick={handleTestBridge}
              disabled={testingBridge}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5"
            >
              <Play className="h-3.5 w-3.5" /> Run Stress Test
            </Button>

            {bridgeResult?.success && (
              <Button
                onClick={() => setStage(2)}
                className="gradient-primary text-white font-bold text-xs gap-1.5"
              >
                Proceed to Stage 2: Water Lab <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* STAGE 2: Eco-Water Filtration Lab */}
      {stage === 2 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                <Droplets className="h-4 w-4" /> Challenge 2: Natural Water Filtration Bio-Lab
              </span>
              <Badge variant="outline" className="text-[10px] font-bold">170 XP</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Design a multi-layer gravity water filtration column using natural materials. Add the filtration layers in order to purify murky river water to drinking standards (&gt;85% purity)!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Layer Selection */}
            <div className="space-y-2 p-3 rounded-xl border bg-card">
              <label className="text-xs font-bold text-foreground">Available Filtration Media:</label>
              <div className="space-y-1.5">
                {availableLayers.map((layer) => {
                  const isAdded = selectedLayers.includes(layer);
                  return (
                    <button
                      key={layer}
                      type="button"
                      disabled={isAdded}
                      onClick={() => {
                        setSelectedLayers((prev) => [...prev, layer]);
                        setFilterTested(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg border text-xs transition-all flex items-center justify-between ${
                        isAdded ? "opacity-50 cursor-not-allowed bg-muted" : "hover:border-sky-500 hover:bg-sky-500/10 font-medium"
                      }`}
                    >
                      <span>{layer}</span>
                      <span>{isAdded ? "Added ✓" : "+ Add Layer"}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filter Column Visual */}
            <div className="space-y-2 p-3 rounded-xl border bg-card flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-foreground">Your Filtration Column:</label>
                  {selectedLayers.length > 0 && (
                    <button
                      onClick={() => { setSelectedLayers([]); setFilterTested(false); }}
                      className="text-[10px] text-destructive hover:underline font-semibold"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div className="space-y-1 border rounded-lg p-2 min-h-28 bg-muted/30">
                  {selectedLayers.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground text-center py-6">
                      Tap layers on the left to pack your filter column (Top to Bottom)
                    </p>
                  ) : (
                    selectedLayers.map((layer, idx) => (
                      <div
                        key={idx}
                        className="text-xs p-1.5 rounded bg-sky-500/15 border border-sky-500/30 font-bold flex items-center justify-between text-sky-900 dark:text-sky-100"
                      >
                        <span>Layer {idx + 1}: {layer}</span>
                        <span className="text-[10px] text-muted-foreground">Flow ↓</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {filterTested && (
                <div className="mt-2 text-xs font-bold flex items-center justify-between p-2 rounded bg-muted/60">
                  <span>Purity Tested:</span>
                  <span className={purityScore >= 80 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600"}>
                    {purityScore}% {purityScore >= 80 ? "✨ Potable & Safe!" : "⚠️ Needs finer filtration"}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              onClick={handleTestFilter}
              disabled={selectedLayers.length < 2}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs gap-1.5"
            >
              <Droplets className="h-3.5 w-3.5" /> Test Filtration Purity
            </Button>

            {purityScore >= 70 && (
              <Button
                onClick={() => setStage(3)}
                className="gradient-primary text-white font-bold text-xs gap-1.5"
              >
                Proceed to Stage 3: Theory <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* STAGE 3: Structural Science Master */}
      {stage === 3 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" /> Challenge 3: Structural Physics Mastery
              </span>
              <Badge variant="outline" className="text-[10px] font-bold">180 XP</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Why are equilateral triangles the fundamental geometric unit in cranes, bridges, and Eiffel Tower trusses, rather than squares or rectangles?
            </p>
          </div>

          <div className="space-y-2">
            {[
              { id: 0, text: "A) Triangles are lighter and use less total iron than square frames." },
              { id: 1, text: "B) A triangle is naturally rigid; its angles cannot change without changing the lengths of its sides." },
              { id: 2, text: "C) Wind passes completely around triangles without causing any aerodynamic drag." },
              { id: 3, text: "D) Triangles reflect solar radiation away from steel beams to prevent thermal expansion." },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => { setSelectedTheoryAnswer(opt.id); setTheorySubmitted(false); }}
                className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                  selectedTheoryAnswer === opt.id
                    ? "border-indigo-500 bg-indigo-500/15 font-bold shadow-sm"
                    : "hover:bg-muted"
                }`}
              >
                {opt.text}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-3">
            {!theorySubmitted ? (
              <Button
                onClick={handleTheorySubmit}
                disabled={selectedTheoryAnswer === null}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
              >
                Verify Answer
              </Button>
            ) : (
              <Button
                onClick={() => setStage(4)}
                className="gradient-primary text-white font-bold text-xs gap-1.5"
              >
                Claim Victory & Points! <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* STAGE 4: Final Victory */}
      {stage === 4 && (
        <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center mx-auto shadow-xl animate-bounce">
            <Sparkles className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-foreground">STEAM Challenge Master! 🎉</h3>
            <p className="text-xs text-muted-foreground">
              You engineered a heavy freight bridge, built a 98% pure water filtration unit, and mastered geometric structural physics!
            </p>
          </div>

          <div className="inline-flex items-center gap-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-100 font-bold text-sm">
            <span>⭐ ⭐ ⭐ 3 Stars</span>
            <span>•</span>
            <span>+{Math.max(250, score)} Vacation XP Earned!</span>
          </div>

          <div className="pt-2">
            <Button
              onClick={handleFinishAll}
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
