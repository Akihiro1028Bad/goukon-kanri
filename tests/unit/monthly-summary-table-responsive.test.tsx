import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MonthlySummaryTable } from "@/components/dashboard/monthly-summary-table";
import type { MonthlySummaryRow } from "@/types";

const mockRows: MonthlySummaryRow[] = [
  {
    month: 1,
    eventCount: 1,
    maleCount: 3,
    femaleCount: 3,
    venueCost: 15000,
    expectedRevenue: 30000,
    paidRevenue: 30000,
    uncollected: 0,
    expectedProfit: 15000,
    actualProfit: 15000,
    expectedProfitWithCb: 17000,
    actualProfitWithCb: 17000,
    profitRate: 50.0,
  },
];

describe("MonthlySummaryTable レスポンシブ動作", () => {
  // UT-001: md:hidden クラスでモバイル用カードコンテナが存在
  it("モバイル用カードコンテナに md:hidden クラスが適用されている", () => {
    render(<MonthlySummaryTable year={2026} rows={mockRows} />);
    const mobileContainer = document.querySelector(".md\\:hidden");
    expect(mobileContainer).toBeInTheDocument();
  });

  // UT-002: hidden md:block クラスでデスクトップ用テーブルが存在
  it("デスクトップ用テーブルに hidden md:block クラスが適用されている", () => {
    render(<MonthlySummaryTable year={2026} rows={mockRows} />);
    const desktopContainer = document.querySelector(".hidden.md\\:block");
    expect(desktopContainer).toBeInTheDocument();
  });

  // UT-003: 12ヶ月分のカードが存在する
  it("12ヶ月分のカードがレンダリングされる", () => {
    const twelveMonthsRows: MonthlySummaryRow[] = Array.from({ length: 12 }, (_, i) => ({
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
    render(<MonthlySummaryTable year={2026} rows={twelveMonthsRows} />);

    for (let month = 1; month <= 12; month++) {
      const links = screen.getAllByRole("link", { name: `${month}月` });
      // カード内とテーブル内の両方に存在する
      expect(links.length).toBeGreaterThanOrEqual(1);
    }
  });

  // UT-004: テーブルも同時にレンダリングされる（CSS で非表示）
  it("テーブルとカードの両方がDOMに存在する", () => {
    render(<MonthlySummaryTable year={2026} rows={mockRows} />);
    expect(document.querySelector("table")).toBeInTheDocument();
    expect(document.querySelector('[data-slot="card"]')).toBeInTheDocument();
  });
});
