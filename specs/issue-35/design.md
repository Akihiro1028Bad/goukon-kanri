# 設計書: Issue #35 スマホのデザインを改善したい

## 1. 問題分析

### 1.1 現状の動作

現在のアプリケーションは Next.js + Tailwind CSS で構成されており、基本的なレスポンシブ対応は行われているが、スマートフォンでの使用において以下の問題が存在する。

### 1.2 特定された問題点

#### 1.2.1 テーブルの横スクロール問題
- **該当コード**:
  - `src/components/events/event-table.tsx` (7列)
  - `src/components/participants/participant-table.tsx` (11列)
  - `src/components/schedule/schedule-table.tsx` (13列)
  - `src/components/reports/report-table.tsx` (13列)
  - `src/components/dashboard/monthly-summary-table.tsx` (13列)
  - `src/components/participants/cross-event-participant-table.tsx` (5列)
- **問題**: 列数が多いテーブルは `overflow-x-auto` で横スクロール可能だが、スマホでは見づらく操作しにくい
- **原因**: モバイル専用のカード表示やレスポンシブな列の非表示設定がない

#### 1.2.2 イベント詳細画面のレイアウト問題
- **該当コード**: `src/components/events/event-detail.tsx`
  - L113: ヘッダーの `flex items-center justify-between` がスマホで窮屈
  - L141: `grid-cols-1 md:grid-cols-2` は対応済みだが、情報量が多すぎる
  - L201, L228, L291: `grid-cols-2 md:grid-cols-4` の2列がスマホで窮屈
  - L329: 参加者一覧のヘッダーボタンが横並びで操作しにくい

#### 1.2.3 フォームの操作性問題
- **該当コード**:
  - `src/components/events/event-form.tsx`
    - L211, L240: `grid-cols-2` が常に2列で、スマホでは狭い
    - L334: `grid-cols-2 md:grid-cols-4` の2列がスマホで窮屈
  - `src/components/participants/participant-form.tsx`
    - L107: `grid-cols-1 md:grid-cols-2` は対応済み
- **問題**: 一部のフォームで `grid-cols-2` が固定されており、スマホで入力欄が狭くなる

#### 1.2.4 フィルターの操作性問題
- **該当コード**: `src/components/events/event-filters.tsx`
  - L38: `flex flex-wrap gap-4` で折り返しは対応済みだが、SelectTrigger の幅が固定
- **問題**: スマホでは横並びのフィルターが操作しにくい

#### 1.2.5 ボタンのタップ領域問題
- **該当コード**: `src/components/ui/button.tsx`
  - L26-27: `h-8` (32px)、`h-7` (28px)、`h-6` (24px) のサイズ
- **問題**: モバイルでの推奨タップ領域は 44px × 44px だが、現在のボタンは小さい

#### 1.2.6 ダイアログの幅問題
- **該当コード**: `src/components/ui/dialog.tsx`
  - L56: `max-w-[calc(100%-2rem)] sm:max-w-sm`
- **問題**: スマホでダイアログの幅が狭く、フォームが使いにくい場合がある

#### 1.2.7 カードのパディング問題
- **該当コード**: `src/app/layout.tsx`
  - L21: `p-4 pt-16 md:p-6 md:pt-6` でモバイル時は適切だが、カード内のコンテンツが多い

### 1.3 既に対応済みの箇所

- ナビゲーション: `src/components/layout/navigation.tsx` でハンバーガーメニュー実装済み
- テーブルコンテナ: `overflow-x-auto` で横スクロール対応済み
- 一部のグリッド: `grid-cols-1 md:grid-cols-2` でレスポンシブ対応済み

---

## 2. 修正方針

### 2.1 変更対象ファイルと変更内容

#### Phase 1: テーブルのモバイル対応（優先度: 高）

