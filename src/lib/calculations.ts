import type { Gender, PaymentStatus } from "@prisma/client";
import type { FinancialSummary } from "@/types";

/**
 * イベントの収支サマリーを計算する
 *
 * 【重要】見込み収入の計算にはイベントの男女別標準参加費を使用する。
 * 参加者の個別参加費は決済済み収入の計算にのみ使用する。
 */
export function calculateEventFinancials(
    event: { maleFee: number; femaleFee: number; venueCost: number },
    participants: {
        gender: Gender;
        fee: number;
        paymentStatus: PaymentStatus;
        isDeleted: boolean;
    }[]
): FinancialSummary {
    // 論理削除されていない参加者のみ対象
    const active = participants.filter((p) => !p.isDeleted);

    const maleCount = active.filter((p) => p.gender === "MALE").length;
    const femaleCount = active.filter((p) => p.gender === "FEMALE").length;
    const totalCount = maleCount + femaleCount;

    const paidParticipants = active.filter((p) => p.paymentStatus === "PAID");
    const paidCount = paidParticipants.length;
    const unpaidCount = totalCount - paidCount;

    // 見込み収入: イベントの標準レート × 人数
    const expectedRevenue =
        maleCount * event.maleFee + femaleCount * event.femaleFee;

    // 決済済み収入: 決済済み参加者の個別参加費の合計
    const paidRevenue = paidParticipants.reduce((sum, p) => sum + p.fee, 0);

    // 未回収
    const uncollected = expectedRevenue - paidRevenue;

    // 見込み利益
    const expectedProfit = expectedRevenue - event.venueCost;

    // 実現利益
    const actualProfit = paidRevenue - event.venueCost;

    // 利益率（見込）— 小数第2位まで
    const profitRate =
        expectedRevenue > 0
            ? Math.round((expectedProfit / expectedRevenue) * 10000) / 100
            : null; // null は UI で "-" として表示

    return {
        maleCount,
        femaleCount,
        totalCount,
        paidCount,
        unpaidCount,
        expectedRevenue,
        paidRevenue,
        uncollected,
        expectedProfit,
        actualProfit,
        profitRate,
    };
}
