import { test, expect, type Page } from "@playwright/test";
import { cleanDatabase } from "./helpers/clean-database";

test.beforeEach(async () => {
  await cleanDatabase();
});

type EventRequiredFields = {
  date: string;
  startTime: string;
  venueName: string;
  area: string;
  maleCapacity: string;
  femaleCapacity: string;
  maleFee: string;
  femaleFee: string;
};

async function setInputValue(page: Page, selector: string, value: string) {
  await page.fill(selector, value);
  const current = await page.inputValue(selector);
  if (current === value) {
    return;
  }

  await page.locator(selector).evaluate(
    (el, v) => {
      const input = el as HTMLInputElement;
      input.value = v;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    value
  );
}

async function createEventAndOpenDetail(
  page: Page,
  overrides: Partial<EventRequiredFields> = {}
) {
  const venueName = overrides.venueName ?? `overflow確認会場-${Date.now()}`;
  const fields: EventRequiredFields = {
    date: overrides.date ?? "2026-03-23",
    startTime: overrides.startTime ?? "19:00",
    venueName,
    area: overrides.area ?? "渋谷",
    maleCapacity: overrides.maleCapacity ?? "3",
    femaleCapacity: overrides.femaleCapacity ?? "3",
    maleFee: overrides.maleFee ?? "6000",
    femaleFee: overrides.femaleFee ?? "4000",
  };

  await page.goto("/events/new");
  await setInputValue(page, 'input[name="date"]', fields.date);
  await setInputValue(page, 'input[name="startTime"]', fields.startTime);
  await page.fill('input[name="venueName"]', fields.venueName);
  await page.fill('input[name="area"]', fields.area);
  await page.fill('input[name="maleCapacity"]', fields.maleCapacity);
  await page.fill('input[name="femaleCapacity"]', fields.femaleCapacity);
  await page.fill('input[name="maleFee"]', fields.maleFee);
  await page.fill('input[name="femaleFee"]', fields.femaleFee);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/events\/\d{4}-\d{2}-\d{3}/, { timeout: 60_000 });
  return { detailUrl: page.url(), venueName };
}

// RESP-001: スマートフォン（375px幅）
test("RESP-001: スマートフォンで全主要操作が完了可能", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });

  // Dashboard loads
  await page.goto("/");
  await expect(page.locator("table")).toBeVisible();

  // Sidebar should be hidden, hamburger visible
  const sidebarLinks = page.locator('nav >> role=link');
  await expect(sidebarLinks.first()).not.toBeVisible();
  const menuButton = page.locator('button[aria-label="メニュー"]');
  await expect(menuButton).toBeVisible();

  // Open hamburger menu
  await menuButton.click();
  const mobileNav = page.getByRole('dialog');
  await expect(mobileNav.getByRole("link", { name: "イベント一覧", exact: true })).toBeVisible();

  // Navigate to events
  await mobileNav.getByRole("link", { name: "イベント一覧", exact: true }).click();
  await page.waitForURL("/events");
  await expect(page.getByRole("heading", { name: "イベント一覧" })).toBeVisible();
});

// RESP-002: タブレット（768px幅）
test("RESP-002: タブレットで全主要操作が完了可能", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });

  await page.goto("/");
  await expect(page.locator("table")).toBeVisible();

  // Sidebar should be visible at md breakpoint
  const sidebarLinks = page.locator('nav >> role=link');
  await expect(sidebarLinks.first()).toBeVisible();

  // Navigate via sidebar
  await page.getByRole("link", { name: "イベント一覧", exact: true }).click();
  await page.waitForURL("/events");
  await expect(page.getByRole("heading", { name: "イベント一覧" })).toBeVisible();
});

