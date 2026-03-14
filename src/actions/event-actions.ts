"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { eventFormSchema } from "@/lib/validations";
import { generateEventId } from "@/lib/event-id";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

/**
 * 新規イベントを登録する
 */
export async function createEvent(
  formData: FormData
): Promise<ActionResult<string>> {
  try {
    const raw = Object.fromEntries(formData);
    const validated = eventFormSchema.parse(raw);

    const eventId = await generateEventId(prisma, validated.date);

    await prisma.event.create({
      data: {
        eventId,
        ...validated,
      },
    });

    revalidatePath("/events");
    revalidatePath("/");

    return { success: true, data: eventId };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: "イベントの登録に失敗しました" };
  }
}

/**
 * 既存イベントを更新する
 */
export async function updateEvent(
  eventId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const raw = Object.fromEntries(formData);
    const validated = eventFormSchema.parse(raw);

    await prisma.event.update({
      where: { eventId },
      data: validated,
    });

    revalidatePath(`/events/${eventId}`);
    revalidatePath("/events");
    revalidatePath("/");

    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: "イベントの更新に失敗しました" };
  }
}

/**
 * イベントを論理削除する
 */
export async function deleteEvent(
  eventId: string
): Promise<ActionResult> {
  try {
    await prisma.$transaction([
      prisma.event.update({
        where: { eventId },
        data: { isDeleted: true },
      }),
      prisma.participant.updateMany({
        where: { eventId },
        data: { isDeleted: true },
      }),
    ]);

    revalidatePath("/events");
    revalidatePath("/");

    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "イベントの削除に失敗しました" };
  }
}

/**
 * 論理削除されたイベントを復元する
 */
export async function restoreEvent(
  eventId: string
): Promise<ActionResult> {
  try {
    await prisma.$transaction([
      prisma.event.update({
        where: { eventId },
        data: { isDeleted: false },
      }),
      prisma.participant.updateMany({
        where: { eventId },
        data: { isDeleted: false },
      }),
    ]);

    revalidatePath("/events");
    revalidatePath("/");

    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "イベントの復元に失敗しました" };
  }
}
