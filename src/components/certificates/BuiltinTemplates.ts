export interface CertificateTemplateInfo {
  id: string;
  name: string;
  category: "official" | "preset" | "custom";
  description: string;
  previewUrl: string;
  isOfficial?: boolean;
}

export const OFFICIAL_KV_TEMPLATE_URL = "/certificates/kv_sulur_certificate_template.png";

// Calibrated field coordinates for the official KV Sulur certificate image
export const OFFICIAL_KV_LAYOUT = {
  // English name line: "This is to certify that Master/Miss [ Aarav Sharma ] of"
  name: { x: 64, y: 64.5, fontSize: 16, visible: true, align: "left" as const, color: "#1e3a8a", bold: true },
  // Class line: "class [ 8-A ] has participated in [ National Reading Month ]"
  className: { x: 28, y: 70.8, fontSize: 15, visible: true, align: "left" as const, color: "#1e3a8a", bold: true },
  // Event line on same line or Hindi blank
  event: { x: 67, y: 70.8, fontSize: 14, visible: true, align: "left" as const, color: "#1e3a8a", bold: true },
  // Position / Achievement: "and secured [ First (1st) ] position."
  title: { x: 43, y: 83.2, fontSize: 15, visible: true, align: "left" as const, color: "#b91c1c", bold: true },
  // Description / Details (optional additional line or during blank)
  description: { x: 42, y: 77.0, fontSize: 13, visible: false, align: "left" as const, color: "#334155", bold: false },
  // Date: "दिनांक : / Date : [ 15/09/2026 ]"
  date: { x: 26, y: 94.5, fontSize: 13, visible: true, align: "left" as const, color: "#0f172a", bold: true },
  // Certificate ID watermark / serial at bottom right
  certNumber: { x: 88, y: 95.0, fontSize: 11, visible: true, align: "right" as const, color: "#64748b", bold: false },
  schoolName: { x: 50, y: 15.0, fontSize: 18, visible: false, align: "center" as const, color: "#0f172a", bold: true },
};

