import { describe, it, expect } from "vitest";
import {
  PARTICIPANT_TASK_LABELS,
  type ParticipantTaskType,
} from "@/types";

describe("ParticipantTaskType & Labels", () => {
  // TYPE-T001: 全3種のタスクタイプにラベルが存在する
  it("TYPE-T001: 全3種のタスクタイプにラベルが存在する", () => {
    const taskTypes: ParticipantTaskType[] = [
      "detailsSent",
      "reminderSent",
      "thankYouSent",
    ];
    for (const taskType of taskTypes) {
      expect(PARTICIPANT_TASK_LABELS[taskType]).toBeDefined();
      expect(typeof PARTICIPANT_TASK_LABELS[taskType]).toBe("string");
      expect(PARTICIPANT_TASK_LABELS[taskType].length).toBeGreaterThan(0);
    }
  });

  // TYPE-T002: ラベルの具体値を検証
  it("TYPE-T002: ラベルの具体値が正しい", () => {
    expect(PARTICIPANT_TASK_LABELS.detailsSent).toBe("詳細送信");
    expect(PARTICIPANT_TASK_LABELS.reminderSent).toBe("リマインド送信");
    expect(PARTICIPANT_TASK_LABELS.thankYouSent).toBe("お礼LINE送信");
  });

  // TYPE-T003: ラベルオブジェクトのキー数が3つ
  it("TYPE-T003: ラベルオブジェクトのキー数が3つ", () => {
    expect(Object.keys(PARTICIPANT_TASK_LABELS)).toHaveLength(3);
  });
});
