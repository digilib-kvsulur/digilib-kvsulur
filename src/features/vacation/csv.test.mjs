import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ts = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "csv.ts"), "utf8");
const js = ts
  .replace(/import type[^\n]+\n/, "")
  .replace(/: VacationExportRow\[\]/g, "")
  .replace(/: unknown/g, "")
  .replace(/: string/g, "")
  .replace(/export /g, "");
const { csvCell, vacationRowsToCsv } = new Function(`${js}; return { csvCell, vacationRowsToCsv };`)();

test("csvCell escapes quotes, commas, newlines and formula prefixes", () => {
  assert.equal(csvCell(null), "");
  assert.equal(csvCell("hello"), "hello");
  assert.equal(csvCell("a,b"), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell("line\nbreak"), '"line\nbreak"');
  assert.equal(csvCell("=SUM(A1)"), "'=SUM(A1)");
  assert.equal(csvCell("+1"), "'+1");
  assert.equal(csvCell("-1"), "'-1");
  assert.equal(csvCell("@cmd"), "'@cmd");
});

test("vacationRowsToCsv writes a header and escaped rows", () => {
  const csv = vacationRowsToCsv([
    {
      activity_date: "2026-10-10",
      activity_title: "STEAM, Challenge",
      student_name: "Ada Lovelace",
      status: "approved",
      points_awarded: 10,
      submitted_at: "2026-10-10T10:00:00Z",
      reviewed_at: null,
    },
  ]);
  assert.ok(csv.startsWith("activity_date,activity_title,student_name,status,points_awarded,submitted_at,reviewed_at"));
  assert.ok(csv.includes('"STEAM, Challenge"'));
  assert.ok(csv.includes("Ada Lovelace"));
});
