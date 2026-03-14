# Tasks: 合コン管理 Webアプリケーション

**Input**: Design documents from `/specs/001-goukon-web-app/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/api.md, quickstart.md, test-cases.md, research.md
**Approach**: TDD（テスト駆動開発）— 各機能のテストを先に書き、テストが失敗することを確認してから実装する

**Tests**: TDD アプローチのため、全テストタスクを含む（147 テストケース）

**Organization**: タスクはユーザーストーリー単位でグループ化。各ストーリーは独立して実装・テスト可能。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（異なるファイル、依存関係なし）
- **[Story]**: 所属ユーザーストーリー（US1, US2, US3, US4）
- 全タスクにファイルパスを明記

---

## Phase 1: Setup（プロジェクト初期化）

**Purpose**: Next.js プロジェクトの作成と開発環境の構築。全機能の土台となる。

- [x] T001 Next.js プロジェクトを作成する。`npx create-next-app@latest goukon-kanri --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"` を実行する。完了後、`npm run dev` で http://localhost:3000 にアクセスしてデフォルトページが表示されることを確認する

- [x] T002 本番用の依存パッケージをインストールする。`npm install prisma @prisma/client pg @prisma/adapter-pg @vercel/functions zod react-hook-form @hookform/resolvers @tanstack/react-table sonner date-fns` を実行する。package.json に全パッケージが追加されたことを確認する

- [x] T003 開発用の依存パッケージをインストールする。`npm install -D @types/pg vitest @vitejs/plugin-react playwright @playwright/test` を実行する。package.json の devDependencies に全パッケージが追加されたことを確認する

- [x] T004 docker-compose.yml をプロジェクトルートに作成する。quickstart.md セクション 3.1 の定義をそのまま使用する。開発用 PostgreSQL（port 5432）とテスト用 PostgreSQL（port 5433）の2つのサービスを定義する。作成後、`docker compose up -d` で両コンテナが healthy になることを確認する

- [x] T005 環境変数テンプレート `.env.example` をプロジェクトルートに作成する。plan.md の「環境変数ファイル（更新版）」セクションの内容をそのまま使用する。開発環境用の `DATABASE_URL` と `DIRECT_URL`、テスト環境用の `DATABASE_URL_TEST`（コメントアウト）、本番環境用（コメントアウト）の3ブロックを含める。作成後、`cp .env.example .env` で `.env` ファイルを生成する

- [x] T006 Prisma を初期化する。`npx prisma init` を実行する。生成された `prisma/schema.prisma` を data-model.md の Prisma スキーマ定義で置き換える。**重要**: `generator client` に `previewFeatures = ["driverAdapters"]` を含めること。`datasource db` に `directUrl = env("DIRECT_URL")` を含めること。Event モデルに `@@index([date, status])` を追加し、Participant モデルに `@@index([eventId])` と `@@index([name])` を追加する（data-model.md のインデックス設計セクション参照）

- [x] T007 Prisma マイグレーションを実行する。`docker compose up -d db` で開発用 DB が起動していることを確認後、`npx prisma migrate dev --name init` を実行する。マイグレーションが成功したら `npx prisma studio` でブラウザから events テーブルと participants テーブルが作成されていることを確認する

- [x] T008 テスト用 DB にマイグレーションを適用する。`docker compose up -d db-test` でテスト用 DB を起動し、`DATABASE_URL="postgresql://postgres:postgres@localhost:5433/goukon_kanri_test" npx prisma migrate deploy` を実行する

- [x] T009 shadcn/ui を初期化する。`npx shadcn@latest init` を実行する（対話形式の質問にはデフォルトで回答）。次に、必要なコンポーネントを追加する: `npx shadcn@latest add button card dialog form input select table badge switch checkbox calendar popover separator dropdown-menu tabs`。`src/components/ui/` ディレクトリにコンポーネントファイルが生成されたことを確認する

- [x] T010 Vitest の設定ファイル `vitest.config.ts` をプロジェクトルートに作成する。quickstart.md セクション 8 の設定をそのまま使用する。`@` エイリアスを `./src` に解決する設定を含める

- [x] T011 package.json にスクリプトを追加する。quickstart.md セクション 8 の scripts をそのまま使用する。`dev`, `build`, `start`, `lint`, `test`, `test:run`, `test:e2e`, `db:up`, `db:down`, `db:reset`, `db:studio`, `db:migrate`, `db:test:up`, `db:test:migrate` の全スクリプトを追加する

- [x] T012 ソースコードのディレクトリ構造を作成する。quickstart.md セクション 6 のコマンドを実行して、以下のディレクトリを作成する: `src/app/events/new`, `src/app/events/[id]/edit`, `src/app/participants`, `src/app/reports`, `src/app/schedule`, `src/lib`, `src/actions`, `src/queries`, `src/types`, `src/components/events`, `src/components/participants`, `src/components/dashboard`, `src/components/schedule`, `src/components/reports`, `src/components/layout`

- [x] T013 テストファイル用のディレクトリ構造を作成する。`mkdir -p tests/unit tests/integration tests/e2e` を実行する

**Checkpoint**: `npm run dev` でエラーなく起動し、`npm run test:run` で Vitest が実行できること（テストファイルなしの状態で OK）

---

## Phase 2: Foundational（基盤構築）

**Purpose**: 全ユーザーストーリーで共通して使用する型定義、Prisma クライアント、バリデーションスキーマ、共通レイアウトを作成する。

**⚠️ CRITICAL**: この Phase が完了するまで、ユーザーストーリーの実装に着手してはならない。

- [x] T014 共通型定義ファイル `src/types/index.ts` を作成する。contracts/api.md の「共通型定義」セクションの内容をそのまま使用する。`ActionResult<T>` 型、`EVENT_STATUS_LABELS`、`GENDER_LABELS`、`PAYMENT_STATUS_LABELS`、`FinancialSummary` 型、`MonthlySummaryRow` 型を定義する

- [x] T015 Prisma クライアントシングルトン `src/lib/prisma.ts` を作成する。plan.md の「Prisma クライアント（サーバーレス対応）」セクションの実装をそのまま使用する。開発環境では標準の PrismaClient、本番環境では `@prisma/adapter-pg` + `@vercel/functions` の `attachDatabasePool` を使用する

- [x] T016 [P] Zod バリデーションスキーマ `src/lib/validations.ts` を作成する。contracts/api.md の「Zod バリデーションスキーマ」セクションの内容をそのまま使用する。`eventFormSchema`、`participantFormSchema`、`bulkPaymentSchema` の3つのスキーマを定義する

- [x] T017 [P] 共通レイアウト `src/app/layout.tsx` を作成する。quickstart.md セクション 7.3 の実装をそのまま使用する。`<html lang="ja">` でラップし、`<Navigation />` コンポーネントと `<Toaster>` を配置する

- [x] T018 [P] サイドバーナビゲーションコンポーネント `src/components/layout/navigation.tsx` を作成する。quickstart.md セクション 7.3 の実装をそのまま使用する。`"use client"` を指定し、ダッシュボード、イベント一覧、参加者一覧、スケジュール、収支レポートの5つのナビゲーションリンクを含める。現在のパスに応じてアクティブ状態を表示する

- [x] T019 全ページの空のプレースホルダーを作成する。以下の各ファイルに「ページ名 + 準備中」のみを表示する最小限の Server Component を作成する: `src/app/page.tsx`（ダッシュボード）, `src/app/events/page.tsx`（イベント一覧）, `src/app/events/new/page.tsx`（イベント新規登録）, `src/app/events/[id]/page.tsx`（イベント詳細）, `src/app/events/[id]/edit/page.tsx`（イベント編集）, `src/app/participants/page.tsx`（参加者一覧）, `src/app/reports/page.tsx`（収支レポート）, `src/app/schedule/page.tsx`（スケジュール）。作成後、`npm run dev` で各 URL にアクセスしてページ名が表示されることを確認する