| ファイル | 変更内容 |
|---------|---------|
| `src/components/ui/table.tsx` | モバイル用のスタイルバリアントを追加（フォントサイズ縮小、パディング調整） |
| `src/components/events/event-table.tsx` | モバイルで非表示にする列を設定（`hidden md:table-cell`）、カード表示オプション追加 |
| `src/components/participants/participant-table.tsx` | 重要度の低い列をモバイルで非表示、タスク列の省略表示 |
| `src/components/schedule/schedule-table.tsx` | 定員・参加人数をまとめて表示、列の優先度による非表示設定 |
| `src/components/reports/report-table.tsx` | 金額列のグルーピング、モバイルで重要列のみ表示 |
| `src/components/dashboard/monthly-summary-table.tsx` | report-table と同様の対応 |

#### Phase 2: レイアウトの最適化（優先度: 高）

| ファイル | 変更内容 |
|---------|---------|
| `src/components/events/event-detail.tsx` | ヘッダーをスタック表示に変更、グリッドを `grid-cols-1 sm:grid-cols-2` に統一、ボタングループの縦並び対応 |
| `src/components/events/event-form.tsx` | 定員・参加費の `grid-cols-2` を `grid-cols-1 sm:grid-cols-2` に変更 |

#### Phase 3: 操作性の改善（優先度: 中）

| ファイル | 変更内容 |
|---------|---------|
| `src/components/ui/button.tsx` | モバイル用の最小タップ領域を確保する variant または wrapper を追加 |
| `src/components/events/event-filters.tsx` | フィルターを縦並びに変更（`flex-col sm:flex-row`）、SelectTrigger の幅を `w-full sm:w-auto` に |
| `src/components/schedule/schedule-filters.tsx` | event-filters と同様の対応 |
| `src/components/reports/report-filters.tsx` | event-filters と同様の対応 |

#### Phase 4: ダイアログとフォームの改善（優先度: 中）

| ファイル | 変更内容 |
|---------|---------|
| `src/components/ui/dialog.tsx` | `max-w-sm` を `max-w-md` に変更、パディング調整 |
| `src/components/participants/participant-form.tsx` | フォームの余白調整 |

### 2.2 選択しなかった代替案とその理由

| 代替案 | 却下理由 |
|-------|---------|
| テーブルを完全にカード表示に置き換える | データの比較が難しくなる。横スクロール + 列の非表示で対応可能 |
| モバイル専用のページを作成する | 保守コストが2倍になる。レスポンシブデザインで対応可能 |
| CSS Media Query ではなく JS による画面サイズ判定 | SSR との相性が悪く、FOUC（Flash of Unstyled Content）が発生する可能性 |
| Tailwind のブレークポイントを変更する | 既存コードへの影響が大きい |

---

## 3. 影響範囲

### 3.1 影響を受けるコンポーネント

| コンポーネント | 影響度 | 詳細 |
|--------------|-------|------|
| Table 系コンポーネント（6ファイル） | 高 | 列の表示/非表示、スタイル変更 |
| event-detail.tsx | 高 | レイアウト全体の再構成 |
| event-form.tsx | 中 | グリッドのブレークポイント変更 |
| Filter 系コンポーネント（3ファイル） | 中 | レイアウト方向の変更 |
| UI コンポーネント（button, dialog） | 低 | スタイルの微調整 |

### 3.2 破壊的変更の有無

**破壊的変更なし**

- 既存の機能は維持される
- デスクトップでの表示は変更されない（または改善のみ）
- API やデータ構造の変更なし
- コンポーネントの props インターフェースの変更なし

---

## 4. テストケース

### 4.1 ユニットテスト

#### 4.1.1 Table コンポーネント

```typescript
// src/components/ui/table.test.tsx
describe('Table', () => {
  describe('TableHead', () => {
    it('デフォルトのスタイルが適用される', () => {});
    it('whitespace-nowrap クラスが適用される', () => {});
    it('カスタム className が追加できる', () => {});
  });

  describe('TableCell', () => {
    it('デフォルトのスタイルが適用される', () => {});
    it('p-2 パディングが適用される', () => {});
    it('カスタム className が追加できる', () => {});
  });
});
```

