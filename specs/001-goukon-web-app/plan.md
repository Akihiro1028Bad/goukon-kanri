# Implementation Plan: 合コン管理 Webアプリケーション

**Branch**: `001-goukon-web-app` | **Date**: 2026-03-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-goukon-web-app/spec.md`

---

## Summary

既存の Google スプレッドシート（合コン管理スプレッドシート_v4）を Web 化する。合コンイベントの登録・参加者管理・決済追跡・収支レポート・ダッシュボード・LINE 募集テキスト生成を提供する単一ユーザー向け個人ツール。

**技術アプローチ**: Next.js 15 (App Router) + Prisma ORM + PostgreSQL のフルスタック構成。Server Components でデータ取得、Server Actions でデータ変更を行い、API ルートの作成を不要にする。shadcn/ui + Tailwind CSS v4 でレスポンシブ UI を構築。開発環境は docker-compose で PostgreSQL を起動し、本番は Vercel + Supabase にデプロイ。

---

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20.x
**Framework**: Next.js 15.x (App Router, Server Components, Server Actions)
**ORM**: Prisma 6.x + `@prisma/adapter-pg`（サーバーレス環境用ドライバーアダプター）
**Storage**: PostgreSQL 15+ (開発: docker-compose / 本番: Supabase 無料プラン)
**Dev Environment**: Docker Compose (PostgreSQL コンテナ + テスト用 DB コンテナ)
**Hosting**: Vercel (Serverless Functions / Node.js Runtime)
**UI**: Tailwind CSS 4.x + shadcn/ui + TanStack Table 8.x
**Forms**: React Hook Form 7.x + Zod 3.x
**Testing**: Vitest 3.x (ユニット/統合) + Playwright (E2E)
**Target Platform**: Web (モバイル / タブレット / PC レスポンシブ)
**Project Type**: Web アプリケーション（フルスタック、単一プロジェクト）
**Performance Goals**: 全画面初期表示 3秒以内、決済更新反映 2秒以内 (SC-001, SC-002)
**Constraints**: オンライン専用（オフライン非対応）、認証なし、月額 $0（無料プラン範囲内）
**Scale/Scope**: 年間100イベント・1,000参加者、8画面、21 機能要件 (FR-001〜FR-021)

---

## Constitution Check

*constitution.md が存在しないため、ゲートチェックはスキップ。*

制約違反なし。Complexity Tracking は不要。

---

## Project Structure

### Documentation (this feature)

```text
specs/001-goukon-web-app/
├── plan.md              # 本ファイル（実装計画）
├── research.md          # 技術選定リサーチ結果
├── data-model.md        # データモデル定義（Prisma スキーマ含む）
├── quickstart.md        # 開発環境構築手順
├── test-cases.md        # テスト仕様書（147ケース、カバレッジ100%）
├── contracts/
│   └── api.md           # Server Actions / データ取得関数の契約定義
└── tasks.md             # タスク一覧（/speckit.tasks で生成）
```

### Source Code (repository root)

```text
goukon-kanri/
├── prisma/
│   └── schema.prisma            # データベーススキーマ定義
├── src/
│   ├── app/                     # Next.js App Router（ページ定義）
│   │   ├── layout.tsx           # 共通レイアウト（ナビゲーション + Toaster）
│   │   ├── page.tsx             # ダッシュボード（/）
│   │   ├── events/
│   │   │   ├── page.tsx         # イベント一覧（/events）
│   │   │   ├── new/
│   │   │   │   └── page.tsx     # イベント新規登録（/events/new）
│   │   │   └── [id]/
│   │   │       ├── page.tsx     # イベント詳細（/events/[id]）
│   │   │       └── edit/
│   │   │           └── page.tsx # イベント編集（/events/[id]/edit）
│   │   ├── participants/
│   │   │   └── page.tsx         # 参加者一覧・横断（/participants）
│   │   ├── reports/
│   │   │   └── page.tsx         # 収支レポート（/reports）
│   │   └── schedule/
│   │       └── page.tsx         # スケジュール一覧（/schedule）
│   ├── actions/                 # Server Actions（データ変更操作）
│   │   ├── event-actions.ts     # イベント CRUD + 論理削除/復元
│   │   └── participant-actions.ts # 参加者 CRUD + 決済更新
│   ├── queries/                 # データ取得関数（Server Component から呼出）
│   │   ├── event-queries.ts     # イベント一覧/詳細取得
│   │   ├── participant-queries.ts # 参加者一覧取得
│   │   └── dashboard-queries.ts # ダッシュボード月別集計
│   ├── lib/                     # ユーティリティ・ビジネスロジック
│   │   ├── prisma.ts            # Prisma クライアントシングルトン
│   │   ├── calculations.ts      # 収支計算ロジック（FR-011）
│   │   ├── event-id.ts          # イベントID 採番ロジック（FR-001）
│   │   ├── line-text.ts         # LINE 募集テキスト生成（FR-019）
│   │   └── validations.ts       # Zod バリデーションスキーマ
│   ├── types/                   # 共通型定義
│   │   └── index.ts
│   └── components/              # React コンポーネント
│       ├── ui/                  # shadcn/ui コンポーネント（自動生成）
│       ├── layout/
│       │   └── navigation.tsx   # サイドバーナビゲーション
│       ├── events/              # イベント関連コンポーネント
│       │   ├── event-table.tsx  # イベント一覧テーブル
│       │   ├── event-form.tsx   # イベント登録/編集フォーム
│       │   ├── event-detail.tsx # イベント詳細表示
│       │   └── delete-dialog.tsx # 削除確認ダイアログ
│       ├── participants/        # 参加者関連コンポーネント
│       │   ├── participant-table.tsx    # 参加者一覧テーブル
│       │   ├── participant-form.tsx     # 参加者登録フォーム
│       │   ├── payment-status-cell.tsx  # 決済状況セル（個別更新）
│       │   └── bulk-payment-dialog.tsx  # 一括決済更新ダイアログ
│       ├── dashboard/           # ダッシュボードコンポーネント
│       │   ├── monthly-summary-table.tsx # 月別サマリーテーブル
│       │   └── year-selector.tsx        # 年度切替セレクター
│       ├── schedule/            # スケジュールコンポーネント
│       │   ├── schedule-table.tsx       # スケジュール一覧テーブル
│       │   └── line-text-dialog.tsx     # LINE テキストプレビューモーダル
│       └── reports/             # レポートコンポーネント
│           └── report-table.tsx         # 収支レポートテーブル
├── tests/                       # テストファイル
│   ├── unit/                    # ユニットテスト（Vitest）
│   │   ├── calculations.test.ts # 収支計算ロジック（CALC-001〜012）
│   │   ├── event-id.test.ts     # ID採番ロジック（EVID-001〜012）
│   │   ├── line-text.test.ts    # LINEテキスト生成（LINE-001〜011）
│   │   └── validations.test.ts  # バリデーション（VAL-E/P/B 全31ケース）
│   ├── integration/             # 統合テスト（Vitest + DB）
│   │   ├── event-actions.test.ts      # イベント Server Actions（INT-E001〜013）
│   │   ├── participant-actions.test.ts # 参加者 Server Actions（INT-P001〜011）
│   │   └── queries.test.ts            # データ取得関数（INT-Q001〜017）
│   └── e2e/                     # E2E テスト（Playwright）
│       ├── event-crud.spec.ts         # イベント CRUD フロー（E2E-001〜005）
│       ├── participant-payment.spec.ts # 参加者・決済フロー（E2E-010〜014）
│       ├── dashboard.spec.ts          # ダッシュボード（E2E-020〜022）
│       ├── schedule-line.spec.ts      # スケジュール・LINE（E2E-030〜032）
│       └── reports.spec.ts            # 収支レポート（E2E-040〜041）
├── docker-compose.yml           # 開発環境（PostgreSQL + テスト用 DB）
├── .env                         # 環境変数（Git 管理外）
├── .env.example                 # 環境変数テンプレート（Git 管理対象）
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── vitest.config.ts
```

**Structure Decision**: Next.js のフルスタック構成（フロントエンド + バックエンドを同一プロジェクト内に配置）を採用。Server Components / Server Actions により、別途 API サーバーを立てる必要がない。`src/actions/` でデータ変更、`src/queries/` でデータ取得、`src/lib/` でビジネスロジックを分離する3層構造。

---

## 本番デプロイ設計

### 環境構成（開発 / 本番）

```
[開発環境]
  Next.js (ホスト: npm run dev)  ──→  PostgreSQL (docker-compose: port 5432)
  Vitest                         ──→  PostgreSQL (docker-compose: port 5433, テスト用)
  DATABASE_URL = postgresql://postgres:postgres@localhost:5432/goukon_kanri

