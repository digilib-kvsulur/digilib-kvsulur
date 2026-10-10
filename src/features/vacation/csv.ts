import type { VacationExportRow } from "./types";

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function vacationRowsToCsv(rows: VacationExportRow[]): string {
  const header = [
    "activity_date",
    "activity_title",
    "student_name",
    "status",
    "points_awarded",
    "submitted_at",
    "reviewed_at",
  ];
  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [
        csvCell(row.activity_date),
        csvCell(row.activity_title),
        csvCell(row.student_name),
        csvCell(row.status),
        csvCell(row.points_awarded),
        csvCell(row.submitted_at),
        csvCell(row.reviewed_at),
      ].join(",")
    ),
  ];
  return lines.join("\n");
}
