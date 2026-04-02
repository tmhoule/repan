-- AlterTable: make created_by nullable so tasks survive user deletion
ALTER TABLE "tasks" ALTER COLUMN "created_by" DROP NOT NULL;

-- Update foreign key to SET NULL on delete
ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "tasks_created_by_fkey";
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
