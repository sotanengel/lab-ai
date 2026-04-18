import { expect, test } from "@playwright/test";

test.describe("Lab AI smoke flow", () => {
  test("home page lists experiments and has a skip link", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "メインコンテンツへスキップ" })).toBeAttached();
  });

  test("navigation exposes import and context links", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "取込" })).toBeVisible();
    await expect(page.getByRole("link", { name: "コンテキスト" })).toBeVisible();
  });

  test("import page renders wizard drop zone", async ({ page }) => {
    await page.goto("/experiments/new");
    await expect(page.getByText("ここにファイルをドラッグ")).toBeVisible();
  });
});
