import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { PrismaClient } from "@prisma/client";

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

import {
    createParticipant,
    updateParticipant,
    deleteParticipant,
    restoreParticipant,
    updatePaymentStatus,
    bulkUpdatePaymentStatus,
} from "@/actions/participant-actions";

const testPrisma = new PrismaClient({
    datasources: {
        db: { url: "postgresql://postgres:postgres@localhost:5433/goukon_kanri_test" },
    },
});

/** ヘルパー: イベントを1件作成 */
async function createTestEvent(overrides: Record<string, unknown> = {}) {
    return testPrisma.event.create({
        data: {
            eventId: "2025-06-001",
            date: new Date("2025-06-15"),
            startTime: "19:00",
            venueName: "テスト会場",
            area: "渋谷",
            maleCapacity: 5,
            femaleCapacity: 5,
            maleFee: 6000,
            femaleFee: 4000,
            status: "SCHEDULED",
            ...overrides,
        },
    });
}

/** ヘルパー: 参加者用FormData作成 */
function createParticipantFormData(overrides: Record<string, string> = {}): FormData {
    const defaults: Record<string, string> = {
        name: "テスト太郎",
        gender: "MALE",
        fee: "6000",
        paymentStatus: "UNPAID",
    };
    const data = new FormData();
    const merged = { ...defaults, ...overrides };
    Object.entries(merged).forEach(([k, v]) => data.append(k, v));
    return data;
}

