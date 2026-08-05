import { useCallback, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import type { CertificateLayout, CertFieldLayout } from "@/lib/librarySettings";
import { cn } from "@/lib/utils";

export type CertFieldKey = keyof CertificateLayout;

export interface CertificateRenderData {
  studentName: string;
  studentClass?: string | null;
  eventName?: string | null;
  title: string;
  description?: string | null;
  issuedAt: string;
  templateUrl?: string | null;
}

export const CERT_FIELD_LABELS: { key: CertFieldKey; label: string }[] = [
  { key: "name", label: "Student name" },
  { key: "className", label: "Class" },
  { key: "event", label: "Event name" },
  { key: "title", label: "Certificate title" },
  { key: "description", label: "Description" },
  { key: "date", label: "Date" },
];

function fieldBoxStyle(f: CertFieldLayout, editable: boolean, selected: boolean): CSSProperties {
  const justify =
    f.align === "left" ? "flex-start" : f.align === "right" ? "flex-end" : "center";
  return {
    position: "absolute",
    left: `${f.x}%`,
    top: `${f.y}%`,
    transform: "translate(-50%, -50%)",
    width: "min(92%, 520px)",
    display: "flex",
    justifyContent: justify,
    textAlign: f.align,
    fontSize: `${f.fontSize}px`,
    lineHeight: 1.25,
    color: "#0f172a",
    padding: editable ? "6px 10px" : "0 4%",
    boxSizing: "border-box",
    pointerEvents: editable ? "auto" : "none",
    cursor: editable ? "grab" : "default",
    userSelect: editable ? "none" : undefined,
    borderRadius: editable ? 8 : undefined,
    outline: editable
      ? selected
        ? "2px solid hsl(221 83% 53%)"
        : "1px dashed rgba(15, 23, 42, 0.35)"
      : undefined,
    background: editable
      ? selected
        ? "rgba(37, 99, 235, 0.12)"
        : "rgba(255, 255, 255, 0.35)"
      : undefined,
    boxShadow: editable && selected ? "0 0 0 3px rgba(37, 99, 235, 0.2)" : undefined,
    zIndex: selected ? 20 : 10,
    touchAction: editable ? "none" : undefined,
  };
}

function fieldText(key: CertFieldKey, data: CertificateRenderData): string {
  switch (key) {
    case "name":
      return data.studentName || "Student";
    case "className":
      return data.studentClass ? `Class ${data.studentClass}` : "Class —";
    case "event":
      return data.eventName || "Event name";
    case "title":
      return data.title || "Certificate title";
    case "description":
      return data.description || (data.title ? `Awarded for: ${data.title}` : "Description");
    case "date":
      return new Date(data.issuedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    default:
      return "";
  }
}

function fieldClassName(key: CertFieldKey): string {
  if (key === "name") return "font-serif font-bold";
  if (key === "event" || key === "title") return "font-semibold";
  if (key === "description" || key === "date") return "text-slate-700";
  return "";
}

interface Props {
  data: CertificateRenderData;
  layout: CertificateLayout;
  className?: string;
  canvasRef?: RefObject<HTMLDivElement | null>;
  /** Enable drag-to-position editing */
  editable?: boolean;
  selectedField?: CertFieldKey | null;
  onSelectField?: (key: CertFieldKey) => void;
  onMoveField?: (key: CertFieldKey, x: number, y: number) => void;
}

export default function CertificateCanvas({
  data,
  layout,
  className = "",
  canvasRef,
  editable = false,
  selectedField = null,
  onSelectField,
  onMoveField,
}: Props) {
  const localRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ key: CertFieldKey; pointerId: number } | null>(null);
  const [dragging, setDragging] = useState<CertFieldKey | null>(null);

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      localRef.current = node;
      if (canvasRef) (canvasRef as any).current = node;
    },
    [canvasRef]
  );

  const bg = data.templateUrl
    ? { backgroundImage: `url(${data.templateUrl})`, backgroundSize: "cover" as const, backgroundPosition: "center" }
    : { background: "linear-gradient(135deg,#f8fafc,#e2e8f0)" };

  const updateFromPointer = (key: CertFieldKey, clientX: number, clientY: number) => {
    const el = localRef.current;
    if (!el || !onMoveField) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const x = Math.min(98, Math.max(2, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(98, Math.max(2, ((clientY - rect.top) / rect.height) * 100));
    onMoveField(key, Math.round(x * 10) / 10, Math.round(y * 10) / 10);
  };

  const onPointerDown = (key: CertFieldKey, e: ReactPointerEvent<HTMLDivElement>) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    onSelectField?.(key);
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    dragRef.current = { key, pointerId: e.pointerId };
    setDragging(key);
    updateFromPointer(key, e.clientX, e.clientY);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    updateFromPointer(drag.key, e.clientX, e.clientY);
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    dragRef.current = null;
    setDragging(null);
  };

  const visibleKeys = CERT_FIELD_LABELS.map((f) => f.key).filter((key) => {
    if (!layout[key].visible) return false;
    // In edit mode show placeholders even if sample data empty
    if (editable) return true;
    if (key === "className") return !!data.studentClass;
    if (key === "event") return !!data.eventName;
    return true;
  });

  return (
    <div
      ref={setRefs}
      className={cn(
        "relative aspect-[1.414] w-full overflow-hidden rounded-lg border bg-white",
        editable && "ring-1 ring-border select-none",
        className
      )}
      style={bg}
      onPointerMove={editable ? onPointerMove : undefined}
      onPointerUp={editable ? endDrag : undefined}
      onPointerCancel={editable ? endDrag : undefined}
    >
      {editable && (
        <div className="absolute inset-x-0 top-0 z-30 pointer-events-none bg-gradient-to-b from-black/45 to-transparent px-3 py-2">
          <p className="text-[11px] font-medium text-white drop-shadow">
            Drag fields to position · click a field to select
          </p>
        </div>
      )}

      {visibleKeys.map((key) => {
        const f = layout[key];
        const selected = selectedField === key;
        return (
          <div
            key={key}
            style={fieldBoxStyle(f, editable, selected)}
            onPointerDown={(e) => onPointerDown(key, e)}
            className={cn(dragging === key && "cursor-grabbing")}
            title={editable ? CERT_FIELD_LABELS.find((x) => x.key === key)?.label : undefined}
          >
            <span className={fieldClassName(key)}>{fieldText(key, data)}</span>
          </div>
        );
      })}
    </div>
  );
}
