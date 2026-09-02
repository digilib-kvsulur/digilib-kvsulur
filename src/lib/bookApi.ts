/**
 * Book Details Fetcher API
 * Auto-fetches rich metadata (cover, description, category, subject, language)
 * from Google Books, Open Library, and Internet Archive — with smart fallbacks.
 */

export interface FetchedBookDetails {
  title?: string;
  author?: string;
  description?: string;
  cover_url?: string;
  category?: string;
  subject?: string;
  language?: string;
  class_level?: string;
  isbn?: string;
}

const ROMAN_MAP: Record<string, string> = {
  i: "1", ii: "2", iii: "3", iv: "4", v: "5", vi: "6", vii: "7", viii: "8", ix: "9", x: "10", xi: "11", xii: "12",
};

const stripHtml = (html: string): string =>
  html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const normalizeTitle = (t: string) =>
  t.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

/** Score how well an API result matches the library title/author */
const matchScore = (wantTitle: string, wantAuthor: string, gotTitle: string, gotAuthor: string): number => {
  const wt = normalizeTitle(wantTitle);
  const gt = normalizeTitle(gotTitle || "");
  if (!wt || !gt) return 0;
  let score = 0;
  if (gt === wt) score += 100;
  else if (gt.includes(wt) || wt.includes(gt)) score += 70;
  else {
    const wWords = wt.split(" ").filter((w) => w.length > 2);
    const hits = wWords.filter((w) => gt.includes(w)).length;
    score += wWords.length ? (hits / wWords.length) * 50 : 0;
  }
  if (wantAuthor) {
    const wa = normalizeTitle(wantAuthor);
    const ga = normalizeTitle(gotAuthor || "");
    if (ga && (ga.includes(wa) || wa.includes(ga))) score += 25;
  }
  return score;
};

const enlargeCover = (url: string): string => {
  if (!url) return "";
  let u = url.startsWith("http://") ? url.replace("http://", "https://") : url;
  // Google Books zoom
  u = u.replace(/zoom=\d/, "zoom=2");
  u = u.replace(/&edge=curl/, "");
  // Open Library size
  u = u.replace(/-S\.jpg/i, "-L.jpg").replace(/-M\.jpg/i, "-L.jpg");
  return u;
};

export const inferAcademicSubject = (title: string, subjects: string[] = []): string => {
  const text = `${title} ${subjects.join(" ")}`.toLowerCase();

  if (/(physics|bhautiki)/.test(text)) return "Physics";
  if (/(chemistry|rasayan)/.test(text)) return "Chemistry";
  if (/(biology|botany|zoology|jiv vigyan)/.test(text)) return "Biology";
  if (/(math|mathematics|arithmetic|algebra|geometry|ganit)/.test(text)) return "Mathematics";
  if (/(computer science|python|programming|informatics practices|computer applications|coding|c\+\+)/.test(text)) return "Computer Science";
  if (/(accountancy|accounting|accounts|lekhashastra)/.test(text)) return "Accountancy";
  if (/(business studies|vyavasay adhyayan)/.test(text)) return "Business Studies";
  if (/(economics|arthashastra)/.test(text)) return "Economics";
  if (/(history|itihas)/.test(text)) return "History";
  if (/(geography|bhugol)/.test(text)) return "Geography";
  if (/(political science|civics|rajniti vigyan)/.test(text)) return "Political Science";
  if (/(social science|social studies|samajik vigyan)/.test(text)) return "Social Science";
  if (/(environmental science|evs|paryavaran)/.test(text)) return "Environmental Studies";
  if (/(sanskrit|shemushi|manika|ruchira)/.test(text)) return "Sanskrit";
  if (/(hindi|vasant|sparsh|kshitij|kritika|durva|sanchayan|rimjhim)/.test(text)) return "Hindi";
  if (/(english|beehive|honeydew|flamingo|vistas|first flight|footprints)/.test(text)) return "English";
  if (/(science|vigyan)/.test(text)) return "Science";

  return "";
};

