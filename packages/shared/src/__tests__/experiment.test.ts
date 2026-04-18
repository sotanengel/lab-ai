import { describe, expect, it } from "vitest";
import { CreateExperimentRequestSchema, ExperimentMetaSchema } from "../schemas/experiment.js";

describe("ExperimentMetaSchema", () => {
  it("accepts a valid experiment meta", () => {
    const parsed = ExperimentMetaSchema.parse({
      id: "exp-1",
      name: "Test experiment",
      description: null,
      tags: ["trial"],
      sourceFormat: "csv",
      rowCount: 10,
      archived: false,
      createdAt: "2026-04-18T00:00:00.000Z",
      updatedAt: "2026-04-18T00:00:00.000Z",
    });
    expect(parsed.id).toBe("exp-1");
    expect(parsed.tags).toEqual(["trial"]);
  });

  it("rejects an empty name", () => {
    const result = ExperimentMetaSchema.safeParse({
      id: "exp-1",
      name: "",
      sourceFormat: "csv",
      rowCount: 0,
      archived: false,
      createdAt: "2026-04-18T00:00:00.000Z",
      updatedAt: "2026-04-18T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });
});

describe("CreateExperimentRequestSchema", () => {
  it("requires at least one column", () => {
    const result = CreateExperimentRequestSchema.safeParse({
      name: "test",
      sourceFormat: "csv",
      columns: [],
      rows: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a minimal valid request", () => {
    const result = CreateExperimentRequestSchema.safeParse({
      name: "test",
      sourceFormat: "csv",
      columns: [{ name: "time", type: "number", position: 0 }],
      rows: [{ time: 1.0 }],
    });
    expect(result.success).toBe(true);
  });
});
