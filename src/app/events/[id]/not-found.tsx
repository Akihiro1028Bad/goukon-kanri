import Link from "next/link";

export default function EventNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <h2 className="text-xl font-bold">イベントが見つかりません</h2>
      <p className="mt-2 text-gray-500">
        指定されたイベントは存在しないか、削除された可能性があります。
      </p>
      <Link
        href="/events"
        className="mt-4 text-blue-600 hover:underline"
      >
        イベント一覧に戻る
      </Link>
    </div>
  );
}
