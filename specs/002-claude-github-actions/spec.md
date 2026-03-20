# Feature Specification: Claude Code × GitHub Actions AI開発自動化

**Feature Branch**: `002-claude-github-actions`
**Created**: 2026-03-20
**Status**: Draft
**Input**: User description: "Claude Code × GitHub Actions でAI開発自動化（Issue→PR自動生成、レビューコメント自動対応、CIエラー自動修正）"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Issue から PR を自動生成 (Priority: P1)

開発者が GitHub Issue に `@claude` メンションを含むコメントを投稿すると、Claude が Issue の内容を分析し、自動的にコードを実装して PR を作成する。これにより、単純な機能追加やバグ修正の初期実装を自動化できる。

**Why this priority**: Issue → PR 変換は最も基本的かつ頻繁に使われるユースケースであり、開発効率への影響が最大。

**Independent Test**: Issue に `@claude` メンションでタスクを記述し、PR が自動作成されることを確認する。

**Acceptance Scenarios**:

1. **Given** 開いている Issue が存在する, **When** コメントに `@claude このIssueを実装してPRを作成してください` と投稿する, **Then** Claude が Issue の要件を分析し、新しいブランチにコードを実装して PR を作成する
2. **Given** Issue に `@claude` メンションがないコメントが投稿される, **When** ワークフローがトリガーされる, **Then** Claude は起動せず何も実行されない
3. **Given** `@claude` メンションが含まれるコメントが投稿される, **When** コメント投稿者がリポジトリメンバーでない, **Then** セキュリティのため Claude は起動しない

---

### User Story 2 - レビューコメントへの自動対応 (Priority: P1)

PR のコードレビューで `@claude` メンションを含むレビューコメントが投稿されると、Claude がレビュー指摘に基づいてコードを自動修正し、同じ PR にプッシュする。

**Why this priority**: コードレビュー対応は日常的に発生し、タイポ修正やコメント追加などの単純な対応を自動化することで大幅な時間削減が見込める。

**Independent Test**: PR にレビューコメントで `@claude` メンションを投稿し、指摘内容に基づいた修正コミットが自動追加されることを確認する。

**Acceptance Scenarios**:

1. **Given** オープンな PR が存在する, **When** レビューコメントに `@claude エラーハンドリングを追加してください` と投稿する, **Then** Claude が該当コードを修正し、PR に新しいコミットをプッシュする
2. **Given** PR にレビューコメントが投稿される, **When** コメントに `@claude` メンションが含まれない, **Then** Claude は起動しない

---

### User Story 3 - CIエラーの自動修正 (Priority: P2)

CI（GitHub Actions の既存テスト・リント等）が失敗した際に、開発者が PR コメントで `@claude` にエラー修正を依頼すると、Claude がエラーログを分析して自動修正する。

**Why this priority**: CI エラーの修正は手動で行う場合が多く自動化の効果は高いが、Issue→PR やレビュー対応より使用頻度が低い。

**Independent Test**: CI が失敗した PR で `@claude CIのエラーを修正してください` とコメントし、修正コミットが追加されることを確認する。

**Acceptance Scenarios**:

1. **Given** CI テストが失敗した PR が存在する, **When** PR コメントに `@claude CIのテストが失敗しています。修正してください` と投稿する, **Then** Claude がエラーログを分析し、修正コードをコミットする
2. **Given** CI が成功している PR が存在する, **When** `@claude CIを修正して` とコメントする, **Then** Claude が「CI は正常に通過しています」と応答する

---

### Edge Cases

