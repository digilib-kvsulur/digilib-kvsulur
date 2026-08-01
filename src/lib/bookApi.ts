/**
 * Book Details Fetcher API
 * Auto-fetches rich metadata (cover, description, category, subject, language) 
 * from Google Books API and falls back to Open Library API or AI Smart Generation.
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
}

const ROMAN_MAP: Record<string, string> = {
  i: "1", ii: "2", iii: "3", iv: "4", v: "5", vi: "6", vii: "7", viii: "8", ix: "9", x: "10", xi: "11", xii: "12"
};

const inferClassLevel = (title: string, subjects: string[] = []): string => {
  const text = `${title} ${subjects.join(" ")}`.toLowerCase();
  const digitMatch = text.match(/(?:class|grade|standard|std)\s*(\d{1,2})\b/i);
  if (digitMatch) return digitMatch[1];
  
  const romanMatch = text.match(/(?:class|grade|standard|std)\s*(xi{0,2}|ix|vi{0,3}|iv|i{1,3})\b/i);
  if (romanMatch && ROMAN_MAP[romanMatch[1]]) {
    return ROMAN_MAP[romanMatch[1]];
  }
  return "";
};

const CATEGORY_KEYWORDS = [
  "Fiction", "Non-fiction", "Science", "Mathematics", "History", "Biography", 
  "Poetry", "Drama", "Philosophy", "Religion", "Technology", "Textbook", "Reference", "Literature"
];

// Helper to map languages
const mapLanguage = (langCode: string): string => {
  if (!langCode) return "";
  const code = langCode.toLowerCase().trim();
  if (code.startsWith("en")) return "English";
  if (code.startsWith("hi")) return "Hindi";
  if (code.startsWith("ta")) return "Tamil";
  if (code.startsWith("te")) return "Telugu";
  if (code.startsWith("ml")) return "Malayalam";
  if (code.startsWith("kn")) return "Kannada";
  return langCode.toUpperCase();
};

const inferCategory = (title: string, subjects: string[] = []): string => {
  const text = `${title} ${subjects.join(" ")}`.toLowerCase();
  if (
    text.includes("dictionary") ||
    text.includes("encyclopedia") ||
    text.includes("encyclopaedia") ||
    text.includes("atlas") ||
    text.includes("reference") ||
    text.includes("handbook") ||
    text.includes("thesaurus")
  ) {
    return "Reference";
  }

  const found = CATEGORY_KEYWORDS.find(kw => 
    subjects.some(subj => subj.toLowerCase().includes(kw.toLowerCase()))
  );
  if (found) return found;

  if (text.includes("math") || text.includes("arithmetic") || text.includes("algebra") || text.includes("geometry")) return "Mathematics";
  if (text.includes("science") || text.includes("physics") || text.includes("chemistry") || text.includes("biology") || text.includes("botany") || text.includes("zoology")) return "Science";
  if (text.includes("history") || text.includes("historical")) return "History";
  if (text.includes("biography") || text.includes("autobiography") || text.includes("memoir")) return "Biography";
  if (text.includes("poem") || text.includes("poetry") || text.includes("verse")) return "Poetry";
  if (text.includes("drama") || text.includes("play") || text.includes("tragedy") || text.includes("comedy")) return "Drama";

  return "General Literature";
};

const fetchInternetArchiveCover = async (title: string, author?: string): Promise<string> => {
  try {
    const query = encodeURIComponent(`title:(${title})${author ? ` AND creator:(${author})` : ""}`);
    const response = await fetch(`https://archive.org/advancedsearch.php?q=${query}&fl[]=identifier&rows=1&output=json`);
    const identifier = response.ok ? (await response.json())?.response?.docs?.[0]?.identifier : null;
    return identifier ? `https://archive.org/services/img/${identifier}` : "";
  } catch { return ""; }
};

/**
 * Generate a smart, rich educational summary if API description is missing or empty.
 */
export function generateSmartBookDescription(title: string, author?: string, category?: string): string {
  const cleanTitle = title.trim();
  const cleanAuthor = author ? author.trim() : "Unknown Author";
  const cleanCategory = category || "Literature & General Reading";

  return `"${cleanTitle}" is a highly valued work by ${cleanAuthor}, cataloged under ${cleanCategory} in the PM SHRI Kendriya Vidyalaya AFS Sulur Digital Library collection. This book offers students and literature enthusiasts deep insights, compelling narratives, and fundamental knowledge designed to enhance reading comprehension and intellectual growth. It serves as an essential resource for academic study, reference, and personal enrichment.`;
}

/**
 * Fetch book details by ISBN
 */