[本番環境]
  GitHub → Vercel 自動ビルド → https://goukon-kanri.vercel.app
                    ↓ (Serverless Functions)
             Supabase PostgreSQL
                    ↓
  DATABASE_URL  = Supavisor Pooler (port 6543, Transaction Mode, ?pgbouncer=true)
  DIRECT_URL    = Direct Connection (port 5432, マイグレーション用)
```

### Supabase 接続設計

Vercel の Serverless Functions はリクエストごとに新しいインスタンスが起動する可能性があるため、**接続プーリング**が必須。Supabase の Supavisor（組み込みコネクションプーラー）を使用する。

| 環境変数 | 接続先 | ポート | 用途 |
|---------|--------|--------|------|
| `DATABASE_URL` | Supavisor Pooler (Transaction Mode) | 6543 | アプリケーションの全 DB アクセス |
| `DIRECT_URL` | Supabase Direct Connection | 5432 | Prisma マイグレーション (`prisma migrate deploy`) |

```env
# 本番用 .env（Vercel Environment Variables に設定）
DATABASE_URL="postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"
```

**重要ポイント**:
- `?pgbouncer=true` を付けることで Prisma が PgBouncer 互換モードで動作する（prepared statements を無効化）
- Transaction Mode (port 6543) はサーバーレス環境に最適（トランザクション完了後に接続を返却）
- `DIRECT_URL` はマイグレーション時のみ使用（`prisma migrate deploy` はプーラー経由だと失敗する場合がある）
- Region は `ap-northeast-1`（東京）を選択

### Prisma クライアント（サーバーレス対応）

Vercel のサーバーレス環境でのコネクション管理を最適化するため、`@prisma/adapter-pg` + `@vercel/functions` の `attachDatabasePool` を使用する。

```typescript
// src/lib/prisma.ts
//
// Prisma クライアントシングルトン
// - 開発環境: Hot Reload で複数インスタンス化を防止
// - 本番環境: Vercel Serverless でのコネクションプーリング最適化

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  // 本番環境（Vercel）: pg Pool + adapter を使用してコネクション管理
  if (process.env.NODE_ENV === "production" && process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    // Vercel Fluid compute: 関数サスペンド前にアイドルコネクションを解放
    // @vercel/functions が利用可能な場合のみ適用
    try {
      const { attachDatabasePool } = require("@vercel/functions");
      attachDatabasePool(pool);
    } catch {
      // Vercel 以外の環境では無視
    }

    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  }

  // 開発環境: 標準の Prisma クライアント（DATABASE_URL で直接接続）
  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

