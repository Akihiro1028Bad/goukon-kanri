# Issue #39: ダッシュボードのスマホ表示時のデザイン修正

## 問題分析

### 現状の動作

ダッシュボード（`/`）はスマートフォン（375px 幅）で表示した際、13列の月別サマリーテーブルが横スクロールとなり、視認性・操作性が低い状態になっている。

### 問題の原因

1. **`src/components/dashboard/monthly-summary-table.tsx`** (L30-103)
   - 13列すべてを単一の `<Table>` で表示している
   - 列: 月、件数、男性、女性、会場費、見込み収入、決済済み、未回収、見込み利益、実現利益、見込み利益(CB込)、実現利益(CB込)、利益率
   - モバイル向けのレスポンシブ対応がない（`whitespace-nowrap` でテキスト折り返しを防止しているのみ）

2. **`src/app/page.tsx`** (L19-26)
   - ページヘッダー部分 `flex items-center justify-between` はモバイルでも適切に表示される
   - 問題はテーブル部分のみ

3. **`src/components/ui/table.tsx`** (L7-19)
   - `overflow-x-auto` で横スクロールを許可しているが、多列テーブルでは UX が悪い

### スマホでの具体的な問題点

- 13列を一度に表示するため、横スクロールが必須
- 重要な情報（月、件数、見込み収入など）が一画面に収まらない
- 数値が小さく、タップ操作しにくい
- 横スクロール中に現在どの月を見ているか分かりにくい

## 修正方針

### 採用案: カード形式レイアウト（モバイルのみ）

モバイル（`md` 未満）ではテーブルを非表示にし、月ごとのカード形式で表示する。PC/タブレット（`md` 以上）では従来のテーブル表示を維持する。

```
┌─────────────────────────────┐
│ 3月                    →  │  ← タップで詳細展開 or イベント一覧遷移
├─────────────────────────────┤
│ 件数: 2件                   │
│ 参加者: 男性 8名 / 女性 6名 │
│ 見込み収入: ¥84,000         │
│ 決済済み: ¥42,000           │
└─────────────────────────────┘
```

**選定理由:**
- 一画面に必要な情報を収められる
- 縦スクロールはモバイルユーザーにとって自然
- 重要度の高い情報（件数、参加者数、収入）を優先表示できる
- 既存の shadcn/ui Card コンポーネントを活用可能

### 代替案（不採用）

| 案 | 理由 |
|---|---|
| 列の非表示 | 必要な情報が欠落する。利益率等は重要指標 |
| 横スクロール固定列 | 実装が複雑。TanStack Table の pinnedColumn は追加設定が必要 |
| アコーディオン | 全月を展開すると長すぎる |
| タブ切替 | 四半期ごとのタブは直感的でない |

### 変更対象ファイル

| ファイル | 変更内容 |
|----------|----------|
| `src/components/dashboard/monthly-summary-table.tsx` | カード形式コンポーネント追加、レスポンシブ切替 |
| `src/components/dashboard/monthly-summary-card.tsx` | **新規作成** - モバイル用カードコンポーネント |

## 影響範囲

### 影響を受けるコンポーネント

- `src/app/page.tsx` - 変更なし（MonthlySummaryTable が内部でレスポンシブ切替）
- `src/components/dashboard/year-selector.tsx` - 変更なし

### 破壊的変更

- なし（モバイル表示の改善のみ、デスクトップは変更なし）

### 関連機能への影響

- 月クリック → イベント一覧遷移（`/events?year=YYYY&month=M`）は維持
- 年度切替機能は影響なし

## 詳細設計

### 新規コンポーネント: `monthly-summary-card.tsx`

