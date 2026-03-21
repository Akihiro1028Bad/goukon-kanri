import { test, expect } from "@playwright/test";
import { cleanDatabase } from "./helpers/clean-database";

test.beforeEach(async ({ page }) => {
  await cleanDatabase();
  await page.goto("/schedule");
  await page.waitForLoadState("networkidle");
});

// E2E-030: スケジュール一覧表示
test("E2E-030: スケジュール一覧が表示される", async ({ page }) => {
  // Create an event first
  await page.goto("/events/new");
  await page.fill('input[name="date"]', "2026-03-11");
  await page.fill('input[name="startTime"]', "19:00");
  await page.fill('input[name="venueName"]', "スケジュールテスト会場");
  await page.fill('input[name="area"]', "渋谷");
  await page.fill('input[name="maleCapacity"]', "5");
  await page.fill('input[name="femaleCapacity"]', "5");
  await page.fill('input[name="maleFee"]', "6000");
  await page.fill('input[name="femaleFee"]', "4000");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/events\/2026-03-/);

  // Go to schedule
  await page.goto("/schedule");

  // Should show the event with capacity columns
  await expect(page.locator("text=スケジュールテスト会場")).toBeVisible();
  await expect(page.locator("th").filter({ hasText: "男性定員" })).toBeVisible();
  await expect(page.locator("th").filter({ hasText: "女性定員" })).toBeVisible();
  await expect(page.locator("th").filter({ hasText: "男性残枠" })).toBeVisible();
  await expect(page.locator("th").filter({ hasText: "女性残枠" })).toBeVisible();
});

// E2E-031: スケジュールフィルタ
test("E2E-031: スケジュールをフィルタで絞り込む", async ({ page }) => {
  // Create events in different months
  await page.goto("/events/new");
  await page.fill('input[name="date"]', "2026-03-12");
  await page.fill('input[name="startTime"]', "19:00");
  await page.fill('input[name="venueName"]', "3月フィルタ会場");
  await page.fill('input[name="area"]', "新宿");
  await page.fill('input[name="maleCapacity"]', "3");
  await page.fill('input[name="femaleCapacity"]', "3");
  await page.fill('input[name="maleFee"]', "5000");
  await page.fill('input[name="femaleFee"]', "3000");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/events\/2026-03-/);

  await page.goto("/events/new");
  await page.fill('input[name="date"]', "2026-04-15");
  await page.fill('input[name="startTime"]', "19:00");
  await page.fill('input[name="venueName"]', "4月フィルタ会場");
  await page.fill('input[name="area"]', "銀座");
  await page.fill('input[name="maleCapacity"]', "3");
  await page.fill('input[name="femaleCapacity"]', "3");
  await page.fill('input[name="maleFee"]', "5000");
  await page.fill('input[name="femaleFee"]', "3000");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/events\/2026-04-/);

  // Filter by month 3
  await page.goto("/schedule?month=3");
  await expect(page.locator("text=3月フィルタ会場")).toBeVisible();
  await expect(page.locator("text=4月フィルタ会場")).not.toBeVisible();
});

// E2E-032: LINEテキスト生成→モーダル→コピー
test("E2E-032: LINEテキストを生成してモーダルで確認する", async ({
  page,
}) => {
  // Create an event
  await page.goto("/events/new");
  await page.fill('input[name="date"]', "2026-03-20");
  await page.fill('input[name="startTime"]', "19:30");
  await page.fill('input[name="venueName"]', "LINEテスト会場");
  await page.fill('input[name="area"]', "六本木");
  await page.fill('input[name="maleCapacity"]', "4");
  await page.fill('input[name="femaleCapacity"]', "4");
  await page.fill('input[name="maleFee"]', "7000");
  await page.fill('input[name="femaleFee"]', "5000");
  await page.fill('input[name="theme"]', "年末パーティー");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/events\/2026-03-/);

  // Go to schedule
  await page.goto("/schedule");

  // Click LINE button for the event
  const row = page.locator("tr").filter({ hasText: "LINEテスト会場" });
  await expect(row).toContainText("あと4名");
  await expect(row.getByText("あと4名")).toHaveCount(2);

  const lineButton = row.locator("button").filter({ hasText: "LINE" });
  await lineButton.click();

  // Dialog should open with LINE text
  await page.waitForSelector('[data-slot="dialog-content"]');
  const dialog = page.locator('[data-slot="dialog-content"]');

  // Verify text contains key info
  await expect(dialog.locator("text=📅")).toBeVisible();
  await expect(dialog.locator("text=六本木")).toBeVisible();
  await expect(dialog.locator("text=LINEテスト会場")).toBeVisible();
  await expect(dialog.locator("text=7,000円")).toBeVisible();
  await expect(dialog.locator("text=男性あと4名 / 女性あと4名")).toBeVisible();

  // Click copy button
  await dialog.locator("button").filter({ hasText: "コピー" }).click();
});
