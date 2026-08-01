import Link from "next/link"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { PERMISSIONS } from "@/lib/permissions/rbac"
import { requireUserHasAnyPermission } from "@/server/services/auth/page-access-service"
import { getTaskDashboard } from "@/server/services/tasks/task-dashboard-service"
import { RegisterPanel } from "@/components/app/register-panel"
import { RegisterWorkspace } from "@/components/app/register-workspace"
import { Badge } from "@/components/dtg/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dtg/card"

export const dynamic = "force-dynamic"

function QueueList({
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
    <div className="grid gap-2">
      <div className="text-soft flex items-center justify-between px-1 text-[10px] font-medium tracking-[0.08em] uppercase">
        <span>{title}</span>
        <span>{items.length}</span>
      </div>
      {items.length > 0 ? (
        items.map((item) => (
          <Link
            key={item.id}
            href={`/mdr?revisionId=${item.id}`}
            className="border-line bg-raise hover:border-accent flex items-center justify-between gap-3 rounded-[9px] border px-3 py-2.5 transition-colors"
          >
            <div className="min-w-0">
              <p className="font-medium">
                {item.document.dtgsaDocumentNumber} / Rev {item.revisionLabel}
              </p>
              <p className="text-soft truncate text-sm">
                {item.document.project.code} / {item.document.discipline.code} /{" "}
                {item.document.title}
              </p>
            </div>
            <Badge variant="outline">{item.workflowStatus}</Badge>
          </Link>
        ))
      ) : (
        <div className="border-line bg-raise text-soft rounded-[9px] border border-dashed p-6 text-sm leading-6">
          No items are waiting in this queue right now.
        </div>
      )}
    </div>
  )
}

export default async function TasksPage() {
  const user = await requireCurrentAppUser()
  requireUserHasAnyPermission(user, PERMISSIONS.dashboardView)

  const overview = await getTaskDashboard(user)

  return (
    <RegisterWorkspace
      eyebrow="My work"
      title="Tasks"
      description={`Open the next document action directly from ${user.fullName}'s consolidated queue.`}
      metrics={[
        { label: "My actions", value: overview.counts.myActions },
        { label: "Unread", value: overview.counts.unreadNotifications },
        { label: "Signatures", value: overview.counts.pendingSignatures },
        {
          label: "Recent events",
          value: overview.counts.recentSignatureEvents,
        },
      ]}
    >
      <RegisterPanel
        title="Action queue"
        description="Tasks are grouped by the workflow decision you can make now."
      >
        <div className="grid gap-5 xl:grid-cols-2">
          <QueueList title="Prepare" items={overview.preparationQueue} />
          <QueueList title="Review" items={overview.reviewQueue} />
          <QueueList title="Approve" items={overview.approvalQueue} />
          <QueueList title="DC check" items={overview.dcQueue} />
        </div>
      </RegisterPanel>

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
    </RegisterWorkspace>
  )
}
