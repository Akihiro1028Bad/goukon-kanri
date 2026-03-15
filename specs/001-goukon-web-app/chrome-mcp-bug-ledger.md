# Chrome MCP 総合動作確認 不具合台帳（再監査: 2026-03-15）

## 実施条件
- 対象: `/`, `/events`, `/events/new`, `/events/[id]`, `/events/[id]/edit`, `/participants`, `/schedule`, `/reports`, `not-found`
- デバイス: `375x667` / `768x1024` / `1280x800`
- 基準化: DBリセット後に `Seeded 100 events and 1000 participants.` を確認

## 先行ゲート（自動）
| 項目 | 結果 |
|---|---|
| `npm run test:run` | PASS（124 passed） |
| `npm run test:e2e` | PASS（27 passed） |
| `npm run build` | PASS |

## MCPカバレッジ結果
| 区分 | 結果 |
|---|---|
| 画面カバレッジ | 完了（全対象ルートを3デバイスで巡回） |
| 観点カバレッジ | 完了（CRUD/検索/フィルタ/遷移/モーダル/トースト/レスポンシブ/性能） |
| 再現性 | 完了（台帳記載項目は再現済み） |

## 性能計測（Chrome Trace）
| URL | 前回LCP | 今回LCP | 今回CLS | 今回TTFB | 証跡 |
|---|---:|---:|---:|---:|---|
| `/` | 419ms | 430ms | 0.00 | 56ms | `/tmp/chrome-mcp-audit/trace-dashboard-20260315.json` |
| `/events` | 472ms | 484ms | 0.00 | 19ms | `/tmp/chrome-mcp-audit/trace-events-20260315.json` |

## 不具合台帳（再監査版）
| ID | 画面URL | デバイス | 再現手順 | 実際結果 | 期待結果 | 影響度 | 発生頻度 | 判定 | 証跡 |
|---|---|---|---|---|---|---|---|---|---|
| BUG-001 | `/events/new` | Desktop / Tablet / Mobile | 1) 日付を直接入力（例: `2026-03-01`） 2) 必須項目入力 3) 登録押下 | （修正前）`Invalid date` で遷移しない | `YYYY-MM-NNN` の詳細ページへ遷移 | High | 修正前は高頻度 | **Resolved** | `tests/e2e/event-crud.spec.ts`（E2E-001 PASS）, `tests/e2e/schedule-line.spec.ts`（E2E-031/032 PASS） |
| BUG-002 | `/schedule`（`2026-03-004`） | Desktop / Tablet / Mobile | 1) スケジュール行の残枠確認 2) LINEモーダル表示を確認 | 行内とLINE文面が `男性あと1名 / 女性あと2名` で一致 | 同一ロジックで一致 | High | 再発なし | **Resolved** | `/tmp/chrome-mcp-audit/mobile-375-schedule-line-modal-2026-03-004.png`, `/tmp/chrome-mcp-audit/desktop-1280-schedule-line-modal-2026-03-004.png` |
| BUG-003 | 主要6画面 | Mobile（375x667） | 各画面で `scrollWidth <= clientWidth` を確認 | 全画面で横overflowなし | 横overflowなし | Medium | 再発なし | **Resolved** | `/tmp/chrome-mcp-audit/mobile-375-dashboard.png`, `/tmp/chrome-mcp-audit/mobile-375-events.png`, `/tmp/chrome-mcp-audit/mobile-375-event-detail-2026-03-004.png`, `/tmp/chrome-mcp-audit/mobile-375-participants.png`, `/tmp/chrome-mcp-audit/mobile-375-schedule.png`, `/tmp/chrome-mcp-audit/mobile-375-reports.png` |
| BUG-004 | `/events` | Desktop / Tablet / Mobile | 1) 一覧ヘッダーでソート操作を試行 2) DOM確認（`th button` / `aria-sort`） | （修正前）ソートUIが存在せず、並び替え操作不可（`th button = 0`） | ヘッダー操作で並び替え可能 | Medium | 修正前は高頻度 | **Resolved** | `tests/e2e/event-crud.spec.ts`（E2E-006 PASS）, DOM確認（`th button=5`、`th[aria-sort]` あり） |

## 整合性チェック結果
- 決済更新 -> サマリー反映: PASS（`2026-03-004` の決済済み収入が `¥50,000` に更新、未回収 `¥0`）。
- ダッシュボード月次集計: PASS（3月の決済済み `¥392,000`、DB集計 `392000` と一致）。
- レポート金額整合: PASS（`2026-03-004` 決済済み `¥50,000`、DB集計 `50000` と一致）。
- スケジュール残枠とLINE文面: PASS（`2026-03-004` で一致）。
- イベント作成 -> 一覧反映: PASS（BUG-001解消）。

## 補足
- E2Eの全27ケースがPASS（テストDB固定化 + シナリオ整合済み）。
- `not-found` は3デバイスで表示正常: `/tmp/chrome-mcp-audit/mobile-375-not-found.png`, `/tmp/chrome-mcp-audit/tablet-768-not-found.png`, `/tmp/chrome-mcp-audit/desktop-1280-not-found.png`。
