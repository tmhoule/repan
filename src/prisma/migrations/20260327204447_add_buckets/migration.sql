-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "bucket_id" TEXT;

-- CreateTable
CREATE TABLE "buckets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color_key" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "team_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buckets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "buckets_name_team_id_key" ON "buckets"("name", "team_id");

-- AddForeignKey
ALTER TABLE "buckets" ADD CONSTRAINT "buckets_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "buckets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
