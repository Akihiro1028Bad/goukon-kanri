# Issue #31: スマホ表示時のデザイン修正

## 問題分析

### 現状の動作

スマホ表示時（画面幅 768px 未満）において、以下の問題が発生している：

### 問題点と原因

#### 1. テーブルの横スクロールが分かりにくい

**影響コンポーネント:**
- `src/components/events/event-table.tsx` (8カラム)
- `src/components/participants/participant-table.tsx` (12カラム)
- `src/components/schedule/schedule-table.tsx` (13カラム)
- `src/components/reports/report-table.tsx` (13カラム)
- `src/components/dashboard/monthly-summary-table.tsx` (13カラム)
- `src/components/participants/cross-event-participant-table.tsx` (5カラム)

**原因:**
- 全テーブルで `overflow-x-auto` のみ適用されており、スクロール可能であることが視覚的に分からない
- カラム数が多く、スマホでは右側のデータが見えない
- 重要な情報（アクションボタンなど）が右端に配置されているため操作しづらい

**該当コード箇所:**
```tsx
// event-table.tsx:152
<div className="rounded-md border overflow-x-auto">

// participant-table.tsx:278
<div className="rounded-md border overflow-x-auto">
```

#### 2. ボタン・操作要素のタップ領域が小さい

**影響コンポーネント:**
- `src/components/events/event-detail.tsx` (ヘッダーのボタン群)
- `src/components/participants/participant-table.tsx` (編集・削除ボタン)
- `src/components/events/event-filters.tsx` (フィルターセレクト)

**原因:**
- ボタンサイズ `size="sm"` が多用されており、タップ領域が44px未満
- ボタン間のギャップ `gap-2` (8px) が狭く、誤タップしやすい

**該当コード箇所:**
```tsx
// event-detail.tsx:120-129
<div className="flex gap-2">
    <Link ... className={buttonVariants({ variant: "outline" })}>編集</Link>
    <Button variant="destructive" onClick={() => setDeleteOpen(true)}>削除</Button>
</div>

// participant-table.tsx:209-226
<div className="flex gap-1">
    <Button variant="ghost" size="sm" className="text-xs">編集</Button>
    <Button variant="ghost" size="sm" className="text-xs text-destructive">削除</Button>
</div>
```

#### 3. イベント詳細ページのヘッダーレイアウト崩れ

**影響コンポーネント:**
- `src/components/events/event-detail.tsx`

**原因:**
- `flex items-center justify-between` が狭い画面で崩れる
- タイトルとボタンが横並びのまま圧縮される

**該当コード箇所:**
```tsx
// event-detail.tsx:113-131
<div className="flex items-center justify-between">
    <div>
        <h1 className="text-2xl font-bold">イベント {event.eventId}</h1>
        ...
    </div>
    <div className="flex gap-2">
        <Link>編集</Link>
        <Button>削除</Button>
    </div>
</div>
```

#### 4. カード内のグリッドレイアウトが狭い

**影響コンポーネント:**
- `src/components/events/event-detail.tsx` (収支サマリー)

**原因:**
- `grid-cols-2` が最小幅でも適用され、各項目が極端に狭くなる

**該当コード箇所:**
```tsx
// event-detail.tsx:228
<dl className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
```

#### 5. フォームの入力フィールドが小さい

**影響コンポーネント:**
- `src/components/events/event-form.tsx`
- `src/components/participants/participant-form.tsx`

**原因:**
- 数値入力フィールド（定員、参加費など）が `grid-cols-2` で常に2列表示
- 狭い画面では入力しづらい

**該当コード箇所:**
```tsx
// event-form.tsx:211, 240
<div className="grid grid-cols-2 gap-4">
```

#### 6. ダイアログの最大幅が狭い

**影響コンポーネント:**
- `src/components/ui/dialog.tsx`

**原因:**
- `sm:max-w-sm` (384px) が適用され、フォーム内容が窮屈

**該当コード箇所:**
```tsx
// dialog.tsx:56
className={cn(
  "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] ... sm:max-w-sm",
)}
```

