import type { ColumnDefinition, ExperimentDetail } from "@lab-ai/shared";
import { describe, expect, it } from "vitest";
import { compareIntegrity } from "../services/integrity-service.js";
import { computeColumnStats } from "../services/stats-service.js";

const columns: ColumnDefinition[] = [
  { id: "c1", name: "time", type: "integer", position: 0 },
  { id: "c2", name: "value", type: "number", position: 1 },
];

const detail: ExperimentDetail = {
  id: "exp-1",
  name: "Test",
  description: null,
  tags: [],
  sourceFormat: "csv",
  sourceFilename: "data.csv",
  sourceHash: "a".repeat(64),
  sourceSize: 100,
  rowCount: 3,
  archived: false,
  registeredAt: "2026-04-18T00:00:00.000Z",
  createdAt: "2026-04-18T00:00:00.000Z",
  updatedAt: "2026-04-18T00:00:00.000Z",
  columns,
};

const rows = [
  { time: 1, value: 10 },
  { time: 2, value: 20 },
  { time: 3, value: 30 },
];

describe("compareIntegrity", () => {
  it("reports perfect match when hash + stats align", () => {
    const stats = computeColumnStats(columns, rows);
    const result = compareIntegrity({
      detail,
      registeredStats: stats,
      registeredHash: "a".repeat(64),
      uploadedHash: "a".repeat(64),
      uploadedColumns: columns,
      uploadedRows: rows,
    });
    expect(result.overallMatches).toBe(true);
    expect(result.hashMatches).toBe(true);
    expect(result.missingColumns).toEqual([]);
    expect(result.extraColumns).toEqual([]);
  });

  it("flags hash mismatch but matching stats", () => {
    const stats = computeColumnStats(columns, rows);
    const result = compareIntegrity({
      detail,
      registeredStats: stats,
      registeredHash: "a".repeat(64),
      uploadedHash: "b".repeat(64),
      uploadedColumns: columns,
      uploadedRows: rows,
    });
    expect(result.hashMatches).toBe(false);
    expect(result.overallMatches).toBe(false);
  });

  it("flags missing column", () => {
    const stats = computeColumnStats(columns, rows);
    const result = compareIntegrity({
      detail,
      registeredStats: stats,
      registeredHash: "a".repeat(64),
      uploadedHash: "a".repeat(64),
      uploadedColumns: [{ name: "time" }],
      uploadedRows: rows.map((r) => ({ time: r.time })),
    });
    expect(result.missingColumns).toContain("value");
    expect(result.overallMatches).toBe(false);
  });

  it("detects a statistical divergence", () => {
    const stats = computeColumnStats(columns, rows);
    const tampered = rows.map((r) => ({ ...r, value: r.value * 2 }));
    const result = compareIntegrity({
      detail,
      registeredStats: stats,
      registeredHash: "a".repeat(64),
      uploadedHash: "a".repeat(64),
      uploadedColumns: columns,
      uploadedRows: tampered,
    });
    const valueDelta = result.stats.find((s) => s.column === "value");
    expect(valueDelta?.matches).toBe(false);
    expect(result.overallMatches).toBe(false);
  });
});