#### 4.1.2 EventTable コンポーネント

```typescript
// src/components/events/event-table.test.tsx
describe('EventTable', () => {
  describe('列の表示', () => {
    it('すべての列がレンダリングされる', () => {});
    it('hidden md:table-cell クラスを持つ列が存在する', () => {});
    it('イベントIDリンクが正しいhrefを持つ', () => {});
  });

  describe('削除済み表示トグル', () => {
    it('Switch がオフの場合、削除済みイベントは非表示', () => {});
    it('Switch がオンの場合、削除済みイベントが表示される', () => {});
    it('削除済みイベントは opacity-50 クラスを持つ', () => {});
  });

  describe('空の状態', () => {
    it('イベントが0件の場合、空メッセージが表示される', () => {});
  });
});
```

#### 4.1.3 ParticipantTable コンポーネント

```typescript
// src/components/participants/participant-table.test.tsx
describe('ParticipantTable', () => {
  describe('フィルタリング', () => {
    it('氏名フィルターが機能する', () => {});
    it('大文字小文字を区別しない検索ができる', () => {});
    it('削除済みトグルが機能する', () => {});
  });

  describe('行選択', () => {
    it('未決済の参加者のみ選択可能', () => {});
    it('削除済み参加者は選択不可', () => {});
    it('決済済み参加者は選択不可', () => {});
  });

  describe('アクション', () => {
    it('編集ボタンがダイアログを開く', () => {});
    it('削除ボタンが削除処理を実行する', () => {});
    it('削除済み参加者に復元ボタンが表示される', () => {});
  });

  describe('モバイル表示', () => {
    it('重要度の低い列に hidden md:table-cell が適用される', () => {});
  });
});
```

#### 4.1.4 EventDetail コンポーネント

```typescript
// src/components/events/event-detail.test.tsx
describe('EventDetail', () => {
  describe('ヘッダー', () => {
    it('イベントIDが表示される', () => {});
    it('ステータスバッジが表示される', () => {});
    it('編集リンクが正しいhrefを持つ', () => {});
    it('削除ボタンがダイアログを開く', () => {});
  });

  describe('基本情報カード', () => {
    it('日付がフォーマットされて表示される', () => {});
    it('会場名がリンクの場合、外部リンクとして表示される', () => {});
    it('オプション項目は値がある場合のみ表示される', () => {});
  });

  describe('収支サマリーカード', () => {
    it('金額がカンマ区切りで表示される', () => {});
    it('利益率がパーセント表示される', () => {});
    it('利益率がnullの場合は"-"が表示される', () => {});
  });

  describe('参加者セクション', () => {
    it('参加者追加ボタンがフォームを表示する', () => {});
    it('重複チェックボタンが機能する', () => {});
  });
});
```

#### 4.1.5 EventForm コンポーネント

```typescript
// src/components/events/event-form.test.tsx
describe('EventForm', () => {
  describe('新規作成モード', () => {
    it('デフォルト値が設定される', () => {});
    it('送信後にイベント詳細ページへリダイレクトされる', () => {});
  });

  describe('編集モード', () => {
    it('既存の値がフォームに反映される', () => {});
    it('日付フィールドが正しくフォーマットされる', () => {});
  });

  describe('バリデーション', () => {
    it('必須フィールドが空の場合エラーが表示される', () => {});
    it('数値フィールドに負の値を入力するとエラー', () => {});
  });

  describe('レスポンシブレイアウト', () => {
    it('grid-cols-1 sm:grid-cols-2 クラスが適用される', () => {});
  });
});
```

#### 4.1.6 EventFilters コンポーネント