#### 7. 参加者一覧のツールバーが縦に長くなる

**影響コンポーネント:**
- `src/components/participants/participant-table.tsx`

**原因:**
- `flex-wrap` で折り返すが、各要素の配置が最適化されていない

**該当コード箇所:**
```tsx
// participant-table.tsx:246
<div className="flex flex-wrap items-center gap-4">
```

---

## 修正方針

### 変更対象ファイルと変更内容

#### 1. テーブルコンポーネントのモバイル対応

**対象ファイル:**
- `src/components/events/event-table.tsx`
- `src/components/participants/participant-table.tsx`
- `src/components/schedule/schedule-table.tsx`
- `src/components/reports/report-table.tsx`
- `src/components/dashboard/monthly-summary-table.tsx`
- `src/components/participants/cross-event-participant-table.tsx`

**変更内容:**
- スクロールインジケーター（グラデーションシャドウ）の追加
- 重要カラムの左側固定（sticky）
- カラムの優先度に基づくモバイル表示/非表示の制御

#### 2. ボタン・操作要素のタップ領域拡大

**対象ファイル:**
- `src/components/events/event-detail.tsx`
- `src/components/participants/participant-table.tsx`
- `src/components/ui/button.tsx`

**変更内容:**
- モバイル時のボタン最小高さを44pxに
- ボタン間のギャップを`gap-3`以上に拡大
- タップ領域を視覚的にも分かりやすく

#### 3. レスポンシブヘッダーレイアウト

**対象ファイル:**
- `src/components/events/event-detail.tsx`

**変更内容:**
- モバイル時は縦方向にスタック（`flex-col`）
- ボタンを全幅で表示

#### 4. グリッドレイアウトの最適化

**対象ファイル:**
- `src/components/events/event-detail.tsx`
- `src/components/events/event-form.tsx`
- `src/components/participants/participant-form.tsx`

**変更内容:**
- `grid-cols-1` をデフォルトにし、`sm:grid-cols-2` で2列に
- 収支サマリーは `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`

#### 5. ダイアログの幅調整

**対象ファイル:**
- `src/components/ui/dialog.tsx`

**変更内容:**
- `sm:max-w-md` (448px) に拡大
- 参加者編集ダイアログは `sm:max-w-lg` を個別指定

#### 6. ツールバーの最適化

**対象ファイル:**
- `src/components/participants/participant-table.tsx`
- `src/components/events/event-filters.tsx`

**変更内容:**
- モバイル時は縦方向にスタック
- 検索フィールドを全幅に

#### 7. CSSユーティリティの追加

**対象ファイル:**
- `src/app/globals.css`

**変更内容:**
- テーブルスクロールインジケーター用のCSSクラス追加

### 選択しなかった代替案

#### 代替案A: テーブルをカード表示に変更
- **理由**: 一覧性が損なわれ、既存ユーザーの操作感が大きく変わる。データ比較がしづらくなる。

#### 代替案B: 別途モバイル専用ビューの作成
- **理由**: コードの重複が増え、メンテナンスコストが高くなる。

#### 代替案C: 全てのテーブルを縦スクロール可能なリストに変更
- **理由**: 横方向のデータ比較が必要なレポート系では不適切。

---

## 影響範囲

### 影響を受けるコンポーネント

| コンポーネント | 変更種別 | 影響度 |
|--------------|---------|-------|
| `event-table.tsx` | レイアウト変更 | 中 |
| `participant-table.tsx` | レイアウト・操作性変更 | 高 |
| `schedule-table.tsx` | レイアウト変更 | 中 |
| `report-table.tsx` | レイアウト変更 | 中 |
| `monthly-summary-table.tsx` | レイアウト変更 | 中 |
| `cross-event-participant-table.tsx` | レイアウト変更 | 低 |
| `event-detail.tsx` | レイアウト変更 | 高 |
| `event-form.tsx` | レイアウト変更 | 中 |
| `participant-form.tsx` | レイアウト変更 | 中 |
| `event-filters.tsx` | レイアウト変更 | 低 |
| `dialog.tsx` | サイズ変更 | 低 |
| `button.tsx` | サイズ変更（オプション追加） | 低 |
| `globals.css` | スタイル追加 | 低 |

