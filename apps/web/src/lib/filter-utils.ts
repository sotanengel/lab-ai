import type { ColumnDefinition, ExperimentRow } from "@lab-ai/shared";
import { isNumericColumn, toNumberOrNull } from "./chart-utils";

export interface NumericRangeFilter {
  column: string;
  min: number | null;
  max: number | null;
}

export interface CategoryFilter {
  column: string;
  allowed: Set<string>;
}

export interface RowFilters {
  numeric: NumericRangeFilter[];
  category: CategoryFilter[];
}

export function createEmptyFilters(): RowFilters {
  return { numeric: [], category: [] };
}

export function applyFilters(rows: readonly ExperimentRow[], filters: RowFilters): ExperimentRow[] {
  if (filters.numeric.length === 0 && filters.category.length === 0) {
    return [...rows];
  }
  return rows.filter((row) => {
    for (const f of filters.numeric) {
      const n = toNumberOrNull(row[f.column]);
      if (n === null) continue;
      if (f.min !== null && n < f.min) return false;
      if (f.max !== null && n > f.max) return false;
    }
    for (const f of filters.category) {
      if (f.allowed.size === 0) continue;
      const raw = row[f.column];
      const key = raw === null || raw === undefined ? "" : String(raw);
      if (!f.allowed.has(key)) return false;
    }
    return true;
  });
}

export function collectCategories(
  rows: readonly ExperimentRow[],
  column: string,
  limit = 50,
): string[] {
  const seen = new Set<string>();
  for (const row of rows) {
    const raw = row[column];
    const key = raw === null || raw === undefined ? "" : String(raw);
    seen.add(key);
    if (seen.size >= limit) break;
  }
  return [...seen].sort();
}

export function columnRange(
  rows: readonly ExperimentRow[],
  column: string,
): { min: number; max: number } | null {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let found = false;
  for (const row of rows) {
    const n = toNumberOrNull(row[column]);
    if (n === null) continue;
    if (n < min) min = n;
    if (n > max) max = n;
    found = true;
  }
  if (!found) return null;
  return { min, max };
}

export function classifyColumn(
  columns: readonly ColumnDefinition[],
  name: string,
): "numeric" | "category" | null {
  const col = columns.find((c) => c.name === name);
  if (!col) return null;
  if (isNumericColumn(col)) return "numeric";
  if (col.type === "category" || col.type === "string" || col.type === "boolean") {
    return "category";
  }
  return null;
}
