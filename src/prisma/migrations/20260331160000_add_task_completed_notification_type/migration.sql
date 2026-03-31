-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'task_completed' AFTER 'task_assigned';
