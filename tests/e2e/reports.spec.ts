import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/reports");
  await page.waitForLoadState("networkidle");
});

// E2E-040: 収支レポート表示
test("E2E-040: 収支レポートが全列で表示される", async ({ page }) => {
  // Create an event with financial data
  await page.goto("/events/new");
  await page.fill('input[name="date"]', "2026-01-15");
  await page.fill('input[name="startTime"]', "19:00");
  await page.fill('input[name="venueName"]', "レポートテスト会場");
  await page.fill('input[name="area"]', "渋谷");
  await page.fill('input[name="maleCapacity"]', "5");
  await page.fill('input[name="femaleCapacity"]', "5");
  await page.fill('input[name="maleFee"]', "6000");
  await page.fill('input[name="femaleFee"]', "4000");
  await page.fill('input[name="venueCost"]', "15000");
  await page.fill('input[name="expectedCashback"]', "3000");
  await page.fill('input[name="actualCashback"]', "2500");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/events\/2026-01-/);
  const eventId = page.url().split("/").pop()!;

  // Go to reports
  await page.goto("/reports?year=2026");

  // Table should be visible
  await expect(page.locator("table")).toBeVisible();

  // Check that the created event appears
  await expect(page.locator(`text=${eventId}`)).toBeVisible();

  // Check key column headers
  await expect(
    page.locator("th").filter({ hasText: "イベントID" })
  ).toBeVisible();
  await expect(page.locator("th").filter({ hasText: "会場費" })).toBeVisible();
});

// E2E-041: レポートフィルタ
test("E2E-041: レポートを年度・月でフィルタする", async ({ page }) => {
  // Create events in different months
  await page.goto("/events/new");
  await page.fill('input[name="date"]', "2026-01-20");
  await page.fill('input[name="startTime"]', "19:00");
  await page.fill('input[name="venueName"]', "1月レポート会場");
  await page.fill('input[name="area"]', "渋谷");
  await page.fill('input[name="maleCapacity"]', "3");
  await page.fill('input[name="femaleCapacity"]', "3");
  await page.fill('input[name="maleFee"]', "6000");
  await page.fill('input[name="femaleFee"]', "4000");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/events\/2026-01-/);
  const januaryEventId = page.url().split("/").pop()!;

  await page.goto("/events/new");
  await page.fill('input[name="date"]', "2026-02-20");
  await page.fill('input[name="startTime"]', "19:00");
  await page.fill('input[name="venueName"]', "2月レポート会場");
  await page.fill('input[name="area"]', "新宿");
  await page.fill('input[name="maleCapacity"]', "3");
  await page.fill('input[name="femaleCapacity"]', "3");
  await page.fill('input[name="maleFee"]', "6000");
  await page.fill('input[name="femaleFee"]', "4000");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/events\/2026-02-/);
  const februaryEventId = page.url().split("/").pop()!;

  // Filter by month 1
  await page.goto("/reports?year=2026&month=1");
  await expect(page.locator(`text=${januaryEventId}`)).toBeVisible();
  await expect(page.locator(`text=${februaryEventId}`)).not.toBeVisible();

  // Filter by month 2
  await page.goto("/reports?year=2026&month=2");
  await expect(page.locator(`text=${februaryEventId}`)).toBeVisible();
  await expect(page.locator(`text=${januaryEventId}`)).not.toBeVisible();
});
