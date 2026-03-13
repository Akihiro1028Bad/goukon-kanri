# Quickstart Guide: 合コン管理 Webアプリケーション

**Date**: 2026-03-13
**Branch**: `001-goukon-web-app`

---

## 前提条件

以下がインストール済みであること:

| ツール | バージョン | 確認コマンド |
|--------|-----------|-------------|
| Node.js | 20.x 以上 | `node -v` |
| npm | 10.x 以上 | `npm -v` |
| Docker Desktop | 最新 | `docker --version` |
| Docker Compose | v2 以上 | `docker compose version` |
| Git | 最新 | `git -v` |

---

## 1. プロジェクト作成

```bash
# Next.js プロジェクトを作成（対話形式の質問にはデフォルトで回答）
npx create-next-app@latest goukon-kanri \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

cd goukon-kanri
```

---

## 2. 依存パッケージのインストール

```bash
# 本番用パッケージ
npm install prisma @prisma/client    # ORM（データベース操作）
npm install pg @prisma/adapter-pg    # Prisma ドライバーアダプター（サーバーレス環境用）
npm install @vercel/functions         # Vercel コネクション管理（attachDatabasePool）
npm install zod                       # バリデーション（入力値チェック）
npm install react-hook-form           # フォーム管理
npm install @hookform/resolvers       # React Hook Form + Zod の接続
npm install @tanstack/react-table     # データテーブル（一覧表示）
npm install sonner                    # Toast 通知（コピー成功等）
npm install date-fns                  # 日付操作ユーティリティ

# 開発用パッケージ
npm install -D @types/pg                    # pg の型定義
npm install -D vitest @vitejs/plugin-react  # ユニットテスト
npm install -D playwright @playwright/test  # E2E テスト
```

---

## 3. Docker Compose セットアップ

### 3.1 docker-compose.yml の作成

プロジェクトルートに `docker-compose.yml` を作成:

```yaml
# docker-compose.yml
#
# 開発環境用 Docker Compose 設定
# PostgreSQL をコンテナで起動し、Next.js アプリはホストで実行する
# （Hot Reload の DX を維持するため）

services:
  db:
    image: postgres:15-alpine
    container_name: goukon-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: goukon_kanri
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  # テスト用 DB（統合テスト・E2E テスト用、メイン DB と分離）
  db-test:
    image: postgres:15-alpine
    container_name: goukon-db-test
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: goukon_kanri_test
    ports:
      - "5433:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

**ポイント**:
- `db`: 開発用 PostgreSQL（ポート `5432`）
- `db-test`: テスト用 PostgreSQL（ポート `5433`）。統合テスト実行時にデータをクリーンアップしてもメインの開発データに影響しない
- `postgres:15-alpine`: 軽量イメージを使用
- `healthcheck`: DB の起動完了を確認できるようにする

### 3.2 環境変数テンプレートの作成

`.env.example` を作成（Git にコミットする）:

```env
# .env.example
# このファイルをコピーして .env を作成:
#   cp .env.example .env

# === 開発環境（docker-compose の db サービスに接続） ===
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/goukon_kanri"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/goukon_kanri"

# === テスト環境（docker-compose の db-test サービスに接続） ===
# DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/goukon_kanri_test"
```

`.env` ファイルを作成:

```bash
cp .env.example .env
```

**重要**: `.env` は `.gitignore` に含まれている（create-next-app が自動設定済み）。Git にコミットしないこと。

### 3.3 DB コンテナの起動

```bash
# PostgreSQL コンテナを起動（バックグラウンド）
docker compose up -d db

# 起動確認（healthy になるまで数秒待つ）
docker compose ps

# DB への接続確認
docker compose exec db psql -U postgres -d goukon_kanri -c "SELECT 1"
```

### 3.4 便利コマンド集

```bash
# DB コンテナの起動
docker compose up -d db

# DB + テストDB の起動
docker compose up -d

# コンテナの停止
docker compose down

