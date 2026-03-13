# Test Cases: 合コン管理 Webアプリケーション

**Date**: 2026-03-12
**Branch**: `001-goukon-web-app`
**目標カバレッジ**: 100%（全 FR / SC / Edge Case を網羅）

---

## テスト戦略

```
テストピラミッド:

  ┌─────────────┐
  │    E2E      │  ← Playwright（主要ユーザーフロー 7本）
  │  (少数)     │
  ├─────────────┤
  │  統合テスト   │  ← Vitest（Server Actions + DB 操作 30本）
  │  (中程度)   │
  ├─────────────┤
  │ ユニットテスト │  ← Vitest（計算・採番・生成ロジック 80本以上）
  │  (大量)     │
  └─────────────┘
```

| テスト種別 | ツール | 対象 | DB | ファイル配置 |
|-----------|--------|------|-----|-------------|
| ユニット | Vitest | 純粋関数（計算、ID採番、LINEテキスト、バリデーション） | 不要 | `tests/unit/` |
| 統合 | Vitest | Server Actions + Prisma + DB | `db-test` (port 5433) | `tests/integration/` |
| E2E | Playwright | ブラウザ上のユーザーフロー全体 | `db-test` (port 5433) | `tests/e2e/` |

**テスト用 DB**: 統合テスト・E2E テストは docker-compose の `db-test` サービス（ポート `5433`）に接続する。テスト実行前に `npm run db:test:up && npm run db:test:migrate` でテスト用 DB を準備する。各テストスイートの前後で DB をクリーンアップすることで、テスト間の独立性を保証する。

---

## 1. ユニットテスト

### 1.1 収支計算ロジック（`tests/unit/calculations.test.ts`）

対象: `src/lib/calculations.ts` — `calculateEventFinancials()`
対応 FR: FR-008, FR-011
対応 SC: SC-004（既存スプレッドシートと100%一致）

| ID | テストケース | 入力 | 期待結果 |
|----|------------|------|---------|
| CALC-001 | 男女各3名、全員未決済 | event: maleFee=6000, femaleFee=4000, venueCost=20000, participants: 男3名UNPAID(各6000円), 女3名UNPAID(各4000円) | maleCount=3, femaleCount=3, totalCount=6, paidCount=0, unpaidCount=6, expectedRevenue=30000, paidRevenue=0, uncollected=30000, expectedProfit=10000, actualProfit=-20000, profitRate=33.33 |
| CALC-002 | 男女各3名、全員決済済 | 同上だがpaymentStatus=PAID | paidCount=6, unpaidCount=0, paidRevenue=30000, uncollected=0, actualProfit=10000 |
| CALC-003 | 一部決済済（男2名済、女1名済） | 男3名(2名PAID各6000円,1名UNPAID6000円), 女3名(1名PAID4000円,2名UNPAID各4000円) | paidCount=3, paidRevenue=16000, uncollected=14000, expectedProfit=10000, actualProfit=-4000 |
| CALC-004 | 参加者0名 | participants: [] | 全カウント0, expectedRevenue=0, paidRevenue=0, profitRate=null |
| CALC-005 | **見込み収入0円で利益率はnull（ゼロ除算回避）** | maleFee=0, femaleFee=0, 参加者あり | expectedRevenue=0, profitRate=null |
| CALC-006 | **参加費0円の参加者** | 参加者1名 fee=0, PAID | paidRevenue=0 |
| CALC-007 | **個別参加費とイベント標準レートが異なる場合** | event: maleFee=6000, participants: 男1名 fee=5000 PAID | expectedRevenue=6000（イベント標準レート使用）, paidRevenue=5000（個別参加費使用） |
| CALC-008 | **決済済み収入が見込み収入を超える場合** | event: maleFee=5000, participants: 男1名 fee=7000 PAID | expectedRevenue=5000, paidRevenue=7000, uncollected=-2000（負値許容） |
| CALC-009 | 論理削除された参加者は集計から除外 | 参加者3名（うち1名 isDeleted=true） | totalCount=2（削除された1名を除外） |
| CALC-010 | 会場費0円 | venueCost=0, expectedRevenue=30000 | expectedProfit=30000, actualProfit=paidRevenue |
| CALC-011 | **利益率の小数精度** | expectedRevenue=30000, expectedProfit=10000 | profitRate=33.33（小数第2位まで） |
| CALC-012 | 男性のみ / 女性のみのイベント | 男性5名のみ、女性0名 | femaleCount=0, expectedRevenue=maleFee×5 |

