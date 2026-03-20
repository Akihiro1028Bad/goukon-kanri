# CLAUDE.md — goukon-kanri

## プロジェクト概要

合コン（合同コンパ）イベント管理 Web アプリ。既存の Google スプレッドシート（合コン管理スプレッドシート_v4）を Web 化するプロジェクト。

- 認証不要のシングルユーザーツール
- クラウドデプロイ（モバイル / タブレット対応）
- 憲章: `.specify/memory/constitution.md` (v1.0.1)

---

## ドメイン用語

| 用語 | 説明 |
|------|------|
| 合コン (Goukon) | 男女混合グループ交流イベント（合同コンパ） |
| イベントID | YYYY-MM-NNN 形式（例: 2025-02-001）。削除IDは再利用しない（単調増加） |
| Food back (CB) | 食べログ等の飲食店予約サイトからのキャッシュバック |
| マッチング件数 | イベント後のカップル成立数 |
| 見込み収入 | イベントの男女別標準参加費 × 人数（参加者個別参加費は使わない） |
| 決済済み収入 | 決済状況「済」の参加者の個別参加費の合計 |
| 論理削除 | isDeleted=true で表示から除外。データは保持し復元可能 |

---

## 技術スタック

| レイヤー | 技術 | バージョン |
|---------|------|-----------|
| フレームワーク | Next.js (App Router) | 16.x |
| 言語 | TypeScript (strict: true) | 5.x |
| ランタイム | Node.js | 20.x |
| ORM | Prisma + @prisma/adapter-pg | 6.x |
| DB | PostgreSQL | 15+ |
| 開発環境 | Docker Compose (port 5432 + テスト用 5433) | - |
| CSS | Tailwind CSS | 4.x |
| UI | shadcn/ui (Radix UI ベース) | latest |
| テーブル | TanStack Table | 8.x |
| フォーム | React Hook Form + Zod | latest |
| テスト | Vitest (unit/integration) + Playwright (E2E) | latest |
| ホスティング | Vercel (Serverless) | - |
| 本番 DB | Supabase (PostgreSQL + Supavisor) | - |

---

## アーキテクチャ（3 層構造）

```
プレゼンテーション層  src/app/ + src/components/
        ↓
ビジネスロジック層    src/actions/ (Server Actions)
                     src/queries/ (データ取得)
                     src/lib/    (計算・バリデーション・ユーティリティ)
        ↓
データ層             src/lib/prisma.ts + prisma/schema.prisma
```

### ディレクトリ構成

```
src/
├── app/                      # Next.js App Router（ページ）
│   ├── layout.tsx            # 共通レイアウト（<html lang="ja">）
│   ├── page.tsx              # ダッシュボード（/）
│   ├── loading.tsx           # 共通ローディング
│   ├── error.tsx             # 共通エラー境界
│   ├── not-found.tsx         # 404 ページ
│   ├── events/               # イベント CRUD
│   ├── participants/         # 参加者一覧（横断）
│   ├── reports/              # 収支レポート
│   └── schedule/             # スケジュール + LINE テキスト
├── actions/                  # Server Actions（"use server"）
│   ├── event-actions.ts
│   └── participant-actions.ts
├── queries/                  # データ取得関数（Server Component から呼出）
│   ├── event-queries.ts
│   ├── participant-queries.ts
│   └── dashboard-queries.ts
├── lib/                      # ビジネスロジック（フレームワーク非依存）
│   ├── prisma.ts             # Prisma クライアントシングルトン
│   ├── calculations.ts       # 収支計算ロジック
│   ├── event-id.ts           # イベントID 採番ロジック
│   ├── line-text.ts          # LINE 募集テキスト生成
│   └── validations.ts        # Zod バリデーションスキーマ
├── types/                    # 共有型定義
│   └── index.ts              # ActionResult, FinancialSummary 等
└── components/               # React コンポーネント
    ├── ui/                   # shadcn/ui（自動生成）
    ├── layout/               # ナビゲーション
    ├── events/               # イベント関連
    ├── participants/         # 参加者関連
    ├── dashboard/            # ダッシュボード
    ├── schedule/             # スケジュール
    └── reports/              # レポート
```

---

## コーディング規約

### Next.js App Router (Next.js 16)

- **Server Component がデフォルト**。`useState`/`useEffect`/`onClick` 等が必要な場合のみ `"use client"` を付与する
- **データ取得は Server Component 内で直接行う**（`src/queries/` の関数を呼び出す）
- **データ変更は Server Actions**（`"use server"`）で実装する。API Route は作成しない
- **キャッシュ無効化**: データ変更後は `revalidatePath()` で関連ページのキャッシュを無効化する
- **Suspense 境界**: 各ルートに `loading.tsx` / `error.tsx` / `not-found.tsx` を配置する
- **メタデータ**: 静的ページは `metadata` エクスポート、動的ページは `generateMetadata` で設定する

### TypeScript

- `strict: true` 必須、`any` 型禁止
- Zod スキーマの推論型 `z.infer<typeof schema>` を使用する
- Prisma 生成型をドメイン層の型として活用する（手動型定義の重複を避ける）
- Server Actions の戻り値は `ActionResult<T>` 判別共用体で統一する:
  ```typescript
  type ActionResult<T = void> =
    | { success: true; data: T }
    | { success: false; error: string };
  ```

### Prisma 6 (サーバーレス対応)

