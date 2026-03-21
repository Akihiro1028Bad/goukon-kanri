import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { PrismaClient } from "@prisma/client";

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

import {
    createParticipant,
    toggleParticipantTask,
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
            eventId: "2025-08-001",
            date: new Date("2025-08-15"),
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

/** ヘルパー: 参加者を1名作成して ID を返す */
async function createTestParticipant(eventId: string): Promise<number> {
    const formData = new FormData();
    formData.append("name", "テスト太郎");
    formData.append("gender", "MALE");
    formData.append("fee", "6000");
    formData.append("paymentStatus", "UNPAID");
    const result = await createParticipant(eventId, formData);
    if (!result.success) throw new Error("Failed to create test participant");
    return result.data.id;
}

describe("toggleParticipantTask (Integration)", () => {
    beforeAll(async () => {
        await testPrisma.$connect();
    });

    afterAll(async () => {
        await testPrisma.$disconnect();
    });

    beforeEach(async () => {
        await testPrisma.eventTodo.deleteMany();
        await testPrisma.participant.deleteMany();
        await testPrisma.event.deleteMany();
    });

    // INT-PT001: detailsSent → false→true
    it("INT-PT001: toggleParticipantTask toggles detailsSent from false to true", async () => {
        const event = await createTestEvent();
        const participantId = await createTestParticipant(event.eventId);

        const result = await toggleParticipantTask(participantId, "detailsSent");
        expect(result.success).toBe(true);

        const participant = await testPrisma.participant.findUnique({
            where: { id: participantId },
        });
        expect(participant?.detailsSent).toBe(true);
    });

    // INT-PT002: detailsSent → true→false
    it("INT-PT002: toggleParticipantTask toggles detailsSent from true to false", async () => {
        const event = await createTestEvent();
        const participantId = await createTestParticipant(event.eventId);

        // true にする
        await toggleParticipantTask(participantId, "detailsSent");
        // false に戻す
        const result = await toggleParticipantTask(participantId, "detailsSent");
        expect(result.success).toBe(true);

        const participant = await testPrisma.participant.findUnique({
            where: { id: participantId },
        });
        expect(participant?.detailsSent).toBe(false);
    });

    // INT-PT003: reminderSent トグル
    it("INT-PT003: toggleParticipantTask toggles reminderSent", async () => {
        const event = await createTestEvent();
        const participantId = await createTestParticipant(event.eventId);

        const result = await toggleParticipantTask(participantId, "reminderSent");
        expect(result.success).toBe(true);

        const participant = await testPrisma.participant.findUnique({
            where: { id: participantId },
        });
        expect(participant?.reminderSent).toBe(true);
    });

    // INT-PT004: thankYouSent トグル
    it("INT-PT004: toggleParticipantTask toggles thankYouSent", async () => {
        const event = await createTestEvent();
        const participantId = await createTestParticipant(event.eventId);

        const result = await toggleParticipantTask(participantId, "thankYouSent");
        expect(result.success).toBe(true);

        const participant = await testPrisma.participant.findUnique({
            where: { id: participantId },
        });
        expect(participant?.thankYouSent).toBe(true);
    });

    // INT-PT005: 存在しない参加者ID
    it("INT-PT005: toggleParticipantTask with non-existent ID returns error", async () => {
        const result = await toggleParticipantTask(999999, "detailsSent");
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBe("参加者が見つかりません");
        }
    });

    // INT-PT006: 無効なタスクタイプ
    it("INT-PT006: toggleParticipantTask with invalid taskType returns error", async () => {
        const event = await createTestEvent();
        const participantId = await createTestParticipant(event.eventId);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await toggleParticipantTask(participantId, "invalidTask" as any);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toContain("無効なタスク種別");
        }
    });

    // INT-PT007: 各タスクは独立して管理される
    it("INT-PT007: each task type is managed independently", async () => {
        const event = await createTestEvent();
        const participantId = await createTestParticipant(event.eventId);

        // detailsSent だけをtrueにする
        await toggleParticipantTask(participantId, "detailsSent");

        const participant = await testPrisma.participant.findUnique({
            where: { id: participantId },
        });
        expect(participant?.detailsSent).toBe(true);
        expect(participant?.reminderSent).toBe(false);
        expect(participant?.thankYouSent).toBe(false);
    });
});