- [x] T019a [P] Suspense 境界ファイルを作成する。憲章 Principle I に従い、以下のファイルを作成する:
  - `src/app/loading.tsx`: 共通ローディング UI（shadcn/ui の Skeleton または「読み込み中...」テキスト）を表示する
  - `src/app/error.tsx`: `"use client"` を指定し、エラーメッセージと「再試行」ボタンを表示する Error Boundary。props として `error: Error` と `reset: () => void` を受け取る
  - `src/app/not-found.tsx`: 「ページが見つかりません」メッセージとダッシュボードへのリンクを表示する
  - `src/app/events/loading.tsx`: イベント一覧用のローディング UI
  - `src/app/events/[id]/loading.tsx`: イベント詳細用のローディング UI
  - `src/app/events/[id]/not-found.tsx`: 「イベントが見つかりません」メッセージを表示する

- [x] T019b [P] 各ページに `generateMetadata` を設定する。憲章 Principle I に従い、以下のページに metadata を追加する:
  - `src/app/layout.tsx`: `metadata` エクスポートでサイトタイトル「合コン管理」とデフォルト description を設定する
  - `src/app/events/page.tsx`: title「イベント一覧」
  - `src/app/events/new/page.tsx`: title「イベント新規登録」
  - `src/app/events/[id]/page.tsx`: `generateMetadata` でイベントIDを含む動的タイトル（例: 「イベント 2025-02-001」）
  - `src/app/events/[id]/edit/page.tsx`: `generateMetadata` でイベントIDを含む動的タイトル（例: 「イベント編集 2025-02-001」）
  - `src/app/participants/page.tsx`: title「参加者一覧」
  - `src/app/reports/page.tsx`: title「収支レポート」
  - `src/app/schedule/page.tsx`: title「スケジュール」

**Checkpoint**: `npm run dev` で全ページにアクセス可能。サイドバーナビゲーションで画面遷移できること。`npm run build` がエラーなく完了すること。ブラウザのタブに各ページのタイトルが表示されること

### 🔍 Chrome MCP 動作確認

- [x] T019c Chrome DevTools MCP を使って Phase 2 の動作を確認する。`npm run dev` でアプリを起動した状態で、以下の操作を MCP ツールで実行する:
  1. `navigate_page` で `http://localhost:3000` にアクセスし、`take_screenshot` でダッシュボードのプレースホルダーが表示されることを確認する
  2. `click` でサイドバーの「イベント一覧」リンクをクリックし、`/events` に遷移することを確認する。`take_screenshot` で画面をキャプチャする
  3. 同様にサイドバーの「参加者一覧」「スケジュール」「収支レポート」の各リンクをクリックし、各ページに遷移できることを確認する
  4. `navigate_page` で存在しないURL（例: `http://localhost:3000/nonexistent`）にアクセスし、not-found ページが表示されることを確認する
  5. 各ページのブラウザタブタイトルが正しく設定されていることを確認する

---

## Phase 3: User Story 1 — イベント登録・管理 (Priority: P1) 🎯 MVP

**Goal**: イベントの新規登録・一覧表示・詳細表示・編集・論理削除/復元ができる。イベント ID は YYYY-MM-NNN 形式で自動採番される。

**Independent Test**: イベント登録画面からイベントを登録し、一覧画面に表示されること。編集・削除・復元が正常に動作すること。

**対応 FR**: FR-001, FR-002, FR-003, FR-004, FR-005

### TDD Step 1: ユニットテストを先に書く（RED）

> **テストを書いて実行し、全て FAIL（赤）になることを確認してから実装に進む**

- [x] T020 [P] [US1] イベント ID 採番ロジックのユニットテスト `tests/unit/event-id.test.ts` を作成する。test-cases.md セクション 1.2 の EVID-001〜EVID-012 の全 12 ケースを実装する。テスト対象は `src/lib/event-id.ts` の `generateEventId()` 関数。Prisma クライアントはモックする（`vi.mock` 使用）。テストケースの例: (1) 当月初のイベントで "2025-02-001" が返ること (2) 論理削除済み ID を含む最大値から採番すること (3) NNN=100 超でも正常に採番すること。**実行して全テストが FAIL することを確認する**

- [x] T021 [P] [US1] イベントフォームバリデーションのユニットテスト `tests/unit/validations.test.ts` を作成する。test-cases.md セクション 1.4 の VAL-E001〜VAL-E017 の全 17 ケースを実装する。テスト対象は `src/lib/validations.ts` の `eventFormSchema`。テストケースの例: (1) 全必須フィールド入力で success (2) 日付未入力でエラー (3) 時刻フォーマット不正でエラー (4) 会場名 100 文字超でエラー (5) 空文字の mapUrl が null に変換されること。**実行して全テストが FAIL することを確認する**（注: validations.ts は T016 で作成済みなので、一部のテストは PASS する可能性がある。PASS するテストはそのままで OK）

### TDD Step 2: ビジネスロジック実装（GREEN）

- [x] T022 [US1] イベント ID 採番ロジック `src/lib/event-id.ts` を実装する。data-model.md の「イベントID 採番ロジック」セクションの実装をベースにする。引数として PrismaClient インスタンスとイベント日付（Date）を受け取り、YYYY-MM-NNN 形式の文字列を返す。**重要なルール**: (1) 論理削除済みイベントも含めて当月の最大連番を取得する (2) 欠番は再利用しない（単調増加） (3) NNN は 3 桁ゼロ埋め（100 以上にも対応）。実装後、`npm run test:run tests/unit/event-id.test.ts` で EVID-001〜012 の全 12 テストが PASS（緑）になることを確認する

### TDD Step 3: 統合テストを先に書く（RED）

- [x] T023 [US1] イベント Server Actions の統合テスト `tests/integration/event-actions.test.ts` を作成する。test-cases.md セクション 2.1 の INT-E001〜INT-E013 の全 13 ケースを実装する。テスト用 DB（port 5433）に接続する。各テストの前後でデータをクリーンアップする `beforeEach` / `afterEach` を設定する。テストケースの例: (1) createEvent で eventId が YYYY-MM-NNN 形式で返ること (2) 不正な FormData でバリデーションエラー (3) 同月 2 件目の登録で NNN=002 (4) deleteEvent でイベントと参加者が論理削除 (5) restoreEvent で復元。**実行して全テストが FAIL することを確認する**

- [x] T024 [P] [US1] イベントデータ取得関数の統合テスト `tests/integration/queries.test.ts` を作成する。test-cases.md セクション 2.3 の INT-Q001〜INT-Q006（イベント一覧関連）を実装する。テストケースの例: (1) getEvents で年度フィルタ (2) 月フィルタ (3) 状態フィルタ (4) 論理削除除外/含む (5) 日付降順ソート。**実行して全テストが FAIL することを確認する**

### TDD Step 4: Server Actions & クエリ実装（GREEN）

- [x] T025 [US1] イベントデータ取得関数 `src/queries/event-queries.ts` を実装する。contracts/api.md の「イベント関連」セクションの契約に従う。`getEvents()` 関数を実装する: 引数として year（必須）、month（任意）、status（任意）、includeDeleted（デフォルト false）、sortBy（デフォルト "date"）、sortOrder（デフォルト "desc"）を受け取る。Prisma の `findMany` で条件付きクエリを実行する。戻り値は `EventWithSummary[]` 型（イベント情報 + 収支サマリー）。**注意**: 収支サマリーの計算は calculations.ts に委譲するが、この時点ではまだ実装していないため、ダミー値（全て 0）を返す。後の Phase で差し替える

