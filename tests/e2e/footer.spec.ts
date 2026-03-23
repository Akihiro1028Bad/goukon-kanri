import { test, expect } from "@playwright/test";

test.describe("フッター著作権表示", () => {
  test("E2E-050: ダッシュボードページでフッターが表示される", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const footer = page.locator("footer");
    await expect(footer).toBeVisible();

    const currentYear = new Date().getFullYear();
    await expect(footer).toContainText(`© ${currentYear} Goukon Kanri`);
  });

  test("E2E-051: イベント一覧ページでフッターが表示される", async ({ page }) => {
    await page.goto("/events");
    await page.waitForLoadState("networkidle");

    const footer = page.locator("footer");
    await expect(footer).toBeVisible();

    const currentYear = new Date().getFullYear();
    await expect(footer).toContainText(`© ${currentYear} Goukon Kanri`);
  });

  test("E2E-052: 参加者一覧ページでフッターが表示される", async ({ page }) => {
    await page.goto("/participants");
    await page.waitForLoadState("networkidle");

    const footer = page.locator("footer");
    await expect(footer).toBeVisible();

    const currentYear = new Date().getFullYear();
    await expect(footer).toContainText(`© ${currentYear} Goukon Kanri`);
  });

  test("E2E-053: スケジュールページでフッターが表示される", async ({ page }) => {
    await page.goto("/schedule");
    await page.waitForLoadState("networkidle");

    const footer = page.locator("footer");
    await expect(footer).toBeVisible();

    const currentYear = new Date().getFullYear();
    await expect(footer).toContainText(`© ${currentYear} Goukon Kanri`);
  });

  test("E2E-054: 収支レポートページでフッターが表示される", async ({ page }) => {
    await page.goto("/reports");
    await page.waitForLoadState("networkidle");

    const footer = page.locator("footer");
    await expect(footer).toBeVisible();

    const currentYear = new Date().getFullYear();
    await expect(footer).toContainText(`© ${currentYear} Goukon Kanri`);
  });

  test("E2E-055: フッターが中央揃えで表示される", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const footer = page.locator("footer");
    const textAlign = await footer.evaluate((el) =>
      window.getComputedStyle(el).textAlign
    );
    expect(textAlign).toBe("center");
  });

  test("E2E-056: フッターのフォントサイズが小さめである", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const footer = page.locator("footer");
    const fontSize = await footer.evaluate((el) =>
      window.getComputedStyle(el).fontSize
    );
    // text-sm は 0.875rem = 14px
    expect(parseFloat(fontSize)).toBeLessThanOrEqual(14);
  });

  test("E2E-057: モバイル表示でもフッターが正しく表示される", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const footer = page.locator("footer");
    await expect(footer).toBeVisible();

    const currentYear = new Date().getFullYear();
    await expect(footer).toContainText(`© ${currentYear} Goukon Kanri`);
  });
});
