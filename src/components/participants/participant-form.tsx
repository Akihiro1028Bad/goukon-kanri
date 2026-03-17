"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";

import { participantFormSchema } from "@/lib/validations";
import {
    createParticipant,
    updateParticipant,
} from "@/actions/participant-actions";
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
import { GENDER_LABELS, PAYMENT_STATUS_LABELS } from "@/types";

type ParticipantFormValues = z.input<typeof participantFormSchema>;

type Props = {
    eventId: string;
    defaultValues?: ParticipantFormValues & { id: number };
    onSuccess?: () => void;
};

export function ParticipantForm({ eventId, defaultValues, onSuccess }: Props) {
    const router = useRouter();
    const isEdit = !!defaultValues;

    const form = useForm<ParticipantFormValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(participantFormSchema) as any,
        defaultValues: defaultValues
            ? {
                name: defaultValues.name,
                gender: defaultValues.gender,
                fee: defaultValues.fee,
                paymentStatus: defaultValues.paymentStatus,
                paymentDate: defaultValues.paymentDate ?? undefined,
                paymentConfirmedBy: defaultValues.paymentConfirmedBy ?? undefined,
                memo: defaultValues.memo ?? undefined,
            }
            : {
                paymentStatus: "UNPAID",
                fee: 0,
            },
    });

    async function onSubmit(values: ParticipantFormValues) {
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
            ? await updateParticipant(defaultValues!.id, formData)
            : await createParticipant(eventId, formData);

        if (result.success) {
            toast.success(isEdit ? "参加者を更新しました" : "参加者を登録しました");
            form.reset();
            if (onSuccess) {
                onSuccess();
            } else {
                router.refresh();
            }
        } else {
            toast.error(result.error);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 氏名 */}
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>氏名 *</FormLabel>
                                <FormControl>
                                    <Input placeholder="例: 山田太郎" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* 性別 */}
                    <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>性別 *</FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="性別を選択">
                                                {field.value ? GENDER_LABELS[field.value as keyof typeof GENDER_LABELS] : undefined}
                                            </SelectValue>
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {Object.entries(GENDER_LABELS).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* 参加費 */}
                    <FormField
                        control={form.control}
                        name="fee"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>参加費（円） *</FormLabel>
                                <FormControl>
                                    <Input type="number" min={0} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* 決済状況 */}
                    <FormField
                        control={form.control}
                        name="paymentStatus"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>決済状況</FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="決済状況">
                                                {field.value ? PAYMENT_STATUS_LABELS[field.value as keyof typeof PAYMENT_STATUS_LABELS] : undefined}
                                            </SelectValue>
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {Object.entries(PAYMENT_STATUS_LABELS).map(
                                            ([key, label]) => (
                                                <SelectItem key={key} value={key}>
                                                    {label}
                                                </SelectItem>
                                            )
                                        )}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* 決済日 */}
                    <FormField
                        control={form.control}
                        name="paymentDate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>決済日</FormLabel>
                                <FormControl>
                                    <Input
                                        type="date"
                                        {...field}
                                        value={
                                            field.value instanceof Date
                                                ? field.value.toISOString().split("T")[0]
                                                : field.value ?? ""
                                        }
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* 決済確認者 */}
                    <FormField
                        control={form.control}
                        name="paymentConfirmedBy"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>決済確認者</FormLabel>
                                <FormControl>
                                    <Input placeholder="例: 山田" {...field} value={field.value ?? ""} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* メモ */}
                <FormField
                    control={form.control}
                    name="memo"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>メモ</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="メモ（任意）"
                                    rows={2}
                                    {...field}
                                    value={field.value ?? ""}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex gap-2">
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting
                            ? "保存中..."
                            : isEdit
                                ? "更新"
                                : "登録"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
