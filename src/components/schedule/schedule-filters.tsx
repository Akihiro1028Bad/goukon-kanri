"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  currentMonth?: string;
  currentArea?: string;
  currentStatus?: string;
  areas: string[];
};

export function ScheduleFilters({ currentMonth, currentArea, currentStatus, areas }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/schedule?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={currentMonth ?? "all"}
        onValueChange={(v) => updateFilter("month", v)}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="月" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全月</SelectItem>
          {Array.from({ length: 12 }, (_, i) => (
            <SelectItem key={i + 1} value={String(i + 1)}>
              {i + 1}月
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentArea ?? "all"}
        onValueChange={(v) => updateFilter("area", v)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="エリア" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全エリア</SelectItem>
          {areas.map((area) => (
            <SelectItem key={area} value={area}>
              {area}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentStatus ?? "all"}
        onValueChange={(v) => updateFilter("status", v)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="状態">
            {currentStatus === "all" || !currentStatus
              ? "全状態"
              : { SCHEDULED: "開催予定", COMPLETED: "開催済", CANCELLED: "キャンセル" }[currentStatus]}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全状態</SelectItem>
          <SelectItem value="SCHEDULED">開催予定</SelectItem>
          <SelectItem value="COMPLETED">開催済</SelectItem>
          <SelectItem value="CANCELLED">キャンセル</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
