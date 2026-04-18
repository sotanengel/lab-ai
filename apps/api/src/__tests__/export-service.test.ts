import type { ColumnDefinition, ExperimentDetail, ExperimentRow } from "@lab-ai/shared";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { exportAsCsv, exportAsJson, exportAsXlsx } from "../services/export-service.js";

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

const sampleDetail: ExperimentDetail = {
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

describe("exportAsJson", () => {
  it("returns a JSON object with experiment and rows", () => {
    const json = exportAsJson(sampleDetail, [{ time: 1, note: "x" }]);
    const parsed = JSON.parse(json);
    expect(parsed.experiment.id).toBe("e1");
    expect(parsed.rows).toHaveLength(1);
  });
});

describe("exportAsXlsx", () => {
  it("produces a two-sheet workbook with typed cells and meta", async () => {
    const buf = await exportAsXlsx(sampleDetail, [
      { time: 1, note: "ok" },
      { time: 2, note: "" },
    ]);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const data = wb.getWorksheet("data");
    const meta = wb.getWorksheet("meta");
    expect(data).toBeDefined();
    expect(meta).toBeDefined();
    if (!data || !meta) return;
    expect(data.getRow(1).getCell(1).value).toBe("time");
    expect(data.getRow(2).getCell(1).value).toBe(1);
    const metaFields = [] as string[];
    meta.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const field = row.getCell(1).value;
      if (typeof field === "string") metaFields.push(field);
    });
    expect(metaFields).toContain("id");
    expect(metaFields).toContain("sourceFormat");
  });

  it("coerces booleans, numbers, and dates; keeps empty cells null", async () => {
    const typedColumns: ColumnDefinition[] = [
      { id: "c1", name: "bool", type: "boolean", position: 0 },
      { id: "c2", name: "num", type: "number", position: 1 },
      { id: "c3", name: "when", type: "datetime", position: 2 },
    ];
    const typedDetail: ExperimentDetail = { ...sampleDetail, columns: typedColumns };
    const buf = await exportAsXlsx(typedDetail, [
      { bool: "true", num: "42.5", when: "2026-04-18T00:00:00Z" },
      { bool: null, num: "", when: null },
    ]);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const data = wb.getWorksheet("data");
    expect(data).toBeDefined();
    if (!data) return;
    expect(data.getRow(2).getCell(1).value).toBe(true);
    expect(data.getRow(2).getCell(2).value).toBe(42.5);
    expect(data.getRow(2).getCell(3).value).toBeInstanceOf(Date);
    expect(data.getRow(3).getCell(1).value).toBe(null);
  });
});
