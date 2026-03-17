# Chrome MCP 総合動作確認 不具合台帳（再監査: 2026-03-15）

## 実施条件
- 対象: `/`, `/events`, `/events/new`, `/events/[id]`, `/events/[id]/edit`, `/participants`, `/schedule`, `/reports`, `not-found`
- デバイス: `375x667` / `768x1024` / `1280x800`
- 基準データ: `goukon_kanri_test` (5433) を `prisma migrate reset --force` 後、`Seeded 100 events and 1000 participants.` を確認

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
| 観点カバレッジ | 完了（登録/編集/検索/フィルタ/遷移/モーダル/トースト/レスポンシブ/overflow） |
| 画面横overflow | 全対象で `scrollWidth <= clientWidth` を確認（再発なし） |

## 性能計測（Chrome Trace）
| URL | 前回LCP | 今回LCP | 今回CLS | 今回TTFB | 判定 | 証跡 |
|---|---:|---:|---:|---:|---|---|
| `/` | 419ms | 89ms | 0.00 | 15ms | 改善 | `/tmp/chrome-mcp-audit/trace-home.json` |
| `/events` | 472ms | 425ms | 0.00 | 18ms | 改善 | `/tmp/chrome-mcp-audit/trace-events.json` |

## 不具合台帳（再監査版）
| ID | 画面URL | デバイス | 再現手順 | 実際結果 | 期待結果 | 影響度 | 発生頻度 | 判定 | 証跡 |
|---|---|---|---|---|---|---|---|---|---|
| BUG-001 | `/events/new` | 主に Mobile + MCP操作 | MCPで日付/時刻入力後に登録押下 | 登録遷移しないケースがあり、DevToolsメニュー前面化やネイティブ入力バリデーションに依存 | 登録後に詳細へ遷移 | Low | 断続的（MCP操作時） | **Not a product bug (Tooling/MCP artifact)** | `/tmp/chrome-mcp-audit/mobile-events-new-mcp-artifact.png`, `tests/e2e/event-crud.spec.ts`（E2E-001 PASS） |
| BUG-002 | `/schedule` | Desktop / Tablet / Mobile | スケジュール行残枠とLINE文面を比較 | `男性あと2名 / 女性あと3名` で一致 | 同一表示ロジックで一致 | High | 再発なし | **Resolved** | `/tmp/chrome-mcp-audit/mobile-schedule.png`, `/tmp/chrome-mcp-audit/tablet-schedule-line.png`, `/tmp/chrome-mcp-audit/desktop-schedule-line.png` |
| BUG-003 | 主要6画面 | Mobile（375x667） | 各画面で `scrollWidth <= clientWidth` を確認 | 全画面で横overflowなし | 横overflowなし | Medium | 再発なし | **Resolved** | `/tmp/chrome-mcp-audit/mobile-home.png`, `/tmp/chrome-mcp-audit/mobile-events.png`, `/tmp/chrome-mcp-audit/mobile-event-detail.png`, `/tmp/chrome-mcp-audit/mobile-participants.png`, `/tmp/chrome-mcp-audit/mobile-schedule.png`, `/tmp/chrome-mcp-audit/mobile-reports.png` |
| BUG-004 | `/events` | Desktop / Tablet / Mobile | ヘッダーソートUI確認 | `th button` が存在（5列）し操作可 | ヘッダーでソート可能 | Medium | 再発なし | **Resolved** | `/tmp/chrome-mcp-audit/mobile-events.png`, `/tmp/chrome-mcp-audit/tablet-events.png`, `/tmp/chrome-mcp-audit/desktop-events.png`, `tests/e2e/event-crud.spec.ts`（E2E-006 PASS） |

## 整合性チェック結果
- イベント作成導線: 自動E2E（E2E-001）で PASS。MCP単独では BUG-001 の操作差分あり。
- 参加者追加 -> サマリー反映: PASS（`/events/2026-10-001` で男性参加者 `0 -> 1`、見込み収入 `¥0 -> ¥6,000`）。
- 決済更新 -> サマリー反映: PASS（同イベントで決済済み収入 `¥0 -> ¥6,000`、未回収 `¥6,000 -> ¥0`）。
- レポート金額整合: PASS（`/reports?month=10` で `2026-10-001` が `決済済み ¥6,000` を表示）。
- スケジュール残枠とLINE文面: PASS（`男性あと2名 / 女性あと3名` で一致）。
- `not-found`: 3デバイスで正常表示。

## 最終判定
- 自動テスト3種: **PASS**
- MCP画面/観点カバレッジ: **未確認ゼロ**
- 新規プロダクト不具合: **0件**（BUG-001は Tooling/MCP artifact 扱い）