### 破壊的変更の有無

**破壊的変更: なし**

- 既存のデスクトップ表示には影響を与えない
- 全ての変更はレスポンシブブレークポイントで制御
- API・データ構造の変更なし

---

## テストケース（カバレッジ 100% 目標）

### ユニットテスト

#### 1. event-table.tsx

| テストID | テストケース | 期待結果 |
|---------|------------|---------|
| ET-U01 | イベントデータが空配列の場合 | 「イベントがありません」が表示される |
| ET-U02 | 削除済みトグルOFFの場合 | 削除済みイベントが非表示 |
| ET-U03 | 削除済みトグルONの場合 | 削除済みイベントが表示される（半透明） |
| ET-U04 | 復元ボタンクリック時 | restoreEvent が呼ばれる |
| ET-U05 | ソートヘッダークリック時 | ソート状態が変更される |

#### 2. participant-table.tsx

| テストID | テストケース | 期待結果 |
|---------|------------|---------|
| PT-U01 | 参加者データが空配列の場合 | 「参加者がいません」が表示される |
| PT-U02 | 名前フィルター入力時 | フィルタリングされた結果が表示される |
| PT-U03 | 削除ボタンクリック時 | deleteParticipant が呼ばれる |
| PT-U04 | 編集ボタンクリック時 | 編集ダイアログが開く |
| PT-U05 | 一括決済ボタン表示条件 | 未決済参加者がいる場合のみ表示 |
| PT-U06 | チェックボックス選択時 | rowSelection が更新される |
| PT-U07 | 決済済み参加者のチェックボックス | 非表示であること |

#### 3. event-detail.tsx

| テストID | テストケース | 期待結果 |
|---------|------------|---------|
| ED-U01 | イベント情報の表示 | 全フィールドが正しく表示される |
| ED-U02 | 削除ボタンクリック時 | DeleteDialog が開く |
| ED-U03 | 重複チェックボタンクリック時 | checkDuplicates が呼ばれる |
| ED-U04 | 参加者追加ボタンクリック時 | ParticipantForm が表示される |
| ED-U05 | メモがない場合 | メモカードが非表示 |
| ED-U06 | mapUrl がある場合 | 会場名がリンクになる |

#### 4. event-form.tsx

| テストID | テストケース | 期待結果 |
|---------|------------|---------|
| EF-U01 | 必須フィールド未入力で送信 | バリデーションエラーが表示される |
| EF-U02 | 正常なデータで送信（新規） | createEvent が呼ばれる |
| EF-U03 | 正常なデータで送信（編集） | updateEvent が呼ばれる |
| EF-U04 | キャンセルボタンクリック | router.back() が呼ばれる |
| EF-U05 | 日付フィールドの表示形式 | YYYY-MM-DD 形式で表示 |

#### 5. participant-form.tsx

| テストID | テストケース | 期待結果 |
|---------|------------|---------|
| PF-U01 | 必須フィールド未入力で送信 | バリデーションエラーが表示される |
| PF-U02 | 正常なデータで送信（新規） | createParticipant が呼ばれる |
| PF-U03 | 正常なデータで送信（編集） | updateParticipant が呼ばれる |
| PF-U04 | 重複検出時 | onDuplicates コールバックが呼ばれる |

#### 6. dialog.tsx

| テストID | テストケース | 期待結果 |
|---------|------------|---------|
| DL-U01 | ダイアログオープン時 | オーバーレイとコンテンツが表示される |
| DL-U02 | 閉じるボタンクリック時 | ダイアログが閉じる |
| DL-U03 | showCloseButton=false 時 | 閉じるボタンが非表示 |

#### 7. button.tsx

| テストID | テストケース | 期待結果 |
|---------|------------|---------|
| BT-U01 | variant="default" | 正しいクラスが適用される |
| BT-U02 | size="sm" | 正しいサイズクラスが適用される |
| BT-U03 | disabled 状態 | pointer-events-none が適用される |

### 統合テスト

