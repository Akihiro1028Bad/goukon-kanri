# Data Model: 合コン管理 Webアプリケーション

**Date**: 2026-03-12
**Branch**: `001-goukon-web-app`

---

## ER 図（テキスト形式）

```
┌──────────────────────┐       ┌──────────────────────┐
│       Event          │       │    Participant        │
│──────────────────────│       │──────────────────────│
│ id (PK, auto)        │       │ id (PK, auto)        │
│ eventId (UNIQUE)     │──1:N──│ eventId (FK)         │
│ date                 │       │ name                 │
│ startTime            │       │ gender               │
│ venueName            │       │ fee                  │
│ mapUrl               │       │ paymentStatus        │
│ organizer            │       │ paymentDate          │
│ area                 │       │ paymentConfirmedBy   │
│ maleCapacity         │       │ memo                 │
│ femaleCapacity       │       │ isDeleted            │
│ maleFee              │       │ createdAt            │
│ femaleFee            │       │ updatedAt            │
│ theme                │       └──────────────────────┘
│ targetOccupation     │
│ status               │
│ venueCost            │
│ matchCount           │
│ expectedCashback     │
│ actualCashback       │
│ memo                 │
│ isDeleted            │
│ createdAt            │
│ updatedAt            │
└──────────────────────┘
```

---

## Prisma スキーマ定義

```prisma
// prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]  // @prisma/adapter-pg（サーバーレス環境用）
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")  // 開発: 省略可 / 本番: Supabase 直接接続（マイグレーション用）
}

/// 合コンイベント
model Event {
  /// 内部ID（自動採番、サロゲートキー）
  id        Int      @id @default(autoincrement())

  /// ビジネスキー: YYYY-MM-NNN 形式（例: 2025-02-001）
  /// 年・月はイベント日付から取得、NNN は当月連番（論理削除含む最大値+1）
  eventId   String   @unique @map("event_id")

  /// イベント日付（YYYY-MM-DD）
  date      DateTime @db.Date

  /// 開始時刻（HH:MM 形式の文字列。例: "19:00"）
  startTime String   @map("start_time")

  /// 会場名
  venueName String   @map("venue_name")

  /// 会場の地図URL（Google Maps 等）
  mapUrl    String?  @map("map_url")

  /// 担当者（幹事名）
  organizer String?

  /// エリア（例: "渋谷", "新宿", "銀座"）
  area      String

  /// 男性募集定員
  maleCapacity   Int @map("male_capacity")

  /// 女性募集定員
  femaleCapacity Int @map("female_capacity")

  /// 男性参加費（円）— 見込み収入計算の標準レートとして使用
  maleFee   Int @map("male_fee")

  /// 女性参加費（円）— 見込み収入計算の標準レートとして使用
  femaleFee Int @map("female_fee")

  /// テーマ（例: "春の出会い", "年末スペシャル"）
  theme     String?

  /// 対象職業（例: "IT系", "医療系"）
  targetOccupation String? @map("target_occupation")

  /// イベント状態
  status    EventStatus @default(SCHEDULED)

  /// 会場費（円）
  venueCost Int @default(0) @map("venue_cost")

  /// マッチング成立件数
  matchCount Int @default(0) @map("match_count")

  /// Food back 予定キャッシュバック額（円）
  expectedCashback Int @default(0) @map("expected_cashback")

  /// Food back 実際キャッシュバック額（円）
  actualCashback   Int @default(0) @map("actual_cashback")

  /// メモ（自由記述）
  memo      String?

  /// 論理削除フラグ
  isDeleted Boolean @default(false) @map("is_deleted")

  /// 作成日時
  createdAt DateTime @default(now()) @map("created_at")

  /// 更新日時
  updatedAt DateTime @updatedAt @map("updated_at")

  /// リレーション: 参加者（1対多）
  participants Participant[]

  @@map("events")
}

/// イベント状態（3値）
enum EventStatus {
  SCHEDULED  // 開催予定
  COMPLETED  // 開催済
  CANCELLED  // キャンセル

  @@map("event_status")
}

/// 参加者
model Participant {
  /// 内部ID（自動採番）
  id        Int      @id @default(autoincrement())

  /// 所属イベント（外部キー）
  eventId   String   @map("event_id")
  event     Event    @relation(fields: [eventId], references: [eventId])

  /// 氏名
  name      String

  /// 性別
  gender    Gender

  /// 参加費（円）— イベントの標準レートとは独立、個別入力
  fee       Int

  /// 決済状況
  paymentStatus PaymentStatus @default(UNPAID) @map("payment_status")

  /// 決済日（決済済みの場合のみ）
  paymentDate   DateTime? @db.Date @map("payment_date")

  /// 決済確認者名
  paymentConfirmedBy String? @map("payment_confirmed_by")

  /// メモ（自由記述）
  memo      String?

  /// 論理削除フラグ
  isDeleted Boolean @default(false) @map("is_deleted")

  /// 作成日時
  createdAt DateTime @default(now()) @map("created_at")

  /// 更新日時
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("participants")
}

/// 性別
enum Gender {
  MALE    // 男性
  FEMALE  // 女性

  @@map("gender")
}

/// 決済状況
enum PaymentStatus {
  PAID    // 済
  UNPAID  // 未

  @@map("payment_status")
}
```

