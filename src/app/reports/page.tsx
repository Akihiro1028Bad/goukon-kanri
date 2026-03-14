import { Suspense } from "react";
import { getReportData } from "@/queries/event-queries";
import { ReportTable } from "@/components/reports/report-table";
import { ReportFilters } from "@/components/reports/report-filters";

export const metadata = {
  title: "収支レポート",
};

type Props = {
  searchParams: Promise<{ year?: string; month?: string }>;
};

export default async function ReportsPage({ searchParams }: Props) {
  const { year: yearParam, month } = await searchParams;
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

  const data = await getReportData({
    year,
    month: month ? parseInt(month, 10) : undefined,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">収支レポート</h1>
      <Suspense fallback={<div>読み込み中...</div>}>
        <ReportFilters currentYear={year} currentMonth={month} />
        <ReportTable data={data} />
      </Suspense>
    </div>
  );
}
