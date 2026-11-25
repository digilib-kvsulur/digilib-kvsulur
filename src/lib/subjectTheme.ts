import {
  Atom, BookOpen, Briefcase, Calculator, Code2, Dna, Earth, FlaskConical,
  Landmark, Languages, Leaf, Scale, ScrollText, type LucideIcon,
} from "lucide-react";

export const SUBJECT_SHORT_NAMES: Record<string, string> = {
  "Computer Science": "Comp. Sci.",
  "Informatics Practices": "IP",
  "Business Studies": "B. Studies",
  "Political Science": "Pol. Sci.",
  "Social Science": "Social",
  "Environmental Studies": "EVS",
  "Environmental Science": "EVS",
  "Accountancy": "Accounts",
  "English Language & Literature": "English",
  "Mathematics Standard": "Maths",
  "Biotechnology": "Biotech",
  "Entrepreneurship": "Entrepren.",
};

export function shortSubjectName(subject: string) {
  return SUBJECT_SHORT_NAMES[subject] || subject;
}

export type SubjectTheme = {
  icon: LucideIcon;
  bg: string;
  fg: string;
  ring: string;
  token: string;
  color: string;
  tint: string;
};

const DEFAULT_THEME: SubjectTheme = {
  icon: BookOpen,
  bg: "bg-[var(--subject-general)]",
  fg: "text-indigo-800",
  ring: "ring-indigo-400",
  token: "var(--subject-general)",
  color: "#4f46e5",
  tint: "#eef2ff",
};

const THEMES: Record<string, SubjectTheme> = {
  Mathematics: { icon: Calculator, bg: "bg-[var(--subject-math)]", fg: "text-sky-900", ring: "ring-sky-400", token: "var(--subject-math)", color: "#0284c7", tint: "#e0f2fe" },
  Maths: { icon: Calculator, bg: "bg-[var(--subject-math)]", fg: "text-sky-900", ring: "ring-sky-400", token: "var(--subject-math)", color: "#0284c7", tint: "#e0f2fe" },
  Science: { icon: Atom, bg: "bg-[var(--subject-science)]", fg: "text-emerald-900", ring: "ring-emerald-400", token: "var(--subject-science)", color: "#059669", tint: "#d1fae5" },
  Physics: { icon: Atom, bg: "bg-[var(--subject-physics)]", fg: "text-violet-900", ring: "ring-violet-400", token: "var(--subject-physics)", color: "#7c3aed", tint: "#ede9fe" },
  Chemistry: { icon: FlaskConical, bg: "bg-[var(--subject-chemistry)]", fg: "text-amber-900", ring: "ring-amber-400", token: "var(--subject-chemistry)", color: "#d97706", tint: "#fef3c7" },
  Biology: { icon: Dna, bg: "bg-[var(--subject-biology)]", fg: "text-green-900", ring: "ring-green-400", token: "var(--subject-biology)", color: "#16a34a", tint: "#dcfce7" },
  Biotechnology: { icon: Dna, bg: "bg-[var(--subject-biology)]", fg: "text-emerald-900", ring: "ring-emerald-400", token: "var(--subject-biology)", color: "#059669", tint: "#d1fae5" },
  Entrepreneurship: { icon: Briefcase, bg: "bg-[var(--subject-bst)]", fg: "text-violet-900", ring: "ring-violet-400", token: "var(--subject-bst)", color: "#7c3aed", tint: "#ede9fe" },
  "Computer Science": { icon: Code2, bg: "bg-[var(--subject-cs)]", fg: "text-slate-900", ring: "ring-slate-400", token: "var(--subject-cs)", color: "#475569", tint: "#f1f5f9" },
  "Informatics Practices": { icon: Code2, bg: "bg-[var(--subject-cs)]", fg: "text-slate-900", ring: "ring-slate-400", token: "var(--subject-cs)", color: "#475569", tint: "#f1f5f9" },
  English: { icon: Languages, bg: "bg-[var(--subject-english)]", fg: "text-rose-900", ring: "ring-rose-400", token: "var(--subject-english)", color: "#e11d48", tint: "#ffe4e6" },
  Hindi: { icon: Languages, bg: "bg-[var(--subject-hindi)]", fg: "text-orange-900", ring: "ring-orange-400", token: "var(--subject-hindi)", color: "#ea580c", tint: "#ffedd5" },
  Sanskrit: { icon: ScrollText, bg: "bg-[var(--subject-sanskrit)]", fg: "text-yellow-900", ring: "ring-yellow-500", token: "var(--subject-sanskrit)", color: "#ca8a04", tint: "#fef9c3" },
  "Social Science": { icon: Landmark, bg: "bg-[var(--subject-social)]", fg: "text-teal-900", ring: "ring-teal-400", token: "var(--subject-social)", color: "#0d9488", tint: "#ccfbf1" },
  History: { icon: Landmark, bg: "bg-[var(--subject-history)]", fg: "text-amber-950", ring: "ring-amber-500", token: "var(--subject-history)", color: "#b45309", tint: "#fef3c7" },
  Geography: { icon: Earth, bg: "bg-[var(--subject-geo)]", fg: "text-cyan-900", ring: "ring-cyan-400", token: "var(--subject-geo)", color: "#0891b2", tint: "#cffafe" },
  Civics: { icon: Scale, bg: "bg-[var(--subject-civics)]", fg: "text-indigo-900", ring: "ring-indigo-400", token: "var(--subject-civics)", color: "#4f46e5", tint: "#e0e7ff" },
  "Political Science": { icon: Scale, bg: "bg-[var(--subject-civics)]", fg: "text-indigo-900", ring: "ring-indigo-400", token: "var(--subject-civics)", color: "#4f46e5", tint: "#e0e7ff" },
  Economics: { icon: Briefcase, bg: "bg-[var(--subject-eco)]", fg: "text-lime-900", ring: "ring-lime-500", token: "var(--subject-eco)", color: "#65a30d", tint: "#ecfccb" },
  Accountancy: { icon: Briefcase, bg: "bg-[var(--subject-accounts)]", fg: "text-stone-900", ring: "ring-stone-400", token: "var(--subject-accounts)", color: "#57534e", tint: "#f5f5f4" },
  "Business Studies": { icon: Briefcase, bg: "bg-[var(--subject-bst)]", fg: "text-fuchsia-900", ring: "ring-fuchsia-400", token: "var(--subject-bst)", color: "#c026d3", tint: "#fae8ff" },
  EVS: { icon: Leaf, bg: "bg-[var(--subject-evs)]", fg: "text-green-900", ring: "ring-green-400", token: "var(--subject-evs)", color: "#16a34a", tint: "#bbf7d0" },
  "Environmental Studies": { icon: Leaf, bg: "bg-[var(--subject-evs)]", fg: "text-green-900", ring: "ring-green-400", token: "var(--subject-evs)", color: "#16a34a", tint: "#bbf7d0" },
  "Environmental Science": { icon: Leaf, bg: "bg-[var(--subject-evs)]", fg: "text-green-900", ring: "ring-green-400", token: "var(--subject-evs)", color: "#16a34a", tint: "#bbf7d0" },
};

