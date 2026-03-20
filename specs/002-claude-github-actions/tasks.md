# Tasks: Claude Code × GitHub Actions AI開発自動化

**Input**: Design documents from `/specs/002-claude-github-actions/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Tests**: 手動テストのみ（GitHub Actions ワークフローは自動テスト不可、plan.md の Constitution Check で TDD 例外と判定済み）

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- ワークフローファイル: `.github/workflows/claude.yml`
- 既存 CI: `.github/workflows/ci.yml`

---

## Phase 1: Setup（GitHub 側の事前設定）

**Purpose**: Claude Code Action を動作させるために必要な GitHub 側のインフラ設定

- [ ] T001 Claude Code GitHub App をリポジトリにインストール（https://github.com/apps/claude → Install → goukon-kanri リポジトリを選択）
- [ ] T002 Anthropic API キーを GitHub Secrets に登録（リポジトリ Settings → Secrets and variables → Actions → New repository secret → Name: `ANTHROPIC_API_KEY`）

**Checkpoint**: GitHub App がインストール済み、ANTHROPIC_API_KEY が Secrets に登録済みであることを確認

---

## Phase 2: Foundational（ワークフローファイル作成）

**Purpose**: 3つのユースケースすべてを支える単一ワークフローファイルの作成

- [x] T003 `.github/workflows/claude.yml` を作成: ワークフロー名、トリガーイベント（`issue_comment`, `issues`, `pull_request_review_comment`, `pull_request_review`）、permissions（`contents: write`, `pull-requests: write`, `issues: write`）、concurrency 設定（PR/Issue 番号でグループ化、`cancel-in-progress: false`）を定義
- [x] T004 `.github/workflows/claude.yml` の jobs セクションを作成: `claude-code` ジョブ、`runs-on: ubuntu-latest`、`timeout-minutes: 30`、`if:` 条件（`@claude` メンション検出 + `author_association` が MEMBER/OWNER チェック）を定義
- [x] T005 `.github/workflows/claude.yml` の steps セクションを作成: `actions/checkout@v4`（`fetch-depth: 0`）、`anthropics/claude-code-action@v1`（`anthropic_api_key`, `additional_permissions: actions: read`）を定義

**Checkpoint**: `.github/workflows/claude.yml` が完成し、YAML 構文が正しいことを確認

---

## Phase 3: User Story 1 - Issue から PR を自動生成 (Priority: P1) 🎯 MVP

**Goal**: Issue に `@claude` メンションを含むコメントを投稿すると、Claude が自動的にコードを実装して PR を作成する

**Independent Test**: テスト用 Issue を作成し、`@claude このIssueの内容を説明してPRを作成してください` とコメントして PR が自動作成されることを確認

### Implementation for User Story 1

- [ ] T006 [US1] テスト用 Issue を作成し、`@claude` メンションを含むコメントを投稿して Claude が反応することを確認
- [ ] T007 [US1] Claude が作成した PR に `Closes #N` が含まれ、元 Issue へのリンクが存在することを確認（FR-011）
- [ ] T008 [US1] リポジトリメンバー以外のユーザーからの `@claude` メンションで Claude が起動しないことを確認（FR-006）

**Checkpoint**: Issue → PR 自動生成フローが正常に動作し、セキュリティ制限も機能していることを確認

---

## Phase 4: User Story 2 - レビューコメントへの自動対応 (Priority: P1)

**Goal**: PR のレビューコメントで `@claude` メンションを投稿すると、Claude がコードを自動修正して同じ PR にコミットをプッシュする

**Independent Test**: オープンな PR のレビューコメントに `@claude` メンションで修正依頼を投稿し、修正コミットが追加されることを確認

### Implementation for User Story 2

- [ ] T009 [US2] オープンな PR にレビューコメントで `@claude` メンションを含む修正依頼を投稿し、修正コミットが自動追加されることを確認
- [ ] T010 [US2] `@claude` メンションを含まないレビューコメントで Claude が起動しないことを確認

**Checkpoint**: レビューコメント → 自動修正フローが正常に動作することを確認

---

## Phase 5: User Story 3 - CIエラーの自動修正 (Priority: P2)

**Goal**: CI が失敗した PR で `@claude` にエラー修正を依頼すると、Claude がエラーログを分析して自動修正する

**Independent Test**: 意図的に CI を失敗させた PR で `@claude CIのエラーを修正してください` とコメントし、修正コミットが追加されることを確認

### Implementation for User Story 3

- [ ] T011 [US3] CI が失敗した PR のコメントに `@claude CIのテストが失敗しています。修正してください` と投稿し、Claude が修正コミットを追加することを確認
- [ ] T012 [US3] CI が成功している PR で `@claude CIを修正して` とコメントした場合、Claude が適切に応答することを確認

**Checkpoint**: CIエラー自動修正フローが正常に動作することを確認

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: ドキュメント整備と最終確認

- [ ] T013 concurrency 設定の動作確認: 同一 Issue/PR に対して連続で `@claude` コメントを投稿し、直列化されることを確認（FR-012）
- [ ] T014 quickstart.md の手順に沿って全セットアップが完了していることを最終確認

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 依存なし — 即時開始可能
- **Phase 2 (Foundational)**: Phase 1 の完了に依存（GitHub App + API キーがないとワークフローが動作しない）
- **Phase 3-5 (User Stories)**: Phase 2 の完了に依存（ワークフローファイルが必要）
  - US1 と US2 は並行実施可能（ただし手動テストのため通常は順次実行）
  - US3 は US1 or US2 で作成された PR を利用するため、US1 完了後が望ましい
- **Phase 6 (Polish)**: Phase 3-5 の完了に依存

### User Story Dependencies

- **User Story 1 (P1)**: Phase 2 完了後に開始可能 — 他のストーリーへの依存なし
- **User Story 2 (P1)**: Phase 2 完了後に開始可能 — US1 で作成された PR を利用可能だが独立テスト可能
- **User Story 3 (P2)**: Phase 2 完了後に開始可能 — CI 失敗 PR が必要なため US1/US2 の PR を活用

### Parallel Opportunities

- T001 と T002 は並行実施可能（異なる GitHub 設定画面）
- T003, T004, T005 は同一ファイルのため順次実行
- US1 の検証（T006-T008）と US2 の検証（T009-T010）は異なる Issue/PR で並行可能

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 完了: GitHub App インストール + API キー設定
2. Phase 2 完了: `claude.yml` ワークフローファイル作成
3. Phase 3 完了: Issue → PR 自動生成の動作確認
4. **STOP and VALIDATE**: US1 が正常動作することを確認
5. main ブランチにマージして本番利用開始

### Incremental Delivery

1. Setup + Foundational → ワークフロー基盤完成
2. User Story 1 → Issue→PR 自動生成が利用可能（MVP!）
3. User Story 2 → レビュー自動対応が利用可能
4. User Story 3 → CIエラー自動修正が利用可能
5. 各ストーリーは独立して価値を提供

---

## Notes

- 本機能はすべて手動テストで検証（GitHub Actions ワークフローの自動テストは不可）
- Phase 1 の GitHub App インストールと Secrets 登録はリポジトリ管理者権限が必要
- ワークフローファイルの作成（Phase 2）は T003-T005 で段階的に記述しているが、実質的には1つの YAML ファイルへの記述
- 各 User Story の検証タスクは実際の GitHub Issue/PR 上での手動操作が必要
