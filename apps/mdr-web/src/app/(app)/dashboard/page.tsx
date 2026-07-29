import Link from "next/link"
import {
  ArrowRightIcon,
  Building2Icon,
  FileChartColumnIcon,
  FolderKanbanIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
} from "lucide-react"
import { env, hasGoogleDriveServiceAccount } from "@/lib/config/env"
import { getDashboardOverview } from "@/server/services/dashboard/dashboard-overview"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = "force-dynamic"

const roadmap = [
  {
    phase: "Phase 0",
    status: "Done",
    summary: "Locked stack, Prisma schema, shadcn shell, env validation, and database foundation.",
  },
  {
    phase: "Phase 1",
    status: "Done",
    summary: "RBAC, masters, clients, projects, settings visibility, and onboarding flows.",
  },
  {
    phase: "Phase 2",
    status: "Active",
    summary: "PDI register, Excel flows, client numbering portal, MDR operations, uploads, and reply loops.",
  },
  {
    phase: "Phase 3+",
    status: "Active",
    summary: "Workflow, covers, transmittals, client replies, generated packages, notifications, and hardening.",
  },
] as const

const statusGuardrails = [
  {
    title: "PDI status",
    detail: "Tracks register collaboration only.",
  },
  {
    title: "Workflow status",
    detail: "Tracks preparation, review, approval, and DC states only.",
  },
  {
    title: "Revision status",
    detail: "Tracks revision lifecycle independently from workflow and client response.",
  },
  {
    title: "Client reply state",
    detail: "Tracks reply waiting and reply behavior without collapsing everything into one field.",
  },
] as const

export default async function DashboardPage() {
  const overview = await getDashboardOverview()

  const metrics = [
    {
      title: "Clients",
      value: overview.clientCount,
      detail: "Client defaults and overrides",
      icon: Building2Icon,
    },
    {
      title: "Projects",
      value: overview.projectCount,
      detail: "Initiated project records",
      icon: FolderKanbanIcon,
    },
    {
      title: "Disciplines",
      value: overview.disciplineCount,
      detail: "Global discipline master rows",
      icon: SlidersHorizontalIcon,
    },
    {
      title: "MDR Docs",
      value: overview.mdrCount,
      detail: "Operational documents now in the register",
      icon: FileChartColumnIcon,
    },
  ]

  const workflowMetrics = [
    {
      title: "PDI waiting client",
      value: overview.pendingPdiCount,
      detail: "Lines still waiting for client numbering",
    },
    {
      title: "Ready to submit",
      value: overview.readyToSubmitCount,
      detail: "Current revisions cleared for transmittal packaging",
    },
    {
      title: "Submitted to client",
      value: overview.submittedCount,
      detail: "Revisions already issued externally",
    },
    {
      title: "Pending client reply",
      value: overview.pendingReplyCount,
      detail: "Submitted documents still waiting for response",
    },
    {
      title: "Ready transmittals",
      value: overview.readyTransmittalCount,
      detail: "Drafted outbound packages waiting to be sent",
    },
    {
      title: "Masters + rules",
      value:
        overview.documentTypeCount +
        overview.reviewCodeCount +
        overview.numberingRuleCount,
      detail: "Coding tables and numbering logic in the platform",
    },
  ]

  const integrationCards = [
    {
      title: "Database authority",
      value: "PostgreSQL / Prisma",
      detail: "Application data and migrations use the repository schema.",
    },
    {
      title: "Google Drive account",
      value: hasGoogleDriveServiceAccount ? "Configured" : "Missing",
      detail: overview.googleDrive.summary,
    },
    {
      title: "Email provider",
      value: env.EMAIL_PROVIDER ?? "Not configured",
      detail: "Transmittal and workflow notifications.",
    },
    {
      title: "LibreOffice",
      value: env.LIBREOFFICE_PATH ? "Configured" : "Deferred",
      detail: "Will be enabled later for DOCX to PDF conversion.",
    },
  ]

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <section className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <Card className="overflow-hidden border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="space-y-4 border-b border-border/60 bg-gradient-to-br from-primary/12 via-transparent to-transparent">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="rounded-full bg-primary/15 px-3 py-1 text-primary hover:bg-primary/15">
                Enterprise Platform
              </Badge>
              <Badge variant="outline">Core workflow live</Badge>
            </div>
            <div className="space-y-2">
              <CardTitle className="max-w-2xl text-2xl font-semibold tracking-tight md:text-3xl">
                DTGSA document control is now running on the production stack with live
                registers, workflow actions, client replies, and generated outbound packages.
              </CardTitle>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
                The current slice covers the shell, Prisma foundation, seeded RBAC,
                masters, client creation, project onboarding, PDI, MDR, uploads,
                workflow gates, client numbering portal, replies, transmittals,
                notification plumbing, and generated PDFs while keeping numbering,
                workflow, revision, and client-response states isolated.
              </p>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
            {metrics.map((metric) => (
              <div
                key={metric.title}
                className="rounded-2xl border border-border/70 bg-background/80 p-4"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="rounded-xl bg-primary/10 p-2 text-primary">
                    <metric.icon className="size-5" />
                  </div>
                  <ArrowRightIcon className="size-4 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{metric.title}</p>
                  <p className="text-xl font-semibold tracking-tight">
                    {metric.value}
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {metric.detail}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Integration readiness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {integrationCards.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-border/60 bg-background/80 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{item.title}</p>
                  <Badge variant="outline">{item.value}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {item.detail}
                </p>
              </div>
            ))}
            <Button asChild className="w-full justify-between" variant="outline">
              <Link href="/settings">
                Open integration details
                <ShieldCheckIcon className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Operational pipeline</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {workflowMetrics.map((metric) => (
              <div
                key={metric.title}
                className="rounded-2xl border border-border/60 bg-background/80 p-4"
              >
                <p className="text-sm text-muted-foreground">{metric.title}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">
                  {metric.value}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {metric.detail}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Delivery roadmap</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {roadmap.map((phase) => (
              <div
                key={phase.phase}
                className="rounded-2xl border border-border/60 bg-background/80 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium">{phase.phase}</h3>
                  <Badge variant={phase.status === "Active" ? "default" : "outline"}>
                    {phase.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {phase.summary}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Status model guardrails</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-4">
            {statusGuardrails.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-border/60 bg-background/80 p-4"
              >
                <h3 className="font-medium">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {item.detail}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
