export interface MockPaperQuestion {
  prompt: string;
  options?: string[];
  correct_index?: number;
  explanation?: string;
  topic?: string;
}

export interface MockPaperSection {
  name: string;
  marks_per_question: number;
  questions: MockPaperQuestion[];
}

export interface MockPaper {
  duration_minutes: number;
  sections: MockPaperSection[];
}

export type MockPaperParseResult =
  | { data: MockPaper; error?: never }
  | { data?: never; error: string };

/**
 * Validates the mock-paper JSON stored in study_materials.markdown_content.
 * Objective questions have 2-6 options and a zero-based correct_index.
 * Written questions omit options and are saved with the attempt but not auto-graded.
 */
export function parseMockPaper(content: string | null | undefined): MockPaperParseResult {
  if (!content?.trim()) return { error: "Add a JSON mock paper before publishing this resource." };
  if (content.length > 120000) return { error: "Mock papers must be shorter than 120,000 characters." };

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { error: "Mock paper must be valid JSON." };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { error: "Mock paper must be a JSON object." };
  }
  const raw = parsed as Record<string, unknown>;
  const duration = Number(raw.duration_minutes);
  if (!Number.isFinite(duration) || duration < 5 || duration > 240) {
    return { error: "duration_minutes must be between 5 and 240." };
  }
  if (!Array.isArray(raw.sections) || raw.sections.length < 1 || raw.sections.length > 6) {
    return { error: "A mock paper needs between 1 and 6 sections." };
  }

  const sections: MockPaperSection[] = [];
  let totalQuestions = 0;

  for (const [sectionIndex, sectionItem] of raw.sections.entries()) {
    if (!sectionItem || typeof sectionItem !== "object" || Array.isArray(sectionItem)) {
      return { error: `Section ${sectionIndex + 1} must be an object.` };
    }
    const section = sectionItem as Record<string, unknown>;
    const name = typeof section.name === "string" && section.name.trim()
      ? section.name.trim().slice(0, 100)
      : `Section ${sectionIndex + 1}`;
    const marks = Number(section.marks_per_question ?? 1);
    if (!Number.isInteger(marks) || marks < 1 || marks > 20) {
      return { error: `Section ${sectionIndex + 1} needs marks_per_question between 1 and 20.` };
    }
    if (!Array.isArray(section.questions) || section.questions.length < 1 || section.questions.length > 50) {
      return { error: `Section ${sectionIndex + 1} needs between 1 and 50 questions.` };
    }

    const questions: MockPaperQuestion[] = [];
    for (const [questionIndex, questionItem] of section.questions.entries()) {
      totalQuestions += 1;
      if (totalQuestions > 120) return { error: "A mock paper can contain at most 120 questions." };
      if (!questionItem || typeof questionItem !== "object" || Array.isArray(questionItem)) {
        return { error: `Section ${sectionIndex + 1}, question ${questionIndex + 1} must be an object.` };
      }
      const question = questionItem as Record<string, unknown>;
      if (typeof question.prompt !== "string" || !question.prompt.trim() || question.prompt.length > 4000) {
        return { error: `Section ${sectionIndex + 1}, question ${questionIndex + 1} needs a prompt under 4,000 characters.` };
      }
      const explanation = question.explanation === undefined ? undefined : String(question.explanation);
      if (explanation && explanation.length > 4000) {
        return { error: `Section ${sectionIndex + 1}, question ${questionIndex + 1} has an explanation over 4,000 characters.` };
      }
      const topic = question.topic === undefined ? undefined : String(question.topic).slice(0, 120);
      const hasOptions = question.options !== undefined;
      if (!hasOptions) {
        questions.push({ prompt: question.prompt.trim(), ...(explanation ? { explanation: explanation.trim() } : {}), ...(topic ? { topic } : {}) });
        continue;
      }
      if (!Array.isArray(question.options) || question.options.length < 2 || question.options.length > 6
        || question.options.some((option) => typeof option !== "string" || !option.trim() || option.length > 600)) {
        return { error: `Section ${sectionIndex + 1}, question ${questionIndex + 1} needs 2–6 non-empty options under 600 characters each.` };
      }
      const correct = Number(question.correct_index);
      if (!Number.isInteger(correct) || correct < 0 || correct >= question.options.length) {
        return { error: `Section ${sectionIndex + 1}, question ${questionIndex + 1} needs a correct_index matching one of its options.` };
      }
      questions.push({
        prompt: question.prompt.trim(),
        options: (question.options as string[]).map((option) => option.trim()),
        correct_index: correct,
        ...(explanation ? { explanation: explanation.trim() } : {}),
        ...(topic ? { topic } : {}),
      });
    }
    sections.push({ name, marks_per_question: marks, questions });
  }

  return { data: { duration_minutes: Math.round(duration), sections } };
}
