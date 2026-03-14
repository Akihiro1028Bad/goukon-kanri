import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getEventDetail } from "@/queries/event-queries";
import { EventForm } from "@/components/events/event-form";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `イベント編集 ${id}`,
  };
}

export default async function EditEventPage({ params }: Props) {
  const { id } = await params;
  const event = await getEventDetail(id);

  if (!event) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">イベント編集: {event.eventId}</h1>
      <EventForm
        defaultValues={{
          eventId: event.eventId,
          date: event.date,
          startTime: event.startTime,
          venueName: event.venueName,
          mapUrl: event.mapUrl ?? undefined,
          organizer: event.organizer ?? undefined,
          area: event.area,
          maleCapacity: event.maleCapacity,
          femaleCapacity: event.femaleCapacity,
          maleFee: event.maleFee,
          femaleFee: event.femaleFee,
          theme: event.theme ?? undefined,
          targetOccupation: event.targetOccupation ?? undefined,
          status: event.status,
          venueCost: event.venueCost,
          matchCount: event.matchCount,
          expectedCashback: event.expectedCashback,
          actualCashback: event.actualCashback,
          memo: event.memo ?? undefined,
        }}
      />
    </div>
  );
}
