#!/usr/bin/env node
/**
 * Build the SQL that imports the Class 11 science batch as pending review.
 *
 * Usage:
 *   node scripts/import-class11-content.mjs <content-dir> <out-dir> <uploaded-by-uuid>
 *
 * The generated SQL is intentionally not committed: it contains the full
 * Markdown payload. Re-run this script when the batch changes, then execute the
 * subject SQL files with `supabase db query --linked -f <file>`.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";

const contentDir = resolve(process.argv[2] || "supabase/content/class11-science");
const outDir = resolve(process.argv[3] || "tmp/class11-import");
const uploadedBy = process.argv[4];
if (!uploadedBy) {
  console.error("Usage: node scripts/import-class11-content.mjs <content-dir> <out-dir> <uploaded-by-uuid>");
  process.exit(1);
}

const FORMAT_LABEL = {
  short: "short answer",
  numerical: "numerical",
  long: "long answer",
};
const PATTERN_LABEL = {
  board: "CBSE pattern",
  jee_style: "JEE pattern",
  neet_style: "NEET pattern",
};

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

function clean(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function dollarQuote(payload) {
  let tag = `dlms_class11_${randomBytes(6).toString("hex")}`;
  while (payload.includes(`$${tag}$`)) tag = `dlms_class11_${randomBytes(6).toString("hex")}`;
  return `$${tag}$${payload}$${tag}$`;
}

const rowsBySubject = new Map();
const summary = [];

for (const file of readdirSync(contentDir).filter((name) => name.endsWith(".json")).sort()) {
  const data = JSON.parse(readFileSync(join(contentDir, file), "utf8"));
  const rows = [];
  const counts = { subject: data.subject, chapters: data.chapters.length, notes: 0, formulas: 0, practice_sets: 0, practice_questions: 0, written: 0, revision: 0 };

  for (const chapter of data.chapters) {
    const common = {
      subject: data.subject,
      student_class: "11",
      chapter_title: chapter.title,
      academic_session: "2026-27",
      file_name: "class11-batch1",
      file_type: "markdown",
      exam_year: null,
    };

    for (const note of chapter.notes) {
      rows.push({
        ...common,
        title: note.heading,
        description: null,
        resource_type: "short_notes",
        marks: null,
        source_label: "AI-assisted study notes",
        source_url: null,
        markdown_content: note.body_md,
      });
      counts.notes += 1;
    }

    for (const formula of chapter.formulas) {
      rows.push({
        ...common,
        title: formula.name,
        description: [formula.variables, formula.note].filter(Boolean).join(" · ") || null,
        resource_type: "formula_sheet",
        marks: null,
        source_label: null,
        source_url: null,
        markdown_content: formula.latex,
      });
      counts.formulas += 1;
    }

    for (const card of chapter.quick_revision) {
      rows.push({
        ...common,
        title: card.front,
        description: null,
        resource_type: "quick_revision",
        marks: null,
        source_label: null,
        source_url: null,
        markdown_content: card.back,
      });
      counts.revision += 1;
    }

    const interactive = [];
    const written = [];
    for (const question of chapter.pyqs) {
      if (question.format === "mcq" || question.format === "assertion_reason") {
        const correct = optionIndex(question.answer, question.options || [], question.format);
        if (correct < 0) throw new Error(`${data.subject} ${chapter.title}: cannot map answer "${question.answer}"`);
        interactive.push({
          prompt: question.question,
          options: question.options,
          correct_index: correct,
          explanation: question.solution_md,
        });
      } else {
        written.push(question);
      }
    }

    if (interactive.length) {
      rows.push({
        ...common,
        title: "Practice set — MCQ and assertion-reason",
        description: "Original multiple-choice practice. These are not previous-year questions.",
        resource_type: "chapter_practice",
        marks: null,
        source_label: "Original practice · CBSE & JEE/NEET style",
        source_url: null,
        markdown_content: JSON.stringify({
          instructions: "Answer these original practice questions. They are not previous-year questions.",
          questions: interactive,
        }),
      });
      counts.practice_sets += 1;
      counts.practice_questions += interactive.length;
    }

    for (const [index, question] of written.entries()) {
      const formatLabel = FORMAT_LABEL[question.format] || question.format;
      rows.push({
        ...common,
        title: `Practice — ${formatLabel} ${index + 1}`,
        description: `**Answer:** ${question.answer}\n\n**Solution:** ${question.solution_md}`,
        resource_type: "pyq",
        marks: question.marks,
        source_label: `Original practice · ${PATTERN_LABEL[question.type] || "exam pattern"}`,
        source_url: null,
        markdown_content: question.question,
      });
      counts.written += 1;
    }
  }

  rowsBySubject.set(data.subject, rows);
  summary.push(counts);
}

mkdirSync(outDir, { recursive: true });
for (const [subject, rows] of rowsBySubject) {
  const payload = JSON.stringify(rows);
  const sql = `begin;

-- Guard against importing over reviewed work. A reviewed batch should be
-- updated through Study Materials Hub, not by deleting and re-inserting.
do $guard$
begin
  if exists (
    select 1 from public.study_materials
    where file_name = 'class11-batch1' and review_status = 'approved'
  ) then
    raise exception 'Class 11 batch 1 already has approved rows; update them through the review workflow instead.';
  end if;
end
$guard$;

delete from public.study_materials
where file_name = 'class11-batch1'
  and student_class = '11'
  and subject = ${sqlLiteral(subject)}
  and review_status = 'pending';

with payload as (
  select * from jsonb_to_recordset(${dollarQuote(payload)}) as x(
    title text,
    description text,
    subject text,
    student_class text,
    chapter_title text,
    resource_type text,
    academic_session text,
    exam_year integer,
    marks integer,
    source_label text,
    source_url text,
    markdown_content text,
    file_name text,
    file_type text
  )
)
insert into public.study_materials (
  title, description, subject, student_class, chapter_title, resource_type,
  academic_session, exam_year, marks, source_label, source_url,
  markdown_content, file_name, file_type, uploaded_by, review_status
)
select
  title, description, subject, student_class, chapter_title, resource_type,
  academic_session, exam_year, marks, source_label, source_url,
  markdown_content, file_name, file_type, ${sqlLiteral(uploadedBy)}, 'pending'
from payload;

commit;
`;
  const filename = join(outDir, `${subject.toLowerCase().replaceAll(" ", "-")}.sql`);
  writeFileSync(filename, sql, "utf8");
  console.log(`${subject}: ${rows.length} rows -> ${filename}`);
}

console.log("\nImport summary");
for (const row of summary) console.log(JSON.stringify(row));
