import { Suspense } from "react";
import { getAllParticipants } from "@/queries/participant-queries";
import { CrossEventParticipantTable } from "@/components/participants/cross-event-participant-table";

export const metadata = {
  title: "参加者一覧",
};

type Props = {
  searchParams: Promise<{ name?: string }>;
};

export default async function ParticipantsPage({ searchParams }: Props) {
  const { name } = await searchParams;
  const participants = await getAllParticipants({
    nameFilter: name,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">参加者一覧</h1>
      <Suspense fallback={<div>読み込み中...</div>}>
        <CrossEventParticipantTable
          participants={participants}
          initialNameFilter={name ?? ""}
        />
      </Suspense>
    </div>
  );
}