```typescript
// src/components/dashboard/monthly-summary-card.tsx
"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonthlySummaryRow } from "@/types";

type Props = {
  year: number;
  row: MonthlySummaryRow;
};

function formatCurrency(value: number): string {
  return `¥${value.toLocaleString()}`;
}

export function MonthlySummaryCard({ year, row }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <Link
            href={`/events?year=${year}&month=${row.month}`}
            className="text-blue-600 hover:underline"
          >
            {row.month}月
          </Link>
          <span className="text-sm font-normal text-muted-foreground">
            {row.eventCount}件
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">参加者</span>
          <span>男性 {row.maleCount}名 / 女性 {row.femaleCount}名</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">見込み収入</span>
          <span>{formatCurrency(row.expectedRevenue)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">決済済み</span>
          <span>{formatCurrency(row.paidRevenue)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">未回収</span>
          <span className={row.uncollected > 0 ? "text-destructive" : ""}>
            {formatCurrency(row.uncollected)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">見込み利益</span>
          <span>{formatCurrency(row.expectedProfit)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">実現利益</span>
          <span>{formatCurrency(row.actualProfit)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">利益率</span>
          <span>
            {row.profitRate !== null ? `${row.profitRate.toFixed(1)}%` : "-"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 既存コンポーネント修正: `monthly-summary-table.tsx`

```typescript
// src/components/dashboard/monthly-summary-table.tsx
"use client";

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MonthlySummaryRow } from "@/types";
import Link from "next/link";
import { MonthlySummaryCard } from "./monthly-summary-card";

type Props = {
  year: number;
  rows: MonthlySummaryRow[];
};

function formatCurrency(value: number): string {
  return `¥${value.toLocaleString()}`;
}