---

## フィールド詳細（日本語対応表）

### Event テーブル

| フィールド | DB カラム名 | 型 | 必須 | デフォルト | 説明 | 対応 FR |
|-----------|-----------|-----|------|----------|------|---------|
| id | id | Int (PK) | Yes | auto | 内部サロゲートキー | - |
| eventId | event_id | String (UNIQUE) | Yes | 自動採番 | YYYY-MM-NNN 形式のビジネスキー | FR-001 |
| date | date | Date | Yes | - | イベント開催日 | FR-002 |
| startTime | start_time | String | Yes | - | 開始時刻（"19:00" 形式） | FR-002 |
| venueName | venue_name | String | Yes | - | 会場名 | FR-002 |
| mapUrl | map_url | String? | No | null | 地図URL | FR-002 |
| organizer | organizer | String? | No | null | 担当幹事名 | FR-002 |
| area | area | String | Yes | - | エリア名 | FR-002 |
| maleCapacity | male_capacity | Int | Yes | - | 男性募集定員 | FR-002 |
| femaleCapacity | female_capacity | Int | Yes | - | 女性募集定員 | FR-002 |
| maleFee | male_fee | Int | Yes | - | 男性参加費（円） | FR-002, FR-011 |
| femaleFee | female_fee | Int | Yes | - | 女性参加費（円） | FR-002, FR-011 |
| theme | theme | String? | No | null | テーマ | FR-002 |
| targetOccupation | target_occupation | String? | No | null | 対象職業 | FR-002 |
| status | status | EventStatus | Yes | SCHEDULED | イベント状態 | FR-003 |
| venueCost | venue_cost | Int | Yes | 0 | 会場費（円） | FR-002, FR-011 |
| matchCount | match_count | Int | Yes | 0 | マッチング成立件数 | FR-020 |
| expectedCashback | expected_cashback | Int | Yes | 0 | 予定CB額（円） | FR-012 |
| actualCashback | actual_cashback | Int | Yes | 0 | 実際CB額（円） | FR-012 |
| memo | memo | String? | No | null | メモ | FR-002 |
| isDeleted | is_deleted | Boolean | Yes | false | 論理削除フラグ | FR-004 |
| createdAt | created_at | DateTime | Yes | now() | 作成日時 | - |
| updatedAt | updated_at | DateTime | Yes | auto | 更新日時 | - |

### Participant テーブル

