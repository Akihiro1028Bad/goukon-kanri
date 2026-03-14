"use client";

import { useState } from "react";
import { updatePaymentStatus } from "@/actions/participant-actions";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
    participantId: number;
    currentStatus: "PAID" | "UNPAID";
    onStatusChanged?: () => void;
};

export function PaymentStatusCell({
    participantId,
    currentStatus,
    onStatusChanged,
}: Props) {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [paymentDate, setPaymentDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [confirmedBy, setConfirmedBy] = useState("");

    async function handleToggle() {
        if (currentStatus === "PAID") {
            // PAID → UNPAID: 直接切り替え
            setIsLoading(true);
            const result = await updatePaymentStatus(participantId, "UNPAID");
            setIsLoading(false);

            if (result.success) {
                toast.success("決済状況を「未」に変更しました");
                onStatusChanged?.();
            } else {
                toast.error(result.error);
            }
        } else {
            // UNPAID → PAID: インラインで入力を求める
            setIsEditing(true);
        }
    }

    async function handleConfirmPaid() {
        if (!confirmedBy.trim()) {
            toast.error("確認者名を入力してください");
            return;
        }

        setIsLoading(true);
        const result = await updatePaymentStatus(
            participantId,
            "PAID",
            new Date(paymentDate),
            confirmedBy
        );
        setIsLoading(false);

        if (result.success) {
            toast.success("決済状況を「済」に変更しました");
            setIsEditing(false);
            setConfirmedBy("");
            onStatusChanged?.();
        } else {
            toast.error(result.error);
        }
    }

    if (isEditing) {
        return (
            <div className="space-y-2 min-w-[200px]">
                <div>
                    <Label className="text-xs">決済日</Label>
                    <Input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="h-8 text-sm"
                    />
                </div>
                <div>
                    <Label className="text-xs">確認者</Label>
                    <Input
                        value={confirmedBy}
                        onChange={(e) => setConfirmedBy(e.target.value)}
                        placeholder="確認者名"
                        className="h-8 text-sm"
                    />
                </div>
                <div className="flex gap-1">
                    <Button
                        size="sm"
                        onClick={handleConfirmPaid}
                        disabled={isLoading}
                        className="h-7 text-xs"
                    >
                        確定
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                        className="h-7 text-xs"
                    >
                        ×
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <button
            onClick={handleToggle}
            disabled={isLoading}
            className="cursor-pointer"
        >
            <Badge variant={currentStatus === "PAID" ? "default" : "secondary"}>
                {currentStatus === "PAID" ? "済" : "未"}
            </Badge>
        </button>
    );
}
