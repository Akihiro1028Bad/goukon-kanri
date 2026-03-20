import { prisma } from "@/lib/prisma";
import { calculateEventFinancials } from "@/lib/calculations";
import type { Event, Participant, EventStatus } from "@prisma/client";
import type { FinancialSummary } from "@/types";

export type EventWithSummary = Event & {
  participants: Participant[];
  financials: FinancialSummary;
};

export type EventDetail = Event & {
  participants: Participant[];
  financials: FinancialSummary;
};

export type ReportRow = {
  eventId: string;
  date: Date;
  venueCost: number;
  expectedCashback: number;
  actualCashback: number;
  expectedRevenue: number;
  paidRevenue: number;
  uncollected: number;
  expectedProfit: number;
  actualProfit: number;
  expectedProfitWithCb: number;
  actualProfitWithCb: number;
  profitRate: number | null;
};

/**
 * イベント一覧を取得する（フィルタ・ソート対応）
 */
export async function getEvents(options: {
  year: number;
  month?: number;
  status?: EventStatus;
  includeDeleted?: boolean;
  sortBy?: "date" | "eventId" | "status" | "venueName";
  sortOrder?: "asc" | "desc";
}): Promise<EventWithSummary[]> {
  const {
    year,
    month,
    status,
    includeDeleted = false,
    sortBy = "date",
    sortOrder = "desc",
  } = options;

  const startDate = new Date(year, month ? month - 1 : 0, 1);
  const endDate = month
    ? new Date(year, month, 1)
    : new Date(year + 1, 0, 1);

  const events = await prisma.event.findMany({
    where: {
      date: {
        gte: startDate,
        lt: endDate,
      },
      ...(status ? { status } : {}),
      ...(!includeDeleted ? { isDeleted: false } : {}),
    },
    include: {
      participants: true,
    },
    orderBy: { [sortBy]: sortOrder },
  });

  return events.map((event) => {
    const { participants, ...eventData } = event;
    return {
      ...eventData,
      participants,
      financials: calculateEventFinancials(eventData, participants),
    };
  });
}

/**
 * イベント詳細を取得する（参加者一覧付き）
 */
export async function getEventDetail(
  eventId: string,
  includeDeletedParticipants = false
): Promise<EventDetail | null> {
  const event = await prisma.event.findUnique({
    where: { eventId },
    include: {
      participants: includeDeletedParticipants
        ? true
        : { where: { isDeleted: false } },
    },
  });

  if (!event) return null;

  const { participants, ...eventData } = event;
  return {
    ...eventData,
    participants,
    financials: calculateEventFinancials(eventData, participants),
  };
}

/**
 * 収支レポート用のイベント一覧を取得する
 */
export async function getReportData(options: {
  year: number;
  month?: number;
}): Promise<ReportRow[]> {
  const { year, month } = options;

  const startDate = new Date(year, month ? month - 1 : 0, 1);
  const endDate = month
    ? new Date(year, month, 1)
    : new Date(year + 1, 0, 1);

  const events = await prisma.event.findMany({
    where: {
      date: { gte: startDate, lt: endDate },
      isDeleted: false,
    },
    include: { participants: true },
    orderBy: { date: "desc" },
  });

  return events.map((event) => {
    const financials = calculateEventFinancials(event, event.participants);
    return {
      eventId: event.eventId,
      date: event.date,
      venueCost: event.venueCost,
      expectedCashback: event.expectedCashback,
      actualCashback: event.actualCashback,
      expectedRevenue: financials.expectedRevenue,
      paidRevenue: financials.paidRevenue,
      uncollected: financials.uncollected,
      expectedProfit: financials.expectedProfit,
      actualProfit: financials.actualProfit,
      expectedProfitWithCb: financials.expectedProfitWithCb,
      actualProfitWithCb: financials.actualProfitWithCb,
      profitRate: financials.profitRate,
    };
  });
}
