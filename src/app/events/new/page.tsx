import { EventForm } from "@/components/events/event-form";

export const metadata = {
  title: "イベント新規登録",
};

export default function NewEventPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">イベント新規登録</h1>
      <EventForm />
    </div>
  );
}
