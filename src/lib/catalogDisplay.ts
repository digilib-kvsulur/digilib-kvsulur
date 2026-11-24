import { inferAcademicSubject } from "@/lib/bookApi";

export function normalizeAuthorName(author?: string | null) {
  if (!author) return "Unknown author";
  let name = author.replace(/\s+/g, " ").trim();
  name = name.replace(/\bTUI\b/gi, "Tui");
  name = name.replace(/\bTui\s+T\s+Sutherland\b/i, "Tui T. Sutherland");
  name = name.replace(/^A\.?\s*P\.?\s*J\.?\s*Abdul\s+Kalam$/i, "A. P. J. Abdul Kalam");
  return name;
}

const GENRE_ALIASES: Record<string, string> = {
  "General Literature": "",
  Literature: "",
  General: "",
};

export function displayGenre(category?: string | null, title?: string, author?: string) {
  const raw = (category || "").trim();
  const aliased = raw in GENRE_ALIASES ? GENRE_ALIASES[raw] : raw;
  if (aliased) return aliased;
  const inferred = inferAcademicSubject(title || "", [author || ""]);
  if (inferred) return inferred;
  const text = `${title || ""} ${author || ""}`.toLowerCase();
  if (/(biography|autobiography|kalam|wings of fire)/.test(text)) return "Biography";
  if (/(fantasy|dragon|wings of fire|harry potter|narnia)/.test(text)) return "Fantasy";
  if (/(dictionary|encyclopedia|atlas|reference)/.test(text)) return "Reference";
  if (/(fiction|novel|story)/.test(text)) return "Fiction";
  return raw || "Library";
}

export function coverHue(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return hash % 360;
}
