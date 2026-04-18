import type {
  ContextDocument,
  ExperimentDetail,
  ExperimentRow,
  ExperimentStats,
} from "@lab-ai/shared";
import { describe, expect, it } from "vitest";
import { buildAdviceContextBlocks } from "../services/advice-service.js";

describe("buildAdviceContextBlocks", () => {
  const experiment: ExperimentDetail = {
    id: "exp-1",
    name: "Thermal test",
    description: "Measures conductivity",
    tags: ["thermal"],
    sourceFormat: "csv",
    rowCount: 2,
    archived: false,
    createdAt: "2026-04-18T00:00:00.000Z",
    updatedAt: "2026-04-18T00:00:00.000Z",
    columns: [
      { id: "c1", name: "time", type: "number", unit: "s", position: 0 },
      { id: "c2", name: "temp", type: "number", unit: "°C", position: 1 },
    ],
  };
  const stats: ExperimentStats[] = [
    { column: "time", count: 2, nullCount: 0, min: 0, max: 1, mean: 0.5, median: 0.5, stddev: 0.5 },
    { column: "temp", count: 2, nullCount: 0, min: 20, max: 30, mean: 25, median: 25, stddev: 5 },
  ];
  const rows: ExperimentRow[] = [
    { time: 0, temp: 20 },
    { time: 1, temp: 30 },
  ];

  it("includes columns, stats, and sample rows", () => {
    const out = buildAdviceContextBlocks({
      experiment,
      stats,
      sampleRows: rows,
      contextDocuments: [],
    });
    expect(out).toContain("Thermal test");
    expect(out).toContain("time (number / s)");
    expect(out).toContain("temp: count=2");
    expect(out).toContain('"temp": 30');
  });

  it("truncates long context documents", () => {
    const doc: ContextDocument = {
      id: "d1",
      title: "Big Doc",
      kind: "text",
      sourceUrl: null,
      content: "x".repeat(5000),
      createdAt: "2026-04-18T00:00:00.000Z",
      updatedAt: "2026-04-18T00:00:00.000Z",
    };
    const out = buildAdviceContextBlocks({
      experiment,
      stats,
      sampleRows: rows,
      contextDocuments: [doc],
    });
    expect(out).toContain("### Big Doc (text)");
    expect(out).toContain("(truncated)");
  });
});
