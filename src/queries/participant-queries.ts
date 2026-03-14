import { prisma } from "@/lib/prisma";
import type { Participant } from "@prisma/client";

export type ParticipantWithEventId = Participant & {
    eventId: string;
};

/**
 * 全イベント横断の参加者一覧を取得する（FR-010）
 */
export async function getAllParticipants(options?: {
    nameFilter?: string;
    includeDeleted?: boolean;
}): Promise<ParticipantWithEventId[]> {
    const { nameFilter, includeDeleted = false } = options ?? {};

    const participants = await prisma.participant.findMany({
        where: {
            ...(!includeDeleted ? { isDeleted: false } : {}),
            ...(nameFilter
                ? {
                    name: {
                        contains: nameFilter,
                    },
                }
                : {}),
        },
        include: {
            event: {
                select: { eventId: true },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    return participants.map((p) => {
        const { event, ...participantData } = p;
        return {
            ...participantData,
            eventId: event.eventId,
        };
    });
}
