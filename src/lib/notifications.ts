import { prisma } from "./db";
import { NotificationType } from "@prisma/client";

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  taskId?: string
) {
  return prisma.notification.create({
    data: { userId, type, title, message, taskId },
  });
}
