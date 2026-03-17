"use client";

import { useRouter, useSearchParams } from "next/navigation";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { EVENT_STATUS_LABELS } from "@/types";

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export function EventFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const selectedYear = searchParams.get("year") || String(currentYear);
    const selectedMonth = searchParams.get("month") || "all";
    const selectedStatus = searchParams.get("status") || "all";

    function updateFilter(key: string, value: string | null) {
        if (!value) return;
        const params = new URLSearchParams(searchParams.toString());
        if (value === "all") {
            params.delete(key);
        } else {
            params.set(key, value);
        }
        router.push(`/events?${params.toString()}`);
    }

    return (
        <div className="flex flex-wrap gap-4">
            {/* 年度 */}
            <Select
                value={selectedYear}
                onValueChange={(v) => updateFilter("year", v)}
            >
                <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="年度" />
                </SelectTrigger>
                <SelectContent>
                    {YEARS.map((year) => (
                        <SelectItem key={year} value={String(year)}>
                            {year}年
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* 月 */}
            <Select
                value={selectedMonth}
                onValueChange={(v) => updateFilter("month", v)}
            >
                <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="月" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">全月</SelectItem>
                    {MONTHS.map((month) => (
                        <SelectItem key={month} value={String(month)}>
                            {month}月
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* 状態 */}
            <Select
                value={selectedStatus}
                onValueChange={(v) => updateFilter("status", v)}
            >
                <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="状態">
                        {selectedStatus === "all" ? "全状態" : EVENT_STATUS_LABELS[selectedStatus as keyof typeof EVENT_STATUS_LABELS]}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">全状態</SelectItem>
                    {Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                            {label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