- [x] T026 [US1] `getEventDetail()` 関数を `src/queries/event-queries.ts` に追加する。eventId（YYYY-MM-NNN 形式）を受け取り、イベント情報 + 参加者一覧 + 収支サマリーを返す。Prisma の `findUnique` で `include: { participants: true }` を指定する。イベントが見つからない場合は null を返す

- [x] T027 [US1] イベント Server Actions `src/actions/event-actions.ts` を実装する。contracts/api.md の契約に従い、以下の 4 つの関数を実装する。ファイル先頭に `"use server";` を記述する:
  - `createEvent(formData: FormData)`: Zod でバリデーション → generateEventId() で ID 採番 → prisma.event.create() で DB 保存 → revalidatePath("/events") と revalidatePath("/") でキャッシュ無効化 → ActionResult<{ eventId }> を返す
  - `updateEvent(eventId: string, formData: FormData)`: Zod でバリデーション → prisma.event.update() で更新 → revalidatePath でキャッシュ無効化
  - `deleteEvent(eventId: string)`: prisma.$transaction 内でイベントと紐付く全参加者の isDeleted を true に設定 → revalidatePath でキャッシュ無効化
  - `restoreEvent(eventId: string)`: prisma.$transaction 内でイベントと紐付く全参加者の isDeleted を false に設定 → revalidatePath でキャッシュ無効化

- [x] T028 [US1] 統合テストが PASS することを確認する。`npm run test:run tests/integration/event-actions.test.ts` と `npm run test:run tests/integration/queries.test.ts`（イベント関連テストのみ）を実行し、全テストが PASS（緑）になることを確認する。FAIL するテストがあれば実装を修正する

### TDD Step 5: UI コンポーネント実装

- [x] T029 [P] [US1] イベント登録/編集フォームコンポーネント `src/components/events/event-form.tsx` を作成する。plan.md の「フォームの実装パターン」セクションの実装をベースにする。`"use client"` を指定する。React Hook Form + Zod の zodResolver を使用する。フォームフィールド: 日付（date input）、開始時刻（time input）、会場名（text input）、マップ URL（url input、任意）、担当者（text input、任意）、エリア（text input）、男女別募集定員（number input × 2、横並び）、男女別参加費（number input × 2、横並び）、テーマ（text input、任意）、対象職業（text input、任意）、状態（Select: 開催予定/開催済/キャンセル）、会場費（number input）、マッチング件数（number input）、予定 CB（number input）、実際 CB（number input）、メモ（textarea、任意）。保存ボタンとキャンセルボタンを配置する。`defaultValues` prop で編集モード（既存データのプリフィル）にも対応する

- [x] T030 [P] [US1] 削除確認ダイアログコンポーネント `src/components/events/delete-dialog.tsx` を作成する。`"use client"` を指定する。shadcn/ui の Dialog コンポーネントを使用する。props として `eventId: string`、`onConfirm: () => void`、`open: boolean`、`onOpenChange: (open: boolean) => void` を受け取る。「このイベントと紐付く参加者データを削除しますか？（データは保持され、後で復元できます）」の確認メッセージを表示する。「削除する」ボタンで `deleteEvent` Server Action を呼び出し、成功時に toast.success("削除しました") を表示してイベント一覧にリダイレクトする

- [x] T031 [US1] イベント一覧テーブルコンポーネント `src/components/events/event-table.tsx` を作成する。plan.md の「データテーブルの実装パターン」セクションの実装をベースにする。`"use client"` を指定する。TanStack Table を使用する。列定義: イベント ID（リンク）、日付、会場名、エリア、状態（Badge）、参加者数、見込み収入。「削除済みを表示」トグル（Switch コンポーネント）を含める。削除済みイベントは半透明（`opacity-50`）で表示する。削除済みイベントには「復元」ボタンを表示する。列ヘッダーをクリックでソートできるようにする

- [x] T032 [US1] イベント詳細表示コンポーネント `src/components/events/event-detail.tsx` を作成する。`"use client"` を指定する。props として `EventDetail` 型（イベント情報 + 参加者一覧 + 収支サマリー）を受け取る。表示項目: イベント ID、日付、時刻、会場名（マップ URL があればリンク表示）、エリア、男女別定員、男女別参加費、テーマ、対象職業、状態（Badge）、会場費、予定 CB、実際 CB、マッチング件数、メモ。「編集」ボタン（/events/[id]/edit へ遷移）と「削除」ボタン（DeleteDialog を開く）を配置する。**参加者一覧と収支サマリーの表示は Phase 4（US2）で追加するため、この時点ではスキップする**

### TDD Step 6: ページコンポーネント実装

- [x] T033 [US1] イベント一覧ページ `src/app/events/page.tsx` を実装する。Server Component として実装する。URL クエリパラメータから `year`（デフォルト: 現在年）、`month`（任意）、`status`（任意）を取得する。`getEvents()` でデータを取得し、`<EventTable>` に渡す。ページタイトル「イベント一覧」と「新規登録」ボタン（/events/new へのリンク）を配置する。年度セレクター（Select）と月セレクター（Select）と状態セレクター（Select）をフィルタ UI として配置する

- [x] T034 [US1] イベント新規登録ページ `src/app/events/new/page.tsx` を実装する。Server Component として実装する。ページタイトル「イベント新規登録」と `<EventForm>` コンポーネント（defaultValues なし）を配置する

- [x] T035 [US1] イベント詳細ページ `src/app/events/[id]/page.tsx` を実装する。Server Component として実装する。URL パラメータの `id` から `getEventDetail(id)` でデータを取得する。イベントが見つからない場合は `notFound()` を呼び出す。`<EventDetail>` コンポーネントにデータを渡す

- [x] T036 [US1] イベント編集ページ `src/app/events/[id]/edit/page.tsx` を実装する。Server Component として実装する。`getEventDetail(id)` でデータを取得し、`<EventForm defaultValues={eventData}>` にプリフィルデータを渡す

- [x] T037 [US1] イベント一覧ページのフィルタ機能を実装する。`src/app/events/page.tsx` に年度・月・状態のフィルタ UI を追加する。フィルタの変更時に URL クエリパラメータを更新して `router.push` でページを再読み込みする。`"use client"` のフィルタコンポーネント `src/components/events/event-filters.tsx` を別途作成し、`<Select>` コンポーネントで年度（現在年 ± 5年）、月（1〜12 + 全月）、状態（開催予定/開催済/キャンセル + 全状態）を選択できるようにする

**Checkpoint**: イベントの登録・一覧表示・詳細表示・編集・論理削除・復元・フィルタリングが動作すること。`npm run test:run` でユニットテスト（EVID-001〜012, VAL-E001〜017）が全て PASS。統合テスト（INT-E001〜013, INT-Q001〜006）が全て PASS。

### 🔍 Chrome MCP 動作確認

