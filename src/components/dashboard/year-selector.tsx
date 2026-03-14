"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";

type Props = {
  currentYear: number;
};

export function YearSelector({ currentYear }: Props) {
  const router = useRouter();
  const now = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => now - 5 + i);

  return (
    <Select
      value={String(currentYear)}
      onValueChange={(value) => router.push(`/?year=${value}`)}
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
  );
}
