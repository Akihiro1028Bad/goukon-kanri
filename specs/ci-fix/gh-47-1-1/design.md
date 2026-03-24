# CI 修正設計書: PR #48 E2E テスト失敗

## 問題分析

### 背景
PR #48 は Issue #47「フッターに著作権表示を追加」の設計フェーズで作成されたもので、以下のファイルを変更している:
1. `.github/workflows/claude.yml` - Claude Code GitHub Actions ワークフローの大幅な更新
2. `specs/issue-47/design.md` - フッター追加の設計書（新規作成）

### CI 失敗ステップ
- **失敗ジョブ**: `e2e`
- **失敗ステップ**: `Run npm run test:e2e`
- **CI 実行**: https://github.com/Akihiro1028Bad/goukon-kanri/actions/runs/23465176452

### 問題の原因分析

GitHub Actions ログを直接取得できなかったため、コードベースの静的分析に基づいて以下の原因を推測する。

#### 考えられる原因 1: E2E テストの不安定性（Flaky Tests）

E2E テストには以下の不安定要因が存在する:

| ファイル | 行番号 | 問題点 |
|---------|--------|--------|
| `tests/e2e/dashboard.spec.ts` | 27 | `[data-slot="select-trigger"]` セレクタが複数要素に一致する可能性 |
| `tests/e2e/event-crud.spec.ts` | 99 | `[role="switch"]:visible` セレクタの不確実性 |
| `tests/e2e/participant-payment.spec.ts` | 95, 129, 184 | `waitForTimeout(2000)` による固定待機（CI 環境での遅延に脆弱） |
| `tests/e2e/responsive.spec.ts` | 76, 99, 115 | `nav.hidden` セレクタの曖昧さ |

#### 考えられる原因 2: CI 環境での webServer 起動タイムアウト

`playwright.config.ts:28` で webServer のタイムアウトが 60 秒に設定されているが、CI 環境でのビルド後の起動が遅い場合にタイムアウトする可能性がある。

```typescript
// playwright.config.ts:24-35
webServer: {
  command: process.env.CI ? "npm run start" : "npm run dev",
  url: "http://localhost:3000",
  reuseExistingServer: !process.env.CI,
  timeout: 60_000,  // 60秒でタイムアウト
  env: {
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5433/goukon_kanri_test",
    DIRECT_URL: "postgresql://postgres:postgres@localhost:5433/goukon_kanri_test",
  },
},
```

#### 考えられる原因 3: テスト間のデータ汚染

`cleanDatabase()` が各テストの `beforeEach` で呼ばれるが、非同期処理の完了を待たずに次の操作に進む可能性がある。

```typescript
// tests/e2e/dashboard.spec.ts:4-8
test.beforeEach(async ({ page }) => {
  await cleanDatabase();  // DB クリーン完了を待つ
  await page.goto("/");   // しかし、webServer がデータを反映するまでの遅延は考慮されていない
  await page.waitForLoadState("networkidle");
});
```

#### 考えられる原因 4: セレクタの堅牢性不足

shadcn/ui の `data-slot` 属性に依存しており、ライブラリのバージョンアップで属性名が変わると全テストが破壊される。

```typescript
// 複数ファイルで使用されている脆弱なセレクタ
page.locator('[data-slot="select-trigger"]')
page.locator('[data-slot="dialog-content"]')
page.locator('[data-slot="sheet-content"]')
```

---

## 修正方針

### 方針 1: セレクタの堅牢化（推奨）

`data-slot` 属性依存から、より安定した `role` ベースのセレクタに変更する。

#### 変更対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `tests/e2e/dashboard.spec.ts` | セレクタを `role` ベースに変更 |
| `tests/e2e/event-crud.spec.ts` | セレクタを `role` ベースに変更、削除確認ダイアログの待機改善 |
| `tests/e2e/participant-payment.spec.ts` | `waitForTimeout` を条件付き待機に置き換え |
| `tests/e2e/responsive.spec.ts` | ナビゲーションセレクタの改善 |
| `tests/e2e/schedule-line.spec.ts` | ダイアログセレクタの改善 |
| `tests/e2e/reports.spec.ts` | セレクタの確認と改善 |

