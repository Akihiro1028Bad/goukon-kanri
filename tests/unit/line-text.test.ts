import { describe, it, expect } from "vitest";
import { generateLineText } from "@/lib/line-text";

const baseEvent = {
  date: new Date("2025-03-15"),
  startTime: "19:00",
  area: "渋谷",
  venueName: "ダイニングバーABC",
  maleCapacity: 5,
  femaleCapacity: 5,
  maleFee: 6000,
  femaleFee: 4000,
  theme: "春の出会い" as string | null,
  targetOccupation: "IT系" as string | null,
};

const baseParticipants = { maleCount: 2, femaleCount: 3 };

describe("generateLineText", () => {
  // LINE-001: 全フィールドが入力済み
  it("LINE-001: 全フィールド入力で固定順序のテキストが生成される", () => {
    const text = generateLineText(baseEvent, baseParticipants);

    expect(text).toContain("📅");
    expect(text).toContain("⏰");
    expect(text).toContain("📍");
    expect(text).toContain("👫");
    expect(text).toContain("💰");
    expect(text).toContain("🎯");
    expect(text).toContain("💼");
    expect(text).toContain("✅");
  });

  // LINE-002: 曜日の自動算出
  it("LINE-002: 2025-03-15が土曜日と表示される", () => {
    const text = generateLineText(baseEvent, baseParticipants);
    expect(text).toContain("土");
  });

  // LINE-003: 時間帯の表示
  it("LINE-003: startTimeが正しく表示される", () => {
    const text = generateLineText(baseEvent, baseParticipants);
    expect(text).toContain("19:00");
  });

  // LINE-004: 残枠の計算（男性）
  it("LINE-004: 男性の残枠が正しく計算される", () => {
    const text = generateLineText(baseEvent, baseParticipants);
    expect(text).toContain("男性あと3名");
  });

  // LINE-005: 残枠の計算（女性 — 満席）
  it("LINE-005: 女性定員と参加者数が同じ場合「満席」と表示される", () => {
    const text = generateLineText(baseEvent, { maleCount: 2, femaleCount: 5 });
    expect(text).toMatch(/女性満席/);
  });

  // LINE-006: テーマがnull
  it("LINE-006: テーマがnullの場合テーマ行が省略される", () => {
    const event = { ...baseEvent, theme: null };
    const text = generateLineText(event, baseParticipants);
    expect(text).not.toContain("🎯");
  });

  // LINE-007: 対象職業がnull
  it("LINE-007: 対象職業がnullの場合職業行が省略される", () => {
    const event = { ...baseEvent, targetOccupation: null };
    const text = generateLineText(event, baseParticipants);
    expect(text).not.toContain("💼");
  });

  // LINE-008: 金額のカンマ区切り
  it("LINE-008: 金額がカンマ区切りで表示される", () => {
    const event = { ...baseEvent, maleFee: 10000 };
    const text = generateLineText(event, baseParticipants);
    expect(text).toContain("10,000");
  });

  // LINE-009: 項目の順序が固定
  it("LINE-009: 項目が固定順序で出力される", () => {
    const text = generateLineText(baseEvent, baseParticipants);
    const lines = text.split("\n");

    expect(lines[0]).toMatch(/^📅/);
    expect(lines[1]).toMatch(/^⏰/);
    expect(lines[2]).toMatch(/^📍/);
    expect(lines[3]).toMatch(/^👫/);
    expect(lines[4]).toMatch(/^💰/);
    expect(lines[5]).toMatch(/^🎯/);
    expect(lines[6]).toMatch(/^💼/);
    expect(lines[7]).toMatch(/^✅/);
  });

  // LINE-010: 参加費0円
  it("LINE-010: 参加費0円が正しく表示される", () => {
    const event = { ...baseEvent, maleFee: 0 };
    const text = generateLineText(event, baseParticipants);
    expect(text).toContain("0円");
  });

  // LINE-011: 定員超過（残枠が負の値）
  it("LINE-011: 定員超過の場合「満席」と表示される", () => {
    const text = generateLineText(baseEvent, { maleCount: 7, femaleCount: 3 });
    expect(text).toContain("男性満席");
  });
});