// RESP-003: PC（1280px幅）
test("RESP-003: PCで全主要操作が完了可能", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto("/");
  await expect(page.locator("table")).toBeVisible();

  // Sidebar visible
  const sidebarLinks = page.locator('nav >> role=link');
  await expect(sidebarLinks.first()).toBeVisible();

  // Navigate through all pages
  await page.getByRole("link", { name: "イベント一覧", exact: true }).click();
  await page.waitForURL("/events");

  await page.getByRole("link", { name: "参加者一覧", exact: true }).click();
  await page.waitForURL("/participants");

  await page.getByRole("link", { name: "スケジュール", exact: true }).click();
  await page.waitForURL("/schedule");

  await page.getByRole("link", { name: "収支レポート", exact: true }).click();
  await page.waitForURL("/reports");
});

// RESP-004: 参加者登録がモバイルで完了
test("RESP-004: モバイルで参加者登録が完了する", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });

  await createEventAndOpenDetail(page, {
    date: "2026-03-20",
    venueName: "モバイルテスト会場",
  });

  // Add participant on mobile
  await page.click("text=参加者追加");
  await page.fill('input[name="name"]', "モバイル太郎");

  const genderTrigger = page.locator('form:has(input[name="name"])').getByRole('combobox').first();
  await genderTrigger.click();
  await page.getByRole("option", { name: "男性" }).click();

  await page.fill('input[name="fee"]', "6000");
  await page
    .locator('form:has(input[name="name"]) button[type="submit"]')
    .click();

  await expect(page.locator("text=モバイル太郎").first()).toBeVisible({
    timeout: 10000,
  });
});

// RESP-005: 決済更新がモバイルで完了
test("RESP-005: モバイルで決済更新が完了する", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });

  const { detailUrl: eventUrl } = await createEventAndOpenDetail(page, {
    date: "2026-03-21",
    venueName: "決済モバイルテスト",
  });

  await page.click("text=参加者追加");
  await page.fill('input[name="name"]', "決済モバイル太郎");
  const genderTrigger = page.locator('form:has(input[name="name"])').getByRole('combobox').first();
  await genderTrigger.click();
  await page.getByRole("option", { name: "男性" }).click();
  await page.fill('input[name="fee"]', "6000");
  await page
    .locator('form:has(input[name="name"]) button[type="submit"]')
    .click();
  await expect(page.locator("text=決済モバイル太郎").first()).toBeVisible({
    timeout: 10000,
  });

  await page.goto(eventUrl);

  // Toggle payment status
  const unpaidBadge = page.locator("button").filter({ hasText: "未" }).first();
  await unpaidBadge.click();
  await page.fill('input[placeholder="確認者名"]', "確認者");
  await page.click("text=確定");

  // Wait for payment status to update
  await expect(page.locator("text=済").first()).toBeVisible({ timeout: 10000 });
});

// RESP-006: テキストコピーがモバイルで完了
test("RESP-006: モバイルでLINEテキストコピーが完了する", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });

  const { venueName } = await createEventAndOpenDetail(page, {
    date: "2026-03-22",
    venueName: "LINEモバイルテスト",
  });

  // Go to schedule
  await page.goto("/schedule");

  // Find and click LINE button
  const row = page.locator("tr").filter({ hasText: venueName });
  await expect(row).toBeVisible({ timeout: 30_000 });
  const lineButton = row.locator("button").filter({ hasText: "LINE" });
  await lineButton.click();

  // Dialog should open
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("text=📅")).toBeVisible();

  // Click copy
  await dialog.locator("button").filter({ hasText: "コピー" }).click();
});

// RESP-007: 375px幅で主要画面の横overflowが発生しない
test("RESP-007: 375px幅で主要画面にページ全体の横overflowがない", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });

  const { detailUrl } = await createEventAndOpenDetail(page);

  const targets = [
    "/",
    "/events",
    detailUrl,
    "/participants",
    "/schedule",
    "/reports",
  ];

  for (const target of targets) {
    await page.goto(target);
    await page.waitForLoadState("networkidle");

    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      overflow:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    }));

    expect(
      metrics.overflow,
      `${target}: scrollWidth=${metrics.scrollWidth}, clientWidth=${metrics.clientWidth}`
    ).toBeFalsy();
  }
});
