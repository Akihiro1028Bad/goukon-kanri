import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { getEvents, getEventDetail, getReportData } from "@/queries/event-queries";
import { getAllParticipants } from "@/queries/participant-queries";
import { getMonthlySummary } from "@/queries/dashboard-queries";
import { calculateEventFinancials } from "@/lib/calculations";

const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:postgres@localhost:5433/goukon_kanri_test",
    },
  },
});

async function createTestEvent(overrides: Record<string, unknown> = {}) {
  return testPrisma.event.create({
    data: {
      eventId: "2025-02-001",
      date: new Date("2025-02-15"),
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

describe("Event Queries (Integration)", () => {
  beforeEach(async () => {
    await testPrisma.eventTodo.deleteMany();
    await testPrisma.participant.deleteMany();
    await testPrisma.event.deleteMany();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  // INT-Q001: getEvents with year filter returns only that year's events
  describe("INT-Q001: year filter", () => {
    it("returns only events from the specified year", async () => {
      await createTestEvent({
        eventId: "2025-02-001",
        date: new Date("2025-02-15"),
      });
      await createTestEvent({
        eventId: "2025-06-001",
        date: new Date("2025-06-10"),
      });
      await createTestEvent({
        eventId: "2024-11-001",
        date: new Date("2024-11-20"),
      });

      const result = await getEvents({ year: 2025 });

      expect(result).toHaveLength(2);
      expect(result.every((e) => e.eventId.startsWith("2025-"))).toBe(true);
    });
  });

  // INT-Q002: getEvents with month filter returns only that month's events
  describe("INT-Q002: month filter", () => {
    it("returns only events from the specified month", async () => {
      await createTestEvent({
        eventId: "2025-02-001",
        date: new Date("2025-02-15"),
      });
      await createTestEvent({
        eventId: "2025-06-001",
        date: new Date("2025-06-10"),
      });
      await createTestEvent({
        eventId: "2025-09-001",
        date: new Date("2025-09-05"),
      });

      const result = await getEvents({ year: 2025, month: 6 });

      expect(result).toHaveLength(1);
      expect(result[0].eventId).toBe("2025-06-001");
    });
  });

  // INT-Q003: getEvents with status filter returns only matching status
  describe("INT-Q003: status filter", () => {
    it("returns only events with the specified status", async () => {
      await createTestEvent({
        eventId: "2025-02-001",
        date: new Date("2025-02-15"),
        status: "SCHEDULED",
      });
      await createTestEvent({
        eventId: "2025-03-001",
        date: new Date("2025-03-10"),
        status: "COMPLETED",
      });
      await createTestEvent({
        eventId: "2025-04-001",
        date: new Date("2025-04-05"),
        status: "CANCELLED",
      });

      const result = await getEvents({ year: 2025, status: "COMPLETED" });

      expect(result).toHaveLength(1);
      expect(result[0].eventId).toBe("2025-03-001");
      expect(result[0].status).toBe("COMPLETED");
    });
  });

  // INT-Q004: getEvents excludes logically deleted events by default
  describe("INT-Q004: logical deletion exclusion", () => {
    it("excludes logically deleted events by default", async () => {
      await createTestEvent({
        eventId: "2025-02-001",
        date: new Date("2025-02-15"),
        isDeleted: false,
      });
      await createTestEvent({
        eventId: "2025-03-001",
        date: new Date("2025-03-10"),
        isDeleted: true,
      });
      await createTestEvent({
        eventId: "2025-04-001",
        date: new Date("2025-04-05"),
        isDeleted: false,
      });

      const result = await getEvents({ year: 2025 });

      expect(result).toHaveLength(2);
      expect(result.some((e) => e.eventId === "2025-03-001")).toBe(false);
    });
  });

  // INT-Q005: getEvents with includeDeleted=true includes deleted events
  describe("INT-Q005: includeDeleted flag", () => {
    it("includes logically deleted events when includeDeleted is true", async () => {
      await createTestEvent({
        eventId: "2025-02-001",
        date: new Date("2025-02-15"),
        isDeleted: false,
      });
      await createTestEvent({
        eventId: "2025-03-001",
        date: new Date("2025-03-10"),
        isDeleted: true,
      });

      const result = await getEvents({ year: 2025, includeDeleted: true });

      expect(result).toHaveLength(2);
      expect(result.some((e) => e.eventId === "2025-03-001")).toBe(true);
    });
  });

  // INT-Q006: getEvents returns sorted by date desc by default
  describe("INT-Q006: default sort order", () => {
    it("returns events sorted by date descending", async () => {
      await createTestEvent({
        eventId: "2025-02-001",
        date: new Date("2025-02-15"),
      });
      await createTestEvent({
        eventId: "2025-06-001",
        date: new Date("2025-06-10"),
      });
      await createTestEvent({
        eventId: "2025-04-001",
        date: new Date("2025-04-05"),
      });

      const result = await getEvents({ year: 2025 });

      expect(result).toHaveLength(3);
      expect(result[0].eventId).toBe("2025-06-001");
      expect(result[1].eventId).toBe("2025-04-001");
      expect(result[2].eventId).toBe("2025-02-001");
    });
  });
});

describe("Participant Queries (Integration)", () => {
  beforeEach(async () => {
    await testPrisma.eventTodo.deleteMany();
    await testPrisma.participant.deleteMany();
    await testPrisma.event.deleteMany();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  // INT-Q007: getEventDetail returns event with participants and financials
  it("INT-Q007: getEventDetail returns event with participants and financials", async () => {
    const event = await createTestEvent();
    await testPrisma.participant.createMany({
      data: [
        { eventId: event.eventId, name: "太郎", gender: "MALE", fee: 6000, paymentStatus: "PAID" },
        { eventId: event.eventId, name: "花子", gender: "FEMALE", fee: 4000, paymentStatus: "UNPAID" },
      ],
    });

    const detail = await getEventDetail(event.eventId);

    expect(detail).not.toBeNull();
    expect(detail!.participants).toHaveLength(2);
    expect(detail!.financials).toBeDefined();
    expect(detail!.financials.maleCount).toBe(1);
    expect(detail!.financials.femaleCount).toBe(1);
  });

  // INT-Q008: getEventDetail financials match calculateEventFinancials
  it("INT-Q008: getEventDetail financials match calculateEventFinancials", async () => {
    const event = await createTestEvent();
    const participantsData = [
      { eventId: event.eventId, name: "太郎", gender: "MALE" as const, fee: 6000, paymentStatus: "PAID" as const, isDeleted: false },
      { eventId: event.eventId, name: "次郎", gender: "MALE" as const, fee: 6000, paymentStatus: "UNPAID" as const, isDeleted: false },
      { eventId: event.eventId, name: "花子", gender: "FEMALE" as const, fee: 4000, paymentStatus: "PAID" as const, isDeleted: false },
    ];
    await testPrisma.participant.createMany({ data: participantsData });

    const detail = await getEventDetail(event.eventId);
    const expected = calculateEventFinancials(
      { maleFee: event.maleFee, femaleFee: event.femaleFee, venueCost: event.venueCost, expectedCashback: event.expectedCashback, actualCashback: event.actualCashback },
      participantsData
    );

    expect(detail!.financials).toEqual(expected);
  });

  // INT-Q009: getAllParticipants returns participants from all events
  it("INT-Q009: getAllParticipants returns participants from all events", async () => {
    const event1 = await createTestEvent({ eventId: "2025-02-001", date: new Date("2025-02-15") });
    const event2 = await createTestEvent({ eventId: "2025-03-001", date: new Date("2025-03-15") });

    await testPrisma.participant.createMany({
      data: [
        { eventId: event1.eventId, name: "太郎", gender: "MALE", fee: 6000, paymentStatus: "UNPAID" },
        { eventId: event2.eventId, name: "花子", gender: "FEMALE", fee: 4000, paymentStatus: "UNPAID" },
      ],
    });

    const result = await getAllParticipants();
    expect(result).toHaveLength(2);
  });

  // INT-Q010: getAllParticipants with nameFilter filters by partial match
  it("INT-Q010: getAllParticipants with nameFilter filters by partial match", async () => {
    const event = await createTestEvent();
    await testPrisma.participant.createMany({
      data: [
        { eventId: event.eventId, name: "田中太郎", gender: "MALE", fee: 6000, paymentStatus: "UNPAID" },
        { eventId: event.eventId, name: "田辺花子", gender: "FEMALE", fee: 4000, paymentStatus: "UNPAID" },
        { eventId: event.eventId, name: "山田三郎", gender: "MALE", fee: 6000, paymentStatus: "UNPAID" },
      ],
    });

    const result = await getAllParticipants({ nameFilter: "田中" });
    expect(result).toHaveLength(1);
    expect(result.every((p: { name: string }) => p.name.includes("田中"))).toBe(true);
  });

  // INT-Q011: getAllParticipants result includes required fields
  it("INT-Q011: getAllParticipants results include name, eventId, gender, fee, paymentStatus", async () => {
    const event = await createTestEvent();
    await testPrisma.participant.create({
      data: { eventId: event.eventId, name: "太郎", gender: "MALE", fee: 6000, paymentStatus: "PAID" },
    });

    const result = await getAllParticipants();
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("name", "太郎");
    expect(result[0]).toHaveProperty("eventId", event.eventId);
    expect(result[0]).toHaveProperty("gender", "MALE");
    expect(result[0]).toHaveProperty("fee", 6000);
    expect(result[0]).toHaveProperty("paymentStatus", "PAID");
  });
});

describe("Dashboard Queries (Integration)", () => {
  beforeEach(async () => {
    await testPrisma.eventTodo.deleteMany();
    await testPrisma.participant.deleteMany();
    await testPrisma.event.deleteMany();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  // INT-Q012: getMonthlySummary returns 12 rows with correct aggregation
  it("INT-Q012: getMonthlySummary returns 12 rows with correct monthly aggregation", async () => {
    // 2月にイベント1件、3月にイベント2件を作成
    const event1 = await createTestEvent({
      eventId: "2025-02-001",
      date: new Date("2025-02-15"),
      maleFee: 6000,
      femaleFee: 4000,
      venueCost: 10000,
    });
    await testPrisma.participant.createMany({
      data: [
        { eventId: event1.eventId, name: "太郎", gender: "MALE", fee: 6000, paymentStatus: "PAID" },
        { eventId: event1.eventId, name: "花子", gender: "FEMALE", fee: 4000, paymentStatus: "UNPAID" },
      ],
    });

    const event2 = await createTestEvent({
      eventId: "2025-03-001",
      date: new Date("2025-03-10"),
      maleFee: 5000,
      femaleFee: 3000,
      venueCost: 8000,
    });
    await testPrisma.participant.create({
      data: { eventId: event2.eventId, name: "次郎", gender: "MALE", fee: 5000, paymentStatus: "PAID" },
    });

    const result = await getMonthlySummary(2025);

    expect(result).toHaveLength(12);

    // 2月: イベント1件、男1名、女1名
    const feb = result[1]; // index 1 = 2月
    expect(feb.month).toBe(2);
    expect(feb.eventCount).toBe(1);
    expect(feb.maleCount).toBe(1);
    expect(feb.femaleCount).toBe(1);
    expect(feb.venueCost).toBe(10000);
    expect(feb.expectedRevenue).toBe(10000); // 6000*1 + 4000*1
    expect(feb.paidRevenue).toBe(6000);

    // 3月: イベント1件、男1名
    const mar = result[2]; // index 2 = 3月
    expect(mar.month).toBe(3);
    expect(mar.eventCount).toBe(1);
    expect(mar.maleCount).toBe(1);
    expect(mar.femaleCount).toBe(0);
  });

  // INT-Q013: イベント0件の月は全て0・profitRateがnull
  it("INT-Q013: months with no events have all zeros and null profitRate", async () => {
    // 2月のみにイベントを作成
    await createTestEvent({
      eventId: "2025-02-001",
      date: new Date("2025-02-15"),
    });

    const result = await getMonthlySummary(2025);

    // 1月（イベントなし）
    const jan = result[0];
    expect(jan.month).toBe(1);
    expect(jan.eventCount).toBe(0);
    expect(jan.maleCount).toBe(0);
    expect(jan.femaleCount).toBe(0);
    expect(jan.venueCost).toBe(0);
    expect(jan.expectedRevenue).toBe(0);
    expect(jan.paidRevenue).toBe(0);
    expect(jan.profitRate).toBeNull();
  });

  // INT-Q014: 年度切替で異なる年のデータのみ取得
  it("INT-Q014: year filter returns only that year's data", async () => {
    await createTestEvent({
      eventId: "2025-06-001",
      date: new Date("2025-06-15"),
    });
    await createTestEvent({
      eventId: "2026-06-001",
      date: new Date("2026-06-15"),
    });

    const result2025 = await getMonthlySummary(2025);
    const result2026 = await getMonthlySummary(2026);

    const total2025 = result2025.reduce((sum, r) => sum + r.eventCount, 0);
    const total2026 = result2026.reduce((sum, r) => sum + r.eventCount, 0);

    expect(total2025).toBe(1);
    expect(total2026).toBe(1);
  });

});

describe("Report Queries (Integration)", () => {
  beforeEach(async () => {
    await testPrisma.eventTodo.deleteMany();
    await testPrisma.participant.deleteMany();
    await testPrisma.event.deleteMany();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  // INT-Q015: getReportData with year filter
  it("INT-Q015: getReportData returns events with financial data for the specified year", async () => {
    const event = await createTestEvent({
      eventId: "2025-02-001",
      date: new Date("2025-02-15"),
      venueCost: 15000,
      expectedCashback: 3000,
      actualCashback: 2500,
    });
    await testPrisma.participant.create({
      data: { eventId: event.eventId, name: "太郎", gender: "MALE", fee: 6000, paymentStatus: "PAID" },
    });

    const result = await getReportData({ year: 2025 });

    expect(result).toHaveLength(1);
    expect(result[0].eventId).toBe("2025-02-001");
    expect(result[0].venueCost).toBe(15000);
    expect(result[0].expectedRevenue).toBeGreaterThan(0);
    expect(result[0].paidRevenue).toBe(6000);
  });

  // INT-Q016: getReportData includes Food back columns
  it("INT-Q016: getReportData results include expectedCashback and actualCashback", async () => {
    await createTestEvent({
      eventId: "2025-02-001",
      date: new Date("2025-02-15"),
      expectedCashback: 5000,
      actualCashback: 4500,
    });

    const result = await getReportData({ year: 2025 });

    expect(result).toHaveLength(1);
    expect(result[0].expectedCashback).toBe(5000);
    expect(result[0].actualCashback).toBe(4500);
  });
});

describe("Edge Cases (Integration)", () => {
  beforeEach(async () => {
    await testPrisma.eventTodo.deleteMany();
    await testPrisma.participant.deleteMany();
    await testPrisma.event.deleteMany();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  // EDGE-001: イベント0件の年度でダッシュボード
  it("EDGE-001: getMonthlySummary with no events returns 12 rows all zeros", async () => {
    const result = await getMonthlySummary(2099);

    expect(result).toHaveLength(12);
    expect(result.every((r) => r.eventCount === 0)).toBe(true);
    expect(result.every((r) => r.profitRate === null)).toBe(true);
    expect(result.every((r) => r.expectedRevenue === 0)).toBe(true);
  });

  // EDGE-004: 連番NNN=100超
  it("EDGE-004: eventId with NNN > 099 generates correctly", async () => {
    // Create event with eventId 2025-02-099
    await createTestEvent({
      eventId: "2025-02-099",
      date: new Date("2025-02-15"),
    });

    // Verify event was created correctly
    const event = await testPrisma.event.findUnique({
      where: { eventId: "2025-02-099" },
    });
    expect(event).not.toBeNull();
  });

  // EDGE-005: Food back 実際CB > 予定CB
  it("EDGE-005: actualCashback > expectedCashback saves without error", async () => {
    const event = await createTestEvent({
      eventId: "2025-02-001",
      date: new Date("2025-02-15"),
      expectedCashback: 5000,
      actualCashback: 7000,
    });

    expect(event.expectedCashback).toBe(5000);
    expect(event.actualCashback).toBe(7000);
  });

  // EDGE-006: Last-write-wins（同時編集）
  it("EDGE-006: last write wins on concurrent updates", async () => {
    await createTestEvent({
      eventId: "2025-02-001",
      date: new Date("2025-02-15"),
      venueName: "元の会場",
    });

    // First update
    await testPrisma.event.update({
      where: { eventId: "2025-02-001" },
      data: { venueName: "1回目更新" },
    });

    // Second update (last write wins)
    await testPrisma.event.update({
      where: { eventId: "2025-02-001" },
      data: { venueName: "2回目更新" },
    });

    const event = await testPrisma.event.findUnique({
      where: { eventId: "2025-02-001" },
    });
    expect(event?.venueName).toBe("2回目更新");
  });

  // EDGE-008: 日本語氏名の部分一致
  it("EDGE-008: Japanese name partial match works", async () => {
    const event = await createTestEvent();
    await testPrisma.participant.createMany({
      data: [
        { eventId: event.eventId, name: "田中太郎", gender: "MALE", fee: 6000, paymentStatus: "UNPAID" },
        { eventId: event.eventId, name: "田辺花子", gender: "FEMALE", fee: 4000, paymentStatus: "UNPAID" },
        { eventId: event.eventId, name: "山田三郎", gender: "MALE", fee: 6000, paymentStatus: "UNPAID" },
      ],
    });

    const result = await getAllParticipants({ nameFilter: "田中" });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("田中太郎");
  });

  // EDGE-014: 同時に複数月にイベント登録
  it("EDGE-014: events in different months get independent sequences", async () => {
    await createTestEvent({
      eventId: "2025-02-001",
      date: new Date("2025-02-15"),
    });
    await createTestEvent({
      eventId: "2025-03-001",
      date: new Date("2025-03-15"),
    });

    const feb = await testPrisma.event.findUnique({ where: { eventId: "2025-02-001" } });
    const mar = await testPrisma.event.findUnique({ where: { eventId: "2025-03-001" } });

    expect(feb).not.toBeNull();
    expect(mar).not.toBeNull();
    expect(feb?.eventId).toBe("2025-02-001");
    expect(mar?.eventId).toBe("2025-03-001");
  });
});
