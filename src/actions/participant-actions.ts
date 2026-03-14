"use server";

import { prisma } from "@/lib/prisma";
import { participantFormSchema, bulkPaymentSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

/**
 * イベントに参加者を登録する
 */
export async function createParticipant(
    eventId: string,
    formData: FormData
): Promise<ActionResult<{ id: number }>> {
    try {
        const rawData = Object.fromEntries(formData.entries());
        const validated = participantFormSchema.safeParse(rawData);

        if (!validated.success) {
            return {
                success: false,
                error: validated.error.issues.map((i) => i.message).join(", "),
            };
        }

        const participant = await prisma.participant.create({
            data: {
                eventId,
                name: validated.data.name,
                gender: validated.data.gender,
                fee: validated.data.fee,
                paymentStatus: validated.data.paymentStatus,
                paymentDate: validated.data.paymentDate ?? null,
                paymentConfirmedBy: validated.data.paymentConfirmedBy ?? null,
                memo: validated.data.memo ?? null,
            },
        });

        revalidatePath(`/events/${eventId}`);
        revalidatePath("/participants");

        return { success: true, data: { id: participant.id } };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "参加者の登録に失敗しました",
        };
    }
}

/**
 * 参加者情報を更新する
 */
export async function updateParticipant(
    participantId: number,
    formData: FormData
): Promise<ActionResult> {
    try {
        const rawData = Object.fromEntries(formData.entries());
        const validated = participantFormSchema.safeParse(rawData);

        if (!validated.success) {
            return {
                success: false,
                error: validated.error.issues.map((i) => i.message).join(", "),
            };
        }

        const participant = await prisma.participant.update({
            where: { id: participantId },
            data: {
                name: validated.data.name,
                gender: validated.data.gender,
                fee: validated.data.fee,
                paymentStatus: validated.data.paymentStatus,
                paymentDate: validated.data.paymentDate ?? null,
                paymentConfirmedBy: validated.data.paymentConfirmedBy ?? null,
                memo: validated.data.memo ?? null,
            },
        });

        revalidatePath(`/events/${participant.eventId}`);
        revalidatePath("/participants");

        return { success: true, data: undefined };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "参加者の更新に失敗しました",
        };
    }
}

/**
 * 参加者を論理削除する
 */
export async function deleteParticipant(
    participantId: number
): Promise<ActionResult> {
    try {
        const participant = await prisma.participant.update({
            where: { id: participantId },
            data: { isDeleted: true },
        });

        revalidatePath(`/events/${participant.eventId}`);
        revalidatePath("/participants");

        return { success: true, data: undefined };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "参加者の削除に失敗しました",
        };
    }
}

/**
 * 論理削除された参加者を復元する
 */
export async function restoreParticipant(
    participantId: number
): Promise<ActionResult> {
    try {
        const participant = await prisma.participant.update({
            where: { id: participantId },
            data: { isDeleted: false },
        });

        revalidatePath(`/events/${participant.eventId}`);
        revalidatePath("/participants");

        return { success: true, data: undefined };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "参加者の復元に失敗しました",
        };
    }
}

/**
 * 参加者の決済状況を個別に更新する
 */
export async function updatePaymentStatus(
    participantId: number,
    status: "PAID" | "UNPAID",
    paymentDate?: Date,
    confirmedBy?: string
): Promise<ActionResult> {
    try {
        const participant = await prisma.participant.update({
            where: { id: participantId },
            data: {
                paymentStatus: status,
                paymentDate: status === "PAID" ? (paymentDate ?? null) : null,
                paymentConfirmedBy: status === "PAID" ? (confirmedBy ?? null) : null,
            },
        });

        revalidatePath(`/events/${participant.eventId}`);
        revalidatePath("/participants");

        return { success: true, data: undefined };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "決済状況の更新に失敗しました",
        };
    }
}

/**
 * 複数参加者の決済状況を一括で「済」に更新する
 */
export async function bulkUpdatePaymentStatus(
    participantIds: number[],
    paymentDate: Date,
    confirmedBy: string
): Promise<ActionResult<{ updatedCount: number }>> {
    try {
        // バリデーション
        const validated = bulkPaymentSchema.safeParse({
            participantIds,
            paymentDate,
            confirmedBy,
        });

        if (!validated.success) {
            return {
                success: false,
                error: validated.error.issues.map((i) => i.message).join(", "),
            };
        }

        const result = await prisma.$transaction(
            participantIds.map((id) =>
                prisma.participant.update({
                    where: { id },
                    data: {
                        paymentStatus: "PAID",
                        paymentDate,
                        paymentConfirmedBy: confirmedBy,
                    },
                })
            )
        );

        // Revalidate paths for all affected events
        const eventIds = new Set(result.map((p) => p.eventId));
        for (const eventId of eventIds) {
            revalidatePath(`/events/${eventId}`);
        }
        revalidatePath("/participants");

        return { success: true, data: { updatedCount: result.length } };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "一括決済更新に失敗しました",
        };
    }
}
