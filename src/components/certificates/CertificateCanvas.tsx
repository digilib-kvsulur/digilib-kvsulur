import type { CSSProperties, RefObject } from "react";
import type { CertificateLayout, CertFieldLayout } from "@/lib/librarySettings";

export interface CertificateRenderData {
  studentName: string;
  studentClass?: string | null;
  eventName?: string | null;
  title: string;
  description?: string | null;
  issuedAt: string;
  templateUrl?: string | null;
}

function fieldStyle(f: CertFieldLayout): CSSProperties {
  const justify =
    f.align === "left" ? "flex-start" : f.align === "right" ? "flex-end" : "center";
  const textAlign = f.align;
  return {
    position: "absolute",
    left: `${f.x}%`,
    top: `${f.y}%`,
    transform: "translate(-50%, -50%)",
    width: "90%",
    display: "flex",
    justifyContent: justify,
    textAlign,
    fontSize: `${f.fontSize}px`,
    lineHeight: 1.25,
    color: "#0f172a",
    pointerEvents: "none",
    padding: "0 4%",
    boxSizing: "border-box",
  };
}

interface Props {
  data: CertificateRenderData;
  layout: CertificateLayout;
  className?: string;
  canvasRef?: RefObject<HTMLDivElement | null>;
}

export default function CertificateCanvas({ data, layout, className = "", canvasRef }: Props) {
  const bg = data.templateUrl
    ? { backgroundImage: `url(${data.templateUrl})`, backgroundSize: "cover" as const, backgroundPosition: "center" }
    : { background: "linear-gradient(135deg,#f8fafc,#e2e8f0)" };

  return (
    <div
      ref={canvasRef as any}
      className={`relative aspect-[1.414] w-full overflow-hidden rounded-lg border bg-white ${className}`}
      style={bg}
    >
      {layout.name.visible && (
        <div style={fieldStyle(layout.name)}>
          <span className="font-serif font-bold">{data.studentName || "Student"}</span>
        </div>
      )}
      {layout.className.visible && data.studentClass && (
        <div style={fieldStyle(layout.className)}>
          <span>Class {data.studentClass}</span>
        </div>
      )}
      {layout.event.visible && data.eventName && (
        <div style={fieldStyle(layout.event)}>
          <span className="font-medium">{data.eventName}</span>
        </div>
      )}
      {layout.title.visible && (
        <div style={fieldStyle(layout.title)}>
          <span className="font-semibold">{data.title}</span>
        </div>
      )}
      {layout.description.visible && (
        <div style={fieldStyle(layout.description)}>
          <span className="text-slate-700">
            {data.description || (data.title ? `Awarded for: ${data.title}` : "")}
          </span>
        </div>
      )}
      {layout.date.visible && (
        <div style={fieldStyle(layout.date)}>
          <span className="text-slate-600">
            {new Date(data.issuedAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
      )}
    </div>
  );
}
