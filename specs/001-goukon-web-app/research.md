# Research: 合コン管理 Webアプリケーション

**Date**: 2026-03-12
**Branch**: `001-goukon-web-app`

---

## 1. フレームワーク選定

### Decision: Next.js 15 (App Router)

### Rationale

- **Server Components + Server Actions** により、API ルートを別途作成する必要がなく、フォーム送信→DB操作→UI再描画のフローをファイル1つで完結できる
- React エコシステム（shadcn/ui, React Hook Form, TanStack Table）の全コンポーネントがそのまま使える
- **App Router** は Next.js の標準ルーティング方式であり、ファイルベースルーティング（`app/events/page.tsx` → `/events`）で初級エンジニアにも直感的
- Vercel へのデプロイがゼロコンフィグ（`git push` だけでデプロイ完了）
- 日本語の情報量が最も多い（公式ドキュメント日本語版あり）

### Alternatives Considered

| 選択肢 | 却下理由 |
|--------|---------|
| Remix | Server Actions 登場後に Next.js との差が縮小。エコシステム（UIコンポーネント等）が Next.js より小さく、初級エンジニア向けの情報が少ない |
| SvelteKit | Svelte 自体の学習コストが追加で発生する。React 系の UI ライブラリ（shadcn/ui 等）が使えない |
| Pages Router (Next.js) | App Router が Next.js の推奨方式。getServerSideProps 等の旧パターンは非推奨方向 |

---

## 2. ORM 選定

### Decision: Prisma（v6 系）

### Rationale

- **スキーマファースト設計**: `schema.prisma` に日本語コメント付きでモデルを定義 → `npx prisma generate` で型安全なクライアントが自動生成される
- **マイグレーション管理**: `npx prisma migrate dev` で DB スキーマの変更を追跡。初級エンジニアが SQL を直接書かなくてもテーブル作成・変更が可能
- **Prisma Studio**: ブラウザベースの DB 管理 GUI が付属。デバッグ時にデータを視覚的に確認できる
- **TypeScript 型安全**: クエリ結果が自動的に型付けされ、IDE の補完が効く
- **ドキュメントの質**: 公式ドキュメントが非常に充実しており、初級エンジニアでも迷わない

### Alternatives Considered

| 選択肢 | 却下理由 |
|--------|---------|
| Drizzle ORM | SQLite/Turso との統合は優秀だが、ドキュメントの量・質が Prisma に劣る。初級エンジニアが「迷わない」基準で Prisma が優位 |
| Kysely | タイプセーフな SQL ビルダーだが、マイグレーション管理が別途必要。学習コストが高い |
| 素の SQL (better-sqlite3) | 型安全性なし。SQL を直接書く必要がありエラーが起きやすい |

---

## 3. データベース選定

### Decision: PostgreSQL（Supabase 無料プラン）

### Rationale

- **Supabase 無料プラン**: 500MB ストレージ、50,000 行制限なし、月間アクティブユーザー制限なしで本プロジェクトの規模（年間100イベント・1,000参加者）に十分
- **Prisma との相性**: Prisma + PostgreSQL は最も広く使われている組み合わせで、ドキュメント・チュートリアルが豊富
- **Vercel との統合**: Vercel から Supabase への接続は公式ガイドがある（接続プーリング via Supavisor 対応済み）
- **サーバーレス対応**: Supabase は接続プーリングを提供しており、Vercel のサーバーレス環境でのコネクション枯渇問題を回避できる
- **将来の拡張性**: SQLite → PostgreSQL への移行は困難だが、PostgreSQL なら将来機能追加しても対応可能

### SQLite が不採用の理由

| SQLite デプロイ方式 | 問題点 |
|--------------------|--------|
| ファイルベース SQLite on Vercel | Vercel はサーバーレスのためファイルシステムが永続化されない。デプロイのたびにデータが消える |
| Turso (LibSQL) | Drizzle との組み合わせは良好だが、Prisma との Turso 統合はアダプター（`@prisma/adapter-libsql`）経由で設定が複雑 |
| LiteFS on Fly.io | Fly.io の永続ボリューム + LiteFS で動作するが、Fly.io 自体の学習コストが Vercel より高い |
| SQLite on Railway | Railway は永続ボリュームをサポートするが、SQLite の WAL モード + サーバーレスの組み合わせに注意が必要 |

### Alternatives Considered

| 選択肢 | 却下理由 |
|--------|---------|
| Turso (LibSQL) | Prisma アダプター経由の設定が複雑。Drizzle を選ぶなら有力だが、Prisma 採用のため不採用 |
| Neon (PostgreSQL) | Supabase と同等の選択肢。無料プランの制限が Supabase よりやや厳しい（コンピュート時間制限） |
| PlanetScale (MySQL) | 無料プランが廃止された |
| Vercel Postgres | 内部的に Neon だが、Supabase の方が無料枠が大きい |

