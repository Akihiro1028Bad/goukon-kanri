"use client";

import { useTransition, useOptimistic } from "react";
import { toggleParticipantTask } from "@/actions/participant-actions";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import type { ParticipantTaskType } from "@/types";

type Props = {
  participantId: number;
  taskType: ParticipantTaskType;
  currentValue: boolean;
};

export function TaskStatusCell({
  participantId,
  taskType,
  currentValue,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [optimisticValue, setOptimisticValue] = useOptimistic(currentValue);

  function handleToggle() {
    startTransition(async () => {
      setOptimisticValue(!optimisticValue);
      const result = await toggleParticipantTask(participantId, taskType);
      if (!result.success) {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex items-center justify-center">
      <Checkbox
        checked={optimisticValue}
        onCheckedChange={handleToggle}
        disabled={isPending}
        className={isPending ? "opacity-50" : ""}
      />
    </div>
  );
}
