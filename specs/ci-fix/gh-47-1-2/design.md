# CI 修正設計書: E2E テスト失敗 (gh-47-1-2)

## 1. 問題分析

### 1.1 現状の動作

GitHub Actions の E2E テストジョブが失敗している。原因は複数の E2E テストファイルで使用されているセレクタが脆弱であり、CI 環境で不安定な動作を引き起こしている。

### 1.2 問題の原因

#### 原因 1: `data-slot` 属性への依存（主原因）

shadcn/ui の内部実装詳細である `data-slot` 属性をセレクタとして使用しているため、ライブラリの内部変更により即座に破壊される。

**影響を受けるファイルと行番号:**

| ファイル | 行番号 | 問題のあるセレクタ |
|---------|--------|-------------------|
| `tests/e2e/dashboard.spec.ts` | L27, L87 | `[data-slot="select-trigger"]` |
| `tests/e2e/event-crud.spec.ts` | L87 | `[data-slot="dialog-content"]` |
| `tests/e2e/participant-payment.spec.ts` | L34-36, L118-119, L169-170 | `[data-slot="select-trigger"]`, `[data-slot="dialog-content"]` |
| `tests/e2e/responsive.spec.ts` | L82, L144-145, L171-172, L216-217 | `[data-slot="sheet-content"]`, `[data-slot="select-trigger"]`, `[data-slot="dialog-content"]` |
| `tests/e2e/schedule-line.spec.ts` | L100-101 | `[data-slot="dialog-content"]` |

#### 原因 2: 固定待機時間 `waitForTimeout` の使用（副原因）

`page.waitForTimeout(2000)` のような固定待機を使用しており、CI 環境での遅延に対応できない。

**影響を受けるファイルと行番号:**

| ファイル | 行番号 | 問題のあるコード |
|---------|--------|-----------------|
| `tests/e2e/event-crud.spec.ts` | L106 | `await page.waitForTimeout(1000)` |
| `tests/e2e/participant-payment.spec.ts` | L95, L129, L184 | `await page.waitForTimeout(2000)` |
| `tests/e2e/responsive.spec.ts` | L192 | `await page.waitForTimeout(2000)` |

#### 原因 3: webServer タイムアウト不足（副原因）

`playwright.config.ts` L28 で `timeout: 60_000` と設定されているが、CI 環境でのプロダクションビルド後の起動が遅延した場合に不足する可能性がある。

#### 原因 4: 脆弱な CSS クラスセレクタ

`responsive.spec.ts` で `nav.hidden` のような CSS クラス依存のセレクタを使用しており、UI の実装詳細に依存している。

**影響を受ける箇所:**

| ファイル | 行番号 | 問題のあるセレクタ |
|---------|--------|-------------------|
| `tests/e2e/responsive.spec.ts` | L76, L99, L115 | `nav.hidden` |

---

## 2. 修正方針

### 2.1 セレクタの堅牢化（ARIA ロールベースへの統一）

**方針:** shadcn/ui の内部属性 `data-slot` への依存を排除し、ARIA ロールベースのセレクタに統一する。

| 変更前 | 変更後 |
|--------|--------|
| `[data-slot="select-trigger"]` | `getByRole('combobox')` または `getByRole('combobox', { name: /ラベル/ })` |
| `[data-slot="dialog-content"]` | `getByRole('dialog')` |
| `[data-slot="sheet-content"]` | `getByRole('dialog')` （Sheet も dialog ロールを持つ） |
| `nav.hidden` | `getByRole('navigation')` または `getByRole('link', { name: 'イベント一覧' })` |

### 2.2 待機メカニズムの改善

**方針:** `waitForTimeout` を全て排除し、条件付き待機 (`expect().toBeVisible({ timeout })`) に置き換える。

```typescript
// Before (不安定)
await page.waitForTimeout(2000);
await page.goto(eventUrl);
await expect(page.locator("text=済").first()).toBeVisible();

// After (堅牢)
await expect(page.locator("text=済").first()).toBeVisible({ timeout: 10000 });
```

### 2.3 webServer タイムアウト延長

**方針:** `playwright.config.ts` の webServer timeout を 60 秒から 120 秒に延長する。

### 2.4 代替案と選択理由

| 代替案 | 選択しなかった理由 |
|--------|-------------------|
| `data-testid` 属性の追加 | コンポーネントへの変更が必要で、影響範囲が大きい |
| テストのリトライ回数を増やす | 根本原因を解決せず、CI 時間が長くなるだけ |
| E2E テストをスキップ | テストカバレッジが低下する |

---

## 3. 影響範囲

### 3.1 変更対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `playwright.config.ts` | webServer timeout を 120 秒に延長 |
| `tests/e2e/dashboard.spec.ts` | セレクタの堅牢化（2 箇所） |
| `tests/e2e/event-crud.spec.ts` | セレクタの堅牢化 + 待機改善（2 箇所） |
| `tests/e2e/participant-payment.spec.ts` | セレクタの堅牢化 + 待機改善（6 箇所） |
| `tests/e2e/responsive.spec.ts` | セレクタの堅牢化 + 待機改善（8 箇所） |
| `tests/e2e/schedule-line.spec.ts` | セレクタの堅牢化（2 箇所） |

