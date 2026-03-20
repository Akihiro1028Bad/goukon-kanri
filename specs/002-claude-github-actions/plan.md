# Implementation Plan: Claude Code × GitHub Actions AI開発自動化

**Branch**: `002-claude-github-actions` | **Date**: 2026-03-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-claude-github-actions/spec.md`

## Summary

GitHub Actions に Claude Code（`anthropics/claude-code-action@v1`）を統合し、Issue→PR 自動生成、レビューコメント自動対応、CIエラー自動修正の3つのユースケースを実現する。成果物は単一のワークフローファイル（`.github/workflows/claude.yml`）とセットアップ手順ドキュメント。データベーススキーマの変更は不要。

## Technical Context

**Language/Version**: YAML（GitHub Actions ワークフロー定義）
**Primary Dependencies**: `anthropics/claude-code-action@v1`, Claude Code GitHub App (`https://github.com/apps/claude`)
**Storage**: N/A（DB変更なし）
**Testing**: 手動テスト（Issue/PR でのコメントによる動作確認）
**Target Platform**: GitHub Actions（ubuntu-latest ランナー）
**Project Type**: CI/CD 設定（インフラストラクチャ）
**Performance Goals**: Issue→PR 10分以内、レビュー対応 5分以内（Claude API の応答速度に依存）
**Constraints**: タイムアウト 30分、MEMBER/OWNER のみ実行可能、concurrency 制御で並行実行防止
**Scale/Scope**: シングルリポジトリ、1 ワークフローファイル

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 適用性 | 状態 |
|------|--------|------|
| I. Server Components First | 非該当（UI コンポーネントなし） | PASS |
| II. Type Safety | 非該当（TypeScript コードなし、YAML のみ） | PASS |
| III. TDD | 非該当（GitHub Actions ワークフローは自動テスト不可、手動検証） | PASS（例外） |
| IV. 3-Layer Architecture | 非該当（アプリケーションコード変更なし） | PASS |
| V. Serverless-Ready Data Access | 非該当（DB 変更なし） | PASS |
| VI. Accessible & Responsive UI | 非該当（UI 変更なし） | PASS |
| VII. Simplicity (YAGNI) | 適用: 単一ワークフローファイル、最小限の設定 | PASS |

**Post-Design Re-check**: 全項目 PASS。本機能は CI/CD インフラ設定であり、アプリケーションコードの変更を伴わないため、大部分の原則は非該当。原則 VII（YAGNI）に従い、3つの基本ユースケースのみを単一ファイルで実装。

## Project Structure

### Documentation (this feature)

```text
specs/002-claude-github-actions/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
.github/
└── workflows/
    ├── ci.yml           # 既存: CI パイプライン（lint, test, e2e）
    └── claude.yml       # 新規: Claude Code Action ワークフロー
```

**Structure Decision**: 既存の `.github/workflows/` ディレクトリに `claude.yml` を1ファイル追加するのみ。アプリケーションコード（`src/`）への変更は不要。

## ワークフローファイル設計

### `.github/workflows/claude.yml` の構成

```yaml
name: Claude Code Assistant

on:
  issue_comment:
    types: [created]
  issues:
    types: [opened, assigned]
  pull_request_review_comment:
    types: [created]
  pull_request_review:
    types: [submitted]

permissions:
  contents: write
  pull-requests: write
  issues: write

concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.event.issue.number || github.run_id }}
  cancel-in-progress: false

jobs:
  claude-code:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    if: |
      (github.event_name == 'issue_comment' &&
       contains(github.event.comment.body, '@claude') &&
       (github.event.comment.author_association == 'MEMBER' ||
        github.event.comment.author_association == 'OWNER')) ||
      (github.event_name == 'pull_request_review_comment' &&
       contains(github.event.comment.body, '@claude') &&
       (github.event.comment.author_association == 'MEMBER' ||
        github.event.comment.author_association == 'OWNER')) ||
      (github.event_name == 'pull_request_review' &&
       contains(github.event.review.body, '@claude') &&
       (github.event.review.author_association == 'MEMBER' ||
        github.event.review.author_association == 'OWNER')) ||
      (github.event_name == 'issues' &&
       (contains(github.event.issue.body, '@claude') ||
        contains(github.event.issue.title, '@claude')))
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run Claude Code
        uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          additional_permissions: "actions: read"
```

### 設計判断

1. **単一ジョブ**: 3つのユースケースは同一 Action を使うため、トリガーイベントの `if:` 条件で振り分け
2. **`fetch-depth: 0`**: 完全な git 履歴を Claude に提供し、コンテキスト理解を向上
3. **`additional_permissions: actions: read`**: CI エラーログの読み取りを可能にする
4. **`github_token` 省略**: デフォルトで `${{ secrets.GITHUB_TOKEN }}` が使用される
5. **`trigger_phrase` 省略**: デフォルト `@claude` をそのまま使用

## Complexity Tracking

本機能は Constitution Check の違反なし。複雑性の正当化は不要。

## 実装タスク概要

1. `.github/workflows/claude.yml` の作成
2. GitHub App のインストール（手動）
3. `ANTHROPIC_API_KEY` の GitHub Secrets 登録（手動）
4. 動作確認テスト（手動: Issue コメント → PR 生成確認）
5. 動作確認テスト（手動: PR レビューコメント → 修正コミット確認）
