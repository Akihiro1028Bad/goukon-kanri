"use server";

import { prisma } from "@/lib/prisma";
import { createTodoSchema, updateTodoSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

/**
 * イベントにTODOを追加する
 */
export async function createTodo(
    eventId: string,
    formData: FormData
): Promise<ActionResult<{ id: number }>> {
    try {
        const rawData = Object.fromEntries(formData.entries());
        const validated = createTodoSchema.safeParse(rawData);

        if (!validated.success) {
            return {
                success: false,
                error: validated.error.issues.map((i) => i.message).join(", "),
            };
        }

        // 次のsortOrderを取得
        const maxSortOrder = await prisma.eventTodo.aggregate({
            where: { eventId, isDeleted: false },
            _max: { sortOrder: true },
        });
        const nextSortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;

        const todo = await prisma.eventTodo.create({
            data: {
                eventId,
                title: validated.data.title,
                memo: validated.data.memo ?? null,
                sortOrder: nextSortOrder,
            },
        });

        revalidatePath(`/events/${eventId}`);

        return { success: true, data: { id: todo.id } };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "TODOの作成に失敗しました",
        };
    }
}

/**
 * TODOの完了状態をトグルする
 */
export async function toggleTodo(
    todoId: number
): Promise<ActionResult> {
    try {
        const current = await prisma.eventTodo.findUnique({
            where: { id: todoId },
            select: { isCompleted: true, eventId: true, isDeleted: true },
        });

        if (!current) {
            return {
                success: false,
                error: "TODOが見つかりません",
            };
        }

        if (current.isDeleted) {
            return {
                success: false,
                error: "削除済みのTODOは更新できません",
            };
        }

        const newIsCompleted = !current.isCompleted;

        await prisma.eventTodo.update({
            where: { id: todoId },
            data: {
                isCompleted: newIsCompleted,
                completedAt: newIsCompleted ? new Date() : null,
            },
        });

        revalidatePath(`/events/${current.eventId}`);

        return { success: true, data: undefined };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "TODOの更新に失敗しました",
        };
    }
}

/**
 * TODOを更新する（タイトル・メモの変更）
 */
export async function updateTodo(
    todoId: number,
    formData: FormData
): Promise<ActionResult> {
    try {
        const rawData = Object.fromEntries(formData.entries());
        const validated = updateTodoSchema.safeParse(rawData);

        if (!validated.success) {
            return {
                success: false,
                error: validated.error.issues.map((i) => i.message).join(", "),
            };
        }

        const current = await prisma.eventTodo.findUnique({
            where: { id: todoId },
            select: { eventId: true, isDeleted: true },
        });

        if (!current) {
            return {
                success: false,
                error: "TODOが見つかりません",
            };
        }

        if (current.isDeleted) {
            return {
                success: false,
                error: "削除済みのTODOは更新できません",
            };
        }

        await prisma.eventTodo.update({
            where: { id: todoId },
            data: {
                title: validated.data.title,
                memo: validated.data.memo ?? null,
            },
        });

        revalidatePath(`/events/${current.eventId}`);

        return { success: true, data: undefined };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "TODOの更新に失敗しました",
        };
    }
}

/**
 * TODOを論理削除する
 */
export async function deleteTodo(
    todoId: number
): Promise<ActionResult> {
    try {
        const todo = await prisma.eventTodo.update({
            where: { id: todoId },
            data: { isDeleted: true },
        });

        revalidatePath(`/events/${todo.eventId}`);

        return { success: true, data: undefined };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "TODOの削除に失敗しました",
        };
    }
}
