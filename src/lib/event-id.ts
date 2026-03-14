import { PrismaClient } from "@prisma/client";

/**
 * 次のイベントIDを生成する
 *
 * フォーマット: YYYY-MM-NNN
 * - YYYY: イベント日付の年
 * - MM: イベント日付の月（ゼロ埋め）
 * - NNN: 当月連番（論理削除を含む最大値 + 1、ゼロ埋め3桁以上）
 *
 * 【重要】削除済みIDは再利用しない。当月の全イベント（削除済み含む）の
 * 最大連番 + 1 を使用する（単調増加）。
 */
export async function generateEventId(
  prisma: PrismaClient,
  eventDate: Date
): Promise<string> {
  const year = eventDate.getFullYear();
  const month = eventDate.getMonth() + 1;

  const yearStr = String(year);
  const monthStr = String(month).padStart(2, "0");
  const prefix = `${yearStr}-${monthStr}-`;

  // 当月の全イベント（論理削除含む）から最大連番を取得
  const lastEvent = await prisma.event.findFirst({
    where: {
      eventId: { startsWith: prefix },
    },
    orderBy: { eventId: "desc" },
    select: { eventId: true },
  });

  let nextSeq = 1;
  if (lastEvent) {
    const lastSeqStr = lastEvent.eventId.split("-")[2];
    nextSeq = parseInt(lastSeqStr, 10) + 1;
  }

  const seqStr = String(nextSeq).padStart(3, "0");

  return `${prefix}${seqStr}`;
}
