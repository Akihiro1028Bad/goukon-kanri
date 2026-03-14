"use client";

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ReportRow } from "@/queries/event-queries";
import Link from "next/link";

type Props = {
  data: ReportRow[];
};

function formatCurrency(value: number): string {
  return `¥${value.toLocaleString()}`;
}

export function ReportTable({ data }: Props) {
  const columns: ColumnDef<ReportRow>[] = [
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
      accessorKey: "venueCost",
      header: "会場費",
      cell: ({ row }) => formatCurrency(row.original.venueCost),
    },
    {
      accessorKey: "expectedCashback",
      header: "予定CB",
      cell: ({ row }) => formatCurrency(row.original.expectedCashback),
    },
    {
      accessorKey: "actualCashback",
      header: "実際CB",
      cell: ({ row }) => formatCurrency(row.original.actualCashback),
    },
    {
      accessorKey: "expectedRevenue",
      header: "見込み収入",
      cell: ({ row }) => formatCurrency(row.original.expectedRevenue),
    },
    {
      accessorKey: "paidRevenue",
      header: "決済済み",
      cell: ({ row }) => formatCurrency(row.original.paidRevenue),
    },
    {
      accessorKey: "uncollected",
      header: "未回収",
      cell: ({ row }) => formatCurrency(row.original.uncollected),
    },
    {
      accessorKey: "expectedProfit",
      header: "見込み利益",
      cell: ({ row }) => formatCurrency(row.original.expectedProfit),
    },
    {
      accessorKey: "actualProfit",
      header: "実現利益",
      cell: ({ row }) => formatCurrency(row.original.actualProfit),
    },
    {
      accessorKey: "profitRate",
      header: "利益率",
      cell: ({ row }) =>
        row.original.profitRate !== null
          ? `${row.original.profitRate.toFixed(1)}%`
          : "-",
    },
  ];

  const table = useReactTable({
    data,
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
                データがありません
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