---

## 4. UI コンポーネントライブラリ選定

### Decision: shadcn/ui + Tailwind CSS v4

### Rationale

- **コピー&ペーストモデル**: npm パッケージではなく、コンポーネントのソースコードをプロジェクトにコピーする方式。カスタマイズが容易で、「中身がブラックボックス」にならない
- **Radix UI ベース**: アクセシビリティ対応済みのヘッドレス UI プリミティブ（Dialog, Select, Popover 等）を使用
- **データテーブル**: TanStack Table と統合した DataTable コンポーネントが公式ドキュメントで提供されている（ソート・フィルタ・ページネーション対応）
- **フォームコンポーネント**: React Hook Form + Zod と統合した Form コンポーネントが公式提供
- **日本語テキスト**: Tailwind CSS のユーティリティクラスでフォントサイズ・行間を微調整可能。日本語の表示に問題なし

### 主要コンポーネントの用途マッピング

| shadcn/ui コンポーネント | 本アプリでの用途 |
|------------------------|----------------|
| DataTable | イベント一覧、参加者一覧、収支レポート、スケジュール一覧 |
| Dialog | LINE テキストプレビューモーダル、削除確認ダイアログ |
| Form + Input | イベント登録・編集フォーム、参加者登録フォーム |
| Select | 状態選択（開催予定/開催済/キャンセル）、年度選択、エリア選択 |
| Switch / Toggle | 「削除済みを表示」トグル |
| Badge | 状態ラベル表示、決済状況表示 |
| Card | ダッシュボード月別サマリーテーブルのラッパー |
| Toast (Sonner) | クリップボードコピー成功通知、保存成功通知 |
| Button | 各種アクションボタン |
| Checkbox | 一括決済更新時の参加者選択 |
| Calendar / DatePicker | イベント日付選択 |

### Alternatives Considered

| 選択肢 | 却下理由 |
|--------|---------|
| Material UI (MUI) | バンドルサイズが大きく、デザインの自由度が低い。日本語UIでのカスタマイズに手間がかかる |
| Ant Design | 中国語圏発で日本語情報が少ない。重量級 |
| Chakra UI | shadcn/ui より抽象度が高く、カスタマイズ時にオーバーライドが必要 |
| Mantine | 良い選択肢だが shadcn/ui の方がエコシステムが大きい |

---

## 5. フォーム管理・バリデーション

### Decision: React Hook Form + Zod

### Rationale

- **React Hook Form**: 非制御コンポーネントベースで高パフォーマンス。shadcn/ui の Form コンポーネントと公式統合
- **Zod**: TypeScript ネイティブのスキーマバリデーション。Prisma のモデルと一致するバリデーションスキーマを定義可能
- **Server Actions との統合**: Zod スキーマをサーバー側でも共用してバリデーション実行可能

### 実装パターン（参考）

```typescript
// バリデーションスキーマの例（イベント登録）
import { z } from "zod";

export const eventFormSchema = z.object({
  date: z.coerce.date({ required_error: "日付は必須です" }),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM形式で入力してください"),
  venueName: z.string().min(1, "会場名は必須です").max(100),
  mapUrl: z.string().url("正しいURLを入力してください").optional().or(z.literal("")),
  organizer: z.string().max(50).optional(),
  area: z.string().min(1, "エリアは必須です"),
  maleCapacity: z.coerce.number().int().min(0, "0以上の整数を入力"),
  femaleCapacity: z.coerce.number().int().min(0, "0以上の整数を入力"),
  maleFee: z.coerce.number().int().min(0, "0以上の整数を入力"),
  femaleFee: z.coerce.number().int().min(0, "0以上の整数を入力"),
  theme: z.string().max(100).optional(),
  targetOccupation: z.string().max(100).optional(),
  status: z.enum(["scheduled", "completed", "cancelled"]),
  venueCost: z.coerce.number().int().min(0).default(0),
  matchCount: z.coerce.number().int().min(0).default(0),
  expectedCashback: z.coerce.number().int().min(0).default(0),
  actualCashback: z.coerce.number().int().min(0).default(0),
  memo: z.string().max(1000).optional(),
});
```

---

## 6. テスティング戦略

### Decision: Vitest（ユニット / 統合）+ Playwright（E2E）

### Rationale

- **Vitest**: Vite ベースで高速。Jest 互換 API で学習コスト低。Next.js の `next/vitest` プラグインで Server Components のテストに対応
- **Playwright**: クロスブラウザ E2E テスト。Codegen 機能で操作を記録してテストコードを自動生成でき、初級エンジニアに優しい
- **テスト戦略**: ユニットテスト（計算ロジック） → 統合テスト（Server Actions + DB） → E2E テスト（ユーザーフロー）の3層構造