```typescript
// src/components/events/event-filters.test.tsx
describe('EventFilters', () => {
  describe('フィルター選択', () => {
    it('年度選択が機能する', () => {});
    it('月選択が機能する', () => {});
    it('状態選択が機能する', () => {});
    it('URLパラメータが更新される', () => {});
  });

  describe('デフォルト値', () => {
    it('年度は現在の年がデフォルト', () => {});
    it('月は"全月"がデフォルト', () => {});
    it('状態は"全状態"がデフォルト', () => {});
  });

  describe('レスポンシブレイアウト', () => {
    it('flex-col sm:flex-row クラスが適用される', () => {});
    it('SelectTrigger に w-full sm:w-auto が適用される', () => {});
  });
});
```

#### 4.1.7 Button コンポーネント

```typescript
// src/components/ui/button.test.tsx
describe('Button', () => {
  describe('バリアント', () => {
    it('default バリアントのスタイルが適用される', () => {});
    it('outline バリアントのスタイルが適用される', () => {});
    it('ghost バリアントのスタイルが適用される', () => {});
    it('destructive バリアントのスタイルが適用される', () => {});
  });

  describe('サイズ', () => {
    it('default サイズは h-8', () => {});
    it('sm サイズは h-7', () => {});
    it('xs サイズは h-6', () => {});
  });

  describe('無効状態', () => {
    it('disabled 時に opacity-50 が適用される', () => {});
    it('disabled 時にクリックイベントが発火しない', () => {});
  });
});
```

#### 4.1.8 Dialog コンポーネント

```typescript
// src/components/ui/dialog.test.tsx
describe('Dialog', () => {
  describe('開閉制御', () => {
    it('open=true でダイアログが表示される', () => {});
    it('open=false でダイアログが非表示', () => {});
    it('閉じるボタンで onOpenChange が呼ばれる', () => {});
  });

  describe('コンテンツ', () => {
    it('children がレンダリングされる', () => {});
    it('showCloseButton=false で閉じるボタンが非表示', () => {});
  });

  describe('スタイル', () => {
    it('max-w-md クラスが適用される', () => {});
  });
});
```

### 4.2 統合テスト

#### 4.2.1 イベント一覧ページ

```typescript
// e2e/events-list.spec.ts
describe('イベント一覧ページ', () => {
  describe('フィルター連携', () => {
    it('年度を変更するとテーブルが更新される', () => {});
    it('月を変更するとテーブルが更新される', () => {});
    it('状態を変更するとテーブルが更新される', () => {});
    it('複数フィルターの組み合わせが機能する', () => {});
  });

  describe('テーブル操作', () => {
    it('イベントIDをクリックすると詳細ページに遷移する', () => {});
    it('削除済み表示トグルが機能する', () => {});
    it('復元ボタンが機能する', () => {});
  });
});
```

#### 4.2.2 イベント詳細ページ

```typescript
// e2e/event-detail.spec.ts
describe('イベント詳細ページ', () => {
  describe('参加者管理', () => {
    it('参加者追加フォームが開閉できる', () => {});
    it('参加者を追加するとテーブルに反映される', () => {});
    it('参加者を編集できる', () => {});
    it('参加者を削除できる', () => {});
    it('決済状態を変更できる', () => {});
  });

  describe('重複チェック', () => {
    it('重複がない場合、成功メッセージが表示される', () => {});
    it('重複がある場合、警告が表示される', () => {});
  });

  describe('イベント操作', () => {
    it('編集ページに遷移できる', () => {});
    it('削除ダイアログが表示される', () => {});
    it('削除後にイベント一覧に遷移する', () => {});
  });
});
```

#### 4.2.3 フォーム送信フロー

```typescript
// e2e/form-submission.spec.ts
describe('フォーム送信フロー', () => {
  describe('イベント作成', () => {
    it('必須項目を入力して送信できる', () => {});
    it('送信後にイベント詳細ページに遷移する', () => {});
    it('バリデーションエラーが表示される', () => {});
  });

  describe('イベント編集', () => {
    it('既存データが表示される', () => {});
    it('変更を保存できる', () => {});
    it('キャンセルで元のページに戻る', () => {});
  });
});
```

