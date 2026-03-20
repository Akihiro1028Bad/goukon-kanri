# Data Model: Claude Code × GitHub Actions AI開発自動化

**Feature**: `002-claude-github-actions`
**Date**: 2026-03-20

## 概要

本機能はデータベーススキーマの変更を伴わない。成果物は GitHub Actions ワークフロー設定ファイル（YAML）と、GitHub 側の設定（Secrets、App インストール）のみ。

## エンティティ

### ワークフロー設定ファイル

- **パス**: `.github/workflows/claude.yml`
- **形式**: GitHub Actions YAML
- **属性**:
  - `name`: ワークフロー名
  - `on`: トリガーイベント（`issue_comment`, `issues`, `pull_request_review_comment`, `pull_request_review`）
  - `permissions`: 権限設定（`contents: write`, `pull-requests: write`, `issues: write`）
  - `concurrency`: 並行制御設定（PR/Issue 単位で直列化）
  - `jobs`: ジョブ定義（`claude-code` ジョブ）

### GitHub Secrets

- **ANTHROPIC_API_KEY**: Anthropic API キー
  - 設定場所: リポジトリ Settings → Secrets and variables → Actions
  - 参照方法: `${{ secrets.ANTHROPIC_API_KEY }}`

### GitHub App

- **Claude Code GitHub App**: `https://github.com/apps/claude`
  - リポジトリへのインストールが必須
  - 権限: Contents (R/W), Pull Requests (R/W), Issues (R/W)

## 状態遷移

本機能には明示的な状態遷移はない。GitHub Actions のジョブライフサイクル（queued → in_progress → completed/failed）に従う。

## 既存スキーマへの影響

なし。データベーススキーマの変更は不要。