- `@claude` メンションを含むが具体的な指示がない場合 → Claude が指示の明確化を求めるコメントを返す
- 同時に複数の `@claude` リクエストが発生した場合 → concurrency 設定により同一 PR/Issue 単位で直列化され、後続リクエストはキューイングされる
- Claude が生成したコードが CI テストに失敗した場合 → 開発者が追加の `@claude` コメントで修正を依頼する
- API レート制限に達した場合 → ワークフローがエラーメッセージを PR/Issue にコメントする

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: システムは `@claude` メンションを含む Issue コメントをトリガーに Claude Code Action を起動しなければならない
- **FR-002**: システムは `@claude` メンションを含む PR レビューコメントをトリガーに Claude Code Action を起動しなければならない
- **FR-003**: Claude は Issue の要件を分析し、新しいブランチにコードを実装して PR を作成できなければならない
- **FR-004**: Claude は PR のレビューコメントに基づいてコードを修正し、同じ PR にコミットをプッシュできなければならない
- **FR-005**: Claude は CI エラーログを分析し、修正コードを生成できなければならない
- **FR-011**: Claude が Issue から PR を作成する際、PR 本文に `Closes #N` を含めて元 Issue へのリンクと自動クローズを実現しなければならない
- **FR-012**: 同一 PR/Issue に対する `@claude` リクエストは直列化（concurrency 制御）し、並行実行によるコード競合を防がなければならない
- **FR-006**: ワークフローはリポジトリメンバー（MEMBER/OWNER）からのコメントのみを処理しなければならない
- **FR-007**: Claude はプロジェクトの CLAUDE.md に定義されたコーディング規約・ルールに従ってコードを生成しなければならない
- **FR-008**: ワークフロー実行に必要な権限（contents: write, pull-requests: write, issues: write）が明示的に定義されなければならない
- **FR-009**: API キーは GitHub Secrets で安全に管理されなければならない
- **FR-010**: ワークフローのタイムアウトは 30 分に設定しなければならない

### Key Entities

- **GitHub Actions ワークフロー**: Claude Code Action の実行を制御する設定ファイル
- **Claude Code GitHub App**: リポジトリにインストールされる GitHub App。Claude がリポジトリにアクセスするための認証基盤
- **ANTHROPIC_API_KEY**: Anthropic API へのアクセスキー。GitHub Secrets として保管
- **CLAUDE.md**: プロジェクト固有のルール・規約を Claude に伝えるための設定ファイル（既存）

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Issue に `@claude` コメントを投稿してから PR が作成されるまでの時間が 10 分以内である
- **SC-002**: レビューコメントに `@claude` で修正依頼してから修正コミットがプッシュされるまでの時間が 5 分以内である
- **SC-003**: 単純なレビュー対応（タイポ修正、コメント追加等）の手動対応時間を 50% 以上削減できる
- **SC-004**: リポジトリメンバー以外からの `@claude` メンションでは一切のアクションが実行されない

## Clarifications

### Session 2026-03-20

- Q: ワークフローのタイムアウト値は何分に設定すべきか？ → A: 30分（中規模タスクまで対応）
- Q: Issue から PR 作成時に自動ラベル・リンクを付与すべきか？ → A: Issue リンクのみ付与（`Closes #N` で自動クローズ）
- Q: 同一 PR/Issue での並行リクエストをどう制御すべきか？ → A: 同一 PR/Issue 単位で直列化（concurrency 設定）

## Assumptions

- Anthropic API キーを既に取得済み、または取得可能である
- リポジトリに GitHub Actions が有効化されている
- リポジトリ管理者が GitHub App のインストールと Secrets の設定を行える
- 既存の CLAUDE.md がプロジェクトのコーディング規約を十分にカバーしている
- API 使用量は現在の Anthropic API プランの制限内で運用できる

## Scope & Boundaries

### In Scope

- GitHub Actions ワークフローファイルの作成
- セットアップ手順のドキュメント化（GitHub App インストール、API キー設定）
- 基本的な 3 つのユースケース（Issue→PR、レビュー対応、CIエラー修正）
- セキュリティ設定（権限制限、メンバー制限）
- コスト最適化設定（メンバー制限による不要実行の抑止）

### Out of Scope

- AWS Bedrock / Google Vertex AI 経由での実行
- カスタムワークフロー（ドキュメント自動更新、セキュリティレビュー自動化等）
- Depot Runners 等の高速ランナー導入
- Claude Code SDK を使ったローカルテスト環境
- Harden-Runner 等の追加セキュリティツール導入
