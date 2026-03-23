# Issue #29: スマホ表示時のデザイン修正

## 問題分析

### 現状の動作

現在のアプリケーションは基本的なレスポンシブ対応がされているが、スマートフォン表示時に以下の問題が発生している：

1. **テーブルの可読性問題**
   - 多数のカラムを持つテーブル（参加者テーブル: 12カラム、スケジュールテーブル: 13カラム、レポートテーブル: 13カラム）が横スクロールのみで対応
   - `whitespace-nowrap` により列幅が固定され、スマホでは非常に狭い視野でしか見えない

2. **タップターゲットのサイズ問題**
   - ボタンサイズ（h-8 = 32px, h-7 = 28px）がスマホでのタップ操作には小さい（推奨: 44px以上）
   - テーブル内のチェックボックス、編集/削除ボタンがタップしづらい

3. **フォームの操作性問題**
   - `EventForm` の 2カラムグリッド（`grid-cols-2`）がスマホ幅では各項目が狭すぎる
   - Select コンポーネントのドロップダウンがスマホで選択しづらい

4. **ナビゲーションの改善余地**
   - ハンバーガーメニューは実装済みだが、メニューアイテムのタップ領域が小さい（py-2）

5. **イベント詳細ページのレイアウト**
   - カード内の情報密度が高く、スマホでは視認性が低下
   - ヘッダー部分のボタン配置が狭い画面では窮屈

### 問題の原因（コード箇所）

| 問題 | ファイル | 該当コード |
|------|----------|-----------|
| テーブル横スクロールのみ | `src/components/participants/participant-table.tsx` L278 | `<div className="rounded-md border overflow-x-auto">` |
| テーブルカラム多数 | 同上 L93-230 | 12カラムの定義 |
| ボタンサイズ小 | `src/components/ui/button.tsx` L26-28 | `h-8`, `h-7`, `h-6` |
| ナビリンク小 | `src/components/layout/navigation.tsx` L34 | `px-3 py-2 text-sm` |
| フォームグリッド | `src/components/events/event-form.tsx` L211, L240 | `grid-cols-2` |
| 詳細ヘッダー | `src/components/events/event-detail.tsx` L113 | `flex items-center justify-between` |
| 情報グリッド密 | 同上 L201, L228, L291 | `grid-cols-2 md:grid-cols-4` |

## 修正方針

### 変更対象ファイルと変更内容

#### 1. テーブルのモバイル対応

**対象ファイル:**
- `src/components/participants/participant-table.tsx`
- `src/components/events/event-table.tsx`
- `src/components/schedule/schedule-table.tsx`
- `src/components/reports/report-table.tsx`
- `src/components/dashboard/monthly-summary-table.tsx`
- `src/components/participants/cross-event-participant-table.tsx`

**変更内容:**
- モバイル表示時（md未満）はカード形式のリスト表示に切り替え
- 重要な情報を優先表示し、詳細は展開式に
- テーブル表示は md 以上の画面幅のみで使用

```tsx
// 例: participant-table.tsx
{/* モバイル: カードリスト */}
<div className="md:hidden space-y-3">
  {filteredParticipants.map((participant) => (
    <ParticipantCard key={participant.id} participant={participant} />
  ))}
</div>

{/* デスクトップ: テーブル */}
<div className="hidden md:block rounded-md border overflow-x-auto">
  <Table>...</Table>
</div>
```

#### 2. ボタン・タップターゲットの改善

**対象ファイル:**
- `src/components/ui/button.tsx`

**変更内容:**
- モバイル用のサイズバリアントを追加（min-height: 44px）
- 既存の size に touch-friendly なスタイルを追加

```tsx
// button.tsx の variants に追加
size: {
  default: "h-8 md:h-8 min-h-[44px] md:min-h-0 gap-1.5 px-2.5 ...",
  sm: "h-7 md:h-7 min-h-[44px] md:min-h-0 gap-1 ...",
  // または mobile-friendly バリアントを新設
  "touch": "h-11 gap-2 px-4 text-base",
}
```

#### 3. ナビゲーションメニューの改善