### テストの優先順位

| 種類 | 対象 | 優先度 |
|------|------|--------|
| ユニットテスト | FR-011 収支計算ロジック、FR-001 イベントID採番ロジック、LINE テキスト生成ロジック | **最高**（計算の正確性が SC-004 で100%一致を要求） |
| 統合テスト | Server Actions（イベント CRUD、参加者 CRUD、決済更新） | 高 |
| E2E テスト | 主要ユーザーフロー（イベント登録→参加者追加→決済更新→ダッシュボード確認） | 中 |

---

## 7. 開発環境 + デプロイ環境

### Decision: Docker Compose（開発）+ Vercel + Supabase（本番）

### Rationale

- **Docker Compose（開発環境）**: PostgreSQL をコンテナで起動。ローカル環境に PostgreSQL を直接インストールする必要がなく、`docker compose up -d db` の1コマンドで DB が準備完了。テスト用 DB も別コンテナ（ポート 5433）で分離し、テスト実行が本番データに影響しない
- **Next.js はホストで実行**: Hot Reload の DX を維持するため、Next.js アプリは Docker コンテナ化せずホスト上で `npm run dev` を実行する
- **Vercel（本番）**: Next.js の開発元。`git push` だけでプレビュー環境＆本番デプロイが完了。無料プランで個人プロジェクトに十分
- **Supabase（本番 DB）**: 無料 PostgreSQL ホスティング。管理画面でテーブルの中身を確認でき、デバッグに便利
- **合計コスト**: $0/月（無料プラン範囲内）

### 環境構成

```
[開発環境]
  Next.js (ホスト)  ──→  PostgreSQL (docker-compose: port 5432)
  Vitest            ──→  PostgreSQL (docker-compose: port 5433, テスト用)

[本番環境]
  開発者 → git push → GitHub → Vercel 自動ビルド → https://goukon-kanri.vercel.app
                                      ↓
                                Supabase PostgreSQL
```

### Alternatives Considered

| 選択肢 | 却下理由 |
|--------|---------|
| 全コンテナ化（Next.js + DB を Docker 内で実行） | Hot Reload が遅くなる。ファイル変更の検知にボリュームマウントが必要で、macOS の場合特にパフォーマンスが低下する |
| ローカル PostgreSQL 直接インストール | 環境差異が生じやすい。チーム参加時のオンボーディングコストが高い |
| Supabase を開発環境でも使用 | ネットワーク遅延で開発体験が低下。無料プランの DB は1つのみ（テスト用 DB を分離できない） |

---

## 8. プロジェクト初期化コマンド

### Decision: `create-next-app` + 手動セットアップ

```bash
# 1. Next.js プロジェクト作成
npx create-next-app@latest goukon-kanri \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

# 2. 主要依存パッケージ
npm install prisma @prisma/client          # ORM
npm install zod                            # バリデーション
npm install react-hook-form @hookform/resolvers  # フォーム管理
npm install @tanstack/react-table          # データテーブル
npm install sonner                         # Toast通知
npm install date-fns                       # 日付操作

# 3. 開発用依存パッケージ
npm install -D vitest @vitejs/plugin-react  # テスト
npm install -D playwright @playwright/test  # E2E テスト

# 4. shadcn/ui 初期化
npx shadcn@latest init

# 5. shadcn/ui コンポーネント追加
npx shadcn@latest add button card dialog form input select \
  table badge switch checkbox calendar popover separator \
  dropdown-menu toast tabs
```

---

## 9. 技術スタック最終サマリー

| レイヤー | 技術 | バージョン |
|---------|------|-----------|
| フレームワーク | Next.js (App Router) | 15.x |
| 言語 | TypeScript | 5.x |
| ORM | Prisma | 6.x |
| データベース | PostgreSQL | 15+ |
| 開発環境 | Docker Compose | v2+ |
| CSS | Tailwind CSS | 4.x |
| UI コンポーネント | shadcn/ui | latest |
| データテーブル | TanStack Table | 8.x |
| フォーム | React Hook Form | 7.x |
| バリデーション | Zod | 3.x |
| 日付操作 | date-fns | 4.x |
| 通知 | Sonner | latest |
| テスト（ユニット） | Vitest | 3.x |
| テスト（E2E） | Playwright | latest |
| デプロイ | Vercel | - |
| DB ホスティング（本番） | Supabase | - |
| DB（開発） | Docker Compose + PostgreSQL 15 | - |
| パッケージマネージャ | npm | 10.x |
