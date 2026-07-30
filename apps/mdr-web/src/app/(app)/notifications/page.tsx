import { NotificationStatus } from "@prisma/client"
import { markNotificationReadAction } from "@/server/actions/notifications"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { getNotificationsForUser } from "@/server/services/notifications/notification-service"
import { SubmitButton } from "@/components/app/submit-button"
import { Badge } from "@/components/dtg/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dtg/card"

export const dynamic = "force-dynamic"

function notificationStatusVariant(status: NotificationStatus) {
  switch (status) {
    case NotificationStatus.Read:
      return "outline" as const
    case NotificationStatus.Failed:
      return "destructive" as const
    default:
      return "default" as const
  }
}

export default async function NotificationsPage() {
  const user = await requireCurrentAppUser()
  const feed = await getNotificationsForUser(user.id)

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-5">
      <Card className="border-line bg-panel">
        <CardHeader className="border-line bg-head gap-2 border-b">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-accent-bg text-accent-txt hover:bg-accent-bg rounded-[4px] px-1.5 py-0.5">
              Notifications
            </Badge>
            <Badge variant="outline">{feed.unreadCount} unread</Badge>
          </div>
          <CardTitle className="text-[22px] font-medium tracking-[-0.02em]">
            Workflow, transmittal, and client-reply alerts now flow into the
            authenticated notification center.
          </CardTitle>
          <CardDescription className="max-w-3xl leading-6">
            This feed currently focuses on in-app operational notifications.
            Email delivery remains dependent on provider configuration, but the
            business events are now recorded and surfaced here immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 pt-4">
          {feed.notifications.length > 0 ? (
            feed.notifications.map((notification) => (
              <div
                key={notification.id}
                className="border-line bg-raise rounded-[9px] border p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{notification.title}</p>
                      <Badge
                        variant={notificationStatusVariant(notification.status)}
                      >
                        {notification.status}
                      </Badge>
                    </div>
                    <p className="text-soft text-sm leading-6">
                      {notification.body}
                    </p>
                    <div className="text-soft flex flex-wrap gap-3 text-xs">
                      <span>
                        {notification.createdAt.toLocaleString("en-US")}
                      </span>
                      {notification.project ? (
                        <span>
                          {notification.project.code} -{" "}
                          {notification.project.name}
                        </span>
                      ) : null}
                      {notification.client ? (
                        <span>
                          {notification.client.code} -{" "}
                          {notification.client.name}
                        </span>
                      ) : null}
                      {notification.actionUrl ? (
                        <span>Action: {notification.actionUrl}</span>
                      ) : null}
                    </div>
                  </div>
                  {notification.status !== NotificationStatus.Read ? (
                    <form action={markNotificationReadAction}>
                      <input
                        type="hidden"
                        name="notificationId"
                        value={notification.id}
                      />
                      <SubmitButton label="Mark read" pendingLabel="Updating" />
                    </form>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="border-line bg-raise text-soft rounded-[9px] border border-dashed p-6 text-sm leading-6">
              No notifications have been generated yet for this account.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
