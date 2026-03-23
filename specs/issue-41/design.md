# Issue #41: ダッシュボードのスマホ表示デザイン修正

## 問題分析

### 現状の動作

ダッシュボード（`/`）の月別サマリーテーブルは13カラムを持つ横長のテーブルで表示されている:

| カラム | 内容 |
|--------|------|
| 月 | 1月〜12月のリンク |
| 件数 | イベント数 |
| 男性 | 男性参加者数 |
| 女性 | 女性参加者数 |
| 会場費 | 会場費用 |
| 見込み収入 | 予想収入 |
| 決済済み | 決済完了額 |
| 未回収 | 未回収額 |
| 見込み利益 | 予想利益 |
| 実現利益 | 実際利益 |
| 見込み利益(CB込) | CB込み予想利益 |
| 実現利益(CB込) | CB込み実際利益 |
| 利益率 | パーセンテージ |

### 問題の原因

1. **カラム数が多すぎる**: 13カラムあり、スマホの画面幅（320px〜428px程度）では横スクロールが必須
2. **横スクロールのみの対応**: `overflow-x-auto` で横スクロールを可能にしているが、データを俯瞰できない
3. **重要度の区別がない**: 全カラムが同じ優先度で表示されており、スマホで最も見たい情報が分からない
4. **文字サイズ**: 標準の `text-sm` のままで、スマホでは小さい

**該当ファイル**:
- `src/components/dashboard/monthly-summary-table.tsx:30-103` - カラム定義
- `src/components/dashboard/monthly-summary-table.tsx:111-146` - テーブルレンダリング

## 修正方針

### 選択したアプローチ: レスポンシブカード表示 + テーブル切り替え

**スマホ（< md: 768px）**: カード形式で各月を表示
**タブレット・PC（>= md: 768px）**: 従来のテーブル形式を維持

### 具体的な変更内容

#### 1. カラムの優先度分類

| 優先度 | カラム | スマホでの表示 |
|--------|--------|---------------|
| 高 | 月、件数、男性、女性 | 常に表示 |
| 中 | 見込み収入、決済済み、実現利益 | カードの展開時に表示 |
| 低 | 会場費、未回収、見込み利益、見込み利益(CB込)、実現利益(CB込)、利益率 | PC/タブレットのみ |

#### 2. 変更するファイル

| ファイル | 変更内容 |
|----------|----------|
| `src/components/dashboard/monthly-summary-table.tsx` | カード表示とテーブル表示の両方をサポートするよう改修 |
| `src/app/page.tsx` | 変更なし |
| `src/components/dashboard/year-selector.tsx` | 変更なし |

### 代替案（採用しなかった理由）

1. **横スクロール改善のみ**
   - 理由: スマホでの UX が根本的に改善されない。ユーザーは全体像を把握できない

2. **カラム非表示のみ（レスポンシブテーブル）**
   - 理由: `hidden md:table-cell` で単純に非表示にすると、重要な情報にアクセスできなくなる

3. **アコーディオンテーブル**
   - 理由: TanStack Table との統合が複雑。カード形式の方がモバイルの UX として自然

## 影響範囲

### 影響を受けるコンポーネント

| コンポーネント | 影響 |
|----------------|------|
| `MonthlySummaryTable` | 直接変更対象 |
| `DashboardPage` | props 変更なし（既存インターフェースを維持） |
| `YearSelector` | 影響なし |

### 破壊的変更

なし。既存の props インターフェース（`year: number`, `rows: MonthlySummaryRow[]`）は維持する。

## テストケース（カバレッジ 100% 目標）

### ユニットテスト

対象ファイル: `tests/unit/monthly-summary-table.test.tsx`（新規作成）

