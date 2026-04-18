import type { ColumnDefinition, ExperimentDetail, ExperimentRow } from "@lab-ai/shared";
import ExcelJS from "exceljs";

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

function toCellValue(raw: unknown, type: ColumnDefinition["type"]): unknown {
  if (raw === null || raw === undefined || raw === "") return null;
  if (type === "number" || type === "integer") {
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? n : raw;
  }
  if (type === "boolean") {
    if (typeof raw === "boolean") return raw;
    if (raw === "true" || raw === "1") return true;
    if (raw === "false" || raw === "0") return false;
    return raw;
  }
  if (type === "datetime") {
    const str = typeof raw === "string" ? raw : String(raw);
    const d = new Date(str);
    return Number.isNaN(d.getTime()) ? str : d;
  }
  return typeof raw === "string" ? raw : String(raw);
}

export async function exportAsXlsx(
  detail: ExperimentDetail,
  rows: readonly ExperimentRow[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Lab AI";
  workbook.created = new Date();

  const dataSheet = workbook.addWorksheet("data");
  dataSheet.columns = detail.columns.map((c) => ({
    header: c.unit ? `${c.name} (${c.unit})` : c.name,
    key: c.name,
    width: Math.min(40, Math.max(12, c.name.length + 6)),
  }));
  dataSheet.getRow(1).font = { bold: true };
  for (const row of rows) {
    const out: Record<string, unknown> = {};
    for (const col of detail.columns) {
      out[col.name] = toCellValue(row[col.name], col.type);
    }
    dataSheet.addRow(out);
  }

  const metaSheet = workbook.addWorksheet("meta");
  metaSheet.columns = [
    { header: "field", key: "field", width: 24 },
    { header: "value", key: "value", width: 60 },
  ];
  metaSheet.getRow(1).font = { bold: true };
  const meta: [string, unknown][] = [
    ["id", detail.id],
    ["name", detail.name],
    ["description", detail.description ?? ""],
    ["sourceFormat", detail.sourceFormat],
    ["sourceFilename", detail.sourceFilename ?? ""],
    ["sourceHash", detail.sourceHash ?? ""],
    ["sourceSize", detail.sourceSize ?? ""],
    ["rowCount", detail.rowCount],
    ["registeredAt", detail.registeredAt],
    ["createdAt", detail.createdAt],
    ["updatedAt", detail.updatedAt],
    ["tags", detail.tags.join(", ")],
  ];
  for (const [field, value] of meta) {
    metaSheet.addRow({ field, value });
  }

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}
