"use client";

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import type { Event, Participant } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EVENT_STATUS_LABELS } from "@/types";
import { LineTextDialog } from "./line-text-dialog";
import Link from "next/link";

type EventWithParticipants = Event & {
  participants: Participant[];
};

type Props = {
  events: EventWithParticipants[];
};

export function ScheduleTable({ events }: Props) {
  const columns: ColumnDef<EventWithParticipants>[] = [
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
      accessorKey: "startTime",
      header: "時刻",
    },
    {
      accessorKey: "area",
      header: "エリア",
    },
    {
      accessorKey: "venueName",
      header: "会場名",
    },
    {
      accessorKey: "status",
      header: "状態",
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.status === "CANCELLED" ? "destructive" :
            row.original.status === "COMPLETED" ? "secondary" : "default"
          }
        >
          {EVENT_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      id: "maleCapacity",
      header: "男性定員",
      cell: ({ row }) => row.original.maleCapacity,
    },
    {
      id: "femaleCapacity",
      header: "女性定員",
      cell: ({ row }) => row.original.femaleCapacity,
    },
    {
      id: "maleCount",
      header: "男性参加",
      cell: ({ row }) => {
        const count = row.original.participants.filter(
          (p) => p.gender === "MALE" && !p.isDeleted
        ).length;
        return count;
      },
    },
    {
      id: "femaleCount",
      header: "女性参加",
      cell: ({ row }) => {
        const count = row.original.participants.filter(
          (p) => p.gender === "FEMALE" && !p.isDeleted
        ).length;
        return count;
      },
    },
    {
      id: "maleRemaining",
      header: "男性残枠",
      cell: ({ row }) => {
        const count = row.original.participants.filter(
          (p) => p.gender === "MALE" && !p.isDeleted
        ).length;
        const remaining = row.original.maleCapacity - count;
        return (
          <span className={remaining <= 0 ? "text-red-600 font-bold" : ""}>
            {remaining}
          </span>
        );
      },
    },
    {
      id: "femaleRemaining",
      header: "女性残枠",
      cell: ({ row }) => {
        const count = row.original.participants.filter(
          (p) => p.gender === "FEMALE" && !p.isDeleted
        ).length;
        const remaining = row.original.femaleCapacity - count;
        return (
          <span className={remaining <= 0 ? "text-red-600 font-bold" : ""}>
            {remaining}
          </span>
        );
      },
    },
    {
      id: "lineText",
      header: "",
      cell: ({ row }) => {
        const active = row.original.participants.filter((p) => !p.isDeleted);
        const maleCount = active.filter((p) => p.gender === "MALE").length;
        const femaleCount = active.filter((p) => p.gender === "FEMALE").length;
        return (
          <LineTextDialog
            event={{
              date: new Date(row.original.date),
              startTime: row.original.startTime,
              area: row.original.area,
              venueName: row.original.venueName,
              maleCapacity: row.original.maleCapacity,
              femaleCapacity: row.original.femaleCapacity,
              maleFee: row.original.maleFee,
              femaleFee: row.original.femaleFee,
              theme: row.original.theme,
              targetOccupation: row.original.targetOccupation,
            }}
            currentParticipants={{ maleCount, femaleCount }}
          >
            <Button variant="outline" size="sm">
              LINE
            </Button>
          </LineTextDialog>
        );
      },
    },
  ];

  const table = useReactTable({
    data: events,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="whitespace-nowrap">
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="whitespace-nowrap">
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
                className="text-center py-8 text-muted-foreground"
              >
                イベントがありません
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
