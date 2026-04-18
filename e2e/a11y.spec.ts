import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES: Array<{ label: string; path: string }> = [
  { label: "home", path: "/" },
  { label: "import", path: "/experiments/new" },
  { label: "compare", path: "/compare" },
  { label: "dashboard", path: "/dashboard" },
  { label: "context", path: "/context" },
];

// NF-07: aim for WCAG 2.1 AA. Any axe violation at impact 'serious' or
// 'critical' fails the build; 'minor' / 'moderate' are surfaced as
// warnings in the report but don't block.
test.describe("a11y (axe-core) @wcag", () => {
  for (const page of PAGES) {
    test(`${page.label}: no serious/critical violations`, async ({ page: p }) => {
      await p.goto(page.path);
      const results = await new AxeBuilder({ page: p })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const blocking = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      expect(
        blocking,
        blocking.map((v) => `- ${v.id}: ${v.help} (${v.nodes.length} nodes)`).join("\n"),
      ).toEqual([]);
    });
  }
});
