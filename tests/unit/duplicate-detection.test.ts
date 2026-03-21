import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DuplicatePair } from "@/types";

// Mock prisma
const mockFindMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
    prisma: {
        participant: {
            findMany: (...args: unknown[]) => mockFindMany(...args),
        },
    },
}));

import { findDuplicateParticipants } from "@/queries/participant-queries";

describe("findDuplicateParticipants (Unit)", () => {
    beforeEach(() => {
        mockFindMany.mockReset();
    });

    // DUP-001: 参加者が1名以下の場合、空配列を返す
    it("DUP-001: returns empty array when event has 0 participants", async () => {
        mockFindMany.mockResolvedValueOnce([]); // currentParticipants

        const result = await findDuplicateParticipants("2025-01-001");
        expect(result).toEqual([]);
        expect(mockFindMany).toHaveBeenCalledTimes(1);
    });

    it("DUP-001b: returns empty array when event has 1 participant", async () => {
        mockFindMany.mockResolvedValueOnce([{ name: "田中太郎" }]);

        const result = await findDuplicateParticipants("2025-01-001");
        expect(result).toEqual([]);
        expect(mockFindMany).toHaveBeenCalledTimes(1); // 2nd query should not be called
    });

    // DUP-002: 過去に重複がない場合、空配列を返す
    it("DUP-002: returns empty array when no duplicates in past events", async () => {
        // Current event has 2 participants
        mockFindMany.mockResolvedValueOnce([
            { name: "田中太郎" },
            { name: "鈴木花子" },
        ]);
        // Past participants: each appears in different events, never together
        mockFindMany.mockResolvedValueOnce([
            {
                name: "田中太郎",
                eventId: "2024-12-001",
                event: { eventId: "2024-12-001", date: new Date("2024-12-01"), venueName: "会場A" },
            },
            {
                name: "鈴木花子",
                eventId: "2024-11-001",
                event: { eventId: "2024-11-001", date: new Date("2024-11-01"), venueName: "会場B" },
            },
        ]);

        const result = await findDuplicateParticipants("2025-01-001");
        expect(result).toEqual([]);
    });

    // DUP-003: 2名が過去1イベントで一緒だった場合、1ペアを返す
    it("DUP-003: returns 1 pair when 2 participants shared 1 past event", async () => {
        mockFindMany.mockResolvedValueOnce([
            { name: "田中太郎" },
            { name: "鈴木花子" },
        ]);
        mockFindMany.mockResolvedValueOnce([
            {
                name: "田中太郎",
                eventId: "2024-12-001",
                event: { eventId: "2024-12-001", date: new Date("2024-12-01"), venueName: "会場A" },
            },
            {
                name: "鈴木花子",
                eventId: "2024-12-001",
                event: { eventId: "2024-12-001", date: new Date("2024-12-01"), venueName: "会場A" },
            },
        ]);

        const result = await findDuplicateParticipants("2025-01-001");
        expect(result).toHaveLength(1);
        expect(result[0].participantA).toBe("田中太郎");
        expect(result[0].participantB).toBe("鈴木花子");
        expect(result[0].sharedEvents).toHaveLength(1);
        expect(result[0].sharedEvents[0].eventId).toBe("2024-12-001");
    });

    // DUP-004: 3名が過去1イベントで一緒だった場合、3ペアを返す
    it("DUP-004: returns 3 pairs when 3 participants shared 1 past event", async () => {
        mockFindMany.mockResolvedValueOnce([
            { name: "A太郎" },
            { name: "B花子" },
            { name: "C次郎" },
        ]);
        const pastEventId = "2024-12-001";
        const pastEvent = {
            eventId: pastEventId,
            date: new Date("2024-12-01"),
            venueName: "会場X",
        };
        mockFindMany.mockResolvedValueOnce([
            { name: "A太郎", eventId: pastEventId, event: pastEvent },
            { name: "B花子", eventId: pastEventId, event: pastEvent },
            { name: "C次郎", eventId: pastEventId, event: pastEvent },
        ]);

        const result = await findDuplicateParticipants("2025-01-001");
        expect(result).toHaveLength(3);

        // Pairs should be: A-B, A-C, B-C (sorted alphabetically)
        const pairKeys = result.map(
            (p: DuplicatePair) => `${p.participantA}::${p.participantB}`
        );
        expect(pairKeys).toContain("A太郎::B花子");
        expect(pairKeys).toContain("A太郎::C次郎");
        expect(pairKeys).toContain("B花子::C次郎");
    });

    // DUP-005: 2名が過去複数イベントで一緒だった場合、1ペアに複数イベントが含まれる
    it("DUP-005: returns 1 pair with multiple shared events", async () => {
        mockFindMany.mockResolvedValueOnce([
            { name: "田中太郎" },
            { name: "鈴木花子" },
        ]);
        mockFindMany.mockResolvedValueOnce([
            {
                name: "田中太郎",
                eventId: "2024-11-001",
                event: { eventId: "2024-11-001", date: new Date("2024-11-01"), venueName: "会場A" },
            },
            {
                name: "鈴木花子",
                eventId: "2024-11-001",
                event: { eventId: "2024-11-001", date: new Date("2024-11-01"), venueName: "会場A" },
            },
            {
                name: "田中太郎",
                eventId: "2024-12-001",
                event: { eventId: "2024-12-001", date: new Date("2024-12-01"), venueName: "会場B" },
            },
            {
                name: "鈴木花子",
                eventId: "2024-12-001",
                event: { eventId: "2024-12-001", date: new Date("2024-12-01"), venueName: "会場B" },
            },
        ]);

        const result = await findDuplicateParticipants("2025-01-001");
        expect(result).toHaveLength(1);
        expect(result[0].sharedEvents).toHaveLength(2);
        const eventIds = result[0].sharedEvents.map(
            (e: { eventId: string }) => e.eventId
        );
        expect(eventIds).toContain("2024-11-001");
        expect(eventIds).toContain("2024-12-001");
    });

    // DUP-006: 論理削除済みの参加者は検索対象外
    it("DUP-006: deleted participants are excluded (verified by query filter)", async () => {
        mockFindMany.mockResolvedValueOnce([
            { name: "田中太郎" },
            { name: "鈴木花子" },
        ]);
        // 2nd call: past participants query includes isDeleted: false filter
        mockFindMany.mockResolvedValueOnce([]);

        await findDuplicateParticipants("2025-01-001");

        // Verify the 1st query filters by isDeleted: false
        expect(mockFindMany).toHaveBeenNthCalledWith(1, {
            where: {
                eventId: "2025-01-001",
                isDeleted: false,
            },
            select: { name: true },
        });

        // Verify the 2nd query filters by isDeleted: false
        const secondCallArgs = mockFindMany.mock.calls[1][0];
        expect(secondCallArgs.where.isDeleted).toBe(false);
    });

    // DUP-007: 論理削除済みのイベントは検索対象外
    it("DUP-007: deleted events are excluded (verified by query filter)", async () => {
        mockFindMany.mockResolvedValueOnce([
            { name: "田中太郎" },
            { name: "鈴木花子" },
        ]);
        mockFindMany.mockResolvedValueOnce([]);

        await findDuplicateParticipants("2025-01-001");

        // Verify the 2nd query filters by event.isDeleted: false
        const secondCallArgs = mockFindMany.mock.calls[1][0];
        expect(secondCallArgs.where.event).toEqual({ isDeleted: false });
    });

    // DUP-008: 対象イベント自身は検索対象外
    it("DUP-008: current event is excluded from past events search", async () => {
        mockFindMany.mockResolvedValueOnce([
            { name: "田中太郎" },
            { name: "鈴木花子" },
        ]);
        mockFindMany.mockResolvedValueOnce([]);

        await findDuplicateParticipants("2025-01-001");

        // Verify the 2nd query excludes the current eventId
        const secondCallArgs = mockFindMany.mock.calls[1][0];
        expect(secondCallArgs.where.eventId).toEqual({ not: "2025-01-001" });
    });
});