**追加パッケージ**:
```bash
npm install pg @prisma/adapter-pg
npm install -D @types/pg
npm install @vercel/functions  # Vercel デプロイ時のコネクション管理
```

### Prisma スキーマ（本番対応）

```prisma
// prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]  // @prisma/adapter-pg を使用するために必要
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")  // Supabase 直接接続（マイグレーション用）
}
```

### Vercel プロジェクト設定

#### Environment Variables（Vercel ダッシュボードで設定）

| 変数名 | 値 | Environments |
|--------|-----|-------------|
| `DATABASE_URL` | Supavisor Pooler URL (`?pgbouncer=true`) | Production, Preview |
| `DIRECT_URL` | Supabase Direct URL | Production, Preview |

#### Build & Development Settings

| 項目 | 値 |
|------|-----|
| Framework Preset | Next.js |
| Build Command | `prisma generate && next build` |
| Output Directory | (デフォルト: `.next`) |
| Install Command | `npm install` |
| Node.js Version | 20.x |

#### デプロイフロー

```
1. git push → GitHub
2. Vercel が自動検知 → ビルド開始
3. npm install（依存パッケージインストール）
4. prisma generate（Prisma クライアント生成）
5. next build（Next.js ビルド）
6. デプロイ完了 → プレビュー URL or 本番 URL
```

