import { describe, expect, it } from "vitest";
import { inferColumnType } from "../services/column-inference.js";

describe("inferColumnType", () => {
  it("detects integer column", () => {
    expect(inferColumnType(["1", "2", "3", "100"])).toBe("integer");
  });

  it("detects number column with decimals", () => {
    expect(inferColumnType(["1.5", "2.7", "3"])).toBe("number");
  });

  it("detects datetime column", () => {
    expect(inferColumnType(["2026-04-18", "2026-04-19T10:00:00Z"])).toBe("datetime");
  });

  it("detects boolean column", () => {
    expect(inferColumnType(["true", "false", "true"])).toBe("boolean");
  });

  it("falls back to string for heterogeneous data", () => {
    expect(inferColumnType(["x1", "long text here", "another value", "more diverse"])).toBe(
      "string",
    );
  });

  it("returns string for empty input", () => {
    expect(inferColumnType([])).toBe("string");
  });
});