- [x] T037a [US1] Chrome DevTools MCP を使ってイベント CRUD の動作を確認する。以下の操作を MCP ツールで実行する:
  1. `navigate_page` で `/events/new` にアクセスする。`take_screenshot` でイベント登録フォームが正しく表示されていることを確認する
  2. `fill_form` でフォームに以下のテストデータを入力する: 日付=明日、時刻=19:00、会場名=テスト会場A、エリア=渋谷、男性定員=5、女性定員=5、男性参加費=6000、女性参加費=4000、状態=開催予定。`click` で「登録」ボタンをクリックする
  3. 登録成功後、イベント詳細ページにリダイレクトされることを確認する。`take_screenshot` でイベントID（YYYY-MM-001 形式）が表示されていること、入力データが正しく反映されていることを確認する
  4. `navigate_page` で `/events` にアクセスする。`take_screenshot` で登録したイベントが一覧テーブルに表示されていることを確認する
  5. 一覧テーブルのイベントIDリンクを `click` してイベント詳細ページに遷移する。「編集」ボタンを `click` して編集ページに遷移する
  6. `fill` で会場名を「テスト会場B」に変更し、「更新」ボタンを `click` する。更新後の詳細ページで会場名が変更されていることを `take_screenshot` で確認する
  7. 「削除」ボタンを `click` し、確認ダイアログが表示されることを確認する。「削除する」を `click` してイベント一覧に戻る
  8. `take_screenshot` で削除したイベントが一覧から非表示になっていることを確認する。「削除済みを表示」トグルを `click` して ON にし、削除済みイベントが半透明で表示されることを確認する
  9. フィルタ UI の年度・月・状態セレクターを操作し、フィルタが正しく動作することを確認する

---

## Phase 4: User Story 2 — 参加者登録・決済管理 (Priority: P2)

**Goal**: イベントに参加者を登録し、決済状況（済/未）を個別・一括で管理する。収支（見込み収入・決済済み収入・利益率等）がリアルタイムで自動計算される。

**Independent Test**: イベント詳細画面で参加者を登録し、決済状況を更新すると収支サマリーが自動更新されること。全横断参加者一覧で氏名検索ができること。

**対応 FR**: FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-012

### TDD Step 1: ユニットテストを先に書く（RED）

- [x] T038 [P] [US2] 収支計算ロジックのユニットテスト `tests/unit/calculations.test.ts` を作成する。test-cases.md セクション 1.1 の CALC-001〜CALC-012 の全 12 ケースを実装する。テスト対象は `src/lib/calculations.ts` の `calculateEventFinancials()` 関数。テストケースの例: (1) 男女各 3 名・全員未決済で見込み収入 30000 円 (2) 全員決済済で実現利益が正しいこと (3) 参加者 0 名で全カウント 0・profitRate が null (4) 見込み収入 0 円で profitRate が null（ゼロ除算回避） (5) 個別参加費とイベント標準レートが異なる場合、見込み収入はイベント標準レートで計算されること (6) 論理削除された参加者は集計から除外されること。**実行して全テストが FAIL することを確認する**

- [x] T039 [P] [US2] 参加者フォームバリデーションのユニットテストを `tests/unit/validations.test.ts` に追加する。test-cases.md セクション 1.4 の VAL-P001〜VAL-P010 の全 10 ケースと VAL-B001〜VAL-B004 の全 4 ケースを追加する。テスト対象は `participantFormSchema` と `bulkPaymentSchema`。テストケースの例: (1) 氏名未入力でエラー (2) 参加費 0 円が許容されること (3) 一括決済で参加者未選択でエラー。**実行して全テストが FAIL することを確認する**

### TDD Step 2: ビジネスロジック実装（GREEN）

- [x] T040 [US2] 収支計算ロジック `src/lib/calculations.ts` を実装する。data-model.md の「計算ロジックの実装場所」セクションの実装を正として使用する（plan.md にも同様のコードがあるが data-model.md を優先する）。`calculateEventFinancials()` 関数を実装する。**重要なルール**: (1) 見込み収入はイベントの男女別標準参加費 × 人数で計算する（参加者の個別参加費は使わない） (2) 決済済み収入は決済済み参加者の個別参加費の合計 (3) 論理削除された参加者は除外する (4) 見込み収入が 0 の場合は利益率を null にする（ゼロ除算回避） (5) 利益率は小数第 2 位まで（Math.round で 10000 倍して割る）。実装後、`npm run test:run tests/unit/calculations.test.ts` で CALC-001〜012 の全 12 テストが PASS になることを確認する

- [x] T041 [US2] Phase 3 の T025 で作成した `src/queries/event-queries.ts` の `getEvents()` と `getEventDetail()` を更新する。ダミー値を返していた収支サマリー部分を、`calculateEventFinancials()` を呼び出して実際の値を返すように差し替える。参加者データを include して取得し、計算関数に渡す

### TDD Step 3: 統合テストを先に書く（RED）

- [x] T042 [US2] 参加者 Server Actions の統合テスト `tests/integration/participant-actions.test.ts` を作成する。test-cases.md セクション 2.2 の INT-P001〜INT-P011 の全 11 ケースを実装する。テスト用 DB に接続する。各テストの前にイベントを 1 件作成する `beforeEach` を設定する。テストケースの例: (1) createParticipant で参加者が DB に追加されること (2) 参加費がイベント標準レートと独立して保存されること (3) updatePaymentStatus で決済日・確認者が設定されること (4) bulkUpdatePaymentStatus で複数名が一括更新されること (5) 100 名登録しても全て成功すること。**実行して全テストが FAIL することを確認する**

- [x] T043 [P] [US2] データ取得関数の統合テストを `tests/integration/queries.test.ts` に追加する。test-cases.md セクション 2.3 の INT-Q007〜INT-Q011（参加者関連）を追加する。テストケースの例: (1) getEventDetail で収支サマリーが calculateEventFinancials と一致すること (2) getAllParticipants で全イベントの参加者が取得できること (3) 氏名フィルタで部分一致検索できること (4) 取得結果に name, eventId, gender, fee, paymentStatus が含まれること。**実行して全テストが FAIL することを確認する**

### TDD Step 4: Server Actions & クエリ実装（GREEN）

- [x] T044 [US2] 参加者データ取得関数 `src/queries/participant-queries.ts` を実装する。contracts/api.md の「参加者関連」セクションの契約に従う。`getAllParticipants()` 関数を実装する: nameFilter（部分一致、Prisma の `contains` を使用）と includeDeleted のオプションを受け取る。戻り値は `ParticipantWithEventId[]` 型

- [x] T045 [US2] 参加者 Server Actions `src/actions/participant-actions.ts` を実装する。ファイル先頭に `"use server";` を記述する。contracts/api.md の契約に従い、以下の 6 つの関数を実装する:
  - `createParticipant(eventId, formData)`: Zod でバリデーション → prisma.participant.create() → revalidatePath
  - `updateParticipant(participantId, formData)`: Zod でバリデーション → prisma.participant.update() → revalidatePath
  - `deleteParticipant(participantId)`: isDeleted を true に → revalidatePath
  - `restoreParticipant(participantId)`: isDeleted を false に → revalidatePath
  - `updatePaymentStatus(participantId, status, paymentDate?, confirmedBy?)`: PAID の場合は paymentDate と paymentConfirmedBy を設定。UNPAID に戻す場合は null にクリア → revalidatePath
  - `bulkUpdatePaymentStatus(participantIds, paymentDate, confirmedBy)`: prisma.$transaction 内で全参加者を PAID に一括更新 → revalidatePath

- [x] T046 [US2] 統合テストが PASS することを確認する。`npm run test:run tests/integration/participant-actions.test.ts` と `npm run test:run tests/integration/queries.test.ts`（参加者関連テストを含む）を実行し、全テストが PASS になることを確認する

### TDD Step 5: UI コンポーネント実装

- [x] T047 [P] [US2] 参加者登録フォームコンポーネント `src/components/participants/participant-form.tsx` を作成する。`"use client"` を指定する。React Hook Form + Zod の zodResolver を使用する。フォームフィールド: 氏名（text input）、性別（Select: 男性/女性）、参加費（number input、円）、決済状況（Select: 済/未）、決済日（date input、任意）、決済確認者（text input、任意）、メモ（textarea、任意）。props として `eventId: string` と `defaultValues?`（編集時）を受け取る。保存ボタンで createParticipant または updateParticipant を呼び出す

