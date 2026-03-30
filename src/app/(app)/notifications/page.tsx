import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const dynamic = "force-dynamic"

export default async function NotificationsPage() {
  await requireCurrentAppUser()

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader className="gap-3 border-b border-border/60 bg-gradient-to-br from-primary/12 via-transparent to-transparent">
          <Badge className="w-fit rounded-full bg-primary/15 px-3 py-1 text-primary hover:bg-primary/15">
            Notifications
          </Badge>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Notification center scaffold is in place for the authenticated app.
          </CardTitle>
          <CardDescription className="max-w-3xl leading-6">
            In-app notifications are still pending as a full module, but this
            route is now part of the protected workspace so the user shell does
            not contain dead links.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="rounded-2xl border border-dashed border-border/70 bg-background/80 p-6 text-sm leading-6 text-muted-foreground">
            Notification feeds, unread state, and workflow-triggered alerts will
            be implemented after the workflow and reply modules are wired.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