export async function fetchBookByIsbn(isbn: string): Promise<FetchedBookDetails | null> {
  const cleanIsbn = isbn.replace(/[-\s]/g, "").trim();
  if (!cleanIsbn) return null;

  let details: FetchedBookDetails | null = null;

  try {
    // 1) Try Google Books first
    const googleRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`);
    if (googleRes.ok) {
      const data = await googleRes.json();
      if (data.items && data.items.length > 0) {
        const info = data.items[0].volumeInfo;
        let cover = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || "";
        if (cover.startsWith("http://")) cover = cover.replace("http://", "https://");

        details = {
          title: info.title || "",
          author: info.authors?.join(", ") || "",
          description: info.description || "",
          cover_url: cover,
          category: inferCategory(info.title || "", info.categories || []),
          subject: info.categories?.join(", ") || "",
          language: mapLanguage(info.language || ""),
          class_level: inferClassLevel(info.title || "", info.categories || []),
        };
      }
    }
  } catch (error) {
    console.error("Google Books ISBN fetch failed:", error);
  }

  // 2) Fallback to Open Library if missing
  if (!details) {
    try {
      const olRes = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&format=json&jscmd=data`);
      if (olRes.ok) {
        const data = await olRes.json();
        const key = `ISBN:${cleanIsbn}`;
        if (data[key]) {
          const info = data[key];
          const cover = info.cover?.large || info.cover?.medium || info.cover?.small || "";
          const subjects = (info.subjects || []).map((s: any) => s.name);
          
          details = {
            title: info.title || "",
            author: info.authors?.map((a: any) => a.name).join(", ") || "",
            description: typeof info.notes === 'string' ? info.notes : "",
            cover_url: cover,
            category: inferCategory(info.title || "", subjects),
            subject: subjects.slice(0, 3).join(", "),
            language: "English",
            class_level: inferClassLevel(info.title || "", subjects),
          };
        }
      }
    } catch (error) {
      console.error("Open Library ISBN fetch failed:", error);
    }
  }

  if (details) {
    if (!details.description || details.description.trim().length < 20) {
      details.description = generateSmartBookDescription(details.title || cleanIsbn, details.author, details.category);
    }
  }

  return details;
}

/**
 * Fetch book details by Title and optional Author
 */
export async function fetchBookByQuery(title: string, author?: string): Promise<FetchedBookDetails | null> {
  const queryParts = [];
  const searchTitle = title.trim();
  const searchAuthor = author?.trim() || "";
  
  const isNcertOrClass = searchTitle.toLowerCase().includes("ncert") || 
                         searchAuthor.toLowerCase().includes("ncert") || 
                         /class\s*\d+/i.test(searchTitle);

  if (searchTitle) queryParts.push(`intitle:${searchTitle}`);
  if (searchAuthor) queryParts.push(`inauthor:${searchAuthor}`);
  if (isNcertOrClass && !searchTitle.toLowerCase().includes("ncert")) {
    queryParts.push("NCERT");
  }

  const query = encodeURIComponent(queryParts.join(" "));

  if (!query) return null;
  let details: FetchedBookDetails | null = null;

  try {
    // 1) Try Google Books
    const googleRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`);
    if (googleRes.ok) {
      const data = await googleRes.json();
      if (data.items && data.items.length > 0) {
        const info = data.items[0].volumeInfo;
        let cover = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || "";
        if (cover.startsWith("http://")) cover = cover.replace("http://", "https://");

        details = {
          title: info.title || "",
          author: info.authors?.join(", ") || "",
          description: info.description || "",
          cover_url: cover,
          category: inferCategory(info.title || "", info.categories || []),
          subject: info.categories?.join(", ") || "",
          language: mapLanguage(info.language || ""),
          class_level: inferClassLevel(info.title || "", info.categories || []),
        };
      }
    }
  } catch (error) {
    console.error("Google Books query fetch failed:", error);
  }

  // 2) Fallback to Open Library
  if (!details) {
    try {
      let qStr = `${searchTitle} ${searchAuthor}`.trim();
      if (isNcertOrClass && !qStr.toLowerCase().includes("ncert")) qStr += " NCERT";
      const q = encodeURIComponent(qStr);
      const olRes = await fetch(`https://openlibrary.org/search.json?q=${q}&limit=1`);
      if (olRes.ok) {
        const data = await olRes.json();
        if (data.docs && data.docs.length > 0) {
          const doc = data.docs[0];
          const cover = doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : "";
          const subjects = doc.subject || [];
          const lang = (doc.language || [])[0] || "";

          details = {
            title: doc.title || "",
            author: doc.author_name?.join(", ") || "",
            cover_url: cover,
            category: inferCategory(doc.title || "", subjects),
            subject: subjects.slice(0, 3).join(", "),
            language: mapLanguage(lang),
            class_level: inferClassLevel(doc.title || "", subjects),
          };
        }
      }
    } catch (error) {
      console.error("Open Library query fetch failed:", error);
    }
  }

  // 3) Internet Archive provides an additional cover source when catalogues have no image.
  if (details && !details.cover_url) details.cover_url = await fetchInternetArchiveCover(details.title || title, details.author || author);

  // If we found details or if external API gave sparse info, ensure we have a rich description and category
  if (!details && title) {
    const inferred = inferCategory(title, []);
    details = {
      title: title.trim(),
      author: author?.trim() || "Famous Author",
      category: inferred,
      language: "English",
      description: generateSmartBookDescription(title, author, inferred),
    };
  } else if (details) {
    if (!details.category) details.category = inferCategory(details.title || title, []);
    if (!details.description || details.description.trim().length < 20) {
      details.description = generateSmartBookDescription(details.title || title, details.author || author, details.category);
    }
    if (!details.language) details.language = "English";
  }

  return details;
}
