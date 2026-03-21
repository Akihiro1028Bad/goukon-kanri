"use client";

import { useState, useTransition, useOptimistic } from "react";
import type { EventTodo } from "@prisma/client";
import { createTodo, toggleTodo, deleteTodo } from "@/actions/todo-actions";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  eventId: string;
  todos: EventTodo[];
};

function TodoItem({ todo }: { todo: EventTodo }) {
  const [isPending, startTransition] = useTransition();
  const [optimisticCompleted, setOptimisticCompleted] = useOptimistic(
    todo.isCompleted
  );

  function handleToggle() {
    startTransition(async () => {
      setOptimisticCompleted(!optimisticCompleted);
      const result = await toggleTodo(todo.id);
      if (!result.success) {
        toast.error(result.error);
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteTodo(todo.id);
      if (result.success) {
        toast.success("TODOを削除しました");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex items-center gap-3 py-2 group">
      <Checkbox
        checked={optimisticCompleted}
        onCheckedChange={handleToggle}
        disabled={isPending}
        className={isPending ? "opacity-50" : ""}
      />
      <span
        className={`flex-1 text-sm ${
          optimisticCompleted
            ? "line-through text-muted-foreground"
            : ""
        }`}
      >
        {todo.title}
      </span>
      {todo.memo && (
        <span className="text-xs text-muted-foreground truncate max-w-[150px]">
          {todo.memo}
        </span>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        disabled={isPending}
        className="text-xs text-destructive opacity-0 group-hover:opacity-100 transition-opacity h-7"
      >
        削除
      </Button>
    </div>
  );
}

function AddTodoForm({ eventId }: { eventId: string }) {
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const formData = new FormData();
    formData.set("title", title.trim());

    startTransition(async () => {
      const result = await createTodo(eventId, formData);
      if (result.success) {
        setTitle("");
        toast.success("TODOを追加しました");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="新しいTODOを追加..."
        className="flex-1 h-9 text-sm"
        disabled={isPending}
      />
      <Button
        type="submit"
        size="sm"
        disabled={isPending || !title.trim()}
        className="h-9"
      >
        追加
      </Button>
    </form>
  );
}

export function EventTodoList({ eventId, todos }: Props) {
  const completedCount = todos.filter((t) => t.isCompleted).length;
  const totalCount = todos.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>TODO</CardTitle>
          {totalCount > 0 && (
            <span className="text-sm text-muted-foreground">
              {completedCount}/{totalCount} 完了
            </span>
          )}
        </div>
        {/* プログレスバー */}
        {totalCount > 0 && (
          <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {/* TODO一覧 */}
        {todos.length > 0 ? (
          <div className="divide-y">
            {todos.map((todo) => (
              <TodoItem key={todo.id} todo={todo} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-2">
            TODOはまだありません
          </p>
        )}

        {/* 追加フォーム */}
        <div className="pt-2">
          <AddTodoForm eventId={eventId} />
        </div>
      </CardContent>
    </Card>
  );
}