# コンテナの停止 + データ削除（DB を完全にリセットしたい場合）
docker compose down -v

# DB のログを確認
docker compose logs db

# DB に直接接続（SQL を手動で実行したい場合）
docker compose exec db psql -U postgres -d goukon_kanri
```

---

## 4. shadcn/ui セットアップ

```bash
# shadcn/ui を初期化（対話形式。デフォルト設定で OK）
npx shadcn@latest init

# 必要なコンポーネントを追加
npx shadcn@latest add \
  button card dialog form input select \
  table badge switch checkbox calendar \
  popover separator dropdown-menu tabs
```

**補足**: `npx shadcn@latest add` を実行すると、コンポーネントのソースコードが `src/components/ui/` にコピーされる。npm パッケージではないため、自由にカスタマイズ可能。

---

## 5. Prisma セットアップ

### 5.1 Prisma 初期化

```bash
npx prisma init
```

これにより以下が作成される:
- `prisma/schema.prisma` — データベーススキーマ定義ファイル
- `.env` — データベース接続文字列（既に作成済みなので上書き注意）

**注意**: `npx prisma init` が `.env` を上書きする場合は、手順 3.2 の内容で再設定する。

### 5.2 スキーマ定義

`prisma/schema.prisma` を `data-model.md` の Prisma スキーマ定義で置き換える。

**注意**: `generator client` に `previewFeatures = ["driverAdapters"]` を追加すること（本番環境で `@prisma/adapter-pg` を使用するために必要）。

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}
```

### 5.3 マイグレーション実行

```bash
# DB コンテナが起動していることを確認
docker compose up -d db

# マイグレーションファイルを生成して実行
npx prisma migrate dev --name init

# 動作確認: Prisma Studio でテーブルを確認
npx prisma studio
```

ブラウザで `http://localhost:5555` が開き、作成されたテーブルを視覚的に確認できる。

### 5.4 テスト用 DB のマイグレーション

```bash
# テスト用 DB コンテナを起動
docker compose up -d db-test

# テスト用 DB にマイグレーションを適用
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/goukon_kanri_test" npx prisma migrate deploy
```

---

## 6. ディレクトリ構造の作成

```bash
# アプリケーションディレクトリ
mkdir -p src/app/events/new
mkdir -p src/app/events/\[id\]/edit
mkdir -p src/app/participants
mkdir -p src/app/reports
mkdir -p src/app/schedule

# ロジック・ユーティリティ
mkdir -p src/lib
mkdir -p src/actions
mkdir -p src/queries
mkdir -p src/types

# コンポーネント
mkdir -p src/components/events
mkdir -p src/components/participants
mkdir -p src/components/dashboard
mkdir -p src/components/schedule
mkdir -p src/components/reports
mkdir -p src/components/layout
```

---

## 7. 基本ファイルの作成

### 7.1 Prisma クライアントシングルトン（サーバーレス対応）

```typescript
// src/lib/prisma.ts
//
// Prisma クライアントシングルトン
// - 開発環境: Hot Reload で複数インスタンス化を防止（標準 Prisma クライアント）
// - 本番環境: @prisma/adapter-pg + Vercel attachDatabasePool でコネクション管理

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

**ポイント**:
- 開発環境では通常の `PrismaClient()` を使用（docker-compose の PostgreSQL に直接接続）
- 本番環境では `@prisma/adapter-pg` を使い、`pg` の `Pool` でコネクションプーリングを管理
- `@vercel/functions` の `attachDatabasePool` により、Vercel のサーバーレス関数がサスペンドされる前にアイドル接続を解放
- Supabase の Supavisor (Transaction Mode, port 6543) 経由で接続するため、コネクション枯渇を防止

### 7.2 共通型定義

```typescript
// src/types/index.ts

/** Server Action の実行結果 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/** イベント状態の日本語ラベル */
export const EVENT_STATUS_LABELS = {
  SCHEDULED: "開催予定",
  COMPLETED: "開催済",
  CANCELLED: "キャンセル",
} as const;

