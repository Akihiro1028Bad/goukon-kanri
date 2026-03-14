import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getEventDetail } from "@/queries/event-queries";
import { EventDetail } from "@/components/events/event-detail";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `イベント ${id}`,
  };
}

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params;
  const event = await getEventDetail(id);

  if (!event) {
    notFound();
  }

  return <EventDetail event={event} />;
}
