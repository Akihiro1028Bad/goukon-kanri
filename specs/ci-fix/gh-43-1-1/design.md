# CI 修正設計書: E2E テスト失敗 (PR #44 / Issue #43)

## 問題分析

### 現状の動作
PR #44 (`agent/gh-43-0` ブランチ) の CI で E2E テストが失敗している。

### PR #44 の変更内容
```
.github/workflows/claude.yml | 159 変更
specs/issue-43/design.md     | 376 追加（新規）
```

PR #44 は以下の変更のみを含む：
1. `specs/issue-43/design.md` — 設計書の新規追加（コード変更なし）
2. `.github/workflows/claude.yml` — Claude GitHub Actions の改善
   - `allowedTools` の拡張
   - `continue-on-error: true` の追加
   - 失敗時のコメント投稿ステップ追加
   - デバッグ情報の収集ステップ追加

**重要**: E2E テストに直接影響するコード変更は含まれていない。

### 考えられる失敗原因

#### 原因 1: CI 環境の不安定性（最も可能性が高い）

CI 環境では以下の問題が発生しやすい：

1. **webServer 起動のタイムアウト**
   - `playwright.config.ts:28` で webServer timeout は 60 秒に設定
   - CI 環境では Next.js プロダクションビルド (`npm run start`) の起動が遅延する可能性
   - GitHub Actions のリソース制限により、起動に 60 秒以上かかる場合がある

2. **ネットワーク遅延**
   - `networkidle` の待機が不安定
   - CI 環境のネットワーク状態により、タイムアウトが発生する可能性

3. **メモリ不足**
   - Chromium と Next.js の同時実行でメモリ不足が発生する可能性
   - GitHub Actions の ubuntu-latest では約 7GB の RAM が利用可能

#### 原因 2: テストの非決定性

E2E テストファイルの分析結果：

| ファイル | beforeEach | 潜在的問題 |
|---------|------------|----------|
| `dashboard.spec.ts` | cleanDatabase() + goto("/") | networkidle 待機 |
| `event-crud.spec.ts` | cleanDatabase() + goto("/events") | networkidle 待機 |
| `participant-payment.spec.ts` | cleanDatabase() + goto("/events") | networkidle 待機 |
| `reports.spec.ts` | cleanDatabase() + goto("/reports") | networkidle 待機 |
| `responsive.spec.ts` | cleanDatabase() のみ | ページ遷移なし |
| `schedule-line.spec.ts` | cleanDatabase() + goto("/schedule") | networkidle 待機 |

問題点：
- `waitForLoadState("networkidle")` は CI 環境で不安定
- 60 秒のタイムアウトでも不十分な場合がある

#### 原因 3: DB クリーンアップの競合

`tests/e2e/helpers/clean-database.ts` の実装：

```typescript
export async function cleanDatabase(): Promise<void> {
  const prisma = new PrismaClient({
    datasourceUrl: testDatabaseUrl,
  });

  try {
    await prisma.$connect();
    await prisma.eventTodo.deleteMany();
    await prisma.participant.deleteMany();
    await prisma.event.deleteMany();
  } finally {
    await prisma.$disconnect();
  }
}
```

問題点：
- 各テストで新しい PrismaClient インスタンスを作成
- 接続プールの枯渇が起きる可能性（特に CI 環境）
- `$disconnect()` が完了する前に次のテストが開始する可能性

---

## 修正方針

### 変更対象ファイル

| ファイル | 変更内容 |
|----------|----------|
| `playwright.config.ts` | タイムアウト設定の調整、リトライ設定の最適化 |
| `.github/workflows/ci.yml` | E2E ジョブの安定化 |
| `tests/e2e/helpers/clean-database.ts` | PrismaClient のシングルトン化 |

### 具体的な変更内容

#### 1. `playwright.config.ts` の改善

**現在の設定 (`playwright.config.ts:1-36`):**
```typescript
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    navigationTimeout: 60_000,
    actionTimeout: 30_000,
  },
  webServer: {
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    // ...
  },
});
```

**修正後:**
```typescript
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 0,  // リトライ回数を増加
  workers: 1,
  reporter: process.env.CI ? "github" : "html",  // CI では GitHub reporter を使用
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    navigationTimeout: 90_000,  // 60秒 → 90秒
    actionTimeout: 45_000,      // 30秒 → 45秒
  },
  expect: {
    timeout: 30_000,  // expect のタイムアウトを明示的に設定
  },
  webServer: {
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,  // 60秒 → 120秒（CI 環境での起動遅延対策）
    env: {
      DATABASE_URL:
        "postgresql://postgres:postgres@localhost:5433/goukon_kanri_test",
      DIRECT_URL:
        "postgresql://postgres:postgres@localhost:5433/goukon_kanri_test",
    },
  },
});
```

