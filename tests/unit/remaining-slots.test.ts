import { describe, expect, it } from "vitest";
import { formatRemainingSlot } from "@/lib/remaining-slots";

describe("formatRemainingSlot", () => {
  it("正数の残枠は『あとN名』を返す", () => {
    expect(formatRemainingSlot(3)).toBe("あと3名");
  });

  it("残枠0は『満席』を返す", () => {
    expect(formatRemainingSlot(0)).toBe("満席");
  });

  it("残枠が負数でも『満席』を返す", () => {
    expect(formatRemainingSlot(-2)).toBe("満席");
  });
});