- [x] T048 [P] [US2] 決済状況セルコンポーネント `src/components/participants/payment-status-cell.tsx` を作成する。`"use client"` を指定する。参加者 1 名分の決済状況を表示し、クリックで済/未を切り替えられる。「済」に変更する場合は、インラインで決済日（デフォルト: 今日）と確認者名の入力を求める。updatePaymentStatus Server Action を呼び出す

- [x] T049 [P] [US2] 一括決済更新ダイアログコンポーネント `src/components/participants/bulk-payment-dialog.tsx` を作成する。`"use client"` を指定する。shadcn/ui の Dialog を使用する。props として `participants`（未決済の参加者リスト）を受け取る。チェックボックスで参加者を選択し、決済日（date input）と確認者名（text input）を入力して「一括更新」ボタンで bulkUpdatePaymentStatus を呼び出す

- [x] T050 [US2] 参加者一覧テーブルコンポーネント `src/components/participants/participant-table.tsx` を作成する。`"use client"` を指定する。TanStack Table を使用する。列定義: 選択チェックボックス、氏名、性別（Badge）、参加費（¥ フォーマット）、決済状況（PaymentStatusCell）、決済日、確認者、メモ。「削除済みを表示」トグルを含める。テーブル上部に氏名検索フィールド（FR-009）を配置する。選択した参加者に対する「一括決済」ボタンを配置する

- [x] T051 [US2] イベント詳細画面（`src/app/events/[id]/page.tsx` と `src/components/events/event-detail.tsx`）を更新する。参加者一覧テーブル（`<ParticipantTable>`）を追加する。収支サマリー（見込み収入・決済済み収入・未回収・見込み利益・実現利益・利益率）を表示するセクションを追加する。「参加者追加」ボタンを配置し、クリックで参加者登録フォームを表示する（アコーディオンまたはインラインフォーム）

- [x] T052 [US2] 全イベント横断参加者一覧ページ `src/app/participants/page.tsx` を実装する。Server Component として実装する。`getAllParticipants()` でデータを取得する。表示列: 氏名、所属イベント ID（リンク）、性別、参加費、決済状況。氏名検索フィールドを配置する（URL クエリパラメータ `name` でフィルタ）。TanStack Table を使用した専用テーブルコンポーネント `src/components/participants/cross-event-participant-table.tsx` を作成する

**Checkpoint**: 参加者の登録・編集・削除・復元が動作すること。決済状況の個別更新・一括更新が動作すること。収支サマリーが自動計算されること。全横断参加者一覧で氏名検索ができること。`npm run test:run` で全ユニットテスト・統合テストが PASS。

### 🔍 Chrome MCP 動作確認

- [x] T052a [US2] Chrome DevTools MCP を使って参加者・決済管理の動作を確認する。以下の操作を MCP ツールで実行する:
  1. `navigate_page` で Phase 3 で作成したイベントの詳細ページ（`/events/[id]`）にアクセスする。`take_screenshot` でイベント詳細と空の参加者一覧が表示されていることを確認する
  2. 「参加者追加」ボタンを `click` し、参加者登録フォームが表示されることを確認する。`fill_form` で以下を入力: 氏名=テスト太郎、性別=男性、参加費=6000、決済状況=未。登録ボタンを `click` する
  3. 同様に 2 名目を登録する: 氏名=テスト花子、性別=女性、参加費=4000、決済状況=未。`take_screenshot` で参加者一覧に 2 名が表示され、収支サマリー（見込み収入・未回収等）が自動計算されていることを確認する
  4. テスト太郎の決済状況セルを `click` して「済」に切り替える。決済日と確認者名を入力する。`take_screenshot` で決済済み収入・実現利益が更新されていることを確認する
  5. 一括決済ボタンを `click` し、テスト花子をチェックボックスで選択して一括更新する。`take_screenshot` で全員が決済済みになり、未回収が 0 になっていることを確認する
  6. `navigate_page` で `/participants` にアクセスする。`take_screenshot` で横断参加者一覧にテスト太郎・テスト花子が表示されていることを確認する
  7. 氏名検索フィールドに `fill` で「太郎」を入力し、テスト太郎のみが絞り込まれることを確認する

---

## Phase 5: User Story 3 — ダッシュボード (Priority: P3)

**Goal**: ダッシュボード画面で月別収支サマリーテーブルを表示する。年度切替、月クリックでイベント一覧への遷移ができる。

**Independent Test**: 複数のイベント・参加者データが登録された状態でダッシュボードを開き、集計値が正確に表示されること。

**対応 FR**: FR-014, FR-015, FR-016, FR-020, FR-021

### TDD Step 1: 統合テストを先に書く（RED）

- [x] T053 [US3] ダッシュボードクエリの統合テストを `tests/integration/queries.test.ts` に追加する。test-cases.md セクション 2.3 の INT-Q012〜INT-Q014, INT-Q017 の 4 ケースを追加する。テストケースの例: (1) getMonthlySummary(2025) で 12 行が返ること (2) 各月のイベント数・参加者数・収支が正確であること (3) イベント 0 件の月は全て 0/null であること (4) 年度切替で異なる年のデータのみ取得されること (5) マッチング件数が月別に正しく集計されること。**実行して全テストが FAIL することを確認する**

### TDD Step 2: クエリ実装（GREEN）

- [x] T054 [US3] ダッシュボード集計クエリ `src/queries/dashboard-queries.ts` を実装する。contracts/api.md の「ダッシュボード関連」セクションの契約に従う。`getMonthlySummary(year: number)` 関数を実装する。処理フロー: (1) 指定年の全イベント（論理削除除く）を Prisma で取得（participants を include） (2) 月別にグループ化（1〜12 月） (3) 各月のイベントに対して calculateEventFinancials() で収支を計算 (4) 月別に集計（eventCount, maleCount, femaleCount, venueCost（当月イベントの会場費合算）, expectedRevenue, paidRevenue, uncollected, expectedProfit, actualProfit, profitRate（月全体の見込み利益÷見込み収入×100、見込み収入0なら null）, matchCount（当月イベントの matchCount 合算）） (5) イベント 0 件の月は全て 0、profitRate は null として 12 行を返す。実装後、統合テストが PASS することを確認する

### TDD Step 3: UI コンポーネント実装

- [x] T055 [P] [US3] 月別サマリーテーブルコンポーネント `src/components/dashboard/monthly-summary-table.tsx` を作成する。plan.md の「ダッシュボード月別サマリーテーブルの実装パターン」セクションの実装をベースにする。`"use client"` を指定する。props として `year: number` と `rows: MonthlySummaryRow[]` を受け取る。列: 月（リンク: `/events?year=${year}&month=${month}`）、件数、男性、女性、会場費、見込み収入、決済済み、未回収、見込み利益、実現利益、利益率、マッチング。金額は `¥` + カンマ区切りで表示する。利益率は小数第 1 位まで表示（null の場合は "-"）

- [x] T056 [P] [US3] 年度切替セレクターコンポーネント `src/components/dashboard/year-selector.tsx` を作成する。`"use client"` を指定する。shadcn/ui の Select を使用する。選択肢: 現在年 ± 5 年の範囲。初期値: URL クエリパラメータの `year`（デフォルト: 現在年）。年度を変更すると `router.push(/?year=${selectedYear})` でページを再読み込みする