**対象ファイル:**
- `src/components/layout/navigation.tsx`

**変更内容:**
- メニューアイテムのパディングを拡大（`py-3` 以上）
- フォントサイズをやや大きく（`text-base`）
- アイコンを追加して視認性向上

```tsx
// NavLinks 内のリンクスタイル
className={`block rounded px-4 py-3 text-base ${...}`}
```

#### 4. フォームのレスポンシブ改善

**対象ファイル:**
- `src/components/events/event-form.tsx`
- `src/components/participants/participant-form.tsx`

**変更内容:**
- `grid-cols-2` を `grid-cols-1 sm:grid-cols-2` に変更
- 入力フィールドのフォントサイズをモバイルで大きく（16px以上でズーム防止）

```tsx
// event-form.tsx L211
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
```

#### 5. イベント詳細ページの改善

**対象ファイル:**
- `src/components/events/event-detail.tsx`

**変更内容:**
- ヘッダーをモバイルで縦並びに
- カード内グリッドをモバイルで1-2カラムに
- 金額表示のフォントサイズ調整

```tsx
// L113 ヘッダー
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

// L201 定員・参加費
<dl className="grid grid-cols-2 gap-4">

// L228 収支サマリー
<dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
```

#### 6. フィルターコンポーネントの改善

**対象ファイル:**
- `src/components/events/event-filters.tsx`
- `src/components/schedule/schedule-filters.tsx`
- `src/components/reports/report-filters.tsx`

**変更内容:**
- Select の幅をモバイルで広く
- 縦並びオプションの追加

```tsx
<div className="flex flex-col sm:flex-row flex-wrap gap-3">
  <Select>
    <SelectTrigger className="w-full sm:w-[120px]">
```

#### 7. ダイアログのモバイル対応

**対象ファイル:**
- `src/components/ui/dialog.tsx`

**変更内容:**
- モバイルでフルスクリーンに近いサイズに

```tsx
// DialogContent L56
className={cn(
  "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-1rem)] sm:max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-background p-4 sm:max-w-sm ...",
```

### 選択しなかった代替案

| 代替案 | 不採用理由 |
|--------|-----------|
| CSS のみでテーブルを縦並びに変換 | 複雑なテーブル構造では CSS 変換が難しく、メンテナンス性が低下 |
| 別のモバイル専用ページを作成 | コードの重複が増え、機能追加時の保守コストが増大 |
| テーブルのカラム数を減らす | 機能削減になり、ユーザーに必要な情報が見えなくなる |
| viewport meta で zoom 無効化 | アクセシビリティ違反になる |

## 影響範囲

### 影響を受けるコンポーネント

| コンポーネント | 影響度 | 説明 |
|--------------|--------|------|
| ParticipantTable | 高 | モバイル用カード表示の新規実装 |
| EventTable | 高 | モバイル用カード表示の新規実装 |
| ScheduleTable | 高 | モバイル用カード表示の新規実装 |
| ReportTable | 高 | モバイル用カード表示の新規実装 |
| MonthlySummaryTable | 高 | モバイル用カード表示の新規実装 |
| CrossEventParticipantTable | 高 | モバイル用カード表示の新規実装 |
| Button | 中 | サイズ定義の変更（下位互換性あり） |
| Navigation | 中 | スタイル調整 |
| EventForm | 低 | グリッド設定の微調整 |
| ParticipantForm | 低 | グリッド設定の微調整 |
| EventDetail | 中 | レイアウト調整 |
| EventFilters | 低 | 幅設定の調整 |
| Dialog | 低 | 最大幅の調整 |

### 破壊的変更の有無

**破壊的変更なし**

- Button コンポーネントの既存 size バリアントは維持
- テーブルコンポーネントの props インターフェースは変更なし
- 既存の機能は全て維持

## テストケース

### ユニットテスト

#### ParticipantTable コンポーネント

