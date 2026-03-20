import { prisma } from "@/lib/prisma";
import { calculateEventFinancials } from "@/lib/calculations";
import type { MonthlySummaryRow } from "@/types";

/**
 * 指定年度の月別サマリーを取得する（FR-014）
 */
export async function getMonthlySummary(
  year: number
): Promise<MonthlySummaryRow[]> {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year + 1, 0, 1);

  const events = await prisma.event.findMany({
    where: {
      date: { gte: startDate, lt: endDate },
      isDeleted: false,
    },
    include: { participants: true },
    orderBy: { date: "asc" },
  });

  // 月別にグループ化（1〜12月）
  const monthlyData: MonthlySummaryRow[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    eventCount: 0,
    maleCount: 0,
    femaleCount: 0,
    venueCost: 0,
    expectedRevenue: 0,
    paidRevenue: 0,
    uncollected: 0,
    expectedProfit: 0,
    actualProfit: 0,
    expectedProfitWithCb: 0,
    actualProfitWithCb: 0,
    profitRate: null,
  }));

  for (const event of events) {
    // date は z.coerce.date() により UTC midnight で保存されるため getUTCMonth() が正しい
    // （date-only 文字列 "YYYY-MM-DD" は JavaScript で常に UTC midnight に変換される）
    const month = event.date.getUTCMonth(); // 0-indexed
    const row = monthlyData[month];

    row.eventCount++;
    row.venueCost += event.venueCost;

    const financials = calculateEventFinancials(event, event.participants);
    row.maleCount += financials.maleCount;
    row.femaleCount += financials.femaleCount;
    row.expectedRevenue += financials.expectedRevenue;
    row.paidRevenue += financials.paidRevenue;
    row.uncollected += financials.uncollected;
    row.expectedProfit += financials.expectedProfit;
    row.actualProfit += financials.actualProfit;
    row.expectedProfitWithCb += financials.expectedProfitWithCb;
    row.actualProfitWithCb += financials.actualProfitWithCb;
  }

  // 月ごとの利益率を計算
  for (const row of monthlyData) {
    row.profitRate =
      row.expectedRevenue > 0
        ? Math.round((row.expectedProfit / row.expectedRevenue) * 10000) / 100
        : null;
  }

  return monthlyData;
}
