import type { ColumnDefinition, ExperimentDetail, ExperimentRow } from "@lab-ai/shared";
import { describe, expect, it } from "vitest";
import { exportAsCsv, exportAsJson } from "../services/export-service.js";

const columns: ColumnDefinition[] = [
  { id: "c1", name: "time", type: "integer", position: 0 },
  { id: "c2", name: "note", type: "string", position: 1 },
];

describe("exportAsCsv", () => {
  it("emits header and rows", () => {
    const rows: ExperimentRow[] = [
      { time: 1, note: "ok" },
      { time: 2, note: "has,comma" },
    ];
    const csv = exportAsCsv(columns, rows);
    expect(csv).toBe('time,note\n1,ok\n2,"has,comma"\n');
  });

  it("escapes quotes", () => {
    const rows: ExperimentRow[] = [{ time: 1, note: 'he said "hi"' }];
    const csv = exportAsCsv(columns, rows);
    expect(csv).toContain('"he said ""hi"""');
  });
});

describe("exportAsJson", () => {
  it("returns a JSON object with experiment and rows", () => {
    const detail: ExperimentDetail = {
      id: "e1",
      name: "test",
      description: null,
      tags: [],
      sourceFormat: "csv",
      sourceFilename: null,
      sourceHash: null,
      sourceSize: null,
      rowCount: 1,
      archived: false,
      registeredAt: "2026-04-18T00:00:00.000Z",
      createdAt: "2026-04-18T00:00:00.000Z",
      updatedAt: "2026-04-18T00:00:00.000Z",
      columns,
    };
    const json = exportAsJson(detail, [{ time: 1, note: "x" }]);
    const parsed = JSON.parse(json);
    expect(parsed.experiment.id).toBe("e1");
    expect(parsed.rows).toHaveLength(1);
  });
});