```typescript
// __tests__/components/participants/participant-table.test.tsx

describe('ParticipantTable', () => {
  // 表示切り替えテスト
  describe('レスポンシブ表示', () => {
    it('モバイル幅(< 768px)でカードリスト表示になること', () => {
      // viewport width を 375px に設定
      // カード要素が表示されていることを確認
      // テーブル要素が非表示であることを確認
    });

    it('デスクトップ幅(>= 768px)でテーブル表示になること', () => {
      // viewport width を 1024px に設定
      // テーブル要素が表示されていることを確認
      // カード要素が非表示であることを確認
    });
  });

  // カード表示のテスト
  describe('モバイルカード表示', () => {
    it('参加者名が表示されること', () => {});
    it('性別バッジが表示されること', () => {});
    it('参加費が表示されること', () => {});
    it('決済状況が表示されること', () => {});
    it('編集ボタンがタップ可能なサイズであること (min-height: 44px)', () => {});
    it('削除ボタンがタップ可能なサイズであること', () => {});
  });

  // フィルター機能
  describe('フィルター機能', () => {
    it('名前フィルターがカード表示でも機能すること', () => {});
    it('削除済み表示トグルがカード表示でも機能すること', () => {});
  });

  // データなし
  describe('データなしの表示', () => {
    it('参加者がいない場合、適切なメッセージが表示されること', () => {});
  });
});
```

#### EventTable コンポーネント

```typescript
// __tests__/components/events/event-table.test.tsx

describe('EventTable', () => {
  describe('レスポンシブ表示', () => {
    it('モバイル幅でカードリスト表示になること', () => {});
    it('デスクトップ幅でテーブル表示になること', () => {});
  });

  describe('モバイルカード表示', () => {
    it('イベントIDリンクがタップ可能なサイズであること', () => {});
    it('日付が正しくフォーマットされて表示されること', () => {});
    it('会場名が表示されること', () => {});
    it('状態バッジが表示されること', () => {});
    it('参加者数サマリーが表示されること', () => {});
    it('削除済みイベントの復元ボタンが機能すること', () => {});
  });

  describe('削除済み表示トグル', () => {
    it('トグルOFFで削除済みイベントが非表示になること', () => {});
    it('トグルONで削除済みイベントが半透明で表示されること', () => {});
  });
});
```

#### ScheduleTable コンポーネント

```typescript
// __tests__/components/schedule/schedule-table.test.tsx

describe('ScheduleTable', () => {
  describe('レスポンシブ表示', () => {
    it('モバイル幅でカードリスト表示になること', () => {});
    it('デスクトップ幅でテーブル表示になること', () => {});
  });

  describe('モバイルカード表示', () => {
    it('日付・時刻が表示されること', () => {});
    it('エリア・会場名が表示されること', () => {});
    it('男性/女性の定員・参加・残枠が表示されること', () => {});
    it('残枠が0以下の場合、赤字で表示されること', () => {});
    it('LINEボタンがタップ可能であること', () => {});
  });
});
```

#### ReportTable コンポーネント

```typescript
// __tests__/components/reports/report-table.test.tsx

describe('ReportTable', () => {
  describe('レスポンシブ表示', () => {
    it('モバイル幅でカードリスト表示になること', () => {});
    it('デスクトップ幅でテーブル表示になること', () => {});
  });

  describe('モバイルカード表示', () => {
    it('イベントID・日付が表示されること', () => {});
    it('金額がカンマ区切りで表示されること', () => {});
    it('利益率が%表示されること', () => {});
    it('利益率がnullの場合「-」が表示されること', () => {});
  });
});
```

#### MonthlySummaryTable コンポーネント

```typescript
// __tests__/components/dashboard/monthly-summary-table.test.tsx

describe('MonthlySummaryTable', () => {
  describe('レスポンシブ表示', () => {
    it('モバイル幅でカードリスト表示になること', () => {});
    it('デスクトップ幅でテーブル表示になること', () => {});
  });

  describe('モバイルカード表示', () => {
    it('月がリンクとして機能すること', () => {});
    it('イベント件数・参加者数が表示されること', () => {});
    it('収支情報が表示されること', () => {});
  });
});
```

#### Button コンポーネント

