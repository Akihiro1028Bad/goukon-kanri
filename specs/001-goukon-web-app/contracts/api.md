# API Contracts: 合コン管理 Webアプリケーション

**Date**: 2026-03-12
**Branch**: `001-goukon-web-app`

---

## 概要

本アプリは **Next.js App Router + Server Actions** を採用するため、REST API エンドポイントは原則作成しない。
データの読み書きは以下の2つのパターンで行う:

1. **データ取得（読み取り）**: Server Component 内で直接 Prisma クライアントを呼び出す
2. **データ変更（書き込み）**: Server Actions（`"use server"` 関数）を通じて Prisma クライアントを呼び出す

以下に各機能の Server Actions とデータ取得関数の契約（入出力の型定義）を定義する。

---

## 画面・ルーティング一覧

| パス | 画面名 | 説明 | 対応 FR |
|------|--------|------|---------|
| `/` | ダッシュボード | 月別サマリーテーブル、年度切替 | FR-014, FR-015, FR-016 |
| `/events` | イベント一覧 | 全イベント一覧、フィルタ、削除済みトグル | FR-005, FR-004 |
| `/events/new` | イベント新規登録 | イベント登録フォーム | FR-001, FR-002 |
| `/events/[id]` | イベント詳細 | イベント情報 + 参加者一覧 + 収支サマリー | FR-002〜FR-012 |
| `/events/[id]/edit` | イベント編集 | イベント編集フォーム | FR-002 |
| `/participants` | 参加者一覧（横断） | 全イベント横断参加者一覧 | FR-010 |
| `/reports` | 収支レポート | イベント別収支一覧 | FR-013 |
| `/schedule` | スケジュール一覧 | 募集管理、残枠表示、LINEテキスト生成 | FR-017〜FR-019 |

---

## ディレクトリ構造（Server Actions）

```
src/
├── app/
│   ├── page.tsx                      # ダッシュボード（/）
│   ├── events/
│   │   ├── page.tsx                  # イベント一覧（/events）
│   │   ├── new/
│   │   │   └── page.tsx              # イベント新規登録（/events/new）
│   │   └── [id]/
│   │       ├── page.tsx              # イベント詳細（/events/[id]）
│   │       └── edit/
│   │           └── page.tsx          # イベント編集（/events/[id]/edit）
│   ├── participants/
│   │   └── page.tsx                  # 参加者一覧・横断（/participants）
│   ├── reports/
│   │   └── page.tsx                  # 収支レポート（/reports）
│   └── schedule/
│       └── page.tsx                  # スケジュール一覧（/schedule）
├── actions/
│   ├── event-actions.ts              # イベント関連 Server Actions
│   └── participant-actions.ts        # 参加者関連 Server Actions
├── lib/
│   ├── prisma.ts                     # Prisma クライアントシングルトン
│   ├── calculations.ts               # 収支計算ロジック
│   ├── event-id.ts                   # イベントID採番ロジック
│   ├── line-text.ts                  # LINE募集テキスト生成ロジック
│   └── validations.ts               # Zod スキーマ定義
├── queries/
│   ├── event-queries.ts              # イベントデータ取得関数
│   ├── participant-queries.ts        # 参加者データ取得関数
│   └── dashboard-queries.ts          # ダッシュボード集計クエリ
└── components/
    ├── events/                       # イベント関連コンポーネント
    ├── participants/                 # 参加者関連コンポーネント
    ├── dashboard/                    # ダッシュボードコンポーネント
    ├── schedule/                     # スケジュールコンポーネント
    ├── reports/                      # レポートコンポーネント
    └── ui/                           # shadcn/ui コンポーネント
```

---

## 共通型定義

```typescript
// src/types/index.ts

/** Server Action の実行結果 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/** イベント状態（日本語ラベル付き） */
export const EVENT_STATUS_LABELS = {
  SCHEDULED: "開催予定",
  COMPLETED: "開催済",
  CANCELLED: "キャンセル",
} as const;

/** 性別（日本語ラベル付き） */
export const GENDER_LABELS = {
  MALE: "男性",
  FEMALE: "女性",
} as const;

/** 決済状況（日本語ラベル付き） */
export const PAYMENT_STATUS_LABELS = {
  PAID: "済",
  UNPAID: "未",
} as const;

/** 収支サマリー（計算結果） */
export type FinancialSummary = {
  maleCount: number;
  femaleCount: number;
  totalCount: number;
  paidCount: number;
  unpaidCount: number;
  expectedRevenue: number;
  paidRevenue: number;
  uncollected: number;
  expectedProfit: number;
  actualProfit: number;
  profitRate: number | null;  // null の場合 UI で "-" 表示
};

/** ダッシュボード月別サマリー行 */
export type MonthlySummaryRow = {
  month: number;  // 1〜12
  eventCount: number;
  maleCount: number;
  femaleCount: number;
  venueCost: number;
  expectedRevenue: number;
  paidRevenue: number;
  uncollected: number;
  expectedProfit: number;
  actualProfit: number;
  profitRate: number | null;
  matchCount: number;
};
```

