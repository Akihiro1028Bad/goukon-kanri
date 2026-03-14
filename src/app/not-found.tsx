import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <h2 className="text-xl font-bold">ページが見つかりません</h2>
      <p className="mt-2 text-gray-500">
        お探しのページは存在しないか、移動された可能性があります。
      </p>
      <Link
        href="/"
        className="mt-4 text-blue-600 hover:underline"
      >
        ダッシュボードに戻る
      </Link>
    </div>
  );
}
