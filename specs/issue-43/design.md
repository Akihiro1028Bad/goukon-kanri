# Issue #43: フッターに著作権表示を追加

## 問題分析

### 現状の動作
現在、アプリケーションにはフッターが存在しない。`src/app/layout.tsx` でレイアウトが定義されており、サイドバー（Navigation）とメインコンテンツ領域のみで構成されている。

### 現在のレイアウト構造（`src/app/layout.tsx:18-24`）
```tsx
<div className="flex min-h-screen min-w-0">
  <Navigation />
  <main className="min-w-0 flex-1 p-4 pt-16 md:p-6 md:pt-6">
    {children}
  </main>
</div>
```

### 問題の原因
- フッターコンポーネントが存在しない
- レイアウトにフッター表示領域がない

---

## 修正方針

### 変更対象ファイル

| ファイル | 変更内容 |
|----------|----------|
| `src/components/layout/footer.tsx` | **新規作成** - フッターコンポーネント |
| `src/app/layout.tsx` | フッターコンポーネントのインポートと配置 |
| `tests/unit/footer.test.tsx` | **新規作成** - ユニットテスト |
| `tests/e2e/footer.spec.ts` | **新規作成** - E2Eテスト |

### 具体的な変更内容

#### 1. `src/components/layout/footer.tsx`（新規作成）

```tsx
export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full py-4 text-center text-sm text-gray-500">
      © {currentYear} Goukon Kanri
    </footer>
  );
}
```

**設計ポイント:**
- Server Component として実装（`"use client"` 不要）
- `new Date().getFullYear()` でサーバーサイドレンダリング時に現在の年を取得
- Tailwind CSS クラス:
  - `w-full`: 幅100%
  - `py-4`: 上下パディング
  - `text-center`: 中央揃え
  - `text-sm`: 小さめのフォントサイズ
  - `text-gray-500`: グレー系の色

#### 2. `src/app/layout.tsx`（修正）

```tsx
import { Footer } from "@/components/layout/footer";

// ...

<body>
  <div className="flex min-h-screen min-w-0 flex-col">
    <div className="flex flex-1 min-w-0">
      <Navigation />
      <main className="min-w-0 flex-1 p-4 pt-16 md:p-6 md:pt-6">
        {children}
      </main>
    </div>
    <Footer />
  </div>
  <Toaster richColors position="top-right" />
</body>
```

**変更点:**
1. `Footer` コンポーネントをインポート
2. 外側の `div` に `flex-col` を追加してフレックス方向を縦に
3. Navigation + main を囲む内側の `div` を追加し、`flex-1` で残りスペースを埋める
4. `Footer` を最下部に配置

### 選択しなかった代替案

| 代替案 | 不採用理由 |
|--------|------------|
| Navigation コンポーネント内にフッターを追加 | ナビゲーションとフッターは責務が異なるため分離すべき |
| main タグ内にフッターを配置 | ページごとに重複し、コンテンツ領域の一部になってしまう |
| CSS で position: fixed を使用 | コンテンツと重なる可能性があり、スクロールが必要なページで問題が発生する |

---

## 影響範囲

### 影響を受けるコンポーネント
- `src/app/layout.tsx` - レイアウト構造の変更
- 全ページ - フッターが表示されるようになる

### 破壊的変更
- なし（フッター追加のみ）

### レイアウトへの影響
- メインコンテンツ領域は引き続き `flex-1` で拡大するため、フッターは常にビューポート下部に配置される
- コンテンツがビューポートより大きい場合、フッターはコンテンツの下に表示される（fixed ではない）

---

## テストケース（カバレッジ 100% 目標）

### ユニットテスト: `tests/unit/footer.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "@/components/layout/footer";

describe("Footer", () => {
  describe("著作権表示", () => {
    it("現在の年で著作権表示がレンダリングされる", () => {
      render(<Footer />);

      const currentYear = new Date().getFullYear();
      expect(screen.getByText(`© ${currentYear} Goukon Kanri`)).toBeInTheDocument();
    });

    it("footer要素としてレンダリングされる", () => {
      render(<Footer />);

      expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    });
  });

  describe("年の動的取得", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("2026年の場合、2026が表示される", () => {
      vi.setSystemTime(new Date("2026-06-15"));
      render(<Footer />);

      expect(screen.getByText("© 2026 Goukon Kanri")).toBeInTheDocument();
    });

    it("2030年の場合、2030が表示される", () => {
      vi.setSystemTime(new Date("2030-01-01"));
      render(<Footer />);

      expect(screen.getByText("© 2030 Goukon Kanri")).toBeInTheDocument();
    });

    it("年末年始の境界（2026-12-31 23:59:59）で正しい年が表示される", () => {
      vi.setSystemTime(new Date("2026-12-31T23:59:59"));
      render(<Footer />);

      expect(screen.getByText("© 2026 Goukon Kanri")).toBeInTheDocument();
    });

    it("年末年始の境界（2027-01-01 00:00:00）で正しい年が表示される", () => {
      vi.setSystemTime(new Date("2027-01-01T00:00:00"));
      render(<Footer />);

      expect(screen.getByText("© 2027 Goukon Kanri")).toBeInTheDocument();
    });
  });

  describe("スタイリング", () => {
    it("中央揃えのクラスが適用されている", () => {
      render(<Footer />);

      const footer = screen.getByRole("contentinfo");
      expect(footer).toHaveClass("text-center");
    });

    it("小さめのフォントサイズのクラスが適用されている", () => {
      render(<Footer />);

      const footer = screen.getByRole("contentinfo");
      expect(footer).toHaveClass("text-sm");
    });

    it("グレー系の色のクラスが適用されている", () => {
      render(<Footer />);

      const footer = screen.getByRole("contentinfo");
      expect(footer).toHaveClass("text-gray-500");
    });
  });
});
```

### E2Eテスト: `tests/e2e/footer.spec.ts`

```ts
import { test, expect } from "@playwright/test";