**変更理由:**
- `webServer.timeout`: 120 秒に延長（CI 環境での Next.js 起動遅延対策）
- `navigationTimeout`: 90 秒に延長
- `actionTimeout`: 45 秒に延長
- `retries`: 3 回に増加（フレイキーテスト対策）
- `reporter`: CI では `github` reporter を使用（ログの可読性向上）
- `expect.timeout`: 30 秒を明示的に設定

#### 2. `.github/workflows/ci.yml` の改善

**現在の設定 (`ci.yml:55-88`):**
```yaml
e2e:
  runs-on: ubuntu-latest
  services:
    postgres:
      # ...
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - run: npm ci
    - run: npx prisma generate
    - run: npm run db:test:migrate
    - run: npm run build
    - run: npx playwright install --with-deps chromium
    - run: npm run test:e2e
```

**修正後:**
```yaml
e2e:
  runs-on: ubuntu-latest
  timeout-minutes: 30  # ジョブ全体のタイムアウトを設定
  services:
    postgres:
      image: postgres:15
      env:
        POSTGRES_USER: postgres
        POSTGRES_PASSWORD: postgres
        POSTGRES_DB: goukon_kanri_test
      ports:
        - 5433:5432
      options: >-
        --health-cmd "pg_isready -U postgres"
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: npm
    - run: npm ci
    - run: npx prisma generate

    # DB 接続確認ステップを追加
    - name: Wait for PostgreSQL
      run: |
        for i in {1..30}; do
          pg_isready -h localhost -p 5433 -U postgres && break
          echo "Waiting for PostgreSQL... ($i/30)"
          sleep 2
        done

    - run: npm run db:test:migrate
    - run: npm run build

    # Playwright のキャッシュを活用
    - name: Get Playwright version
      id: playwright-version
      run: echo "version=$(npm ls @playwright/test --json | jq -r '.dependencies["@playwright/test"].version')" >> $GITHUB_OUTPUT

    - name: Cache Playwright browsers
      uses: actions/cache@v4
      with:
        path: ~/.cache/ms-playwright
        key: playwright-${{ runner.os }}-${{ steps.playwright-version.outputs.version }}
        restore-keys: |
          playwright-${{ runner.os }}-

    - run: npx playwright install --with-deps chromium

    # E2E テスト実行（タイムアウト延長）
    - name: Run E2E tests
      run: npm run test:e2e
      timeout-minutes: 20

    - uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30
```

**変更理由:**
- `timeout-minutes: 30`: ジョブ全体のタイムアウトを設定
- PostgreSQL 接続確認ステップ: DB 準備完了を確実に待機
- Playwright ブラウザのキャッシュ: インストール時間を短縮
- テスト実行のタイムアウト: 20 分に設定

#### 3. `tests/e2e/helpers/clean-database.ts` の改善

**現在の実装:**
```typescript
export async function cleanDatabase(): Promise<void> {
  const prisma = new PrismaClient({
    datasourceUrl: testDatabaseUrl,
  });

  try {
    await prisma.$connect();
    await prisma.eventTodo.deleteMany();
    await prisma.participant.deleteMany();
    await prisma.event.deleteMany();
  } finally {
    await prisma.$disconnect();
  }
}
```

**修正後:**
```typescript
import { PrismaClient } from "@prisma/client";

const testDatabaseUrl =
  process.env.PLAYWRIGHT_DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5433/goukon_kanri_test";

// PrismaClient をシングルトンとして管理
let prisma: PrismaClient | null = null;

function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      datasourceUrl: testDatabaseUrl,
    });
  }
  return prisma;
}

/**
 * テストDBの全データを削除する。
 * E2Eテストの beforeEach で呼び出し、リトライ時のデータ残留を防ぐ。
 * 外部キー制約の順序に従い、子テーブルから削除する。
 */
export async function cleanDatabase(): Promise<void> {
  const client = getPrismaClient();

  await client.$connect();
  await client.eventTodo.deleteMany();
  await client.participant.deleteMany();
  await client.event.deleteMany();
}

/**
 * テスト終了時に PrismaClient を切断する。
 * global-teardown.ts から呼び出す。
 */
export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
```

**変更理由:**
- PrismaClient のシングルトン化: 接続プールの枯渇を防止
- `disconnectDatabase()` 関数の追加: テスト終了時の明示的な切断