export const inferClassLevel = (title: string, subjects: string[] = []): string => {
  const text = `${title} ${subjects.join(" ")}`.toLowerCase();
  const explicitDigitMatch = text.match(/(?:class|grade|standard|std)\s*(\d{1,2})\b/i);
  if (explicitDigitMatch) return explicitDigitMatch[1];
  const explicitRomanMatch = text.match(/(?:class|grade|standard|std)\s*(xi{0,2}|ix|vi{0,3}|iv|i{1,3})\b/i);
  if (explicitRomanMatch && ROMAN_MAP[explicitRomanMatch[1]]) {
    return ROMAN_MAP[explicitRomanMatch[1]];
  }
  const trailingRomanMatch = text.match(/\b(xi{0,2}|ix|vi{0,3}|iv|i{1,3})(?:th)?\b\s*$/i);
  if (trailingRomanMatch && ROMAN_MAP[trailingRomanMatch[1]]) {
    return ROMAN_MAP[trailingRomanMatch[1]];
  }
  const trailingDigitMatch = text.match(/\b(\d{1,2})(?:th|st|nd|rd)?\b\s*$/i);
  if (trailingDigitMatch) {
    const num = parseInt(trailingDigitMatch[1]);
    if (num >= 1 && num <= 12) return trailingDigitMatch[1];
  }
  return "";
};

const CATEGORY_KEYWORDS = [
  "Fiction", "Non-fiction", "Science", "Mathematics", "History", "Biography",
  "Poetry", "Drama", "Philosophy", "Religion", "Technology", "Textbook", "Reference", "Literature",
];

export const mapLanguage = (langCode: string): string => {
  if (!langCode) return "";
  const code = langCode.toLowerCase().trim();
  if (code.startsWith("en")) return "English";
  if (code.startsWith("hi")) return "Hindi";
  if (code.startsWith("ta")) return "Tamil";
  if (code.startsWith("te")) return "Telugu";
  if (code.startsWith("ml")) return "Malayalam";
  if (code.startsWith("kn")) return "Kannada";
  if (code.startsWith("sa")) return "Sanskrit";
  return langCode.toUpperCase();
};

export const inferLanguageFromTitle = (title: string, rawLang = ""): string => {
  if (rawLang) {
    const mapped = mapLanguage(rawLang);
    if (mapped) return mapped;
  }
  if (/[\u0900-\u097F]/.test(title)) return "Hindi";

  const text = title.toLowerCase();
  if (/(shemushi|manika|ruchira|abhyaswaan)/.test(text)) return "Sanskrit";
  if (/(vasant|sparsh|kshitij|kritika|durva|sanchayan|rimjhim|rasayan|bhautiki|ganit|itihas|bhugol|arthashastra|rajniti vigyan|vyavasay|lekhashastra)/.test(text)) return "Hindi";

  return "English";
};

export const isAcademicBook = (title: string, category = "", subject = ""): boolean => {
  const text = `${title} ${category} ${subject}`.toLowerCase();
  if (category === "Reference Material" || category === "Textbook") return true;
  return /(ncert|cbse|class\s*\d|grade\s*\d|std\s*\d|physics|chemistry|biology|math|mathematics|science|social science|history|geography|economics|political science|accountancy|business studies|computer science|informatics practices|rasayan|bhautiki|ganit|itihas|bhugol)/i.test(text);
};

export const inferCategory = (title: string, subjects: string[] = []): string => {
  const text = `${title} ${subjects.join(" ")}`.toLowerCase();
  if (/(ncert|cbse|textbook|class|std|grade|part\s*\d|volume\s*\d|physics|chemistry|biology|math|mathematics|science|history|geography|economics|accountancy)/.test(text)) {
    return "Reference Material";
  }
  if (/(dictionary|encyclopedia|encyclopaedia|atlas|reference|handbook|thesaurus|workbook|solution)/.test(text)) {
    return "Reference Book";
  }
  if (/(novel|fiction|story|stories|tale|adventures|potter|panchatantra)/.test(text)) return "Fiction";
  if (/(literature|classic|prose|essay)/.test(text)) return "Literature";
  if (/(biography|autobiography|memoir)/.test(text)) return "Biography";
  if (/(poem|poetry|verse)/.test(text)) return "Poetry";
  if (/(drama|play|tragedy|comedy)/.test(text)) return "Drama";
  const found = CATEGORY_KEYWORDS.find((kw) =>
    subjects.some((subj) => subj.toLowerCase().includes(kw.toLowerCase()))
  );
  if (found) return found;
  return "Fiction";
};

