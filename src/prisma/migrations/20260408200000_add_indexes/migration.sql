-- CreateIndex
CREATE INDEX "tasks_team_id_archived_at_status_idx" ON "tasks"("team_id", "archived_at", "status");

-- CreateIndex
CREATE INDEX "tasks_team_id_assigned_to_archived_at_idx" ON "tasks"("team_id", "assigned_to", "archived_at");

-- CreateIndex
CREATE INDEX "task_activities_task_id_timestamp_idx" ON "task_activities"("task_id", "timestamp");

-- CreateIndex
CREATE INDEX "notifications_user_id_task_id_type_created_at_idx" ON "notifications"("user_id", "task_id", "type", "created_at");

-- CreateIndex
CREATE INDEX "points_ledger_user_id_action_type_timestamp_idx" ON "points_ledger"("user_id", "action_type", "timestamp");