| フィールド | DB カラム名 | 型 | 必須 | デフォルト | 説明 | 対応 FR |
|-----------|-----------|-----|------|----------|------|---------|
| id | id | Int (PK) | Yes | auto | 内部ID | - |
| eventId | event_id | String (FK) | Yes | - | 所属イベントID | FR-006 |
| name | name | String | Yes | - | 氏名 | FR-006 |
| gender | gender | Gender | Yes | - | 性別 | FR-006 |
| fee | fee | Int | Yes | - | 参加費（円、個別入力） | FR-006 |
| paymentStatus | payment_status | PaymentStatus | Yes | UNPAID | 決済状況 | FR-007 |
| paymentDate | payment_date | Date? | No | null | 決済日 | FR-007 |
| paymentConfirmedBy | payment_confirmed_by | String? | No | null | 決済確認者名 | FR-007 |
| memo | memo | String? | No | null | メモ | FR-006 |
| isDeleted | is_deleted | Boolean | Yes | false | 論理削除フラグ | FR-006 |
| createdAt | created_at | DateTime | Yes | now() | 作成日時 | - |
| updatedAt | updated_at | DateTime | Yes | auto | 更新日時 | - |

---

## 自動計算フィールド（DB に保存しない導出値）

以下の値はクエリ時にアプリケーション層で計算する。DB カラムとしては持たない。

| 計算フィールド | 計算式 | 対応 FR |
|--------------|--------|---------|
| 男性参加人数 | `COUNT(participants WHERE gender=MALE AND isDeleted=false)` | FR-008 |
| 女性参加人数 | `COUNT(participants WHERE gender=FEMALE AND isDeleted=false)` | FR-008 |
| 合計参加人数 | 男性参加人数 + 女性参加人数 | FR-008 |
| 決済済み人数 | `COUNT(participants WHERE paymentStatus=PAID AND isDeleted=false)` | FR-008 |
| 未決済人数 | 合計参加人数 - 決済済み人数 | FR-008 |
| 見込み収入 | (男性参加人数 × event.maleFee) + (女性参加人数 × event.femaleFee) | FR-011 |
| 決済済み収入 | `SUM(fee WHERE paymentStatus=PAID AND isDeleted=false)` | FR-011 |
| 未回収 | 見込み収入 - 決済済み収入 | FR-011 |
| 見込み利益 | 見込み収入 - event.venueCost | FR-011 |
| 実現利益 | 決済済み収入 - event.venueCost | FR-011 |
| 利益率（見込） | 見込み収入 > 0 ? (見込み利益 / 見込み収入 × 100) : "-" | FR-011 |
| 男性残枠 | event.maleCapacity - 男性参加人数 | FR-018 |
| 女性残枠 | event.femaleCapacity - 女性参加人数 | FR-018 |

### 計算ロジックの実装場所

```typescript
// src/lib/calculations.ts

/**
 * イベントの収支サマリーを計算する
 *
 * 【重要】見込み収入の計算にはイベントの男女別標準参加費を使用する。
 * 参加者の個別参加費は決済済み収入の計算にのみ使用する。
 */
export function calculateEventFinancials(
  event: { maleFee: number; femaleFee: number; venueCost: number },
  participants: { gender: Gender; fee: number; paymentStatus: PaymentStatus; isDeleted: boolean }[]
) {
  // 論理削除されていない参加者のみ対象
  const active = participants.filter(p => !p.isDeleted);

  const maleCount = active.filter(p => p.gender === "MALE").length;
  const femaleCount = active.filter(p => p.gender === "FEMALE").length;
  const totalCount = maleCount + femaleCount;

  const paidParticipants = active.filter(p => p.paymentStatus === "PAID");
  const paidCount = paidParticipants.length;
  const unpaidCount = totalCount - paidCount;

  // 見込み収入: イベントの標準レート × 人数
  const expectedRevenue = (maleCount * event.maleFee) + (femaleCount * event.femaleFee);

  // 決済済み収入: 決済済み参加者の個別参加費の合計
  const paidRevenue = paidParticipants.reduce((sum, p) => sum + p.fee, 0);

  // 未回収
  const uncollected = expectedRevenue - paidRevenue;

  // 見込み利益
  const expectedProfit = expectedRevenue - event.venueCost;

  // 実現利益
  const actualProfit = paidRevenue - event.venueCost;

  // 利益率（見込）
  const profitRate = expectedRevenue > 0
    ? Math.round((expectedProfit / expectedRevenue) * 10000) / 100  // 小数第2位まで
    : null;  // null は UI で "-" として表示

  return {
    maleCount,
    femaleCount,
    totalCount,
    paidCount,
    unpaidCount,
    expectedRevenue,
    paidRevenue,
    uncollected,
    expectedProfit,
    actualProfit,
    profitRate,
  };
}
```