---

## Server Actions 契約

### 1. イベント関連（`src/actions/event-actions.ts`）

#### `createEvent` — イベント新規登録

```typescript
"use server";

/**
 * 新規イベントを登録する
 *
 * 【処理フロー】
 * 1. Zod スキーマでバリデーション
 * 2. イベント日付から YYYY-MM-NNN 形式の eventId を自動採番
 * 3. events テーブルに INSERT
 * 4. 成功時: 作成した eventId を返す
 * 5. 失敗時: エラーメッセージを返す
 *
 * @param formData - イベント登録フォームのデータ
 * @returns ActionResult<{ eventId: string }>
 */
export async function createEvent(
  formData: FormData
): Promise<ActionResult<{ eventId: string }>>;
```

#### `updateEvent` — イベント更新

```typescript
/**
 * 既存イベントを更新する
 *
 * 【注意】eventId（ビジネスキー）は変更不可。
 * 日付を変更しても eventId は変わらない。
 *
 * @param eventId - 更新対象のイベントID（YYYY-MM-NNN形式）
 * @param formData - 更新後のフォームデータ
 * @returns ActionResult<void>
 */
export async function updateEvent(
  eventId: string,
  formData: FormData
): Promise<ActionResult>;
```

#### `deleteEvent` — イベント論理削除

```typescript
/**
 * イベントを論理削除する
 *
 * 【処理フロー】
 * 1. 対象イベントの isDeleted を true にする
 * 2. 紐付く全参加者の isDeleted も true にする
 * 3. トランザクション内で一括実行
 *
 * @param eventId - 削除対象のイベントID
 * @returns ActionResult<void>
 */
export async function deleteEvent(
  eventId: string
): Promise<ActionResult>;
```

#### `restoreEvent` — イベント復元

```typescript
/**
 * 論理削除されたイベントを復元する
 *
 * 【処理フロー】
 * 1. 対象イベントの isDeleted を false にする
 * 2. 紐付く全参加者の isDeleted も false にする
 * 3. トランザクション内で一括実行
 *
 * @param eventId - 復元対象のイベントID
 * @returns ActionResult<void>
 */
export async function restoreEvent(
  eventId: string
): Promise<ActionResult>;
```

---

### 2. 参加者関連（`src/actions/participant-actions.ts`）

#### `createParticipant` — 参加者登録

```typescript
"use server";

/**
 * イベントに参加者を登録する
 *
 * @param eventId - 所属イベントID
 * @param formData - 参加者登録フォームのデータ
 * @returns ActionResult<{ id: number }>
 */
export async function createParticipant(
  eventId: string,
  formData: FormData
): Promise<ActionResult<{ id: number }>>;
```

#### `updateParticipant` — 参加者更新

```typescript
/**
 * 参加者情報を更新する
 *
 * @param participantId - 更新対象の参加者内部ID
 * @param formData - 更新後のフォームデータ
 * @returns ActionResult<void>
 */
export async function updateParticipant(
  participantId: number,
  formData: FormData
): Promise<ActionResult>;
```

#### `deleteParticipant` — 参加者論理削除

```typescript
/**
 * 参加者を論理削除する
 *
 * @param participantId - 削除対象の参加者内部ID
 * @returns ActionResult<void>
 */
export async function deleteParticipant(
  participantId: number
): Promise<ActionResult>;
```

#### `restoreParticipant` — 参加者復元

```typescript
/**
 * 論理削除された参加者を復元する
 *
 * @param participantId - 復元対象の参加者内部ID
 * @returns ActionResult<void>
 */
export async function restoreParticipant(
  participantId: number
): Promise<ActionResult>;
```

#### `updatePaymentStatus` — 決済状況更新（個別）

