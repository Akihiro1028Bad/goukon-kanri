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
      {/* モバイル表示: カードレイアウト */}
      <div className="md:hidden space-y-4">
        {rows.map((row) => (
          <div key={row.month} className="rounded-md border p-4 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <Link
                href={`/events?year=${year}&month=${row.month}`}
                className="text-lg font-semibold text-blue-600 hover:underline"
              >
                {row.month}月
              </Link>
              <span className="text-sm text-muted-foreground">
                {row.eventCount}件
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground">参加者</div>
                <div className="font-medium">
                  男性{row.maleCount} / 女性{row.femaleCount}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">会場費</div>
                <div className="font-medium">{formatCurrency(row.venueCost)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">見込み収入</div>
                <div className="font-medium">{formatCurrency(row.expectedRevenue)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">決済済み</div>
                <div className="font-medium">{formatCurrency(row.paidRevenue)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">未回収</div>
                <div className="font-medium">{formatCurrency(row.uncollected)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">利益率</div>
                <div className="font-medium">
                  {row.profitRate !== null ? `${row.profitRate.toFixed(1)}%` : "-"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">見込み利益</div>
                <div className="font-medium">{formatCurrency(row.expectedProfit)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">実現利益</div>
                <div className="font-medium">{formatCurrency(row.actualProfit)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">見込み利益(CB込)</div>
                <div className="font-medium">{formatCurrency(row.expectedProfitWithCb)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">実現利益(CB込)</div>
                <div className="font-medium">{formatCurrency(row.actualProfitWithCb)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* デスクトップ表示: テーブルレイアウト */}
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