### 4.3 ブラウザ動作確認

#### 4.3.1 ダッシュボード（`/`）

| 確認項目 | PC (1920px) | タブレット (768px) | スマホ (375px) |
|---------|-------------|------------------|---------------|
| ヘッダーのレイアウト | タイトルと年度選択が横並び | 同左 | 縦並びになる |
| 月次サマリーテーブル | 全列表示 | 横スクロール可能 | 重要列のみ表示、横スクロール可能 |
| 年度選択の操作 | クリックで選択 | 同左 | タップで選択、十分なタップ領域 |

**スクリーンショット確認項目:**
- [ ] スマホでテーブルが画面幅に収まるか、スクロールバーが適切に表示されるか
- [ ] 年度選択のドロップダウンがスマホで適切なサイズで表示されるか

#### 4.3.2 イベント一覧（`/events`）

| 確認項目 | PC (1920px) | タブレット (768px) | スマホ (375px) |
|---------|-------------|------------------|---------------|
| フィルターのレイアウト | 横並び | 同左 | 縦並び、各フィルターが全幅 |
| 新規作成ボタン | 右上に表示 | 同左 | 全幅ボタン、または固定位置 |
| テーブル表示 | 全列表示 | 横スクロール | 主要列のみ表示（ID、日付、会場、状態） |
| 削除済み表示トグル | ラベルと横並び | 同左 | 同左 |

**スクリーンショット確認項目:**
- [ ] フィルターがスマホで縦並びになり、各項目が操作しやすいか
- [ ] テーブルの横スクロールがスムーズに動作するか
- [ ] イベントIDのリンクがタップしやすいか

#### 4.3.3 イベント詳細（`/events/[id]`）

| 確認項目 | PC (1920px) | タブレット (768px) | スマホ (375px) |
|---------|-------------|------------------|---------------|
| ヘッダー（タイトル・ボタン） | 横並び | 同左 | 縦並び、ボタンは全幅 |
| 基本情報カード | 2列グリッド | 同左 | 1列グリッド |
| 定員・参加費カード | 4列グリッド | 2列 | 1列または2列 |
| 収支サマリーカード | 4列グリッド | 2列 | 1列または2列 |
| タスク進捗 | 3列グリッド | 同左 | 1列グリッド |
| 参加者テーブル | 全列表示 | 横スクロール | 主要列のみ、横スクロール |
| 参加者追加フォーム | 2列グリッド | 同左 | 1列グリッド |

**スクリーンショット確認項目:**
- [ ] カードが適切にスタックされ、情報が見やすいか
- [ ] 編集・削除ボタンがタップしやすいか
- [ ] 参加者追加フォームの各入力欄が適切な幅を持つか
- [ ] 参加者テーブルの編集・削除ボタンがタップ可能か

#### 4.3.4 イベント作成/編集（`/events/new`, `/events/[id]/edit`）

| 確認項目 | PC (1920px) | タブレット (768px) | スマホ (375px) |
|---------|-------------|------------------|---------------|
| フォームレイアウト | 2列グリッド（一部4列） | 同左 | 全て1列 |
| 日付入力 | date picker | 同左 | ネイティブ date picker |
| 時刻入力 | time picker | 同左 | ネイティブ time picker |
| 数値入力 | number input | 同左 | number input（数字キーボード） |
| 送信ボタン | 左寄せ | 同左 | 全幅 |

**スクリーンショット確認項目:**
- [ ] 各入力欄がスマホで適切な幅を持ち、入力しやすいか
- [ ] 数字入力時に数字キーボードが表示されるか
- [ ] 送信ボタンがタップしやすいか

#### 4.3.5 参加者一覧（`/participants`）

