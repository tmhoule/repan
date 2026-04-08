-- CreateTable
CREATE TABLE "workload_snapshots" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "workload_score" INTEGER NOT NULL,
    "task_count" INTEGER NOT NULL,
    "boulder_allocation" INTEGER NOT NULL,
    "blocked_count" INTEGER NOT NULL,
    "high_count" INTEGER NOT NULL,
    "medium_count" INTEGER NOT NULL,
    "low_count" INTEGER NOT NULL,

    CONSTRAINT "workload_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workload_snapshots_user_id_team_id_date_key" ON "workload_snapshots"("user_id", "team_id", "date");

-- CreateIndex
CREATE INDEX "workload_snapshots_team_id_date_idx" ON "workload_snapshots"("team_id", "date");

-- AddForeignKey
ALTER TABLE "workload_snapshots" ADD CONSTRAINT "workload_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workload_snapshots" ADD CONSTRAINT "workload_snapshots_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
