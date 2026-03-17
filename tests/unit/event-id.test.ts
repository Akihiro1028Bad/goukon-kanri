import { describe, it, expect, vi } from "vitest";
import { generateEventId } from "@/lib/event-id";

// Mock PrismaClient
function createMockPrisma(findFirstReturn: { eventId: string } | null = null) {
  return {
    event: {
      findFirst: vi.fn().mockResolvedValue(findFirstReturn),
    },
  } as unknown as Parameters<typeof generateEventId>[0];
}

describe("generateEventId", () => {
  // EVID-001: 当月初のイベント → "2025-02-001"
  it("EVID-001: returns 001 for the first event of the month", async () => {
    const prisma = createMockPrisma(null);
    const result = await generateEventId(prisma, new Date("2025-02-15"));
    expect(result).toBe("2025-02-001");
    expect(prisma.event.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          eventId: { startsWith: "2025-02-" },
        }),
        orderBy: { eventId: "desc" },
      })
    );
  });

  // EVID-002: 当月2件目 → "2025-02-002"
  it("EVID-002: returns 002 for the second event of the month", async () => {
    const prisma = createMockPrisma({ eventId: "2025-02-001" });
    const result = await generateEventId(prisma, new Date("2025-02-20"));
    expect(result).toBe("2025-02-002");
  });

  // EVID-003: 当月3件目（連番正常増加）
  it("EVID-003: returns 003 for the third event of the month", async () => {
    const prisma = createMockPrisma({ eventId: "2025-02-002" });
    const result = await generateEventId(prisma, new Date("2025-02-25"));
    expect(result).toBe("2025-02-003");
  });

  // EVID-004: 論理削除済みIDを含む最大値から採番（削除IDは再利用しない）
  it("EVID-004: includes logically deleted events when finding max sequence number", async () => {
    // DB has 001, 002(deleted), 003 — max is 003, so next is 004
    const prisma = createMockPrisma({ eventId: "2025-02-003" });
    const result = await generateEventId(prisma, new Date("2025-02-28"));
    expect(result).toBe("2025-02-004");
  });

  // EVID-005: 欠番があっても再利用しない（単調増加）
  it("EVID-005: does not reuse skipped sequence numbers (monotonic increase)", async () => {
    // DB has 001, 003 (002 missing) — max is 003, so next is 004
    const prisma = createMockPrisma({ eventId: "2025-02-003" });
    const result = await generateEventId(prisma, new Date("2025-02-28"));
    expect(result).toBe("2025-02-004");
  });

  // EVID-006: NNN は3桁ゼロ埋め
  it("EVID-006: zero-pads NNN to at least 3 digits", async () => {
    const prisma = createMockPrisma({ eventId: "2025-02-099" });
    const result = await generateEventId(prisma, new Date("2025-02-15"));
    expect(result).toBe("2025-02-100");
  });

  // EVID-007: NNN > 999 でも動作する（4桁対応）
  it("EVID-007: handles NNN beyond 999 (4-digit sequence)", async () => {
    const prisma = createMockPrisma({ eventId: "2025-02-999" });
    const result = await generateEventId(prisma, new Date("2025-02-15"));
    expect(result).toBe("2025-02-1000");
  });

  // EVID-008: 月が変わるとシーケンスがリセットされる
  it("EVID-008: resets sequence when month changes", async () => {
    const prisma = createMockPrisma(null); // No events in March
    const result = await generateEventId(prisma, new Date("2025-03-10"));
    expect(result).toBe("2025-03-001");
    expect(prisma.event.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          eventId: { startsWith: "2025-03-" },
        }),
      })
    );
  });

  // EVID-009: 年が変わるとシーケンスがリセットされる
  it("EVID-009: resets sequence when year changes", async () => {
    const prisma = createMockPrisma(null); // No events in January 2026
    const result = await generateEventId(prisma, new Date("2026-01-05"));
    expect(result).toBe("2026-01-001");
    expect(prisma.event.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          eventId: { startsWith: "2026-01-" },
        }),
      })
    );
  });

  // EVID-010: 月のゼロ埋め（1月 → "01"）
  it("EVID-010: zero-pads month to 2 digits (January → 01)", async () => {
    const prisma = createMockPrisma(null);
    const result = await generateEventId(prisma, new Date("2025-01-10"));
    expect(result).toBe("2025-01-001");
  });

  // EVID-011: 12月のイベント
  it("EVID-011: handles December correctly (month 12)", async () => {
    const prisma = createMockPrisma(null);
    const result = await generateEventId(prisma, new Date("2025-12-25"));
    expect(result).toBe("2025-12-001");
  });

  // EVID-012: 月の境界日（月初日）のイベント
  it("EVID-012: handles event date at month boundary (first day of month)", async () => {
    const prisma = createMockPrisma(null);
    const result = await generateEventId(prisma, new Date("2025-03-01"));
    expect(result).toMatch(/^2025-03-/);
    expect(result).toBe("2025-03-001");
  });
});