describe("Participant Server Actions (Integration)", () => {
    beforeAll(async () => {
        await testPrisma.$connect();
    });

    afterAll(async () => {
        await testPrisma.$disconnect();
    });

    beforeEach(async () => {
        await testPrisma.participant.deleteMany();
        await testPrisma.event.deleteMany();
    });

    // INT-P001: createParticipant → 正常系
    it("INT-P001: createParticipant with valid data adds participant to DB", async () => {
        const event = await createTestEvent();
        const formData = createParticipantFormData();
        const result = await createParticipant(event.eventId, formData);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.id).toBeGreaterThan(0);
        }

        const participants = await testPrisma.participant.findMany({
            where: { eventId: event.eventId },
        });
        expect(participants).toHaveLength(1);
        expect(participants[0].name).toBe("テスト太郎");
        expect(participants[0].gender).toBe("MALE");
        expect(participants[0].fee).toBe(6000);
    });

    // INT-P002: createParticipant → バリデーションエラー
    it("INT-P002: createParticipant with invalid data returns error", async () => {
        const event = await createTestEvent();
        const formData = new FormData();
        // Missing all required fields
        const result = await createParticipant(event.eventId, formData);

        expect(result.success).toBe(false);
    });

    // INT-P003: 参加費がイベント標準レートと独立して保存
    it("INT-P003: participant fee is stored independently from event standard rate", async () => {
        const event = await createTestEvent(); // maleFee=6000
        const formData = createParticipantFormData({ fee: "5000" });
        const result = await createParticipant(event.eventId, formData);

        expect(result.success).toBe(true);
        if (result.success) {
            const participant = await testPrisma.participant.findUnique({
                where: { id: result.data.id },
            });
            expect(participant?.fee).toBe(5000); // Not 6000
        }
    });

    // INT-P004: updateParticipant → 正常系
    it("INT-P004: updateParticipant updates participant in DB", async () => {
        const event = await createTestEvent();
        const formData = createParticipantFormData();
        const createResult = await createParticipant(event.eventId, formData);
        expect(createResult.success).toBe(true);

        const id = createResult.success ? createResult.data.id : 0;
        const updateFormData = createParticipantFormData({
            name: "更新太郎",
            fee: "7000",
        });
        const updateResult = await updateParticipant(id, updateFormData);
        expect(updateResult.success).toBe(true);

        const participant = await testPrisma.participant.findUnique({
            where: { id },
        });
        expect(participant?.name).toBe("更新太郎");
        expect(participant?.fee).toBe(7000);
    });

    // INT-P005: deleteParticipant → isDeleted=true
    it("INT-P005: deleteParticipant sets isDeleted to true", async () => {
        const event = await createTestEvent();
        const formData = createParticipantFormData();
        const createResult = await createParticipant(event.eventId, formData);
        expect(createResult.success).toBe(true);

        const id = createResult.success ? createResult.data.id : 0;
        const deleteResult = await deleteParticipant(id);
        expect(deleteResult.success).toBe(true);

        const participant = await testPrisma.participant.findUnique({
            where: { id },
        });
        expect(participant?.isDeleted).toBe(true);
    });

    // INT-P006: restoreParticipant → isDeleted=false
    it("INT-P006: restoreParticipant sets isDeleted to false", async () => {
        const event = await createTestEvent();
        const formData = createParticipantFormData();
        const createResult = await createParticipant(event.eventId, formData);
        expect(createResult.success).toBe(true);

        const id = createResult.success ? createResult.data.id : 0;
        await deleteParticipant(id);
        const restoreResult = await restoreParticipant(id);
        expect(restoreResult.success).toBe(true);

        const participant = await testPrisma.participant.findUnique({
            where: { id },
        });
        expect(participant?.isDeleted).toBe(false);
    });

    // INT-P007: updatePaymentStatus → PAID
    it("INT-P007: updatePaymentStatus sets PAID with date and confirmedBy", async () => {
        const event = await createTestEvent();
        const formData = createParticipantFormData();
        const createResult = await createParticipant(event.eventId, formData);
        expect(createResult.success).toBe(true);

        const id = createResult.success ? createResult.data.id : 0;
        const paymentDate = new Date("2025-06-15");
        const result = await updatePaymentStatus(id, "PAID", paymentDate, "確認者A");
        expect(result.success).toBe(true);

        const participant = await testPrisma.participant.findUnique({
            where: { id },
        });
        expect(participant?.paymentStatus).toBe("PAID");
        expect(participant?.paymentDate).toEqual(paymentDate);
        expect(participant?.paymentConfirmedBy).toBe("確認者A");
    });

    // INT-P008: updatePaymentStatus → UNPAID (戻す)
    it("INT-P008: updatePaymentStatus to UNPAID clears paymentDate and confirmedBy", async () => {
        const event = await createTestEvent();
        const formData = createParticipantFormData();
        const createResult = await createParticipant(event.eventId, formData);
        expect(createResult.success).toBe(true);

        const id = createResult.success ? createResult.data.id : 0;
        // 一度PAIDに
        await updatePaymentStatus(id, "PAID", new Date("2025-06-15"), "確認者A");
        // UNPAIDに戻す
        const result = await updatePaymentStatus(id, "UNPAID");
        expect(result.success).toBe(true);

        const participant = await testPrisma.participant.findUnique({
            where: { id },
        });
        expect(participant?.paymentStatus).toBe("UNPAID");
        expect(participant?.paymentDate).toBeNull();
        expect(participant?.paymentConfirmedBy).toBeNull();
    });

    // INT-P009: bulkUpdatePaymentStatus → 3名一括PAID
    it("INT-P009: bulkUpdatePaymentStatus updates multiple participants to PAID", async () => {
        const event = await createTestEvent();

        // 3名作成
        const ids: number[] = [];
        for (let i = 0; i < 3; i++) {
            const formData = createParticipantFormData({ name: `参加者${i + 1}` });
            const result = await createParticipant(event.eventId, formData);
            expect(result.success).toBe(true);
            if (result.success) ids.push(result.data.id);
        }

        const paymentDate = new Date("2025-06-15");
        const result = await bulkUpdatePaymentStatus(ids, paymentDate, "確認者B");
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.updatedCount).toBe(3);
        }

        const participants = await testPrisma.participant.findMany({
            where: { id: { in: ids } },
        });
        expect(participants.every((p) => p.paymentStatus === "PAID")).toBe(true);
        expect(participants.every((p) => p.paymentConfirmedBy === "確認者B")).toBe(true);
    });

    // INT-P010: bulkUpdatePaymentStatus 空配列 → エラー
    it("INT-P010: bulkUpdatePaymentStatus with empty array returns error", async () => {
        const result = await bulkUpdatePaymentStatus([], new Date(), "確認者");
        expect(result.success).toBe(false);
    });

    // INT-P011: 100名登録しても全て成功
    it("INT-P011: creating 100 participants all succeed", async () => {
        const event = await createTestEvent();

        for (let i = 0; i < 100; i++) {
            const formData = createParticipantFormData({ name: `参加者${i + 1}` });
            const result = await createParticipant(event.eventId, formData);
            expect(result.success).toBe(true);
        }

        const count = await testPrisma.participant.count({
            where: { eventId: event.eventId },
        });
        expect(count).toBe(100);
    });
});
