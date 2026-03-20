"use client";

import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { DuplicatePair } from "@/types";

type Props = {
    duplicates: DuplicatePair[];
    onDismiss?: () => void;
};

export function DuplicateWarning({ duplicates, onDismiss }: Props) {
    if (duplicates.length === 0) return null;

    return (
        <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>参加者の重複が検出されました</AlertTitle>
            <AlertDescription>
                <p className="mb-2">
                    以下の参加者は過去のイベントで一緒に参加していました:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                    {duplicates.map((pair) => (
                        <li key={`${pair.participantA}::${pair.participantB}`}>
                            <strong>{pair.participantA}</strong> &{" "}
                            <strong>{pair.participantB}</strong> — 過去の共演:{" "}
                            {pair.sharedEvents.map((e) => e.eventId).join(", ")}
                        </li>
                    ))}
                </ul>
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="mt-2 text-sm underline"
                    >
                        閉じる
                    </button>
                )}
            </AlertDescription>
        </Alert>
    );
}