export function MonthlySummaryTable({ year, rows }: Props) {
  const columns: ColumnDef<MonthlySummaryRow>[] = [
    // ... 既存の列定義（変更なし）
  ];

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      {/* モバイル: カード形式 */}
      <div className="space-y-4 md:hidden">
        {rows.map((row) => (
          <MonthlySummaryCard key={row.month} year={year} row={row} />
        ))}
      </div>

      {/* デスクトップ: テーブル形式 */}
      <div className="hidden md:block rounded-md border overflow-x-auto">
        <Table>
          {/* ... 既存のテーブル実装（変更なし） */}
        </Table>
      </div>
    </>
  );
}
```

## テストケース（カバレッジ 100% 目標）

### ユニットテスト

#### `tests/unit/monthly-summary-card.test.tsx`

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MonthlySummaryCard } from "@/components/dashboard/monthly-summary-card";
import type { MonthlySummaryRow } from "@/types";

const mockRow: MonthlySummaryRow = {
  month: 3,
  eventCount: 2,
  maleCount: 8,
  femaleCount: 6,
  venueCost: 30000,
  expectedRevenue: 84000,
  paidRevenue: 42000,
  uncollected: 42000,
  expectedProfit: 54000,
  actualProfit: 12000,
  expectedProfitWithCb: 59000,
  actualProfitWithCb: 17000,
  profitRate: 64.3,
};

describe("MonthlySummaryCard", () => {
  // UC-001: 月リンクが正しいURLを持つ
  it("月リンクが正しいURLを持つ", () => {
    render(<MonthlySummaryCard year={2026} row={mockRow} />);
    const link = screen.getByRole("link", { name: "3月" });
    expect(link).toHaveAttribute("href", "/events?year=2026&month=3");
  });

  // UC-002: イベント件数が表示される
  it("イベント件数が表示される", () => {
    render(<MonthlySummaryCard year={2026} row={mockRow} />);
    expect(screen.getByText("2件")).toBeInTheDocument();
  });

  // UC-003: 参加者数が男女別に表示される
  it("参加者数が男女別に表示される", () => {
    render(<MonthlySummaryCard year={2026} row={mockRow} />);
    expect(screen.getByText("男性 8名 / 女性 6名")).toBeInTheDocument();
  });

  // UC-004: 見込み収入が通貨形式で表示される
  it("見込み収入が通貨形式で表示される", () => {
    render(<MonthlySummaryCard year={2026} row={mockRow} />);
    expect(screen.getByText("¥84,000")).toBeInTheDocument();
  });

  // UC-005: 決済済み金額が通貨形式で表示される
  it("決済済み金額が通貨形式で表示される", () => {
    render(<MonthlySummaryCard year={2026} row={mockRow} />);
    expect(screen.getByText("¥42,000")).toBeInTheDocument();
  });

  // UC-006: 未回収金額が表示され、0より大きい場合は赤色
  it("未回収金額が0より大きい場合は赤色で表示される", () => {
    const { container } = render(<MonthlySummaryCard year={2026} row={mockRow} />);
    const uncollectedValue = container.querySelector(".text-destructive");
    expect(uncollectedValue).toHaveTextContent("¥42,000");
  });

  // UC-007: 未回収金額が0の場合は通常色
  it("未回収金額が0の場合は通常色で表示される", () => {
    const rowWithNoUncollected = { ...mockRow, uncollected: 0 };
    const { container } = render(<MonthlySummaryCard year={2026} row={rowWithNoUncollected} />);
    const destructiveElements = container.querySelectorAll(".text-destructive");
    // 未回収の表示が赤色でないことを確認
    const uncollectedRow = screen.getByText("未回収").closest("div");
    expect(uncollectedRow?.querySelector(".text-destructive")).toBeNull();
  });

  // UC-008: 見込み利益が表示される
  it("見込み利益が表示される", () => {
    render(<MonthlySummaryCard year={2026} row={mockRow} />);
    expect(screen.getByText("¥54,000")).toBeInTheDocument();
  });

  // UC-009: 実現利益が表示される
  it("実現利益が表示される", () => {
    render(<MonthlySummaryCard year={2026} row={mockRow} />);
    expect(screen.getByText("¥12,000")).toBeInTheDocument();
  });

  // UC-010: 利益率がパーセント形式で表示される
  it("利益率がパーセント形式で表示される", () => {
    render(<MonthlySummaryCard year={2026} row={mockRow} />);
    expect(screen.getByText("64.3%")).toBeInTheDocument();
  });

  // UC-011: 利益率がnullの場合は"-"を表示
  it("利益率がnullの場合は'-'を表示する", () => {
    const rowWithNullProfitRate = { ...mockRow, profitRate: null };
    render(<MonthlySummaryCard year={2026} row={rowWithNullProfitRate} />);
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  // UC-012: イベント件数0の月も正しく表示される
  it("イベント件数0の月も正しく表示される", () => {
    const emptyRow: MonthlySummaryRow = {
      month: 1,
      eventCount: 0,
      maleCount: 0,
      femaleCount: 0,
      venueCost: 0,
      expectedRevenue: 0,
      paidRevenue: 0,
      uncollected: 0,
      expectedProfit: 0,
      actualProfit: 0,
      expectedProfitWithCb: 0,
      actualProfitWithCb: 0,
      profitRate: null,
    };
    render(<MonthlySummaryCard year={2026} row={emptyRow} />);
    expect(screen.getByRole("link", { name: "1月" })).toBeInTheDocument();
    expect(screen.getByText("0件")).toBeInTheDocument();
  });
});
```

#### `tests/unit/monthly-summary-table-responsive.test.tsx`

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MonthlySummaryTable } from "@/components/dashboard/monthly-summary-table";
import type { MonthlySummaryRow } from "@/types";

// window.matchMedia のモック
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

const mockRows: MonthlySummaryRow[] = [
  {
    month: 1,
    eventCount: 1,
    maleCount: 3,
    femaleCount: 3,
    venueCost: 15000,
    expectedRevenue: 30000,
    paidRevenue: 30000,
    uncollected: 0,
    expectedProfit: 15000,
    actualProfit: 15000,
    expectedProfitWithCb: 17000,
    actualProfitWithCb: 17000,
    profitRate: 50.0,
  },
];

