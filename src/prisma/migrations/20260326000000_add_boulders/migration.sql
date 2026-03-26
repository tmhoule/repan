-- Add boulder status
ALTER TYPE "TaskStatus" ADD VALUE 'boulder';

-- Add time allocation field for boulders
ALTER TABLE "tasks" ADD COLUMN "time_allocation" INTEGER NOT NULL DEFAULT 0;
