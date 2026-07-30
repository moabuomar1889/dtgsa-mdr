import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { getTaskDashboard } from "@/server/services/tasks/task-dashboard-service"
import { Badge } from "@/components/dtg/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dtg/card"

export const dynamic = "force-dynamic"

function QueueCard({
  title,
  items,
}: {
  title: string
  items: Array<{
    id: string
    revisionLabel: string
    workflowStatus: string
    document: {
      dtgsaDocumentNumber: string
      title: string
      project: {
        code: string
        name: string
      }
      discipline: {
        code: string
      }
    }
  }>
}) {
  return (
    <Card className="border-line bg-panel">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className="border-line bg-raise rounded-[9px] border p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {item.document.dtgsaDocumentNumber} / Rev{" "}
                    {item.revisionLabel}
                  </p>
                  <p className="text-soft text-sm">
                    {item.document.project.code} /{" "}
                    {item.document.discipline.code} / {item.document.title}
                  </p>
                </div>
                <Badge variant="outline">{item.workflowStatus}</Badge>
              </div>
            </div>
          ))
        ) : (
          <div className="border-line bg-raise text-soft rounded-[9px] border border-dashed p-6 text-sm leading-6">
            No items are waiting in this queue right now.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default async function TasksPage() {
  const user = await requireCurrentAppUser()
  const overview = await getTaskDashboard(user)

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-5">
      <Card className="border-line bg-panel">
        <CardHeader className="border-line bg-head gap-2 border-b">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-accent-bg text-accent-txt hover:bg-accent-bg rounded-[4px] px-1.5 py-0.5">
              Task Dashboard
            </Badge>
            <Badge variant="outline">{user.fullName}</Badge>
          </div>
          <CardTitle className="text-[22px] font-medium tracking-[-0.02em]">
            Your preparation, review, approval, DC, and notification workload is
            now visible in one queue view.
          </CardTitle>
          <CardDescription className="max-w-3xl leading-6">
            This dashboard combines workflow actions waiting on your roles with
            unread platform notifications and recent signature activity.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-4 sm:grid-cols-4">
          <div className="border-line bg-raise rounded-[9px] border p-4">
            <p className="text-soft text-sm">My actions</p>
            <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.03em]">
              {overview.counts.myActions}
            </p>
          </div>
          <div className="border-line bg-raise rounded-[9px] border p-4">
            <p className="text-soft text-sm">Unread notifications</p>
            <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.03em]">
              {overview.counts.unreadNotifications}
            </p>
          </div>
          <div className="border-line bg-raise rounded-[9px] border p-4">
            <p className="text-soft text-sm">Pending signatures</p>
            <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.03em]">
              {overview.counts.pendingSignatures}
            </p>
          </div>
          <div className="border-line bg-raise rounded-[9px] border p-4">
            <p className="text-soft text-sm">Recent signature events</p>
            <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.03em]">
              {overview.counts.recentSignatureEvents}
            </p>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-2">
        <QueueCard
          title="Preparation queue"
          items={overview.preparationQueue}
        />
        <QueueCard title="Review queue" items={overview.reviewQueue} />
        <QueueCard title="Approval queue" items={overview.approvalQueue} />
        <QueueCard title="DC queue" items={overview.dcQueue} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-line bg-panel">
          <CardHeader>
            <CardTitle className="text-lg">Unread notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.unreadNotifications.length > 0 ? (
              overview.unreadNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="border-line bg-raise rounded-[9px] border p-4"
                >
                  <p className="font-medium">{notification.title}</p>
                  <p className="text-soft mt-1 text-sm">{notification.body}</p>
                </div>
              ))
            ) : (
              <div className="border-line bg-raise text-soft rounded-[9px] border border-dashed p-6 text-sm leading-6">
                No unread notifications right now.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-line bg-panel">
          <CardHeader>
            <CardTitle className="text-lg">Discipline load</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.disciplineLoad.length > 0 ? (
              overview.disciplineLoad.map((discipline) => (
                <div
                  key={discipline.disciplineCode}
                  className="border-line bg-raise rounded-[9px] border p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{discipline.disciplineName}</p>
                    <Badge variant="outline">{discipline.count}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="border-line bg-raise text-soft rounded-[9px] border border-dashed p-6 text-sm leading-6">
                Discipline workload will appear here as your queues grow.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