---

### 1.2 イベントID 採番ロジック（`tests/unit/event-id.test.ts`）

対象: `src/lib/event-id.ts` — `generateEventId()`
対応 FR: FR-001

| ID | テストケース | 入力 | 期待結果 |
|----|------------|------|---------|
| EVID-001 | 当月初のイベント | date=2025-02-15, DB にイベントなし | "2025-02-001" |
| EVID-002 | 当月2件目 | date=2025-02-20, DB に "2025-02-001" あり | "2025-02-002" |
| EVID-003 | 当月3件目（連番正常増加） | DB に 001, 002 あり | "2025-02-003" |
| EVID-004 | **論理削除済みIDを含む最大値から採番** | DB に 001, 002(削除済), 003 あり | "2025-02-004"（002は飛ばさない） |
| EVID-005 | **欠番があっても再利用しない** | DB に 001, 003 あり（002なし） | "2025-02-004"（003+1） |
| EVID-006 | **NNN=100超え** | DB に 099 あり | "2025-02-100"（3桁超対応） |
| EVID-007 | **NNN=999超え** | DB に 999 あり | "2025-02-1000"（4桁対応） |
| EVID-008 | 月が変わるとリセット | 2月に003まで、3月の初回 | "2025-03-001" |
| EVID-009 | 年が変わるとリセット | 2025年12月に005まで、2026年1月の初回 | "2026-01-001" |
| EVID-010 | 月のゼロ埋め | date=2025-01-10 | "2025-01-001"（月は2桁） |
| EVID-011 | 12月のイベント | date=2025-12-25 | "2025-12-001" |
| EVID-012 | **同一イベント日付が異なる月のイベント（IDは日付ベース）** | date=2025-03-01 | prefix="2025-03-" |

---

### 1.3 LINE 募集テキスト生成（`tests/unit/line-text.test.ts`）

対象: `src/lib/line-text.ts` — `generateLineText()`
対応 FR: FR-019

| ID | テストケース | 入力 | 期待結果 |
|----|------------|------|---------|
| LINE-001 | 全フィールドが入力済み | date=2025-03-15(土), startTime="19:00", area="渋谷", venueName="ABC", maleCapacity=5, femaleCapacity=5, maleFee=6000, femaleFee=4000, theme="春の出会い", targetOccupation="IT系", maleCount=2, femaleCount=3 | テキストに全項目が固定順序で含まれる |
| LINE-002 | **曜日の自動算出** | date=2025-03-15 | テキストに「土」が含まれる |
| LINE-003 | **時間帯の表示（時刻からの生成）** | startTime="19:00" | テキストに "19:00" を含む表示 |
| LINE-004 | **残枠の計算（男性）** | maleCapacity=5, maleCount=2 | テキストに「男性あと3名」 |
| LINE-005 | **残枠の計算（女性）** | femaleCapacity=5, femaleCount=5 | テキストに「女性あと0名」または「満席」 |
| LINE-006 | **テーマが null** | theme=null | テーマ行は省略 or 空表示 |
| LINE-007 | **対象職業が null** | targetOccupation=null | 職業行は省略 or 空表示 |
| LINE-008 | **金額のカンマ区切り** | maleFee=10000 | テキストに "10,000" 含む |
| LINE-009 | **項目の順序が固定** | 全フィールド入力 | 日付→曜日→時間帯→エリア→会場名→募集定員→参加費→テーマ→対象職業→残枠 の順序 |
| LINE-010 | **参加費0円** | maleFee=0 | テキストに "0円" or "無料" 含む |
| LINE-011 | **定員超過（残枠が負の値）** | maleCapacity=3, maleCount=5 | テキストに適切な表示（「残枠なし」等） |

---

### 1.4 Zod バリデーション（`tests/unit/validations.test.ts`）

