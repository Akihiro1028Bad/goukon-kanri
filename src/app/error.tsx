"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <h2 className="text-xl font-bold text-red-600">エラーが発生しました</h2>
      <p className="mt-2 text-gray-500">{error.message}</p>
      <Button className="mt-4" onClick={reset}>
        再試行
      </Button>
    </div>
  );
}