```typescript
import { render, screen } from "@testing-library/react";
import { MonthlySummaryTable } from "@/components/dashboard/monthly-summary-table";
import type { MonthlySummaryRow } from "@/types";

const mockRows: MonthlySummaryRow[] = [
  {
    month: 1,
    eventCount: 2,
    maleCount: 6,
    femaleCount: 6,
    venueCost: 30000,
    expectedRevenue: 60000,
    paidRevenue: 50000,
    uncollected: 10000,
    expectedProfit: 30000,
    actualProfit: 20000,
    expectedProfitWithCb: 35000,
    actualProfitWithCb: 25000,
    profitRate: 50.0,
  },
  // 12ヶ月分のデータ
];

describe("MonthlySummaryTable", () => {
  // 1. テーブル表示（PC/タブレット）のテスト
  describe("テーブル表示（>= 768px）", () => {
    beforeEach(() => {
      // viewport を md 以上に設定
      Object.defineProperty(window, "innerWidth", { value: 1024, writable: true });
      window.dispatchEvent(new Event("resize"));
    });

    it("全12ヶ月の行が表示される", () => {
      render(<MonthlySummaryTable year={2026} rows={mockRows} />);
      expect(screen.getByRole("link", { name: "1月" })).toBeInTheDocument();
    });

    it("全13カラムのヘッダーが表示される", () => {
      render(<MonthlySummaryTable year={2026} rows={mockRows} />);
      expect(screen.getByText("月")).toBeInTheDocument();
      expect(screen.getByText("件数")).toBeInTheDocument();
      expect(screen.getByText("利益率")).toBeInTheDocument();
    });

    it("金額が日本円フォーマットで表示される", () => {
      render(<MonthlySummaryTable year={2026} rows={mockRows} />);
      expect(screen.getByText("¥60,000")).toBeInTheDocument();
    });

    it("月リンクが正しいURLを持つ", () => {
      render(<MonthlySummaryTable year={2026} rows={mockRows} />);
      const link = screen.getByRole("link", { name: "1月" });
      expect(link).toHaveAttribute("href", "/events?year=2026&month=1");
    });

    it("利益率が null の場合は「-」を表示する", () => {
      const rowsWithNullRate = [{ ...mockRows[0], profitRate: null }];
      render(<MonthlySummaryTable year={2026} rows={rowsWithNullRate} />);
      expect(screen.getByText("-")).toBeInTheDocument();
    });
  });

  // 2. カード表示（スマホ）のテスト
  describe("カード表示（< 768px）", () => {
    beforeEach(() => {
      Object.defineProperty(window, "innerWidth", { value: 375, writable: true });
      window.dispatchEvent(new Event("resize"));
    });

    it("カード形式で各月が表示される", () => {
      render(<MonthlySummaryTable year={2026} rows={mockRows} />);
      // カードのテストはdata-testid等で確認
      expect(screen.getByTestId("month-card-1")).toBeInTheDocument();
    });

    it("主要情報（月、件数、男性、女性）が表示される", () => {
      render(<MonthlySummaryTable year={2026} rows={mockRows} />);
      expect(screen.getByText("1月")).toBeInTheDocument();
      expect(screen.getByText("2件")).toBeInTheDocument();
    });

    it("副次情報（見込み収入、決済済み、実現利益）が表示される", () => {
      render(<MonthlySummaryTable year={2026} rows={mockRows} />);
      expect(screen.getByText("見込み収入")).toBeInTheDocument();
      expect(screen.getByText("¥60,000")).toBeInTheDocument();
    });

    it("月リンクが正しいURLを持つ", () => {
      render(<MonthlySummaryTable year={2026} rows={mockRows} />);
      const link = screen.getByRole("link", { name: /1月/ });
      expect(link).toHaveAttribute("href", "/events?year=2026&month=1");
    });
  });

  // 3. 空データのテスト
  describe("空データ", () => {
    it("データがない場合はメッセージを表示する", () => {
      render(<MonthlySummaryTable year={2026} rows={[]} />);
      expect(screen.getByText("データがありません")).toBeInTheDocument();
    });
  });

  // 4. アクセシビリティテスト
  describe("アクセシビリティ", () => {
    it("テーブルに適切なARIA属性がある", () => {
      render(<MonthlySummaryTable year={2026} rows={mockRows} />);
      // テーブルのアクセシビリティ確認
    });

    it("カードがキーボード操作可能", () => {
      render(<MonthlySummaryTable year={2026} rows={mockRows} />);
      // キーボードナビゲーションのテスト
    });
  });
});
```