### 方針 2: 固定待機の排除

`waitForTimeout()` を使用している箇所を、条件付き待機に置き換える。

**Before:**
```typescript
await page.waitForTimeout(2000);
await page.goto(eventUrl);
```

**After:**
```typescript
// 状態変更を待つ
await expect(page.locator("text=済").first()).toBeVisible({ timeout: 10000 });
// または
await page.waitForResponse(response => response.url().includes('/api/') && response.status() === 200);
```

### 方針 3: webServer タイムアウトの延長

CI 環境でのビルド後起動が遅い場合に備え、タイムアウトを延長する。

**変更ファイル**: `playwright.config.ts`

```typescript
webServer: {
  command: process.env.CI ? "npm run start" : "npm run dev",
  url: "http://localhost:3000",
  reuseExistingServer: !process.env.CI,
  timeout: 120_000,  // 60秒 → 120秒に延長
  env: {
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5433/goukon_kanri_test",
    DIRECT_URL: "postgresql://postgres:postgres@localhost:5433/goukon_kanri_test",
  },
},
```

### 代替案と却下理由

| 代替案 | 却下理由 |
|--------|---------|
| テストの並列実行を有効化 | DB 共有のため、データ汚染リスクが高い |
| E2E テストを CI から除外 | 品質保証が低下する |
| リトライ回数の増加（現在 2 回） | 根本原因の解決にならない |

---

## 影響範囲

### 影響を受けるファイル

| ファイル | 影響 |
|---------|------|
| `tests/e2e/*.spec.ts` | セレクタ変更によるテストコード修正 |
| `playwright.config.ts` | タイムアウト設定の変更 |

### 破壊的変更

**なし** — テストコードの内部実装のみの変更。本番コードへの影響なし。

---

## テストケース（カバレッジ 100%）

### 修正後の検証項目

E2E テスト自体の修正のため、修正後は全 E2E テストが安定して通過することを確認する。

#### 既存 E2E テストの安定性確認

| テストファイル | テスト数 | 確認項目 |
|---------------|---------|---------|
| `dashboard.spec.ts` | 4 | 年度切替のセレクタが安定動作 |
| `event-crud.spec.ts` | 6 | イベント削除・復元の操作が安定 |
| `participant-payment.spec.ts` | 6 | 決済更新の状態反映待機が適切 |
| `reports.spec.ts` | 2 | レポートページの表示確認 |
| `schedule-line.spec.ts` | 3 | LINEテキストダイアログの操作 |
| `responsive.spec.ts` | 7 | モバイル/タブレット/PCでの操作 |
| **合計** | **28** | |

#### CI 実行確認

1. ローカルで `npm run test:e2e` を 5 回連続実行し、全て成功することを確認
2. PR 作成後、CI の e2e ジョブが成功することを確認
3. リトライなしで成功することを目標とする（Flaky ではない）

### 具体的な修正内容

#### 1. `tests/e2e/dashboard.spec.ts`

**Line 27: セレクタの堅牢化**

```typescript
// Before
const yearTrigger = page.locator('[data-slot="select-trigger"]').first();

// After
const yearTrigger = page.getByRole('combobox', { name: /年/ });
```

#### 2. `tests/e2e/event-crud.spec.ts`

**Line 87-92: ダイアログ確認の改善**

```typescript
// Before
const dialog = page.locator('[data-slot="dialog-content"]');
await expect(dialog).toBeVisible();
await dialog.getByRole("button", { name: "削除する" }).click();
await page.waitForURL("/events");

// After
const dialog = page.getByRole('alertdialog');
await expect(dialog).toBeVisible();
await dialog.getByRole("button", { name: "削除する" }).click();
await expect(dialog).not.toBeVisible({ timeout: 10000 });
await page.waitForURL("/events", { timeout: 30000 });
```

