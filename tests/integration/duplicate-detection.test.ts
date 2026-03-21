import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { PrismaClient } from "@prisma/client";

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

import { createParticipant } from "@/actions/participant-actions";
import { checkDuplicates } from "@/actions/duplicate-check-actions";
import { findDuplicateParticipants } from "@/queries/participant-queries";

const testPrisma = new PrismaClient({
    datasources: {
        db: { url: "postgresql://postgres:postgres@localhost:5433/goukon_kanri_test" },
    },
});

let eventCounter = 0;

/** ヘルパー: ユニークなイベントIDでイベントを作成 */
async function createTestEvent(overrides: Record<string, unknown> = {}) {
    eventCounter++;
    const eventId = overrides.eventId as string ?? `2025-07-${String(eventCounter).padStart(3, "0")}`;
    return testPrisma.event.create({
        data: {
            eventId,
            date: new Date("2025-07-15"),
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

/** ヘルパー: 参加者を直接DB作成 */
async function createTestParticipant(
    eventId: string,
    name: string,
    overrides: Record<string, unknown> = {}
) {
    return testPrisma.participant.create({
        data: {
            eventId,
            name,
            gender: "MALE",
            fee: 6000,
            paymentStatus: "UNPAID",
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

describe("Duplicate Detection (Integration)", () => {
    beforeAll(async () => {
        await testPrisma.$connect();
    });

    afterAll(async () => {
        await testPrisma.$disconnect();
    });

    beforeEach(async () => {
        await testPrisma.participant.deleteMany();
        await testPrisma.event.deleteMany();
        eventCounter = 0;
    });

    describe("findDuplicateParticipants query", () => {
        // INT-DUP-001: 重複なしの場合
        it("INT-DUP-001: returns empty when no overlapping participants in past events", async () => {
            const eventA = await createTestEvent({ eventId: "2025-07-001" });
            const eventB = await createTestEvent({ eventId: "2025-07-002" });

            await createTestParticipant(eventA.eventId, "田中太郎");
            await createTestParticipant(eventA.eventId, "鈴木花子");
            // Different people in past event
            await createTestParticipant(eventB.eventId, "佐藤一郎");
            await createTestParticipant(eventB.eventId, "山田二郎");

            const result = await findDuplicateParticipants(eventA.eventId);
            expect(result).toEqual([]);
        });

        // INT-DUP-002: 2名が過去イベントで共演
        it("INT-DUP-002: detects 2 participants who shared a past event", async () => {
            const pastEvent = await createTestEvent({ eventId: "2024-12-001", venueName: "過去の会場" });
            const currentEvent = await createTestEvent({ eventId: "2025-07-001" });

            // Past event: 田中 & 鈴木 were together
            await createTestParticipant(pastEvent.eventId, "田中太郎");
            await createTestParticipant(pastEvent.eventId, "鈴木花子");

            // Current event: same people
            await createTestParticipant(currentEvent.eventId, "田中太郎");
            await createTestParticipant(currentEvent.eventId, "鈴木花子");

            const result = await findDuplicateParticipants(currentEvent.eventId);
            expect(result).toHaveLength(1);
            expect(result[0].participantA).toBe("田中太郎");
            expect(result[0].participantB).toBe("鈴木花子");
            expect(result[0].sharedEvents).toHaveLength(1);
            expect(result[0].sharedEvents[0].eventId).toBe("2024-12-001");
            expect(result[0].sharedEvents[0].venueName).toBe("過去の会場");
        });

        // INT-DUP-003: 複数の過去イベントでの重複
        it("INT-DUP-003: aggregates multiple shared past events into one pair", async () => {
            const pastEvent1 = await createTestEvent({ eventId: "2024-11-001", venueName: "会場A" });
            const pastEvent2 = await createTestEvent({ eventId: "2024-12-001", venueName: "会場B" });
            const currentEvent = await createTestEvent({ eventId: "2025-07-001" });

            // Both past events: 田中 & 鈴木 were together
            await createTestParticipant(pastEvent1.eventId, "田中太郎");
            await createTestParticipant(pastEvent1.eventId, "鈴木花子");
            await createTestParticipant(pastEvent2.eventId, "田中太郎");
            await createTestParticipant(pastEvent2.eventId, "鈴木花子");

            // Current event
            await createTestParticipant(currentEvent.eventId, "田中太郎");
            await createTestParticipant(currentEvent.eventId, "鈴木花子");

            const result = await findDuplicateParticipants(currentEvent.eventId);
            expect(result).toHaveLength(1);
            expect(result[0].sharedEvents).toHaveLength(2);
        });

        // INT-DUP-004: 論理削除済みの参加者は対象外
        it("INT-DUP-004: excludes soft-deleted participants", async () => {
            const pastEvent = await createTestEvent({ eventId: "2024-12-001" });
            const currentEvent = await createTestEvent({ eventId: "2025-07-001" });

            // Past event: 田中(active) & 鈴木(deleted) were together
            await createTestParticipant(pastEvent.eventId, "田中太郎");
            await createTestParticipant(pastEvent.eventId, "鈴木花子", { isDeleted: true });

            // Current event
            await createTestParticipant(currentEvent.eventId, "田中太郎");
            await createTestParticipant(currentEvent.eventId, "鈴木花子");

            const result = await findDuplicateParticipants(currentEvent.eventId);
            expect(result).toEqual([]); // 鈴木 was deleted in past event, so no overlap
        });

        // INT-DUP-005: 論理削除済みのイベントは対象外
        it("INT-DUP-005: excludes soft-deleted events", async () => {
            const pastEvent = await createTestEvent({ eventId: "2024-12-001", isDeleted: true });
            const currentEvent = await createTestEvent({ eventId: "2025-07-001" });

            await createTestParticipant(pastEvent.eventId, "田中太郎");
            await createTestParticipant(pastEvent.eventId, "鈴木花子");

            await createTestParticipant(currentEvent.eventId, "田中太郎");
            await createTestParticipant(currentEvent.eventId, "鈴木花子");

            const result = await findDuplicateParticipants(currentEvent.eventId);
            expect(result).toEqual([]); // Past event is deleted
        });

        // INT-DUP-006: 対象イベント自身は除外される
        it("INT-DUP-006: does not self-reference current event", async () => {
            const currentEvent = await createTestEvent({ eventId: "2025-07-001" });

            // Only current event participants, no past events
            await createTestParticipant(currentEvent.eventId, "田中太郎");
            await createTestParticipant(currentEvent.eventId, "鈴木花子");

            const result = await findDuplicateParticipants(currentEvent.eventId);
            expect(result).toEqual([]); // Should not detect self
        });

        // INT-DUP-007: 3名が共演 → 3ペア生成
        it("INT-DUP-007: generates 3 pairs from 3 overlapping participants", async () => {
            const pastEvent = await createTestEvent({ eventId: "2024-12-001" });
            const currentEvent = await createTestEvent({ eventId: "2025-07-001" });

            const names = ["A太郎", "B花子", "C次郎"];
            for (const name of names) {
                await createTestParticipant(pastEvent.eventId, name);
                await createTestParticipant(currentEvent.eventId, name);
            }

            const result = await findDuplicateParticipants(currentEvent.eventId);
            expect(result).toHaveLength(3); // A-B, A-C, B-C
        });
    });

    describe("createParticipant with duplicate detection", () => {
        // INT-DUP-010: createParticipant returns duplicates in response
        it("INT-DUP-010: createParticipant returns duplicate info after registration", async () => {
            const pastEvent = await createTestEvent({ eventId: "2024-12-001" });
            const currentEvent = await createTestEvent({ eventId: "2025-07-001" });

            // Past event: 田中 & 鈴木 were together
            await createTestParticipant(pastEvent.eventId, "田中太郎");
            await createTestParticipant(pastEvent.eventId, "鈴木花子");

            // Add 田中 to current event first
            await createTestParticipant(currentEvent.eventId, "田中太郎");

            // Add 鈴木 via createParticipant action
            const formData = createParticipantFormData({ name: "鈴木花子", gender: "FEMALE", fee: "4000" });
            const result = await createParticipant(currentEvent.eventId, formData);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.id).toBeGreaterThan(0);
                expect(result.data.duplicates).toHaveLength(1);
                expect(result.data.duplicates[0].participantA).toBe("田中太郎");
                expect(result.data.duplicates[0].participantB).toBe("鈴木花子");
            }
        });

        // INT-DUP-011: createParticipant returns empty duplicates when no overlap
        it("INT-DUP-011: createParticipant returns empty duplicates when no overlap", async () => {
            const currentEvent = await createTestEvent({ eventId: "2025-07-001" });

            const formData = createParticipantFormData({ name: "新規太郎" });
            const result = await createParticipant(currentEvent.eventId, formData);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.duplicates).toEqual([]);
            }
        });
    });

    describe("checkDuplicates server action", () => {
        // INT-DUP-020: checkDuplicates returns correct result
        it("INT-DUP-020: checkDuplicates returns duplicate check result", async () => {
            const pastEvent = await createTestEvent({ eventId: "2024-12-001" });
            const currentEvent = await createTestEvent({ eventId: "2025-07-001" });

            await createTestParticipant(pastEvent.eventId, "田中太郎");
            await createTestParticipant(pastEvent.eventId, "鈴木花子");
            await createTestParticipant(currentEvent.eventId, "田中太郎");
            await createTestParticipant(currentEvent.eventId, "鈴木花子");

            const result = await checkDuplicates(currentEvent.eventId);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.eventId).toBe(currentEvent.eventId);
                expect(result.data.duplicates).toHaveLength(1);
                expect(result.data.checkedAt).toBeInstanceOf(Date);
            }
        });

        // INT-DUP-021: checkDuplicates returns empty when no duplicates
        it("INT-DUP-021: checkDuplicates returns empty duplicates when none found", async () => {
            const currentEvent = await createTestEvent({ eventId: "2025-07-001" });
            await createTestParticipant(currentEvent.eventId, "田中太郎");

            const result = await checkDuplicates(currentEvent.eventId);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.duplicates).toEqual([]);
            }
        });
    });
});