- **シングルトンパターン**: `src/lib/prisma.ts` で PrismaClient を一元管理する
- **本番環境**: `@prisma/adapter-pg` + `PrismaPg` でコネクション管理。`@vercel/functions` の `attachDatabasePool` を使用する
- **開発環境**: 標準の PrismaClient（グローバル変数で Hot Reload 対応）
- **previewFeatures**: `["driverAdapters"]` を generator に指定する
- **環境変数**: `DATABASE_URL`（Supavisor プーラー）と `DIRECT_URL`（マイグレーション用直接接続）を分離する
- **マイグレーション**: 本番は手動実行（`prisma migrate deploy`、DIRECT_URL 使用）

### Tailwind CSS 4 + shadcn/ui

- shadcn/ui コンポーネントを基盤として使用する（カスタム UI の前に既存コンポーネントを確認する）
- モバイルファーストで設計し、`md:` / `lg:` ブレークポイントで拡張する
- CSS-in-JS ライブラリ（styled-components 等）は使用禁止
- 状態管理ライブラリ（Redux, Zustand 等）は使用禁止

### テスト（TDD）

- **RED → GREEN → REFACTOR** サイクルを厳守する
- テストファイルは `tests/` ディレクトリに配置する:
  - `tests/unit/` — ビジネスロジック（Vitest、外部依存はモック）
  - `tests/integration/` — Server Actions + DB 操作（Vitest、テスト用 DB port 5433）
  - `tests/e2e/` — ユーザーフロー（Playwright）
- 命名: `*.test.ts` / `*.test.tsx`（unit/integration）、`*.spec.ts`（E2E）

### 言語

- **ドキュメント、コミットメッセージ、コードコメント、PR 説明文はすべて日本語で記述する**
- 変数名・関数名・ファイル名などコード上の識別子は英語（プログラミング慣例に従う）

---

## ファイル命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| コンポーネント | kebab-case | `event-form.tsx`, `event-table.tsx` |
| ユーティリティ | kebab-case | `event-id.ts`, `calculations.ts` |
| ルートファイル | Next.js 規約 | `page.tsx`, `layout.tsx`, `loading.tsx` |
| テスト | kebab-case + suffix | `event-id.test.ts`, `event-crud.spec.ts` |
| ブランチ | `{NNN}-{short-name}` | `001-goukon-web-app` |
| コミット | `type: description` | `feat: add event CRUD` |

---

## 開発環境

```bash
# DB 起動
docker compose up -d

# 開発サーバー
npm run dev          # http://localhost:3000

# テスト
npm run test:run     # ユニット + 統合テスト
npm run test:e2e     # E2E テスト

# DB 操作
npm run db:migrate   # マイグレーション実行
npm run db:studio    # Prisma Studio（DB ブラウザ）
npm run db:reset     # DB リセット
```

---

## 開発ワークフロー（Speckit）

```
/speckit.specify → /speckit.clarify → /speckit.plan → /speckit.tasks → /speckit.analyze → /speckit.implement
```

| フェーズ | コマンド | 出力ファイル |
|---------|---------|-------------|
| 仕様作成 | `/speckit.specify` | `specs/<branch>/spec.md` |
| 仕様確認 | `/speckit.clarify` | `specs/<branch>/spec.md`（更新） |
| 実装計画 | `/speckit.plan` | `specs/<branch>/plan.md` |
| タスク生成 | `/speckit.tasks` | `specs/<branch>/tasks.md` |
| 整合性分析 | `/speckit.analyze` | レポート出力（ファイル変更なし） |
| 実装 | `/speckit.implement` | 実装コード |

---

## 現在のアクティブ機能

| 項目 | 値 |
|------|----|
| Branch | `001-goukon-web-app` |
| Spec | 完了 (`specs/001-goukon-web-app/spec.md`) |
| Plan | 完了 (`specs/001-goukon-web-app/plan.md`) |
| Tasks | 完了 (`specs/001-goukon-web-app/tasks.md`) — 91 タスク |
| Analyze | 完了（CRITICAL/HIGH 0 件） |
| 次のステップ | `/speckit.implement` |

---

## 設計ドキュメント

```
specs/001-goukon-web-app/
├── spec.md           # 機能仕様（21 FR, 6 SC, 4 User Stories）
├── plan.md           # 実装計画 + 本番デプロイ設計
├── tasks.md          # 91 タスク（TDD + Chrome MCP 確認）
├── data-model.md     # Prisma スキーマ + 計算ロジック
├── research.md       # 技術選定リサーチ
├── quickstart.md     # 開発環境構築 + デプロイ手順
├── test-cases.md     # 147 テストケース
└── contracts/
    └── api.md        # Server Actions / クエリ契約
```

---

## 重要な設計判断

- **認証なし**: V1 はシングルユーザーツール。URL を知っていれば誰でもアクセス可能（割り切り）
- **Last-write-wins**: 複数タブでの同時編集は最終書き込みが優先される
- **見込み収入の計算**: イベントの男女別標準レート × 人数（参加者個別参加費は決済済み収入にのみ使用）
- **オンライン専用**: PWA / オフラインサポートはスコープ外
- **年度 = 暦年**: 1 月〜12 月（会計年度ではない）

## Active Technologies
- YAML（GitHub Actions ワークフロー定義） + `anthropics/claude-code-action@v1`, Claude Code GitHub App (`https://github.com/apps/claude`) (002-claude-github-actions)
- N/A（DB変更なし） (002-claude-github-actions)

## Recent Changes
- 002-claude-github-actions: Added YAML（GitHub Actions ワークフロー定義） + `anthropics/claude-code-action@v1`, Claude Code GitHub App (`https://github.com/apps/claude`)
