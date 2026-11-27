#!/usr/bin/env node
/**
 * Validate the Class 11 science content batch before it is imported.
 *
 * Usage:
 *   node scripts/validate-class11-content.mjs <content-dir>
 *
 * The batch is intentionally kept outside the student-visible path until a
 * subject teacher approves each row in Study Materials Hub.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const EXPECTED = {
  Physics: 14,
  Chemistry: 9,
  Mathematics: 14,
  Biology: 19,
};
const FORMATS = new Set(["mcq", "short", "numerical", "long", "assertion_reason"]);
const TYPES = new Set(["board", "jee_style", "neet_style"]);
const errors = [];
const warnings = [];
const summary = [];

const dir = resolve(process.argv[2] || "supabase/content/class11-science");
const files = readdirSync(dir).filter((name) => name.endsWith(".json"));

function fail(file, message) {
  errors.push(`${file}: ${message}`);
}

function optionIndex(answer, options, format) {
  const text = String(answer ?? "").trim();
  if (!text) return -1;
  if (options.length) {
    const prefixed = text.match(/^\(?([A-F])\)?[.)]?\s*/i);
    if (prefixed) {
      const index = prefixed[1].toUpperCase().charCodeAt(0) - 65;
      if (index >= 0 && index < options.length) return index;
    }
    const exact = options.findIndex((option) => option.trim() === text);
    if (exact >= 0) return exact;
    const suffix = options.findIndex((option) => text.endsWith(option.trim()));
    if (suffix >= 0) return suffix;
    const contained = options.findIndex((option) => option.trim().length >= 4 && text.includes(option.trim()));
    if (contained >= 0) return contained;
  }
  if (format === "assertion_reason") {
    if (/not the correct explanation|does not explain|not explain/i.test(text)) return 1;
    if (/A (?:is )?true.{0,20}R (?:is )?false|A true, R false/i.test(text)) return 2;
    if (/A (?:is )?false.{0,20}R (?:is )?true|A false, R true/i.test(text)) return 3;
    if (/correct explanation|explains A/i.test(text)) return 0;
  }
  return -1;
}

for (const file of files) {
  const data = JSON.parse(readFileSync(join(dir, file), "utf8"));
  const subject = data.subject;
  if (data.class !== 11 && data.class !== "11") fail(file, `class is ${data.class}, expected 11`);
  if (!EXPECTED[subject]) fail(file, `unknown subject ${subject}`);
  if (data.status !== "needs_review") fail(file, `status is ${data.status}, expected needs_review`);
  if (!Array.isArray(data.chapters)) fail(file, "chapters must be an array");
  if (data.chapters?.length !== EXPECTED[subject]) {
    fail(file, `${data.chapters.length} chapters, expected ${EXPECTED[subject]}`);
  }

  const chapterNumbers = new Set();
  let notes = 0, formulas = 0, practice = 0, written = 0, revision = 0, mcqs = 0;
  for (const chapter of data.chapters || []) {
    const where = `${file} ch ${chapter.number}`;
    if (!chapter.title?.trim()) fail(where, "missing title");
    if (chapterNumbers.has(chapter.number)) fail(where, "duplicate chapter number");
    chapterNumbers.add(chapter.number);
    if (!chapter.ncert_part) warnings.push(`${where}: missing ncert_part`);
    if (!Array.isArray(chapter.notes) || !chapter.notes.length) fail(where, "no notes");
    if (!Array.isArray(chapter.formulas) || !chapter.formulas.length) fail(where, "no formulas");
    if (!Array.isArray(chapter.pyqs) || !chapter.pyqs.length) fail(where, "no pyqs");
    if (!Array.isArray(chapter.quick_revision) || !chapter.quick_revision.length) fail(where, "no quick_revision");

    for (const [index, note] of (chapter.notes || []).entries()) {
      notes += 1;
      if (!note.heading?.trim()) fail(`${where} note ${index + 1}`, "missing heading");
      if (!note.body_md?.trim()) fail(`${where} note ${index + 1}`, "missing body_md");
      if (note.heading?.length > 240) fail(`${where} note ${index + 1}`, "heading over 240 chars");
    }
    for (const [index, formula] of (chapter.formulas || []).entries()) {
      formulas += 1;
      if (!formula.name?.trim()) fail(`${where} formula ${index + 1}`, "missing name");
      if (!formula.latex?.trim()) fail(`${where} formula ${index + 1}`, "missing latex");
      if (/\$/.test(formula.latex || "")) fail(`${where} formula ${index + 1}`, "latex must not include $ delimiters");
    }
    for (const [index, card] of (chapter.quick_revision || []).entries()) {
      revision += 1;
      if (!card.front?.trim()) fail(`${where} revision ${index + 1}`, "missing front");
      if (!card.back?.trim()) fail(`${where} revision ${index + 1}`, "missing back");
    }

    const questions = [];
    for (const [index, question] of (chapter.pyqs || []).entries()) {
      const label = `${where} pyq ${index + 1}`;
      if (!TYPES.has(question.type)) fail(label, `unknown type ${question.type}`);
      if (!FORMATS.has(question.format)) fail(label, `unknown format ${question.format}`);
      if (question.status !== "needs_review") fail(label, `status ${question.status}, expected needs_review`);
      if (!question.question?.trim()) fail(label, "missing question");
      if (!question.answer?.trim()) fail(label, "missing answer");
      if (!question.solution_md?.trim()) fail(label, "missing solution_md");
      if (!Number.isInteger(question.marks) || question.marks < 1) fail(label, "invalid marks");
      if (question.question?.length > 2500) fail(label, "question over 2500 chars");
      if (question.solution_md?.length > 3000) fail(label, "solution over 3000 chars");
      if (question.options && ![0, 2, 3, 4, 5, 6].includes(question.options.length)) fail(label, "unsupported option count");
      if (question.options?.some((option) => !String(option).trim() || String(option).length > 500)) fail(label, "invalid option");

      const interactive = question.format === "mcq" || question.format === "assertion_reason";
      if (interactive) {
        if (question.options?.length !== 4) fail(label, `interactive question has ${question.options?.length ?? 0} options`);
        const correct = optionIndex(question.answer, question.options || [], question.format);
        if (correct < 0) fail(label, `could not map answer "${question.answer}" to an option`);
        else questions.push({
          prompt: question.question.trim(),
          options: question.options.map((option) => String(option).trim()),
          correct_index: correct,
          explanation: question.solution_md.trim(),
        });
        mcqs += 1;
      } else {
        if (question.options?.length) fail(label, "written question should not have options");
        written += 1;
      }
    }
    if (questions.length) practice += 1;
  }
  summary.push({ subject, chapters: data.chapters.length, notes, formulas, practice_sets: practice, mcq_questions: mcqs, written, revision });
}

console.log("Content validation summary");
for (const row of summary) console.log(JSON.stringify(row));
if (warnings.length) {
  console.log(`\nWarnings (${warnings.length})`);
  for (const warning of warnings) console.log(`- ${warning}`);
}
if (errors.length) {
  console.error(`\nErrors (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("\nAll checks passed.");