export const inferAcademicDetails = (title: string, author = "", subjects: string[] = []): {
  class_level: string;
  subject: string;
  category: string;
  language: string;
} => {
  const subject = inferAcademicSubject(title, subjects);
  const class_level = inferClassLevel(title, subjects);
  const language = inferLanguageFromTitle(title);
  let category = inferCategory(title, subjects);

  const text = `${title} ${author} ${subjects.join(" ")}`.toLowerCase();
  if (subject || class_level || /(ncert|cbse|textbook)/.test(text)) {
    category = "Reference Material";
  }

  return { class_level, subject, category, language };
};

const fetchInternetArchiveCover = async (title: string, author?: string): Promise<string> => {
  try {
    const query = encodeURIComponent(`title:(${title})${author ? ` AND creator:(${author})` : ""}`);
    const response = await fetch(
      `https://archive.org/advancedsearch.php?q=${query}&fl[]=identifier&rows=1&output=json`,
      { signal: AbortSignal.timeout(8000) }
    );
    const identifier = response.ok ? (await response.json())?.response?.docs?.[0]?.identifier : null;
    return identifier ? `https://archive.org/services/img/${identifier}` : "";
  } catch {
    return "";
  }
};

/** Open Library work description by OLID / work key */
const fetchOpenLibraryDescription = async (workKey: string): Promise<string> => {
  try {
    if (!workKey) return "";
    const key = workKey.startsWith("/") ? workKey : `/works/${workKey}`;
    const res = await fetch(`https://openlibrary.org${key}.json`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return "";
    const data = await res.json();
    const desc = data.description;
    if (typeof desc === "string") return stripHtml(desc);
    if (desc?.value) return stripHtml(String(desc.value));
    return "";
  } catch {
    return "";
  }
};

export function generateSmartBookDescription(title: string, author?: string, category?: string): string {
  const cleanTitle = title.trim();
  const cleanAuthor = author && author.trim() && author.toLowerCase() !== "unknown author" ? author.trim() : "";
  const t = cleanTitle.toLowerCase();
  const cat = (category || "").toLowerCase();

  // Academic Subject-Specific Overviews
  if (/(physics|bhautiki)/i.test(t)) {
    return `Academic study material for Physics (${cleanTitle}). Covers fundamental concepts, physical laws, formulas, solved examples, and practical applications aligned with the NCERT / CBSE curriculum for KV students.`;
  }
  if (/(chemistry|rasayan)/i.test(t)) {
    return `In-depth Chemistry reference (${cleanTitle}). Explores atomic structure, chemical equations, periodic trends, organic synthesis, and laboratory fundamentals for school studies and entrance examinations.`;
  }
  if (/(biology|botany|zoology|jiv vigyan)/i.test(t)) {
    return `Comprehensive Biology study guide (${cleanTitle}). Details cell biology, genetics, human physiology, plant morphology, and ecological systems for conceptual understanding and exam preparation.`;
  }
  if (/(math|mathematics|algebra|geometry|calculus|ganit)/i.test(t)) {
    return `Essential Mathematics reference (${cleanTitle}). Provides step-by-step proofs, algebraic formulas, geometric theorems, and practice problem sets designed to build analytical and problem-solving skills.`;
  }
  if (/(computer science|python|informatics|programming|coding)/i.test(t)) {
    return `Computer Science and IT guide (${cleanTitle}). Introduces programming logic, data structures, algorithms, database management, and software applications for school and technical learning.`;
  }
  if (/(accountancy|accounting|business studies|lekhashastra|vyavasay)/i.test(t)) {
    return `Commerce and Business reference (${cleanTitle}). Explains core accounting principles, financial balance sheets, business administration, and economic management fundamentals.`;
  }
  if (/(history|geography|civics|political science|social science|itihas|bhugol)/i.test(t)) {
    return `Social Science reference (${cleanTitle}). Examines historical events, geographical landscapes, democratic governance, and social structures for holistic general awareness and academic study.`;
  }
  if (/(dictionary|encyclopedia|atlas|thesaurus)/i.test(t) || cat.includes("reference")) {
    return `Comprehensive reference work (${cleanTitle}). Provides definitions, geographical maps, contextual facts, and quick-access data for library research and study reference.`;
  }
  if (/(biography|autobiography|memoir|life of)/i.test(t) || cat.includes("biography")) {
    return `Inspiring biographical account (${cleanTitle})${cleanAuthor ? ` by ${cleanAuthor}` : ""}. Chronicles key historical milestones, personal achievements, and notable contributions that shape human history.`;
  }
  if (/(novel|story|stories|fiction|tale|adventures|potter)/i.test(t) || cat.includes("fiction") || cat.includes("novel")) {
    return `Engaging work of fiction titled "${cleanTitle}"${cleanAuthor ? ` by ${cleanAuthor}` : ""}. Features rich storytelling, narrative themes, and character journeys for reading enjoyment and literary appreciation.`;
  }
  if (/(poem|poetry|verse|drama|play)/i.test(t) || cat.includes("poetry") || cat.includes("drama")) {
    return `Literary collection titled "${cleanTitle}"${cleanAuthor ? ` by ${cleanAuthor}` : ""}. Showcases poetic expression, dramatic dialogue, and artistic themes for language and literature appreciation.`;
  }

  // General Dynamic Overview
  const byAuthor = cleanAuthor ? ` written by ${cleanAuthor}` : "";
  return `"${cleanTitle}" is a cataloged work${byAuthor} in the Kendriya Vidyalaya Digital Library under ${category || "General Literature"}. It serves as a resource for academic study, reference, and reading enrichment.`;
}

const fromGoogleItem = (info: any): FetchedBookDetails => {
  let cover = info.imageLinks?.extraLarge
    || info.imageLinks?.large
    || info.imageLinks?.medium
    || info.imageLinks?.thumbnail
    || info.imageLinks?.smallThumbnail
    || "";
  cover = enlargeCover(cover);
  const desc = info.description ? stripHtml(info.description) : "";
  const isbns = (info.industryIdentifiers || []) as { type: string; identifier: string }[];
  const isbn13 = isbns.find((i) => i.type === "ISBN_13")?.identifier;
  const isbn10 = isbns.find((i) => i.type === "ISBN_10")?.identifier;
  return {
    title: info.title || "",
    author: info.authors?.join(", ") || "",
    description: desc,
    cover_url: cover,
    category: inferCategory(info.title || "", info.categories || []),
    subject: (info.categories || []).join(", "),
    language: mapLanguage(info.language || ""),
    class_level: inferClassLevel(info.title || "", info.categories || []),
    isbn: isbn13 || isbn10 || "",
  };
};

async function googleBooksSearch(q: string, wantTitle: string, wantAuthor: string): Promise<FetchedBookDetails | null> {
  try {
    const googleRes = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=8&printType=books`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!googleRes.ok) return null;
    const data = await googleRes.json();
    const items = data.items || [];
    if (!items.length) return null;

    let best: FetchedBookDetails | null = null;
    let bestScore = -1;
    for (const item of items) {
      const info = item.volumeInfo || {};
      const candidate = fromGoogleItem(info);
      const score = matchScore(wantTitle, wantAuthor, candidate.title || "", candidate.author || "");
      // Prefer entries that have a description + cover
      const richness = (candidate.description ? 8 : 0) + (candidate.cover_url ? 5 : 0);
      const total = score + richness;
      if (total > bestScore) {
        bestScore = total;
        best = candidate;
      }
    }
    // Reject very weak matches when we had a specific title
    if (wantTitle && bestScore < 20) return null;
    return best;
  } catch (error) {
    console.error("Google Books search failed:", error);
    return null;
  }
}

async function openLibrarySearch(title: string, author: string): Promise<FetchedBookDetails | null> {
  try {
    const params = new URLSearchParams();
    params.set("title", title);
    if (author) params.set("author", author);
    params.set("limit", "8");
    const olRes = await fetch(`https://openlibrary.org/search.json?${params}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!olRes.ok) return null;
    const data = await olRes.json();
    const docs = data.docs || [];
    if (!docs.length) return null;

    let bestDoc: any = null;
    let bestScore = -1;
    for (const doc of docs) {
      const score = matchScore(title, author, doc.title || "", (doc.author_name || []).join(", "));
      const richness = (doc.cover_i ? 5 : 0) + (doc.first_sentence ? 3 : 0);
      if (score + richness > bestScore) {
        bestScore = score + richness;
        bestDoc = doc;
      }
    }
    if (!bestDoc || (title && bestScore < 20)) return null;

    const subjects = bestDoc.subject || [];
    const lang = (bestDoc.language || [])[0] || "";
    let description = "";
    if (bestDoc.first_sentence) {
      description = Array.isArray(bestDoc.first_sentence)
        ? bestDoc.first_sentence.join(" ")
        : String(bestDoc.first_sentence);
    }
    if ((!description || description.length < 40) && bestDoc.key) {
      description = (await fetchOpenLibraryDescription(bestDoc.key)) || description;
    }

    const isbn = (bestDoc.isbn || [])[0] || "";
    return {
      title: bestDoc.title || "",
      author: bestDoc.author_name?.join(", ") || "",
      description: description ? stripHtml(description) : "",
      cover_url: bestDoc.cover_i
        ? `https://covers.openlibrary.org/b/id/${bestDoc.cover_i}-L.jpg`
        : isbn
          ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
          : "",
      category: inferCategory(bestDoc.title || "", subjects),
      subject: subjects.slice(0, 3).join(", "),
      language: mapLanguage(lang),
      class_level: inferClassLevel(bestDoc.title || "", subjects),
      isbn,
    };
  } catch (error) {
    console.error("Open Library search failed:", error);
    return null;
  }
}

const mergeDetails = (primary: FetchedBookDetails | null, secondary: FetchedBookDetails | null): FetchedBookDetails | null => {
  if (!primary && !secondary) return null;
  if (!primary) return secondary;
  if (!secondary) return primary;
  return {
    title: primary.title || secondary.title,
    author: primary.author || secondary.author,
    description:
      (primary.description && primary.description.length >= 40 ? primary.description : null)
      || secondary.description
      || primary.description,
    cover_url: primary.cover_url || secondary.cover_url,
    category: primary.category || secondary.category,
    subject: primary.subject || secondary.subject,
    language: primary.language || secondary.language,
    class_level: primary.class_level || secondary.class_level,
    isbn: primary.isbn || secondary.isbn,
  };
};

export async function fetchBookByIsbn(isbn: string): Promise<FetchedBookDetails | null> {
  const cleanIsbn = isbn.replace(/[-\s]/g, "").trim();
  if (!cleanIsbn) return null;

  const [google, ol] = await Promise.all([
    googleBooksSearch(`isbn:${cleanIsbn}`, "", ""),
    (async () => {
      try {
        const olRes = await fetch(
          `https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&format=json&jscmd=data`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (!olRes.ok) return null;
        const data = await olRes.json();
        const info = data[`ISBN:${cleanIsbn}`];
        if (!info) return null;
        const subjects = (info.subjects || []).map((s: any) => s.name);
        let description = typeof info.notes === "string" ? info.notes : "";
        if ((!description || description.length < 40) && info.identifiers?.openlibrary?.[0]) {
          // skip
        }
        return {
          title: info.title || "",
          author: info.authors?.map((a: any) => a.name).join(", ") || "",
          description: description ? stripHtml(description) : "",
          cover_url: enlargeCover(info.cover?.large || info.cover?.medium || info.cover?.small || ""),
          category: inferCategory(info.title || "", subjects),
          subject: subjects.slice(0, 3).join(", "),
          language: "English",
          class_level: inferClassLevel(info.title || "", subjects),
          isbn: cleanIsbn,
        } as FetchedBookDetails;
      } catch {
        return null;
      }
    })(),
  ]);

  let details = mergeDetails(google, ol);
  if (details && !details.cover_url) {
    details.cover_url = await fetchInternetArchiveCover(details.title || cleanIsbn, details.author);
  }
  if (details && (!details.description || details.description.trim().length < 20)) {
    details.description = generateSmartBookDescription(details.title || cleanIsbn, details.author, details.category);
  }
  return details;
}

const API_CACHE = new Map<string, FetchedBookDetails | null>();

/**
 * Fetch book details by Title and optional Author (and optional ISBN).
 */
export async function fetchBookByQuery(
  title: string,
  author?: string,
  isbn?: string
): Promise<FetchedBookDetails | null> {
  const searchTitle = title.trim();
  const searchAuthor = author?.trim() || "";
  const cleanIsbn = isbn?.replace(/[-\s]/g, "").trim() || "";
  const cacheKey = `${searchTitle.toLowerCase()}|${searchAuthor.toLowerCase()}|${cleanIsbn}`;

  if (API_CACHE.has(cacheKey)) {
    return API_CACHE.get(cacheKey)!;
  }

  let result: FetchedBookDetails | null = null;
  if (cleanIsbn) {
    const byIsbn = await fetchBookByIsbn(cleanIsbn);
    if (byIsbn && (byIsbn.description || byIsbn.cover_url)) {
      // Fill any gaps with title search
      const byTitle = await fetchBookByQueryInternal(searchTitle, searchAuthor);
      result = mergeDetails(byIsbn, byTitle);
    }
  }

  if (!result) {
    result = await fetchBookByQueryInternal(searchTitle, searchAuthor);
  }

  API_CACHE.set(cacheKey, result);
  return result;
}

async function fetchBookByQueryInternal(searchTitle: string, searchAuthor: string): Promise<FetchedBookDetails | null> {
  if (!searchTitle) return null;

  const isNcertOrClass =
    searchTitle.toLowerCase().includes("ncert") ||
    searchAuthor.toLowerCase().includes("ncert") ||
    /class\s*\d+/i.test(searchTitle);

  const googleParts = [`intitle:${searchTitle}`];
  if (searchAuthor) googleParts.push(`inauthor:${searchAuthor}`);
  if (isNcertOrClass && !searchTitle.toLowerCase().includes("ncert")) googleParts.push("NCERT");

  // Run Google + Open Library in parallel
  const [google, ol] = await Promise.all([
    googleBooksSearch(googleParts.join(" "), searchTitle, searchAuthor),
    openLibrarySearch(searchTitle, searchAuthor),
  ]);

  let details = mergeDetails(google, ol);

  // Looser Google retry without intitle: if both failed
  if (!details) {
    const looseQ = [searchTitle, searchAuthor, isNcertOrClass ? "NCERT" : ""].filter(Boolean).join(" ");
    details = await googleBooksSearch(looseQ, searchTitle, searchAuthor);
  }

  if (details && !details.cover_url) {
    details.cover_url = await fetchInternetArchiveCover(details.title || searchTitle, details.author || searchAuthor);
  }

  if (!details) {
    const inferred = inferCategory(searchTitle, []);
    details = {
      title: searchTitle,
      author: searchAuthor || "",
      category: inferred,
      language: "English",
      description: generateSmartBookDescription(searchTitle, searchAuthor, inferred),
    };
  } else {
    if (!details.category) details.category = inferCategory(details.title || searchTitle, []);
    if (!details.description || details.description.trim().length < 20) {
      details.description = generateSmartBookDescription(
        details.title || searchTitle,
        details.author || searchAuthor,
        details.category
      );
    }
    if (!details.language) details.language = "English";
  }

  return details;
}
