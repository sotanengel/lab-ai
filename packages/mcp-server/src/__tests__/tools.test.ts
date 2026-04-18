import { describe, expect, it } from "vitest";
import { toolDescriptors } from "../tools.js";

describe("toolDescriptors", () => {
  it("exposes the MCP tools defined in the requirements", () => {
    const names = toolDescriptors.map((t) => t.name).sort();
    expect(names).toEqual(
      [
        "get_context_document",
        "get_experiment_columns",
        "get_experiment_data",
        "get_experiment_list",
        "save_advice_note",
        "search_context_documents",
      ].sort(),
    );
  });

  it("has a non-empty description and inputSchema for each tool", () => {
    for (const tool of toolDescriptors) {
      expect(tool.description.length).toBeGreaterThan(0);
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.inputSchema.properties).toBeDefined();
    }
  });
});
