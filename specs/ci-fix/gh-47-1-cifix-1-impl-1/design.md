# CI 修正設計書: PR #49 E2E テスト失敗

## 問題分析

### 背景

PR #49 は PR #48 の E2E テスト失敗を修正するために作成されたもので、以下の変更を含む:
- E2E テストのセレクタを `data-slot` 属性ベースから `role` ベースに変更
- `waitForTimeout()` を条件付き待機に置き換え
- Playwright 設定の webServer タイムアウトを 60 秒から 120 秒に延長

### CI 失敗ステップ

- **失敗ジョブ**: `e2e`
- **失敗ステップ**: `Run npm run test:e2e`
- **CI 実行**: https://github.com/Akihiro1028Bad/goukon-kanri/actions/runs/23466029885

### 問題の原因

PR #49 で行われた修正に **誤ったセレクタ変更** が含まれている:

#### 原因 1: `alertdialog` ロールの誤使用

**ファイル**: `tests/e2e/event-crud.spec.ts:87`

**問題のコード（PR #49）**:
```typescript
const dialog = page.getByRole('alertdialog');
```

**実際の実装**: `src/components/events/delete-dialog.tsx:43-69`

削除ダイアログは `Dialog` コンポーネント（`@base-ui/react/dialog`）を使用しており、標準の `dialog` ロールで出力される。`alertdialog` ロールは設定されていない。

```tsx
// src/components/events/delete-dialog.tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent>
    {/* ... */}
  </DialogContent>
</Dialog>
```

`@base-ui/react` の Dialog コンポーネントは `role="dialog"` を設定するため、`getByRole('alertdialog')` では要素を見つけられない。

#### 原因 2: シートとダイアログの区別不能

**ファイル**: `tests/e2e/responsive.spec.ts:82`

**問題のコード（PR #49）**:
```typescript
const mobileNav = page.getByRole('dialog');
```

**実際の実装**: `src/components/ui/sheet.tsx`

Sheet コンポーネントも内部で `@base-ui/react/dialog` を使用しているため、`role="dialog"` を持つ。ただし、Sheet が開いている時点では他の dialog は存在しないため、このセレクタ自体は機能する可能性がある。

しかし、より堅牢なセレクタとして `data-slot` 属性または特定のコンテンツでの絞り込みが推奨される。

---

## 修正方針

### 方針: ロールセレクタの修正

`alertdialog` を `dialog` に修正し、複数の dialog が存在する可能性がある場合は追加の絞り込み条件を使用する。

#### 変更対象ファイル

| ファイル | 行番号 | 変更内容 |
|---------|--------|---------|
| `tests/e2e/event-crud.spec.ts` | 87 | `alertdialog` → `dialog` に修正 |

### 代替案と却下理由

| 代替案 | 却下理由 |
|--------|---------|
| 削除ダイアログに `alertdialog` ロールを追加 | UIコンポーネント層の変更が必要で影響範囲が大きい。また、確認ダイアログは `alertdialog` が適切だが、`@base-ui/react` の Dialog では直接設定できない |
| `data-slot="dialog-content"` セレクタに戻す | PR #49 の当初の目的（セレクタの堅牢化）に反する |

---

## 影響範囲

### 影響を受けるファイル

| ファイル | 影響 |
|---------|------|
| `tests/e2e/event-crud.spec.ts` | 1 行修正（ロールセレクタの修正） |

### 破壊的変更

**なし** — テストコードの内部実装のみの変更。本番コードへの影響なし。

---

## テストケース（カバレッジ 100%）

### 修正対象テスト

| テストファイル | テスト名 | 確認項目 |
|---------------|---------|---------|
| `event-crud.spec.ts` | E2E-003: イベントを削除して復元する | 削除ダイアログが正しく検出され、削除操作が完了する |

### 追加テストケース

修正後は以下を確認する:

#### E2E-003: イベント削除・復元テストの動作確認

1. イベントを作成する
2. 削除ボタンをクリックする
3. **削除確認ダイアログが表示される**（`role="dialog"` で検出）
4. 「削除する」ボタンをクリックする
5. ダイアログが閉じる
6. イベント一覧にリダイレクトされる
7. 削除したイベントが一覧に表示されない
8. 「削除済み表示」スイッチをオンにする
9. 削除したイベントが表示される
10. 「復元」をクリックする
11. イベントが復元される

### 全 E2E テストの安定性確認

| テストファイル | テスト数 | 確認項目 |
|---------------|---------|---------|
| `dashboard.spec.ts` | 4 | 年度切替のセレクタが安定動作 |
| `event-crud.spec.ts` | 6 | イベント削除・復元の操作が安定 |
| `participant-payment.spec.ts` | 6 | 決済更新の状態反映待機が適切 |
| `reports.spec.ts` | 2 | レポートページの表示確認 |
| `schedule-line.spec.ts` | 3 | LINEテキストダイアログの操作 |
| `responsive.spec.ts` | 7 | モバイル/タブレット/PCでの操作 |
| **合計** | **28** | |

---

## 具体的な修正内容

### `tests/e2e/event-crud.spec.ts`

**Line 87: ロールセレクタの修正**

```diff
- const dialog = page.getByRole('alertdialog');
+ const dialog = page.getByRole('dialog');
```

#### 修正後のコード（コンテキスト付き）

```typescript
// E2E-003: イベント論理削除→復元
test("E2E-003: イベントを削除して復元する", async ({ page }) => {
  // ... イベント作成処理 ...

  // Click delete button
  await page.getByRole("button", { name: "削除" }).click();

  // Confirm in dialog
  const dialog = page.getByRole('dialog');  // ← 修正箇所
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "削除する" }).click();

  // Wait for dialog to close before redirect
  await expect(dialog).not.toBeVisible({ timeout: 10000 });

  // ... 後続処理 ...
});
```

---

## 実装手順

### Step 1: セレクタの修正

1. `tests/e2e/event-crud.spec.ts` の Line 87 を修正
   - `alertdialog` → `dialog`

### Step 2: ローカル検証

1. テスト用 DB を起動: `npm run db:test:up`
2. マイグレーション実行: `npm run db:test:migrate`
3. E2E テストを実行: `npm run test:e2e`
4. 全テストが成功することを確認

### Step 3: CI 検証

1. 変更をコミット・プッシュ
2. CI の e2e ジョブが成功することを確認
3. リトライなしで成功した場合は完了

---

## 変更ファイル一覧

| ファイル | 操作 | 変更行数 |
|---------|------|---------|
| `tests/e2e/event-crud.spec.ts` | 編集 | 1 行 |

---

## 工数見積

**規模: XS（極小）**

- 1 行の修正のみ
- テストコードの軽微な修正
- 本番コードへの影響なし

---

## 注意事項

1. **CI ログの確認**: 本設計書は PR #49 のコード差分とコードベースの静的分析に基づいている。実際の CI ログで他のエラーが報告されている場合は、追加の修正が必要になる可能性がある。

2. **@base-ui/react の Dialog ロール**: `@base-ui/react` の Dialog コンポーネントは標準で `role="dialog"` を設定する。`alertdialog` ロールを使用するには、カスタム属性の追加が必要だが、本修正ではテスト側で対応する方針とする。

3. **将来的な改善**: 削除確認ダイアログはセマンティック上 `alertdialog` ロールが適切であるため、将来的には UI コンポーネント側で `role="alertdialog"` を設定することを検討してもよい。ただし、本 CI 修正の範囲外とする。