### 3.2 破壊的変更

なし。テストコードのみの変更であり、アプリケーションコードに影響を与えない。

---

## 4. テストケース（カバレッジ 100% 目標）

### 4.1 修正対象テストの検証

修正後、以下のテストが安定して合格することを確認する。

#### dashboard.spec.ts

| テストID | テスト名 | 検証項目 |
|----------|---------|---------|
| E2E-021 | 年度セレクターで年を切り替える | `getByRole('combobox')` でセレクターをクリックできること |
| - | 状態変更後にダッシュボードの集計が即時反映される | ステータスセレクターが正常に動作すること |

#### event-crud.spec.ts

| テストID | テスト名 | 検証項目 |
|----------|---------|---------|
| E2E-003 | イベントを削除して復元する | `getByRole('dialog')` でダイアログを検出できること、削除表示切替スイッチが動作すること |

#### participant-payment.spec.ts

| テストID | テスト名 | 検証項目 |
|----------|---------|---------|
| E2E-011 | 個別参加者の決済状況を更新する | 決済状態の更新が期待時間内に反映されること |
| E2E-012 | 一括決済で複数参加者を更新する | ダイアログの開閉が正確に検出されること |
| E2E-015 | 参加者を編集する | 編集ダイアログが正常に表示されること |

#### responsive.spec.ts

| テストID | テスト名 | 検証項目 |
|----------|---------|---------|
| RESP-001 | スマートフォンで全主要操作が完了可能 | モバイルナビゲーションが正常に検出・操作できること |
| RESP-002 | タブレットで全主要操作が完了可能 | サイドバーナビゲーションが正常に検出できること |
| RESP-003 | PCで全主要操作が完了可能 | サイドバーナビゲーションが正常に検出できること |
| RESP-004 | モバイルで参加者登録が完了する | 性別セレクターが正常に動作すること |
| RESP-005 | モバイルで決済更新が完了する | 決済状態の更新が期待時間内に反映されること |
| RESP-006 | モバイルでLINEテキストコピーが完了する | ダイアログが正常に検出されること |

#### schedule-line.spec.ts

| テストID | テスト名 | 検証項目 |
|----------|---------|---------|
| E2E-032 | LINEテキストを生成してモーダルで確認する | ダイアログが `getByRole('dialog')` で検出できること |

### 4.2 ブラウザ動作確認

1. **ローカル環境**: `npm run test:e2e` を 5 回連続実行し、全て合格することを確認
2. **CI 環境**: PR を push して CI がリトライなしで成功することを確認

---

## 5. 実装手順

### Step 1: playwright.config.ts の修正

**ファイル:** `playwright.config.ts`

**変更内容:**
```typescript
// L28: timeout を 60_000 から 120_000 に変更
webServer: {
  command: process.env.CI ? "npm run start" : "npm run dev",
  url: "http://localhost:3000",
  reuseExistingServer: !process.env.CI,
  timeout: 120_000,  // 変更: 60_000 → 120_000
  env: {
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5433/goukon_kanri_test",
    DIRECT_URL: "postgresql://postgres:postgres@localhost:5433/goukon_kanri_test",
  },
},
```

### Step 2: dashboard.spec.ts の修正

**ファイル:** `tests/e2e/dashboard.spec.ts`

**変更箇所 1:** L27-28
```typescript
// Before
const yearTrigger = page.locator('[data-slot="select-trigger"]').first();
await yearTrigger.click();

// After
const yearTrigger = page.getByRole('combobox').first();
await yearTrigger.click();
```

**変更箇所 2:** L87-88
```typescript
// Before
const statusTrigger = page.locator('[data-slot="select-trigger"]').first();
await statusTrigger.click();

// After
const statusTrigger = page.getByRole('combobox').first();
await statusTrigger.click();
```

### Step 3: event-crud.spec.ts の修正

**ファイル:** `tests/e2e/event-crud.spec.ts`

**変更箇所 1:** L87-89
```typescript
// Before
const dialog = page.locator('[data-slot="dialog-content"]');
await expect(dialog).toBeVisible();
await dialog.getByRole("button", { name: "削除する" }).click();

// After
const dialog = page.getByRole('dialog');
await expect(dialog).toBeVisible({ timeout: 10000 });
await dialog.getByRole("button", { name: "削除する" }).click();
```

**変更箇所 2:** L99
```typescript
// Before
await page.locator('[role="switch"]:visible').first().click({ force: true });

// After
await page.getByRole('switch').first().click();
```

**変更箇所 3:** L106
```typescript
// Before
await page.waitForTimeout(1000);

// After
await expect(page.getByRole("link", { name: eventId })).toBeVisible({ timeout: 10000 });
```

### Step 4: participant-payment.spec.ts の修正

**ファイル:** `tests/e2e/participant-payment.spec.ts`

**変更箇所 1:** L34-36（addParticipant ヘルパー関数内）
```typescript
// Before
const genderTrigger = page.locator(
  'form:has(input[name="name"]) [data-slot="select-trigger"]'
).first();

// After
const genderTrigger = page.locator('form:has(input[name="name"])').getByRole('combobox').first();
```

