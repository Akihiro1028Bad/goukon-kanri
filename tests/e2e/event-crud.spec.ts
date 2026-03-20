import { test, expect } from "@playwright/test";

// Helper: clean test DB before each test
test.beforeEach(async ({ page }) => {
  // Navigate to events to confirm app is running
  await page.goto("/events");
  await page.waitForLoadState("networkidle");
});

// E2E-001: イベント登録→一覧表示
test("E2E-001: イベントを登録し、一覧に表示される", async ({ page }) => {
  await page.goto("/events/new");

  // Fill required fields
  await page.fill('input[name="date"]', "2026-03-15");
  await page.fill('input[name="startTime"]', "19:00");
  await page.fill('input[name="venueName"]', "テスト会場A");
  await page.fill('input[name="area"]', "渋谷");
  await page.fill('input[name="maleCapacity"]', "5");
  await page.fill('input[name="femaleCapacity"]', "5");
  await page.fill('input[name="maleFee"]', "6000");
  await page.fill('input[name="femaleFee"]', "4000");

  // Submit
  await page.click('button[type="submit"]');

  // Should redirect to event detail
  await page.waitForURL(/\/events\/2026-03-/);
  await expect(page.getByRole("heading", { name: /イベント 2026-03-/ })).toBeVisible();

  // Go to events list and verify the new event appears
  await page.goto("/events?year=2026&month=3");
  await expect(page.locator("text=テスト会場A")).toBeVisible();
});

// E2E-002: イベント編集
test("E2E-002: イベントを編集し、更新が反映される", async ({ page }) => {
  // First create an event
  await page.goto("/events/new");
  await page.fill('input[name="date"]', "2026-04-01");
  await page.fill('input[name="startTime"]', "18:00");
  await page.fill('input[name="venueName"]', "編集前の会場");
  await page.fill('input[name="area"]', "新宿");
  await page.fill('input[name="maleCapacity"]', "4");
  await page.fill('input[name="femaleCapacity"]', "4");
  await page.fill('input[name="maleFee"]', "5000");
  await page.fill('input[name="femaleFee"]', "3000");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/events\/2026-04-/);

  // Click edit button
  await page.click("text=編集");
  await page.waitForURL(/\/edit$/);

  // Change venue name
  await page.fill('input[name="venueName"]', "編集後の会場");
  await page.click('button[type="submit"]');

  // Wait for redirect back to detail
  await page.waitForURL(/\/events\/2026-04-\d{3}$/);

  // Verify updated venue name
  await expect(page.locator("text=編集後の会場")).toBeVisible();
});

// E2E-003: イベント論理削除→復元
test("E2E-003: イベントを削除して復元する", async ({ page }) => {
  // Create an event
  await page.goto("/events/new");
  await page.fill('input[name="date"]', "2026-05-01");
  await page.fill('input[name="startTime"]', "19:00");
  await page.fill('input[name="venueName"]', "削除テスト会場");
  await page.fill('input[name="area"]', "銀座");
  await page.fill('input[name="maleCapacity"]', "3");
  await page.fill('input[name="femaleCapacity"]', "3");
  await page.fill('input[name="maleFee"]', "6000");
  await page.fill('input[name="femaleFee"]', "4000");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/events\/2026-05-/);
  const eventId = page.url().split("/").pop()!;

  // Click delete button
  await page.getByRole("button", { name: "削除" }).click();

  // Confirm in dialog
  const dialog = page.locator('[data-slot="dialog-content"]');
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "削除する" }).click();

  // Should redirect to event list
  await page.waitForURL("/events");
  await page.goto("/events?year=2026&month=5");

  // Event should not be visible (deleted)
  await expect(page.getByRole("link", { name: eventId })).toHaveCount(0);

  // Toggle show deleted
  await page.locator('[role="switch"]:visible').first().click({ force: true });

  // Event should be visible with opacity (grey)
  await expect(page.getByRole("link", { name: eventId })).toBeVisible();

  // Restore
  await page.click("text=復元");
  await page.waitForTimeout(1000);

  // After restore, the event should remain visible in current list
  await expect(page.getByRole("link", { name: eventId })).toBeVisible();
});

