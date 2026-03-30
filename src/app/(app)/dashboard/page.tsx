import Link from "next/link"
import {
  ArrowRightIcon,
  Building2Icon,
  FileChartColumnIcon,
  FolderKanbanIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
} from "lucide-react"
import { env, hasGoogleDriveServiceAccount, hasSupabaseServiceRole } from "@/lib/config/env"
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
    status: "Active",
    summary: "RBAC, masters, clients, projects, settings visibility, and onboarding flows.",
  },
  {
    phase: "Phase 2",
    status: "Queued",
    summary: "PDI register, Excel flows, client numbering portal, and promotion into MDR.",
  },
  {
    phase: "Phase 3+",
    status: "Planned",
    summary: "Workflow, covers, transmittals, client replies, dashboards, and hardening.",
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
      title: "Masters",
      value: overview.documentTypeCount + overview.reviewCodeCount,
      detail: "Document types and review codes",
      icon: FileChartColumnIcon,
    },
  ]

  const integrationCards = [
    {
      title: "Supabase service role",
      value: hasSupabaseServiceRole ? "Ready" : "Missing",
      detail: "Needed for privileged platform services.",
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
              <Badge variant="outline">Phase 1 in progress</Badge>
            </div>
            <div className="space-y-2">
              <CardTitle className="max-w-2xl text-2xl font-semibold tracking-tight md:text-3xl">
                DTGSA document control is now running on the production stack
                with real database-backed administration screens.
              </CardTitle>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
                The current slice covers the shell, Prisma foundation, seeded
                RBAC, masters, client creation, project onboarding, and
                integration diagnostics while keeping numbering, workflow, and
                status dimensions isolated for the later modules.
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
            <CardTitle className="text-lg">Delivery roadmap</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {roadmap.map((phase) => (
              <div
                key={phase.phase}
                className="rounded-2xl border border-border/60 bg-background/80 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{phase.phase}</p>
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

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Status model guardrails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
