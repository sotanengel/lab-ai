import type { ColumnDefinition, ExperimentDetail, ExperimentRow } from "@lab-ai/shared";

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "string" ? value : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportAsCsv(
  columns: readonly ColumnDefinition[],
  rows: readonly ExperimentRow[],
): string {
  const header = columns.map((c) => escapeCsv(c.name)).join(",");
  const body = rows.map((row) => columns.map((c) => escapeCsv(row[c.name])).join(",")).join("\n");
  return `${header}\n${body}\n`;
}

export function exportAsJson(detail: ExperimentDetail, rows: readonly ExperimentRow[]): string {
  return JSON.stringify(
    {
      experiment: detail,
      rows,
    },
    null,
    2,
  );
}
