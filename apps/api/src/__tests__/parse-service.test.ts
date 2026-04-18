import { describe, expect, it } from "vitest";
import { parseInputText } from "../services/parse-service.js";

describe("parseInputText", () => {
  it("parses CSV with header", () => {
    const text = "time,value\n1,10.5\n2,11.0\n3,9.8";
    const result = parseInputText(text, "csv");
    expect(result.columns).toHaveLength(2);
    expect(result.columns[0]?.name).toBe("time");
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0]).toEqual({ time: "1", value: "10.5" });
  });

  it("parses TSV", () => {
    const text = "a\tb\n1\t2\n3\t4";
    const result = parseInputText(text, "tsv");
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({ a: "1", b: "2" });
  });

  it("parses JSON array of objects", () => {
    const text = JSON.stringify([
      { name: "a", value: 1 },
      { name: "b", value: 2 },
    ]);
    const result = parseInputText(text, "json");
    expect(result.rows).toHaveLength(2);
    expect(result.columns.map((c) => c.name).sort()).toEqual(["name", "value"]);
  });

  it("throws on invalid JSON shape", () => {
    expect(() => parseInputText('{"not": "array"}', "json")).toThrow();
  });
});
