import { test, expect } from "@playwright/test";
import { cleanDatabase } from "./helpers/clean-database";

test.beforeEach(async () => {
  await cleanDatabase();
});

// E2E-039-001: スマホ（375px）でカード形式が表示される
test("E2E-039-001: スマホでダッシュボードがカード形式で表示される", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");

  // テーブルが非表示（hidden クラス）
  const table = page.locator("table");
  await expect(table).not.toBeVisible();

  // カードが表示される
  const cards = page.locator('[data-slot="card"]');
  await expect(cards.first()).toBeVisible();

  // 12ヶ月分のカードがある
  await expect(cards).toHaveCount(12);
});

// E2E-039-002: タブレット（768px）でテーブル形式が表示される
test("E2E-039-002: タブレットでダッシュボードがテーブル形式で表示される", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/");

  // テーブルが表示される
  const table = page.locator("table");
  await expect(table).toBeVisible();

  // カードコンテナが非表示
  const mobileContainer = page.locator(".md\\:hidden");
  await expect(mobileContainer).not.toBeVisible();
});

// E2E-039-003: PC（1280px）でテーブル形式が表示される
test("E2E-039-003: PCでダッシュボードがテーブル形式で表示される", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  const table = page.locator("table");
  await expect(table).toBeVisible();
});

// E2E-039-004: スマホでカードの月リンクをタップするとイベント一覧に遷移
test("E2E-039-004: スマホでカードの月リンクをタップするとイベント一覧に遷移する", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/?year=2026");

  // 3月のリンクをクリック（カード内の最初のリンク）
  const marchLinks = page.getByRole("link", { name: "3月" });
  await marchLinks.first().click();

  // イベント一覧ページに遷移
  await page.waitForURL(/\/events\?year=2026&month=3/);
  await expect(page.getByRole("heading", { name: "イベント一覧" })).toBeVisible();
});

// E2E-039-005: スマホで横オーバーフローが発生しない
test("E2E-039-005: スマホでダッシュボードに横オーバーフローがない", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));

  expect(metrics.overflow, `scrollWidth=${metrics.scrollWidth}, clientWidth=${metrics.clientWidth}`).toBeFalsy();
});

// E2E-039-006: スマホで年度切替後もカード形式が維持される
test("E2E-039-006: スマホで年度切替後もカード形式が維持される", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");

  // 年度セレクターをクリック
  const yearTrigger = page.locator('[data-slot="select-trigger"]').first();
  await yearTrigger.click();

  // 2025年を選択
  await page.getByRole("option", { name: "2025年" }).click();
  await page.waitForURL(/year=2025/);

  // カード形式が維持される
  const cards = page.locator('[data-slot="card"]');
  await expect(cards.first()).toBeVisible();
});

// E2E-039-007: カード内のすべての情報が表示される（イベントありの月）
test("E2E-039-007: カード内のすべての財務情報が表示される", async ({ page }) => {
  // イベントを作成
  await page.goto("/events/new");
  await page.fill('input[name="date"]', "2026-03-15");
  await page.fill('input[name="startTime"]', "19:00");
  await page.fill('input[name="venueName"]', "カードテスト会場");
  await page.fill('input[name="area"]', "渋谷");
  await page.fill('input[name="maleCapacity"]', "3");
  await page.fill('input[name="femaleCapacity"]', "3");
  await page.fill('input[name="maleFee"]', "6000");
  await page.fill('input[name="femaleFee"]', "4000");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/events\/2026-03-/, { timeout: 60_000 });

  // ダッシュボードをスマホで表示
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/?year=2026");

  // 3月のカードを確認
  const marchCard = page.locator('[data-slot="card"]').filter({ hasText: "3月" });
  await expect(marchCard).toBeVisible();

  // 各項目が表示されていることを確認
  await expect(marchCard.locator("text=1件")).toBeVisible();
  await expect(marchCard.locator("text=参加者")).toBeVisible();
  await expect(marchCard.locator("text=見込み収入")).toBeVisible();
  await expect(marchCard.locator("text=決済済み")).toBeVisible();
  await expect(marchCard.locator("text=未回収")).toBeVisible();
  await expect(marchCard.locator("text=見込み利益")).toBeVisible();
  await expect(marchCard.locator("text=実現利益")).toBeVisible();
  await expect(marchCard.locator("text=利益率")).toBeVisible();
});

// E2E-039-008: ブレークポイント境界（767px→768px）で表示が切り替わる
test("E2E-039-008: 767pxでカード、768pxでテーブルが表示される", async ({ page }) => {
  // 767px: カード表示
  await page.setViewportSize({ width: 767, height: 1024 });
  await page.goto("/");
  await expect(page.locator("table")).not.toBeVisible();
  await expect(page.locator('[data-slot="card"]').first()).toBeVisible();

  // 768px: テーブル表示
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/");
  await expect(page.locator("table")).toBeVisible();
});
