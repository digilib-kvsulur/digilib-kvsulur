import { useMemo, useState } from "react";
import { BookOpen, Copy, Bookmark, BookmarkCheck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import MathText from "@/components/student/MathText";
import { toast } from "sonner";

export type FormulaItem = {
  id: string;
  title: string;
  formula: string;
  label?: string | null;
  units?: string | null;
  bookmarked: boolean;
  onToggleBookmark: () => void;
};

export default function FormulaCard({ title, formula, label, units, bookmarked, onToggleBookmark }: Omit<FormulaItem, "id">) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(formula);
      setCopied(true);
      toast.success("Formula copied");
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("Could not copy formula");
    }
  };

  return (
    <Card className="rounded-xl border-border/70 shadow-none">
      <CardContent className="p-4 sm:p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            {label && <p className="text-xs text-muted-foreground mt-0.5">{label}</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button type="button" variant="ghost" size="icon" className="h-11 w-11 rounded-xl" aria-label={copied ? "Copied formula" : "Copy formula"} onClick={copy}>
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-11 w-11 rounded-xl" aria-label={bookmarked ? "Remove bookmark" : "Bookmark formula"} onClick={onToggleBookmark}>
              {bookmarked ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="rounded-lg bg-muted/40 border border-border/50 px-3 py-3 overflow-x-auto">
          <MathText text={formula.includes("$") ? formula : `$$${formula}$$`} className="text-sm sm:text-base text-foreground" />
        </div>
        {units && <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground/80">Units:</span> {units}</p>}
      </CardContent>
    </Card>
  );
}