### 統合テスト

対象ファイル: `tests/integration/dashboard-queries.test.ts`（既存の `queries.test.ts` に追加または新規作成）

```typescript
import { getMonthlySummary } from "@/queries/dashboard-queries";

describe("getMonthlySummary", () => {
  it("12ヶ月分のデータを返す", async () => {
    const rows = await getMonthlySummary(2026);
    expect(rows).toHaveLength(12);
    expect(rows[0].month).toBe(1);
    expect(rows[11].month).toBe(12);
  });

  it("各行が必要な全フィールドを持つ", async () => {
    const rows = await getMonthlySummary(2026);
    const row = rows[0];
    expect(row).toHaveProperty("month");
    expect(row).toHaveProperty("eventCount");
    expect(row).toHaveProperty("maleCount");
    expect(row).toHaveProperty("femaleCount");
    expect(row).toHaveProperty("venueCost");
    expect(row).toHaveProperty("expectedRevenue");
    expect(row).toHaveProperty("paidRevenue");
    expect(row).toHaveProperty("uncollected");
    expect(row).toHaveProperty("expectedProfit");
    expect(row).toHaveProperty("actualProfit");
    expect(row).toHaveProperty("expectedProfitWithCb");
    expect(row).toHaveProperty("actualProfitWithCb");
    expect(row).toHaveProperty("profitRate");
  });
});
```

### E2E テスト

対象ファイル: `tests/e2e/dashboard.spec.ts`（既存ファイルに追加）

```typescript
// E2E-041: スマホ表示でカード形式が表示される
test("E2E-041: スマホ表示でカード形式が表示される", async ({ page }) => {
  // スマホサイズに設定
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");

  // カード形式が表示されることを確認
  await expect(page.locator('[data-testid="month-card-1"]')).toBeVisible();

  // テーブルが非表示であることを確認
  await expect(page.locator('table')).not.toBeVisible();
});

// E2E-042: タブレット/PC表示でテーブルが表示される
test("E2E-042: タブレット/PC表示でテーブルが表示される", async ({ page }) => {
  // タブレットサイズに設定
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/");

  // テーブルが表示されることを確認
  await expect(page.locator('table')).toBeVisible();

  // カードが非表示であることを確認
  await expect(page.locator('[data-testid="month-card-1"]')).not.toBeVisible();
});

// E2E-043: スマホでカードから月別イベント一覧に遷移
test("E2E-043: スマホでカードから月別イベント一覧に遷移", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/?year=2026");

  // 3月のカードをクリック
  await page.locator('[data-testid="month-card-3"]').click();

  // イベント一覧に遷移
  await page.waitForURL(/\/events\?year=2026&month=3/);
});

// E2E-044: スマホ表示でスクロールせずに主要情報が見える
test("E2E-044: スマホ表示でスクロールせずに主要情報が見える", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");

  // 主要情報が画面内に収まっていることを確認
  const card = page.locator('[data-testid="month-card-1"]');
  const box = await card.boundingBox();
  expect(box?.x).toBeGreaterThanOrEqual(0);
  expect(box?.width).toBeLessThanOrEqual(375);
});
```

### ブラウザ動作確認チェックリスト

#### スマホ表示（< 768px）

| 項目 | 確認内容 | 確認結果 |
|------|----------|----------|
| カード表示 | 各月がカード形式で表示される | [ ] |
| 主要情報 | 月、件数、男性/女性が見やすく表示される | [ ] |
| 副次情報 | 見込み収入、決済済み、実現利益が表示される | [ ] |
| リンク | 月をタップするとイベント一覧に遷移する | [ ] |
| スクロール | 縦スクロールのみで全月が確認できる | [ ] |
| タッチ操作 | タップ可能な要素が十分なサイズ（44px以上） | [ ] |

#### タブレット表示（768px〜1024px）

| 項目 | 確認内容 | 確認結果 |
|------|----------|----------|
| テーブル表示 | 従来のテーブル形式で表示される | [ ] |
| カラム | 全13カラムが表示される | [ ] |
| 横スクロール | 必要に応じて横スクロール可能 | [ ] |

