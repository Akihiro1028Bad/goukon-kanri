import { describe, it, expect } from "vitest";
import {
  eventFormSchema,
  participantFormSchema,
  bulkPaymentSchema,
} from "@/lib/validations";

/** 全必須フィールドが揃った有効なイベントデータ */
const validEventData = {
  date: new Date("2025-06-15"),
  startTime: "19:00",
  venueName: "居酒屋テスト",
  area: "渋谷",
  maleCapacity: 5,
  femaleCapacity: 5,
  maleFee: 5000,
  femaleFee: 3000,
  status: "SCHEDULED" as const,
};

describe("eventFormSchema", () => {
  // VAL-E001: All required fields valid → success
  it("VAL-E001: 全必須フィールドが有効な場合、パースに成功する", () => {
    const result = eventFormSchema.safeParse(validEventData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.date).toEqual(new Date("2025-06-15"));
      expect(result.data.startTime).toBe("19:00");
      expect(result.data.venueName).toBe("居酒屋テスト");
      expect(result.data.area).toBe("渋谷");
      expect(result.data.maleCapacity).toBe(5);
      expect(result.data.femaleCapacity).toBe(5);
      expect(result.data.maleFee).toBe(5000);
      expect(result.data.femaleFee).toBe(3000);
      expect(result.data.status).toBe("SCHEDULED");
    }
  });

  // VAL-E002: Missing date → error
  it("VAL-E002: dateが未指定の場合、エラーになる", () => {
    const { date: _date, ...data } = validEventData;
    const result = eventFormSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const dateErrors = result.error.issues.filter((i) => i.path.includes("date"));
      expect(dateErrors.length).toBeGreaterThan(0);
    }
  });

  // VAL-E003: Missing startTime → error
  it("VAL-E003: startTimeが未指定の場合、エラーになる", () => {
    const { startTime: _startTime, ...data } = validEventData;
    const result = eventFormSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.issues.filter((i) => i.path.includes("startTime"));
      expect(errors.length).toBeGreaterThan(0);
    }
  });

  // VAL-E004: Invalid startTime format (not HH:MM) → error
  it("VAL-E004: startTimeがHH:MM形式でない場合、エラーになる", () => {
    const data = { ...validEventData, startTime: "7pm" };
    const result = eventFormSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.issues.filter((i) => i.path.includes("startTime"));
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toBe("HH:MM形式で入力してください");
    }
  });

  // VAL-E005: Missing venueName → error
  it("VAL-E005: venueNameが未指定の場合、エラーになる", () => {
    const data = { ...validEventData, venueName: "" };
    const result = eventFormSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.issues.filter((i) => i.path.includes("venueName"));
      expect(errors.length).toBeGreaterThan(0);
    }
  });

  // VAL-E006: venueName over 100 chars → error
  it("VAL-E006: venueNameが100文字を超える場合、エラーになる", () => {
    const data = { ...validEventData, venueName: "あ".repeat(101) };
    const result = eventFormSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.issues.filter((i) => i.path.includes("venueName"));
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toBe("100文字以内で入力してください");
    }
  });

  // VAL-E007: Missing area → error
  it("VAL-E007: areaが未指定の場合、エラーになる", () => {
    const data = { ...validEventData, area: "" };
    const result = eventFormSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.issues.filter((i) => i.path.includes("area"));
      expect(errors.length).toBeGreaterThan(0);
    }
  });

  // VAL-E008: Negative maleCapacity → error
  it("VAL-E008: maleCapacityが負の値の場合、エラーになる", () => {
    const data = { ...validEventData, maleCapacity: -1 };
    const result = eventFormSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.issues.filter((i) => i.path.includes("maleCapacity"));
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toBe("0以上の整数を入力してください");
    }
  });

  // VAL-E009: Negative maleFee → error
  it("VAL-E009: maleFeeが負の値の場合、エラーになる", () => {
    const data = { ...validEventData, maleFee: -500 };
    const result = eventFormSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.issues.filter((i) => i.path.includes("maleFee"));
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toBe("0以上の金額を入力してください");
    }
  });

  // VAL-E010: Invalid mapUrl → error
  it("VAL-E010: mapUrlが不正なURLの場合、エラーになる", () => {
    const data = { ...validEventData, mapUrl: "not-a-url" };
    const result = eventFormSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.issues.filter((i) => i.path.includes("mapUrl"));
      expect(errors.length).toBeGreaterThan(0);
    }
  });

  // VAL-E011: Empty mapUrl transforms to null
  it("VAL-E011: mapUrlが空文字の場合、nullに変換される", () => {
    const data = { ...validEventData, mapUrl: "" };
    const result = eventFormSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mapUrl).toBeNull();
    }
  });

  // VAL-E012: Empty organizer transforms to null
  it("VAL-E012: organizerが空文字の場合、nullに変換される", () => {
    const data = { ...validEventData, organizer: "" };
    const result = eventFormSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.organizer).toBeNull();
    }
  });

  // VAL-E013: Empty theme transforms to null
  it("VAL-E013: themeが空文字の場合、nullに変換される", () => {
    const data = { ...validEventData, theme: "" };
    const result = eventFormSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.theme).toBeNull();
    }
  });

  // VAL-E014: Empty memo transforms to null
  it("VAL-E014: memoが空文字の場合、nullに変換される", () => {
    const data = { ...validEventData, memo: "" };
    const result = eventFormSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.memo).toBeNull();
    }
  });

  // VAL-E015: Valid status values (SCHEDULED, COMPLETED, CANCELLED)
  it("VAL-E015: 有効なstatus値（SCHEDULED, COMPLETED, CANCELLED）が受け入れられる", () => {
    for (const status of ["SCHEDULED", "COMPLETED", "CANCELLED"] as const) {
      const data = { ...validEventData, status };
      const result = eventFormSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe(status);
      }
    }
  });

  // VAL-E016: Invalid status → error
  it("VAL-E016: 無効なstatus値の場合、エラーになる", () => {
    const data = { ...validEventData, status: "INVALID_STATUS" };
    const result = eventFormSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.issues.filter((i) => i.path.includes("status"));
      expect(errors.length).toBeGreaterThan(0);
    }
  });

  // VAL-E017: Default values (venueCost=0, matchCount=0, etc.)
  it("VAL-E017: venueCost, matchCount, expectedCashback, actualCashbackの未指定時にデフォルト値0が適用される", () => {
    const result = eventFormSchema.safeParse(validEventData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.venueCost).toBe(0);
      expect(result.data.matchCount).toBe(0);
      expect(result.data.expectedCashback).toBe(0);
      expect(result.data.actualCashback).toBe(0);
    }
  });
});

