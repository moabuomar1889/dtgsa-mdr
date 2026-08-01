import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  ArrowRightIcon,
  BellIcon,
  ClipboardCheckIcon,
  FileCheck2Icon,
  FileInputIcon,
  FilesIcon,
  InboxIcon,
  ListTodoIcon,
  SendIcon,
} from "lucide-react"
import { PERMISSIONS, type PermissionCode } from "@/lib/permissions/rbac"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { getUserPermissions } from "@/server/services/auth/permission-service"
import { getDashboardOverview } from "@/server/services/dashboard/dashboard-overview"
import { getTaskDashboard } from "@/server/services/tasks/task-dashboard-service"
import { Badge } from "@/components/dtg/badge"
import { Button } from "@/components/dtg/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/dtg/card"

export const dynamic = "force-dynamic"

type WorkspaceAction = {
  title: string
  detail: string
  href: string
  icon: LucideIcon
  permissions?: PermissionCode[]
}

const workspaceActions: WorkspaceAction[] = [
  {
    title: "My tasks",
    detail: "Review work assigned to your role",
    href: "/tasks",
    icon: ListTodoIcon,
  },
  {
    title: "PDI register",
    detail: "Register and reconcile project documents",
    href: "/pdi",
    icon: FileInputIcon,
    permissions: [PERMISSIONS.pdiManage, PERMISSIONS.pdiCollaborate],
  },
  {
    title: "MDR workspace",
    detail: "Prepare revisions and move work forward",
    href: "/mdr",
    icon: FilesIcon,
    permissions: [
      PERMISSIONS.mdrManage,
      PERMISSIONS.workflowPrepare,
      PERMISSIONS.workflowReview,
      PERMISSIONS.workflowApprove,
      PERMISSIONS.dcCheck,
    ],
  },
  {
    title: "Transmittals",
    detail: "Package and issue approved documents",
    href: "/transmittals",
    icon: SendIcon,
    permissions: [PERMISSIONS.transmittalsManage],
  },
  {
    title: "Client replies",
    detail: "Record responses and close the loop",
    href: "/replies",
    icon: InboxIcon,
    permissions: [PERMISSIONS.clientRepliesManage],
  },
]

