import { test, expect } from "@playwright/test";

// Helper: create an event and return its detail page URL
async function createTestEvent(page: import("@playwright/test").Page) {
  await page.goto("/events/new");
  await page.fill('input[name="date"]', "2026-09-15");
  await page.fill('input[name="startTime"]', "19:00");
  await page.fill('input[name="venueName"]', "参加者テスト会場");
  await page.fill('input[name="area"]', "渋谷");
  await page.fill('input[name="maleCapacity"]', "5");
  await page.fill('input[name="femaleCapacity"]', "5");
  await page.fill('input[name="maleFee"]', "6000");
  await page.fill('input[name="femaleFee"]', "4000");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/events\/2026-09-/);
  return page.url();
}

// Helper: add a participant to the current event detail page
async function addParticipant(
  page: import("@playwright/test").Page,
  name: string,
  gender: "MALE" | "FEMALE",
  fee: number
) {
  // Click "参加者追加" button
  await page.click("text=参加者追加");

  // Fill participant form
  await page.fill('input[name="name"]', name);

  // Select gender - click the trigger then the option
  const genderTrigger = page.locator(
    'form:has(input[name="name"]) [data-slot="select-trigger"]'
  ).first();
  await genderTrigger.click();
  const genderLabel = gender === "MALE" ? "男性" : "女性";
  await page.getByRole("option", { name: genderLabel }).click();

  await page.fill('input[name="fee"]', String(fee));

  // Submit
  await page
    .locator('form:has(input[name="name"]) button[type="submit"]')
    .click();

  // Wait for participant to appear in the table
  await expect(page.locator(`text=${name}`).first()).toBeVisible({
    timeout: 10000,
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/events");
  await page.waitForLoadState("networkidle");
});

// E2E-010: 参加者登録→サマリー更新
test("E2E-010: 参加者を登録するとサマリーが更新される", async ({ page }) => {
  const eventUrl = await createTestEvent(page);
  await page.goto(eventUrl);

  // Initially 0 participants
  await expect(page.locator("text=参加者がいません")).toBeVisible();

  // Add a male participant
  await addParticipant(page, "テスト太郎", "MALE", 6000);

  // Reload to see updated financials
  await page.goto(eventUrl);

  // Check male count in summary
  await expect(page.locator("text=1名").first()).toBeVisible();
});

// E2E-011: 個別決済更新
test("E2E-011: 個別参加者の決済状況を更新する", async ({ page }) => {
  const eventUrl = await createTestEvent(page);
  await page.goto(eventUrl);

  await addParticipant(page, "決済テスト太郎", "MALE", 6000);
  await page.goto(eventUrl);

  // Click the "未" badge to toggle payment
  const unpaidBadge = page.locator("button").filter({ hasText: "未" }).first();
  await unpaidBadge.click();

  // Payment form should appear - fill in confirmation
  await page.fill('input[placeholder="確認者名"]', "山田");
  await page.click("text=確定");

  // Wait for status to update
  await page.waitForTimeout(2000);
  await page.goto(eventUrl);

  // Check that payment is now "済"
  await expect(page.locator("text=済").first()).toBeVisible();
});

// E2E-012: 一括決済更新
test("E2E-012: 一括決済で複数参加者を更新する", async ({ page }) => {
  const eventUrl = await createTestEvent(page);
  await page.goto(eventUrl);

  // Add two participants
  await addParticipant(page, "一括太郎", "MALE", 6000);
  await page.goto(eventUrl);
  await addParticipant(page, "一括花子", "FEMALE", 4000);
  await page.goto(eventUrl);

  // Click bulk payment button
  const bulkButton = page.locator("button").filter({ hasText: "一括決済" });
  await bulkButton.click();

  // Dialog should open - fill confirmation
  await page.waitForSelector('[data-slot="dialog-content"]');
  const dialog = page.locator('[data-slot="dialog-content"]');

  // Select all participants in dialog
  const selectAllRow = dialog.locator("div").filter({ hasText: "全選択" }).first();
  await selectAllRow.locator('[role="checkbox"]').first().click();

  await dialog.locator('input[placeholder="確認者名を入力"]').fill("管理者");
  await dialog.locator("button").filter({ hasText: "一括更新" }).click();

  // Wait and refresh
  await page.waitForTimeout(2000);
  await page.goto(eventUrl);

  // Both should be paid
  const paidBadges = page.locator("button").filter({ hasText: "済" });
  await expect(paidBadges).toHaveCount(2);
});

// E2E-013: 参加者氏名検索
test("E2E-013: 参加者を氏名で検索する", async ({ page }) => {
  const eventUrl = await createTestEvent(page);
  await page.goto(eventUrl);

  await addParticipant(page, "検索用太郎", "MALE", 6000);
  await page.goto(eventUrl);
  await addParticipant(page, "検索用花子", "FEMALE", 4000);
  await page.goto(eventUrl);

  // Search by name
  await page.fill('input[placeholder="氏名で検索..."]', "太郎");

  // Only 太郎 should be visible
  await expect(page.locator("text=検索用太郎")).toBeVisible();
  await expect(page.locator("text=検索用花子")).not.toBeVisible();
});

// E2E-014: 全横断参加者一覧
test("E2E-014: 横断参加者一覧で氏名検索する", async ({ page }) => {
  // Create an event and add participants
  const eventUrl = await createTestEvent(page);
  await page.goto(eventUrl);
  await addParticipant(page, "横断テスト太郎", "MALE", 6000);
  await page.goto(eventUrl);

  // Go to cross-event participants page
  await page.goto("/participants");

  // Should see the participant
  await expect(page.locator("text=横断テスト太郎")).toBeVisible();

  // Filter by name via URL
  await page.goto("/participants?name=横断テスト");
  await expect(page.locator("text=横断テスト太郎")).toBeVisible();
});
