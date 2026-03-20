import { z } from "zod";

/** イベント登録・編集フォーム用 */
export const eventFormSchema = z.object({
  date: z.coerce.date({ required_error: "日付は必須です" }),
  startTime: z
    .string()
    .min(1, "開始時刻は必須です")
    .regex(/^\d{2}:\d{2}$/, "HH:MM形式で入力してください"),
  venueName: z
    .string()
    .min(1, "会場名は必須です")
    .max(100, "100文字以内で入力してください"),
  mapUrl: z
    .union([z.string().url("正しいURLを入力してください"), z.literal("")])
    .optional()
    .transform((v) => v || null),
  organizer: z
    .string()
    .max(50)
    .optional()
    .transform((v) => v || null),
  area: z.string().min(1, "エリアは必須です"),
  maleCapacity: z.coerce
    .number()
    .int("整数で入力してください")
    .min(0, "0以上の整数を入力してください"),
  femaleCapacity: z.coerce
    .number()
    .int("整数で入力してください")
    .min(0, "0以上の整数を入力してください"),
  maleFee: z.coerce
    .number()
    .int("整数で入力してください")
    .min(0, "0以上の金額を入力してください"),
  femaleFee: z.coerce
    .number()
    .int("整数で入力してください")
    .min(0, "0以上の金額を入力してください"),
  theme: z
    .string()
    .max(100)
    .optional()
    .transform((v) => v || null),
  targetOccupation: z
    .string()
    .max(100)
    .optional()
    .transform((v) => v || null),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]),
  venueCost: z.coerce.number().int().min(0).default(0),
  expectedCashback: z.coerce.number().int().min(0).default(0),
  actualCashback: z.coerce.number().int().min(0).default(0),
  memo: z
    .string()
    .max(1000)
    .optional()
    .transform((v) => v || null),
});

/** 参加者登録・編集フォーム用 */
export const participantFormSchema = z.object({
  name: z
    .string()
    .min(1, "氏名は必須です")
    .max(50, "50文字以内で入力してください"),
  gender: z.enum(["MALE", "FEMALE"], {
    required_error: "性別を選択してください",
  }),
  fee: z.coerce
    .number()
    .int("整数で入力してください")
    .min(0, "0以上の金額を入力してください"),
  paymentStatus: z.enum(["PAID", "UNPAID"]).default("UNPAID"),
  paymentDate: z.coerce.date().optional().nullable(),
  paymentConfirmedBy: z
    .string()
    .max(50)
    .optional()
    .transform((v) => v || null),
  memo: z
    .string()
    .max(500)
    .optional()
    .transform((v) => v || null),
});

/** 一括決済更新用 */
export const bulkPaymentSchema = z.object({
  participantIds: z
    .array(z.number().int().positive())
    .min(1, "1名以上選択してください"),
  paymentDate: z.coerce.date({ required_error: "決済日は必須です" }),
  confirmedBy: z.string().min(1, "確認者名は必須です").max(50),
});
