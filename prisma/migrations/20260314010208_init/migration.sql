-- CreateEnum
CREATE TYPE "event_status" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('PAID', 'UNPAID');

-- CreateTable
CREATE TABLE "events" (
    "id" SERIAL NOT NULL,
    "event_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "start_time" TEXT NOT NULL,
    "venue_name" TEXT NOT NULL,
    "map_url" TEXT,
    "organizer" TEXT,
    "area" TEXT NOT NULL,
    "male_capacity" INTEGER NOT NULL,
    "female_capacity" INTEGER NOT NULL,
    "male_fee" INTEGER NOT NULL,
    "female_fee" INTEGER NOT NULL,
    "theme" TEXT,
    "target_occupation" TEXT,
    "status" "event_status" NOT NULL DEFAULT 'SCHEDULED',
    "venue_cost" INTEGER NOT NULL DEFAULT 0,
    "match_count" INTEGER NOT NULL DEFAULT 0,
    "expected_cashback" INTEGER NOT NULL DEFAULT 0,
    "actual_cashback" INTEGER NOT NULL DEFAULT 0,
    "memo" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participants" (
    "id" SERIAL NOT NULL,
    "event_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" "gender" NOT NULL,
    "fee" INTEGER NOT NULL,
    "payment_status" "payment_status" NOT NULL DEFAULT 'UNPAID',
    "payment_date" DATE,
    "payment_confirmed_by" TEXT,
    "memo" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "events_event_id_key" ON "events"("event_id");

-- CreateIndex
CREATE INDEX "events_date_status_idx" ON "events"("date", "status");

-- CreateIndex
CREATE INDEX "participants_event_id_idx" ON "participants"("event_id");

-- CreateIndex
CREATE INDEX "participants_name_idx" ON "participants"("name");

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("event_id") ON DELETE RESTRICT ON UPDATE CASCADE;