```typescript
/**
 * 参加者の決済状況を個別に更新する
 *
 * 【処理フロー】
 * 1. paymentStatus を PAID/UNPAID に変更
 * 2. PAID の場合: paymentDate と paymentConfirmedBy を同時に設定
 * 3. UNPAID に戻す場合: paymentDate と paymentConfirmedBy を null にクリア
 *
 * @param participantId - 更新対象の参加者内部ID
 * @param status - "PAID" | "UNPAID"
 * @param paymentDate - 決済日（PAID の場合必須）
 * @param confirmedBy - 確認者名（PAID の場合必須）
 * @returns ActionResult<void>
 */
export async function updatePaymentStatus(
  participantId: number,
  status: "PAID" | "UNPAID",
  paymentDate?: Date,
  confirmedBy?: string
): Promise<ActionResult>;
```

#### `bulkUpdatePaymentStatus` — 決済状況一括更新

```typescript
/**
 * 複数参加者の決済状況を一括で「済」に更新する
 *
 * 【処理フロー】
 * 1. 選択された全参加者の paymentStatus を PAID にする
 * 2. 全員に同じ paymentDate と paymentConfirmedBy を設定
 * 3. トランザクション内で一括実行
 *
 * @param participantIds - 更新対象の参加者内部IDの配列
 * @param paymentDate - 決済日
 * @param confirmedBy - 確認者名
 * @returns ActionResult<{ updatedCount: number }>
 */
export async function bulkUpdatePaymentStatus(
  participantIds: number[],
  paymentDate: Date,
  confirmedBy: string
): Promise<ActionResult<{ updatedCount: number }>>;
```

---

## データ取得関数 契約

### 1. イベント関連（`src/queries/event-queries.ts`）

```typescript
/**
 * イベント一覧を取得する（フィルタ・ソート対応）
 *
 * @param options.year - フィルタ: 年度（必須）
 * @param options.month - フィルタ: 月（任意、1-12）
 * @param options.status - フィルタ: 状態（任意）
 * @param options.includeDeleted - 論理削除済みを含むか（デフォルト: false）
 * @param options.sortBy - ソートキー（デフォルト: "date"）
 * @param options.sortOrder - ソート順（デフォルト: "desc"）
 * @returns イベント配列（参加者サマリー付き）
 */
export async function getEvents(options: {
  year: number;
  month?: number;
  status?: EventStatus;
  includeDeleted?: boolean;
  sortBy?: "date" | "eventId" | "status" | "venueName";
  sortOrder?: "asc" | "desc";
}): Promise<EventWithSummary[]>;

/** イベント + 収支サマリーの型 */
export type EventWithSummary = Event & {
  financials: FinancialSummary;
};
```

```typescript
/**
 * イベント詳細を取得する（参加者一覧付き）
 *
 * @param eventId - イベントID（YYYY-MM-NNN形式）
 * @param includeDeletedParticipants - 削除済み参加者を含むか
 * @returns イベント詳細（参加者一覧 + 収支サマリー付き）
 */
export async function getEventDetail(
  eventId: string,
  includeDeletedParticipants?: boolean
): Promise<EventDetail | null>;

export type EventDetail = Event & {
  participants: Participant[];
  financials: FinancialSummary;
};
```

### 2. 参加者関連（`src/queries/participant-queries.ts`）

```typescript
/**
 * 全イベント横断の参加者一覧を取得する（FR-010）
 *
 * @param options.nameFilter - 氏名フィルタ（部分一致）
 * @param options.includeDeleted - 論理削除済みを含むか
 * @returns 参加者配列（所属イベントID付き）
 */
export async function getAllParticipants(options?: {
  nameFilter?: string;
  includeDeleted?: boolean;
}): Promise<ParticipantWithEventId[]>;

export type ParticipantWithEventId = Participant & {
  eventId: string;  // 所属イベントID
};
```

### 3. ダッシュボード関連（`src/queries/dashboard-queries.ts`）

```typescript
/**
 * 指定年度の月別サマリーを取得する（FR-014）
 *
 * 【計算方法】
 * 1. 指定年の全イベント（論理削除除く）を月別にグループ化
 * 2. 各月のイベント数、参加者数（男女別）を集計
 * 3. 収支計算ロジック（calculations.ts）で各月の財務値を算出
 * 4. マッチング件数を月別に合算
 * 5. 1月〜12月の全行を返す（イベント0件の月は全て0/null）
 *
 * @param year - 対象年度
 * @returns 12行の月別サマリー配列
 */
export async function getMonthlySummary(
  year: number
): Promise<MonthlySummaryRow[]>;
```

### 4. レポート関連（`src/queries/report-queries.ts`は event-queries.ts に統合）