```typescript
// __tests__/components/ui/button.test.tsx

describe('Button', () => {
  describe('サイズバリアント', () => {
    it('defaultサイズでmin-height: 44pxが適用されること（モバイル）', () => {});
    it('smサイズでmin-height: 44pxが適用されること（モバイル）', () => {});
    it('デスクトップでは通常の高さが適用されること', () => {});
    it('icon系サイズは変更されないこと', () => {});
  });

  describe('アクセシビリティ', () => {
    it('disabled状態でaria属性が正しく設定されること', () => {});
    it('フォーカス時に視覚的なインジケータが表示されること', () => {});
  });
});
```

#### Navigation コンポーネント

```typescript
// __tests__/components/layout/navigation.test.tsx

describe('Navigation', () => {
  describe('デスクトップ表示', () => {
    it('サイドバーが表示されること', () => {});
    it('ハンバーガーメニューが非表示であること', () => {});
  });

  describe('モバイル表示', () => {
    it('ハンバーガーメニューが表示されること', () => {});
    it('サイドバーが非表示であること', () => {});
    it('メニューボタンのタップ領域が44px以上であること', () => {});
  });

  describe('モバイルメニュー', () => {
    it('メニューを開くとナビゲーションリンクが表示されること', () => {});
    it('各リンクのタップ領域が44px以上であること', () => {});
    it('リンクをタップするとメニューが閉じること', () => {});
    it('現在のパスがハイライトされること', () => {});
  });
});
```

#### EventForm コンポーネント

```typescript
// __tests__/components/events/event-form.test.tsx

describe('EventForm', () => {
  describe('レスポンシブレイアウト', () => {
    it('モバイル幅で1カラムレイアウトになること', () => {});
    it('タブレット幅以上で2カラムレイアウトになること', () => {});
  });

  describe('入力フィールド', () => {
    it('日付入力のフォントサイズが16px以上であること（ズーム防止）', () => {});
    it('全ての入力フィールドがタップ可能なサイズであること', () => {});
    it('Selectコンポーネントがモバイルで操作可能であること', () => {});
  });

  describe('バリデーション', () => {
    it('必須フィールドが空の場合エラーが表示されること', () => {});
    it('数値フィールドに不正な値を入力した場合エラーが表示されること', () => {});
  });

  describe('フォーム送信', () => {
    it('送信中はボタンが無効化されること', () => {});
    it('成功時にトーストが表示されること', () => {});
    it('エラー時にエラートーストが表示されること', () => {});
  });
});
```

#### ParticipantForm コンポーネント

```typescript
// __tests__/components/participants/participant-form.test.tsx

describe('ParticipantForm', () => {
  describe('レスポンシブレイアウト', () => {
    it('モバイル幅で1カラムレイアウトになること', () => {});
    it('タブレット幅以上で2カラムレイアウトになること', () => {});
  });

  describe('入力フィールド', () => {
    it('全ての入力フィールドのフォントサイズが16px以上であること', () => {});
    it('Selectコンポーネントのドロップダウンがモバイルで適切なサイズであること', () => {});
  });
});
```

#### EventDetail コンポーネント

```typescript
// __tests__/components/events/event-detail.test.tsx

describe('EventDetail', () => {
  describe('ヘッダーレイアウト', () => {
    it('モバイル幅でタイトルとボタンが縦並びになること', () => {});
    it('デスクトップ幅で横並びになること', () => {});
    it('編集・削除ボタンがタップ可能なサイズであること', () => {});
  });

  describe('情報カード', () => {
    it('基本情報が適切にグリッド表示されること', () => {});
    it('収支サマリーがモバイルで見やすいレイアウトになること', () => {});
    it('金額が正しくフォーマットされること', () => {});
  });

  describe('参加者セクション', () => {
    it('参加者追加ボタンがタップ可能であること', () => {});
    it('重複チェックボタンが機能すること', () => {});
  });
});
```

#### EventFilters コンポーネント

```typescript
// __tests__/components/events/event-filters.test.tsx

describe('EventFilters', () => {
  describe('レスポンシブレイアウト', () => {
    it('モバイル幅でSelectが全幅になること', () => {});
    it('デスクトップ幅で固定幅になること', () => {});
  });

  describe('フィルター機能', () => {
    it('年度を変更するとURLパラメータが更新されること', () => {});
    it('月を変更するとURLパラメータが更新されること', () => {});
    it('状態を変更するとURLパラメータが更新されること', () => {});
  });
});
```