- [x] T057 [US3] ダッシュボードページ `src/app/page.tsx` を実装する。Server Component として実装する。URL クエリパラメータから `year`（デフォルト: 現在年）を取得する。`getMonthlySummary(year)` でデータを取得する。ページタイトル「ダッシュボード」、`<YearSelector>` と `<MonthlySummaryTable>` を配置する

**Checkpoint**: ダッシュボードに月別サマリーが表示されること。年度切替で表示が更新されること。月クリックでイベント一覧に遷移すること。`npm run test:run` で全テストが PASS。

### 🔍 Chrome MCP 動作確認

- [x] T057a [US3] Chrome DevTools MCP を使ってダッシュボードの動作を確認する。以下の操作を MCP ツールで実行する:
  1. `navigate_page` で `/`（ダッシュボード）にアクセスする。`take_screenshot` で月別サマリーテーブルが 1 月〜12 月の 12 行表示されていることを確認する
  2. Phase 3・4 で登録したイベント・参加者のデータが、該当月の行に正しく集計されていることを確認する（イベント数、男女参加者数、見込み収入、決済済み収入、利益率等）
  3. イベントが 0 件の月の行が全て 0 / "-" で表示されていることを確認する
  4. 年度セレクターを `click` して別の年度（例: 前年）に切り替える。`take_screenshot` でテーブルが再描画され、選択年度のデータのみ表示されていることを確認する
  5. 月別サマリーテーブルの月リンク（例: 「3月」）を `click` して `/events?year=YYYY&month=3` に遷移することを確認する。`take_screenshot` でイベント一覧がその月でフィルタされていることを確認する

---

## Phase 6: User Story 4 — スケジュール一覧 + LINE テキスト生成 (Priority: P4)

**Goal**: スケジュール一覧画面で全イベントの残枠をリアルタイム確認し、LINE 募集テキストを生成してクリップボードにコピーする。

**Independent Test**: 開催予定イベントのスケジュール一覧で残枠が正確に表示され、LINE テキスト生成ボタンからモーダルでテキストが表示・コピーできること。

**対応 FR**: FR-017, FR-018, FR-019

### TDD Step 1: ユニットテストを先に書く（RED）

- [x] T058 [P] [US4] LINE 募集テキスト生成のユニットテスト `tests/unit/line-text.test.ts` を作成する。test-cases.md セクション 1.3 の LINE-001〜LINE-011 の全 11 ケースを実装する。テスト対象は `src/lib/line-text.ts` の `generateLineText()` 関数。テストケースの例: (1) 全フィールド入力で固定順序のテキストが生成されること (2) 曜日が自動算出されること（2025-03-15 → 土） (3) 残枠が正しく計算されること（定員 - 現在参加者数） (4) テーマが null の場合テーマ行が省略されること (5) 金額がカンマ区切りで表示されること (6) 項目の順序が固定であること。**実行して全テストが FAIL することを確認する**

### TDD Step 2: ビジネスロジック実装（GREEN）

- [x] T059 [US4] LINE 募集テキスト生成ロジック `src/lib/line-text.ts` を実装する。contracts/api.md の「LINE 募集テキスト生成」セクションの契約とフォーマット例に従う。`generateLineText()` 関数を実装する。固定フォーマット（順序固定）: 📅 日付（曜日） → ⏰ 時刻〜 → 📍 エリア / 会場名 → 👫 男性N名 / 女性N名 → 💰 男性 X,XXX円 / 女性 X,XXX円 → 🎯 テーマ（null なら省略） → 💼 対象（null なら省略） → ✅ 残枠。曜日は `date-fns` の `format` を使用して算出する。金額はカンマ区切り。残枠は `定員 - 現在参加者数`（負の場合は「残枠なし」等）。実装後、`npm run test:run tests/unit/line-text.test.ts` で LINE-001〜011 の全 11 テストが PASS になることを確認する

### TDD Step 3: UI コンポーネント実装

- [x] T060 [P] [US4] LINE テキストプレビューモーダルコンポーネント `src/components/schedule/line-text-dialog.tsx` を作成する。plan.md の「LINE テキストプレビューモーダルの実装パターン」セクションの実装をベースにする。`"use client"` を指定する。shadcn/ui の Dialog を使用する。props として event 情報と現在の参加者状況を受け取る。`generateLineText()` でテキストを生成し、`<pre>` タグで表示する。「コピー」ボタンで `navigator.clipboard.writeText()` を呼び出し、成功時に toast.success("クリップボードにコピーしました") を表示する。clipboard API が使えない場合は textarea 経由のフォールバックを実装する

- [x] T061 [P] [US4] スケジュール一覧テーブルコンポーネント `src/components/schedule/schedule-table.tsx` を作成する。`"use client"` を指定する。TanStack Table を使用する。列定義: イベント ID（リンク）、日付、時刻、エリア、会場名、状態（Badge）、男性定員、女性定員、男性参加者数、女性参加者数、男性残枠、女性残枠、LINE テキスト生成ボタン。残枠は `定員 - 現在参加者数` で計算する。残枠が 0 以下の場合は赤字で表示する

- [x] T062 [US4] スケジュール一覧ページ `src/app/schedule/page.tsx` を実装する。Server Component として実装する。`getEvents()` で全イベント（参加者を include）を取得する。月・エリア・状態のフィルタ UI を配置する（URL クエリパラメータでフィルタ）。`<ScheduleTable>` にデータを渡す。フィルタコンポーネント `src/components/schedule/schedule-filters.tsx` を `"use client"` で作成する

**Checkpoint**: スケジュール一覧に全イベントが表示され、残枠が正確に計算されること。LINE テキスト生成ボタンからモーダルが開き、テキストがコピーできること。フィルタが動作すること。`npm run test:run` で全テストが PASS。

### 🔍 Chrome MCP 動作確認

- [x] T062a [US4] Chrome DevTools MCP を使ってスケジュール・LINE テキスト生成の動作を確認する。以下の操作を MCP ツールで実行する:
  1. `navigate_page` で `/schedule` にアクセスする。`take_screenshot` でスケジュール一覧テーブルが表示され、各イベントの男女別定員・参加者数・残枠が正しく表示されていることを確認する
  2. 残枠が 0 以下のイベントがあれば、赤字で表示されていることを確認する
  3. 「LINE テキスト生成」ボタンを `click` する。`take_screenshot` でモーダルが開き、固定フォーマットの募集テキスト（📅 日付、⏰ 時刻、📍 エリア/会場名、👫 定員、💰 参加費、✅ 残枠 等）がプレビュー表示されていることを確認する
  4. 「コピー」ボタンを `click` し、成功トースト（「クリップボードにコピーしました」）が表示されることを確認する
  5. モーダルを閉じ、フィルタ（月・エリア・状態）を操作してフィルタが正しく動作することを確認する

---

## Phase 7: 収支レポート + 追加機能

**Purpose**: 収支レポート画面の実装と、Food back 管理・マッチング管理の UI 統合。

### TDD Step 1: 統合テストを先に書く（RED）

- [x] T063 収支レポートクエリの統合テストを `tests/integration/queries.test.ts` に追加する。test-cases.md セクション 2.3 の INT-Q015〜INT-Q016 の 2 ケースを追加する。テストケースの例: (1) getReportData で年度フィルタが正しく動作すること (2) 取得結果に expectedCashback, actualCashback が含まれること。**実行して全テストが FAIL することを確認する**

### TDD Step 2: クエリ実装（GREEN）

- [x] T064 収支レポート用クエリ `getReportData()` を `src/queries/event-queries.ts` に追加する。contracts/api.md の「レポート関連」セクションの契約に従う。引数 year（必須）と month（任意）で対象イベントをフィルタし、各イベントの収支データ（ReportRow 型）を返す。ReportRow 型は contracts/api.md に定義済み。`calculateEventFinancials()` を使用して収支を計算する

