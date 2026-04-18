import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/services/**/*.ts"],
      exclude: [
        "src/services/advice-service.ts", // hits the Claude SDK — covered by routes in e2e
        "src/services/import-suggest-service.ts", // same
        "src/services/content-extraction-service.ts", // unpdf + real fetch — covered manually
      ],
      thresholds: {
        lines: 70,
        statements: 70,
        branches: 60,
        functions: 70,
      },
    },
  },
});
