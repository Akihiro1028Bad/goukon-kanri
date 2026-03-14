import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { getEvents, getEventDetail } from "@/queries/event-queries";
import { getAllParticipants } from "@/queries/participant-queries";
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
      { maleFee: event.maleFee, femaleFee: event.femaleFee, venueCost: event.venueCost },
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
