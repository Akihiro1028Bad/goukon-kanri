import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { PrismaClient } from "@prisma/client";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createEvent, updateEvent, deleteEvent, restoreEvent } from "@/actions/event-actions";

const testPrisma = new PrismaClient({
  datasources: {
    db: { url: "postgresql://postgres:postgres@localhost:5433/goukon_kanri_test" },
  },
});

function createEventFormData(overrides: Record<string, string> = {}): FormData {
  const defaults: Record<string, string> = {
    date: "2025-02-15",
    startTime: "19:00",
    venueName: "テスト会場",
    area: "渋谷",
    maleCapacity: "5",
    femaleCapacity: "5",
    maleFee: "6000",
    femaleFee: "4000",
    status: "SCHEDULED",
    venueCost: "0",
    expectedCashback: "0",
    actualCashback: "0",
  };
  const data = new FormData();
  const merged = { ...defaults, ...overrides };
  Object.entries(merged).forEach(([k, v]) => data.append(k, v));
  return data;
}

describe("Event Server Actions (Integration)", () => {
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

  // INT-E001: createEvent with valid FormData → eventId returned in YYYY-MM-NNN format
  it("INT-E001: createEvent with valid FormData returns eventId in YYYY-MM-NNN format", async () => {
    const formData = createEventFormData();
    const result = await createEvent(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatch(/^\d{4}-\d{2}-\d{3}$/);
      expect(result.data).toBe("2025-02-001");
    }

    const event = await testPrisma.event.findUnique({
      where: { eventId: "2025-02-001" },
    });
    expect(event).not.toBeNull();
    expect(event?.venueName).toBe("テスト会場");
    expect(event?.area).toBe("渋谷");
  });

  // INT-E002: createEvent with invalid FormData (missing required) → error
  it("INT-E002: createEvent with invalid FormData returns error", async () => {
    const formData = new FormData();
    // Missing all required fields
    const result = await createEvent(formData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  // INT-E003: Second event in same month → NNN=002
  it("INT-E003: second event in same month gets sequential number 002", async () => {
    const formData1 = createEventFormData({ date: "2025-02-10" });
    const result1 = await createEvent(formData1);
    expect(result1.success).toBe(true);

    const formData2 = createEventFormData({ date: "2025-02-20", venueName: "二次会場" });
    const result2 = await createEvent(formData2);
    expect(result2.success).toBe(true);

    if (result2.success) {
      expect(result2.data).toBe("2025-02-002");
    }
  });

  // INT-E004: Event in different month → independent sequence
  it("INT-E004: event in different month has independent sequence number", async () => {
    const formData1 = createEventFormData({ date: "2025-02-15" });
    const result1 = await createEvent(formData1);
    expect(result1.success).toBe(true);

    const formData2 = createEventFormData({ date: "2025-03-15", venueName: "3月会場" });
    const result2 = await createEvent(formData2);
    expect(result2.success).toBe(true);

    if (result2.success) {
      expect(result2.data).toBe("2025-03-001");
    }
  });

  // INT-E005: updateEvent → fields updated in DB
  it("INT-E005: updateEvent updates fields in DB", async () => {
    const formData = createEventFormData();
    const createResult = await createEvent(formData);
    expect(createResult.success).toBe(true);

    const updateFormData = createEventFormData({
      venueName: "更新会場",
      area: "新宿",
      maleFee: "7000",
      femaleFee: "5000",
    });
    const eventId = createResult.success ? createResult.data : "";
    const updateResult = await updateEvent(eventId, updateFormData);
    expect(updateResult.success).toBe(true);

    const event = await testPrisma.event.findUnique({
      where: { eventId },
    });
    expect(event?.venueName).toBe("更新会場");
    expect(event?.area).toBe("新宿");
    expect(event?.maleFee).toBe(7000);
    expect(event?.femaleFee).toBe(5000);
  });

  // INT-E006: updateEvent with invalid data → error, original unchanged
  it("INT-E006: updateEvent with invalid data returns error and original is unchanged", async () => {
    const formData = createEventFormData();
    const createResult = await createEvent(formData);
    expect(createResult.success).toBe(true);

    const eventId = createResult.success ? createResult.data : "";
    const invalidFormData = new FormData();
    // Missing all required fields
    const updateResult = await updateEvent(eventId, invalidFormData);
    expect(updateResult.success).toBe(false);

    const event = await testPrisma.event.findUnique({
      where: { eventId },
    });
    expect(event?.venueName).toBe("テスト会場");
    expect(event?.area).toBe("渋谷");
  });

  // INT-E007: deleteEvent → event.isDeleted=true
  it("INT-E007: deleteEvent sets event isDeleted to true", async () => {
    const formData = createEventFormData();
    const createResult = await createEvent(formData);
    expect(createResult.success).toBe(true);

    const eventId = createResult.success ? createResult.data : "";
    const deleteResult = await deleteEvent(eventId);
    expect(deleteResult.success).toBe(true);

    const event = await testPrisma.event.findUnique({
      where: { eventId },
    });
    expect(event?.isDeleted).toBe(true);
  });

  // INT-E008: deleteEvent → related participants also isDeleted=true
  it("INT-E008: deleteEvent also soft-deletes related participants", async () => {
    const formData = createEventFormData();
    const createResult = await createEvent(formData);
    expect(createResult.success).toBe(true);

    const eventId = createResult.success ? createResult.data : "";

    // Create participants directly via test prisma
    await testPrisma.participant.createMany({
      data: [
        { eventId, name: "太郎", gender: "MALE", fee: 6000, paymentStatus: "UNPAID" },
        { eventId, name: "花子", gender: "FEMALE", fee: 4000, paymentStatus: "UNPAID" },
      ],
    });

    const deleteResult = await deleteEvent(eventId);
    expect(deleteResult.success).toBe(true);

    const participants = await testPrisma.participant.findMany({
      where: { eventId },
    });
    expect(participants).toHaveLength(2);
    expect(participants.every((p) => p.isDeleted === true)).toBe(true);
  });

  // INT-E009: restoreEvent → event.isDeleted=false
  it("INT-E009: restoreEvent sets event isDeleted to false", async () => {
    const formData = createEventFormData();
    const createResult = await createEvent(formData);
    expect(createResult.success).toBe(true);

    const eventId = createResult.success ? createResult.data : "";
    await deleteEvent(eventId);

    const restoreResult = await restoreEvent(eventId);
    expect(restoreResult.success).toBe(true);

    const event = await testPrisma.event.findUnique({
      where: { eventId },
    });
    expect(event?.isDeleted).toBe(false);
  });

  // INT-E010: restoreEvent → related participants also isDeleted=false
  it("INT-E010: restoreEvent also restores related participants", async () => {
    const formData = createEventFormData();
    const createResult = await createEvent(formData);
    expect(createResult.success).toBe(true);

    const eventId = createResult.success ? createResult.data : "";

    await testPrisma.participant.createMany({
      data: [
        { eventId, name: "太郎", gender: "MALE", fee: 6000, paymentStatus: "UNPAID" },
        { eventId, name: "花子", gender: "FEMALE", fee: 4000, paymentStatus: "UNPAID" },
      ],
    });

    await deleteEvent(eventId);
    const restoreResult = await restoreEvent(eventId);
    expect(restoreResult.success).toBe(true);

    const participants = await testPrisma.participant.findMany({
      where: { eventId },
    });
    expect(participants).toHaveLength(2);
    expect(participants.every((p) => p.isDeleted === false)).toBe(true);
  });

  // INT-E011: deleteEvent non-existent → error
  it("INT-E011: deleteEvent with non-existent eventId returns error", async () => {
    const result = await deleteEvent("9999-99-999");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  // INT-E012: createEvent stores all optional fields correctly
  it("INT-E012: createEvent stores all optional fields correctly", async () => {
    const formData = createEventFormData({
      organizer: "山田太郎",
      theme: "アウトドア好き",
      targetOccupation: "エンジニア",
      mapUrl: "https://maps.google.com/test",
      memo: "テストメモ",
      venueCost: "30000",
      expectedCashback: "5000",
      actualCashback: "4500",
    });
    const result = await createEvent(formData);
    expect(result.success).toBe(true);

    const eventId = result.success ? result.data : "";
    const event = await testPrisma.event.findUnique({
      where: { eventId },
    });

    expect(event).not.toBeNull();
    expect(event?.organizer).toBe("山田太郎");
    expect(event?.theme).toBe("アウトドア好き");
    expect(event?.targetOccupation).toBe("エンジニア");
    expect(event?.mapUrl).toBe("https://maps.google.com/test");
    expect(event?.memo).toBe("テストメモ");
    expect(event?.venueCost).toBe(30000);
    expect(event?.expectedCashback).toBe(5000);
    expect(event?.actualCashback).toBe(4500);
  });

  // INT-E013: createEvent with date 2025-02-28 creates proper eventId
  it("INT-E013: createEvent with date 2025-02-28 creates proper eventId", async () => {
    const formData = createEventFormData({ date: "2025-02-28" });
    const result = await createEvent(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("2025-02-001");
    }

    const event = await testPrisma.event.findUnique({
      where: { eventId: "2025-02-001" },
    });
    expect(event).not.toBeNull();
    // Verify the date is stored as Feb 28, not shifted due to timezone
    const storedDate = event?.date;
    expect(storedDate).toBeInstanceOf(Date);
    if (storedDate) {
      expect(storedDate.getUTCFullYear()).toBe(2025);
      expect(storedDate.getUTCMonth()).toBe(1); // 0-indexed, February = 1
      expect(storedDate.getUTCDate()).toBe(28);
    }
  });
});