// E2E-004: イベント一覧フィルタ
test("E2E-004: フィルタでイベントを絞り込む", async ({ page }) => {
  // Create two events in different months
  await page.goto("/events/new");
  await page.fill('input[name="date"]', "2026-06-01");
  await page.fill('input[name="startTime"]', "19:00");
  await page.fill('input[name="venueName"]', "6月の会場");
  await page.fill('input[name="area"]', "渋谷");
  await page.fill('input[name="maleCapacity"]', "3");
  await page.fill('input[name="femaleCapacity"]', "3");
  await page.fill('input[name="maleFee"]', "6000");
  await page.fill('input[name="femaleFee"]', "4000");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/events\/2026-06-/);

  await page.goto("/events/new");
  await page.fill('input[name="date"]', "2026-07-01");
  await page.fill('input[name="startTime"]', "19:00");
  await page.fill('input[name="venueName"]', "7月の会場");
  await page.fill('input[name="area"]', "新宿");
  await page.fill('input[name="maleCapacity"]', "3");
  await page.fill('input[name="femaleCapacity"]', "3");
  await page.fill('input[name="maleFee"]', "6000");
  await page.fill('input[name="femaleFee"]', "4000");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/events\/2026-07-/);

  // Filter by month=6
  await page.goto("/events?year=2026&month=6");
  await expect(page.locator("text=6月の会場")).toBeVisible();
  await expect(page.locator("text=7月の会場")).not.toBeVisible();

  // Filter by month=7
  await page.goto("/events?year=2026&month=7");
  await expect(page.locator("text=7月の会場")).toBeVisible();
  await expect(page.locator("text=6月の会場")).not.toBeVisible();
});

// E2E-005: イベントIDの自動採番確認
test("E2E-005: 同月にイベントを登録するとIDが連番になる", async ({
  page,
}) => {
  // Create first event in August
  await page.goto("/events/new");
  await page.fill('input[name="date"]', "2026-08-10");
  await page.fill('input[name="startTime"]', "19:00");
  await page.fill('input[name="venueName"]', "8月会場1");
  await page.fill('input[name="area"]', "品川");
  await page.fill('input[name="maleCapacity"]', "3");
  await page.fill('input[name="femaleCapacity"]', "3");
  await page.fill('input[name="maleFee"]', "5000");
  await page.fill('input[name="femaleFee"]', "3000");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/events\/2026-08-\d{3}$/);

  // Capture the first event's sequential number
  const firstUrl = page.url();
  const firstEventId = firstUrl.split("/").pop()!; // e.g. "2026-08-003"
  const firstSeq = parseInt(firstEventId.split("-")[2], 10);
  await expect(page.getByRole("heading", { name: new RegExp(firstEventId) })).toBeVisible();

  // Create second event in August - should get the next sequential ID
  await page.goto("/events/new");
  await page.fill('input[name="date"]', "2026-08-20");
  await page.fill('input[name="startTime"]', "19:00");
  await page.fill('input[name="venueName"]', "8月会場2");
  await page.fill('input[name="area"]', "品川");
  await page.fill('input[name="maleCapacity"]', "3");
  await page.fill('input[name="femaleCapacity"]', "3");
  await page.fill('input[name="maleFee"]', "5000");
  await page.fill('input[name="femaleFee"]', "3000");
  await page.click('button[type="submit"]');

  // Verify second event ID is exactly one higher than the first
  const expectedSeq = String(firstSeq + 1).padStart(3, "0");
  const expectedSecondId = `2026-08-${expectedSeq}`;
  await page.waitForURL(new RegExp(`/events/${expectedSecondId}$`));
  await expect(page.getByRole("heading", { name: new RegExp(expectedSecondId) })).toBeVisible();
});

// E2E-006: イベント一覧のソートUI表示
test("E2E-006: イベント一覧ヘッダーにソートUIが表示される", async ({
  page,
}) => {
  await page.goto("/events");

  const dateHeader = page
    .locator("th")
    .filter({ has: page.getByRole("button", { name: "日付" }) });

  await expect(page.getByRole("button", { name: "日付" })).toBeVisible();
  await expect(dateHeader).toHaveAttribute("aria-sort", "none");
});