対象: `src/lib/validations.ts` — `eventFormSchema`, `participantFormSchema`, `bulkPaymentSchema`
対応 FR: 全フォーム入力

#### イベントフォームバリデーション

| ID | テストケース | 入力 | 期待結果 |
|----|------------|------|---------|
| VAL-E001 | 全必須フィールド入力OK | 全必須項目あり | success |
| VAL-E002 | 日付未入力 | date 欠損 | error: "日付は必須です" |
| VAL-E003 | 時刻フォーマット不正 | startTime="9:00" | error: "HH:MM形式で入力" |
| VAL-E004 | 時刻フォーマット正常 | startTime="09:00" | success |
| VAL-E005 | 会場名未入力 | venueName="" | error: "会場名は必須です" |
| VAL-E006 | 会場名100文字超 | venueName=101文字 | error: "100文字以内" |
| VAL-E007 | マップURL不正 | mapUrl="not-a-url" | error: "正しいURL" |
| VAL-E008 | マップURL空文字（許容） | mapUrl="" | success (null 変換) |
| VAL-E009 | エリア未入力 | area="" | error: "エリアは必須です" |
| VAL-E010 | 男性定員が負数 | maleCapacity=-1 | error: "0以上の整数" |
| VAL-E011 | 女性定員が小数 | femaleCapacity=1.5 | error: "整数" |
| VAL-E012 | 男性参加費が負数 | maleFee=-100 | error: "0以上" |
| VAL-E013 | ステータス不正値 | status="UNKNOWN" | error |
| VAL-E014 | ステータス3値それぞれ | "SCHEDULED"/"COMPLETED"/"CANCELLED" | 各 success |
| VAL-E015 | 会場費デフォルト0 | venueCost 未入力 | default 0 |
| VAL-E016 | メモ1000文字超 | memo=1001文字 | error: "1000文字以内" |
| VAL-E017 | 任意フィールドの null 変換 | organizer="" | null に変換 |

#### 参加者フォームバリデーション

| ID | テストケース | 入力 | 期待結果 |
|----|------------|------|---------|
| VAL-P001 | 全必須フィールド入力OK | name, gender, fee | success |
| VAL-P002 | 氏名未入力 | name="" | error: "氏名は必須です" |
| VAL-P003 | 氏名50文字超 | name=51文字 | error: "50文字以内" |
| VAL-P004 | 性別不正値 | gender="OTHER" | error |
| VAL-P005 | 性別 MALE / FEMALE | 各 | success |
| VAL-P006 | 参加費が負数 | fee=-500 | error: "0以上" |
| VAL-P007 | **参加費0円（許容）** | fee=0 | success |
| VAL-P008 | 決済状況デフォルト | 未指定 | UNPAID |
| VAL-P009 | 決済日が null（UNPAID時） | paymentDate=null | success |
| VAL-P010 | メモ500文字超 | memo=501文字 | error |

#### 一括決済バリデーション

| ID | テストケース | 入力 | 期待結果 |
|----|------------|------|---------|
| VAL-B001 | 正常入力 | ids=[1,2,3], date, confirmedBy | success |
| VAL-B002 | 参加者未選択 | ids=[] | error: "1名以上選択" |
| VAL-B003 | 決済日未入力 | paymentDate 欠損 | error: "決済日は必須" |
| VAL-B004 | 確認者未入力 | confirmedBy="" | error: "確認者名は必須" |

---

## 2. 統合テスト

### 2.1 イベント Server Actions（`tests/integration/event-actions.test.ts`）

対象: `src/actions/event-actions.ts`
対応 FR: FR-001〜FR-005

