"use server"

import { revalidatePath } from "next/cache"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { markNotificationRead } from "@/server/services/notifications/notification-service"

export async function markNotificationReadAction(formData: FormData) {
  const user = await requireCurrentAppUser()

  await markNotificationRead({
    notificationId: String(formData.get("notificationId") ?? ""),
    userId: user.id,
  })

  revalidatePath("/notifications")
}