// Generates an SVG data URL for a vector certificate background
function createSvgTemplate(type: "gold" | "blue" | "emerald" | "purple"): string {
  const themes = {
    gold: {
      primary: "#b45309",
      accent: "#f59e0b",
      bgGrad1: "#fffdfa",
      bgGrad2: "#fef3c7",
      border: "#d97706",
      innerBorder: "#92400e",
      title: "CERTIFICATE OF MERIT",
      subtitle: "PM SHRI KENDRIYA VIDYALAYA AFS SULUR · LIBRARY",
    },
    blue: {
      primary: "#1e3a8a",
      accent: "#3b82f6",
      bgGrad1: "#f8fafc",
      bgGrad2: "#e0e7ff",
      border: "#1d4ed8",
      innerBorder: "#1e3a8a",
      title: "CERTIFICATE OF EXCELLENCE",
      subtitle: "PM SHRI KENDRIYA VIDYALAYA AFS SULUR · DIGITAL LIBRARY",
    },
    emerald: {
      primary: "#065f46",
      accent: "#10b981",
      bgGrad1: "#f0fdf4",
      bgGrad2: "#d1fae5",
      border: "#047857",
      innerBorder: "#064e3b",
      title: "STAR READER AWARD",
      subtitle: "PM SHRI KENDRIYA VIDYALAYA AFS SULUR · READING MISSION",
    },
    purple: {
      primary: "#581c87",
      accent: "#a855f7",
      bgGrad1: "#faf5ff",
      bgGrad2: "#ede9fe",
      border: "#7e22ce",
      innerBorder: "#581c87",
      title: "CERTIFICATE OF DISTINCTION",
      subtitle: "PM SHRI KENDRIYA VIDYALAYA AFS SULUR · QUIZ & KNOWLEDGE",
    },
  }[type];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 724" width="1024" height="724">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${themes.bgGrad1}"/>
        <stop offset="100%" stop-color="${themes.bgGrad2}"/>
      </linearGradient>
      <pattern id="pat" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 40 20 L 20 40 L 0 20 Z" fill="none" stroke="${themes.accent}" stroke-width="0.35" opacity="0.15"/>
      </pattern>
    </defs>
    <rect width="1024" height="724" fill="url(#bg)" />
    <rect width="1024" height="724" fill="url(#pat)" />

    <!-- Ornate outer border -->
    <rect x="24" y="24" width="976" height="676" rx="8" fill="none" stroke="${themes.border}" stroke-width="4" />
    <rect x="36" y="36" width="952" height="652" rx="6" fill="none" stroke="${themes.accent}" stroke-width="1.5" stroke-dasharray="6,4" />
    <rect x="44" y="44" width="936" height="636" rx="4" fill="none" stroke="${themes.innerBorder}" stroke-width="1" />

    <!-- Corner flourishes -->
    <g fill="${themes.primary}">
      <path d="M 44 44 L 90 44 L 90 48 L 48 48 L 48 90 L 44 90 Z"/>
      <circle cx="96" cy="46" r="3" />
      <circle cx="46" cy="96" r="3" />

      <path d="M 980 44 L 934 44 L 934 48 L 976 48 L 976 90 L 980 90 Z"/>
      <circle cx="928" cy="46" r="3" />
      <circle cx="978" cy="96" r="3" />

      <path d="M 44 680 L 90 680 L 90 676 L 48 676 L 48 634 L 44 634 Z"/>
      <circle cx="96" cy="678" r="3" />
      <circle cx="46" cy="628" r="3" />

      <path d="M 980 680 L 934 680 L 934 676 L 976 676 L 976 634 L 980 634 Z"/>
      <circle cx="928" cy="678" r="3" />
      <circle cx="978" cy="628" r="3" />
    </g>

    <!-- Top Badge Header -->
    <g transform="translate(512, 95)" text-anchor="middle">
      <circle cx="0" cy="0" r="28" fill="${themes.primary}" opacity="0.12"/>
      <circle cx="0" cy="0" r="22" fill="${themes.primary}" opacity="0.2"/>
      <polygon points="0,-14 4,-4 14,-4 6,3 9,13 0,7 -9,13 -6,3 -14,-4 -4,-4" fill="${themes.accent}" />
      <text y="50" font-family="'Cinzel', 'Playfair Display', Georgia, serif" font-size="14" font-weight="bold" fill="${themes.primary}" letter-spacing="4">${themes.subtitle}</text>
      <text y="90" font-family="'Cinzel', 'Playfair Display', Georgia, serif" font-size="32" font-weight="900" fill="${themes.primary}" letter-spacing="3">${themes.title}</text>
      <line x1="-160" y1="110" x2="160" y2="110" stroke="${themes.accent}" stroke-width="2" />
      <polygon points="0,107 4,110 0,113 -4,110" fill="${themes.primary}"/>
    </g>

    <!-- Signature lines at bottom -->
    <g transform="translate(240, 625)" text-anchor="center">
      <line x1="-80" y1="0" x2="80" y2="0" stroke="${themes.innerBorder}" stroke-width="1.5" />
      <text y="20" font-family="sans-serif" font-size="13" font-weight="600" fill="#334155" text-anchor="middle">Librarian</text>
    </g>
    <g transform="translate(784, 625)" text-anchor="center">
      <line x1="-80" y1="0" x2="80" y2="0" stroke="${themes.innerBorder}" stroke-width="1.5" />
      <text y="20" font-family="sans-serif" font-size="13" font-weight="600" fill="#334155" text-anchor="middle">Principal</text>
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const BUILTIN_TEMPLATES: CertificateTemplateInfo[] = [
  {
    id: "official_kv_sulur",
    name: "PM SHRI KV Sulur Official",
    category: "official",
    description: "Official bilingual merit certificate with school logos, KV seal, and principal/librarian signatures.",
    previewUrl: OFFICIAL_KV_TEMPLATE_URL,
    isOfficial: true,
  },
  {
    id: "classic_gold",
    name: "Classic Golden Crest",
    category: "preset",
    description: "Elegant gold ornamental borders with royal seal for reading champions and honors.",
    previewUrl: createSvgTemplate("gold"),
  },
  {
    id: "academic_blue",
    name: "Academic Prestige Navy",
    category: "preset",
    description: "Distinguished KV blue and bronze borders for academic competitions and quizzes.",
    previewUrl: createSvgTemplate("blue"),
  },
  {
    id: "emerald_reader",
    name: "Emerald Reading Champion",
    category: "preset",
    description: "Vibrant emerald green book laurels for Reader of the Month & book review stars.",
    previewUrl: createSvgTemplate("emerald"),
  },
  {
    id: "royal_purple",
    name: "Royal Violet Distinction",
    category: "preset",
    description: "Majestic purple and gold star design for special library day events & quizzes.",
    previewUrl: createSvgTemplate("purple"),
  },
];