#### Dialog コンポーネント

```typescript
// __tests__/components/ui/dialog.test.tsx

describe('Dialog', () => {
  describe('モバイル表示', () => {
    it('モバイル幅でほぼフルスクリーンになること', () => {});
    it('閉じるボタンがタップ可能なサイズであること', () => {});
    it('オーバーレイをタップすると閉じること', () => {});
  });

  describe('デスクトップ表示', () => {
    it('中央に適切なサイズで表示されること', () => {});
  });
});
```

### 統合テスト

```typescript
// __tests__/integration/mobile-ux.test.tsx

describe('モバイルUX統合テスト', () => {
  beforeEach(() => {
    // viewport を 375px x 667px (iPhone SE) に設定
  });

  describe('ダッシュボードページ', () => {
    it('ページが正常に表示されること', () => {});
    it('年度セレクターが操作可能であること', () => {});
    it('月別サマリーがカード形式で表示されること', () => {});
    it('月をタップするとイベント一覧に遷移すること', () => {});
  });

  describe('イベント一覧ページ', () => {
    it('フィルターが操作可能であること', () => {});
    it('イベントがカード形式で表示されること', () => {});
    it('イベントカードをタップすると詳細に遷移すること', () => {});
    it('新規作成ボタンがタップ可能であること', () => {});
  });

  describe('イベント詳細ページ', () => {
    it('全ての情報カードが表示されること', () => {});
    it('参加者追加フォームが開閉できること', () => {});
    it('参加者カードの操作（編集・削除）が可能であること', () => {});
    it('一括決済ダイアログが正常に動作すること', () => {});
  });

  describe('イベント作成/編集ページ', () => {
    it('フォームが縦並びで表示されること', () => {});
    it('全てのフィールドに入力できること', () => {});
    it('フォーム送信が正常に動作すること', () => {});
    it('キャンセルボタンで前のページに戻ること', () => {});
  });

  describe('スケジュールページ', () => {
    it('フィルターが操作可能であること', () => {});
    it('イベントがカード形式で表示されること', () => {});
    it('LINEテキストダイアログが開けること', () => {});
  });

  describe('参加者一覧ページ', () => {
    it('検索フィールドが操作可能であること', () => {});
    it('参加者がカード形式で表示されること', () => {});
    it('イベントリンクが機能すること', () => {});
  });

  describe('収支レポートページ', () => {
    it('フィルターが操作可能であること', () => {});
    it('レポートがカード形式で表示されること', () => {});
    it('金額が正しく表示されること', () => {});
  });

  describe('ナビゲーション', () => {
    it('ハンバーガーメニューをタップするとメニューが開くこと', () => {});
    it('メニュー項目をタップすると該当ページに遷移すること', () => {});
    it('ページ遷移後にメニューが閉じること', () => {});
    it('現在のページがハイライトされること', () => {});
  });
});
```

### ブラウザ動作確認

#### 確認環境

| デバイス | 画面サイズ | ブラウザ |
|----------|-----------|---------|
| iPhone SE | 375 x 667 | Safari |
| iPhone 14 Pro | 393 x 852 | Safari |
| Pixel 7 | 412 x 915 | Chrome |
| iPad mini | 768 x 1024 | Safari |
| Galaxy S21 | 360 x 800 | Samsung Internet |

#### 画面ごとの確認項目

##### ダッシュボード (/)

| 確認項目 | 確認内容 | スクリーンショット |
|----------|----------|------------------|
| ヘッダー | タイトルと年度セレクターが表示され、操作可能 | dashboard-header-mobile.png |
| 年度セレクター | ドロップダウンが画面内に収まり、選択可能 | dashboard-year-selector.png |
| 月別サマリー | カード形式で表示され、全情報が読める | dashboard-summary-cards.png |
| 月リンク | タップで該当月のイベント一覧に遷移 | - |

##### イベント一覧 (/events)

