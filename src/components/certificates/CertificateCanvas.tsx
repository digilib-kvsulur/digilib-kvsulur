import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import type { CertificateLayout, CertFieldLayout } from "@/lib/librarySettings";
import { cn } from "@/lib/utils";
import {
  CERT_CANVAS_WIDTH,
  CERT_CANVAS_HEIGHT,
  drawCertificateToCanvas,
  resolveFieldText,
  type CertificateRenderData,
  type CertFieldKey,
} from "@/components/certificates/certificateGenerator";

export type { CertFieldKey, CertificateRenderData };

export const CERT_FIELD_LABELS: { key: CertFieldKey; label: string; group?: string }[] = [
  // Hindi Section
  { key: "nameHindi", label: "छात्र का नाम (Hindi Name)", group: "Hindi" },
  { key: "classHindi", label: "कक्षा (Hindi Class)", group: "Hindi" },
  { key: "eventHindi", label: "प्रतियोगिता (Hindi Event)", group: "Hindi" },
  { key: "titleHindi", label: "स्थान / उपलब्धि (Hindi Position)", group: "Hindi" },

  // English Section
  { key: "name", label: "Student Name (English)", group: "English" },
  { key: "className", label: "Class (English)", group: "English" },
  { key: "event", label: "Event / Activity (English)", group: "English" },
  { key: "during", label: "During Period (English)", group: "English" },
  { key: "title", label: "Position / Award (English)", group: "English" },

  // Shared Section
  { key: "commonText", label: "Plain Text (Common for All)", group: "Shared" },
  { key: "date", label: "Date (दिनांक)", group: "Shared" },
  { key: "certNumber", label: "Certificate ID", group: "Shared" },
  { key: "schoolName", label: "School Header", group: "Shared" },
  { key: "description", label: "Description", group: "Shared" },
];

function fieldBoxStyle(f: CertFieldLayout, editable: boolean, selected: boolean): CSSProperties {
  const translateX = f.align === "left" ? "0%" : f.align === "right" ? "-100%" : "-50%";
  return {
    position: "absolute",
    left: `${f.x}%`,
    top: `${f.y}%`,
    transform: `translate(${translateX}, -50%)`,
    width: "auto",
    maxWidth: "92%",
    minWidth: editable ? "60px" : undefined,
    display: "flex",
    justifyContent: f.align === "left" ? "flex-start" : f.align === "right" ? "flex-end" : "center",
    textAlign: f.align,
    fontSize: "13px",
    lineHeight: 1.2,
    color: "transparent", // Canvas renders the text crisp; DOM box is for drag handle in editor
    padding: editable ? "6px 10px" : "0",
    boxSizing: "border-box",
    pointerEvents: editable ? "auto" : "none",
    cursor: editable ? "grab" : "default",
    userSelect: editable ? "none" : undefined,
    borderRadius: editable ? 6 : undefined,
    border: editable
      ? selected
        ? "2px solid #2563eb"
        : "1px dashed rgba(37, 99, 235, 0.45)"
      : undefined,
    background: editable
      ? selected
        ? "rgba(37, 99, 235, 0.15)"
        : "rgba(255, 255, 255, 0.25)"
      : undefined,
    boxShadow: editable && selected ? "0 0 0 3px rgba(37, 99, 235, 0.25)" : undefined,
    zIndex: selected ? 25 : 10,
    touchAction: editable ? "none" : undefined,
    whiteSpace: "nowrap",
  };
}

interface Props {
  data: CertificateRenderData;
  layout: CertificateLayout;
  className?: string;
  canvasRef?: RefObject<HTMLDivElement | HTMLCanvasElement | null>;
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const internalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{ key: CertFieldKey; pointerId: number } | null>(null);
  const [dragging, setDragging] = useState<CertFieldKey | null>(null);
  const [rendering, setRendering] = useState(false);

  // Sync ref to parent
  const setContainerNode = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      if (canvasRef) {
        (canvasRef as any).current = node;
      }
    },
    [canvasRef]
  );

  // Draw certificate onto canvas on every change
  useEffect(() => {
    const canvas = internalCanvasRef.current;
    if (!canvas) return;

    let isMounted = true;
    setRendering(true);

    drawCertificateToCanvas(canvas, data, layout, {
      targetWidth: CERT_CANVAS_WIDTH,
      targetHeight: CERT_CANVAS_HEIGHT,
    })
      .catch((err) => console.error("Canvas draw error:", err))
      .finally(() => {
        if (isMounted) setRendering(false);
      });

    return () => {
      isMounted = false;
    };
  }, [
    data.studentName,
    data.nameHindi,
    data.studentClass,
    data.classHindi,
    data.eventName,
    data.eventHindi,
    data.during,
    data.title,
    data.titleHindi,
    data.commonText,
    data.description,
    data.issuedAt,
    data.templateUrl,
    data.certNumber,
    layout,
  ]);

  const updateFromPointer = (key: CertFieldKey, clientX: number, clientY: number) => {
    const el = containerRef.current;
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
      ref={setContainerNode}
      className={cn(
        "relative aspect-[1.416] w-full overflow-hidden rounded-lg border bg-white shadow-sm select-none",
        editable && "ring-2 ring-primary/20",
        className
      )}
    >
      {/* High-Resolution Canvas Element */}
      <canvas
        ref={internalCanvasRef}
        width={CERT_CANVAS_WIDTH}
        height={CERT_CANVAS_HEIGHT}
        className="w-full h-full block object-contain pointer-events-none"
        style={{
          aspectRatio: "1.416",
        }}
      />

      {/* Editor Banner */}
      {editable && (
        <div className="absolute inset-x-0 top-0 z-30 pointer-events-none bg-gradient-to-b from-black/60 to-transparent px-3 py-1.5 flex items-center justify-between">
          <p className="text-[11px] font-medium text-white drop-shadow">
            🎯 Drag handles onto certificate lines · Click to customize font & alignment
          </p>
          <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded">
            Interactive Editor
          </span>
        </div>
      )}

      {/* Interactive Overlays for Studio Editor */}
      {editable &&
        visibleKeys.map((key) => {
          const f = layout[key];
          const selected = selectedField === key;
          const text = resolveFieldText(key, data) || key;

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
                "transition-colors"
              )}
              title={CERT_FIELD_LABELS.find((x) => x.key === key)?.label}
            >
              <span className="text-[11px] font-bold text-blue-900 bg-white/80 px-1.5 py-0.5 rounded shadow-sm border border-blue-300">
                {CERT_FIELD_LABELS.find((x) => x.key === key)?.label || key}
              </span>
            </div>
          );
        })}
    </div>
  );
}
