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
  expectedProfitWithCb: number;
  actualProfitWithCb: number;
  profitRate: number | null;
};

/** 重複ペア情報 */
export type DuplicatePair = {
  /** 今回のイベントの参加者名 */
  participantA: string;
  /** 今回のイベントの別の参加者名 */
  participantB: string;
  /** 一緒に参加していた過去のイベント一覧 */
  sharedEvents: {
    eventId: string;
    date: Date;
    venueName: string;
  }[];
};

/** 重複チェック結果 */
export type DuplicateCheckResult = {
  /** 重複ペアの配列（空なら重複なし） */
  duplicates: DuplicatePair[];
  /** チェック対象のイベントID */
  eventId: string;
  /** チェック実行日時 */
  checkedAt: Date;
};

/** 参加者タスクの種別 */
export type ParticipantTaskType = "detailsSent" | "reminderSent" | "thankYouSent";

/** 参加者タスクの日本語ラベル */
export const PARTICIPANT_TASK_LABELS: Record<ParticipantTaskType, string> = {
  detailsSent: "詳細送信",
  reminderSent: "リマインド送信",
  thankYouSent: "お礼LINE送信",
} as const;

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
  expectedProfitWithCb: number;
  actualProfitWithCb: number;
  profitRate: number | null;
};
