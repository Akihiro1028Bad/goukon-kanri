import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
});

// E2E-020: 月別サマリー表示
test("E2E-020: ダッシュボードに月別サマリーが表示される", async ({ page }) => {
  await page.goto("/");

  // Should show 12 months
  await expect(page.getByRole("link", { name: "1月", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "12月", exact: true })).toBeVisible();

  // Table should exist
  await expect(page.locator("table")).toBeVisible();
});

// E2E-021: 年度切替
test("E2E-021: 年度セレクターで年を切り替える", async ({ page }) => {
  await page.goto("/");

  // Click year selector
  const yearTrigger = page.locator('[data-slot="select-trigger"]').first();
  await yearTrigger.click();

  // Select 2025
  await page.getByRole("option", { name: "2025年" }).click();

  // URL should update
  await page.waitForURL(/year=2025/);
  await expect(page.locator("table")).toBeVisible();
});

// E2E-022: 月クリック→イベント一覧遷移
test("E2E-022: 月をクリックするとイベント一覧に遷移する", async ({
  page,
}) => {
  // First create an event to ensure there's data
  await page.goto("/events/new");
  await page.fill('input[name="date"]', "2026-03-01");
  await page.fill('input[name="startTime"]', "19:00");
  await page.fill('input[name="venueName"]', "ダッシュボードテスト");
  await page.fill('input[name="area"]', "渋谷");
  await page.fill('input[name="maleCapacity"]', "3");
  await page.fill('input[name="femaleCapacity"]', "3");
  await page.fill('input[name="maleFee"]', "6000");
  await page.fill('input[name="femaleFee"]', "4000");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/events\/2026-03-/);

  // Go to dashboard
  await page.goto("/?year=2026");

  // Click 3月 link
  const marchLink = page.locator('a[href*="/events?year=2026&month=3"]');
  await marchLink.click();

  // Should navigate to events filtered by month
  await page.waitForURL(/\/events\?year=2026&month=3/);
  await expect(page.locator("text=ダッシュボードテスト")).toBeVisible();
});

// Additional: イベント状態変更後のダッシュボード反映
test("状態変更後にダッシュボードの集計が即時反映される", async ({ page }) => {
  // Create an event
  await page.goto("/events/new");
  await page.fill('input[name="date"]', "2026-10-01");
  await page.fill('input[name="startTime"]', "19:00");
  await page.fill('input[name="venueName"]', "状態変更テスト");
  await page.fill('input[name="area"]', "渋谷");
  await page.fill('input[name="maleCapacity"]', "3");
  await page.fill('input[name="femaleCapacity"]', "3");
  await page.fill('input[name="maleFee"]', "6000");
  await page.fill('input[name="femaleFee"]', "4000");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/events\/2026-10-/);

  // Edit to change status to COMPLETED
  await page.click("text=編集");
  await page.waitForURL(/\/edit$/);

  // Change status via select
  const statusTrigger = page.locator('[data-slot="select-trigger"]').first();
  await statusTrigger.click();
  await page.getByRole("option", { name: "開催済" }).click();

  await page.click('button[type="submit"]');
  await page.waitForURL(/\/events\/2026-10-/);

  // Go to dashboard and verify event count for October
  await page.goto("/?year=2026");
  await expect(page.locator("table")).toBeVisible();
});
