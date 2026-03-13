# CLAUDE.md — goukon-kanri

## プロジェクト概要

合コン（合同コンパ）イベント管理 Web アプリ。既存の Google スプレッドシート（合コン管理スプレッドシート_v4）を Web 化するプロジェクト。

- 認証不要のシングルユーザーツール
- クラウドデプロイ（モバイル / タブレット対応）

---

## ドメイン用語

| 用語 | 説明 |
|------|------|
| 合コン (Goukon) | 男女混合グループ交流イベント（合同コンパ） |
| 主幹事 (Admin) | メイン幹事、全権限あり |
| 幹事 (Editor) | 担当イベントを編集可能 |
| 閲覧者 (Viewer) | 読み取り専用（将来拡張） |
| イベントID | YYYY-MM-NNN 形式（例: 2025-02-001）。削除IDは再利用しない |
| Food back (CB) | 食べログ等の飲食店予約サイトからのキャッシュバック |
| マッチング件数 | イベント後のカップル成立数 |

---

## 開発ワークフロー（Speckit）

```
/speckit.specify → /speckit.clarify → /speckit.plan → /speckit.tasks → /speckit.implement
```

### フェーズごとの成果物

| フェーズ | コマンド | 出力ファイル |
|---------|---------|-------------|
| 仕様作成 | `/speckit.specify` | `specs/<branch>/spec.md` |
| 仕様確認 | `/speckit.clarify` | `specs/<branch>/spec.md`（更新） |
| 実装計画 | `/speckit.plan` | `specs/<branch>/plan.md` |
| タスク生成 | `/speckit.tasks` | `specs/<branch>/tasks.md` |
| 実装 | `/speckit.implement` | 実装コード |

---

## ファイル構成

```
goukon-kanri/
├── specs/
│   └── <branch-name>/
│       ├── spec.md        # 機能仕様
│       ├── plan.md        # 実装計画（planning 後）
│       └── tasks.md       # タスク一覧（tasks 後）
├── .specify/
│   ├── templates/         # 各種テンプレート
│   └── scripts/           # Speckit スクリプト
└── .claude/
    └── commands/          # Speckit コマンド定義
```

---

## 現在のアクティブ機能

| 項目 | 値 |
|------|----|
| Branch | `001-goukon-web-app` |
| Spec | 完了 (`specs/001-goukon-web-app/spec.md`) |
| Plan | 完了 (`specs/001-goukon-web-app/plan.md`) |
| 次のステップ | `/speckit.tasks` |

---

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フレームワーク | Next.js 15 (App Router) |
| 言語 | TypeScript 5.x |
| ORM | Prisma 6.x |
| データベース | PostgreSQL 15+ |
| 開発環境 | Docker Compose (PostgreSQL コンテナ) |
| CSS | Tailwind CSS 4.x |
| UI | shadcn/ui |
| テーブル | TanStack Table 8.x |
| フォーム | React Hook Form + Zod |
| テスト | Vitest + Playwright |
| デプロイ | Vercel + Supabase |

---

## 命名規則

- **ブランチ**: `{number:3d}-{short-name}`（例: `001-goukon-web-app`）
- **イベントID**: `YYYY-MM-NNN`（削除IDは再利用しない）

## Active Technologies
- TypeScript 5.x / Node.js 20.x (001-goukon-web-app)
- PostgreSQL 15+ (開発: docker-compose / 本番: Supabase) (001-goukon-web-app)

## Recent Changes
- 001-goukon-web-app: Added TypeScript 5.x / Node.js 20.x