| 確認項目 | PC (1920px) | タブレット (768px) | スマホ (375px) |
|---------|-------------|------------------|---------------|
| 検索フィールド | 固定幅 | 同左 | 全幅 |
| テーブル表示 | 全列表示 | 横スクロール | 主要列のみ |

**スクリーンショット確認項目:**
- [ ] 検索フィールドがスマホで全幅になり入力しやすいか
- [ ] テーブルが適切に表示されるか

#### 4.3.6 スケジュール（`/schedule`）

| 確認項目 | PC (1920px) | タブレット (768px) | スマホ (375px) |
|---------|-------------|------------------|---------------|
| フィルター | 横並び | 同左 | 縦並び |
| テーブル表示 | 全列表示 | 横スクロール | 主要列のみ（ID、日付、会場、残枠） |
| LINE ボタン | 各行に表示 | 同左 | 各行に表示（タップしやすいサイズ） |

**スクリーンショット確認項目:**
- [ ] 残枠情報が見やすいか
- [ ] LINE ボタンがタップしやすいか

#### 4.3.7 収支レポート（`/reports`）

| 確認項目 | PC (1920px) | タブレット (768px) | スマホ (375px) |
|---------|-------------|------------------|---------------|
| フィルター | 横並び | 同左 | 縦並び |
| テーブル表示 | 全列表示 | 横スクロール | 主要列のみ（ID、日付、利益） |

**スクリーンショット確認項目:**
- [ ] 金額が見やすく表示されるか
- [ ] 横スクロールがスムーズか

#### 4.3.8 ダイアログ（共通）

| 確認項目 | PC (1920px) | タブレット (768px) | スマホ (375px) |
|---------|-------------|------------------|---------------|
| ダイアログサイズ | 固定幅（max-w-md） | 同左 | ほぼ全幅（左右16pxマージン） |
| 閉じるボタン | 右上に表示 | 同左 | 右上に表示（タップしやすいサイズ） |
| フォーム内容 | 適切な幅 | 同左 | 全幅 |
| アクションボタン | 右寄せ横並び | 同左 | 縦並びまたは横並び（全幅） |

**スクリーンショット確認項目:**
- [ ] 削除確認ダイアログがスマホで操作しやすいか
- [ ] 参加者編集ダイアログがスマホで入力しやすいか
- [ ] 一括決済ダイアログがスマホで操作しやすいか
- [ ] LINE テキストダイアログがスマホで内容を確認しやすいか

#### 4.3.9 ナビゲーション

| 確認項目 | PC (1920px) | タブレット (768px) | スマホ (375px) |
|---------|-------------|------------------|---------------|
| サイドバー | 常時表示 | 常時表示 | 非表示（ハンバーガーメニュー） |
| メニュー開閉 | - | - | タップで開閉、スムーズなアニメーション |
| メニュー項目 | クリックで遷移 | 同左 | タップで遷移、十分なタップ領域 |

**スクリーンショット確認項目:**
- [ ] ハンバーガーメニューのアイコンがタップしやすいか
- [ ] メニューが開いた時、現在のページがハイライトされるか
- [ ] メニュー項目をタップした後、メニューが閉じるか

---

## 5. 実装手順

### Phase 1: テーブルのモバイル対応（推定: 2日）

1. **`src/components/ui/table.tsx` の修正**
   - TableHead、TableCell のパディングを微調整
   - `text-xs md:text-sm` でフォントサイズをレスポンシブに

2. **`src/components/events/event-table.tsx` の修正**
   - 「エリア」「参加者」「見込み収入」列に `hidden md:table-cell` を追加
   - モバイルでは「ID」「日付」「会場名」「状態」「アクション」のみ表示

3. **`src/components/participants/participant-table.tsx` の修正**
   - 「決済日」「確認者」「メモ」列に `hidden md:table-cell` を追加
   - タスク列（詳細送信、リマインダー、お礼）に `hidden lg:table-cell` を追加
   - モバイルでは「選択」「氏名」「性別」「参加費」「決済」「アクション」のみ表示