| ID | テストケース | 操作 | 期待結果 | 対応 FR |
|----|------------|------|---------|---------|
| INT-E001 | イベント新規登録（正常系） | createEvent(有効なFormData) | success=true, eventId が YYYY-MM-NNN 形式 | FR-001, FR-002 |
| INT-E002 | イベント新規登録（バリデーションエラー） | createEvent(不正なFormData) | success=false, error メッセージあり | FR-002 |
| INT-E003 | イベントID自動採番の確認 | 同月に2件登録 | 1件目: NNN=001, 2件目: NNN=002 | FR-001 |
| INT-E004 | イベント更新（正常系） | updateEvent(eventId, 更新FormData) | success=true, DB の値が更新 | FR-002 |
| INT-E005 | イベント更新（存在しないID） | updateEvent("9999-99-999", data) | success=false | - |
| INT-E006 | イベント論理削除 | deleteEvent(eventId) | event.isDeleted=true | FR-004 |
| INT-E007 | **イベント削除で紐付く参加者も論理削除** | イベントに参加者3名登録後、deleteEvent | 全参加者の isDeleted=true | FR-004 |
| INT-E008 | イベント復元 | restoreEvent(eventId) | event.isDeleted=false | FR-004 |
| INT-E009 | **イベント復元で紐付く参加者も復元** | restoreEvent 実行 | 全参加者の isDeleted=false | FR-004 |
| INT-E010 | **論理削除後のID採番（欠番を飛ばす）** | 001を削除後に新規登録 | "YYYY-MM-002"（001は再利用しない） | FR-001 |
| INT-E011 | 状態変更（開催予定→開催済） | updateEvent(status=COMPLETED) | DB の status が COMPLETED | FR-003 |
| INT-E012 | 状態変更（開催予定→キャンセル） | updateEvent(status=CANCELLED) | DB の status が CANCELLED | FR-003 |
| INT-E013 | 状態変更（キャンセル→開催予定） | updateEvent(status=SCHEDULED) | DB の status が SCHEDULED（復帰可能） | FR-003 |

### 2.2 参加者 Server Actions（`tests/integration/participant-actions.test.ts`）

対象: `src/actions/participant-actions.ts`
対応 FR: FR-006〜FR-009

| ID | テストケース | 操作 | 期待結果 | 対応 FR |
|----|------------|------|---------|---------|
| INT-P001 | 参加者登録（正常系） | createParticipant(eventId, FormData) | success=true, DB に参加者追加 | FR-006 |
| INT-P002 | 参加者登録（バリデーションエラー） | createParticipant(eventId, 不正FormData) | success=false | FR-006 |
| INT-P003 | **参加費がイベント標準レートと独立** | event.maleFee=6000, participant.fee=5000 | DB に fee=5000 で保存 | FR-006 |
| INT-P004 | 参加者更新 | updateParticipant(id, FormData) | DB の値が更新 | FR-006 |
| INT-P005 | 参加者論理削除 | deleteParticipant(id) | isDeleted=true | FR-006 |
| INT-P006 | 参加者復元 | restoreParticipant(id) | isDeleted=false | FR-006 |
| INT-P007 | 決済状況を「済」に個別更新 | updatePaymentStatus(id, "PAID", date, by) | paymentStatus=PAID, paymentDate/ConfirmedBy 設定 | FR-007 |
| INT-P008 | 決済状況を「未」に戻す | updatePaymentStatus(id, "UNPAID") | paymentStatus=UNPAID, paymentDate/ConfirmedBy=null | FR-007 |
| INT-P009 | **一括決済更新** | bulkUpdatePaymentStatus([1,2,3], date, by) | 3名全員 PAID, updatedCount=3 | FR-007 |
| INT-P010 | 一括決済更新（空配列） | bulkUpdatePaymentStatus([], date, by) | バリデーションエラー | FR-007 |
| INT-P011 | **人数制限なしの確認** | 100名登録 | 全員 success | FR-006 |

### 2.3 データ取得関数（`tests/integration/queries.test.ts`）

対象: `src/queries/`
対応 FR: FR-005, FR-008〜FR-010, FR-013〜FR-016