describe("MonthlySummaryTable レスポンシブ動作", () => {
  // UT-001: md:hidden クラスでモバイル用カードコンテナが存在
  it("モバイル用カードコンテナに md:hidden クラスが適用されている", () => {
    render(<MonthlySummaryTable year={2026} rows={mockRows} />);
    const mobileContainer = document.querySelector(".md\\:hidden");
    expect(mobileContainer).toBeInTheDocument();
  });

  // UT-002: hidden md:block クラスでデスクトップ用テーブルが存在
  it("デスクトップ用テーブルに hidden md:block クラスが適用されている", () => {
    render(<MonthlySummaryTable year={2026} rows={mockRows} />);
    const desktopContainer = document.querySelector(".hidden.md\\:block");
    expect(desktopContainer).toBeInTheDocument();
  });

  // UT-003: 12ヶ月分のカードが存在する
  it("12ヶ月分のカードがレンダリングされる", () => {
    const twelveMonthsRows: MonthlySummaryRow[] = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      eventCount: 0,
      maleCount: 0,
      femaleCount: 0,
      venueCost: 0,
      expectedRevenue: 0,
      paidRevenue: 0,
      uncollected: 0,
      expectedProfit: 0,
      actualProfit: 0,
      expectedProfitWithCb: 0,
      actualProfitWithCb: 0,
      profitRate: null,
    }));
    render(<MonthlySummaryTable year={2026} rows={twelveMonthsRows} />);

    for (let month = 1; month <= 12; month++) {
      expect(screen.getByRole("link", { name: `${month}月` })).toBeInTheDocument();
    }
  });

  // UT-004: テーブルも同時にレンダリングされる（CSS で非表示）
  it("テーブルとカードの両方がDOMに存在する", () => {
    render(<MonthlySummaryTable year={2026} rows={mockRows} />);
    expect(document.querySelector("table")).toBeInTheDocument();
    expect(document.querySelector('[data-slot="card"]')).toBeInTheDocument();
  });
});
```

### 統合テスト

統合テストは不要（UIコンポーネントの表示ロジックのみで、Server Actions や DB 操作を含まないため）。

### E2E テスト

#### `tests/e2e/dashboard-responsive.spec.ts`

```typescript
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

  // 3月のリンクをクリック
  await page.getByRole("link", { name: "3月" }).click();

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
```

### ブラウザ動作確認

| 画面 | 確認項目 | 期待結果 |
|------|----------|----------|
| ダッシュボード（375px） | カード表示 | 12ヶ月分のカードが縦に並ぶ |
| ダッシュボード（375px） | 横スクロール | 発生しない |
| ダッシュボード（375px） | 月リンク | タップでイベント一覧に遷移 |
| ダッシュボード（375px） | 年度切替 | セレクターが操作可能、切替後もカード表示 |
| ダッシュボード（768px） | テーブル表示 | 従来のテーブル形式で表示 |
| ダッシュボード（1280px） | テーブル表示 | 従来のテーブル形式で表示 |

## 実装手順

1. **新規ファイル作成**: `src/components/dashboard/monthly-summary-card.tsx`
   - Card コンポーネントをインポート
   - MonthlySummaryCard コンポーネントを実装
   - 月リンク、イベント件数、参加者数、財務情報を表示

2. **既存ファイル修正**: `src/components/dashboard/monthly-summary-table.tsx`
   - MonthlySummaryCard をインポート
   - return 部分を修正:
     - `<div className="space-y-4 md:hidden">` でカードをラップ
     - 既存テーブルを `<div className="hidden md:block ...">` でラップ

3. **ユニットテスト作成**: `tests/unit/monthly-summary-card.test.tsx`
   - @testing-library/react でコンポーネントテスト
   - 全表示項目のテストケース実装

4. **ユニットテスト作成**: `tests/unit/monthly-summary-table-responsive.test.tsx`
   - レスポンシブクラスの存在確認テスト

5. **E2E テスト作成**: `tests/e2e/dashboard-responsive.spec.ts`
   - Playwright でビューポート切替テスト
   - 横オーバーフロー検証テスト

6. **動作確認**
   - `npm run dev` でローカル起動
   - Chrome DevTools でモバイルエミュレーション（iPhone SE, iPhone 12 Pro）
   - 実機確認（可能であれば）

7. **テスト実行**
   - `npm run test:run` - ユニットテスト
   - `npm run test:e2e` - E2E テスト