- [x] T065 統合テストが PASS することを確認する

### TDD Step 3: UI コンポーネント実装

- [x] T066 [P] 収支レポートテーブルコンポーネント `src/components/reports/report-table.tsx` を作成する。`"use client"` を指定する。TanStack Table を使用する。列定義: イベント ID（リンク）、日付、会場費、予定 CB、実際 CB、見込み収入、決済済み収入、未回収、見込み利益、実現利益、利益率。金額は `¥` + カンマ区切り。利益率は小数第 1 位まで（null は "-"）

- [x] T067 収支レポートページ `src/app/reports/page.tsx` を実装する。Server Component として実装する。`getReportData()` でデータを取得する。年度セレクター・月セレクターのフィルタ UI を配置する。`<ReportTable>` にデータを渡す

**Checkpoint**: 収支レポートにイベント別収支が表示されること。フィルタが動作すること。

### 🔍 Chrome MCP 動作確認

- [x] T067a Chrome DevTools MCP を使って収支レポートの動作を確認する。以下の操作を MCP ツールで実行する:
  1. `navigate_page` で `/reports` にアクセスする。`take_screenshot` で収支レポートテーブルが表示され、イベント別の収支内訳（イベントID・日付・会場費・予定CB・実際CB・見込み収入・決済済み収入・未回収・見込み利益・実現利益・利益率）が表示されていることを確認する
  2. 金額が `¥` + カンマ区切りで表示されていること、利益率が小数第 1 位まで表示されていること（見込み収入 0 の場合は「-」）を確認する
  3. 年度セレクター・月セレクターを操作し、フィルタが正しく動作することを確認する

---

## Phase 8: Edge Case テスト + E2E テスト

**Purpose**: エッジケーステスト、E2E テスト、パフォーマンステスト、レスポンシブテストの実装。

### Edge Case テスト

- [x] T068 [P] Edge Case ユニットテスト `tests/unit/edge-cases.test.ts` を作成する。test-cases.md セクション 4.1 の EDGE-002, EDGE-003, EDGE-007, EDGE-009〜EDGE-011, EDGE-013 の 7 ケースを実装する。テストケースの例: (1) 参加費 0 円で登録・集計が正常 (2) 見込み収入 0 円でゼロ除算なし (3) 空文字の氏名検索で全参加者が返ること (4) うるう年 2 月 29 日のイベント ID (5) 全参加者が論理削除された場合の収支

- [x] T069 [P] Edge Case 統合テストを `tests/integration/queries.test.ts` に追加する。test-cases.md セクション 4.1 の EDGE-001, EDGE-004〜EDGE-006, EDGE-008, EDGE-012, EDGE-014 の 7 ケースを追加する。テストケースの例: (1) イベント 0 件の年度でダッシュボード (2) NNN=100 超の採番 (3) Food back 実際 CB > 予定 CB (4) 同時編集で Last-write-wins (5) 日本語氏名の部分一致

### E2E テスト

- [ ] T070 Playwright の設定ファイル `playwright.config.ts` をプロジェクトルートに作成する。baseURL を `http://localhost:3000` に設定する。テスト用 DB（port 5433）を使用するための環境変数設定を含める。ブラウザは chromium のみ（高速化のため）。スクリーンショットを `on: 'only-on-failure'` に設定する

- [ ] T071 [P] イベント CRUD E2E テスト `tests/e2e/event-crud.spec.ts` を作成する。test-cases.md セクション 3.1 の E2E-001〜E2E-005 の全 5 ケースを実装する。テストの例: (1) イベント登録画面でフォーム入力 → 保存 → 一覧に表示 (2) イベント編集 → 会場名変更 → 保存 → 更新確認 (3) 削除 → 確認ダイアログ承認 → 非表示 → トグル ON → 表示（グレー） → 復元 → 通常表示 (4) フィルタ操作 (5) 自動採番確認

- [ ] T072 [P] 参加者・決済 E2E テスト `tests/e2e/participant-payment.spec.ts` を作成する。test-cases.md セクション 3.2 の E2E-010〜E2E-014 の全 5 ケースを実装する

- [ ] T073 [P] ダッシュボード E2E テスト `tests/e2e/dashboard.spec.ts` を作成する。test-cases.md セクション 3.3 の E2E-020〜E2E-022 の全 3 ケースを実装する。**追加ケース**: イベント詳細画面で状態を「開催予定」→「開催済」に変更した後、ダッシュボードに戻り月別サマリーの集計値が即座に反映されていることを検証する（US1-AC2 カバレッジ）

- [ ] T074 [P] スケジュール・LINE テキスト E2E テスト `tests/e2e/schedule-line.spec.ts` を作成する。test-cases.md セクション 3.4 の E2E-030〜E2E-032 の全 3 ケースを実装する

- [ ] T075 [P] 収支レポート E2E テスト `tests/e2e/reports.spec.ts` を作成する。test-cases.md セクション 3.5 の E2E-040〜E2E-041 の全 2 ケースを実装する

**Checkpoint**: 全 E2E テストが PASS すること。`npm run test:e2e` で全テストが緑。

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: レスポンシブ対応、パフォーマンス最適化、最終調整。

- [ ] T076 レスポンシブ対応を実装する。plan.md の「レスポンシブ対応方針」に従い、以下を実装する:
  - `src/components/layout/navigation.tsx`: モバイル（< 768px）ではサイドバーを非表示にし、ハンバーガーメニュー（shadcn/ui の Sheet を使用）で開閉する
  - 全テーブルコンポーネント: モバイル・タブレットでは横スクロール可能にする（`<div className="overflow-x-auto">` でラップ）
  - Tailwind CSS のブレークポイント（`md:`, `lg:`）で切り替える

- [ ] T077 [P] パフォーマンステスト用シードデータスクリプト `prisma/seed.ts` を作成する。イベント 100 件 + 参加者 1,000 名を生成するシードスクリプト。各イベントに 10 名程度の参加者を割り当て、月ごとに均等に分散させる。`npx prisma db seed` で実行できるように package.json に `prisma.seed` を追加する

- [ ] T078 [P] レスポンシブテストを E2E テストファイルに追加する。test-cases.md セクション 6 の RESP-001〜RESP-006 の 6 ケースを `tests/e2e/` の既存テストファイルまたは新規ファイルに追加する。Playwright の `page.setViewportSize()` で 375px（スマホ）、768px（タブレット）、1280px（PC）の各幅をテストする

- [ ] T079 全テストを実行して最終確認する。以下のコマンドを順番に実行し、全て PASS することを確認する:
  1. `npm run test:run` — ユニットテスト + 統合テスト
  2. `npm run test:e2e` — E2E テスト
  3. `npm run build` — 本番ビルドがエラーなく完了すること

- [ ] T080 `.gitignore` を確認・更新する。以下が含まれていることを確認: `node_modules/`, `.env`, `.next/`, `prisma/*.db`, `test-results/`, `playwright-report/`。`.env.example` は Git に含める

- [ ] T081 quickstart.md の手順に従い、開発環境の構築手順が正常に完了することを検証する。README 的なドキュメントとして quickstart.md が最新であることを確認する

### 🔍 Chrome MCP 最終動作確認

