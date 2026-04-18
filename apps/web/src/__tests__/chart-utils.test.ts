import { describe, expect, it } from "vitest";
import { buildHistogram, computeBoxStats, extractNumericSeries } from "@/lib/chart-utils";

describe("buildHistogram", () => {
  it("buckets values into the requested bin count", () => {
    const bins = buildHistogram([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5);
    expect(bins).toHaveLength(5);
    const total = bins.reduce((acc, b) => acc + b.count, 0);
    expect(total).toBe(10);
  });

  it("returns a single bin when all values are equal", () => {
    const bins = buildHistogram([4, 4, 4], 5);
    expect(bins).toHaveLength(1);
    expect(bins[0]?.count).toBe(3);
  });

  it("returns an empty array for empty input", () => {
    expect(buildHistogram([], 5)).toEqual([]);
  });
});

describe("computeBoxStats", () => {
  it("computes quartiles and detects outliers", () => {
    const stats = computeBoxStats([1, 2, 3, 4, 5, 6, 7, 8, 9, 100]);
    expect(stats).not.toBeNull();
    if (!stats) return;
    expect(stats.median).toBeCloseTo(5.5);
    expect(stats.outliers).toContain(100);
  });
});

describe("extractNumericSeries", () => {
  it("filters out non-numeric values", () => {
    const rows = [{ v: "1" }, { v: "x" }, { v: 3 }, { v: null }];
    expect(extractNumericSeries(rows, "v")).toEqual([1, 3]);
  });
});