#### 4. `tests/e2e/global-teardown.ts` の新規作成

```typescript
import { disconnectDatabase } from "./helpers/clean-database";

async function globalTeardown() {
  await disconnectDatabase();
}

export default globalTeardown;
```

#### 5. `playwright.config.ts` への globalTeardown 追加

```typescript
export default defineConfig({
  // ...
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",  // 追加
  // ...
});
```

---

## 影響範囲

### 影響を受けるコンポーネント
- E2E テスト全体（タイムアウト設定の変更）
- CI ワークフロー（キャッシュ、タイムアウト設定）
- テスト用 DB 接続（PrismaClient シングルトン化）

### 破壊的変更
- なし（既存のテストロジックには影響しない）

### リスク
- **低**: タイムアウト延長とキャッシュ追加のみで、テストロジックは変更しない
- PrismaClient シングルトン化により、テスト間の状態分離が維持されることを確認する必要あり

---

## テストケース（カバレッジ 100% 目標）

### 修正の検証方法

#### 1. ローカルでの CI 環境シミュレーション

```bash
# CI 環境変数を設定してテスト実行
CI=true npm run test:e2e
```

#### 2. CI での検証項目

| 検証項目 | 期待結果 |
|---------|---------|
| E2E テストジョブが成功する | 全テストが PASS |
| webServer 起動が成功する | 120 秒以内に起動 |
| テストリトライが機能する | フレイキーテストが最大 3 回リトライで成功 |
| Playwright キャッシュが機能する | 2 回目以降のブラウザインストールが高速化 |

#### 3. テストファイル別の確認

| ファイル | テスト数 | 確認ポイント |
|---------|---------|-------------|
| `dashboard.spec.ts` | 4 | 月別サマリー、年度切替、ナビゲーション |
| `event-crud.spec.ts` | 6 | イベント CRUD 操作 |
| `participant-payment.spec.ts` | 6 | 参加者追加、決済更新 |
| `reports.spec.ts` | 2 | 収支レポート表示、フィルタ |
| `responsive.spec.ts` | 7 | レスポンシブ対応 |
| `schedule-line.spec.ts` | 3 | スケジュール、LINE テキスト |

### ユニットテスト

`clean-database.ts` の変更に対するテストは不要（E2E テストのヘルパーであり、E2E テスト自体が検証となる）。

---

## 実装手順

### Step 1: PrismaClient シングルトン化
1. `tests/e2e/helpers/clean-database.ts` を修正
2. `tests/e2e/global-teardown.ts` を新規作成
3. `playwright.config.ts` に `globalTeardown` を追加

### Step 2: Playwright 設定の改善
1. `playwright.config.ts` のタイムアウト設定を更新
2. CI 用の reporter を設定
3. リトライ回数を増加

### Step 3: CI ワークフローの改善
1. `.github/workflows/ci.yml` を修正
2. PostgreSQL 接続確認ステップを追加
3. Playwright ブラウザのキャッシュを追加
4. タイムアウト設定を追加

### Step 4: ローカルでの検証
```bash
# CI 環境をシミュレート
CI=true npm run test:e2e
```

### Step 5: PR 作成と CI 確認
1. 変更をコミット
2. PR を作成
3. CI が全て成功することを確認

---

## 見積もり

| 項目 | 規模 |
|------|------|
| 変更規模 | **S（小）** |
| 新規ファイル | 1 ファイル（global-teardown.ts） |
| 変更ファイル | 3 ファイル（playwright.config.ts, ci.yml, clean-database.ts） |
| リスク | 低（テストロジック変更なし） |

---

## 代替案

### 選択しなかった代替案

| 代替案 | 不採用理由 |
|--------|------------|
| E2E テストのスキップ | 品質保証が維持できない |
| テストの並列実行無効化 | 既に workers: 1 で無効化済み |
| networkidle の削除 | テストの信頼性が低下する |
| CI 専用のテスト設定ファイル | 設定の重複が発生し、メンテナンス性が低下 |

---

## 補足: CI ログ分析が必要な場合

CI ログに直接アクセスできなかったため、上記は一般的な E2E テスト失敗の原因に基づく設計です。

実際の CI ログで以下を確認することを推奨：

1. **webServer 起動ログ**: 起動タイムアウトの有無
2. **テスト失敗ログ**: 具体的なテストケースと失敗理由
3. **Playwright trace**: リトライ時のトレースファイル

ログ確認後、原因が特定できた場合は設計を更新する。
