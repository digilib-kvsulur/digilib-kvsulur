import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import QuickAskAiDialog from "./QuickAskAiDialog";

interface AskAiSelectionLayerProps {
  children: ReactNode;
  studentClass?: string | number | null;
  subject?: string;
  chapterTitle?: string;
}

export default function AskAiSelectionLayer({
  children,
  studentClass,
  subject,
  chapterTitle,
}: AskAiSelectionLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectionText, setSelectionText] = useState("");
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const readSelection = useCallback(() => {
    if (dialogOpen) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setCoords(null);
      return;
    }
    const text = sel.toString().trim();
    if (text.length < 3 || text.length > 2500) {
      setCoords(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const container = containerRef.current;
    if (!container || !container.contains(range.commonAncestorContainer)) {
      setCoords(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      setCoords(null);
      return;
    }
    const top = Math.max(12, Math.min(window.innerHeight - 56, rect.top - 48));
    const left = Math.max(16, Math.min(window.innerWidth - 170, rect.left + rect.width / 2 - 75));
    setSelectionText(text);
    setCoords({ top, left });
  }, [dialogOpen]);

  useEffect(() => {
    let timer: number | undefined;
    const scheduleRead = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(readSelection, 120);
    };
    const container = containerRef.current;
    container?.addEventListener("mouseup", scheduleRead);
    container?.addEventListener("touchend", scheduleRead);
    document.addEventListener("selectionchange", scheduleRead);
    return () => {
      window.clearTimeout(timer);
      container?.removeEventListener("mouseup", scheduleRead);
      container?.removeEventListener("touchend", scheduleRead);
      document.removeEventListener("selectionchange", scheduleRead);
    };
  }, [readSelection]);

  const handleAskClick = () => {
    setCoords(null);
    setDialogOpen(true);
  };

  return (
    <div ref={containerRef} className="relative">
      {children}

      {coords && (
        <div
          className="fixed z-50 animate-in fade-in zoom-in-95 duration-150"
          style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
        >
          <Button
            type="button"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleAskClick}
            className="h-9 gap-1.5 rounded-full bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-lg ring-2 ring-background"
          >
            <Sparkles className="h-3.5 w-3.5" />
            ASK DLMS AI
          </Button>
        </div>
      )}

      <QuickAskAiDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        selectedText={selectionText}
        studentClass={studentClass}
        subject={subject}
        chapterTitle={chapterTitle}
      />
    </div>
  );
}
