"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import type { Participant } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GENDER_LABELS, PAYMENT_STATUS_LABELS } from "@/types";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type ParticipantRow = Participant & {
  eventId: string;
};

type Props = {
  participants: ParticipantRow[];
  initialNameFilter?: string;
};

export function CrossEventParticipantTable({ participants, initialNameFilter = "" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nameFilter, setNameFilter] = useState(initialNameFilter);

  const filteredParticipants = useMemo(() => {
    if (!nameFilter) return participants;
    return participants.filter((p) =>
      p.name.toLowerCase().includes(nameFilter.toLowerCase())
    );
  }, [participants, nameFilter]);

  function handleNameFilterChange(value: string) {
    setNameFilter(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("name", value);
    } else {
      params.delete("name");
    }
    router.push(`/participants?${params.toString()}`);
  }

  const columns: ColumnDef<ParticipantRow>[] = [
    {
      accessorKey: "name",
      header: "氏名",
    },
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
      accessorKey: "gender",
      header: "性別",
      cell: ({ row }) => (
        <Badge variant={row.original.gender === "MALE" ? "default" : "secondary"}>
          {GENDER_LABELS[row.original.gender]}
        </Badge>
      ),
    },
    {
      accessorKey: "fee",
      header: "参加費",
      cell: ({ row }) => `¥${row.original.fee.toLocaleString()}`,
    },
    {
      accessorKey: "paymentStatus",
      header: "決済状況",
      cell: ({ row }) => (
        <Badge
          variant={row.original.paymentStatus === "PAID" ? "default" : "outline"}
        >
          {PAYMENT_STATUS_LABELS[row.original.paymentStatus]}
        </Badge>
      ),
    },
  ];

  const table = useReactTable({
    data: filteredParticipants,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      <Input
        placeholder="氏名で検索..."
        value={nameFilter}
        onChange={(e) => handleNameFilterChange(e.target.value)}
        className="max-w-xs"
      />

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
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
                  className="text-center py-8 text-muted-foreground"
                >
                  参加者がいません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        {filteredParticipants.length}名を表示
      </div>
    </div>
  );
}
