export interface ChapterPracticeQuestion {
  prompt: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface ChapterPracticeSet {
  instructions?: string;
  questions: ChapterPracticeQuestion[];
}

export type ChapterPracticeParseResult =
  | { data: ChapterPracticeSet; error?: never }
  | { data?: never; error: string };

export function parseChapterPracticeSet(content: string | null | undefined): ChapterPracticeParseResult {
  if (!content?.trim()) return { error: "Add a JSON practice set before submitting this resource." };
  if (content.length > 80000) return { error: "Practice sets must be shorter than 80,000 characters." };

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { error: "Practice set must be valid JSON." };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { error: "Practice set must be a JSON object." };
  }
  const set = parsed as Record<string, unknown>;
  if (set.instructions !== undefined && (typeof set.instructions !== "string" || set.instructions.length > 500)) {
    return { error: "Practice instructions must be text under 500 characters." };
  }
  if (!Array.isArray(set.questions) || set.questions.length < 1 || set.questions.length > 20) {
    return { error: "A practice set must contain between 1 and 20 questions." };
  }

  const questions: ChapterPracticeQuestion[] = [];
  for (const [index, item] of set.questions.entries()) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return { error: `Question ${index + 1} must be an object.` };
    const question = item as Record<string, unknown>;
    if (typeof question.prompt !== "string" || !question.prompt.trim() || question.prompt.length > 2500) {
      return { error: `Question ${index + 1} needs a prompt under 2,500 characters.` };
    }
    if (!Array.isArray(question.options) || question.options.length < 2 || question.options.length > 6
      || question.options.some((option) => typeof option !== "string" || !option.trim() || option.length > 500)) {
      return { error: `Question ${index + 1} needs 2–6 non-empty options under 500 characters each.` };
    }
    if (!Number.isInteger(question.correct_index) || Number(question.correct_index) < 0 || Number(question.correct_index) >= question.options.length) {
      return { error: `Question ${index + 1} needs a correct_index matching one of its options.` };
    }
    if (typeof question.explanation !== "string" || !question.explanation.trim() || question.explanation.length > 3000) {
      return { error: `Question ${index + 1} needs an explanation under 3,000 characters.` };
    }
    questions.push({
      prompt: question.prompt.trim(),
      options: (question.options as string[]).map((option) => option.trim()),
      correct_index: Number(question.correct_index),
      explanation: question.explanation.trim(),
    });
  }

  return { data: { instructions: typeof set.instructions === "string" ? set.instructions.trim() : undefined, questions } };
}