/** 性別の日本語ラベル */
export const GENDER_LABELS = {
  MALE: "男性",
  FEMALE: "女性",
} as const;

/** 決済状況の日本語ラベル */
export const PAYMENT_STATUS_LABELS = {
  PAID: "済",
  UNPAID: "未",
} as const;
```

### 7.3 レイアウト（ナビゲーション付き）

```typescript
// src/app/layout.tsx
//
// 全ページ共通のレイアウト。サイドバーナビゲーションを含む。

import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { Navigation } from "@/components/layout/navigation";

export const metadata: Metadata = {
  title: "合コン管理",
  description: "合コンイベント管理アプリケーション",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <div className="flex min-h-screen">
          <Navigation />
          <main className="flex-1 p-6">{children}</main>
        </div>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
```

```typescript
// src/components/layout/navigation.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "ダッシュボード" },
  { href: "/events", label: "イベント一覧" },
  { href: "/participants", label: "参加者一覧" },
  { href: "/schedule", label: "スケジュール" },
  { href: "/reports", label: "収支レポート" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="w-56 border-r bg-gray-50 p-4">
      <h1 className="mb-6 text-lg font-bold">合コン管理</h1>
      <ul className="space-y-1">
        {navItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`block rounded px-3 py-2 text-sm ${
                pathname === item.href
                  ? "bg-blue-100 font-medium text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

---

## 8. Vitest セットアップ

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

`package.json` にスクリプトを追加:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest",
    "test:run": "vitest run",
    "test:e2e": "playwright test",
    "db:up": "docker compose up -d db",
    "db:down": "docker compose down",
    "db:reset": "docker compose down -v && docker compose up -d db",
    "db:studio": "npx prisma studio",
    "db:migrate": "npx prisma migrate dev",
    "db:test:up": "docker compose up -d db-test",
    "db:test:migrate": "DATABASE_URL=postgresql://postgres:postgres@localhost:5433/goukon_kanri_test npx prisma migrate deploy"
  }
}
```

---

## 9. 開発サーバー起動

```bash
# 1. DB コンテナを起動
npm run db:up

# 2. 開発サーバーを起動
npm run dev
```

ブラウザで `http://localhost:3000` を開いて動作確認。

**停止するとき**:

```bash
# Next.js は Ctrl+C で停止
# DB コンテナを停止
npm run db:down
```

---

## 10. Vercel + Supabase デプロイ（初回）

### 10.1 Supabase プロジェクト作成

本番環境では Supabase の PostgreSQL を使用する（docker-compose は開発・テスト環境のみ）。

1. [Supabase](https://supabase.com/) にアカウント作成（GitHub ログイン可）
2. 「New Project」で新規プロジェクト作成
   - Project name: `goukon-kanri`
   - Database Password: 安全なパスワードを設定（メモしておく）
   - Region: `Northeast Asia (Tokyo)` を選択
3. Project Settings → Database → Connection string を取得

**接続文字列の確認**:
- **Transaction Mode (Pooler)**: `postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`
  → `DATABASE_URL` として使用（末尾に `?pgbouncer=true` を追加）
- **Direct Connection**: `postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`
  → `DIRECT_URL` として使用（マイグレーション専用）

### 10.2 本番 DB マイグレーション

```bash
# ローカルから Supabase に対してマイグレーション実行
# DIRECT_URL を使用（Pooler 経由ではマイグレーションが失敗する場合がある）
DIRECT_URL="postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres" \
  npx prisma migrate deploy
```

**注意**: `prisma migrate deploy` は既存のマイグレーションファイルを適用するだけで、新しいマイグレーションは作成しない。安全に本番 DB に実行可能。

### 10.3 GitHub リポジトリにプッシュ

```bash
git add .
git commit -m "Initial setup: Next.js + Prisma + shadcn/ui + Docker"
git push origin 001-goukon-web-app
```

### 10.4 Vercel にインポート

1. [Vercel](https://vercel.com/) にログイン（GitHub アカウント連携）
2. 「Add New Project」→ GitHub リポジトリを選択
3. **Framework Preset**: Next.js（自動検出される）
4. **Build Command** を以下に設定:
   ```
   prisma generate && next build
   ```
5. **Environment Variables** に以下を追加:

   | 変数名 | 値 | 説明 |
   |--------|-----|------|
   | `DATABASE_URL` | `postgres://postgres.[REF]:[PW]@...pooler...:6543/postgres?pgbouncer=true` | Supavisor Pooler (Transaction Mode) |
   | `DIRECT_URL` | `postgres://postgres.[REF]:[PW]@...pooler...:5432/postgres` | Direct Connection (マイグレーション用) |

6. **Environments**: Production と Preview の両方に設定
7. 「Deploy」をクリック

### 10.5 デプロイ後の確認

```bash
# デプロイされた URL にアクセスして動作確認
# https://goukon-kanri.vercel.app

# 以降の変更は git push するだけで自動デプロイ
git push origin 001-goukon-web-app  # → プレビュー環境にデプロイ
# main にマージ → 本番環境にデプロイ
```

### 10.6 以降のスキーマ変更手順

```bash
# 1. ローカルの開発 DB でマイグレーション作成
npx prisma migrate dev --name add_xxx_column

# 2. マイグレーションファイルを Git にコミット
git add prisma/migrations/
git commit -m "Add xxx column migration"

# 3. 本番 DB にマイグレーション適用（デプロイ前に実行）
DIRECT_URL="postgres://..." npx prisma migrate deploy

# 4. コードを push（Vercel が自動ビルド & デプロイ）
git push origin 001-goukon-web-app
```

---

## よくあるトラブルシューティング

| 症状 | 原因 | 対処法 |
|------|------|--------|
| `docker compose up` でポート競合 | ローカルの PostgreSQL が起動中 | `sudo lsof -i :5432` で確認し、停止するか docker-compose.yml のポートを変更 |
| `prisma migrate dev` で接続エラー | DB コンテナが未起動 | `docker compose up -d db` で起動 |
| DB コンテナが healthy にならない | Docker Desktop が未起動 | Docker Desktop を起動 |
| `prisma migrate dev` がタイムアウト | DB コンテナの起動が完了していない | `docker compose ps` で healthy を確認してからリトライ |
| テスト時に本番データが消える | テスト用 DB が分離されていない | テスト実行時は `db-test`（ポート5433）に接続しているか確認 |
| Vercel デプロイでDB接続エラー | 環境変数未設定 | Vercel の Environment Variables に `DATABASE_URL`（Pooler URL + `?pgbouncer=true`）と `DIRECT_URL` を設定 |
| Vercel で `prepared statement already exists` エラー | `?pgbouncer=true` 未付与 | `DATABASE_URL` に `?pgbouncer=true` を追加（PgBouncer Transaction Mode では prepared statements が使えないため） |
| `prisma migrate deploy` が本番で失敗 | Pooler 経由で実行している | `DIRECT_URL`（port 5432）を使用して実行する |
| Vercel ビルドで Prisma クライアントが見つからない | `prisma generate` 未実行 | Build Command を `prisma generate && next build` に設定 |
| Vercel で関数タイムアウト | Serverless Function の実行時間超過 | Supabase の Region を Tokyo に設定。クエリの最適化を検討 |
| `npx prisma studio` が開かない | ポート5555が使用中 | `npx prisma studio --port 5556` で別ポートを指定 |
| shadcn/ui コンポーネントが見つからない | `npx shadcn@latest add` 未実行 | 必要なコンポーネントを追加 |
| 型エラー（Prisma の型が見つからない） | `prisma generate` 未実行 | `npx prisma generate` を実行 |
| 開発サーバーでデータが空 | マイグレーション未実行 or シード未実行 | `npm run db:migrate` を実行 |
