# Quickstart: Claude Code × GitHub Actions AI開発自動化

**Feature**: `002-claude-github-actions`
**Date**: 2026-03-20

## 前提条件

- GitHub リポジトリの管理者権限
- Anthropic API キー（[console.anthropic.com](https://console.anthropic.com) で取得）
- GitHub Actions が有効化されたリポジトリ

## セットアップ手順

### Step 1: Claude Code GitHub App のインストール

1. [github.com/apps/claude](https://github.com/apps/claude) にアクセス
2. 「Install」をクリック
3. 対象リポジトリ（`goukon-kanri`）を選択
4. 権限を確認して承認

**確認方法**: リポジトリの Settings → Integrations → GitHub Apps で確認

### Step 2: API キーの設定

1. リポジトリの Settings → Secrets and variables → Actions にアクセス
2. 「New repository secret」をクリック
3. Name: `ANTHROPIC_API_KEY`
4. Secret: Anthropic API キーを貼り付け
5. 「Add secret」をクリック

**注意**: キーの前後に余分なスペースが入らないよう注意

### Step 3: ワークフローファイルの確認

`.github/workflows/claude.yml` がリポジトリに存在することを確認。

## 使い方

### Issue から PR を自動生成

Issue のコメントに以下を投稿:
```
@claude このIssueの内容を実装してPRを作成してください
```

### レビューコメントへの自動対応

PR のレビューコメントに以下を投稿:
```
@claude エラーハンドリングを追加してください
```

### CI エラーの自動修正

CI が失敗した PR のコメントに以下を投稿:
```
@claude CIのテストが失敗しています。修正してください
```

## 動作確認

1. テスト用 Issue を作成し、コメントに `@claude この Issue の内容を説明してください` と投稿
2. GitHub Actions タブでワークフローが起動することを確認
3. Claude からの応答コメントが Issue に投稿されることを確認

## トラブルシューティング

| 症状 | 原因 | 対処法 |
|------|------|--------|
| Claude が反応しない | GitHub App 未インストール | Settings → Integrations → GitHub Apps で確認 |
| Claude が反応しない | API キー未設定/誤り | Secrets の設定を確認 |
| 権限エラー | permissions 不足 | ワークフローの permissions ブロックを確認 |
| タイムアウト | 処理が30分超過 | タスクを分割して再依頼 |
| レート制限 | API 使用量超過 | 実行頻度を確認、プランのアップグレードを検討 |