---

## イベントID 採番ロジック

```typescript
// src/lib/event-id.ts

/**
 * 次のイベントIDを生成する
 *
 * フォーマット: YYYY-MM-NNN
 * - YYYY: イベント日付の年
 * - MM: イベント日付の月（ゼロ埋め）
 * - NNN: 当月連番（論理削除を含む最大値 + 1、ゼロ埋め3桁以上）
 *
 * 【重要】削除済みIDは再利用しない。当月の全イベント（削除済み含む）の
 * 最大連番 + 1 を使用する（単調増加）。
 */
export async function generateEventId(
  prisma: PrismaClient,
  eventDate: Date
): Promise<string> {
  const year = eventDate.getFullYear();
  const month = eventDate.getMonth() + 1; // 0-indexed → 1-indexed

  const yearStr = String(year);
  const monthStr = String(month).padStart(2, "0");
  const prefix = `${yearStr}-${monthStr}-`;

  // 当月の全イベント（論理削除含む）から最大連番を取得
  const lastEvent = await prisma.event.findFirst({
    where: {
      eventId: { startsWith: prefix },
      // isDeleted は条件に含めない（削除済みも含めて最大値を取得）
    },
    orderBy: { eventId: "desc" },
    select: { eventId: true },
  });

  let nextSeq = 1;
  if (lastEvent) {
    // "2025-02-003" → "003" → 3 → 4
    const lastSeqStr = lastEvent.eventId.split("-")[2];
    nextSeq = parseInt(lastSeqStr, 10) + 1;
  }

  // 3桁ゼロ埋め（100以上でも対応: "100", "101", ...）
  const seqStr = String(nextSeq).padStart(3, "0");

  return `${prefix}${seqStr}`;
}
```

---

## 状態遷移

### EventStatus

```
SCHEDULED (開催予定) ──→ COMPLETED (開催済)
      │
      └───────────────→ CANCELLED (キャンセル)

※ 任意の状態間で自由に変更可能（FR-003: 3つの状態を「選択・変更」できる）
※ 状態遷移に制約はない（キャンセル→開催予定への復帰も許容）
```

### PaymentStatus

```
UNPAID (未) ──→ PAID (済)

※ 個別更新: 1名ずつ済に変更（決済日・確認者を同時入力）
※ 一括更新: チェックボックスで複数名を選択し、一括で済に変更（FR-007）
※ 済→未への戻しも可能（誤操作の修正用）
```

### 論理削除

```
通常状態 ──→ 論理削除 (isDeleted=true)
             ↓
        「削除済みを表示」トグルONで表示
             ↓
        復元操作で isDeleted=false に戻す

※ イベント論理削除時: 紐付く全参加者も同時に isDeleted=true にする
※ イベント復元時: 紐付く全参加者も同時に isDeleted=false に戻す
```

---

## インデックス設計

```sql
-- Prisma マイグレーションで自動作成されるインデックス
-- events テーブル
CREATE UNIQUE INDEX events_event_id_key ON events(event_id);

-- 追加インデックス（パフォーマンス用）
-- イベント一覧のフィルタリング用（年度・月・状態）
CREATE INDEX idx_events_date_status ON events(date, status) WHERE is_deleted = false;

-- 参加者テーブル
-- イベントIDによる参加者取得用
CREATE INDEX idx_participants_event_id ON participants(event_id) WHERE is_deleted = false;

-- 全イベント横断参加者一覧の氏名検索用
CREATE INDEX idx_participants_name ON participants(name) WHERE is_deleted = false;
```

Prisma スキーマに追加するインデックス定義:

```prisma
model Event {
  // ... (既存フィールド)

  @@index([date, status])
  @@map("events")
}

model Participant {
  // ... (既存フィールド)

  @@index([eventId])
  @@index([name])
  @@map("participants")
}
```