/** 有効な参加者データ */
const validParticipantData = {
  name: "テスト太郎",
  gender: "MALE" as const,
  fee: 6000,
};

describe("participantFormSchema", () => {
  // VAL-P001: 全必須フィールド入力OK
  it("VAL-P001: 全必須フィールドが有効な場合、パースに成功する", () => {
    const result = participantFormSchema.safeParse(validParticipantData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("テスト太郎");
      expect(result.data.gender).toBe("MALE");
      expect(result.data.fee).toBe(6000);
    }
  });

  // VAL-P002: 氏名未入力
  it("VAL-P002: 氏名未入力の場合、エラーになる", () => {
    const data = { ...validParticipantData, name: "" };
    const result = participantFormSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.issues.filter((i) => i.path.includes("name"));
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toBe("氏名は必須です");
    }
  });

  // VAL-P003: 氏名50文字超
  it("VAL-P003: 氏名50文字超の場合、エラーになる", () => {
    const data = { ...validParticipantData, name: "あ".repeat(51) };
    const result = participantFormSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.issues.filter((i) => i.path.includes("name"));
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toBe("50文字以内で入力してください");
    }
  });

  // VAL-P004: 性別不正値
  it("VAL-P004: 性別が不正値の場合、エラーになる", () => {
    const data = { ...validParticipantData, gender: "OTHER" };
    const result = participantFormSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  // VAL-P005: 性別 MALE / FEMALE
  it("VAL-P005: 性別がMALE/FEMALEの場合、パースに成功する", () => {
    for (const gender of ["MALE", "FEMALE"] as const) {
      const data = { ...validParticipantData, gender };
      const result = participantFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    }
  });

  // VAL-P006: 参加費が負数
  it("VAL-P006: 参加費が負数の場合、エラーになる", () => {
    const data = { ...validParticipantData, fee: -500 };
    const result = participantFormSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.issues.filter((i) => i.path.includes("fee"));
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toBe("0以上の金額を入力してください");
    }
  });

  // VAL-P007: 参加費0円（許容）
  it("VAL-P007: 参加費0円が許容される", () => {
    const data = { ...validParticipantData, fee: 0 };
    const result = participantFormSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fee).toBe(0);
    }
  });

  // VAL-P008: 決済状況デフォルト
  it("VAL-P008: 決済状況未指定時にUNPAIDがデフォルト適用される", () => {
    const result = participantFormSchema.safeParse(validParticipantData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.paymentStatus).toBe("UNPAID");
    }
  });

  // VAL-P009: 決済日が null（UNPAID時）
  it("VAL-P009: 決済日がnullの場合、パースに成功する", () => {
    const data = { ...validParticipantData, paymentDate: null };
    const result = participantFormSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  // VAL-P010: メモ500文字超
  it("VAL-P010: メモが500文字超の場合、エラーになる", () => {
    const data = { ...validParticipantData, memo: "あ".repeat(501) };
    const result = participantFormSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.issues.filter((i) => i.path.includes("memo"));
      expect(errors.length).toBeGreaterThan(0);
    }
  });
});

describe("bulkPaymentSchema", () => {
  // VAL-B001: 正常入力
  it("VAL-B001: 全入力が有効な場合、パースに成功する", () => {
    const data = {
      participantIds: [1, 2, 3],
      paymentDate: new Date("2025-06-15"),
      confirmedBy: "山田太郎",
    };
    const result = bulkPaymentSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  // VAL-B002: 参加者未選択
  it("VAL-B002: 参加者IDが空配列の場合、エラーになる", () => {
    const data = {
      participantIds: [],
      paymentDate: new Date("2025-06-15"),
      confirmedBy: "山田太郎",
    };
    const result = bulkPaymentSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.issues.filter((i) =>
        i.path.includes("participantIds")
      );
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toBe("1名以上選択してください");
    }
  });

  // VAL-B003: 決済日未入力
  it("VAL-B003: 決済日未入力の場合、エラーになる", () => {
    const data = {
      participantIds: [1],
      confirmedBy: "山田太郎",
    };
    const result = bulkPaymentSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  // VAL-B004: 確認者未入力
  it("VAL-B004: 確認者未入力の場合、エラーになる", () => {
    const data = {
      participantIds: [1],
      paymentDate: new Date("2025-06-15"),
      confirmedBy: "",
    };
    const result = bulkPaymentSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.issues.filter((i) =>
        i.path.includes("confirmedBy")
      );
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toBe("確認者名は必須です");
    }
  });
});