export default async function DashboardPage() {
  const user = await requireCurrentAppUser()
  const [overview, tasks] = await Promise.all([
    getDashboardOverview(),
    getTaskDashboard(user),
  ])
  const permissions = new Set(getUserPermissions(user))
  const availableActions = workspaceActions.filter(
    (action) =>
      !action.permissions ||
      action.permissions.some((permission) => permissions.has(permission))
  )
  const firstName = user.fullName.trim().split(/\s+/)[0] ?? user.fullName
  const nextItems = [
    ...tasks.preparationQueue.map((item) => ({ item, queue: "Prepare" })),
    ...tasks.reviewQueue.map((item) => ({ item, queue: "Review" })),
    ...tasks.approvalQueue.map((item) => ({ item, queue: "Approve" })),
    ...tasks.dcQueue.map((item) => ({ item, queue: "DC check" })),
  ].slice(0, 5)

  const pipeline = [
    {
      label: "Waiting for client number",
      value: overview.pendingPdiCount,
      href: "/pdi",
      icon: FileInputIcon,
    },
    {
      label: "Ready to issue",
      value: overview.readyToSubmitCount,
      href: "/mdr",
      icon: FileCheck2Icon,
    },
    {
      label: "Transmittals ready",
      value: overview.readyTransmittalCount,
      href: "/transmittals",
      icon: SendIcon,
    },
    {
      label: "Waiting for client reply",
      value: overview.pendingReplyCount,
      href: "/replies",
      icon: InboxIcon,
    },
  ]

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-5">
      <section className="border-line bg-head relative overflow-hidden rounded-[12px] border px-5 py-6 md:px-7 md:py-7">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-70"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(circle at 80% 20%, var(--accent-bg), transparent 55%)",
          }}
        />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-accent-bg text-accent-txt hover:bg-accent-bg rounded-[4px] px-1.5 py-0.5">
                My workspace
              </Badge>
              <Badge variant="outline">
                {tasks.counts.myActions === 0
                  ? "No actions waiting"
                  : `${tasks.counts.myActions} actions waiting`}
              </Badge>
            </div>
            <h1 className="mt-4 text-[26px] font-medium tracking-[-0.035em] md:text-[32px]">
              Welcome back, {firstName}.
            </h1>
            <p className="text-soft mt-2 max-w-2xl text-[13px] leading-6">
              Start with work assigned to you, or jump directly into the next
              document control step available to your role.
            </p>
          </div>
          <Button asChild size="lg" className="w-fit gap-2">
            <Link href="/tasks">
              Open my task queue
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-line bg-panel">
          <CardHeader className="grid grid-cols-[1fr_auto] items-center">
            <div>
              <p className="text-dim font-mono text-[9.5px] tracking-[0.11em] uppercase">
                Priority
              </p>
              <CardTitle className="mt-1 text-[16px]">
                My next actions
              </CardTitle>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/tasks">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {nextItems.length > 0 ? (
              <div className="divide-line divide-y">
                {nextItems.map(({ item, queue }) => (
                  <Link
                    key={`${queue}-${item.id}`}
                    href="/tasks"
                    className="hover:bg-accent-bg2 group flex items-center gap-3 px-3.5 py-3 transition-colors"
                  >
                    <span className="border-line bg-raise text-accent-txt flex size-9 shrink-0 items-center justify-center rounded-[9px] border">
                      <ClipboardCheckIcon
                        className="size-4"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-medium">
                        {item.document.dtgsaDocumentNumber} · Rev{" "}
                        {item.revisionLabel}
                      </span>
                      <span className="text-soft mt-0.5 block truncate text-[10.5px]">
                        {item.document.project.code} · {item.document.title}
                      </span>
                    </span>
                    <Badge variant="outline">{queue}</Badge>
                    <ArrowRightIcon
                      className="text-dim group-hover:text-accent-txt size-3.5 shrink-0 transition-colors"
                      aria-hidden="true"
                    />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="px-5 py-9 text-center">
                <span className="border-line bg-raise text-ok mx-auto flex size-10 items-center justify-center rounded-full border">
                  <ClipboardCheckIcon className="size-4" aria-hidden="true" />
                </span>
                <p className="mt-3 text-[12.5px] font-medium">
                  You are caught up
                </p>
                <p className="text-soft mt-1 text-[11px]">
                  New review and approval work will appear here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-line bg-panel">
          <CardHeader>
            <p className="text-dim font-mono text-[9.5px] tracking-[0.11em] uppercase">
              Attention
            </p>
            <CardTitle className="mt-1 text-[16px]">Updates for you</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Link
              href="/notifications"
              className="border-line bg-raise hover:border-accent-line flex items-center gap-3 rounded-[10px] border p-3 transition-colors"
            >
              <span className="bg-accent-bg text-accent-txt flex size-9 items-center justify-center rounded-[9px]">
                <BellIcon className="size-4" aria-hidden="true" />
              </span>
              <span className="flex-1">
                <span className="block text-[12px] font-medium">
                  {tasks.counts.unreadNotifications} unread notifications
                </span>
                <span className="text-soft mt-0.5 block text-[10.5px]">
                  Workflow updates and system messages
                </span>
              </span>
              <ArrowRightIcon
                className="text-dim size-3.5"
                aria-hidden="true"
              />
            </Link>
            <div className="border-line bg-raise flex items-center gap-3 rounded-[10px] border p-3">
              <span className="bg-accent-bg text-accent-txt flex size-9 items-center justify-center rounded-[9px]">
                <FileCheck2Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="flex-1">
                <span className="block text-[12px] font-medium">
                  {tasks.counts.recentSignatureEvents} recent signatures
                </span>
                <span className="text-soft mt-0.5 block text-[10.5px]">
                  Your latest recorded signing activity
                </span>
              </span>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-dim font-mono text-[9.5px] tracking-[0.11em] uppercase">
              Document flow
            </p>
            <h2 className="mt-1 text-[15px] font-medium">Operational pulse</h2>
          </div>
          <span className="text-dim text-[10.5px]">
            {overview.mdrCount} MDR documents in the register
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {pipeline.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="border-line bg-panel hover:border-accent-line group rounded-[10px] border p-4 transition-[border-color,transform] hover:-translate-y-px"
            >
              <div className="flex items-start justify-between gap-3">
                <item.icon
                  className="text-accent-txt size-4"
                  aria-hidden="true"
                />
                <ArrowRightIcon
                  className="text-dim group-hover:text-accent-txt size-3.5 transition-colors"
                  aria-hidden="true"
                />
              </div>
              <p className="mt-5 font-mono text-[26px] font-semibold tracking-[-0.04em]">
                {item.value}
              </p>
              <p className="text-soft mt-1 text-[11px]">{item.label}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3">
          <p className="text-dim font-mono text-[9.5px] tracking-[0.11em] uppercase">
            Start work
          </p>
          <h2 className="mt-1 text-[15px] font-medium">
            Available to your role
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {availableActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="border-line bg-panel hover:border-accent-line group hover:bg-accent-bg2 flex min-h-28 flex-col rounded-[10px] border p-4 transition-[border-color,background-color]"
            >
              <action.icon
                className="text-accent-txt size-4"
                aria-hidden="true"
              />
              <span className="mt-auto pt-5 text-[12px] font-medium">
                {action.title}
              </span>
              <span className="text-soft mt-1 text-[10.5px] leading-4">
                {action.detail}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
