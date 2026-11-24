import { inferAcademicSubject } from "@/lib/bookApi";

const AUTHOR_ALIASES: Array<[RegExp, string]> = [
  [/\bTUI\b/gi, "Tui"],
  [/\bTui\s+T\.?\s*Sutherland\b/i, "Tui T. Sutherland"],
  [/^A\.?\s*P\.?\s*J\.?\s*Abdul\s+Kalam$/i, "A. P. J. Abdul Kalam"],
  [/^Dr\.?\s*A\.?\s*P\.?\s*J\.?\s*Abdul\s+Kalam$/i, "A. P. J. Abdul Kalam"],
  [/^J\.?\s*K\.?\s*Rowling$/i, "J. K. Rowling"],
  [/^C\.?\s*S\.?\s*Lewis$/i, "C. S. Lewis"],
  [/^R\.?\s*K\.?\s*Narayan$/i, "R. K. Narayan"],
];

export function normalizeAuthorName(author?: string | null) {
  if (!author) return "Unknown author";
  let name = author.replace(/\s+/g, " ").trim();
  if (!name) return "Unknown author";
  name = name.replace(/\s*,\s*/g, ", ").replace(/\s+\./g, ".");
  for (const [pattern, replacement] of AUTHOR_ALIASES) {
    if (pattern.test(name)) {
      name = name.replace(pattern, replacement);
      break;
    }
  }
  name = name.replace(/\b([A-Z])\s+([A-Z])\s+/g, "$1. $2. ");
  return name;
}

export function normalizeIsbn(isbn?: string | null) {
  const clean = String(isbn || "").toUpperCase().replace(/[^0-9X]/g, "");
  if (/^\d{13}$/.test(clean)) return clean;
  if (/^\d{9}[\dX]$/.test(clean)) return clean;
  return "";
}

export function isbnCoverUrl(isbn?: string | null) {
  const clean = normalizeIsbn(isbn);
  return clean ? `https://covers.openlibrary.org/b/isbn/${clean}-L.jpg?default=false` : "";
}

export function catalogWorkKey(book: { isbn?: string | null; title?: string | null; author?: string | null; language?: string | null }) {
  const isbn = normalizeIsbn(book.isbn);
  if (isbn) return `isbn:${isbn}`;
  const title = String(book.title || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const author = normalizeAuthorName(book.author).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const language = String(book.language || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return `work:${title}::${author}::${language}`;
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