| 確認項目 | 確認内容 | スクリーンショット |
|----------|----------|------------------|
| フィルター | 年/月/状態の各セレクターが全幅で操作可能 | events-filters-mobile.png |
| 新規作成ボタン | 44px以上のタップ領域で目立つ位置に配置 | events-create-button.png |
| イベントカード | 日付、会場、状態、参加者数が見やすく表示 | events-card-mobile.png |
| 削除済み表示 | トグルが操作可能、削除済みは半透明 | events-deleted-toggle.png |
| 横スクロール | カード形式で横スクロール不要 | - |

##### イベント詳細 (/events/[id])

| 確認項目 | 確認内容 | スクリーンショット |
|----------|----------|------------------|
| ヘッダー | タイトルと編集/削除ボタンが縦並び | event-detail-header.png |
| 基本情報カード | 2カラムグリッドで情報が読める | event-detail-basic.png |
| 収支サマリー | 1-2カラムで金額が見やすい | event-detail-financial.png |
| タスク進捗 | プログレスバーが視認可能 | event-detail-tasks.png |
| 参加者セクション | 追加/重複チェックボタンが操作可能 | event-detail-participants.png |
| 参加者カード | 編集/削除がタップ可能 | event-detail-participant-card.png |
| 参加者フォーム | 展開時にスクロールで全体が見える | event-detail-participant-form.png |

##### イベント作成・編集 (/events/new, /events/[id]/edit)

| 確認項目 | 確認内容 | スクリーンショット |
|----------|----------|------------------|
| フォームレイアウト | 1カラムで全フィールドが見やすい | event-form-mobile.png |
| 日付入力 | ネイティブピッカーが起動、ズームなし | event-form-date.png |
| 数値入力 | 数値キーボードが表示される | event-form-number.png |
| セレクト | ドロップダウンが画面内に表示 | event-form-select.png |
| 送信ボタン | 44px以上で目立つ位置 | event-form-submit.png |
| キャンセルボタン | 操作可能で誤タップ防止の余白あり | - |

##### スケジュール (/schedule)

| 確認項目 | 確認内容 | スクリーンショット |
|----------|----------|------------------|
| フィルター | 操作可能で見やすい | schedule-filters.png |
| イベントカード | 日時、会場、定員情報が見やすい | schedule-card.png |
| 残枠表示 | 0以下で赤字、視認性良好 | schedule-remaining.png |
| LINEボタン | タップでダイアログ表示 | schedule-line-button.png |
| LINEダイアログ | テキストが選択・コピー可能 | schedule-line-dialog.png |

##### 参加者一覧 (/participants)

| 確認項目 | 確認内容 | スクリーンショット |
|----------|----------|------------------|
| 検索フィールド | 入力時にキーボードが表示、ズームなし | participants-search.png |
| 参加者カード | 名前、イベント、性別、決済状況が見やすい | participants-card.png |
| イベントリンク | タップで詳細に遷移 | - |

##### 収支レポート (/reports)

| 確認項目 | 確認内容 | スクリーンショット |
|----------|----------|------------------|
| フィルター | 操作可能 | reports-filters.png |
| レポートカード | 収支情報が見やすく整理 | reports-card.png |
| 金額表示 | カンマ区切りで視認性良好 | reports-amounts.png |
| 利益率 | %表示、またはデータなしで「-」 | - |

##### ナビゲーション（共通）

| 確認項目 | 確認内容 | スクリーンショット |
|----------|----------|------------------|
| ハンバーガーボタン | 常に見える位置、44px以上 | nav-hamburger.png |
| メニュー展開 | スムーズなアニメーション | nav-menu-open.png |
| メニュー項目 | 十分な余白、タップしやすい | nav-menu-items.png |
| 現在ページ | ハイライト表示 | nav-current-page.png |
| メニュー外タップ | メニューが閉じる | - |

#### 操作性確認項目

| カテゴリ | 確認項目 | 合格基準 |
|----------|----------|---------|
| タップ領域 | 全てのボタン・リンク | 44px × 44px 以上 |
| 文字サイズ | 本文テキスト | 16px 以上 |
| 入力フィールド | font-size | 16px 以上（ズーム防止） |
| 間隔 | タップ可能要素の間隔 | 8px 以上 |
| スクロール | 横スクロール | カード表示では不要 |
| 読み込み | ローディング表示 | 画面遷移時に表示 |
| エラー | エラー表示 | 画面内に収まり読める |