#### PC表示（> 1024px）

| 項目 | 確認内容 | 確認結果 |
|------|----------|----------|
| テーブル表示 | 従来のテーブル形式で表示される | [ ] |
| 全カラム表示 | 13カラム全てが見える | [ ] |
| レイアウト | 崩れなく表示される | [ ] |

## 実装手順

### 手順 1: ユニットテストの作成（RED）

1. `tests/unit/monthly-summary-table.test.tsx` を新規作成
2. テーブル表示のテストを記述
3. カード表示のテストを記述
4. テスト実行で失敗を確認

### 手順 2: カード表示コンポーネントの実装（GREEN）

1. `src/components/dashboard/monthly-summary-table.tsx` を編集
2. 以下の変更を行う:

```typescript
// 変更前（行30-103）: columns 定義のみ
// 変更後: カード表示用コンポーネントを追加

function MobileCard({ row, year }: { row: MonthlySummaryRow; year: number }) {
  return (
    <Link
      href={`/events?year=${year}&month=${row.month}`}
      data-testid={`month-card-${row.month}`}
      className="block p-4 border rounded-lg hover:bg-muted/50 transition-colors"
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-lg font-bold text-blue-600">{row.month}月</span>
        <span className="text-sm text-muted-foreground">{row.eventCount}件</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">男性: </span>
          <span className="font-medium">{row.maleCount}名</span>
        </div>
        <div>
          <span className="text-muted-foreground">女性: </span>
          <span className="font-medium">{row.femaleCount}名</span>
        </div>
        <div>
          <span className="text-muted-foreground">見込み収入: </span>
          <span className="font-medium">{formatCurrency(row.expectedRevenue)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">決済済み: </span>
          <span className="font-medium">{formatCurrency(row.paidRevenue)}</span>
        </div>
        <div className="col-span-2">
          <span className="text-muted-foreground">実現利益: </span>
          <span className="font-medium">{formatCurrency(row.actualProfit)}</span>
        </div>
      </div>
    </Link>
  );
}
```

3. `MonthlySummaryTable` コンポーネントのレンダリング部分を変更:

```typescript
// 変更前（行111-146）
// 変更後
export function MonthlySummaryTable({ year, rows }: Props) {
  // ... columns 定義は維持 ...

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      {/* スマホ用カード表示 */}
      <div className="md:hidden space-y-3">
        {rows.length > 0 ? (
          rows.map((row) => (
            <MobileCard key={row.month} row={row} year={year} />
          ))
        ) : (
          <p className="text-center py-8 text-muted-foreground">データがありません</p>
        )}
      </div>

      {/* PC/タブレット用テーブル表示 */}
      <div className="hidden md:block rounded-md border overflow-x-auto">
        <Table>
          {/* 既存のテーブル実装を維持 */}
        </Table>
      </div>
    </>
  );
}
```

### 手順 3: テスト通過の確認

1. `npm run test:run` でユニットテスト実行
2. 全テストが通過することを確認

### 手順 4: E2E テストの追加と実行

1. `tests/e2e/dashboard.spec.ts` にスマホ表示テストを追加
2. `npm run test:e2e` で E2E テスト実行
3. 全テストが通過することを確認

### 手順 5: ブラウザ動作確認

1. `npm run dev` で開発サーバー起動
2. Chrome DevTools でスマホ表示をエミュレート（iPhone SE, iPhone 12 Pro など）
3. 上記チェックリストを実施

### 手順 6: リファクタリング（必要に応じて）

1. コードの重複を削減
2. スタイルの調整
3. アクセシビリティの改善

## 追加の検討事項

### パフォーマンス

- カード表示は12要素のため、パフォーマンスへの影響は軽微
- CSS の `md:hidden` / `hidden md:block` による切り替えは初回レンダリングのみで効率的

### アクセシビリティ

- カードはリンク要素として実装し、キーボードナビゲーションに対応
- 十分なコントラスト比を維持
- タッチターゲットは 44px 以上を確保

### 将来の拡張性

- 必要に応じてカードの展開/折りたたみ機能を追加可能
- ユーザー設定で表示モードを切り替える機能も検討可能
