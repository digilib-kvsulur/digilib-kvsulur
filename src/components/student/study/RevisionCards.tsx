import { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import MathText from "@/components/student/MathText";

export interface RevisionPoint { id: string; title?: string; content: string; }

export default function RevisionCards({ points, twoMinuteMode = false }: { points: RevisionPoint[]; twoMinuteMode?: boolean }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  if (!points.length) return null;
  const current = points[index];
  const next = () => { setFlipped(false); setIndex((i) => Math.min(points.length - 1, i + 1)); };
  const prev = () => { setFlipped(false); setIndex((i) => Math.max(0, i - 1)); };

  if (twoMinuteMode) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Timer className="h-4 w-4" /> Quick revision checklist - skim key points.</div>
        {points.map((p, i) => (
          <label key={p.id} className="flex gap-3 rounded-xl border bg-card p-4 cursor-pointer hover:bg-muted/20">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-primary" aria-label={`Mark revision point ${i + 1} reviewed`} />
            <div className="min-w-0">
              {p.title && <p className="text-sm font-semibold">{p.title}</p>}
              <div className="text-sm text-muted-foreground leading-6"><MathText text={p.content} /></div>
            </div>
          </label>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground text-center">Card {index + 1} of {points.length} - tap card to flip</div>
      <button type="button" onClick={() => setFlipped((f) => !f)} className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl" aria-label={flipped ? "Show front of flashcard" : "Show back of flashcard"}>
        <Card className="rounded-xl border-border/70 shadow-none min-h-[180px]">
          <CardContent className="p-5 sm:p-6 flex flex-col justify-center min-h-[180px]">
            {!flipped ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-2">Key point</p>
                <p className="text-base sm:text-lg font-semibold leading-7">{current.title || `Point ${index + 1}`}</p>
                <p className="text-sm text-muted-foreground mt-3">Tap to reveal</p>
              </div>
            ) : (
              <div className="text-sm sm:text-base leading-7"><MathText text={current.content} /></div>
            )}
          </CardContent>
        </Card>
      </button>
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="outline" className="min-h-11 rounded-xl" onClick={prev} disabled={index === 0}><ChevronLeft className="h-4 w-4 mr-1" /> Prev</Button>
        <Button type="button" variant="ghost" className="min-h-11 rounded-xl" onClick={() => { setIndex(0); setFlipped(false); }}><RotateCcw className="h-4 w-4 mr-1" /> Restart</Button>
        <Button type="button" variant="outline" className="min-h-11 rounded-xl" onClick={next} disabled={index === points.length - 1}>Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
      </div>
    </div>
  );
}
