import { Suspense } from "react";
import Link from "next/link";
import type { EventStatus } from "@prisma/client";

import { getEvents } from "@/queries/event-queries";
import { EventTable } from "@/components/events/event-table";
import { EventFilters } from "@/components/events/event-filters";

export const metadata = {
  title: "イベント一覧",
};

type Props = {
  searchParams: Promise<{
    year?: string;
    month?: string;
    status?: string;
  }>;
};

export default async function EventsPage({ searchParams }: Props) {
  const params = await searchParams;
  const year = params.year ? parseInt(params.year) : new Date().getFullYear();
  const month = params.month ? parseInt(params.month) : undefined;
  const status = params.status as EventStatus | undefined;

  const events = await getEvents({
    year,
    month,
    status,
    includeDeleted: true,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">イベント一覧</h1>
        <Link
          href="/events/new"
          className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/80"
        >
          新規登録
        </Link>
      </div>

      <Suspense fallback={null}>
        <EventFilters />
      </Suspense>

      <EventTable events={events} />
    </div>
  );
}
