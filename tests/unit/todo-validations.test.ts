import { describe, it, expect } from "vitest";
import { createTodoSchema, updateTodoSchema } from "@/lib/validations";

describe("createTodoSchema", () => {
  // VAL-T001: 有効なデータでパース成功
  it("VAL-T001: 有効なタイトルでパースに成功する", () => {
    const result = createTodoSchema.safeParse({ title: "会場予約" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("会場予約");
      expect(result.data.memo).toBeNull();
    }
  });

  // VAL-T002: タイトル未入力
  it("VAL-T002: タイトル未入力の場合、エラーになる", () => {
    const result = createTodoSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.issues.filter((i) =>
        i.path.includes("title")
      );
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toBe("タイトルは必須です");
    }
  });

  // VAL-T003: タイトル200文字超
  it("VAL-T003: タイトルが200文字超の場合、エラーになる", () => {
    const result = createTodoSchema.safeParse({ title: "あ".repeat(201) });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.issues.filter((i) =>
        i.path.includes("title")
      );
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toBe("200文字以内で入力してください");
    }
  });

  // VAL-T004: タイトル200文字ちょうど（境界値）
  it("VAL-T004: タイトル200文字ちょうどは許容される", () => {
    const result = createTodoSchema.safeParse({ title: "あ".repeat(200) });
    expect(result.success).toBe(true);
  });

  // VAL-T005: メモ付きで成功
  it("VAL-T005: メモ付きでパースに成功する", () => {
    const result = createTodoSchema.safeParse({
      title: "会場予約",
      memo: "電話で予約",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.memo).toBe("電話で予約");
    }
  });

  // VAL-T006: 空メモはnullに変換
  it("VAL-T006: メモが空文字の場合、nullに変換される", () => {
    const result = createTodoSchema.safeParse({ title: "会場予約", memo: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.memo).toBeNull();
    }
  });

  // VAL-T007: メモ500文字超
  it("VAL-T007: メモが500文字超の場合、エラーになる", () => {
    const result = createTodoSchema.safeParse({
      title: "会場予約",
      memo: "あ".repeat(501),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.issues.filter((i) =>
        i.path.includes("memo")
      );
      expect(errors.length).toBeGreaterThan(0);
    }
  });

  // VAL-T008: タイトルなし（フィールド自体が存在しない）
  it("VAL-T008: タイトルフィールドが存在しない場合、エラーになる", () => {
    const result = createTodoSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("updateTodoSchema", () => {
  // VAL-T009: 有効なデータで成功
  it("VAL-T009: 有効なタイトルでパースに成功する", () => {
    const result = updateTodoSchema.safeParse({ title: "会場変更" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("会場変更");
    }
  });

  // VAL-T010: タイトル空 → エラー
  it("VAL-T010: タイトル空文字の場合、エラーになる", () => {
    const result = updateTodoSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  // VAL-T011: 200文字超 → エラー
  it("VAL-T011: タイトルが200文字超の場合、エラーになる", () => {
    const result = updateTodoSchema.safeParse({ title: "あ".repeat(201) });
    expect(result.success).toBe(false);
  });
});
