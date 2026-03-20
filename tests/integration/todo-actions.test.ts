import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { PrismaClient } from "@prisma/client";

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

import {
    createTodo,
    toggleTodo,
    updateTodo,
    deleteTodo,
} from "@/actions/todo-actions";

const testPrisma = new PrismaClient({
    datasources: {
        db: { url: "postgresql://postgres:postgres@localhost:5433/goukon_kanri_test" },
    },
});

/** ヘルパー: イベントを1件作成 */
async function createTestEvent(overrides: Record<string, unknown> = {}) {
    return testPrisma.event.create({
        data: {
            eventId: "2025-07-001",
            date: new Date("2025-07-15"),
            startTime: "19:00",
            venueName: "テスト会場",
            area: "渋谷",
            maleCapacity: 5,
            femaleCapacity: 5,
            maleFee: 6000,
            femaleFee: 4000,
            status: "SCHEDULED",
            ...overrides,
        },
    });
}

/** ヘルパー: TODO用FormData作成 */
function createTodoFormData(overrides: Record<string, string> = {}): FormData {
    const defaults: Record<string, string> = {
        title: "会場予約",
    };
    const data = new FormData();
    const merged = { ...defaults, ...overrides };
    Object.entries(merged).forEach(([k, v]) => data.append(k, v));
    return data;
}

