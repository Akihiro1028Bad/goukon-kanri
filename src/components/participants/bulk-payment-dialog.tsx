"use client";

import { useState } from "react";
import { bulkUpdatePaymentStatus } from "@/actions/participant-actions";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

type Participant = {
    id: number;
    name: string;
    gender: string;
    fee: number;
};

type Props = {
    participants: Participant[];
    onSuccess?: () => void;
    children: React.ReactNode;
};

export function BulkPaymentDialog({ participants, onSuccess, children }: Props) {
    const [open, setOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [paymentDate, setPaymentDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [confirmedBy, setConfirmedBy] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    function toggleParticipant(id: number) {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    }

    function toggleAll() {
        if (selectedIds.length === participants.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(participants.map((p) => p.id));
        }
    }

    async function handleSubmit() {
        if (selectedIds.length === 0) {
            toast.error("1名以上選択してください");
            return;
        }
        if (!confirmedBy.trim()) {
            toast.error("確認者名を入力してください");
            return;
        }

        setIsLoading(true);
        const result = await bulkUpdatePaymentStatus(
            selectedIds,
            new Date(paymentDate),
            confirmedBy
        );
        setIsLoading(false);

        if (result.success) {
            toast.success(`${result.data.updatedCount}名の決済状況を更新しました`);
            setOpen(false);
            setSelectedIds([]);
            setConfirmedBy("");
            onSuccess?.();
        } else {
            toast.error(result.error);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={children as React.ReactElement}></DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>一括決済更新</DialogTitle>
                    <DialogDescription>
                        対象の参加者を選択し、決済日と確認者を入力してください。
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* 参加者チェックリスト */}
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        <div className="flex items-center gap-2 border-b pb-2">
                            <Checkbox
                                checked={
                                    selectedIds.length === participants.length &&
                                    participants.length > 0
                                }
                                onCheckedChange={toggleAll}
                            />
                            <span className="text-sm font-medium">全選択</span>
                        </div>
                        {participants.map((p) => (
                            <div key={p.id} className="flex items-center gap-2">
                                <Checkbox
                                    checked={selectedIds.includes(p.id)}
                                    onCheckedChange={() => toggleParticipant(p.id)}
                                />
                                <span className="text-sm">
                                    {p.name}（¥{p.fee.toLocaleString()}）
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* 決済日 */}
                    <div>
                        <Label>決済日</Label>
                        <Input
                            type="date"
                            value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                        />
                    </div>

                    {/* 確認者 */}
                    <div>
                        <Label>確認者名</Label>
                        <Input
                            value={confirmedBy}
                            onChange={(e) => setConfirmedBy(e.target.value)}
                            placeholder="確認者名を入力"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setOpen(false)}
                    >
                        キャンセル
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isLoading || selectedIds.length === 0}
                    >
                        {isLoading
                            ? "更新中..."
                            : `${selectedIds.length}名を一括更新`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
