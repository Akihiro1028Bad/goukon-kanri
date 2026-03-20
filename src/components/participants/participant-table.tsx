"use client";

import { useState, useMemo } from "react";
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    flexRender,
    type ColumnDef,
} from "@tanstack/react-table";
import type { Participant } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { PaymentStatusCell } from "./payment-status-cell";
import { TaskStatusCell } from "./task-status-cell";
import { BulkPaymentDialog } from "./bulk-payment-dialog";
import { ParticipantForm } from "./participant-form";
import { GENDER_LABELS, PARTICIPANT_TASK_LABELS } from "@/types";
import { deleteParticipant, restoreParticipant } from "@/actions/participant-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Props = {
    participants: Participant[];
    eventId: string;
};

export function ParticipantTable({ participants, eventId }: Props) {
    const router = useRouter();
    const [nameFilter, setNameFilter] = useState("");
    const [showDeleted, setShowDeleted] = useState(false);
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
    const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);

    const filteredParticipants = useMemo(() => {
        let result = participants;
        if (!showDeleted) {
            result = result.filter((p) => !p.isDeleted);
        }
        if (nameFilter) {
            result = result.filter((p) =>
                p.name.toLowerCase().includes(nameFilter.toLowerCase())
            );
        }
        return result;
    }, [participants, showDeleted, nameFilter]);

    const unpaidParticipants = useMemo(
        () =>
            filteredParticipants.filter(
                (p) => p.paymentStatus === "UNPAID" && !p.isDeleted
            ),
        [filteredParticipants]
    );

    async function handleDelete(id: number) {
        const result = await deleteParticipant(id);
        if (result.success) {
            toast.success("参加者を削除しました");
            router.refresh();
        } else {
            toast.error(result.error);
        }
    }

    async function handleRestore(id: number) {
        const result = await restoreParticipant(id);
        if (result.success) {
            toast.success("参加者を復元しました");
            router.refresh();
        } else {
            toast.error(result.error);
        }
    }

    const columns: ColumnDef<Participant>[] = [
        {
            id: "select",
            header: () => null,
            cell: ({ row }) => {
                if (row.original.isDeleted || row.original.paymentStatus === "PAID")
                    return null;
                return (
                    <input
                        type="checkbox"
                        checked={row.getIsSelected()}
                        onChange={row.getToggleSelectedHandler()}
                        className="cursor-pointer"
                    />
                );
            },
        },
        {
            accessorKey: "name",
            header: "氏名",
            cell: ({ row }) => (
                <span className={row.original.isDeleted ? "line-through text-muted-foreground" : ""}>
                    {row.original.name}
                </span>
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
            header: "決済",
            cell: ({ row }) => {
                if (row.original.isDeleted) {
                    return <Badge variant="outline">-</Badge>;
                }
                return (
                    <PaymentStatusCell
                        participantId={row.original.id}
                        currentStatus={row.original.paymentStatus}
                        onStatusChanged={() => router.refresh()}
                    />
                );
            },
        },
        {
            accessorKey: "paymentDate",
            header: "決済日",
            cell: ({ row }) => {
                const date = row.original.paymentDate;
                if (!date) return "-";
                return new Date(date).toLocaleDateString("ja-JP");
            },
        },
        {
            accessorKey: "paymentConfirmedBy",
            header: "確認者",
            cell: ({ row }) => row.original.paymentConfirmedBy ?? "-",
        },
        ...([
            "detailsSent",
            "reminderSent",
            "thankYouSent",
        ] as const).map((taskType): ColumnDef<Participant> => ({
            accessorKey: taskType,
            header: PARTICIPANT_TASK_LABELS[taskType],
            cell: ({ row }) => {
                if (row.original.isDeleted) {
                    return <span className="text-muted-foreground">-</span>;
                }
                return (
                    <TaskStatusCell
                        participantId={row.original.id}
                        taskType={taskType}
                        currentValue={row.original[taskType]}
                    />
                );
            },
        })),
        {
            accessorKey: "memo",
            header: "メモ",
            cell: ({ row }) => (
                <span className="max-w-[150px] truncate block">
                    {row.original.memo ?? "-"}
                </span>
            ),
        },
        {
            id: "actions",
            header: "",
            cell: ({ row }) => {
                if (row.original.isDeleted) {
                    return (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRestore(row.original.id)}
                            className="text-xs"
                        >
                            復元
                        </Button>
                    );
                }
                return (
                    <div className="flex gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingParticipant(row.original)}
                            className="text-xs"
                        >
                            編集
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(row.original.id)}
                            className="text-xs text-destructive"
                        >
                            削除
                        </Button>
                    </div>
                );
            },
        },
    ];

    const table = useReactTable({
        data: filteredParticipants,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onRowSelectionChange: setRowSelection,
        state: { rowSelection },
        enableRowSelection: (row) =>
            !row.original.isDeleted && row.original.paymentStatus === "UNPAID",
    });

    return (
        <div className="space-y-4">
            {/* ツールバー */}
            <div className="flex flex-wrap items-center gap-4">
                <Input
                    placeholder="氏名で検索..."
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                    className="max-w-xs"
                />

                <div className="flex items-center gap-2">
                    <Switch
                        id="show-deleted"
                        checked={showDeleted}
                        onCheckedChange={setShowDeleted}
                    />
                    <Label htmlFor="show-deleted" className="text-sm">
                        削除済みを表示
                    </Label>
                </div>

                {unpaidParticipants.length > 0 && (
                    <BulkPaymentDialog
                        participants={unpaidParticipants}
                        onSuccess={() => router.refresh()}
                    >
                        <Button variant="outline" size="sm">
                            一括決済（{unpaidParticipants.length}名）
                        </Button>
                    </BulkPaymentDialog>
                )}
            </div>

            {/* テーブル */}
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
                                <TableRow
                                    key={row.id}
                                    className={row.original.isDeleted ? "opacity-50 bg-muted/30" : ""}
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

            {/* 編集ダイアログ */}
            <Dialog
                open={editingParticipant !== null}
                onOpenChange={(open) => {
                    if (!open) setEditingParticipant(null);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>参加者を編集</DialogTitle>
                    </DialogHeader>
                    {editingParticipant && (
                        <ParticipantForm
                            eventId={eventId}
                            defaultValues={{
                                id: editingParticipant.id,
                                name: editingParticipant.name,
                                gender: editingParticipant.gender,
                                fee: editingParticipant.fee,
                                paymentStatus: editingParticipant.paymentStatus,
                                paymentDate: editingParticipant.paymentDate
                                    ? new Date(editingParticipant.paymentDate)
                                    : undefined,
                                paymentConfirmedBy: editingParticipant.paymentConfirmedBy ?? undefined,
                                memo: editingParticipant.memo ?? undefined,
                            }}
                            onSuccess={() => {
                                setEditingParticipant(null);
                                router.refresh();
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
