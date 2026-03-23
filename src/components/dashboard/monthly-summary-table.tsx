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
import type { MonthlySummaryRow } from "@/types";
import Link from "next/link";
import { MonthlySummaryCard } from "./monthly-summary-card";

type Props = {
  year: number;
  rows: MonthlySummaryRow[];
};

function formatCurrency(value: number): string {
  return `¥${value.toLocaleString()}`;
}

export function MonthlySummaryTable({ year, rows }: Props) {
  const columns: ColumnDef<MonthlySummaryRow>[] = [
    {
      accessorKey: "month",
      header: "月",
      cell: ({ row }) => (
        <Link
          href={`/events?year=${year}&month=${row.original.month}`}
          className="text-blue-600 hover:underline font-medium"
        >
          {row.original.month}月
        </Link>
      ),
    },
    {
      accessorKey: "eventCount",
      header: "件数",
    },
    {
      accessorKey: "maleCount",
      header: "男性",
    },
    {
      accessorKey: "femaleCount",
      header: "女性",
    },
    {
      accessorKey: "venueCost",
      header: "会場費",
      cell: ({ row }) => formatCurrency(row.original.venueCost),
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
      accessorKey: "expectedProfitWithCb",
      header: "見込み利益(CB込)",
      cell: ({ row }) => formatCurrency(row.original.expectedProfitWithCb),
    },
    {
      accessorKey: "actualProfitWithCb",
      header: "実現利益(CB込)",
      cell: ({ row }) => formatCurrency(row.original.actualProfitWithCb),
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
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      {/* モバイル: カード形式 */}
      <div className="space-y-4 md:hidden">
        {rows.map((row) => (
          <MonthlySummaryCard key={row.month} year={year} row={row} />
        ))}
      </div>

      {/* デスクトップ: テーブル形式 */}
      <div className="hidden md:block rounded-md border overflow-x-auto">
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
            {table.getRowModel().rows.map((row) => (
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
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
