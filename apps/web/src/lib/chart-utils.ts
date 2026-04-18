import type { ColumnDefinition, ExperimentRow } from "@lab-ai/shared";

export const NUMERIC_TYPES: ReadonlySet<ColumnDefinition["type"]> = new Set(["number", "integer"]);

export function isNumericColumn(col: ColumnDefinition): boolean {
  return NUMERIC_TYPES.has(col.type);
}

export function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export interface HistogramBin {
  label: string;
  from: number;
  to: number;
  count: number;
}

export function buildHistogram(values: readonly number[], binCount: number): HistogramBin[] {
  if (values.length === 0 || binCount <= 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    return [{ label: min.toString(), from: min, to: max, count: values.length }];
  }
  const width = (max - min) / binCount;
  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => {
    const from = min + width * i;
    const to = i === binCount - 1 ? max : from + width;
    return {
      label: `${from.toFixed(2)}〜${to.toFixed(2)}`,
      from,
      to,
      count: 0,
    };
  });
  for (const v of values) {
    let idx = Math.floor((v - min) / width);
    if (idx >= binCount) idx = binCount - 1;
    if (idx < 0) idx = 0;
    const bin = bins[idx];
    if (bin) bin.count += 1;
  }
  return bins;
}

export interface BoxStats {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers: number[];
}

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return Number.NaN;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const a = sorted[lo];
  const b = sorted[hi];
  if (a === undefined || b === undefined) return Number.NaN;
  return a + (b - a) * (idx - lo);
}

export function computeBoxStats(values: readonly number[]): BoxStats | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = percentile(sorted, 0.25);
  const median = percentile(sorted, 0.5);
  const q3 = percentile(sorted, 0.75);
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const outliers = sorted.filter((v) => v < lowerFence || v > upperFence);
  const min = Math.min(...sorted.filter((v) => v >= lowerFence));
  const max = Math.max(...sorted.filter((v) => v <= upperFence));
  return { min, q1, median, q3, max, outliers };
}

export function extractNumericSeries(rows: readonly ExperimentRow[], columnName: string): number[] {
  const out: number[] = [];
  for (const row of rows) {
    const n = toNumberOrNull(row[columnName]);
    if (n !== null) out.push(n);
  }
  return out;
}
