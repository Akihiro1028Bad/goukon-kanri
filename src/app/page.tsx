import { getMonthlySummary } from "@/queries/dashboard-queries";
import { MonthlySummaryTable } from "@/components/dashboard/monthly-summary-table";
import { YearSelector } from "@/components/dashboard/year-selector";

export const metadata = {
  title: "ダッシュボード",
};

type Props = {
  searchParams: Promise<{ year?: string }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const { year: yearParam } = await searchParams;
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

  const rows = await getMonthlySummary(year);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <YearSelector currentYear={year} />
      </div>
      <MonthlySummaryTable year={year} rows={rows} />
    </div>
  );
}