- [ ] T081a Chrome DevTools MCP を使ってレスポンシブ対応の動作を確認する。以下の操作を MCP ツールで実行する:
  1. **スマートフォン（375px）**: `emulate` で iPhone SE サイズ（375×667）をエミュレートする。`navigate_page` で `/` にアクセスし、`take_screenshot` でサイドバーが非表示でありハンバーガーメニューが表示されていることを確認する。ハンバーガーメニューを `click` してサイドバーが開くことを確認する。`navigate_page` で `/events` にアクセスし、テーブルが横スクロール可能であることを確認する
  2. **タブレット（768px）**: `resize_page` で 768×1024 に変更する。`navigate_page` で `/` にアクセスし、`take_screenshot` でサイドバーが表示されテーブルが横スクロール可能であることを確認する
  3. **PC（1280px）**: `resize_page` で 1280×800 に変更する。`navigate_page` で `/` にアクセスし、`take_screenshot` でサイドバーとフルテーブルが並んで表示されていることを確認する
  4. 各デバイスサイズでイベント登録フォーム（`/events/new`）が正しくレイアウトされていることを確認する（フィールドの並び、ボタンの配置）

- [ ] T081b Chrome DevTools MCP を使って全画面の最終確認を行う。シードデータ（T077 で生成した 100 件 + 1,000 名）がある状態で以下を確認する:
  1. `navigate_page` で `/events` にアクセスし、`take_screenshot` で大量データでもテーブルが正常に描画されることを確認する
  2. `navigate_page` で `/`（ダッシュボード）にアクセスし、`take_screenshot` で 12 行の月別サマリーが正確に集計されていることを確認する
  3. `navigate_page` で `/reports` にアクセスし、`take_screenshot` で収支レポートが正常に表示されることを確認する
  4. `navigate_page` で `/schedule` にアクセスし、`take_screenshot` でスケジュール一覧が正常に表示されることを確認する
  5. `navigate_page` で `/participants` にアクセスし、`take_screenshot` で横断参加者一覧が正常に表示されることを確認する
  6. **パフォーマンス確認**: `performance_start_trace` でトレースを開始し、`navigate_page` で `/events` にアクセスした後 `performance_stop_trace` + `performance_analyze_insight` で初期表示のパフォーマンスを分析する。SC-002（3秒以内）を満たしているか確認する

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup（T001〜T013）
    ↓
Phase 2: Foundational（T014〜T019）← 全 Phase 3 以降をブロック
    ↓
Phase 3: US1 イベント管理（T020〜T037）← MVP
    ↓
Phase 4: US2 参加者・決済（T038〜T052）← US1 完了後に開始
    ↓
Phase 5: US3 ダッシュボード（T053〜T057）← US2 の収支計算に依存
    ↓
Phase 6: US4 スケジュール・LINE（T058〜T062）← US2 の参加者データに依存
    ↓
Phase 7: 収支レポート（T063〜T067）← US2 の収支計算に依存
    ↓
Phase 8: E2E テスト（T068〜T075）← 全機能の実装完了後
    ↓
Phase 9: Polish（T076〜T081）← 全テスト PASS 後
```

### User Story Dependencies

- **US1 (P1)**: Phase 2 完了後に開始可能。他の US に依存しない
- **US2 (P2)**: US1 に依存する（参加者はイベントに紐付くため）
- **US3 (P3)**: US2 に依存する（ダッシュボードの集計にはイベント + 参加者 + 収支計算が必要）
- **US4 (P4)**: US2 に依存する（残枠表示には参加者データが必要）
- **US3 と US4 は並列実装可能**（ともに US2 完了後に開始できる）

### TDD サイクル（各 User Story 内）

```
1. ユニットテストを書く（RED: テストが FAIL）
2. ビジネスロジックを実装する（GREEN: テストが PASS）
3. 統合テストを書く（RED: テストが FAIL）
4. Server Actions / クエリを実装する（GREEN: テストが PASS）
5. UI コンポーネントを実装する
6. ページコンポーネントを実装する
7. ブラウザで動作確認する
```

### Parallel Opportunities

```
Phase 1 内:
  T002 + T003（npm install）は並列可
  T004 + T005（docker-compose + .env）は並列可

Phase 2 内:
  T016 + T017 + T018（validations + layout + navigation）は並列可

Phase 3 内:
  T020 + T021（ユニットテスト 2 ファイル）は並列可
  T029 + T030（フォーム + ダイアログ）は並列可

Phase 4 内:
  T038 + T039（ユニットテスト 2 ファイル）は並列可
  T047 + T048 + T049（参加者 UI 3 コンポーネント）は並列可

Phase 5 内:
  T055 + T056（サマリーテーブル + 年度セレクター）は並列可

Phase 6 内:
  T060 + T061（LINE ダイアログ + スケジュールテーブル）は並列可

Phase 8 内:
  T071〜T075（E2E テスト 5 ファイル）は全て並列可
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup を完了する
2. Phase 2: Foundational を完了する（CRITICAL: 全 US をブロック）
3. Phase 3: User Story 1 を完了する
4. **STOP and VALIDATE**: イベントの CRUD が動作することを確認する
5. `npm run build` が成功し、本番デプロイ可能な状態

### Incremental Delivery

1. Setup + Foundational → 基盤完了
2. US1 完了 → イベント管理が単体で動作（**MVP!**）
3. US2 完了 → 参加者管理 + 決済管理 + 収支自動計算が追加
4. US3 完了 → ダッシュボードで月別 KPI が確認可能
5. US4 完了 → LINE 募集テキスト生成が利用可能
6. 収支レポート完了 → イベント別収支の詳細確認が可能
7. E2E テスト + Polish → 品質保証 + レスポンシブ対応

### TDD の原則

- **テストを先に書く**: 各 User Story の最初のタスクはテストの作成
- **RED → GREEN → REFACTOR**: テストが FAIL → 実装して PASS → 必要ならリファクタリング
- **テストが PASS したらコミット**: 各チェックポイントでコミットする
- **テストが壊れたら直す**: 新しい実装で既存テストが FAIL したら、実装を修正する（テストを修正するのではない）

---

## Task Summary

| Phase | 内容 | タスク数 | テストケース数 | MCP確認 |
|-------|------|---------|-------------|---------|
| Phase 1 | Setup | 13 | 0 | - |
| Phase 2 | Foundational | 9 | 0 | T019c |
| Phase 3 | US1 イベント管理 | 19 | 42 (12 + 17 + 13) | T037a |
| Phase 4 | US2 参加者・決済 | 16 | 37 (12 + 14 + 11) | T052a |
| Phase 5 | US3 ダッシュボード | 6 | 4 | T057a |
| Phase 6 | US4 スケジュール・LINE | 6 | 11 | T062a |
| Phase 7 | 収支レポート | 6 | 2 | T067a |
| Phase 8 | Edge Case + E2E | 8 | 32 (14 + 18) | - |
| Phase 9 | Polish | 8 | 6 | T081a, T081b |
| **Total** | | **91** | **134** | **8 確認** |

**残り 13 ケース**（147 - 134）: パフォーマンステスト（PERF-001〜004 の 4 ケース）は Phase 9 の T078 に含まれる。レスポンシブテスト（RESP-001〜006 の 6 ケース）も T078 に含まれる。E2E テスト内の追加ケース 3 件は各 E2E ファイル内に含まれる。

---

## Notes

- [P] タスク = 異なるファイルで作業するため並列実行可能
- [Story] ラベル = ユーザーストーリーへのトレーサビリティ
- TDD アプローチ: テストを先に書き、FAIL を確認してから実装する
- 各チェックポイントで `npm run test:run` と `npm run build` が PASS することを確認する
- 各 Phase 完了後にコミットする
- イベント ID は `YYYY-MM-NNN` 形式。論理削除済み ID は再利用しない
- 収支計算の「見込み収入」はイベント標準レート × 人数。「決済済み収入」は参加者個別参加費の合計
