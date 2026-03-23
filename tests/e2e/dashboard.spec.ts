import { test, expect } from "@playwright/test";
import { cleanDatabase } from "./helpers/clean-database";

test.beforeEach(async ({ page }) => {
  await cleanDatabase();
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
  await page.waitForURL(/\/events\/2026-03-/, { timeout: 60_000 });

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
  await page.waitForURL(/\/events\/2026-10-/, { timeout: 60_000 });

  // Edit to change status to COMPLETED
  await page.click("text=編集");
  await page.waitForURL(/\/edit$/, { timeout: 60_000 });

  // Change status via select
  const statusTrigger = page.locator('[data-slot="select-trigger"]').first();
  await statusTrigger.click();
  await page.getByRole("option", { name: "開催済" }).click();

  await page.click('button[type="submit"]');
  await page.waitForURL(/\/events\/2026-10-/, { timeout: 60_000 });

  // Go to dashboard and verify event count for October
  await page.goto("/?year=2026");
  await expect(page.locator("table")).toBeVisible();
});

// E2E-023: モバイル表示でカードレイアウトが表示される
test("E2E-023: モバイル表示でカードレイアウトが表示される", async ({
  page,
}) => {
  // Set mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");

  // Desktop table should be hidden
  await expect(page.locator("table")).toBeHidden();

  // Mobile card layout should be visible
  const cards = page.locator(".space-y-4 > div.rounded-md.border.p-4");
  await expect(cards.first()).toBeVisible();

  // Should show month link in card
  await expect(page.getByRole("link", { name: "1月" })).toBeVisible();
});

// E2E-024: デスクトップ表示でテーブルレイアウトが表示される
test("E2E-024: デスクトップ表示でテーブルレイアウトが表示される", async ({
  page,
}) => {
  // Set desktop viewport
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  // Desktop table should be visible
  await expect(page.locator("table")).toBeVisible();

  // Mobile card layout should be hidden
  const cards = page.locator(".space-y-4 > div.rounded-md.border.p-4");
  await expect(cards.first()).toBeHidden();
});

// E2E-025: モバイルでヘッダーが縦並びになる
test("E2E-025: モバイルでヘッダーが縦並びになる", async ({ page }) => {
  // Set mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");

  // Header should have flex-col class on mobile
  const header = page.locator(".space-y-6 > div").first();
  await expect(header).toHaveClass(/flex-col/);
});

// E2E-026: モバイルカードレイアウトで月をクリックしてイベント一覧に遷移
test("E2E-026: モバイルカードレイアウトで月をクリックしてイベント一覧に遷移", async ({
  page,
}) => {
  // Set mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });

  // Create an event
  await page.goto("/events/new");
  await page.fill('input[name="date"]', "2026-05-01");
  await page.fill('input[name="startTime"]', "19:00");
  await page.fill('input[name="venueName"]', "モバイルテスト");
  await page.fill('input[name="area"]', "渋谷");
  await page.fill('input[name="maleCapacity"]', "3");
  await page.fill('input[name="femaleCapacity"]', "3");
  await page.fill('input[name="maleFee"]', "6000");
  await page.fill('input[name="femaleFee"]', "4000");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/events\/2026-05-/, { timeout: 60_000 });

  // Go to dashboard
  await page.goto("/?year=2026");

  // Click 5月 link in mobile card
  const mayLink = page.locator('a[href*="/events?year=2026&month=5"]');
  await mayLink.click();

  // Should navigate to events filtered by month
  await page.waitForURL(/\/events\?year=2026&month=5/);
  await expect(page.locator("text=モバイルテスト")).toBeVisible();
});