## 実装手順

### Phase 1: 基盤コンポーネントの改善（推定工数: 2h）

1. **Button コンポーネントの更新**
   - `src/components/ui/button.tsx` を編集
   - モバイル向けの min-height を追加
   - 既存のテストを実行して破壊的変更がないことを確認

2. **Table コンポーネントの確認**
   - 既存の overflow-x-auto は維持（デスクトップ用）
   - 追加のスタイル変更は不要

3. **Dialog コンポーネントの更新**
   - `src/components/ui/dialog.tsx` を編集
   - モバイル用の max-width を調整

### Phase 2: ナビゲーションの改善（推定工数: 1h）

4. **Navigation コンポーネントの更新**
   - `src/components/layout/navigation.tsx` を編集
   - メニューアイテムのパディング・フォントサイズを拡大
   - アイコンの追加を検討

### Phase 3: フォームの改善（推定工数: 1.5h）

5. **EventForm の更新**
   - `src/components/events/event-form.tsx` を編集
   - グリッド設定を `grid-cols-1 sm:grid-cols-2` に変更
   - 入力フィールドのフォントサイズを確認

6. **ParticipantForm の更新**
   - `src/components/participants/participant-form.tsx` を編集
   - 同様のグリッド設定変更

### Phase 4: フィルターの改善（推定工数: 1h）

7. **EventFilters の更新**
   - `src/components/events/event-filters.tsx` を編集
   - Select の幅をモバイルで全幅に

8. **ScheduleFilters, ReportFilters の更新**
   - 同様の変更を適用

### Phase 5: イベント詳細の改善（推定工数: 1.5h）

9. **EventDetail の更新**
   - `src/components/events/event-detail.tsx` を編集
   - ヘッダーをモバイルで縦並びに
   - 情報グリッドをモバイル向けに調整

### Phase 6: テーブルのカード表示実装（推定工数: 6h）

10. **ParticipantCard コンポーネントの作成**
    - `src/components/participants/participant-card.tsx` を新規作成
    - 単一参加者のカード表示を実装

11. **ParticipantTable の更新**
    - モバイル用カードリスト表示を追加
    - レスポンシブ切り替えロジックを実装

12. **EventCard コンポーネントの作成**
    - `src/components/events/event-card.tsx` を新規作成

13. **EventTable の更新**
    - モバイル用カードリスト表示を追加

14. **ScheduleCard コンポーネントの作成**
    - `src/components/schedule/schedule-card.tsx` を新規作成

15. **ScheduleTable の更新**
    - モバイル用カードリスト表示を追加

16. **ReportCard コンポーネントの作成**
    - `src/components/reports/report-card.tsx` を新規作成

17. **ReportTable の更新**
    - モバイル用カードリスト表示を追加

18. **MonthlySummaryCard コンポーネントの作成**
    - `src/components/dashboard/monthly-summary-card.tsx` を新規作成

19. **MonthlySummaryTable の更新**
    - モバイル用カードリスト表示を追加

20. **CrossEventParticipantTable の更新**
    - モバイル用カードリスト表示を追加

### Phase 7: テスト実装（推定工数: 4h）

21. **ユニットテストの実装**
    - 各コンポーネントのテストを作成
    - レスポンシブ表示切り替えのテスト
    - タップ領域サイズのテスト

22. **統合テストの実装**
    - モバイルビューポートでの E2E テスト
    - 主要ユースケースのテスト

### Phase 8: 動作確認・修正（推定工数: 2h）

23. **開発環境での確認**
    - Chrome DevTools でのモバイルシミュレーション
    - 各ページの表示確認

24. **実機での確認**
    - iOS Safari での確認
    - Android Chrome での確認
    - 発見した問題の修正

25. **スクリーンショットの取得**
    - 各確認項目のスクリーンショットを保存

### 推定総工数: 19時間
