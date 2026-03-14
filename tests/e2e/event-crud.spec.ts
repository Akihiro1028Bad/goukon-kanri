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
  await expect(page.locator("h1")).toContainText("イベント 2026-03-");

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

  // Click delete button
  await page.click("text=削除");

  // Confirm in dialog
  await page.click("text=削除する");

  // Should redirect to event list
  await page.waitForURL("/events");
  await page.goto("/events?year=2026&month=5");

  // Event should not be visible (deleted)
  await expect(page.locator("text=削除テスト会場")).not.toBeVisible();

  // Toggle show deleted
  await page.click('[role="switch"]');

  // Event should be visible with opacity (grey)
  await expect(page.locator("text=削除テスト会場")).toBeVisible();

  // Restore
  await page.click("text=復元");
  await page.waitForTimeout(1000);

  // Toggle off and back on - event should be visible normally
  await page.click('[role="switch"]'); // toggle off (show only active)
  await expect(page.locator("text=削除テスト会場")).toBeVisible();
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
  await page.waitForURL(/\/events\/2026-08-001/);
  await expect(page.locator("h1")).toContainText("2026-08-001");

  // Create second event in August
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
  await page.waitForURL(/\/events\/2026-08-002/);
  await expect(page.locator("h1")).toContainText("2026-08-002");
});