**変更箇所 2:** L95-96
```typescript
// Before
await page.waitForTimeout(2000);
await page.goto(eventUrl);

// After
await expect(page.locator("text=済").first()).toBeVisible({ timeout: 10000 });
```

**変更箇所 3:** L118-119
```typescript
// Before
await page.waitForSelector('[data-slot="dialog-content"]');
const dialog = page.locator('[data-slot="dialog-content"]');

// After
const dialog = page.getByRole('dialog');
await expect(dialog).toBeVisible({ timeout: 10000 });
```

**変更箇所 4:** L129-130
```typescript
// Before
await page.waitForTimeout(2000);
await page.goto(eventUrl);

// After
await expect(dialog).not.toBeVisible({ timeout: 10000 });
await page.goto(eventUrl);
```

**変更箇所 5:** L169-170
```typescript
// Before
await page.waitForSelector('[data-slot="dialog-content"]');
const dialog = page.locator('[data-slot="dialog-content"]');

// After
const dialog = page.getByRole('dialog');
await expect(dialog).toBeVisible({ timeout: 10000 });
```

**変更箇所 6:** L184
```typescript
// Before
await page.waitForTimeout(2000);

// After
await expect(dialog).not.toBeVisible({ timeout: 10000 });
```

### Step 5: responsive.spec.ts の修正

**ファイル:** `tests/e2e/responsive.spec.ts`

**変更箇所 1:** L76
```typescript
// Before
await expect(page.locator("nav.hidden")).not.toBeVisible();

// After
// ナビゲーションの表示状態はハンバーガーメニューの表示で判定
// (nav.hidden は CSS クラスに依存するため削除)
```

**変更箇所 2:** L82-83
```typescript
// Before
const mobileNav = page.locator('[data-slot="sheet-content"]');
await expect(mobileNav.getByRole("link", { name: "イベント一覧", exact: true })).toBeVisible();

// After
const mobileNav = page.getByRole('dialog');
await expect(mobileNav).toBeVisible({ timeout: 10000 });
await expect(mobileNav.getByRole("link", { name: "イベント一覧", exact: true })).toBeVisible();
```

**変更箇所 3:** L99, L115
```typescript
// Before
await expect(page.locator("nav.hidden")).toBeVisible();

// After
// サイドバーの表示はリンクの可視性で判定
await expect(page.getByRole("link", { name: "イベント一覧", exact: true })).toBeVisible();
```

**変更箇所 4:** L144-145
```typescript
// Before
const genderTrigger = page.locator(
  'form:has(input[name="name"]) [data-slot="select-trigger"]'
).first();

// After
const genderTrigger = page.locator('form:has(input[name="name"])').getByRole('combobox').first();
```

**変更箇所 5:** L171-172
```typescript
// Before
const genderTrigger = page.locator(
  'form:has(input[name="name"]) [data-slot="select-trigger"]'
).first();

// After
const genderTrigger = page.locator('form:has(input[name="name"])').getByRole('combobox').first();
```

**変更箇所 6:** L192-193
```typescript
// Before
await page.waitForTimeout(2000);
await page.goto(eventUrl);

// After
await expect(page.locator("text=済").first()).toBeVisible({ timeout: 10000 });
```

**変更箇所 7:** L216-217
```typescript
// Before
await page.waitForSelector('[data-slot="dialog-content"]');
const dialog = page.locator('[data-slot="dialog-content"]');

// After
const dialog = page.getByRole('dialog');
await expect(dialog).toBeVisible({ timeout: 10000 });
```

### Step 6: schedule-line.spec.ts の修正

**ファイル:** `tests/e2e/schedule-line.spec.ts`

**変更箇所 1:** L100-101
```typescript
// Before
await page.waitForSelector('[data-slot="dialog-content"]');
const dialog = page.locator('[data-slot="dialog-content"]');

// After
const dialog = page.getByRole('dialog');
await expect(dialog).toBeVisible({ timeout: 10000 });
```

### Step 7: ローカルテスト実行

```bash
npm run test:e2e
```

5 回連続で全テストが合格することを確認する。

### Step 8: CI 実行確認

修正をコミット・プッシュし、GitHub Actions の E2E ジョブがリトライなしで成功することを確認する。

---

## 6. 修正後の期待効果

1. **セレクタの堅牢性向上**: ARIA ロールベースのセレクタにより、UI ライブラリのバージョン変更に耐性を持つ
2. **待機メカニズムの改善**: 条件付き待機により、CI 環境での遅延に適切に対応
3. **webServer 起動時間の余裕**: 120 秒のタイムアウトで、ビルド後の起動遅延にも対応
4. **Flaky テストの削減**: 不確実な固定待機を完全に排除

---

## 7. 参考情報

- Playwright セレクタベストプラクティス: https://playwright.dev/docs/locators#locating-elements
- shadcn/ui コンポーネント: https://ui.shadcn.com/
- ARIA ロール仕様: https://www.w3.org/TR/wai-aria-1.2/#role_definitions