#### プレビュー環境

- `main` ブランチへの push → **本番デプロイ**
- その他ブランチへの push → **プレビューデプロイ**（一時的な URL が発行される）
- Pull Request ごとにプレビュー環境が自動作成されるため、動作確認が容易
- プレビュー環境も本番と同じ Supabase DB を参照（本プロジェクトは個人ツールのため DB 分離不要）

### 本番マイグレーション戦略

```bash
# 初回デプロイ時: Supabase DB にスキーマを作成
# ローカルから DIRECT_URL を使用してマイグレーション実行
DIRECT_URL="postgres://..." npx prisma migrate deploy

# 以降のスキーマ変更時:
# 1. ローカルで開発用 DB に対してマイグレーション作成
npx prisma migrate dev --name add_xxx_column
# 2. Git に commit & push
# 3. Vercel デプロイ前に手動でマイグレーション実行
DIRECT_URL="postgres://..." npx prisma migrate deploy
```

**注意**: Vercel のビルドプロセス内でマイグレーションを自動実行しない。マイグレーションは手動で実行する（破壊的変更のリスク回避）。

### 環境変数ファイル（更新版）

```env
# .env.example
# ============================
# 開発環境（docker-compose）
# ============================
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/goukon_kanri"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/goukon_kanri"

# テスト環境（docker-compose db-test）
# DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/goukon_kanri_test"

# ============================
# 本番環境（Vercel Environment Variables に設定）
# ※ このファイルには本番値を書かない。Vercel ダッシュボードで設定する。
# ============================
# DATABASE_URL="postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
# DIRECT_URL="postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"
```

### 本番運用チェックリスト

| 項目 | 対応 |
|------|------|
| 接続プーリング | Supavisor Transaction Mode (port 6543) + `?pgbouncer=true` |
| コネクション管理 | `@prisma/adapter-pg` + `@vercel/functions` の `attachDatabasePool` |
| マイグレーション | 手動実行（`prisma migrate deploy`、DIRECT_URL 使用） |
| 環境変数 | Vercel ダッシュボードで管理（`.env` にはコミットしない） |
| ビルドコマンド | `prisma generate && next build` |
| エラーハンドリング | Server Actions で try-catch、ユーザーに日本語エラーメッセージを返す |
| セキュリティ | 認証なし（個人ツール割り切り）。URL を知っている人はアクセス可能 |
| 監視 | Vercel Analytics（無料枠）で基本的なパフォーマンスモニタリング |
| DB バックアップ | Supabase の自動バックアップ（無料プラン: 7日間保持） |

---

## 実装方針

### アーキテクチャパターン

本プロジェクトは以下の3層構造で実装する。各層の責務を明確にすることで、初級エンジニアでも「どこに何を書くか」が迷わない。

```
┌─────────────────────────────────┐
│  UI 層（src/app/ + src/components/）  │  ← 画面表示とユーザー操作
├─────────────────────────────────┤
│  ロジック層（src/actions/ + src/queries/ + src/lib/）│  ← データ操作とビジネスルール
├─────────────────────────────────┤
│  データ層（prisma/ + PostgreSQL）                │  ← データ永続化
└─────────────────────────────────┘
```