| テストID | テストケース | 期待結果 |
|---------|------------|---------|
| INT-01 | イベント詳細ページで参加者追加→テーブル更新 | 新しい参加者が一覧に表示される |
| INT-02 | 参加者の決済状態変更→収支サマリー更新 | 金額が正しく再計算される |
| INT-03 | イベントフィルター変更→テーブル更新 | フィルタリングされた結果が表示される |
| INT-04 | 一括決済実行→複数参加者の状態更新 | 選択した参加者全員が決済済みになる |
| INT-05 | イベント削除→一覧から非表示 | 削除済みトグルOFF時に非表示 |

### ブラウザ動作確認

#### 確認環境
- **確認方法**: Chrome DevTools のレスポンシブモード（画面幅を狭くして確認）
- **確認ビューポート**: 375px（スマホ）, 768px（タブレット）, 1280px（デスクトップ）
- **ブラウザ**: Chrome（その他のブラウザでも同様に確認可能）

#### 画面ごとの確認項目

##### ダッシュボード (`/`)

| 確認ID | 確認項目 | スクリーンショット |
|-------|---------|----------------|
| D-B01 | 年度セレクターがタップしやすい | 必要 |
| D-B02 | テーブルが横スクロール可能であることが分かる | 必要 |
| D-B03 | スクロールインジケーターが表示される | 必要 |
| D-B04 | 月リンクがタップしやすい | 必要 |

##### イベント一覧 (`/events`)

| 確認ID | 確認項目 | スクリーンショット |
|-------|---------|----------------|
| E-B01 | フィルターセレクターが縦に並ぶ | 必要 |
| E-B02 | 新規作成ボタンがタップしやすい | 必要 |
| E-B03 | テーブルの横スクロールがスムーズ | 必要 |
| E-B04 | イベントIDリンクがタップしやすい | 必要 |

##### イベント詳細 (`/events/[id]`)

| 確認ID | 確認項目 | スクリーンショット |
|-------|---------|----------------|
| ED-B01 | ヘッダーのタイトルとボタンが縦に並ぶ | 必要 |
| ED-B02 | 編集・削除ボタンが全幅で表示される | 必要 |
| ED-B03 | 基本情報カードの項目が1列で表示される | 必要 |
| ED-B04 | 収支サマリーの項目が適切に折り返される | 必要 |
| ED-B05 | 参加者追加ボタンがタップしやすい | 必要 |
| ED-B06 | 参加者テーブルが横スクロール可能 | 必要 |
| ED-B07 | 参加者の編集・削除ボタンがタップしやすい | 必要 |

##### イベント作成・編集 (`/events/new`, `/events/[id]/edit`)

| 確認ID | 確認項目 | スクリーンショット |
|-------|---------|----------------|
| EF-B01 | 日付・時刻フィールドが1列で表示される | 必要 |
| EF-B02 | 定員・参加費フィールドが1列で表示される | 必要 |
| EF-B03 | 各入力フィールドが十分な高さを持つ | 必要 |
| EF-B04 | 送信・キャンセルボタンがタップしやすい | 必要 |

##### スケジュール (`/schedule`)

| 確認ID | 確認項目 | スクリーンショット |
|-------|---------|----------------|
| S-B01 | フィルターが縦に並ぶ | 必要 |
| S-B02 | テーブルが横スクロール可能 | 必要 |
| S-B03 | LINEボタンがタップしやすい | 必要 |
| S-B04 | 残枠の色分けが見やすい | 必要 |

##### 収支レポート (`/reports`)

| 確認ID | 確認項目 | スクリーンショット |
|-------|---------|----------------|
| R-B01 | フィルターが縦に並ぶ | 必要 |
| R-B02 | テーブルが横スクロール可能 | 必要 |
| R-B03 | 金額が読みやすい | 必要 |

##### 参加者一覧 (`/participants`)

| 確認ID | 確認項目 | スクリーンショット |
|-------|---------|----------------|
| P-B01 | 検索フィールドが全幅で表示される | 必要 |
| P-B02 | テーブルが横スクロール可能 | 必要 |
| P-B03 | イベントIDリンクがタップしやすい | 必要 |

