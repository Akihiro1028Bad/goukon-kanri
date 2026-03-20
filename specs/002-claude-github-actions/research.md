# Research: Claude Code × GitHub Actions AI開発自動化

**Feature**: `002-claude-github-actions`
**Date**: 2026-03-20

## Decision 1: GitHub Action のバージョン

- **Decision**: `anthropics/claude-code-action@v1` を使用
- **Rationale**: `@v1` は最新の v1.0.x パッチリリースを追跡するフローティングタグ。公式サンプルでも推奨。特定バージョンへのピンが必要な場合は `@v1.0.75`（2026-03-18 時点最新）
- **Alternatives considered**:
  - `@main`: 不安定、破壊的変更のリスク → 却下
  - `@v1.0.75`: 安定だがセキュリティパッチの自動適用なし → 将来検討

## Decision 2: GitHub App

- **Decision**: `https://github.com/apps/claude` をリポジトリにインストール
- **Rationale**: Claude Code Action がリポジトリにアクセスするための必須コンポーネント。PR 作成・コメント投稿等に必要な権限を提供
- **Alternatives considered**: なし（公式アプリが唯一の選択肢）

## Decision 3: `@claude` メンション検出メカニズム

- **Decision**: ワークフロー `if:` 条件 + Action 内部の `trigger_phrase` 検出の二層構造
- **Rationale**: `if:` 条件がないと全コメントでジョブがスピンアップしランナー時間が無駄になる。Action 内部でも `trigger_phrase`（デフォルト `@claude`）をチェックするため、二重防御になる
- **公式推奨 `if:` 条件**:
  ```yaml
  if: |
    (github.event_name == 'issue_comment' && contains(github.event.comment.body, '@claude')) ||
    (github.event_name == 'pull_request_review_comment' && contains(github.event.comment.body, '@claude')) ||
    (github.event_name == 'pull_request_review' && contains(github.event.review.body, '@claude')) ||
    (github.event_name == 'issues' && (contains(github.event.issue.body, '@claude') || contains(github.event.issue.title, '@claude')))
  ```

## Decision 4: 権限設定

- **Decision**: 最小権限の原則に基づく以下の設定
  ```yaml
  permissions:
    contents: write
    pull-requests: write
    issues: write
  ```
- **Rationale**: Claude がファイル読み書き、ブランチ作成、PR 操作、Issue コメントを行うために必要な最小限の権限
- **Alternatives considered**:
  - `actions: read` 追加: CI 結果の読み取りに有用だが、`additional_permissions` パラメータで Action 側から追加可能 → 初期段階では不要

## Decision 5: Concurrency 制御

- **Decision**: PR/Issue 番号でグループ化し、`cancel-in-progress: false` を設定
  ```yaml
  concurrency:
    group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.event.issue.number || github.run_id }}
    cancel-in-progress: false
  ```
- **Rationale**: Claude のセッションは途中キャンセルすると中途半端な状態になるため `cancel-in-progress: false` が重要。PR/Issue 番号でグループ化し同一対象への並行実行を防ぐ
- **Alternatives considered**:
  - `cancel-in-progress: true`: 新しいリクエストで古い実行をキャンセル → Claude が中途半端なコミットを残すリスク → 却下

## Decision 6: メンバー制限（セキュリティ）

- **Decision**: ワークフロー `if:` 条件に `author_association` チェックを追加
  ```yaml
  github.event.comment.author_association == 'MEMBER' ||
  github.event.comment.author_association == 'OWNER'
  ```
- **Rationale**: 外部ユーザーからの `@claude` メンションによる不正利用（API コスト攻撃、悪意あるコード生成）を防止
- **Alternatives considered**:
  - Action 側の `allowed_non_write_users` パラメータ: セキュリティリスクが高い → 却下
  - `COLLABORATOR` も許可: 最初は MEMBER/OWNER のみに絞り、必要に応じて拡張 → 将来検討

## Decision 7: ワークフローファイル構成

- **Decision**: 単一ファイル `.github/workflows/claude.yml` に統合
- **Rationale**: 3 つのユースケース（Issue→PR、レビュー対応、CI修正）は同一の Action を使い、トリガーイベントが異なるだけ。単一ファイルの方が管理が簡単
- **Alternatives considered**:
  - ユースケースごとに分離（3 ファイル）: 管理コスト増大、設定の重複 → 却下

## Decision 8: 主要 Action パラメータ

- **Decision**: 以下のパラメータを使用
  - `anthropic_api_key`: `${{ secrets.ANTHROPIC_API_KEY }}`
  - `github_token`: `${{ secrets.GITHUB_TOKEN }}`（デフォルト）
  - `timeout-minutes`: `30`
  - `trigger_phrase`: `@claude`（デフォルト）
  - `additional_permissions`: `actions: read`（CI結果読み取り用）
- **Rationale**: 最小限の設定で3つのユースケースをカバー。`additional_permissions: actions: read` で CI エラーログへのアクセスを可能にする