| 層 | ディレクトリ | 何を書くか | 何を書かないか |
|---|------------|----------|-------------|
| **UI 層** | `src/app/`, `src/components/` | ページのレイアウト、フォーム表示、テーブル表示、ボタン操作 | DB クエリ、計算ロジック |
| **ロジック層** | `src/actions/`, `src/queries/`, `src/lib/` | DB 操作、収支計算、ID 採番、バリデーション | JSX、HTML、CSS |
| **データ層** | `prisma/schema.prisma` | テーブル定義、リレーション、インデックス | アプリケーションロジック |

### データフロー（具体例: イベント登録）

以下は「イベント登録画面でフォームを送信し、イベント一覧に遷移する」流れを図示したもの。

```
[ブラウザ] ユーザーがフォームに入力して「保存」ボタンをクリック
    │
    ▼
[src/components/events/event-form.tsx]
    React Hook Form がフォームデータを収集
    Zod スキーマ (validations.ts) でクライアント側バリデーション
    │
    ▼  Server Action を呼び出し
[src/actions/event-actions.ts] createEvent()
    1. FormData を受け取る
    2. Zod スキーマでサーバー側バリデーション（二重チェック）
    3. event-id.ts の generateEventId() でイベントID を採番
    4. prisma.event.create() で DB に INSERT
    5. revalidatePath("/events") でイベント一覧のキャッシュを無効化
    6. ActionResult<{ eventId: string }> を返す
    │
    ▼
[src/app/events/page.tsx] （Server Component）
    event-queries.ts の getEvents() で最新のイベント一覧を取得
    取得したデータを EventTable コンポーネントに渡す
    │
    ▼
[ブラウザ] 最新のイベント一覧が表示される
```

### Server Component vs Client Component の使い分け

Next.js App Router では、デフォルトで全コンポーネントが **Server Component**（サーバー側で実行）になる。ブラウザ側の操作（クリック、入力、状態管理）が必要なコンポーネントのみ `"use client"` を付けて **Client Component** にする。

| 種類 | いつ使うか | 本プロジェクトでの例 |
|------|----------|-------------------|
| **Server Component** | データ取得、表示のみ | ページコンポーネント（page.tsx）、レイアウト |
| **Client Component** | フォーム入力、ボタン操作、状態管理が必要 | EventForm, EventTable, PaymentStatusCell, Navigation |

**判断基準**: `useState`, `useEffect`, `onClick`, `onChange` を使うか？ → Yes なら Client Component (`"use client"`)

### Server Actions の実装パターン

Server Actions は `"use server"` を付けた非同期関数で、ブラウザから直接呼び出せるサーバーサイド関数。

```typescript
// src/actions/event-actions.ts
"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { eventFormSchema } from "@/lib/validations";
import { generateEventId } from "@/lib/event-id";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

/**
 * 新規イベントを登録する
 *
 * 【呼び出し方】
 * Client Component のフォームから:
 *   const result = await createEvent(formData);
 *   if (result.success) router.push(`/events/${result.data.eventId}`);
 */
export async function createEvent(
  formData: FormData
): Promise<ActionResult<{ eventId: string }>> {
  try {
    // 1. FormData をオブジェクトに変換してバリデーション
    const raw = Object.fromEntries(formData);
    const validated = eventFormSchema.parse(raw);

    // 2. イベントID を自動採番
    const eventId = await generateEventId(prisma, validated.date);

    // 3. DB に保存
    await prisma.event.create({
      data: {
        eventId,
        ...validated,
      },
    });

    // 4. イベント一覧のキャッシュを無効化（最新データを表示するため）
    revalidatePath("/events");
    revalidatePath("/"); // ダッシュボードも更新

    return { success: true, data: { eventId } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: "イベントの登録に失敗しました" };
  }
}
```

