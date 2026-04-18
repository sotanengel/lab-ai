import type { ColumnDefinition, ExperimentRow, ExperimentStats } from "@lab-ai/shared";

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function median(sortedValues: readonly number[]): number | null {
  if (sortedValues.length === 0) return null;
  const mid = Math.floor(sortedValues.length / 2);
  const a = sortedValues[mid];
  if (a === undefined) return null;
  if (sortedValues.length % 2 === 0) {
    const b = sortedValues[mid - 1];
    if (b === undefined) return null;
    return (a + b) / 2;
  }
  return a;
}

export function computeColumnStats(
  columns: readonly ColumnDefinition[],
  rows: readonly ExperimentRow[],
): ExperimentStats[] {
  return columns.map((col) => {
    const rawValues = rows.map((r) => r[col.name]);
    let nullCount = 0;
    const numericValues: number[] = [];
    for (const value of rawValues) {
      if (value === null || value === undefined || value === "") {
        nullCount += 1;
        continue;
      }
      if (col.type === "number" || col.type === "integer") {
        const n = toNumberOrNull(value);
        if (n !== null) numericValues.push(n);
      }
    }

    if (numericValues.length === 0) {
      return {
        column: col.name,
        count: rawValues.length,
        nullCount,
        min: null,
        max: null,
        mean: null,
        median: null,
        stddev: null,
      };
    }

    const sorted = [...numericValues].sort((a, b) => a - b);
    const sum = numericValues.reduce((acc, n) => acc + n, 0);
    const mean = sum / numericValues.length;
    const variance =
      numericValues.reduce((acc, n) => acc + (n - mean) ** 2, 0) / numericValues.length;
    return {
      column: col.name,
      count: rawValues.length,
      nullCount,
      min: sorted[0] ?? null,
      max: sorted[sorted.length - 1] ?? null,
      mean,
      median: median(sorted),
      stddev: Math.sqrt(variance),
    };
  });
}
