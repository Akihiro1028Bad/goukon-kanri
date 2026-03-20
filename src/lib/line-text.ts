import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { formatRemainingSlot } from "@/lib/remaining-slots";

/**
 * LINE公式アカウント投稿用の募集文テキストを生成する（FR-019）
 */
export function generateLineText(
  event: {
    date: Date;
    startTime: string;
    area: string;
    venueName: string;
    maleCapacity: number;
    femaleCapacity: number;
    maleFee: number;
    femaleFee: number;
    theme: string | null;
    targetOccupation: string | null;
    mapUrl: string | null;
  },
  currentParticipants: {
    maleCount: number;
    femaleCount: number;
  }
): string {
  const dayOfWeek = format(event.date, "E", { locale: ja });
  const dateStr = format(event.date, "yyyy年M月d日", { locale: ja });

  const maleRemaining = event.maleCapacity - currentParticipants.maleCount;
  const femaleRemaining = event.femaleCapacity - currentParticipants.femaleCount;

  const lines: string[] = [
    "飲み会のお知らせ",
    "",
    `${dateStr}（${dayOfWeek}）`,
    `${event.startTime}〜`,
    `${event.area} / ${event.venueName}`,
  ];

  if (event.mapUrl) {
    lines.push(event.mapUrl);
  }

  lines.push(
    `男性${event.maleCapacity}名 / 女性${event.femaleCapacity}名`,
    `男性 ${event.maleFee.toLocaleString()}円 / 女性 ${event.femaleFee.toLocaleString()}円`
  );

  if (event.theme) {
    lines.push(`テーマ: ${event.theme}`);
  }

  if (event.targetOccupation) {
    lines.push(`対象: ${event.targetOccupation}`);
  }

  const maleSlot = `男性${formatRemainingSlot(maleRemaining)}`;
  const femaleSlot = `女性${formatRemainingSlot(femaleRemaining)}`;
  lines.push(`残枠: ${maleSlot} / ${femaleSlot}`);

  return lines.join("\n");
}
