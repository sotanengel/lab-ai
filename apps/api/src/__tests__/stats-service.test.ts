import type { ColumnDefinition, ExperimentRow } from "@lab-ai/shared";
import { describe, expect, it } from "vitest";
import { computeColumnStats } from "../services/stats-service.js";

describe("computeColumnStats", () => {
  it("computes basic statistics for a numeric column", () => {
    const columns: ColumnDefinition[] = [
      { id: "c1", name: "value", type: "number", position: 0 },
    ];
    const rows: ExperimentRow[] = [
      { value: 1 },
      { value: 2 },
      { value: 3 },
      { value: 4 },
      { value: 5 },
    ];
    const [stats] = computeColumnStats(columns, rows);
    expect(stats).toBeDefined();
    if (!stats) return;
    expect(stats.count).toBe(5);
    expect(stats.min).toBe(1);
    expect(stats.max).toBe(5);
    expect(stats.mean).toBe(3);
    expect(stats.median).toBe(3);
  });

  it("handles null and empty values", () => {
    const columns: ColumnDefinition[] = [
      { id: "c1", name: "value", type: "number", position: 0 },
    ];
    const rows: ExperimentRow[] = [{ value: 1 }, { value: null }, { value: "" }, { value: 3 }];
    const [stats] = computeColumnStats(columns, rows);
    expect(stats).toBeDefined();
    if (!stats) return;
    expect(stats.count).toBe(4);
    expect(stats.nullCount).toBe(2);
    expect(stats.mean).toBe(2);
  });
});
