"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { generateLineText } from "@/lib/line-text";
import { toast } from "sonner";

type Props = {
  event: {
    date: Date;
    startTime: string;
    area: string;
    venueName: string;
    maleCapacity: number;
    femaleCapacity: number;
    maleFee: number;
    femaleFee: number;
    theme: string | null;
    targetOccupation: string | null;
  };
  currentParticipants: {
    maleCount: number;
    femaleCount: number;
  };
  children: React.ReactNode;
};

export function LineTextDialog({ event, currentParticipants, children }: Props) {
  const [open, setOpen] = useState(false);
  const text = generateLineText(event, currentParticipants);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("クリップボードにコピーしました");
    } catch {
      // Fallback for environments without clipboard API
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      toast.success("クリップボードにコピーしました");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children as React.ReactElement}></DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>LINE 募集テキスト</DialogTitle>
        </DialogHeader>
        <pre className="whitespace-pre-wrap bg-muted p-4 rounded-md text-sm leading-relaxed">
          {text}
        </pre>
        <div className="flex justify-end">
          <Button onClick={handleCopy}>コピー</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
