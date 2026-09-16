import { jsPDF } from "jspdf";
import type { CertificateLayout, CertFieldLayout } from "@/lib/librarySettings";
import { OFFICIAL_KV_TEMPLATE_URL } from "@/components/certificates/BuiltinTemplates";

export type CertFieldKey = keyof CertificateLayout;

export interface CertificateRenderData {
  studentName: string;
  nameHindi?: string | null;
  studentClass?: string | null;
  classHindi?: string | null;
  eventName?: string | null;
  eventHindi?: string | null;
  during?: string | null;
  title: string;
  titleHindi?: string | null;
  commonText?: string | null;
  description?: string | null;
  issuedAt: string;
  templateUrl?: string | null;
  certNumber?: string | null;
  schoolName?: string | null;
}

// 2K Print Resolution for A4 Landscape (aspect ratio ~1.416 matching official KV template)
export const CERT_CANVAS_WIDTH = 2048;
export const CERT_CANVAS_HEIGHT = 1446;

// In-memory cache for loaded images so redraws are instant
const imageCache = new Map<string, HTMLImageElement>();

/**
 * Robust image loader with CORS handling and cache
 */
export async function loadCertificateImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached && cached.complete && cached.naturalWidth > 0) {
    return cached;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };

    img.onerror = async () => {
      // Fallback: try fetching as Blob (bypasses some browser CORS canvas taint quirks)
      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          imageCache.set(src, fallbackImg);
          resolve(fallbackImg);
        };
        fallbackImg.onerror = () => reject(new Error(`Failed to load image from blob: ${src}`));
        fallbackImg.src = blobUrl;
      } catch (err) {
        reject(new Error(`Failed to load certificate template image: ${src}`));
      }
    };

    img.src = src;
  });
}

/**
 * Returns canvas font string with scaled font size proportional to canvas width
 */
export function getCanvasFont(f: CertFieldLayout, canvasWidth: number): string {
  // Reference layout width is 1024px
  const scale = canvasWidth / 1024;
  const sizePx = Math.round(f.fontSize * scale);
  const weight = f.bold ? "700" : "500";

  let family = "'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  if (f.fontFamily === "serif") {
    family = "'Noto Serif Devanagari', 'Playfair Display', Georgia, serif";
  } else if (f.fontFamily === "display") {
    family = "'Cinzel', 'Playfair Display', 'Noto Serif Devanagari', Georgia, serif";
  }

  return `${weight} ${sizePx}px ${family}`;
}

export function resolveFieldText(key: CertFieldKey, data: CertificateRenderData): string {
  switch (key) {
    case "nameHindi":
      return data.nameHindi || data.studentName || "";
    case "classHindi":
      return data.classHindi || data.studentClass || "";
    case "eventHindi": {
      const hasDevanagari = (s?: string | null) => Boolean(s && /[\u0900-\u097F]/.test(s));
      if (data.eventHindi) return data.eventHindi;
      if (data.eventName && hasDevanagari(data.eventName)) return data.eventName;
      return data.eventName || "";
    }
    case "titleHindi":
      return data.titleHindi || "";
    case "name":
      return data.studentName || "";
    case "className":
      return data.studentClass || "";
    case "event": {
      const hasDevanagari = (s?: string | null) => Boolean(s && /[\u0900-\u097F]/.test(s));
      if (data.eventName && !hasDevanagari(data.eventName)) return data.eventName;
      if (data.eventHindi && !hasDevanagari(data.eventHindi)) return data.eventHindi;
      return "";
    }
    case "during":
      return data.during || "";
    case "title":
      return data.title || "";
    case "commonText":
      return data.commonText || "";
    case "description":
      return data.description || "";
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
      return data.certNumber ? `ID: ${data.certNumber}` : "";
    case "schoolName":
      return data.schoolName || "";
    default:
      return "";
  }
}

