"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { EVENT_STATUS_LABELS } from "@/types";
import { restoreEvent } from "@/actions/event-actions";
import type { EventWithSummary } from "@/queries/event-queries";

const statusVariant = {
  SCHEDULED: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
} as const;

function RestoreButton({ eventId }: { eventId: string }) {
  const [isRestoring, setIsRestoring] = useState(false);

  async function handleRestore() {
    setIsRestoring(true);
    const result = await restoreEvent(eventId);
    if (result.success) {
      toast.success("復元しました");
    } else {
      toast.error(result.error);
    }
    setIsRestoring(false);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRestore}
      disabled={isRestoring}
    >
      {isRestoring ? "復元中..." : "復元"}
    </Button>
  );
}

const columns: ColumnDef<EventWithSummary>[] = [
  {
    accessorKey: "eventId",
    header: "イベントID",
    cell: ({ row }) => (
      <Link
        href={`/events/${row.original.eventId}`}
        className="text-blue-600 hover:underline"
      >
        {row.original.eventId}
      </Link>
    ),
  },
  {
    accessorKey: "date",
    header: "日付",
    cell: ({ row }) =>
      new Date(row.original.date).toLocaleDateString("ja-JP"),
  },
  {
    accessorKey: "venueName",
    header: "会場名",
  },
  {
    accessorKey: "area",
    header: "エリア",
  },
  {
    accessorKey: "status",
    header: "状態",
    cell: ({ row }) => (
      <Badge variant={statusVariant[row.original.status]}>
        {EVENT_STATUS_LABELS[row.original.status]}
      </Badge>
    ),
  },
  {
    id: "participants",
    header: "参加者",
    cell: ({ row }) => {
      const f = row.original.financials;
      return `${f.totalCount}名（男${f.maleCount}/女${f.femaleCount}）`;
    },
  },
  {
    id: "expectedRevenue",
    header: "見込み収入",
    cell: ({ row }) =>
      `¥${row.original.financials.expectedRevenue.toLocaleString()}`,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      if (row.original.isDeleted) {
        return <RestoreButton eventId={row.original.eventId} />;
      }
      return null;
    },
  },
];

type Props = {
  events: EventWithSummary[];
};

export function EventTable({ events }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showDeleted, setShowDeleted] = useState(false);

  const filteredEvents = showDeleted
    ? events
    : events.filter((e) => !e.isDeleted);

  const table = useReactTable({
    data: filteredEvents,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Switch checked={showDeleted} onCheckedChange={setShowDeleted} />
        <span className="text-sm text-muted-foreground">削除済みを表示</span>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    aria-sort={
                      header.column.getCanSort()
                        ? header.column.getIsSorted() === "asc"
                          ? "ascending"
                          : header.column.getIsSorted() === "desc"
                            ? "descending"
                            : "none"
                        : undefined
                    }
                  >
                    {header.column.getCanSort() ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 cursor-pointer select-none"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{ asc: "↑", desc: "↓" }[
                          header.column.getIsSorted() as string
                        ] ?? ""}
                      </button>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={row.original.isDeleted ? "opacity-50" : ""}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  イベントがありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
