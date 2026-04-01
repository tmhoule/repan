-- AlterTable
ALTER TABLE "teams" ADD COLUMN "multiplier_blocked" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "teams" ADD COLUMN "multiplier_stalled" INTEGER NOT NULL DEFAULT 25;