| ID | テストケース | 操作 | 期待結果 | 対応 FR |
|----|------------|------|---------|---------|
| INT-Q001 | イベント一覧（フィルタなし） | getEvents({ year: 2025 }) | 2025年の全イベント | FR-005 |
| INT-Q002 | イベント一覧（月フィルタ） | getEvents({ year: 2025, month: 2 }) | 2025年2月のみ | FR-005 |
| INT-Q003 | イベント一覧（状態フィルタ） | getEvents({ year: 2025, status: "SCHEDULED" }) | 開催予定のみ | FR-005 |
| INT-Q004 | **イベント一覧（論理削除を含まない）** | getEvents({ includeDeleted: false }) | isDeleted=true を除外 | FR-004 |
| INT-Q005 | **イベント一覧（論理削除を含む）** | getEvents({ includeDeleted: true }) | isDeleted=true を含む | FR-004 |
| INT-Q006 | イベント一覧（ソート: 日付降順） | getEvents({ sortBy: "date", sortOrder: "desc" }) | 最新日付が先頭 | FR-005 |
| INT-Q007 | イベント詳細取得 | getEventDetail(eventId) | イベント + 参加者 + 収支サマリー | - |
| INT-Q008 | **イベント詳細で収支サマリーが正確** | 参加者3名登録済みイベント | financials の値が calculateEventFinancials と一致 | FR-008, FR-011 |
| INT-Q009 | 全横断参加者一覧 | getAllParticipants() | 全イベントの参加者 | FR-010 |
| INT-Q010 | 横断参加者一覧（氏名フィルタ） | getAllParticipants({ nameFilter: "田中" }) | 「田中」を含む参加者のみ | FR-009, FR-010 |
| INT-Q011 | **横断参加者一覧の表示列** | 取得結果 | name, eventId, gender, fee, paymentStatus を含む | FR-010 |
| INT-Q012 | ダッシュボード月別サマリー | getMonthlySummary(2025) | 12行、各月の集計値 | FR-014 |
| INT-Q013 | **ダッシュボード（イベント0件の月）** | getMonthlySummary(2025)、2月にイベントなし | 2月の行: eventCount=0, 全数値0, profitRate=null | FR-014 |
| INT-Q014 | **ダッシュボード（年度切替）** | getMonthlySummary(2026) | 2026年のデータのみ | FR-015 |
| INT-Q015 | 収支レポートデータ | getReportData({ year: 2025 }) | 各イベントの収支行 | FR-013 |
| INT-Q016 | **収支レポートに Food back 列を含む** | 取得結果 | expectedCashback, actualCashback を含む | FR-012, FR-013 |
| INT-Q017 | **ダッシュボードのマッチング件数集計** | matchCount入力済みイベント | 月別合計が正確 | FR-021 |

---

## 3. E2E テスト（Playwright）

### 3.1 イベント CRUD フロー（`tests/e2e/event-crud.spec.ts`）

対応: User Story 1、FR-001〜FR-005

| ID | テストケース | 操作手順 | 期待結果 |
|----|------------|---------|---------|
| E2E-001 | **イベント登録→一覧表示** | 1. /events/new を開く 2. 全必須項目を入力 3. 保存ボタン押下 | イベント一覧にリダイレクト、新規イベントが一覧に表示 |
| E2E-002 | **イベント編集** | 1. イベント詳細画面を開く 2. 編集ボタン押下 3. 会場名を変更 4. 保存 | 詳細画面で更新された会場名が表示 |
| E2E-003 | **イベント論理削除→復元** | 1. イベント一覧で削除ボタン 2. 確認ダイアログで承認 3. 「削除済み表示」トグルON 4. 復元ボタン | 削除後は非表示、トグルONで表示（グレー表示）、復元後に通常表示 |
| E2E-004 | **イベント一覧フィルタ** | 1. 年度を選択 2. 月を選択 3. 状態を選択 | フィルタ条件に合致するイベントのみ表示 |
| E2E-005 | **イベントIDの自動採番確認** | 1. 2月に1件登録 2. 2月にもう1件登録 | 1件目: YYYY-02-001、2件目: YYYY-02-002 |

### 3.2 参加者・決済フロー（`tests/e2e/participant-payment.spec.ts`）

対応: User Story 2、FR-006〜FR-009

