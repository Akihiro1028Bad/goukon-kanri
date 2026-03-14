import { describe, it, expect } from "vitest";
import { calculateEventFinancials } from "@/lib/calculations";

describe("calculateEventFinancials", () => {
    // CALC-001: 男女各3名、全員未決済
    it("CALC-001: 男女各3名・全員未決済で正しい収支を返す", () => {
        const event = { maleFee: 6000, femaleFee: 4000, venueCost: 20000 };
        const participants = [
            { gender: "MALE" as const, fee: 6000, paymentStatus: "UNPAID" as const, isDeleted: false },
            { gender: "MALE" as const, fee: 6000, paymentStatus: "UNPAID" as const, isDeleted: false },
            { gender: "MALE" as const, fee: 6000, paymentStatus: "UNPAID" as const, isDeleted: false },
            { gender: "FEMALE" as const, fee: 4000, paymentStatus: "UNPAID" as const, isDeleted: false },
            { gender: "FEMALE" as const, fee: 4000, paymentStatus: "UNPAID" as const, isDeleted: false },
            { gender: "FEMALE" as const, fee: 4000, paymentStatus: "UNPAID" as const, isDeleted: false },
        ];

        const result = calculateEventFinancials(event, participants);

        expect(result.maleCount).toBe(3);
        expect(result.femaleCount).toBe(3);
        expect(result.totalCount).toBe(6);
        expect(result.paidCount).toBe(0);
        expect(result.unpaidCount).toBe(6);
        expect(result.expectedRevenue).toBe(30000);
        expect(result.paidRevenue).toBe(0);
        expect(result.uncollected).toBe(30000);
        expect(result.expectedProfit).toBe(10000);
        expect(result.actualProfit).toBe(-20000);
        expect(result.profitRate).toBe(33.33);
    });

    // CALC-002: 男女各3名、全員決済済
    it("CALC-002: 全員決済済で正しい収支を返す", () => {
        const event = { maleFee: 6000, femaleFee: 4000, venueCost: 20000 };
        const participants = [
            { gender: "MALE" as const, fee: 6000, paymentStatus: "PAID" as const, isDeleted: false },
            { gender: "MALE" as const, fee: 6000, paymentStatus: "PAID" as const, isDeleted: false },
            { gender: "MALE" as const, fee: 6000, paymentStatus: "PAID" as const, isDeleted: false },
            { gender: "FEMALE" as const, fee: 4000, paymentStatus: "PAID" as const, isDeleted: false },
            { gender: "FEMALE" as const, fee: 4000, paymentStatus: "PAID" as const, isDeleted: false },
            { gender: "FEMALE" as const, fee: 4000, paymentStatus: "PAID" as const, isDeleted: false },
        ];

        const result = calculateEventFinancials(event, participants);

        expect(result.paidCount).toBe(6);
        expect(result.unpaidCount).toBe(0);
        expect(result.paidRevenue).toBe(30000);
        expect(result.uncollected).toBe(0);
        expect(result.actualProfit).toBe(10000);
    });

    // CALC-003: 一部決済済（男2名済、女1名済）
    it("CALC-003: 一部決済済で正しい収支を返す", () => {
        const event = { maleFee: 6000, femaleFee: 4000, venueCost: 20000 };
        const participants = [
            { gender: "MALE" as const, fee: 6000, paymentStatus: "PAID" as const, isDeleted: false },
            { gender: "MALE" as const, fee: 6000, paymentStatus: "PAID" as const, isDeleted: false },
            { gender: "MALE" as const, fee: 6000, paymentStatus: "UNPAID" as const, isDeleted: false },
            { gender: "FEMALE" as const, fee: 4000, paymentStatus: "PAID" as const, isDeleted: false },
            { gender: "FEMALE" as const, fee: 4000, paymentStatus: "UNPAID" as const, isDeleted: false },
            { gender: "FEMALE" as const, fee: 4000, paymentStatus: "UNPAID" as const, isDeleted: false },
        ];

        const result = calculateEventFinancials(event, participants);

        expect(result.paidCount).toBe(3);
        expect(result.paidRevenue).toBe(16000);
        expect(result.uncollected).toBe(14000);
        expect(result.expectedProfit).toBe(10000);
        expect(result.actualProfit).toBe(-4000);
    });

    // CALC-004: 参加者0名
    it("CALC-004: 参加者0名で全カウント0・profitRateがnull", () => {
        const event = { maleFee: 6000, femaleFee: 4000, venueCost: 20000 };
        const participants: { gender: "MALE" | "FEMALE"; fee: number; paymentStatus: "PAID" | "UNPAID"; isDeleted: boolean }[] = [];

        const result = calculateEventFinancials(event, participants);

        expect(result.maleCount).toBe(0);
        expect(result.femaleCount).toBe(0);
        expect(result.totalCount).toBe(0);
        expect(result.paidCount).toBe(0);
        expect(result.unpaidCount).toBe(0);
        expect(result.expectedRevenue).toBe(0);
        expect(result.paidRevenue).toBe(0);
        expect(result.profitRate).toBeNull();
    });

    // CALC-005: 見込み収入0円で利益率はnull（ゼロ除算回避）
    it("CALC-005: 見込み収入0円でprofitRateがnull", () => {
        const event = { maleFee: 0, femaleFee: 0, venueCost: 10000 };
        const participants = [
            { gender: "MALE" as const, fee: 0, paymentStatus: "PAID" as const, isDeleted: false },
        ];

        const result = calculateEventFinancials(event, participants);

        expect(result.expectedRevenue).toBe(0);
        expect(result.profitRate).toBeNull();
    });

    // CALC-006: 参加費0円の参加者
    it("CALC-006: 参加費0円の参加者でpaidRevenue=0", () => {
        const event = { maleFee: 0, femaleFee: 0, venueCost: 0 };
        const participants = [
            { gender: "MALE" as const, fee: 0, paymentStatus: "PAID" as const, isDeleted: false },
        ];

        const result = calculateEventFinancials(event, participants);

        expect(result.paidRevenue).toBe(0);
    });

    // CALC-007: 個別参加費とイベント標準レートが異なる場合
    it("CALC-007: 個別参加費とイベント標準レートが異なる場合、見込み収入はイベント標準レートで計算", () => {
        const event = { maleFee: 6000, femaleFee: 4000, venueCost: 0 };
        const participants = [
            { gender: "MALE" as const, fee: 5000, paymentStatus: "PAID" as const, isDeleted: false },
        ];

        const result = calculateEventFinancials(event, participants);

        expect(result.expectedRevenue).toBe(6000); // イベント標準レート使用
        expect(result.paidRevenue).toBe(5000); // 個別参加費使用
    });

    // CALC-008: 決済済み収入が見込み収入を超える場合
    it("CALC-008: 決済済み収入が見込み収入を超える場合、uncollectedが負値", () => {
        const event = { maleFee: 5000, femaleFee: 4000, venueCost: 0 };
        const participants = [
            { gender: "MALE" as const, fee: 7000, paymentStatus: "PAID" as const, isDeleted: false },
        ];

        const result = calculateEventFinancials(event, participants);

        expect(result.expectedRevenue).toBe(5000);
        expect(result.paidRevenue).toBe(7000);
        expect(result.uncollected).toBe(-2000); // 負値許容
    });

    // CALC-009: 論理削除された参加者は集計から除外
    it("CALC-009: 論理削除された参加者は集計から除外", () => {
        const event = { maleFee: 6000, femaleFee: 4000, venueCost: 0 };
        const participants = [
            { gender: "MALE" as const, fee: 6000, paymentStatus: "PAID" as const, isDeleted: false },
            { gender: "MALE" as const, fee: 6000, paymentStatus: "PAID" as const, isDeleted: false },
            { gender: "MALE" as const, fee: 6000, paymentStatus: "PAID" as const, isDeleted: true }, // 削除済み
        ];

        const result = calculateEventFinancials(event, participants);

        expect(result.totalCount).toBe(2); // 削除された1名を除外
        expect(result.maleCount).toBe(2);
        expect(result.paidCount).toBe(2);
    });

    // CALC-010: 会場費0円
    it("CALC-010: 会場費0円で見込み利益=見込み収入", () => {
        const event = { maleFee: 6000, femaleFee: 4000, venueCost: 0 };
        const participants = [
            { gender: "MALE" as const, fee: 6000, paymentStatus: "PAID" as const, isDeleted: false },
            { gender: "MALE" as const, fee: 6000, paymentStatus: "PAID" as const, isDeleted: false },
            { gender: "MALE" as const, fee: 6000, paymentStatus: "PAID" as const, isDeleted: false },
            { gender: "FEMALE" as const, fee: 4000, paymentStatus: "PAID" as const, isDeleted: false },
            { gender: "FEMALE" as const, fee: 4000, paymentStatus: "PAID" as const, isDeleted: false },
            { gender: "FEMALE" as const, fee: 4000, paymentStatus: "PAID" as const, isDeleted: false },
        ];

        const result = calculateEventFinancials(event, participants);

        expect(result.expectedRevenue).toBe(30000);
        expect(result.expectedProfit).toBe(30000);
        expect(result.actualProfit).toBe(30000);
    });

    // CALC-011: 利益率の小数精度
    it("CALC-011: 利益率が小数第2位まで正確", () => {
        const event = { maleFee: 6000, femaleFee: 4000, venueCost: 20000 };
        const participants = [
            { gender: "MALE" as const, fee: 6000, paymentStatus: "UNPAID" as const, isDeleted: false },
            { gender: "MALE" as const, fee: 6000, paymentStatus: "UNPAID" as const, isDeleted: false },
            { gender: "MALE" as const, fee: 6000, paymentStatus: "UNPAID" as const, isDeleted: false },
            { gender: "FEMALE" as const, fee: 4000, paymentStatus: "UNPAID" as const, isDeleted: false },
            { gender: "FEMALE" as const, fee: 4000, paymentStatus: "UNPAID" as const, isDeleted: false },
            { gender: "FEMALE" as const, fee: 4000, paymentStatus: "UNPAID" as const, isDeleted: false },
        ];

        const result = calculateEventFinancials(event, participants);

        // expectedRevenue=30000, expectedProfit=10000
        // profitRate = 10000/30000 * 100 = 33.33...
        expect(result.profitRate).toBe(33.33);
    });

    // CALC-012: 男性のみ / 女性のみのイベント
    it("CALC-012: 男性のみのイベントで正しい収支を返す", () => {
        const event = { maleFee: 6000, femaleFee: 4000, venueCost: 0 };
        const participants = [
            { gender: "MALE" as const, fee: 6000, paymentStatus: "UNPAID" as const, isDeleted: false },
            { gender: "MALE" as const, fee: 6000, paymentStatus: "UNPAID" as const, isDeleted: false },
            { gender: "MALE" as const, fee: 6000, paymentStatus: "UNPAID" as const, isDeleted: false },
            { gender: "MALE" as const, fee: 6000, paymentStatus: "UNPAID" as const, isDeleted: false },
            { gender: "MALE" as const, fee: 6000, paymentStatus: "UNPAID" as const, isDeleted: false },
        ];

        const result = calculateEventFinancials(event, participants);

        expect(result.maleCount).toBe(5);
        expect(result.femaleCount).toBe(0);
        expect(result.expectedRevenue).toBe(30000); // maleFee × 5
    });
});