test.describe("フッター著作権表示", () => {
  test("E2E-050: ダッシュボードページでフッターが表示される", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const footer = page.locator("footer");
    await expect(footer).toBeVisible();

    const currentYear = new Date().getFullYear();
    await expect(footer).toContainText(`© ${currentYear} Goukon Kanri`);
  });

  test("E2E-051: イベント一覧ページでフッターが表示される", async ({ page }) => {
    await page.goto("/events");
    await page.waitForLoadState("networkidle");

    const footer = page.locator("footer");
    await expect(footer).toBeVisible();

    const currentYear = new Date().getFullYear();
    await expect(footer).toContainText(`© ${currentYear} Goukon Kanri`);
  });

  test("E2E-052: 参加者一覧ページでフッターが表示される", async ({ page }) => {
    await page.goto("/participants");
    await page.waitForLoadState("networkidle");

    const footer = page.locator("footer");
    await expect(footer).toBeVisible();

    const currentYear = new Date().getFullYear();
    await expect(footer).toContainText(`© ${currentYear} Goukon Kanri`);
  });

  test("E2E-053: スケジュールページでフッターが表示される", async ({ page }) => {
    await page.goto("/schedule");
    await page.waitForLoadState("networkidle");

    const footer = page.locator("footer");
    await expect(footer).toBeVisible();

    const currentYear = new Date().getFullYear();
    await expect(footer).toContainText(`© ${currentYear} Goukon Kanri`);
  });

  test("E2E-054: 収支レポートページでフッターが表示される", async ({ page }) => {
    await page.goto("/reports");
    await page.waitForLoadState("networkidle");

    const footer = page.locator("footer");
    await expect(footer).toBeVisible();

    const currentYear = new Date().getFullYear();
    await expect(footer).toContainText(`© ${currentYear} Goukon Kanri`);
  });

  test("E2E-055: フッターが中央揃えで表示される", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const footer = page.locator("footer");
    const textAlign = await footer.evaluate((el) =>
      window.getComputedStyle(el).textAlign
    );
    expect(textAlign).toBe("center");
  });

  test("E2E-056: フッターのフォントサイズが小さめである", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const footer = page.locator("footer");
    const fontSize = await footer.evaluate((el) =>
      window.getComputedStyle(el).fontSize
    );
    // text-sm は 0.875rem = 14px
    expect(parseFloat(fontSize)).toBeLessThanOrEqual(14);
  });

  test("E2E-057: モバイル表示でもフッターが正しく表示される", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const footer = page.locator("footer");
    await expect(footer).toBeVisible();

    const currentYear = new Date().getFullYear();
    await expect(footer).toContainText(`© ${currentYear} Goukon Kanri`);
  });
});
```

### ブラウザ動作確認項目

| 画面 | 確認項目 |
|------|----------|
| ダッシュボード（/） | フッターが表示され、現在の年と「Goukon Kanri」が表示される |
| イベント一覧（/events） | フッターが表示され、現在の年と「Goukon Kanri」が表示される |
| イベント詳細（/events/[id]） | フッターが表示される |
| イベント作成（/events/new） | フッターが表示される |
| イベント編集（/events/[id]/edit） | フッターが表示される |
| 参加者一覧（/participants） | フッターが表示される |
| スケジュール（/schedule） | フッターが表示される |
| 収支レポート（/reports） | フッターが表示される |
| モバイル表示（幅 375px） | フッターが中央揃えで正しく表示される |
| タブレット表示（幅 768px） | フッターが中央揃えで正しく表示される |
| デスクトップ表示（幅 1280px） | フッターが中央揃えで正しく表示される |

---

## 実装手順

### Step 1: ユニットテスト用のセットアップ確認
- `@testing-library/react` がインストールされているか確認
- 必要に応じて `vitest.config.ts` を更新

### Step 2: フッターコンポーネントのユニットテスト作成（TDD: RED）
- `tests/unit/footer.test.tsx` を作成
- 上記テストコードを実装
- テストが失敗することを確認

### Step 3: フッターコンポーネントの実装（TDD: GREEN）
- `src/components/layout/footer.tsx` を作成
- 以下の内容で実装:
  ```tsx
  export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
      <footer className="w-full py-4 text-center text-sm text-gray-500">
        © {currentYear} Goukon Kanri
      </footer>
    );
  }
  ```
- ユニットテストが通ることを確認

### Step 4: レイアウトの修正
- `src/app/layout.tsx` を修正:
  1. `import { Footer } from "@/components/layout/footer";` を追加
  2. レイアウト構造を変更してフッターを配置

### Step 5: E2Eテストの作成と実行
- `tests/e2e/footer.spec.ts` を作成
- 上記テストコードを実装
- E2Eテストを実行して全ページでフッターが表示されることを確認

### Step 6: ブラウザでの動作確認
- 開発サーバーを起動 (`npm run dev`)
- 各画面でフッターの表示を目視確認
- モバイル・タブレット・デスクトップ各サイズで確認

### Step 7: 型チェック・Lint・テスト実行
```bash
npm run typecheck
npm run lint
npm run test:run
npm run test:e2e
```

---

## 見積もり

| 項目 | 規模 |
|------|------|
| 変更規模 | **S（小）** |
| 新規ファイル | 3ファイル（コンポーネント1、テスト2） |
| 変更ファイル | 1ファイル（layout.tsx） |
| リスク | 低（既存機能への影響なし） |