##### ダイアログ（参加者編集など）

| 確認ID | 確認項目 | スクリーンショット |
|-------|---------|----------------|
| DL-B01 | ダイアログが画面幅に収まる | 必要 |
| DL-B02 | フォームフィールドが十分な幅を持つ | 必要 |
| DL-B03 | 閉じるボタンがタップしやすい | 必要 |
| DL-B04 | スクロールが必要な場合、スクロール可能 | 必要 |

##### ナビゲーション

| 確認ID | 確認項目 | スクリーンショット |
|-------|---------|----------------|
| N-B01 | ハンバーガーメニューがタップしやすい | 必要 |
| N-B02 | スライドメニューが画面幅の64pxを占める | 必要 |
| N-B03 | メニュー項目がタップしやすい | 必要 |
| N-B04 | メニュー項目タップ後にメニューが閉じる | 必要 |

---

## 実装手順

### フェーズ1: 基盤整備

1. `src/app/globals.css` にテーブルスクロールインジケーター用CSSを追加
   ```css
   .table-scroll-container {
     position: relative;
   }
   .table-scroll-container::after {
     content: '';
     position: absolute;
     top: 0;
     right: 0;
     bottom: 0;
     width: 24px;
     background: linear-gradient(to right, transparent, white);
     pointer-events: none;
     opacity: 0;
     transition: opacity 0.2s;
   }
   .table-scroll-container[data-can-scroll-right="true"]::after {
     opacity: 1;
   }
   ```

2. `src/components/ui/button.tsx` にモバイル用サイズオプションを追加
   - `size="touch"`: 最小高さ44pxのタッチフレンドリーサイズ

### フェーズ2: テーブルコンポーネント修正

3. `src/components/ui/table.tsx` にスクロールインジケーター機能を追加

4. `src/components/events/event-table.tsx` を修正
   - スクロールインジケーター適用
   - モバイルでイベントIDカラムを左固定

5. `src/components/participants/participant-table.tsx` を修正
   - スクロールインジケーター適用
   - モバイルで氏名カラムを左固定
   - ツールバーをモバイルで縦スタック
   - 編集・削除ボタンのサイズ拡大

6. `src/components/schedule/schedule-table.tsx` を修正
   - スクロールインジケーター適用

7. `src/components/reports/report-table.tsx` を修正
   - スクロールインジケーター適用

8. `src/components/dashboard/monthly-summary-table.tsx` を修正
   - スクロールインジケーター適用

9. `src/components/participants/cross-event-participant-table.tsx` を修正
   - スクロールインジケーター適用

### フェーズ3: レイアウト修正

10. `src/components/events/event-detail.tsx` を修正
    - ヘッダーをモバイルで縦スタック
    - ボタンをモバイルで全幅表示
    - グリッドを `grid-cols-1 sm:grid-cols-2` に変更

11. `src/components/events/event-form.tsx` を修正
    - 数値フィールドのグリッドを `grid-cols-1 sm:grid-cols-2` に変更

12. `src/components/participants/participant-form.tsx` を修正
    - グリッドを `grid-cols-1 sm:grid-cols-2` に変更

13. `src/components/events/event-filters.tsx` を修正
    - モバイルで縦スタック、フル幅セレクト

### フェーズ4: ダイアログ修正

14. `src/components/ui/dialog.tsx` を修正
    - デフォルト最大幅を `sm:max-w-md` に拡大

15. `src/components/participants/participant-table.tsx` の編集ダイアログを修正
    - DialogContent に `className="sm:max-w-lg"` を追加

### フェーズ5: テスト実行

16. ユニットテスト実行
    ```bash
    npm run test:run
    ```

17. E2Eテスト実行（モバイルビューポート）
    ```bash
    npm run test:e2e
    ```

18. 各画面のスクリーンショット取得・確認

### フェーズ6: 最終確認

19. Chrome DevTools のレスポンシブモードで各ブレークポイント（375px, 768px, 1280px）を確認
20. PR作成・レビュー依頼
