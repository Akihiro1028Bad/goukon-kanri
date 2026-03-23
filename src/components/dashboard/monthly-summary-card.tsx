"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonthlySummaryRow } from "@/types";

type Props = {
  year: number;
  row: MonthlySummaryRow;
};

function formatCurrency(value: number): string {
  return `¥${value.toLocaleString()}`;
}

export function MonthlySummaryCard({ year, row }: Props) {
  return (
    <Card data-slot="card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <Link
            href={`/events?year=${year}&month=${row.month}`}
            className="text-blue-600 hover:underline"
          >
            {row.month}月
          </Link>
          <span className="text-sm font-normal text-muted-foreground">
            {row.eventCount}件
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">参加者</span>
          <span>男性 {row.maleCount}名 / 女性 {row.femaleCount}名</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">見込み収入</span>
          <span>{formatCurrency(row.expectedRevenue)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">決済済み</span>
          <span>{formatCurrency(row.paidRevenue)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">未回収</span>
          <span className={row.uncollected > 0 ? "text-destructive" : ""}>
            {formatCurrency(row.uncollected)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">見込み利益</span>
          <span>{formatCurrency(row.expectedProfit)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">実現利益</span>
          <span>{formatCurrency(row.actualProfit)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">利益率</span>
          <span>
            {row.profitRate !== null ? `${row.profitRate.toFixed(1)}%` : "-"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
