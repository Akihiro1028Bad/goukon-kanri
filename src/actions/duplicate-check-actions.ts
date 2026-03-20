"use server";

import { findDuplicateParticipants } from "@/queries/participant-queries";
import type { ActionResult, DuplicateCheckResult } from "@/types";

/**
 * イベントの参加者間で過去の重複を手動チェックする
 */
export async function checkDuplicates(
    eventId: string
): Promise<ActionResult<DuplicateCheckResult>> {
    try {
        const duplicates = await findDuplicateParticipants(eventId);
        return {
            success: true,
            data: {
                duplicates,
                eventId,
                checkedAt: new Date(),
            },
        };
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "重複チェックに失敗しました",
        };
    }
}
