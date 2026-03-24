# Issue #47: フッターに著作権表示を追加

## 問題分析

### 現状の動作
- 現在のレイアウト (`src/app/layout.tsx:11-29`) は Navigation コンポーネント（サイドバー）と main エリアのみで構成
- フッターコンポーネントは存在しない
- レイアウト構造:
  ```
  <div className="flex min-h-screen min-w-0">
    <Navigation />  // サイドバー（デスクトップ）/ ハンバーガーメニュー（モバイル）
    <main>...</main>
  </div>
  ```

### 問題の原因
- フッター要素が未実装のため、著作権表示を追加する場所がない

### 対象ファイル
| ファイル | 行番号 | 変更内容 |
|---------|--------|---------|
| `src/components/layout/footer.tsx` | 新規作成 | フッターコンポーネント |
| `src/app/layout.tsx` | 19-24行目 | フッターをレイアウトに追加 |

---

## 修正方針

### 選択した方針: 独立したフッターコンポーネントを作成

フッターを独立したコンポーネント (`src/components/layout/footer.tsx`) として作成し、`layout.tsx` に組み込む。

**理由:**
- Navigation と同じ `layout/` ディレクトリに配置することで、レイアウト関連コンポーネントの一貫性を保つ
- 将来的にフッターに追加情報（リンク等）を追加する際の拡張性を確保
- テストが容易

### 代替案と却下理由

| 代替案 | 却下理由 |
|--------|---------|
| `layout.tsx` に直接インライン記述 | コンポーネント分離の原則に反する。フッターが複雑化した場合にレイアウトファイルが肥大化する |
| Navigation 内にフッター追加 | ナビゲーションとフッターは意味的に異なる要素。責務の分離が崩れる |

### 実装詳細

#### 1. フッターコンポーネント (`src/components/layout/footer.tsx`)

```tsx
export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-gray-50 py-4">
      <p className="text-center text-sm text-gray-500">
        © {currentYear} Goukon Kanri
      </p>
    </footer>
  );
}
```

**設計ポイント:**
- `new Date().getFullYear()` で現在の年を動的取得（ハードコードしない）
- Server Component として実装（`"use client"` 不要）— 状態やイベントハンドラなし
- Tailwind CSS クラス:
  - `border-t`: 上部に区切り線
  - `bg-gray-50`: Navigation と同じ背景色で統一感
  - `py-4`: 適切な縦パディング
  - `text-center`: 中央揃え
  - `text-sm`: 小さめのフォントサイズ（要件通り）
  - `text-gray-500`: グレー系の色（要件通り）

#### 2. レイアウト変更 (`src/app/layout.tsx`)

```tsx
import { Footer } from "@/components/layout/footer";

// ...

<div className="flex min-h-screen min-w-0 flex-col">
  <div className="flex min-w-0 flex-1">
    <Navigation />
    <main className="min-w-0 flex-1 p-4 pt-16 md:p-6 md:pt-6">
      {children}
    </main>
  </div>
  <Footer />
</div>
```

**レイアウト構造の変更:**
- 外側の div に `flex-col` を追加してフッターを最下部に配置
- Navigation + main を新しい div でラップし `flex-1` で残り高さを占有
- Footer は flex-col の最後に配置され、常にビューポート下部に表示

---

## 影響範囲

### 影響を受けるコンポーネント
| コンポーネント | 影響 |
|---------------|------|
| `src/app/layout.tsx` | レイアウト構造の変更（div ネストが1階層増加） |
| 全ページ | フッターが表示されるようになる（視覚的変更のみ） |

### 破壊的変更
**なし** — 既存の機能に影響なし。純粋な追加変更。

### 考慮事項
- モバイル表示: フッターはコンテンツ下に表示。ビューポート高さが足りない場合はスクロールが必要
- サイドバー: デスクトップではサイドバーの外側（main の下）にフッターが配置される

---

## テストケース（カバレッジ 100%）

### ユニットテスト