### フォームの実装パターン

```typescript
// src/components/events/event-form.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";

import { eventFormSchema } from "@/lib/validations";
import { createEvent, updateEvent } from "@/actions/event-actions";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EVENT_STATUS_LABELS } from "@/types";

type EventFormValues = z.infer<typeof eventFormSchema>;

type Props = {
  /** 編集時は既存イベントデータを渡す。新規登録時は undefined */
  defaultValues?: EventFormValues & { eventId: string };
};

export function EventForm({ defaultValues }: Props) {
  const router = useRouter();
  const isEdit = !!defaultValues;

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: defaultValues ?? {
      status: "SCHEDULED",
      venueCost: 0,
      matchCount: 0,
      expectedCashback: 0,
      actualCashback: 0,
    },
  });

  async function onSubmit(values: EventFormValues) {
    // FormData に変換して Server Action を呼び出す
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, String(value));
      }
    });

    const result = isEdit
      ? await updateEvent(defaultValues!.eventId, formData)
      : await createEvent(formData);

    if (result.success) {
      toast.success(isEdit ? "更新しました" : "登録しました");
      if (!isEdit && "data" in result) {
        router.push(`/events/${result.data.eventId}`);
      } else {
        router.push("/events");
      }
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* 日付 */}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>日付</FormLabel>
              <FormControl>
                <Input type="date" {...field}
                  value={field.value ? new Date(field.value).toISOString().split("T")[0] : ""}
                  onChange={(e) => field.onChange(new Date(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 開始時刻 */}
        <FormField
          control={form.control}
          name="startTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>開始時刻</FormLabel>
              <FormControl>
                <Input type="time" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 会場名 */}
        <FormField
          control={form.control}
          name="venueName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>会場名</FormLabel>
              <FormControl>
                <Input placeholder="例: ダイニングバーABC" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* エリア */}
        <FormField
          control={form.control}
          name="area"
          render={({ field }) => (
            <FormItem>
              <FormLabel>エリア</FormLabel>
              <FormControl>
                <Input placeholder="例: 渋谷" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 男女別募集定員（横並び） */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="maleCapacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>男性定員</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="femaleCapacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>女性定員</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 男女別参加費（横並び） */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="maleFee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>男性参加費（円）</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="femaleFee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>女性参加費（円）</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 状態 */}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>状態</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="状態を選択" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 保存ボタン */}
        <div className="flex gap-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "保存中..." : isEdit ? "更新" : "登録"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            キャンセル
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

### データテーブルの実装パターン

```typescript
// src/components/events/event-table.tsx
"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import Link from "next/link";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { EVENT_STATUS_LABELS } from "@/types";
import type { EventWithSummary } from "@/queries/event-queries";

const statusVariant = {
  SCHEDULED: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
} as const;

const columns: ColumnDef<EventWithSummary>[] = [
  {
    accessorKey: "eventId",
    header: "イベントID",
    cell: ({ row }) => (
      <Link href={`/events/${row.original.eventId}`} className="text-blue-600 hover:underline">
        {row.original.eventId}
      </Link>
    ),
  },
  {
    accessorKey: "date",
    header: "日付",
    cell: ({ row }) => new Date(row.original.date).toLocaleDateString("ja-JP"),
  },
  {
    accessorKey: "venueName",
    header: "会場名",
  },
  {
    accessorKey: "area",
    header: "エリア",
  },
  {
    accessorKey: "status",
    header: "状態",
    cell: ({ row }) => (
      <Badge variant={statusVariant[row.original.status]}>
        {EVENT_STATUS_LABELS[row.original.status]}
      </Badge>
    ),
  },
  {
    id: "participants",
    header: "参加者",
    cell: ({ row }) => {
      const f = row.original.financials;
      return `${f.totalCount}名（男${f.maleCount}/女${f.femaleCount}）`;
    },
  },
  {
    id: "expectedRevenue",
    header: "見込み収入",
    cell: ({ row }) =>
      `¥${row.original.financials.expectedRevenue.toLocaleString()}`,
  },
];

