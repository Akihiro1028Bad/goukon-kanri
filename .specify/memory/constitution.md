<!--
Sync Impact Report
===================
- Version change: 1.0.0 → 1.0.1 (post-analyze consistency fixes)
- Modified: Principle IV directory paths aligned with plan.md
- Modified: Principle III test directory aligned with plan.md
- Modified: Development Workflow file naming aligned with plan.md
- Previous version: 1.0.0 (initial ratification)
- Added principles:
  1. Server Components First
  2. Type Safety
  3. TDD (Test-Driven Development)
  4. 3-Layer Architecture
  5. Serverless-Ready Data Access
  6. Accessible & Responsive UI
  7. Simplicity (YAGNI)
- Added sections:
  - Technology Constraints
  - Development Workflow
  - Governance
- Removed sections: none
- Templates requiring updates:
  - .specify/templates/plan-template.md ✅ no update needed (generic)
  - .specify/templates/spec-template.md ✅ no update needed (generic)
  - .specify/templates/tasks-template.md ✅ no update needed (generic)
- Follow-up TODOs: none
-->

# goukon-kanri Constitution

## Core Principles

### I. Server Components First

Next.js 15 App Router のサーバーコンポーネントをデフォルトとする。

- すべてのコンポーネントはサーバーコンポーネントとして作成し、
  クライアント状態やブラウザ API が必要な場合のみ `"use client"` を付与する
- データ取得はサーバーコンポーネント内で直接行い、
  クライアントへの不要なデータ転送を防ぐ
- データ変更は Server Actions (`"use server"`) で実装し、
  API Route は外部連携が必要な場合のみ使用する
- `loading.tsx` / `error.tsx` / `not-found.tsx` を各ルートセグメントに
  配置し、Suspense ベースの UX を実現する
- メタデータは `generateMetadata` で動的生成する

### II. Type Safety

TypeScript の型システムを最大限活用し、ランタイムエラーを防止する。

- `strict: true` を必須とし、`any` 型の使用を禁止する
- Zod スキーマでフォーム入力・Server Action 引数を
  バリデーションし、推論型 (`z.infer<typeof schema>`) を使用する
- Prisma が生成する型をドメイン層の型定義として活用し、
  手動の型定義との重複を避ける
- Server Actions の戻り値は
  `{ success: true; data: T } | { success: false; error: string }`
  の判別共用体で統一する
- 共有型は `src/types/` に集約し、コンポーネント固有の型は
  コンポーネントファイル内に定義する

### III. TDD (Test-Driven Development) — NON-NEGOTIABLE

RED → GREEN → REFACTOR サイクルを厳格に遵守する。

- 実装コードを書く前に、必ず失敗するテストを書く（RED）
- テストが通る最小限の実装を行う（GREEN）
- テスト通過を維持しながらリファクタリングする（REFACTOR）
- テストの種類と責務:
  - **Unit テスト (Vitest)**: ビジネスロジック・バリデーション・
    ユーティリティ関数を対象。外部依存はモックする
  - **Integration テスト (Vitest)**: Server Actions・データベース操作を
    対象。テスト用 DB (Docker, port 5433) を使用する
  - **E2E テスト (Playwright)**: ユーザーストーリー単位の
    クリティカルパスを対象。ブラウザ操作で検証する
- テストファイルは `tests/` ディレクトリに配置し
  （`tests/unit/`, `tests/integration/`, `tests/e2e/`）、
  `*.test.ts` / `*.test.tsx` / `*.spec.ts` の命名規則に従う

### IV. 3-Layer Architecture

責務を明確に分離した 3 層アーキテクチャを採用する。

- **データ層** (`src/lib/prisma.ts` + Prisma Schema):
  データベースアクセスを一元管理する。Prisma Client の
  シングルトンパターンを使用する
- **ビジネスロジック層** (`src/lib/` + `src/actions/` + `src/queries/`):
  ドメインロジック・バリデーション・計算を `src/lib/` に実装する。
  データ変更は Server Actions (`src/actions/`)、
  データ取得は `src/queries/` で行う。
  フレームワーク非依存とし、純粋な TypeScript 関数で構成する
- **プレゼンテーション層** (`src/app/` + `src/components/`):
  UI レンダリングとユーザーインタラクションを担当する。
  Server Actions (`src/actions/`) がビジネスロジック層を呼び出す
- 各層の依存方向: プレゼンテーション → ビジネスロジック → データ層
  （逆方向の依存は禁止）

### V. Serverless-Ready Data Access

Vercel + Supabase 環境でのサーバーレスデプロイに対応する。