**ファイル:** `tests/unit/footer.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "@/components/layout/footer";

describe("Footer", () => {
  describe("著作権表示", () => {
    it("著作権記号と「Goukon Kanri」が表示される", () => {
      render(<Footer />);

      const footer = screen.getByRole("contentinfo");
      expect(footer).toHaveTextContent("©");
      expect(footer).toHaveTextContent("Goukon Kanri");
    });

    it("現在の年が動的に表示される", () => {
      const currentYear = new Date().getFullYear();
      render(<Footer />);

      expect(screen.getByRole("contentinfo")).toHaveTextContent(
        String(currentYear)
      );
    });
  });

  describe("年の動的取得", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("2025年の場合は2025が表示される", () => {
      vi.setSystemTime(new Date("2025-06-15"));
      render(<Footer />);

      expect(screen.getByRole("contentinfo")).toHaveTextContent("© 2025");
    });

    it("2030年の場合は2030が表示される", () => {
      vi.setSystemTime(new Date("2030-12-31"));
      render(<Footer />);

      expect(screen.getByRole("contentinfo")).toHaveTextContent("© 2030");
    });

    it("年末年始の境界（2025年12月31日 23:59:59）", () => {
      vi.setSystemTime(new Date("2025-12-31T23:59:59"));
      render(<Footer />);

      expect(screen.getByRole("contentinfo")).toHaveTextContent("© 2025");
    });

    it("年末年始の境界（2026年1月1日 00:00:00）", () => {
      vi.setSystemTime(new Date("2026-01-01T00:00:00"));
      render(<Footer />);

      expect(screen.getByRole("contentinfo")).toHaveTextContent("© 2026");
    });
  });

  describe("スタイリング", () => {
    it("footer 要素としてレンダリングされる", () => {
      render(<Footer />);

      const footer = screen.getByRole("contentinfo");
      expect(footer.tagName).toBe("FOOTER");
    });

    it("適切な CSS クラスが適用されている", () => {
      render(<Footer />);

      const footer = screen.getByRole("contentinfo");
      expect(footer).toHaveClass("border-t", "bg-gray-50", "py-4");
    });

    it("テキストに適切なスタイルが適用されている", () => {
      render(<Footer />);

      const paragraph = screen.getByRole("contentinfo").querySelector("p");
      expect(paragraph).toHaveClass("text-center", "text-sm", "text-gray-500");
    });
  });

  describe("表示形式", () => {
    it("著作権表示が正しい形式で表示される（© YYYY Goukon Kanri）", () => {
      const currentYear = new Date().getFullYear();
      render(<Footer />);

      const footer = screen.getByRole("contentinfo");
      expect(footer).toHaveTextContent(`© ${currentYear} Goukon Kanri`);
    });
  });
});
```

**テストカバレッジ:**
| 観点 | テストケース数 |
|------|---------------|
| 著作権表示の内容 | 2 |
| 年の動的取得 | 4（通常ケース + 境界値） |
| スタイリング | 3 |
| 表示形式 | 1 |
| **合計** | **10** |

### ブラウザ動作確認

| 画面 | 確認項目 |
|------|---------|
| ダッシュボード (`/`) | フッターが表示され、現在の年が表示されている |
| イベント一覧 (`/events`) | フッターが表示されている |
| 参加者一覧 (`/participants`) | フッターが表示されている |
| スケジュール (`/schedule`) | フッターが表示されている |
| 収支レポート (`/reports`) | フッターが表示されている |
| モバイル表示 | フッターが正しくコンテンツ下に表示される |
| デスクトップ表示 | サイドバーの下、main エリアと同じ幅でフッターが表示される |

---

## 実装手順

### Step 1: ユニットテストの作成（RED）
1. `tests/unit/footer.test.tsx` を作成
2. 上記のテストケースを実装
3. テスト実行 → 全て失敗することを確認

### Step 2: フッターコンポーネントの作成（GREEN）
1. `src/components/layout/footer.tsx` を新規作成
2. Footer コンポーネントを実装:
   - `new Date().getFullYear()` で年を取得
   - JSX で著作権表示をレンダリング
   - Tailwind CSS でスタイリング
3. テスト実行 → 全て成功することを確認

### Step 3: レイアウトへの組み込み
1. `src/app/layout.tsx` を編集:
   - `Footer` コンポーネントをインポート
   - レイアウト構造を変更（flex-col + ラッパー div 追加）
   - `<Footer />` を追加

### Step 4: ブラウザ動作確認
1. 開発サーバー起動: `npm run dev`
2. 全ページでフッターの表示を確認
3. モバイル/デスクトップ両方で確認

### Step 5: 型チェック・Lint
1. `npx tsc --noEmit` で型エラーがないことを確認
2. `npm run lint` で Lint エラーがないことを確認

---

## 変更ファイル一覧

| ファイル | 操作 | 変更行数（予測） |
|---------|------|-----------------|
| `src/components/layout/footer.tsx` | 新規作成 | 約15行 |
| `src/app/layout.tsx` | 編集 | 約10行変更 |
| `tests/unit/footer.test.tsx` | 新規作成 | 約80行 |
| **合計** | | 約105行 |

---

## 工数見積

**規模: S（小）**

- 単純な UI コンポーネントの追加
- ビジネスロジックなし
- 既存機能への影響なし