type Props = {
  events: EventWithSummary[];
};

export function EventTable({ events }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showDeleted, setShowDeleted] = useState(false);

  const filteredEvents = showDeleted
    ? events
    : events.filter((e) => !e.isDeleted);

  const table = useReactTable({
    data: filteredEvents,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  return (
    <div>
      {/* 削除済み表示トグル */}
      <div className="mb-4 flex items-center gap-2">
        <Switch checked={showDeleted} onCheckedChange={setShowDeleted} />
        <span className="text-sm text-gray-600">削除済みを表示</span>
      </div>

      {/* テーブル */}
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              className={row.original.isDeleted ? "opacity-50 bg-gray-50" : ""}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

### LINE テキストプレビューモーダルの実装パターン

```typescript
// src/components/schedule/line-text-dialog.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { generateLineText } from "@/lib/line-text";

type Props = {
  event: Parameters<typeof generateLineText>[0];
  currentParticipants: Parameters<typeof generateLineText>[1];
};

export function LineTextDialog({ event, currentParticipants }: Props) {
  const [open, setOpen] = useState(false);
  const text = generateLineText(event, currentParticipants);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("クリップボードにコピーしました");
    } catch {
      // フォールバック: textarea 経由でコピー
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      toast.success("クリップボードにコピーしました");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          LINE テキスト生成
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>LINE 募集テキスト</DialogTitle>
        </DialogHeader>
        <pre className="whitespace-pre-wrap rounded bg-gray-50 p-4 text-sm">
          {text}
        </pre>
        <div className="flex justify-end gap-2">
          <Button onClick={handleCopy}>
            コピー
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)}>
            閉じる
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### ダッシュボード月別サマリーテーブルの実装パターン

```typescript
// src/components/dashboard/monthly-summary-table.tsx
"use client";

import Link from "next/link";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { MonthlySummaryRow } from "@/types";

type Props = {
  year: number;
  rows: MonthlySummaryRow[];
};

const MONTH_NAMES = [
  "1月", "2月", "3月", "4月", "5月", "6月",
  "7月", "8月", "9月", "10月", "11月", "12月",
];

/** 金額をカンマ区切りで表示（例: 123456 → "¥123,456"） */
function formatYen(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

/** 利益率を表示（null の場合は "-"） */
function formatRate(rate: number | null): string {
  return rate !== null ? `${rate.toFixed(1)}%` : "-";
}

export function MonthlySummaryTable({ year, rows }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>月</TableHead>
          <TableHead className="text-right">件数</TableHead>
          <TableHead className="text-right">男性</TableHead>
          <TableHead className="text-right">女性</TableHead>
          <TableHead className="text-right">会場費</TableHead>
          <TableHead className="text-right">見込み収入</TableHead>
          <TableHead className="text-right">決済済み</TableHead>
          <TableHead className="text-right">未回収</TableHead>
          <TableHead className="text-right">見込み利益</TableHead>
          <TableHead className="text-right">実現利益</TableHead>
          <TableHead className="text-right">利益率</TableHead>
          <TableHead className="text-right">マッチング</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.month}>
            <TableCell>
              {/* FR-016: 月クリックでイベント一覧に遷移 */}
              <Link
                href={`/events?year=${year}&month=${row.month}`}
                className="text-blue-600 hover:underline"
              >
                {MONTH_NAMES[row.month - 1]}
              </Link>
            </TableCell>
            <TableCell className="text-right">{row.eventCount}</TableCell>
            <TableCell className="text-right">{row.maleCount}</TableCell>
            <TableCell className="text-right">{row.femaleCount}</TableCell>
            <TableCell className="text-right">{formatYen(row.venueCost)}</TableCell>
            <TableCell className="text-right">{formatYen(row.expectedRevenue)}</TableCell>
            <TableCell className="text-right">{formatYen(row.paidRevenue)}</TableCell>
            <TableCell className="text-right">{formatYen(row.uncollected)}</TableCell>
            <TableCell className="text-right">{formatYen(row.expectedProfit)}</TableCell>
            <TableCell className="text-right">{formatYen(row.actualProfit)}</TableCell>
            <TableCell className="text-right">{formatRate(row.profitRate)}</TableCell>
            <TableCell className="text-right">{row.matchCount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### レスポンシブ対応方針

| デバイス | 幅 | UI 対応 |
|---------|-----|--------|
| モバイル | < 768px | サイドバーは非表示（ハンバーガーメニューで開閉）、テーブルは横スクロール |
| タブレット | 768px〜1024px | サイドバー表示、テーブルは横スクロール |
| PC | > 1024px | サイドバー + フルテーブル表示 |

Tailwind CSS のブレークポイント (`md:`, `lg:`) で切り替える。

---

## 実装優先順位（推奨実装順序）

| 順序 | 機能 | 対応 FR | 理由 |
|------|------|---------|------|
| 1 | プロジェクト初期化 + docker-compose + DB セットアップ + 本番デプロイ基盤 | - | 全機能の土台。Prisma adapter-pg / Vercel 設定を含む |
| 2 | 共通レイアウト + ナビゲーション | - | 全画面で使用 |
| 3 | イベント CRUD（一覧・登録・詳細・編集・削除） | FR-001〜FR-005 | P1: 全業務の起点 |
| 4 | 参加者 CRUD（登録・編集・削除・検索） | FR-006〜FR-009 | P2: イベントに依存 |
| 5 | 決済管理（個別・一括更新） | FR-007 | P2: 参加者に依存 |
| 6 | 収支自動計算 + イベント詳細画面の収支表示 | FR-011, FR-008 | P2: 参加者データに依存 |
| 7 | ダッシュボード（月別サマリー・年度切替・月クリック遷移） | FR-014〜FR-016 | P3: イベント+参加者データが前提 |
| 8 | 全イベント横断参加者一覧 | FR-010 | P2 だがコア機能に影響しない |
| 9 | 収支レポート | FR-013 | P3: ダッシュボードの次 |
| 10 | Food back 管理 | FR-012 | イベント編集フォームに追加 |
| 11 | マッチング管理 | FR-020, FR-021 | イベント編集フォームに追加 |
| 12 | スケジュール一覧 + LINE テキスト生成 | FR-017〜FR-019 | P4: 最後に実装 |
| 13 | レスポンシブ対応・モバイル最適化 | SC-006 | 全画面完成後に調整 |
| 14 | E2E テスト | SC-001〜SC-005 | 機能完成後にテスト |

---

## Complexity Tracking

Constitution Check スキップのため、複雑性違反の記録は不要。

| 項目 | 状態 |
|------|------|
| プロジェクト数 | 1（Next.js フルスタック単一プロジェクト） |
| 外部サービス | 2（Supabase PostgreSQL + Vercel Hosting） |
| ORM パターン | Prisma + adapter-pg（サーバーレス環境用ドライバーアダプター） |
| 状態管理 | なし（Server Components + URL パラメータで管理） |
| コネクション管理 | Supavisor (Transaction Mode) + attachDatabasePool |

---

## 生成済みアーティファクト

| ファイル | 説明 |
|---------|------|
| [research.md](./research.md) | 技術選定リサーチ（Phase 0） |
| [data-model.md](./data-model.md) | データモデル定義・Prisma スキーマ（adapter-pg 対応）・計算ロジック（Phase 1） |
| [contracts/api.md](./contracts/api.md) | Server Actions / データ取得関数の入出力契約（Phase 1） |
| [quickstart.md](./quickstart.md) | 開発環境構築 + 本番デプロイ手順（Phase 1） |
| [test-cases.md](./test-cases.md) | テスト仕様書・147ケース・カバレッジ100%（Phase 2） |