export function subjectTheme(subject: string): SubjectTheme {
  return THEMES[subject] || DEFAULT_THEME;
}

export function displayChapterTitle(raw: string, chapterNumber?: number | null) {
  const cleaned = raw
    .replace(/^chapter\s*\d+\s*[–—:-]\s*/i, "")
    .replace(/^unit\s*\d+\s*[–—:-]\s*/i, "")
    .replace(/^\d+\s*[–—:-]\s*/, "")
    .trim();
  return cleaned || (chapterNumber ? `Chapter ${chapterNumber}` : raw);
}

export function chapterNumberLabel(chapterNumber?: number | null, index = 0) {
  const n = chapterNumber && chapterNumber > 0 ? chapterNumber : index + 1;
  return String(n).padStart(2, "0");
}

export const LAST_STUDY_KEY = "dlms_last_study_v1";
export const STUDY_PROGRESS_KEY = "dlms_study_progress_v1";

export type LastStudy = {
  classNumber: string;
  subject: string;
  chapterTitle: string;
  fileUrl?: string | null;
  ts: number;
};

export function readLastStudy(): LastStudy | null {
  try {
    const raw = localStorage.getItem(LAST_STUDY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.subject || !parsed?.chapterTitle) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLastStudy(entry: LastStudy) {
  try {
    localStorage.setItem(LAST_STUDY_KEY, JSON.stringify(entry));
  } catch {}
}

export function readStudyProgress(classNumber: string, subject: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(STUDY_PROGRESS_KEY);
    const all = raw ? JSON.parse(raw) : {};
    return all?.[classNumber]?.[subject] || {};
  } catch {
    return {};
  }
}

export function writeStudyProgress(classNumber: string, subject: string, chapterTitle: string, value: number) {
  try {
    const raw = localStorage.getItem(STUDY_PROGRESS_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[classNumber] = all[classNumber] || {};
    all[classNumber][subject] = all[classNumber][subject] || {};
    all[classNumber][subject][chapterTitle] = value;
    localStorage.setItem(STUDY_PROGRESS_KEY, JSON.stringify(all));
  } catch {}
}

export function progressLabel(value: number) {
  if (value >= 100) return "Done ✓";
  if (value > 0) return `${value}%`;
  return "Yet to start";
}