describe("Todo Server Actions (Integration)", () => {
    beforeAll(async () => {
        await testPrisma.$connect();
    });

    afterAll(async () => {
        await testPrisma.$disconnect();
    });

    beforeEach(async () => {
        await testPrisma.eventTodo.deleteMany();
        await testPrisma.participant.deleteMany();
        await testPrisma.event.deleteMany();
    });

    // INT-T001: createTodo → 正常系
    it("INT-T001: createTodo with valid data adds todo to DB", async () => {
        const event = await createTestEvent();
        const formData = createTodoFormData();
        const result = await createTodo(event.eventId, formData);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.id).toBeGreaterThan(0);
        }

        const todos = await testPrisma.eventTodo.findMany({
            where: { eventId: event.eventId },
        });
        expect(todos).toHaveLength(1);
        expect(todos[0].title).toBe("会場予約");
        expect(todos[0].isCompleted).toBe(false);
        expect(todos[0].completedAt).toBeNull();
        expect(todos[0].sortOrder).toBe(0);
        expect(todos[0].isDeleted).toBe(false);
    });

    // INT-T002: createTodo → バリデーションエラー（タイトル空）
    it("INT-T002: createTodo with empty title returns error", async () => {
        const event = await createTestEvent();
        const formData = createTodoFormData({ title: "" });
        const result = await createTodo(event.eventId, formData);

        expect(result.success).toBe(false);
    });

    // INT-T003: createTodo → メモ付き
    it("INT-T003: createTodo with memo saves memo correctly", async () => {
        const event = await createTestEvent();
        const formData = createTodoFormData({ title: "会場予約", memo: "電話で予約" });
        const result = await createTodo(event.eventId, formData);

        expect(result.success).toBe(true);
        if (result.success) {
            const todo = await testPrisma.eventTodo.findUnique({
                where: { id: result.data.id },
            });
            expect(todo?.memo).toBe("電話で予約");
        }
    });

    // INT-T004: createTodo → sortOrderが自動インクリメント
    it("INT-T004: createTodo auto-increments sortOrder", async () => {
        const event = await createTestEvent();

        const result1 = await createTodo(event.eventId, createTodoFormData({ title: "TODO 1" }));
        const result2 = await createTodo(event.eventId, createTodoFormData({ title: "TODO 2" }));
        const result3 = await createTodo(event.eventId, createTodoFormData({ title: "TODO 3" }));

        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);
        expect(result3.success).toBe(true);

        const todos = await testPrisma.eventTodo.findMany({
            where: { eventId: event.eventId },
            orderBy: { sortOrder: "asc" },
        });
        expect(todos).toHaveLength(3);
        expect(todos[0].sortOrder).toBe(0);
        expect(todos[1].sortOrder).toBe(1);
        expect(todos[2].sortOrder).toBe(2);
    });

    // INT-T005: toggleTodo → 未完了→完了
    it("INT-T005: toggleTodo toggles incomplete to complete with completedAt", async () => {
        const event = await createTestEvent();
        const createResult = await createTodo(event.eventId, createTodoFormData());
        expect(createResult.success).toBe(true);

        const todoId = createResult.success ? createResult.data.id : 0;
        const result = await toggleTodo(todoId);
        expect(result.success).toBe(true);

        const todo = await testPrisma.eventTodo.findUnique({
            where: { id: todoId },
        });
        expect(todo?.isCompleted).toBe(true);
        expect(todo?.completedAt).not.toBeNull();
    });

    // INT-T006: toggleTodo → 完了→未完了
    it("INT-T006: toggleTodo toggles complete back to incomplete, clears completedAt", async () => {
        const event = await createTestEvent();
        const createResult = await createTodo(event.eventId, createTodoFormData());
        expect(createResult.success).toBe(true);

        const todoId = createResult.success ? createResult.data.id : 0;
        // 完了にする
        await toggleTodo(todoId);
        // 未完了に戻す
        const result = await toggleTodo(todoId);
        expect(result.success).toBe(true);

        const todo = await testPrisma.eventTodo.findUnique({
            where: { id: todoId },
        });
        expect(todo?.isCompleted).toBe(false);
        expect(todo?.completedAt).toBeNull();
    });

    // INT-T007: toggleTodo → 存在しないID
    it("INT-T007: toggleTodo with non-existent ID returns error", async () => {
        const result = await toggleTodo(999999);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBe("TODOが見つかりません");
        }
    });

    // INT-T008: toggleTodo → 削除済みTODO
    it("INT-T008: toggleTodo on deleted todo returns error", async () => {
        const event = await createTestEvent();
        const createResult = await createTodo(event.eventId, createTodoFormData());
        expect(createResult.success).toBe(true);

        const todoId = createResult.success ? createResult.data.id : 0;
        await deleteTodo(todoId);

        const result = await toggleTodo(todoId);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBe("削除済みのTODOは更新できません");
        }
    });

    // INT-T009: updateTodo → 正常系
    it("INT-T009: updateTodo updates title and memo", async () => {
        const event = await createTestEvent();
        const createResult = await createTodo(event.eventId, createTodoFormData());
        expect(createResult.success).toBe(true);

        const todoId = createResult.success ? createResult.data.id : 0;
        const updateFormData = createTodoFormData({
            title: "会場変更",
            memo: "別の会場に変更",
        });
        const result = await updateTodo(todoId, updateFormData);
        expect(result.success).toBe(true);

        const todo = await testPrisma.eventTodo.findUnique({
            where: { id: todoId },
        });
        expect(todo?.title).toBe("会場変更");
        expect(todo?.memo).toBe("別の会場に変更");
    });

    // INT-T010: updateTodo → バリデーションエラー
    it("INT-T010: updateTodo with empty title returns error", async () => {
        const event = await createTestEvent();
        const createResult = await createTodo(event.eventId, createTodoFormData());
        expect(createResult.success).toBe(true);

        const todoId = createResult.success ? createResult.data.id : 0;
        const updateFormData = createTodoFormData({ title: "" });
        const result = await updateTodo(todoId, updateFormData);
        expect(result.success).toBe(false);
    });

    // INT-T011: updateTodo → 削除済みTODO
    it("INT-T011: updateTodo on deleted todo returns error", async () => {
        const event = await createTestEvent();
        const createResult = await createTodo(event.eventId, createTodoFormData());
        expect(createResult.success).toBe(true);

        const todoId = createResult.success ? createResult.data.id : 0;
        await deleteTodo(todoId);

        const updateFormData = createTodoFormData({ title: "更新テスト" });
        const result = await updateTodo(todoId, updateFormData);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBe("削除済みのTODOは更新できません");
        }
    });

    // INT-T012: deleteTodo → 正常系（論理削除）
    it("INT-T012: deleteTodo sets isDeleted to true", async () => {
        const event = await createTestEvent();
        const createResult = await createTodo(event.eventId, createTodoFormData());
        expect(createResult.success).toBe(true);

        const todoId = createResult.success ? createResult.data.id : 0;
        const result = await deleteTodo(todoId);
        expect(result.success).toBe(true);

        const todo = await testPrisma.eventTodo.findUnique({
            where: { id: todoId },
        });
        expect(todo?.isDeleted).toBe(true);
    });

    // INT-T013: deleteTodo → 存在しないID
    it("INT-T013: deleteTodo with non-existent ID returns error", async () => {
        const result = await deleteTodo(999999);
        expect(result.success).toBe(false);
    });
});
