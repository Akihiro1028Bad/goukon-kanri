"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";

import { eventFormSchema } from "@/lib/validations";
import { createEvent, updateEvent } from "@/actions/event-actions";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EVENT_STATUS_LABELS } from "@/types";

type EventFormValues = z.input<typeof eventFormSchema>;

type Props = {
  defaultValues?: EventFormValues & { eventId: string };
};

export function EventForm({ defaultValues }: Props) {
  const router = useRouter();
  const isEdit = !!defaultValues;

  const form = useForm<EventFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(eventFormSchema) as any,
    defaultValues: defaultValues
      ? {
        ...defaultValues,
        date: new Date(defaultValues.date),
      }
      : {
        status: "SCHEDULED",
        venueCost: 0,
        matchCount: 0,
        expectedCashback: 0,
        actualCashback: 0,
      },
  });

  async function onSubmit(values: EventFormValues) {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (value instanceof Date) {
          formData.append(key, value.toISOString().split("T")[0]);
        } else {
          formData.append(key, String(value));
        }
      }
    });

    const result = isEdit
      ? await updateEvent(defaultValues!.eventId, formData)
      : await createEvent(formData);

    if (result.success) {
      toast.success(isEdit ? "更新しました" : "登録しました");
      if (!isEdit && result.data) {
        router.push(`/events/${result.data}`);
      } else if (isEdit) {
        router.push(`/events/${defaultValues!.eventId}`);
      }
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>日付</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={
                      field.value
                        ? new Date(field.value).toISOString().split("T")[0]
                        : ""
                    }
                    onChange={(e) => field.onChange(new Date(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>開始時刻</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="venueName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>会場名</FormLabel>
              <FormControl>
                <Input placeholder="例: ダイニングバーABC" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="mapUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>マップURL（任意）</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="https://maps.google.com/..."
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="organizer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>担当者（任意）</FormLabel>
                <FormControl>
                  <Input
                    placeholder="例: 山田太郎"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="area"
            render={({ field }) => (
              <FormItem>
                <FormLabel>エリア</FormLabel>
                <FormControl>
                  <Input placeholder="例: 渋谷" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="maleCapacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>男性定員</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="femaleCapacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>女性定員</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="maleFee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>男性参加費（円）</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="femaleFee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>女性参加費（円）</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="theme"
            render={({ field }) => (
              <FormItem>
                <FormLabel>テーマ（任意）</FormLabel>
                <FormControl>
                  <Input
                    placeholder="例: アウトドア好き"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="targetOccupation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>対象職業（任意）</FormLabel>
                <FormControl>
                  <Input
                    placeholder="例: エンジニア"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>状態</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="状態を選択" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FormField
            control={form.control}
            name="venueCost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>会場費（円）</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="matchCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>マッチング件数</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="expectedCashback"
            render={({ field }) => (
              <FormItem>
                <FormLabel>予定CB（円）</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="actualCashback"
            render={({ field }) => (
              <FormItem>
                <FormLabel>実際CB（円）</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="memo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>メモ（任意）</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="備考を入力..."
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? "保存中..."
              : isEdit
                ? "更新"
                : "登録"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            キャンセル
          </Button>
        </div>
      </form>
    </Form>
  );
}
