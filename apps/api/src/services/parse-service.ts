import type { ColumnDefinition, ExperimentRow, SourceFormat } from "@lab-ai/shared";
import { inferColumnType } from "./column-inference.js";

export interface ParseResult {
  columns: Omit<ColumnDefinition, "id">[];
  rows: ExperimentRow[];
}

function detectDelimiter(headerLine: string): string {
  const candidates = [",", "\t", ";", "|"];
  let best = ",";
  let bestCount = 0;
  for (const d of candidates) {
    const count = headerLine.split(d).length;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function parseDelimited(text: string, delimiter?: string): ParseResult {
  const lines = text.split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length === 0) return { columns: [], rows: [] };

  const firstLine = lines[0];
  if (firstLine === undefined) return { columns: [], rows: [] };
  const sep = delimiter ?? detectDelimiter(firstLine);

  const headers = parseCsvLine(firstLine, sep).map((h) => h.trim());
  const dataRows: ExperimentRow[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const raw = lines[i];
    if (raw === undefined) continue;
    const fields = parseCsvLine(raw, sep);
    const row: ExperimentRow = {};
    for (let idx = 0; idx < headers.length; idx += 1) {
      const key = headers[idx] ?? `col_${idx}`;
      row[key] = fields[idx] ?? null;
    }
    dataRows.push(row);
  }

  const columns = headers.map((name, position) => {
    const samples = dataRows.slice(0, 100).map((r) => r[name]);
    return {
      name,
      type: inferColumnType(samples),
      unit: null,
      position,
    };
  });

  return { columns, rows: dataRows };
}

function parseJson(text: string): ParseResult {
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    throw new Error("JSON input must be an array of objects");
  }
  const rows: ExperimentRow[] = parsed.map((item) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("JSON array must contain plain objects");
    }
    return item as ExperimentRow;
  });

  const headerSet = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) headerSet.add(key);
  }
  const headers = [...headerSet];
  const columns = headers.map((name, position) => {
    const samples = rows.slice(0, 100).map((r) => r[name]);
    return { name, type: inferColumnType(samples), unit: null, position };
  });
  return { columns, rows };
}

export function parseInputText(text: string, format: SourceFormat): ParseResult {
  switch (format) {
    case "csv":
      return parseDelimited(text, ",");
    case "tsv":
      return parseDelimited(text, "\t");
    case "json":
      return parseJson(text);
    case "txt":
      return parseDelimited(text);
    default:
      throw new Error(`Unsupported source format: ${format satisfies never}`);
  }
}