/**
 * Draw full certificate onto an HTMLCanvasElement at true print resolution
 */
export async function drawCertificateToCanvas(
  canvas: HTMLCanvasElement,
  data: CertificateRenderData,
  layout: CertificateLayout,
  options: { targetWidth?: number; targetHeight?: number } = {}
): Promise<void> {
  const width = options.targetWidth || CERT_CANVAS_WIDTH;
  const height = options.targetHeight || CERT_CANVAS_HEIGHT;

  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;

  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Could not get 2D canvas context");

  // High quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // 1. Fill background white
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // 2. Draw template background
  const templateUrl = data.templateUrl || OFFICIAL_KV_TEMPLATE_URL;
  try {
    const bgImg = await loadCertificateImage(templateUrl);
    ctx.drawImage(bgImg, 0, 0, width, height);
  } catch (e) {
    console.error("Template image render failed, drawing fallback border:", e);
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#1e3a8a";
    ctx.lineWidth = 12;
    ctx.strokeRect(30, 30, width - 60, height - 60);
  }

  // 3. Render all visible fields
  const fieldKeys: CertFieldKey[] = [
    "nameHindi",
    "classHindi",
    "eventHindi",
    "titleHindi",
    "name",
    "className",
    "event",
    "during",
    "title",
    "commonText",
    "description",
    "date",
    "certNumber",
    "schoolName",
  ];

  for (const key of fieldKeys) {
    const f = layout[key];
    if (!f || !f.visible) continue;

    const text = resolveFieldText(key, data);
    if (!text || !text.trim()) continue;

    const x = (f.x / 100) * width;
    const y = (f.y / 100) * height;

    ctx.save();
    ctx.font = getCanvasFont(f, width);
    ctx.fillStyle = f.color || "#0f172a";
    ctx.textAlign = f.align || "center";
    ctx.textBaseline = "middle";

    ctx.fillText(text.trim(), x, y);
    ctx.restore();
  }
}

/**
 * Generate a crystal-clear, high-resolution PDF directly from Canvas (No html2canvas artifacts!)
 */
export async function generateCertificatePdf(
  data: CertificateRenderData,
  layout: CertificateLayout,
  filename?: string
): Promise<void> {
  const offscreen = document.createElement("canvas");
  offscreen.width = CERT_CANVAS_WIDTH;
  offscreen.height = CERT_CANVAS_HEIGHT;

  await drawCertificateToCanvas(offscreen, data, layout, {
    targetWidth: CERT_CANVAS_WIDTH,
    targetHeight: CERT_CANVAS_HEIGHT,
  });

  const dataUrl = offscreen.toDataURL("image/png", 1.0);

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
    compress: true,
  });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  // Draw full-bleed landscape A4
  pdf.addImage(dataUrl, "PNG", 0, 0, pageW, pageH, undefined, "FAST");

  const finalName = filename
    ? (filename.endsWith(".pdf") ? filename : `${filename}.pdf`)
    : `${(data.studentName || "Student").replace(/\s+/g, "_")}_Certificate.pdf`;

  pdf.save(finalName);
}

/**
 * Print certificate directly at high print resolution
 */
export async function printCertificateDirect(
  data: CertificateRenderData,
  layout: CertificateLayout
): Promise<void> {
  const offscreen = document.createElement("canvas");
  offscreen.width = CERT_CANVAS_WIDTH;
  offscreen.height = CERT_CANVAS_HEIGHT;

  await drawCertificateToCanvas(offscreen, data, layout);
  const dataUrl = offscreen.toDataURL("image/png", 1.0);

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Certificate - ${data.studentName || "Student"}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 0;
          }
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            background: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          img {
            width: 100vw;
            height: 100vh;
            object-fit: contain;
          }
        </style>
      </head>
      <body>
        <img src="${dataUrl}" onload="window.focus(); window.print(); window.close();" />
      </body>
    </html>
  `);
  printWindow.document.close();
}
