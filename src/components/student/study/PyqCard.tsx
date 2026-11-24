import { useMemo, useState } from "react";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import MathText from "@/components/student/MathText";

export interface PyqItem {
  id: string;
  question: string;
  answer?: string | null;
  year?: number | null;
  marks?: number | null;
  board?: string | null;
  sourceLabel?: string | null;
}

export default function PyqCard({ item, onExplain }: { item: PyqItem; onExplain?: (item: PyqItem) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="rounded-xl border-border/70 shadow-none">
      <CardContent className="p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {item.year && <Badge variant="outline" className="rounded-full">{item.year}</Badge>}
          {item.marks && <Badge variant="outline" className="rounded-full">{item.marks} marks</Badge>}
          {item.board && <Badge variant="secondary" className="rounded-full">{item.board}</Badge>}
          {item.sourceLabel && <Badge variant="secondary" className="rounded-full">{item.sourceLabel}</Badge>}
        </div>
        <div className="text-sm sm:text-base leading-7 text-foreground">
          <MathText text={item.question} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="min-h-11 rounded-xl" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            {open ? <ChevronUp className="h-4 w-4 mr-1.5" /> : <ChevronDown className="h-4 w-4 mr-1.5" />}
            {open ? "Hide answer" : "Show answer"}
          </Button>
          {onExplain && (
            <Button type="button" variant="ghost" size="sm" className="min-h-11 rounded-xl text-primary" onClick={() => onExplain(item)}>
              <Sparkles className="h-4 w-4 mr-1.5" /> Explain with AI
            </Button>
          )}
        </div>
        {open && (
          <div className="rounded-lg border bg-muted/30 p-3 sm:p-4 text-sm leading-7">
            {item.answer ? <MathText text={item.answer} /> : <p className="text-muted-foreground">Answer not available yet. Use “Explain with AI” for a guided explanation.</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
