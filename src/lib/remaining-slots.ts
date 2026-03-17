/**
 * 残枠数を募集表示用の文言に変換する。
 * 正数は「あとN名」、0以下は「満席」とする。
 */
export function formatRemainingSlot(remaining: number): string {
  return remaining > 0 ? `あと${remaining}名` : "満席";
}