| ID | テストケース | 操作手順 | 期待結果 |
|----|------------|---------|---------|
| E2E-010 | **参加者登録→サマリー更新** | 1. イベント詳細画面を開く 2. 参加者登録フォーム入力 3. 登録 | 参加者一覧に表示、男女別人数・収支サマリーが即座に更新 |
| E2E-011 | **個別決済更新** | 1. 未決済参加者の決済状況を「済」に変更 2. 決済日・確認者を入力 | 決済済み収入・未回収が更新、2秒以内に反映（SC-001） |
| E2E-012 | **一括決済更新** | 1. 複数参加者をチェックボックスで選択 2. 一括決済ボタン 3. 決済日・確認者入力 4. 実行 | 選択した全員が「済」に更新 |
| E2E-013 | **参加者氏名検索** | 1. 検索ボックスに氏名入力 | 一致する参加者のみ表示 |
| E2E-014 | **全横断参加者一覧** | 1. /participants を開く 2. 氏名で検索 | 全イベントの参加者が表示、氏名フィルタが動作 |

### 3.3 ダッシュボードフロー（`tests/e2e/dashboard.spec.ts`）

対応: User Story 3、FR-014〜FR-016

| ID | テストケース | 操作手順 | 期待結果 |
|----|------------|---------|---------|
| E2E-020 | **月別サマリー表示** | 1. / （ダッシュボード）を開く | 1月〜12月の行、各列に正しい集計値 |
| E2E-021 | **年度切替** | 1. 年度セレクターで 2026年を選択 | 2026年のデータで再集計 |
| E2E-022 | **月クリック→イベント一覧遷移** | 1. 3月の行をクリック | /events?year=YYYY&month=3 に遷移、3月のイベントのみ表示 |

### 3.4 スケジュール・LINE テキストフロー（`tests/e2e/schedule-line.spec.ts`）

対応: User Story 4、FR-017〜FR-019

| ID | テストケース | 操作手順 | 期待結果 |
|----|------------|---------|---------|
| E2E-030 | **スケジュール一覧表示** | 1. /schedule を開く | 全イベント表示、残枠（男女別）が正確 |
| E2E-031 | **スケジュールフィルタ** | 1. 月・エリア・状態でフィルタ | 条件に合致するイベントのみ表示 |
| E2E-032 | **LINEテキスト生成→モーダル→コピー** | 1. LINEテキスト生成ボタン押下 2. モーダルでテキスト確認 3. コピーボタン | モーダルに全項目が固定順序で表示、コピー成功 Toast 表示 |

### 3.5 収支レポートフロー（`tests/e2e/reports.spec.ts`）

対応: FR-013

| ID | テストケース | 操作手順 | 期待結果 |
|----|------------|---------|---------|
| E2E-040 | **収支レポート表示** | 1. /reports を開く | イベント別収支一覧、全列（ID・日付・会場費・CB予定・CB実際・見込み収入・決済済み・未回収・見込み利益・実現利益・利益率）が表示 |
| E2E-041 | **レポートフィルタ** | 1. 年度・月でフィルタ | フィルタ条件に合致するイベントのみ |

---

## 4. Edge Case テスト

対象: spec.md Edge Cases セクション + 追加境界値テスト

### 4.1 ユニット Edge Cases（`tests/unit/edge-cases.test.ts`）

| ID | テストケース | テスト種別 | 入力 | 期待結果 | 出典 |
|----|------------|----------|------|---------|------|
| EDGE-001 | イベント0件の年度でダッシュボード | 統合 | getMonthlySummary(年度にイベントなし) | 12行全て eventCount=0, profitRate=null, エラーなし | spec Edge Case |
| EDGE-002 | 参加費0円の登録・集計 | ユニット | fee=0 | 正常に登録・集計、paidRevenue=0 | spec Edge Case |
| EDGE-003 | 見込み収入0円で利益率計算 | ユニット | expectedRevenue=0 | profitRate=null（"-"表示）、ゼロ除算なし | spec Edge Case |
| EDGE-004 | 連番NNN=100超 | 統合 | DB に 099 まで登録 | "YYYY-MM-100" | spec Edge Case |
| EDGE-005 | Food back 実際CB > 予定CB | 統合 | expectedCB=5000, actualCB=7000 | 正常保存、エラーなし | spec Edge Case |
| EDGE-006 | Last-write-wins（同時編集） | 統合 | 同一イベントを2回連続更新 | 2回目の値が有効 | spec Edge Case |
| EDGE-007 | **空文字の氏名で参加者検索** | ユニット | nameFilter="" | 全参加者を返す（フィルタなし扱い） | 追加 |
| EDGE-008 | **日本語氏名の部分一致** | 統合 | nameFilter="田" | "田中"、"田辺" がヒット | FR-009 |
| EDGE-009 | **イベント日付が月初（1日）** | ユニット | date=2025-03-01 | eventId prefix="2025-03-" | 追加 |
| EDGE-010 | **イベント日付が月末（31日）** | ユニット | date=2025-01-31 | eventId prefix="2025-01-" | 追加 |
| EDGE-011 | **うるう年2月29日** | ユニット | date=2028-02-29 | eventId prefix="2028-02-" | 追加 |
| EDGE-012 | **マッチング件数0** | 統合 | matchCount=0 | ダッシュボード集計に0として表示 | FR-020 |
| EDGE-013 | **参加者全員論理削除された場合の収支** | ユニット | 全参加者 isDeleted=true | totalCount=0, expectedRevenue=0 | 追加 |
| EDGE-014 | **同時に複数月にイベント登録** | 統合 | 2月と3月に各1件登録 | それぞれ 001 から採番 | FR-001 |