- Prisma は `@prisma/adapter-pg` + `driverAdapters` プレビュー機能を
  使用し、サーバーレス環境でのコネクション管理を最適化する
- 環境変数の分離:
  - `DATABASE_URL`: Supavisor プーラー経由
    (port 6543, `?pgbouncer=true`)
  - `DIRECT_URL`: 直接接続（マイグレーション専用）
- 本番環境では `@vercel/functions` の `attachDatabasePool` を使用し、
  コネクションプールのライフサイクルを管理する
- 開発環境では Docker Compose で PostgreSQL を起動し、
  本番との差異を最小化する

### VI. Accessible & Responsive UI

shadcn/ui + Tailwind CSS 4 でアクセシブルかつ
レスポンシブな UI を構築する。

- shadcn/ui コンポーネントを基盤とし、Radix UI の
  アクセシビリティ機能を活用する
- モバイルファーストでデザインし、タブレット・デスクトップへ
  段階的に拡張する（ブレークポイント: sm/md/lg）
- フォームは React Hook Form + Zod で実装し、
  リアルタイムバリデーションを提供する
- データテーブルは TanStack Table 8 で実装し、
  ソート・フィルタ・ページネーションを統一的に提供する
- 日本語ロケールを基本とし、日付・通貨の表示形式を統一する

### VII. Simplicity (YAGNI)

必要最小限の実装に留め、過度な抽象化を避ける。

- 現在必要な機能のみ実装し、将来の拡張を先取りしない
- 認証は V1 では実装しない（シングルユーザーツール）
- 3 回以上繰り返されるパターンのみ共通化する
- 外部ライブラリの追加は必要性を明示的に説明できる場合のみ許可する
- 設定ファイル・環境変数は必要最小限に保つ

## Technology Constraints

本プロジェクトで使用する技術スタックとバージョンを固定する。

| レイヤー | 技術 | バージョン |
|---------|------|-----------|
| フレームワーク | Next.js (App Router) | 15.x |
| 言語 | TypeScript | 5.x |
| ランタイム | Node.js | 20.x |
| ORM | Prisma | 6.x |
| DB | PostgreSQL | 15+ |
| CSS | Tailwind CSS | 4.x |
| UI コンポーネント | shadcn/ui | latest |
| テーブル | TanStack Table | 8.x |
| フォーム | React Hook Form + Zod | latest |
| Unit/Integration テスト | Vitest | latest |
| E2E テスト | Playwright | latest |
| 開発 DB | Docker Compose | - |
| ホスティング | Vercel | - |
| 本番 DB | Supabase (PostgreSQL) | - |

- 上記以外のフレームワーク・ライブラリの追加は、
  原則 VII (Simplicity) に基づき正当化が必要
- CSS-in-JS ライブラリ（styled-components, emotion 等）は使用禁止
- 状態管理ライブラリ（Redux, Zustand 等）は使用禁止
  （Server Components + React 組み込み機能で対応）

## Development Workflow

開発フローと品質ゲートを定義する。

### ブランチ戦略

- ブランチ命名: `{number:3d}-{short-name}`（例: `001-goukon-web-app`）
- `main` ブランチへの直接コミットは禁止
- 機能ブランチからのマージは PR 経由で行う

### コード品質ゲート

- TypeScript コンパイルエラー: 0 件
- ESLint エラー: 0 件
- Vitest テスト: 全件パス
- Playwright E2E テスト: 全件パス（マージ前）

### ファイル命名規則

- コンポーネント: kebab-case (`event-form.tsx`, `event-table.tsx`)
- ユーティリティ・サービス: kebab-case (`event-id.ts`, `calculations.ts`)
- ルートファイル: Next.js 規約に準拠
  (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`)
- テストファイル: `*.test.ts` / `*.test.tsx`
- Prisma スキーマ: `prisma/schema.prisma`

### コミットメッセージ

- 形式: `type: description`
- type: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`
- 日本語・英語いずれも可

## Governance

本憲章はプロジェクトの最上位ガイドラインとして機能する。

- すべての設計判断・コードレビューは本憲章の原則に準拠する
- 憲章の改正には以下を必要とする:
  1. 改正理由の文書化
  2. 影響範囲の分析（Sync Impact Report）
  3. 関連テンプレート・ドキュメントへの反映
- バージョニングはセマンティックバージョニングに従う:
  - MAJOR: 原則の削除・再定義（後方互換性なし）
  - MINOR: 原則の追加・大幅な拡張
  - PATCH: 文言修正・明確化
- 開発時のランタイムガイダンスは `CLAUDE.md` を参照する

**Version**: 1.0.1 | **Ratified**: 2026-03-13 | **Last Amended**: 2026-03-13
