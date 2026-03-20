"use client";

import { useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DeleteDialog } from "@/components/events/delete-dialog";
import { ParticipantTable } from "@/components/participants/participant-table";
import { ParticipantForm } from "@/components/participants/participant-form";
import { EVENT_STATUS_LABELS } from "@/types";
import type { EventDetail as EventDetailType } from "@/queries/event-queries";

const statusVariant = {
    SCHEDULED: "default",
    COMPLETED: "secondary",
    CANCELLED: "destructive",
} as const;

type Props = {
    event: EventDetailType;
};

/** 金額をカンマ区切りで表示 */
function formatYen(amount: number): string {
    return `¥${amount.toLocaleString()}`;
}

export function EventDetail({ event }: Props) {
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [showParticipantForm, setShowParticipantForm] = useState(false);

    return (
        <div className="space-y-6">
            {/* ヘッダー */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">イベント {event.eventId}</h1>
                    <Badge variant={statusVariant[event.status]} className="mt-2">
                        {EVENT_STATUS_LABELS[event.status]}
                    </Badge>
                </div>
                <div className="flex gap-2">
                    <Link
                        href={`/events/${event.eventId}/edit`}
                        className={buttonVariants({ variant: "outline" })}
                    >
                        編集
                    </Link>
                    <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                        削除
                    </Button>
                </div>
            </div>

            <Separator />

            {/* 基本情報 */}
            <Card>
                <CardHeader>
                    <CardTitle>基本情報</CardTitle>
                </CardHeader>
                <CardContent>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">日付</dt>
                            <dd className="mt-1">
                                {new Date(event.date).toLocaleDateString("ja-JP")}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">開始時刻</dt>
                            <dd className="mt-1">{event.startTime}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">会場名</dt>
                            <dd className="mt-1">
                                {event.mapUrl ? (
                                    <a
                                        href={event.mapUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline"
                                    >
                                        {event.venueName}
                                    </a>
                                ) : (
                                    event.venueName
                                )}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">エリア</dt>
                            <dd className="mt-1">{event.area}</dd>
                        </div>
                        {event.organizer && (
                            <div>
                                <dt className="text-sm font-medium text-muted-foreground">担当者</dt>
                                <dd className="mt-1">{event.organizer}</dd>
                            </div>
                        )}
                        {event.theme && (
                            <div>
                                <dt className="text-sm font-medium text-muted-foreground">テーマ</dt>
                                <dd className="mt-1">{event.theme}</dd>
                            </div>
                        )}
                        {event.targetOccupation && (
                            <div>
                                <dt className="text-sm font-medium text-muted-foreground">対象職業</dt>
                                <dd className="mt-1">{event.targetOccupation}</dd>
                            </div>
                        )}
                    </dl>
                </CardContent>
            </Card>

            {/* 定員・参加費 */}
            <Card>
                <CardHeader>
                    <CardTitle>定員・参加費</CardTitle>
                </CardHeader>
                <CardContent>
                    <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">男性定員</dt>
                            <dd className="mt-1">{event.maleCapacity}名</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">女性定員</dt>
                            <dd className="mt-1">{event.femaleCapacity}名</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">男性参加費</dt>
                            <dd className="mt-1">{formatYen(event.maleFee)}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">女性参加費</dt>
                            <dd className="mt-1">{formatYen(event.femaleFee)}</dd>
                        </div>
                    </dl>
                </CardContent>
            </Card>

            {/* 収支サマリー */}
            <Card>
                <CardHeader>
                    <CardTitle>収支サマリー</CardTitle>
                </CardHeader>
                <CardContent>
                    <dl className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">男性参加者</dt>
                            <dd className="mt-1 text-lg font-semibold">{event.financials.maleCount}名</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">女性参加者</dt>
                            <dd className="mt-1 text-lg font-semibold">{event.financials.femaleCount}名</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">決済済み</dt>
                            <dd className="mt-1 text-lg font-semibold">{event.financials.paidCount}名</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">未決済</dt>
                            <dd className="mt-1 text-lg font-semibold text-orange-600">{event.financials.unpaidCount}名</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">見込み収入</dt>
                            <dd className="mt-1 text-lg font-semibold">{formatYen(event.financials.expectedRevenue)}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">決済済み収入</dt>
                            <dd className="mt-1 text-lg font-semibold text-green-600">{formatYen(event.financials.paidRevenue)}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">未回収</dt>
                            <dd className="mt-1 text-lg font-semibold text-red-600">{formatYen(event.financials.uncollected)}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">見込み利益</dt>
                            <dd className="mt-1 text-lg font-semibold">{formatYen(event.financials.expectedProfit)}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">実現利益</dt>
                            <dd className="mt-1 text-lg font-semibold">{formatYen(event.financials.actualProfit)}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">見込み利益(CB込)</dt>
                            <dd className="mt-1 text-lg font-semibold">{formatYen(event.financials.expectedProfitWithCb)}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">実現利益(CB込)</dt>
                            <dd className="mt-1 text-lg font-semibold">{formatYen(event.financials.actualProfitWithCb)}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">利益率</dt>
                            <dd className="mt-1 text-lg font-semibold">
                                {event.financials.profitRate !== null
                                    ? `${event.financials.profitRate.toFixed(1)}%`
                                    : "-"}
                            </dd>
                        </div>
                    </dl>
                </CardContent>
            </Card>

            {/* 運営情報 */}
            <Card>
                <CardHeader>
                    <CardTitle>運営情報</CardTitle>
                </CardHeader>
                <CardContent>
                    <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">会場費</dt>
                            <dd className="mt-1">{formatYen(event.venueCost)}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">予定CB</dt>
                            <dd className="mt-1">{formatYen(event.expectedCashback)}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">実際CB</dt>
                            <dd className="mt-1">{formatYen(event.actualCashback)}</dd>
                        </div>
                    </dl>
                </CardContent>
            </Card>

            {/* メモ */}
            {event.memo && (
                <Card>
                    <CardHeader>
                        <CardTitle>メモ</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="whitespace-pre-wrap">{event.memo}</p>
                    </CardContent>
                </Card>
            )}

            {/* 参加者一覧 */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>参加者一覧</CardTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowParticipantForm(!showParticipantForm)}
                        >
                            {showParticipantForm ? "フォームを閉じる" : "参加者追加"}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* 参加者追加フォーム */}
                    {showParticipantForm && (
                        <div className="border rounded-lg p-4 bg-muted/30">
                            <h3 className="text-sm font-medium mb-3">参加者を追加</h3>
                            <ParticipantForm
                                eventId={event.eventId}
                                onSuccess={() => setShowParticipantForm(false)}
                            />
                        </div>
                    )}

                    {/* 参加者テーブル */}
                    <ParticipantTable
                        participants={event.participants}
                        eventId={event.eventId}
                    />
                </CardContent>
            </Card>

            {/* 削除確認ダイアログ */}
            <DeleteDialog
                eventId={event.eventId}
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
            />
        </div>
    );
}
