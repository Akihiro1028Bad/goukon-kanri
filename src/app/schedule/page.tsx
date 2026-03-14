import { Suspense } from "react";
import { getEvents } from "@/queries/event-queries";
import { ScheduleTable } from "@/components/schedule/schedule-table";
import { ScheduleFilters } from "@/components/schedule/schedule-filters";
import type { EventStatus } from "@prisma/client";

export const metadata = {
  title: "スケジュール",
};

type Props = {
  searchParams: Promise<{ month?: string; area?: string; status?: string }>;
};

export default async function SchedulePage({ searchParams }: Props) {
  const { month, area, status } = await searchParams;

  const currentYear = new Date().getFullYear();

  const events = await getEvents({
    year: currentYear,
    month: month ? parseInt(month, 10) : undefined,
    status: status as EventStatus | undefined,
  });

  // Filter by area if specified (client-side since getEvents doesn't support area filter)
  const filteredEvents = area
    ? events.filter((e) => e.area === area)
    : events;

  // Extract unique areas for filter dropdown
  const allEvents = await getEvents({ year: currentYear });
  const areas = [...new Set(allEvents.map((e) => e.area))].sort();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">スケジュール</h1>
      <Suspense fallback={<div>読み込み中...</div>}>
        <ScheduleFilters
          currentMonth={month}
          currentArea={area}
          currentStatus={status}
          areas={areas}
        />
        <ScheduleTable events={filteredEvents} />
      </Suspense>
    </div>
  );
}
