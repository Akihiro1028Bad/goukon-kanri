import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MonthlySummaryCard } from "@/components/dashboard/monthly-summary-card";
import type { MonthlySummaryRow } from "@/types";

const mockRow: MonthlySummaryRow = {
  month: 3,
  eventCount: 2,
  maleCount: 8,
  femaleCount: 6,
  venueCost: 30000,
  expectedRevenue: 84000,
  paidRevenue: 42000,
  uncollected: 42000,
  expectedProfit: 54000,
  actualProfit: 12000,
  expectedProfitWithCb: 59000,
  actualProfitWithCb: 17000,
  profitRate: 64.3,
};

describe("MonthlySummaryCard", () => {
  // UC-001: 月リンクが正しいURLを持つ
  it("月リンクが正しいURLを持つ", () => {
    render(<MonthlySummaryCard year={2026} row={mockRow} />);
    const link = screen.getByRole("link", { name: "3月" });
    expect(link).toHaveAttribute("href", "/events?year=2026&month=3");
  });

  // UC-002: イベント件数が表示される
  it("イベント件数が表示される", () => {
    render(<MonthlySummaryCard year={2026} row={mockRow} />);
    expect(screen.getByText("2件")).toBeInTheDocument();
  });

  // UC-003: 参加者数が男女別に表示される
  it("参加者数が男女別に表示される", () => {
    render(<MonthlySummaryCard year={2026} row={mockRow} />);
    expect(screen.getByText("男性 8名 / 女性 6名")).toBeInTheDocument();
  });

  // UC-004: 見込み収入が通貨形式で表示される
  it("見込み収入が通貨形式で表示される", () => {
    render(<MonthlySummaryCard year={2026} row={mockRow} />);
    expect(screen.getByText("¥84,000")).toBeInTheDocument();
  });

  // UC-005: 決済済み金額が通貨形式で表示される
  it("決済済み金額が通貨形式で表示される", () => {
    render(<MonthlySummaryCard year={2026} row={mockRow} />);
    expect(screen.getByText("¥42,000")).toBeInTheDocument();
  });

  // UC-006: 未回収金額が表示され、0より大きい場合は赤色
  it("未回収金額が0より大きい場合は赤色で表示される", () => {
    const { container } = render(<MonthlySummaryCard year={2026} row={mockRow} />);
    const uncollectedValue = container.querySelector(".text-destructive");
    expect(uncollectedValue).toHaveTextContent("¥42,000");
  });

  // UC-007: 未回収金額が0の場合は通常色
  it("未回収金額が0の場合は通常色で表示される", () => {
    const rowWithNoUncollected = { ...mockRow, uncollected: 0 };
    const { container } = render(<MonthlySummaryCard year={2026} row={rowWithNoUncollected} />);
    // 未回収の表示が赤色でないことを確認
    const uncollectedRow = screen.getByText("未回収").closest("div");
    expect(uncollectedRow?.querySelector(".text-destructive")).toBeNull();
  });

  // UC-008: 見込み利益が表示される
  it("見込み利益が表示される", () => {
    render(<MonthlySummaryCard year={2026} row={mockRow} />);
    expect(screen.getByText("¥54,000")).toBeInTheDocument();
  });

  // UC-009: 実現利益が表示される
  it("実現利益が表示される", () => {
    render(<MonthlySummaryCard year={2026} row={mockRow} />);
    expect(screen.getByText("¥12,000")).toBeInTheDocument();
  });

  // UC-010: 利益率がパーセント形式で表示される
  it("利益率がパーセント形式で表示される", () => {
    render(<MonthlySummaryCard year={2026} row={mockRow} />);
    expect(screen.getByText("64.3%")).toBeInTheDocument();
  });

  // UC-011: 利益率がnullの場合は"-"を表示
  it("利益率がnullの場合は'-'を表示する", () => {
    const rowWithNullProfitRate = { ...mockRow, profitRate: null };
    render(<MonthlySummaryCard year={2026} row={rowWithNullProfitRate} />);
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  // UC-012: イベント件数0の月も正しく表示される
  it("イベント件数0の月も正しく表示される", () => {
    const emptyRow: MonthlySummaryRow = {
      month: 1,
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
    };
    render(<MonthlySummaryCard year={2026} row={emptyRow} />);
    expect(screen.getByRole("link", { name: "1月" })).toBeInTheDocument();
    expect(screen.getByText("0件")).toBeInTheDocument();
  });
});