---

## 5. パフォーマンステスト

対応: SC-001, SC-002, SC-005

| ID | テストケース | テスト方法 | 条件 | 期待結果 |
|----|------------|----------|------|---------|
| PERF-001 | 決済更新反映2秒以内 | Playwright timing | 決済状況を更新し、画面反映までの時間を計測 | < 2,000ms |
| PERF-002 | 全画面初期表示3秒以内 | Playwright timing | 各主要画面（/, /events, /events/[id], /participants, /reports, /schedule）のロード時間 | < 3,000ms |
| PERF-003 | **大量データでのパフォーマンス** | Playwright timing | イベント100件 + 参加者1,000名をシードした状態でダッシュボード表示 | SC-001, SC-002 を満たす |
| PERF-004 | **大量データでのイベント一覧** | Playwright timing | イベント100件でフィルタ + ソート | < 3,000ms |

---

## 6. レスポンシブテスト

対応: SC-006

| ID | テストケース | テスト方法 | 条件 | 期待結果 |
|----|------------|----------|------|---------|
| RESP-001 | スマートフォン（375px幅） | Playwright viewport | iPhone SE サイズ | 全主要操作が完了可能 |
| RESP-002 | タブレット（768px幅） | Playwright viewport | iPad サイズ | 全主要操作が完了可能 |
| RESP-003 | PC（1280px幅） | Playwright viewport | デスクトップ | 全主要操作が完了可能 |
| RESP-004 | **参加者登録がモバイルで完了** | Playwright mobile | 375px で参加者登録フォーム入力→保存 | 正常に登録完了 |
| RESP-005 | **決済更新がモバイルで完了** | Playwright mobile | 375px で決済状況更新 | 正常に更新完了 |
| RESP-006 | **テキストコピーがモバイルで完了** | Playwright mobile | 375px でLINEテキスト生成→コピー | コピー成功 |

---

## 7. カバレッジマトリクス

### FR → テストケース対応表