**Line 99: スイッチセレクタの改善**

```typescript
// Before
await page.locator('[role="switch"]:visible').first().click({ force: true });

// After
const showDeletedSwitch = page.getByRole('switch', { name: /削除済み/ });
await showDeletedSwitch.click();
```

#### 3. `tests/e2e/participant-payment.spec.ts`

**Line 95, 129, 184: 固定待機の排除**

```typescript
// Before
await page.waitForTimeout(2000);
await page.goto(eventUrl);
await expect(page.locator("text=済").first()).toBeVisible();

// After
// 固定待機を排除し、expect で直接待機
await expect(page.locator("text=済").first()).toBeVisible({ timeout: 10000 });
```

#### 4. `tests/e2e/responsive.spec.ts`

**Line 76, 99, 115: ナビゲーションセレクタの改善**

```typescript
// Before
await expect(page.locator("nav.hidden")).not.toBeVisible();

// After
// サイドバーナビゲーションの表示/非表示を確認
const sidebar = page.locator('nav').first();
await expect(sidebar).not.toBeVisible();
// または、より具体的なセレクタを使用
const sidebarLinks = page.locator('nav >> role=link');
await expect(sidebarLinks.first()).not.toBeVisible();
```

#### 5. `playwright.config.ts`

**Line 28: タイムアウト延長**

```typescript
// Before
timeout: 60_000,

// After
timeout: 120_000,
```

---

## 実装手順

### Step 1: ローカル環境での問題再現

1. `docker compose up -d` でテスト DB を起動
2. `npm run build` でプロダクションビルド
3. `npm run test:e2e` を実行し、失敗するテストを特定

### Step 2: セレクタの堅牢化

1. `tests/e2e/dashboard.spec.ts` のセレクタを修正
2. `tests/e2e/event-crud.spec.ts` のセレクタを修正
3. `tests/e2e/participant-payment.spec.ts` の待機処理を修正
4. `tests/e2e/responsive.spec.ts` のセレクタを修正
5. `tests/e2e/schedule-line.spec.ts` のセレクタを修正

### Step 3: Playwright 設定の調整

1. `playwright.config.ts` の webServer タイムアウトを 120 秒に延長

### Step 4: ローカル検証

1. `npm run test:e2e` を 5 回連続実行
2. 全て成功することを確認

### Step 5: CI 検証

1. ブランチを push
2. CI の e2e ジョブが成功することを確認
3. リトライなしで成功した場合は完了

---

## 変更ファイル一覧

| ファイル | 操作 | 変更行数（予測） |
|---------|------|-----------------|
| `tests/e2e/dashboard.spec.ts` | 編集 | 約 5 行 |
| `tests/e2e/event-crud.spec.ts` | 編集 | 約 10 行 |
| `tests/e2e/participant-payment.spec.ts` | 編集 | 約 15 行 |
| `tests/e2e/responsive.spec.ts` | 編集 | 約 10 行 |
| `tests/e2e/schedule-line.spec.ts` | 編集 | 約 5 行 |
| `playwright.config.ts` | 編集 | 約 2 行 |
| **合計** | | 約 47 行 |

---

## 工数見積

**規模: S（小）**

- テストコードの軽微な修正のみ
- 本番コードへの影響なし
- 既存テストの動作確認で完了

---

## 注意事項

1. **CI ログの確認が必要**: 実際の失敗原因を特定するには、GitHub Actions の詳細ログを確認する必要がある。本設計書は静的分析に基づく推測を含む。

2. **Playwright Report の確認**: CI 失敗時にアップロードされる `playwright-report` アーティファクトを確認することで、具体的な失敗箇所を特定できる。

3. **shadcn/ui のバージョン固定**: `data-slot` 属性への依存を完全に排除できない場合は、`package.json` で shadcn/ui のバージョンを固定することを検討する。
