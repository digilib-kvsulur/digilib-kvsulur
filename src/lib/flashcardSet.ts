export interface FlashcardSeed {
  front: string;
  back: string;
  hint?: string;
}

export type FlashcardParseResult =
  | { data: FlashcardSeed[]; error?: never }
  | { data?: never; error: string };

/**
 * Validates the flashcard JSON stored in study_materials.markdown_content.
 * Accepts either a bare array or { cards: [...] }. Each card needs a front
 * (question) and back (answer). Duplicate content is ignored when seeded.
 */
export function parseFlashcardSet(content: string | null | undefined): FlashcardParseResult {
  if (!content?.trim()) return { error: "Add flashcard JSON before publishing this resource." };
  if (content.length > 120000) return { error: "Flashcard sets must be shorter than 120,000 characters." };

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { error: "Flashcards must be valid JSON." };
  }

  const list = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as Record<string, unknown>).cards)
      ? (parsed as { cards: unknown[] }).cards
      : null;

  if (!list) return { error: 'Use a JSON array of cards, or an object shaped like { "cards": [...] }.' };
  if (list.length < 1 || list.length > 200) return { error: "A flashcard set needs between 1 and 200 cards." };

  const cards: FlashcardSeed[] = [];
  for (const [index, item] of list.entries()) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { error: `Card ${index + 1} must be an object with a front and back.` };
    }
    const card = item as Record<string, unknown>;
    const front = typeof card.front === "string" ? card.front.trim() : "";
    const back = typeof card.back === "string" ? card.back.trim() : "";
    if (!front || front.length > 1200) {
      return { error: `Card ${index + 1} needs a question (front) under 1,200 characters.` };
    }
    if (!back || back.length > 4000) {
      return { error: `Card ${index + 1} needs an answer (back) under 4,000 characters.` };
    }
    const hint = typeof card.hint === "string" ? card.hint.trim().slice(0, 500) : "";
    cards.push({ front, back, ...(hint ? { hint } : {}) });
  }

  return { data: cards };
}