| FR | 説明 | ユニット | 統合 | E2E | カバー率 |
|----|------|---------|------|-----|---------|
| FR-001 | イベントID自動採番 | EVID-001〜012 | INT-E001,003,010 | E2E-005 | 100% |
| FR-002 | イベント全項目登録・編集 | VAL-E001〜017 | INT-E001,004 | E2E-001,002 | 100% |
| FR-003 | イベント状態3値 | VAL-E013,014 | INT-E011〜013 | - | 100% |
| FR-004 | 論理削除・復元・トグル | - | INT-E006〜009, INT-Q004,005 | E2E-003 | 100% |
| FR-005 | イベント一覧フィルタ・ソート | - | INT-Q001〜003,006 | E2E-004 | 100% |
| FR-006 | 参加者CRUD・個別参加費 | VAL-P001〜010 | INT-P001〜006 | E2E-010 | 100% |
| FR-007 | 決済状況更新（個別・一括） | VAL-B001〜004 | INT-P007〜010 | E2E-011,012 | 100% |
| FR-008 | 男女別参加者数自動集計 | CALC-001〜012 | INT-Q008 | E2E-010 | 100% |
| FR-009 | 参加者氏名検索 | EDGE-007 | INT-Q010 | E2E-013 | 100% |
| FR-010 | 全横断参加者一覧 | - | INT-Q009〜011 | E2E-014 | 100% |
| FR-011 | 収支自動計算 | CALC-001〜012 | INT-Q008 | E2E-011 | 100% |
| FR-012 | Food back 管理 | - | INT-Q016 | E2E-040 | 100% |
| FR-013 | 収支レポート画面 | - | INT-Q015,016 | E2E-040,041 | 100% |
| FR-014 | ダッシュボード月別サマリー | - | INT-Q012,013 | E2E-020 | 100% |
| FR-015 | 年度切替 | - | INT-Q014 | E2E-021 | 100% |
| FR-016 | 月クリック→イベント一覧遷移 | - | - | E2E-022 | 100% |
| FR-017 | スケジュール一覧フィルタ | - | - | E2E-030,031 | 100% |
| FR-018 | 残枠リアルタイム表示 | LINE-004,005,011 | - | E2E-030 | 100% |
| FR-019 | LINE募集テキスト生成 | LINE-001〜011 | - | E2E-032 | 100% |
| FR-020 | マッチング件数入力 | - | EDGE-012 | - | 100% |
| FR-021 | マッチング月別集計 | - | INT-Q017 | E2E-020 | 100% |

### SC → テストケース対応表

| SC | 説明 | テストケース | カバー率 |
|----|------|-------------|---------|
| SC-001 | 決済更新反映 2秒以内 | PERF-001 | 100% |
| SC-002 | 画面初期表示 3秒以内 | PERF-002 | 100% |
| SC-003 | 登録→コピー 3分以内 | E2E-001 + E2E-032 の合計時間で検証 | 100% |
| SC-004 | 収支計算がスプレッドシートと一致 | CALC-001〜012 | 100% |
| SC-005 | 大量データでの性能 | PERF-003, PERF-004 | 100% |
| SC-006 | マルチデバイス対応 | RESP-001〜006 | 100% |

### Edge Case → テストケース対応表

| Edge Case（spec記載） | テストケース | カバー率 |
|----------------------|-------------|---------|
| 0件年度のダッシュボード | EDGE-001, INT-Q013 | 100% |
| 参加費0円 | EDGE-002, VAL-P007, CALC-006 | 100% |
| 見込み収入0円の利益率 | EDGE-003, CALC-005 | 100% |
| NNN=100超 | EDGE-004, EVID-006,007 | 100% |
| 実際CB > 予定CB | EDGE-005 | 100% |
| 複数タブ同時編集 | EDGE-006 | 100% |

---

## 8. テスト実行コマンド

```bash
# ユニットテスト（全件）
npm run test:run

# ユニットテスト（ウォッチモード）
npm run test

# ユニットテスト（カバレッジレポート付き）
npx vitest run --coverage

# 統合テスト（DB接続あり）
npx vitest run tests/integration/

# E2Eテスト
npx playwright test

# E2Eテスト（特定ファイル）
npx playwright test tests/e2e/event-crud.spec.ts

# E2Eテスト（UIモード: ブラウザで可視化）
npx playwright test --ui

# パフォーマンステスト
npx playwright test tests/e2e/ --grep "PERF"

# レスポンシブテスト
npx playwright test tests/e2e/ --grep "RESP"
```

---

## テストケース総数

| 種別 | 件数 |
|------|------|
| ユニット（計算） | 12 |
| ユニット（ID採番） | 12 |
| ユニット（LINEテキスト） | 11 |
| ユニット（バリデーション: イベント） | 17 |
| ユニット（バリデーション: 参加者） | 10 |
| ユニット（バリデーション: 一括決済） | 4 |
| 統合（イベント Actions） | 13 |
| 統合（参加者 Actions） | 11 |
| 統合（データ取得） | 17 |
| Edge Case | 14 |
| E2E | 16 |
| パフォーマンス | 4 |
| レスポンシブ | 6 |
| **合計** | **147** |