4. **`src/components/schedule/schedule-table.tsx` の修正**
   - 「時刻」「男性定員」「女性定員」「男性参加」「女性参加」に `hidden lg:table-cell` を追加
   - モバイルでは「ID」「日付」「会場」「状態」「男性残枠」「女性残枠」「LINE」のみ表示

5. **`src/components/reports/report-table.tsx` の修正**
   - 中間的な金額列に `hidden md:table-cell` を追加
   - モバイルでは「ID」「日付」「見込み利益(CB込)」「実現利益(CB込)」「利益率」のみ表示

6. **`src/components/dashboard/monthly-summary-table.tsx` の修正**
   - reports-table と同様の対応

### Phase 2: レイアウトの最適化（推定: 1.5日）

7. **`src/components/events/event-detail.tsx` の修正**
   - ヘッダー部分を `flex-col sm:flex-row` に変更
   - ボタングループを `flex-col sm:flex-row` に変更
   - グリッドを以下のように統一:
     - 基本情報: `grid-cols-1 sm:grid-cols-2`
     - 定員・参加費: `grid-cols-2 sm:grid-cols-4` → `grid-cols-1 sm:grid-cols-2 md:grid-cols-4`
     - 収支サマリー: 同上
     - 運営情報: 同上
   - 参加者セクションのヘッダーボタンを `flex-col sm:flex-row gap-2` に変更

8. **`src/components/events/event-form.tsx` の修正**
   - L211, L240 の `grid-cols-2` を `grid-cols-1 sm:grid-cols-2` に変更
   - L334 の `grid-cols-2 md:grid-cols-4` を `grid-cols-1 sm:grid-cols-2 md:grid-cols-4` に変更
   - 送信ボタンを `w-full sm:w-auto` に変更

### Phase 3: 操作性の改善（推定: 1日）

9. **`src/components/events/event-filters.tsx` の修正**
   - コンテナを `flex flex-col sm:flex-row gap-4` に変更
   - SelectTrigger の幅を `w-full sm:w-[120px]` 等に変更

10. **`src/components/schedule/schedule-filters.tsx` の修正**
    - event-filters と同様の対応

11. **`src/components/reports/report-filters.tsx` の修正**
    - event-filters と同様の対応

12. **タップ領域の確保**
    - 各テーブルのアクションボタンに `min-h-[44px] min-w-[44px]` を追加
    - または wrapper で padding を追加

### Phase 4: ダイアログとフォームの改善（推定: 0.5日）

13. **`src/components/ui/dialog.tsx` の修正**
    - `sm:max-w-sm` を `sm:max-w-md` に変更
    - 必要に応じてパディング調整

14. **`src/components/participants/participant-form.tsx` の確認**
    - 現状で問題がなければ修正不要
    - 必要に応じて余白調整

### Phase 5: テスト実施（推定: 2日）

15. **ユニットテストの実装・実行**
    - 各コンポーネントのテストを追加/更新
    - 全テストが pass することを確認

16. **統合テストの実施**
    - E2E テストの実行
    - 画面遷移、データ連携の確認

17. **ブラウザ動作確認**
    - Chrome DevTools のデバイスモードで各画面を確認
    - 実機（iPhone、Android）での動作確認
    - スクリーンショットの取得と記録

### 合計推定工数: 7日

---

## 6. 備考

### 6.1 今後の改善案（本 Issue のスコープ外）

- テーブルのカード表示切替機能
- スワイプによるアクション（削除、編集）
- プルダウンリフレッシュ
- PWA 対応（オフライン対応、ホーム画面追加）

### 6.2 参考資料

- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [Web Content Accessibility Guidelines (WCAG) - Touch Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [Google Material Design - Touch targets](https://material.io/design/usability/accessibility.html#layout-and-typography)
