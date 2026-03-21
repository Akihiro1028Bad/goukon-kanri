import { prisma } from "@/lib/prisma";
import type { Participant } from "@prisma/client";
import type { DuplicatePair } from "@/types";

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

/**
 * イベント内の参加者間で、過去に同じイベントに参加していたペアを検出する
 */
export async function findDuplicateParticipants(
    eventId: string
): Promise<DuplicatePair[]> {
    // 1. 対象イベントのアクティブ参加者一覧を取得
    const currentParticipants = await prisma.participant.findMany({
        where: {
            eventId,
            isDeleted: false,
        },
        select: { name: true },
    });

    if (currentParticipants.length < 2) return [];

    const names = currentParticipants.map((p) => p.name);

    // 2. 対象の名前が参加している他イベントの参加者をまとめて取得
    //    （対象イベント自身は除外）
    const pastParticipants = await prisma.participant.findMany({
        where: {
            name: { in: names },
            eventId: { not: eventId },
            isDeleted: false,
            event: { isDeleted: false },
        },
        select: {
            name: true,
            eventId: true,
            event: {
                select: {
                    eventId: true,
                    date: true,
                    venueName: true,
                },
            },
        },
    });

    // 3. イベントごとに参加者名をグルーピング
    const eventToNames = new Map<string, Set<string>>();
    const eventInfo = new Map<
        string,
        { eventId: string; date: Date; venueName: string }
    >();

    for (const p of pastParticipants) {
        const eid = p.eventId;
        if (!eventToNames.has(eid)) {
            eventToNames.set(eid, new Set());
            eventInfo.set(eid, {
                eventId: p.event.eventId,
                date: p.event.date,
                venueName: p.event.venueName,
            });
        }
        eventToNames.get(eid)!.add(p.name);
    }

    // 4. 同一過去イベントに2名以上いるケースを抽出してペア化
    const pairMap = new Map<string, DuplicatePair>();

    for (const [eid, nameSet] of eventToNames) {
        if (nameSet.size < 2) continue;

        const namesInEvent = Array.from(nameSet).sort();
        for (let i = 0; i < namesInEvent.length; i++) {
            for (let j = i + 1; j < namesInEvent.length; j++) {
                const key = `${namesInEvent[i]}::${namesInEvent[j]}`;
                if (!pairMap.has(key)) {
                    pairMap.set(key, {
                        participantA: namesInEvent[i],
                        participantB: namesInEvent[j],
                        sharedEvents: [],
                    });
                }
                pairMap.get(key)!.sharedEvents.push(eventInfo.get(eid)!);
            }
        }
    }

    return Array.from(pairMap.values());
}
