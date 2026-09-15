import { useCallback, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import type { CertificateLayout, CertFieldLayout } from "@/lib/librarySettings";
import { OFFICIAL_KV_TEMPLATE_URL } from "@/components/certificates/BuiltinTemplates";
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
  certNumber?: string | null;
  schoolName?: string | null;
}

export const CERT_FIELD_LABELS: { key: CertFieldKey; label: string }[] = [
  { key: "name", label: "Student name" },
  { key: "className", label: "Class" },
  { key: "event", label: "Event / Activity" },
  { key: "title", label: "Position / Achievement" },
  { key: "description", label: "Description" },
  { key: "date", label: "Date" },
  { key: "certNumber", label: "Certificate No / ID" },
  { key: "schoolName", label: "School Header" },
];

function getFontFamilyCss(family?: string): string {
  if (family === "serif") return "'Playfair Display', Georgia, 'Times New Roman', serif";
  if (family === "display") return "'Cinzel', Georgia, serif";
  return "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
}

function fieldBoxStyle(f: CertFieldLayout, editable: boolean, selected: boolean): CSSProperties {
  const justify =
    f.align === "left" ? "flex-start" : f.align === "right" ? "flex-end" : "center";
  return {
    position: "absolute",
    left: `${f.x}%`,
    top: `${f.y}%`,
    transform: "translate(-50%, -50%)",
    width: "auto",
    maxWidth: "92%",
    minWidth: editable ? "80px" : undefined,
    display: "flex",
    justifyContent: justify,
    textAlign: f.align,
    fontSize: `${f.fontSize}px`,
    lineHeight: 1.2,
    color: f.color || "#0f172a",
    fontWeight: f.bold ? 700 : 500,
    fontFamily: getFontFamilyCss(f.fontFamily),
    padding: editable ? "4px 8px" : "0",
    boxSizing: "border-box",
    pointerEvents: editable ? "auto" : "none",
    cursor: editable ? "grab" : "default",
    userSelect: editable ? "none" : undefined,
    borderRadius: editable ? 6 : undefined,
    outline: editable
      ? selected
        ? "2px solid hsl(221 83% 53%)"
        : "1px dashed rgba(15, 23, 42, 0.4)"
      : undefined,
    background: editable
      ? selected
        ? "rgba(37, 99, 235, 0.15)"
        : "rgba(255, 255, 255, 0.55)"
      : undefined,
    boxShadow: editable && selected ? "0 0 0 3px rgba(37, 99, 235, 0.25)" : undefined,
    zIndex: selected ? 25 : 10,
    touchAction: editable ? "none" : undefined,
    whiteSpace: "nowrap",
  };
}

function fieldText(key: CertFieldKey, data: CertificateRenderData): string {
  switch (key) {
    case "name":
      return data.studentName || "Student Name";
    case "className":
      return data.studentClass || "Class —";
    case "event":
      return data.eventName || "Library Activity";
    case "title":
      return data.title || "First (1st)";
    case "description":
      return data.description || (data.title ? `Awarded for: ${data.title}` : "");
    case "date":
      try {
        const d = new Date(data.issuedAt);
        if (Number.isNaN(d.getTime())) return data.issuedAt;
        return d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      } catch {
        return data.issuedAt;
      }
    case "certNumber":
      return data.certNumber ? `ID: ${data.certNumber}` : "ID: KVS-CERT-2026-0001";
    case "schoolName":
      return data.schoolName || "PM SHRI KENDRIYA VIDYALAYA AFS SULUR · DIGITAL LIBRARY";
    default:
      return "";
  }
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

  const activeTemplate = data.templateUrl || OFFICIAL_KV_TEMPLATE_URL;
  const bg = {
    backgroundImage: `url(${activeTemplate})`,
    backgroundSize: "100% 100%",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  };

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
    e.preventDefault();
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
    const fieldCfg = layout[key];
    if (!fieldCfg || !fieldCfg.visible) return false;
    if (editable) return true;
    if (key === "className") return !!data.studentClass;
    if (key === "event") return !!data.eventName;
    if (key === "description") return !!data.description;
    return true;
  });

  return (
    <div
      ref={setRefs}
      className={cn(
        "relative aspect-[1.416] w-full overflow-hidden rounded-lg border bg-white shadow-sm",
        editable && "ring-2 ring-primary/20 select-none",
        className
      )}
      style={bg}
    >
      {editable && (
        <div className="absolute inset-x-0 top-0 z-30 pointer-events-none bg-gradient-to-b from-black/60 to-transparent px-3 py-1.5 flex items-center justify-between">
          <p className="text-[11px] font-medium text-white drop-shadow">
            🎯 Drag fields onto the certificate lines · Click field to customize style
          </p>
          <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded">
            Interactive Editor
          </span>
        </div>
      )}

      {visibleKeys.map((key) => {
        const f = layout[key];
        const selected = selectedField === key;
        const text = fieldText(key, data);
        if (!text && !editable) return null;

        return (
          <div
            key={key}
            style={fieldBoxStyle(f, editable, selected)}
            onPointerDown={(e) => onPointerDown(key, e)}
            onPointerMove={editable ? onPointerMove : undefined}
            onPointerUp={editable ? endDrag : undefined}
            onPointerCancel={editable ? endDrag : undefined}
            className={cn(
              dragging === key && "cursor-grabbing",
              editable && "transition-shadow"
            )}
            title={editable ? CERT_FIELD_LABELS.find((x) => x.key === key)?.label : undefined}
          >
            <span>{text}</span>
          </div>
        );
      })}
    </div>
  );
}