```typescript
/**
 * 収支レポート用のイベント一覧を取得する（FR-013）
 *
 * @param options.year - フィルタ: 年度
 * @param options.month - フィルタ: 月（任意）
 * @returns イベント別収支データの配列
 */
export async function getReportData(options: {
  year: number;
  month?: number;
}): Promise<ReportRow[]>;

export type ReportRow = {
  eventId: string;
  date: Date;
  venueCost: number;
  expectedCashback: number;
  actualCashback: number;
  expectedRevenue: number;
  paidRevenue: number;
  uncollected: number;
  expectedProfit: number;
  actualProfit: number;
  profitRate: number | null;
};
```

---

## LINE 募集テキスト生成（`src/lib/line-text.ts`）

```typescript
/**
 * LINE公式アカウント投稿用の募集文テキストを生成する（FR-019）
 *
 * 【フォーマット】固定順序でイベント情報を結合する。
 * 時間帯は startTime から自動生成する（独立フィールドは持たない）。
 *
 * @param event - イベント情報
 * @param currentParticipants - 現在の参加者状況
 * @returns 生成されたテキスト文字列
 */
export function generateLineText(
  event: {
    date: Date;
    startTime: string;
    area: string;
    venueName: string;
    maleCapacity: number;
    femaleCapacity: number;
    maleFee: number;
    femaleFee: number;
    theme: string | null;
    targetOccupation: string | null;
  },
  currentParticipants: {
    maleCount: number;
    femaleCount: number;
  }
): string;

/**
 * 生成テキストのフォーマット例:
 *
 * 📅 2025年3月15日（土）
 * ⏰ 19:00〜
 * 📍 渋谷 / ダイニングバーABC
 * 👫 男性5名 / 女性5名
 * 💰 男性 6,000円 / 女性 4,000円
 * 🎯 テーマ: 春の出会い
 * 💼 対象: IT系
 * ✅ 残枠: 男性あと3名 / 女性あと2名
 */
```

---

## Zod バリデーションスキーマ（`src/lib/validations.ts`）

```typescript
import { z } from "zod";

/** イベント登録・編集フォーム用 */
export const eventFormSchema = z.object({
  date: z.coerce.date({ required_error: "日付は必須です" }),
  startTime: z.string()
    .min(1, "開始時刻は必須です")
    .regex(/^\d{2}:\d{2}$/, "HH:MM形式で入力してください"),
  venueName: z.string()
    .min(1, "会場名は必須です")
    .max(100, "100文字以内で入力してください"),
  mapUrl: z.union([
    z.string().url("正しいURLを入力してください"),
    z.literal(""),
  ]).optional().transform(v => v || null),
  organizer: z.string().max(50).optional().transform(v => v || null),
  area: z.string().min(1, "エリアは必須です"),
  maleCapacity: z.coerce.number()
    .int("整数で入力してください")
    .min(0, "0以上の整数を入力してください"),
  femaleCapacity: z.coerce.number()
    .int("整数で入力してください")
    .min(0, "0以上の整数を入力してください"),
  maleFee: z.coerce.number()
    .int("整数で入力してください")
    .min(0, "0以上の金額を入力してください"),
  femaleFee: z.coerce.number()
    .int("整数で入力してください")
    .min(0, "0以上の金額を入力してください"),
  theme: z.string().max(100).optional().transform(v => v || null),
  targetOccupation: z.string().max(100).optional().transform(v => v || null),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]),
  venueCost: z.coerce.number().int().min(0).default(0),
  matchCount: z.coerce.number().int().min(0).default(0),
  expectedCashback: z.coerce.number().int().min(0).default(0),
  actualCashback: z.coerce.number().int().min(0).default(0),
  memo: z.string().max(1000).optional().transform(v => v || null),
});

/** 参加者登録・編集フォーム用 */
export const participantFormSchema = z.object({
  name: z.string()
    .min(1, "氏名は必須です")
    .max(50, "50文字以内で入力してください"),
  gender: z.enum(["MALE", "FEMALE"], {
    required_error: "性別を選択してください",
  }),
  fee: z.coerce.number()
    .int("整数で入力してください")
    .min(0, "0以上の金額を入力してください"),
  paymentStatus: z.enum(["PAID", "UNPAID"]).default("UNPAID"),
  paymentDate: z.coerce.date().optional().nullable(),
  paymentConfirmedBy: z.string().max(50).optional().transform(v => v || null),
  memo: z.string().max(500).optional().transform(v => v || null),
});

/** 一括決済更新用 */
export const bulkPaymentSchema = z.object({
  participantIds: z.array(z.number().int().positive()).min(1, "1名以上選択してください"),
  paymentDate: z.coerce.date({ required_error: "決済日は必須です" }),
  confirmedBy: z.string().min(1, "確認者名は必須です").max(50),
});
```
