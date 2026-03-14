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
  currentYear: number;
  currentMonth?: string;
};

export function ReportFilters({ currentYear, currentMonth }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const now = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => now - 5 + i);

  function updateFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/reports?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={String(currentYear)}
        onValueChange={(v) => updateFilter("year", v)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}年
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
    </div>
  );
}
