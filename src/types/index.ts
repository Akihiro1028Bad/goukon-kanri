/** Server Action の実行結果 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/** イベント状態の日本語ラベル */
export const EVENT_STATUS_LABELS = {
  SCHEDULED: "開催予定",
  COMPLETED: "開催済",
  CANCELLED: "キャンセル",
} as const;

/** 性別の日本語ラベル */
export const GENDER_LABELS = {
  MALE: "男性",
  FEMALE: "女性",
} as const;

/** 決済状況の日本語ラベル */
export const PAYMENT_STATUS_LABELS = {
  PAID: "済",
  UNPAID: "未",
} as const;

/** 収支サマリー（計算結果） */
export type FinancialSummary = {
  maleCount: number;
  femaleCount: number;
  totalCount: number;
  paidCount: number;
  unpaidCount: number;
  expectedRevenue: number;
  paidRevenue: number;
  uncollected: number;
  expectedProfit: number;
  actualProfit: number;
  profitRate: number | null;
};

/** ダッシュボード月別サマリー行 */
export type MonthlySummaryRow = {
  month: number;
  eventCount: number;
  maleCount: number;
  femaleCount: number;
  venueCost: number;
  expectedRevenue: number;
  paidRevenue: number;
  uncollected: number;
  expectedProfit: number;
  actualProfit: number;
  profitRate: number | null;
  matchCount: number;
};
