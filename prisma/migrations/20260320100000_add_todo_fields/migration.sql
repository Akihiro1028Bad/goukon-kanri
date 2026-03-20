-- AlterTable: Add task tracking boolean columns to participants
ALTER TABLE "participants" ADD COLUMN "details_sent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "participants" ADD COLUMN "reminder_sent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "participants" ADD COLUMN "thank_you_sent" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: event_todos
CREATE TABLE "event_todos" (
    "id" SERIAL NOT NULL,
    "event_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "memo" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_todos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_todos_event_id_idx" ON "event_todos"("event_id");

-- AddForeignKey
ALTER TABLE "event_todos" ADD CONSTRAINT "event_todos_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("event_id") ON DELETE RESTRICT ON UPDATE CASCADE;
